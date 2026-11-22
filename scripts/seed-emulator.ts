/**
 * Mengisi emulator Firebase lokal dengan data FIKTIF agar aplikasi langsung terlihat hidup.
 *
 *   npm run emulators          # terminal 1
 *   npm run seed:emulator      # terminal 2
 *   npm run dev:emulator       # terminal 3, lalu masuk dengan akun demo di bawah
 *
 * Hanya menulis ke emulator (127.0.0.1), tidak pernah ke project Firebase sungguhan.
 */
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth'
import { addDoc, collection, connectFirestoreEmulator, getFirestore, Timestamp } from 'firebase/firestore'
import { ambilSnapshot, INSTRUMEN_AKTIF, semuaIndikator } from '../src/data/instrumen'
import { hitungRingkasan } from '../src/lib/scoring'

export const AKUN_DEMO = { email: 'supervisor@demo.test', password: 'Demo12345!', nama: 'Dra. Ratna Wulandari, M.Pd.' }

const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-instrumen' })
const auth = getAuth(app)
const db = getFirestore(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 8080)

// Generator acak deterministik: data demo selalu sama setiap dijalankan.
let seed = 20261122
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

/** Setiap guru punya "kualitas dasar" (0–1) yang menentukan sebaran skornya. */
const GURU = [
  { nama: 'Siti Aminah, S.Pd.', mapel: 'Matematika', kelas: 'VIII A', q: 0.9 },
  { nama: 'Budi Santoso, S.Pd.', mapel: 'IPA', kelas: 'VII B', q: 0.75 },
  { nama: 'Dewi Lestari, S.Pd.', mapel: 'Bahasa Indonesia', kelas: 'IX C', q: 0.82 },
  { nama: 'Agus Prasetyo, S.Pd.', mapel: 'IPS', kelas: 'VIII B', q: 0.55 },
  { nama: 'Rina Marlina, S.Pd.', mapel: 'Bahasa Inggris', kelas: 'VII A', q: 0.68 },
  { nama: 'Hendra Wijaya, S.Pd.', mapel: 'PJOK', kelas: 'IX A', q: 0.7 },
  { nama: 'Maya Kusuma, S.Pd.', mapel: 'Informatika', kelas: 'VIII C', q: 0.88 },
  { nama: 'Yusuf Maulana, S.Pd.', mapel: 'PPKn', kelas: 'VII C', q: 0.45 },
]
const KURIKULUM = ['Kurikulum Merdeka', 'Kurikulum Merdeka', 'Kurikulum Merdeka', 'Kurikulum 2013'] as const
const MODEL = ['Tatap Muka', 'Tatap Muka', 'Blended Learning'] as const

const skorUntuk = (q: number) => {
  const r = rand() * 0.5 - 0.25 + q // sebaran sekitar kualitas dasar
  return Math.max(1, Math.min(4, Math.round(1 + r * 3)))
}

const CATATAN = {
  baik: {
    kekuatan: 'Pembukaan runtut, tujuan pembelajaran disampaikan jelas, dan siswa aktif berdiskusi sepanjang kegiatan.',
    perbaikan: 'Alokasi waktu untuk refleksi di akhir pelajaran masih singkat.',
    rekomendasi: 'Pertahankan praktik baik ini dan bagikan pada forum MGMP sebagai contoh pembelajaran berdiferensiasi.',
  },
  cukup: {
    kekuatan: 'Penguasaan materi baik dan hubungan dengan siswa hangat.',
    perbaikan: 'Variasi metode dan penggunaan media masih terbatas; asesmen formatif belum merata ke seluruh siswa.',
    rekomendasi: 'Pendampingan penyusunan asesmen formatif dan pelatihan singkat penggunaan media pembelajaran digital.',
  },
  kurang: {
    kekuatan: 'Guru hadir tepat waktu dan menjaga ketertiban kelas.',
    perbaikan: 'Perangkat ajar belum lengkap, kegiatan inti didominasi ceramah, dan asesmen belum selaras dengan tujuan.',
    rekomendasi: 'Pendampingan intensif oleh guru senior dan supervisi ulang dalam satu bulan.',
  },
}

async function main() {
  const cred = await createUserWithEmailAndPassword(auth, AKUN_DEMO.email, AKUN_DEMO.password)
  await updateProfile(cred.user, { displayName: AKUN_DEMO.nama })

  const indikator = semuaIndikator(INSTRUMEN_AKTIF)
  const sekarang = Date.now()
  let jumlah = 0
  // Dua putaran supervisi per guru, berjarak sekitar satu bulan.
  for (let putaran = 0; putaran < 2; putaran++) {
    for (const [i, g] of GURU.entries()) {
      const q = Math.min(0.97, g.q + (putaran === 0 ? -0.08 : 0.04))
      const skor = Object.fromEntries(indikator.map((x) => [x.id, skorUntuk(q)]))
      const hari = (putaran === 0 ? 52 : 14) - i * 2
      const tanggal = new Date(sekarang - hari * 86400000).toISOString().slice(0, 10)
      const ringkasan = hitungRingkasan(skor, INSTRUMEN_AKTIF)
      const catatan = ringkasan.nilai >= 78 ? CATATAN.baik : ringkasan.nilai >= 58 ? CATATAN.cukup : CATATAN.kurang
      await addDoc(collection(db, 'supervisi'), {
        identitas: {
          namaSekolah: 'SMP Negeri Contoh Nusantara',
          namaGuru: g.nama,
          mataPelajaran: g.mapel,
          kelas: g.kelas,
          namaSupervisor: AKUN_DEMO.nama,
          tanggal,
          kurikulum: KURIKULUM[(i + putaran) % KURIKULUM.length],
          modelPembelajaran: MODEL[(i + putaran) % MODEL.length],
        },
        skor,
        catatanAspek: {},
        catatan,
        versiInstrumen: INSTRUMEN_AKTIF.versi,
        instrumen: ambilSnapshot(INSTRUMEN_AKTIF),
        ringkasan,
        createdBy: cred.user.uid,
        createdByName: AKUN_DEMO.nama,
        createdAt: Timestamp.fromMillis(sekarang - hari * 86400000),
        updatedAt: Timestamp.fromMillis(sekarang - hari * 86400000),
      })
      jumlah++
    }
  }
  console.log(`Selesai: ${jumlah} data supervisi fiktif.\nMasuk dengan ${AKUN_DEMO.email} / ${AKUN_DEMO.password}`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
