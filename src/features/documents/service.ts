import { FirebaseError } from 'firebase/app'
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, type DocumentReference, type Firestore } from 'firebase/firestore'
import { deleteObject, getBytes, getMetadata, ref, uploadBytesResumable, type FirebaseStorage } from 'firebase/storage'
import { DOKUMEN, type KategoriId } from './config'
import type { RelasiDokumen } from './daftar'
import { periksaBerkas, sha256Hex, type HasilPeriksa } from './file-check'
import { dokumenKeDokumen, versiAktif } from './mapper'
import type { DokumenDoc, RincianBerkas } from './model'
import {
  isiBatalkanPending,
  isiDokumenBaru,
  isiFinalisasi,
  isiHapusLunak,
  isiKeputusanReview,
  isiMulaiVersi,
  isiPulihkan,
  isiUbahJudul,
  type PelakuDokumen,
} from './payload'
import { bolehTransisiReview, perluCatatan, type ReviewStatus } from './review'
import { buatPathObjek, namaTampilan } from './storage-path'
import { TugasUnggah, type HasilValidasi, type TahapUnggah } from './upload-task'

/**
 * Layanan dokumen: Firestore (metadata, sumber data utama) + Storage (berkas).
 *
 * Firestore dan Storage BUKAN satu transaksi. Urutan yang dijaga:
 *   unggah   : metadata (status `mengunggah`, rincian di `pending`) → berkas → finalisasi metadata
 *   hapus    : berkas semua versi → metadata
 * Setiap tahap idempoten sehingga dapat diulang; sisa yang tertinggal selalu terlihat di metadata
 * (unggahan tertunda / dokumen terhapus-lunak) dan dapat direkonsiliasi — tidak ada berkas yatim
 * yang tak terlacak, dan metadata tak pernah menyatakan berkas ada sebelum finalisasi.
 */

// ------------------------------------------------------------------ operasi Storage (dapat diganti pada tes)

export interface StorageOps {
  /** Mengunggah byte. `sinyal` abort membatalkan unggahan. */
  unggah(path: string, berkas: Blob, mime: string, onProgres: (fraksi: number) => void, sinyal: AbortSignal): Promise<void>
  /** Ukuran objek, atau null bila tidak ada. */
  ukuran(path: string): Promise<number | null>
  /** Menghapus objek; objek yang memang tidak ada bukan galat (idempoten). */
  hapus(path: string): Promise<void>
  baca(path: string): Promise<Uint8Array>
}

const kodeGalat = (e: unknown) => (e instanceof FirebaseError ? e.code : '')

export function storageOpsFirebase(storage: FirebaseStorage): StorageOps {
  return {
    unggah: (path, berkas, mime, onProgres, sinyal) =>
      new Promise<void>((selesai, tolak) => {
        if (sinyal.aborted) return tolak(new DOMException('Unggahan dibatalkan.', 'AbortError'))
        const tugas = uploadBytesResumable(ref(storage, path), berkas, { contentType: mime })
        const batal = () => tugas.cancel()
        sinyal.addEventListener('abort', batal)
        tugas.on(
          'state_changed',
          (s) => onProgres(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
          (e) => {
            sinyal.removeEventListener('abort', batal)
            tolak(e)
          },
          () => {
            sinyal.removeEventListener('abort', batal)
            selesai()
          },
        )
      }),
    ukuran: async (path) => {
      try {
        return (await getMetadata(ref(storage, path))).size
      } catch (e) {
        if (kodeGalat(e) === 'storage/object-not-found') return null
        throw e
      }
    },
    hapus: async (path) => {
      try {
        await deleteObject(ref(storage, path))
      } catch (e) {
        if (kodeGalat(e) !== 'storage/object-not-found') throw e
      }
    },
    baca: async (path) => new Uint8Array(await getBytes(ref(storage, path))),
  }
}

// ------------------------------------------------------------------ layanan

export interface DepsDokumen {
  db: Firestore
  storageOps: StorageOps
  pengguna: PelakuDokumen
  pesanGalat?: (e: unknown) => string
}

type HasilOk = Extract<HasilPeriksa, { ok: true }>

export interface InputUnggahBaru {
  schoolId: string
  kategori: KategoriId
  relasi: RelasiDokumen
  berkas: File
  /** Hasil `periksaBerkas` yang sudah dihitung UI (menghindari menghitung hash dua kali). */
  periksaSebelumnya?: HasilOk
  judul?: string
}

export interface InputGantiVersi {
  berkas: File
  periksaSebelumnya?: HasilOk
}

export interface UnggahSiap {
  docId: string
  tahap: TahapUnggah
  tugas: TugasUnggah
}

const GALAT_STATUS = 'Dokumen berada dalam status yang tidak mengizinkan tindakan ini.'

export function buatDokumenService(deps: DepsDokumen) {
  const { db, storageOps, pengguna } = deps
  const col = collection(db, 'documents')

  const baca = async (docRef: DocumentReference): Promise<DokumenDoc | null> => {
    const snap = await getDoc(docRef)
    return snap.exists() ? dokumenKeDokumen(snap.id, snap.data()) : null
  }

  /** Membuang sisa unggahan yang belum final: berkas (bila ada) lalu metadata/pending. Idempoten. */
  async function bersihkan(docRef: DocumentReference): Promise<void> {
    const dok = await baca(docRef)
    if (!dok?.pending) return
    await storageOps.hapus(dok.pending.storagePath)
    if (dok.versions.length === 0) await deleteDoc(docRef)
    else await updateDoc(docRef, isiBatalkanPending())
  }

  /**
   * Tahap-tahap bersama untuk unggahan baru, versi baru, dan melanjutkan unggahan tertunda.
   * `rincianDari` menghitung rincian berkas setelah validasi; `mulaiMetadata` menulis metadata awal.
   */
  function bangunTahap(o: {
    docRef: DocumentReference
    berkas: File
    periksaSebelumnya?: HasilOk
    rincianDari: (hasil: HasilOk) => RincianBerkas | string
    mulaiMetadata: (rincian: RincianBerkas) => Promise<void>
  }): TahapUnggah {
    let hasil: HasilOk | null = o.periksaSebelumnya ?? null
    let rincian: RincianBerkas | null = null

    return {
      async validasi(): Promise<HasilValidasi> {
        const h = hasil ?? (await periksaBerkas(o.berkas))
        if (!h.ok) return { ok: false, pesan: h.pesan }
        hasil = h
        const r = o.rincianDari(h)
        if (typeof r === 'string') return { ok: false, pesan: r }
        rincian = r
        return { ok: true }
      },

      async simpanMetadata() {
        if (!rincian) throw new Error('Berkas belum divalidasi.')
        await o.mulaiMetadata(rincian)
      },

      async kirimBerkas(onProgres, sinyal) {
        if (!rincian) throw new Error('Berkas belum divalidasi.')
        // Pembatalan dapat datang kapan saja, termasuk saat pengecekan di bawah masih berjalan:
        // sinyal yang sudah menyala tidak memicu listener yang dipasang belakangan, jadi diperiksa eksplisit.
        sinyal.throwIfAborted()
        // Idempoten: berkas yang sama sudah terunggah (mis. finalisasi sebelumnya gagal) tidak dikirim ulang.
        if ((await storageOps.ukuran(rincian.storagePath)) === rincian.size) return onProgres(1)
        sinyal.throwIfAborted()
        await storageOps.unggah(rincian.storagePath, o.berkas, rincian.mimeType, onProgres, sinyal)
      },

      async finalisasi() {
        const dok = await baca(o.docRef)
        if (!dok) throw new Error('Metadata dokumen tidak ditemukan.')
        // Idempoten: versi ini sudah tercatat.
        if (!dok.pending) return
        await updateDoc(o.docRef, isiFinalisasi(dok, pengguna))
      },

      bersihkan: () => bersihkan(o.docRef),
    }
  }

  const bungkus = (docId: string, tahap: TahapUnggah): UnggahSiap => ({ docId, tahap, tugas: new TugasUnggah(tahap, { pesanGalat: deps.pesanGalat }) })


  return {
    /** Menyiapkan unggahan dokumen baru. Panggil `tugas.jalankan()` untuk memulai. */
    siapkanUnggahBaru(input: InputUnggahBaru): UnggahSiap {
      const docRef = doc(col)
      const tahap = bangunTahap({
        docRef,
        berkas: input.berkas,
        periksaSebelumnya: input.periksaSebelumnya,
        rincianDari: (h) => ({
          n: 1,
          storagePath: buatPathObjek({ schoolId: input.schoolId, docId: docRef.id, versi: 1, ext: h.ext }),
          fileName: namaTampilan(input.berkas.name),
          mimeType: h.mime,
          size: h.ukuran,
          sha256: h.sha256,
          uploadedBy: pengguna.uid,
        }),
        mulaiMetadata: async (rincian) => {
          // Idempoten: bila metadata dengan rincian yang sama sudah ada (respons sebelumnya hilang), lanjutkan.
          const ada = await baca(docRef)
          if (ada) {
            if (ada.pending?.storagePath === rincian.storagePath) return
            throw new Error('Dokumen dengan ID ini sudah ada.')
          }
          await setDoc(
            docRef,
            isiDokumenBaru({
              schoolId: input.schoolId,
              kategori: input.kategori,
              relasi: input.relasi,
              judul: input.judul ?? namaTampilan(input.berkas.name),
              pengguna,
              rincian,
            }),
          )
        },
      })
      return bungkus(docRef.id, tahap)
    },

    /** Menyiapkan unggahan versi baru. Versi lama tetap utuh sampai versi baru final. */
    siapkanGantiVersi(dok: DokumenDoc, input: InputGantiVersi): UnggahSiap {
      const docRef = doc(col, dok.id)
      const tahap = bangunTahap({
        docRef,
        berkas: input.berkas,
        periksaSebelumnya: input.periksaSebelumnya,
        rincianDari: (h) => {
          if (dok.status !== 'tersedia') return GALAT_STATUS
          if (dok.reviewStatus === 'disetujui' || dok.reviewStatus === 'ditolak') return 'Dokumen yang sudah diputuskan reviewer tidak dapat diganti.'
          if (dok.currentVersion >= DOKUMEN.maksVersi) return `Jumlah versi maksimum (${DOKUMEN.maksVersi}) sudah tercapai.`
          const n = dok.currentVersion + 1
          return {
            n,
            storagePath: buatPathObjek({ schoolId: dok.schoolId, docId: dok.id, versi: n, ext: h.ext }),
            fileName: namaTampilan(input.berkas.name),
            mimeType: h.mime,
            size: h.ukuran,
            sha256: h.sha256,
            uploadedBy: pengguna.uid,
          }
        },
        mulaiMetadata: async (rincian) => {
          const terbaru = await baca(docRef)
          if (!terbaru) throw new Error('Dokumen tidak ditemukan.')
          if (terbaru.pending) {
            if (terbaru.pending.storagePath === rincian.storagePath) return
            throw new Error('Ada unggahan lain pada dokumen ini yang belum selesai.')
          }
          await updateDoc(docRef, isiMulaiVersi(rincian))
        },
      })
      return bungkus(dok.id, tahap)
    },

    /**
     * Melanjutkan unggahan tertunda dengan berkas yang dipilih ulang pengguna. Berkas HARUS identik
     * (SHA-256 sama) dengan yang dicatat saat unggahan dimulai.
     */
    siapkanLanjutkan(dok: DokumenDoc, berkas: File): UnggahSiap {
      const pending = dok.pending
      if (!pending) throw new Error('Dokumen ini tidak memiliki unggahan tertunda.')
      const { startedAt: _startedAt, ...rincian } = pending
      const docRef = doc(col, dok.id)
      const dasar = bangunTahap({
        docRef,
        berkas,
        rincianDari: (h) => (h.sha256 === rincian.sha256 ? rincian : 'Berkas yang dipilih berbeda dari unggahan sebelumnya.'),
        mulaiMetadata: async () => {},
      })
      return bungkus(dok.id, dasar)
    },

    /** Apakah berkas unggahan tertunda sudah ada di Storage? Menentukan jalur rekonsiliasi. */
    async statusTertunda(dok: DokumenDoc): Promise<{ objekAda: boolean }> {
      if (!dok.pending) throw new Error('Dokumen ini tidak memiliki unggahan tertunda.')
      return { objekAda: (await storageOps.ukuran(dok.pending.storagePath)) === dok.pending.size }
    },

    /** Memfinalisasi unggahan yang berkasnya sudah ada di Storage. Menolak bila berkas belum ada. */
    async selesaikanTertunda(dok: DokumenDoc): Promise<void> {
      if (!dok.pending) throw new Error('Dokumen ini tidak memiliki unggahan tertunda.')
      if ((await storageOps.ukuran(dok.pending.storagePath)) !== dok.pending.size)
        throw new Error('Berkas belum ada di penyimpanan atau ukurannya berbeda; unggah ulang berkas yang sama.')
      await updateDoc(doc(col, dok.id), isiFinalisasi(dok, pengguna))
    },

    /** Membuang unggahan tertunda: berkas (bila ada) lalu metadata atau pending. */
    async buangTertunda(dok: DokumenDoc): Promise<void> {
      await bersihkan(doc(col, dok.id))
    },

    /**
     * Mengunduh lewat SDK terautentikasi (tanpa URL publik), lalu memverifikasi SHA-256 terhadap
     * catatan. Berkas yang isinya berubah di Storage tidak diserahkan ke pengguna.
     */
    async unduh(dok: DokumenDoc, versi?: number): Promise<{ blob: Blob; nama: string }> {
      const v = versi === undefined ? versiAktif(dok) : (dok.versions.find((x) => x.n === versi) ?? null)
      if (!v) throw new Error('Versi berkas tidak ditemukan.')
      const byte = await storageOps.baca(v.storagePath)
      if ((await sha256Hex(byte)) !== v.sha256) throw new Error('Isi berkas tidak sesuai dengan catatan (SHA-256 berbeda). Unduhan dibatalkan.')
      return { blob: new Blob([byte.slice()], { type: v.mimeType }), nama: v.fileName }
    },

    async hapusLunak(dok: DokumenDoc): Promise<void> {
      await updateDoc(doc(col, dok.id), isiHapusLunak(pengguna))
    },

    async pulihkan(dok: DokumenDoc): Promise<void> {
      await updateDoc(doc(col, dok.id), isiPulihkan())
    },

    /**
     * Hapus permanen. Berkas SEMUA versi dihapus lebih dulu; metadata baru dihapus bila semuanya
     * berhasil. Bila gagal di tengah, metadata (status `dihapus`) tetap ada sehingga dapat diulang
     * tanpa meninggalkan berkas yang tak terlacak.
     */
    async hapusPermanen(dok: DokumenDoc): Promise<void> {
      if (dok.status !== 'dihapus') throw new Error('Hapus dokumen (ke tempat sampah) dulu sebelum menghapus permanen.')
      const path = [...dok.versions.map((v) => v.storagePath), ...(dok.pending ? [dok.pending.storagePath] : [])]
      for (const p of path) await storageOps.hapus(p)
      await deleteDoc(doc(col, dok.id))
    },

    async ubahJudul(dok: DokumenDoc, judul: string): Promise<void> {
      const bersih = judul.trim()
      if (!bersih || bersih.length > 120) throw new Error('Judul wajib diisi (maksimal 120 karakter).')
      await updateDoc(doc(col, dok.id), isiUbahJudul(bersih))
    },

    /** Keputusan review. Transisi dan kewajiban alasan diperiksa di sini dan ditegakkan ulang oleh Rules. */
    async putuskanReview(dok: DokumenDoc, ke: ReviewStatus, catatan: string): Promise<void> {
      if (!dok.reviewStatus) throw new Error('Dokumen ini tidak melalui alur review.')
      if (!bolehTransisiReview(dok.reviewStatus, ke)) throw new Error(`Status review tidak dapat berubah dari "${dok.reviewStatus}" ke "${ke}".`)
      if (perluCatatan(ke) && !catatan.trim()) throw new Error('Alasan wajib diisi untuk menolak atau meminta revisi.')
      await updateDoc(doc(col, dok.id), isiKeputusanReview(ke, catatan, pengguna))
    },

    /** Semua dokumen satu sekolah (Rules mensyaratkan filter schoolId). Pemfilteran/paginasi di klien. */
    async daftarSekolah(schoolId: string): Promise<DokumenDoc[]> {
      const snap = await getDocs(query(col, where('schoolId', '==', schoolId)))
      return snap.docs.map((d) => dokumenKeDokumen(d.id, d.data()))
    },
  }
}

export type DokumenService = ReturnType<typeof buatDokumenService>
