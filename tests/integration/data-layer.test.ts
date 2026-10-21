import { assertFails } from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { INSTRUMEN_AKTIF, semuaIndikator } from '@/data/instrumen'
import { daftarGuru, tambahGuru, ubahGuru, type Guru } from '@/features/guru/api'
import {
  ambilDihapus,
  ambilHalaman,
  ambilPerGuru,
  ambilRiwayat,
  ambilSupervisi,
  ambilTerbaru,
  buatSupervisi,
  hapusSupervisi,
  pulihkanSupervisi,
  UKURAN_HALAMAN,
  ubahSupervisi,
  type Pelaku,
} from '@/features/supervisi/api'
import type { SupervisiFormValues } from '@/features/supervisi/schema'
import {
  ambilEnv,
  GURU_A1,
  GURU_A_NONAKTIF,
  GURU_B1,
  isiDataAwal,
  isiSupervisi,
  sebagai,
  SEK_A,
  SEK_B,
  siapkanEnv,
} from '../rules/helpers'
import { aktif } from './mock-firebase'

const supA1: Pelaku = { uid: 'supA1', nama: 'Supervisor A1' }
const supA2: Pelaku = { uid: 'supA2', nama: 'Supervisor A2' }
const adminA: Pelaku = { uid: 'adminA', nama: 'Admin A' }

const guruA1: Guru = { id: GURU_A1, schoolId: SEK_A, nama: 'Budi', mapel: 'IPA', aktif: true }

/** Nilai form yang lengkap sesuai instrumen aktif. */
function nilaiForm(skor = 3, patch: Partial<SupervisiFormValues> = {}): SupervisiFormValues {
  return {
    guruId: GURU_A1,
    identitas: {
      mataPelajaran: 'IPA', kelas: 'VII A', namaSupervisor: 'Supervisor A1', tanggal: '2026-10-21',
      kurikulum: 'Kurikulum Merdeka', modelPembelajaran: 'Tatap Muka',
    },
    skor: Object.fromEntries(semuaIndikator(INSTRUMEN_AKTIF).map((i) => [i.id, skor])),
    catatanAspek: {},
    catatan: { kekuatan: 'baik', perbaikan: '', rekomendasi: '' },
    ...patch,
  }
}

const bikin = (pelaku = supA1, values = nilaiForm()) =>
  buatSupervisi({ values, guru: guruA1, namaSekolah: 'SMP A', schoolId: SEK_A, pelaku })

beforeAll(async () => {
  await siapkanEnv()
})
beforeEach(async () => {
  await isiDataAwal()
  aktif.db = sebagai('supA1')
})
afterAll(async () => {
  await ambilEnv().cleanup()
})

describe('supervisi — alur nyata terhadap Rules', () => {
  it('membuat lalu membaca kembali dengan snapshot instrumen, rev 1, dan riwayat awal', async () => {
    const id = await bikin()
    const s = await ambilSupervisi(id)
    expect(s).not.toBeNull()
    expect(s).toMatchObject({
      schoolId: SEK_A, guruId: GURU_A1, guruNama: 'Budi', rev: 1, createdBy: 'supA1', deletedAt: null,
      identitas: { namaSekolah: 'SMP A', namaGuru: 'Budi', kelas: 'VII A' },
    })
    expect(s!.instrumen.versi).toBe(INSTRUMEN_AKTIF.versi)
    expect(s!.ringkasan.nilai).toBe(75) // semua skor 3 dari 4
    const riwayat = await ambilRiwayat(id)
    expect(riwayat).toHaveLength(1)
    expect(riwayat[0]).toMatchObject({ rev: 1, aksi: 'buat', oleh: 'supA1' })
  })

  it('rekan satu sekolah dapat membaca; sekolah lain tidak', async () => {
    const id = await bikin()
    aktif.db = sebagai('supA2')
    expect((await ambilSupervisi(id))?.id).toBe(id)
    aktif.db = sebagai('supB')
    await expect(ambilSupervisi(id)).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('mengubah menaikkan rev dan menambah riwayat; instrumen dokumen tidak berubah', async () => {
    const id = await bikin()
    const awal = (await ambilSupervisi(id))!
    await ubahSupervisi(awal, nilaiForm(4), supA1)
    const sesudah = (await ambilSupervisi(id))!
    expect(sesudah.rev).toBe(2)
    expect(sesudah.ringkasan.nilai).toBe(100)
    expect(sesudah.instrumen.versi).toBe(awal.instrumen.versi)
    const riwayat = await ambilRiwayat(id)
    expect(riwayat.map((r) => [r.rev, r.aksi])).toEqual([[2, 'ubah'], [1, 'buat']]) // terbaru dulu
  })

  it('lost update: menyimpan dari salinan usang ditolak dengan pesan yang dapat dimengerti', async () => {
    const id = await bikin()
    const salinanUsang = (await ambilSupervisi(id))!
    await ubahSupervisi(salinanUsang, nilaiForm(4), supA1) // "tab pertama" menyimpan lebih dulu
    await expect(ubahSupervisi(salinanUsang, nilaiForm(2), supA1)).rejects.toThrow(/diubah oleh pengguna lain|Muat ulang/)
    expect((await ambilSupervisi(id))!.ringkasan.nilai).toBe(100) // perubahan tab pertama tidak tertimpa
  })

  it('supervisor lain tidak dapat mengubah, admin dapat', async () => {
    const id = await bikin()
    const awal = (await ambilSupervisi(id))!
    aktif.db = sebagai('supA2')
    await expect(ubahSupervisi(awal, nilaiForm(1), supA2)).rejects.toThrow()
    aktif.db = sebagai('adminA')
    await ubahSupervisi(awal, nilaiForm(2), adminA)
    expect((await ambilSupervisi(id))!.rev).toBe(2)
  })

  it('soft-delete: hilang dari daftar, masih ada di tempat sampah admin; pulihkan hanya admin', async () => {
    const id = await bikin()
    const awal = (await ambilSupervisi(id))!
    await hapusSupervisi(awal, supA1)

    expect((await ambilHalaman(SEK_A)).item.find((x) => x.id === id)).toBeUndefined()
    expect((await ambilTerbaru(SEK_A)).item.find((x) => x.id === id)).toBeUndefined()
    await expect(ambilSupervisi(id)).rejects.toMatchObject({ code: 'permission-denied' }) // supervisor tak lagi melihatnya

    aktif.db = sebagai('adminA')
    const sampah = await ambilDihapus(SEK_A)
    expect(sampah.map((x) => x.id)).toContain(id)
    const dihapus = sampah.find((x) => x.id === id)!
    expect(dihapus.deletedBy).toBe('supA1')

    aktif.db = sebagai('supA1')
    await expect(pulihkanSupervisi(dihapus, supA1)).rejects.toThrow() // pembuat bukan admin
    aktif.db = sebagai('adminA')
    await pulihkanSupervisi(dihapus, adminA)
    aktif.db = sebagai('supA2')
    expect((await ambilHalaman(SEK_A)).item.map((x) => x.id)).toContain(id)

    aktif.db = sebagai('adminA')
    expect((await ambilRiwayat(id)).map((r) => r.aksi)).toEqual(['pulihkan', 'hapus', 'buat'])
  })

  it('tempat sampah ditolak untuk supervisor biasa', async () => {
    await expect(ambilDihapus(SEK_A)).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('daftar hanya memuat sekolah sendiri; meminta sekolah lain ditolak', async () => {
    aktif.db = sebagai('supB')
    const b = await ambilHalaman(SEK_B)
    expect(b.item.every((x) => x.schoolId === SEK_B)).toBe(true)
    await expect(ambilHalaman(SEK_A)).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('tidak dapat membuat untuk guru nonaktif atau guru sekolah lain', async () => {
    await expect(
      buatSupervisi({ values: nilaiForm(), guru: { ...guruA1, id: GURU_A_NONAKTIF, nama: 'Lama', aktif: false }, namaSekolah: 'SMP A', schoolId: SEK_A, pelaku: supA1 }),
    ).rejects.toThrow()
    await expect(
      buatSupervisi({ values: nilaiForm(), guru: { ...guruA1, id: GURU_B1, nama: 'Sari' }, namaSekolah: 'SMP A', schoolId: SEK_A, pelaku: supA1 }),
    ).rejects.toThrow()
  })

  it('paginasi: halaman pertama 25 + penanda masih ada, halaman kedua sisanya, tanpa duplikat', async () => {
    // 30 dokumen dengan tanggal berbeda dibuat langsung (tanpa Rules) agar cepat.
    await ambilEnv().withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as import('firebase/firestore').Firestore
      for (let i = 0; i < 30; i++) {
        const tgl = `2026-09-${String(i + 1).padStart(2, '0')}`
        const d = isiSupervisi(SEK_A, GURU_A1, 'Budi')
        await setDoc(doc(db, 'supervisi', `p${i}`), {
          ...d, identitas: { ...d.identitas, tanggal: tgl },
          createdBy: 'supA1', createdByName: 'x', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), updatedBy: 'supA1', rev: 1, deletedAt: null, deletedBy: null,
        })
      }
    })
    const h1 = await ambilHalaman(SEK_A)
    expect(h1.item).toHaveLength(UKURAN_HALAMAN)
    expect(h1.adaLagi).toBe(true)
    expect(h1.item[0].identitas.tanggal >= h1.item[h1.item.length - 1].identitas.tanggal).toBe(true) // urut menurun
    const h2 = await ambilHalaman(SEK_A, h1.kursor)
    expect(h2.adaLagi).toBe(false)
    const semua = [...h1.item, ...h2.item].map((x) => x.id)
    expect(new Set(semua).size).toBe(semua.length)
    expect(semua.length).toBeGreaterThanOrEqual(30) // 30 baru + dokumen awal sekolah A
  })
})

describe('riwayat per guru', () => {
  it('mengembalikan hanya supervisi guru itu, terbaru dulu, tanpa yang sudah dihapus', async () => {
    const a = await bikin(supA1, nilaiForm(2, { identitas: { ...nilaiForm().identitas, tanggal: '2026-03-01' } }))
    const b = await bikin(supA1, nilaiForm(4, { identitas: { ...nilaiForm().identitas, tanggal: '2026-09-01' } }))
    const c = await bikin(supA1, nilaiForm(3, { identitas: { ...nilaiForm().identitas, tanggal: '2026-06-01' } }))
    await hapusSupervisi((await ambilSupervisi(c))!, supA1)

    const hasil = await ambilPerGuru(SEK_A, GURU_A1)
    const ids = hasil.map((x) => x.id)
    expect(ids).toContain(a)
    expect(ids).toContain(b)
    expect(ids).not.toContain(c)
    const tanggal = hasil.map((x) => x.identitas.tanggal)
    expect(tanggal).toEqual([...tanggal].sort().reverse())
    expect(hasil.every((x) => x.guruId === GURU_A1)).toBe(true)
  })

  it('guru lain tidak tercampur dan sekolah lain ditolak', async () => {
    await bikin()
    expect(await ambilPerGuru(SEK_A, 'guru-tidak-ada')).toEqual([])
    await expect(ambilPerGuru(SEK_B, GURU_B1)).rejects.toMatchObject({ code: 'permission-denied' })
  })
})

describe('guru — master data', () => {
  it('menambah, mengubah nama (ID tetap), menonaktifkan; terurut dan hanya sekolah sendiri', async () => {
    const id = await tambahGuru(SEK_A, 'supA1', { nama: '  Citra  ', mapel: 'Seni' })
    let daftar = await daftarGuru(SEK_A)
    expect(daftar.find((g) => g.id === id)).toMatchObject({ nama: 'Citra', mapel: 'Seni', aktif: true })
    expect(daftar.map((g) => g.nama)).toEqual([...daftar.map((g) => g.nama)].sort())
    expect(daftar.every((g) => g.schoolId === SEK_A)).toBe(true)

    await ubahGuru(id, 'supA1', { nama: 'Citra Dewi', mapel: 'Seni', aktif: false })
    daftar = await daftarGuru(SEK_A)
    expect(daftar.find((g) => g.id === id)).toMatchObject({ id, nama: 'Citra Dewi', aktif: false })
  })

  it('menambah guru ke sekolah lain ditolak; membaca guru sekolah lain ditolak', async () => {
    await expect(tambahGuru(SEK_B, 'supA1', { nama: 'X', mapel: '' })).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(daftarGuru(SEK_B)).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('riwayat supervisi tetap utuh walau guru diganti nama / dinonaktifkan', async () => {
    const id = await bikin()
    await ubahGuru(GURU_A1, 'supA1', { nama: 'Budi Santoso', mapel: 'IPA', aktif: false })
    const s = await ambilSupervisi(id)
    expect(s!.guruId).toBe(GURU_A1) // tertaut lewat ID
    expect(s!.guruNama).toBe('Budi') // nama saat supervisi dilakukan tetap tersimpan
  })
})

describe('kontrol: Rules benar-benar aktif pada koneksi tes', () => {
  it('penulisan langsung tanpa riwayat ditolak (membuktikan tes di atas tidak lolos karena Rules mati)', async () => {
    await assertFails(
      setDoc(doc(aktif.db!, 'supervisi', 'langsung'), { ...isiSupervisi(SEK_A, GURU_A1, 'Budi'), createdBy: 'supA1', createdAt: serverTimestamp() }),
    )
  })
})
