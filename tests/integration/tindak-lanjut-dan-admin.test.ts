import type { User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatUndangan, cabutUndangan, daftarPengguna, daftarUndangan, MAKS_HARI_UNDANGAN, ubahStatusPengguna } from '@/features/admin/api'
import type { Pelaku } from '@/features/supervisi/api'
import { aktifkanAkun } from '@/features/auth/undangan'
import {
  ambilRiwayatTindak,
  buatTindakLanjut,
  daftarTindakLanjut,
  daftarUntukSupervisi,
  ubahTindakLanjut,
  type SupervisiRujukan,
} from '@/features/tindak-lanjut/api'
import type { TindakLanjut } from '@/features/tindak-lanjut/logic'
import {
  ambilEnv,
  BARU,
  GURU_A1,
  INVITE,
  isiDataAwal,
  sebagai,
  sebagaiBaru,
  SEK_A,
  SEK_B,
  siapkanEnv,
  SV_A1,
  SV_B1,
  TL_A1,
} from '../rules/helpers'
import { aktif } from './mock-firebase'

const supA1: Pelaku = { uid: 'supA1', nama: 'Supervisor A1' }
const supA2: Pelaku = { uid: 'supA2', nama: 'Supervisor A2' }
const rujukanA: SupervisiRujukan = { id: SV_A1, schoolId: SEK_A, guruId: GURU_A1, guruNama: 'Budi' }
const isi = { deskripsi: 'Ikuti pelatihan asesmen formatif', penanggungJawab: 'Kepala sekolah', tenggat: '2026-12-01' }

async function ambil(id: string): Promise<TindakLanjut> {
  const semua = (await daftarTindakLanjut(SEK_A)).item
  const t = semua.find((x) => x.id === id)
  if (!t) throw new Error('tindak lanjut tidak ditemukan')
  return t
}

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

describe('tindak lanjut — alur nyata', () => {
  it('membuat, lalu tampil di daftar sekolah dan di daftar per supervisi', async () => {
    const id = await buatTindakLanjut(rujukanA, isi, supA1)
    const t = await ambil(id)
    expect(t).toMatchObject({ status: 'belum', deskripsi: isi.deskripsi, penanggungJawab: 'Kepala sekolah', tenggat: '2026-12-01', rev: 1, guruNama: 'Budi', selesaiAt: null })
    expect((await daftarUntukSupervisi(SEK_A, SV_A1)).map((x) => x.id)).toContain(id)
    expect((await ambilRiwayatTindak(id)).map((r) => r.aksi)).toEqual(['buat'])
  })

  it('siklus status lengkap dengan riwayat dan selesaiAt yang tepat', async () => {
    const id = await buatTindakLanjut(rujukanA, isi, supA1)
    await ubahTindakLanjut(await ambil(id), { status: 'proses', catatan: 'Sudah dijadwalkan' }, supA1)
    let t = await ambil(id)
    expect(t).toMatchObject({ status: 'proses', rev: 2, selesaiAt: null })

    aktif.db = sebagai('supA2') // rekan satu sekolah dapat melanjutkan
    await ubahTindakLanjut(t, { status: 'selesai' }, supA2)
    t = await ambil(id)
    expect(t.status).toBe('selesai')
    expect(t.selesaiAt).toBeInstanceOf(Date)
    const selesaiPertama = t.selesaiAt!.getTime()

    await ubahTindakLanjut(t, { catatan: 'Terdokumentasi' }, supA2) // catatan saat selesai: selesaiAt tak berubah
    t = await ambil(id)
    expect(t.selesaiAt!.getTime()).toBe(selesaiPertama)

    await ubahTindakLanjut(t, { status: 'proses', catatan: 'Dibuka lagi' }, supA2)
    t = await ambil(id)
    expect(t).toMatchObject({ status: 'proses', selesaiAt: null })

    const r = await ambilRiwayatTindak(id)
    expect(r.map((x) => x.aksi)).toEqual(['status', 'catatan', 'status', 'status', 'buat'])
    // Urutan terbaru → terlama: [5 buka lagi, 4 catatan, 3 selesai, 2 mulai, 1 buat]
    expect(r[2]).toMatchObject({ rev: 3, dari: 'proses', ke: 'selesai', oleh: 'supA2' })
    expect(r[3]).toMatchObject({ rev: 2, dari: 'belum', ke: 'proses', oleh: 'supA1', catatan: 'Sudah dijadwalkan' })
    expect(r[4]).toMatchObject({ rev: 1, aksi: 'buat' })
  })

  it('mengubah isi menaikkan rev dengan aksi "ubah"', async () => {
    const id = await buatTindakLanjut(rujukanA, isi, supA1)
    await ubahTindakLanjut(await ambil(id), { isi: { ...isi, tenggat: '2026-12-15' } }, supA1)
    expect((await ambil(id)).tenggat).toBe('2026-12-15')
    expect((await ambilRiwayatTindak(id))[0]).toMatchObject({ aksi: 'ubah', rev: 2 })
  })

  it('tanpa perubahan nyata tidak menulis apa pun (rev tetap)', async () => {
    const id = await buatTindakLanjut(rujukanA, isi, supA1)
    const awal = await ambil(id)
    await ubahTindakLanjut(awal, { isi, status: awal.status }, supA1)
    expect((await ambil(id)).rev).toBe(1)
  })

  it('transisi terlarang (selesai → belum) ditolak oleh Rules', async () => {
    const id = await buatTindakLanjut(rujukanA, isi, supA1)
    await ubahTindakLanjut(await ambil(id), { status: 'selesai' }, supA1)
    await expect(ubahTindakLanjut(await ambil(id), { status: 'belum' }, supA1)).rejects.toThrow(/ditolak/)
  })

  it('lost update: salinan usang ditolak', async () => {
    const id = await buatTindakLanjut(rujukanA, isi, supA1)
    const usang = await ambil(id)
    await ubahTindakLanjut(usang, { status: 'proses' }, supA1)
    await expect(ubahTindakLanjut(usang, { status: 'dibatalkan' }, supA1)).rejects.toThrow(/ditolak/)
    expect((await ambil(id)).status).toBe('proses')
  })

  it('tidak menyentuh supervisi: skor dan rev supervisi tidak berubah', async () => {
    const sebelum = (await getDoc(doc(aktif.db!, 'supervisi', SV_A1))).data()!
    const id = await buatTindakLanjut(rujukanA, isi, supA1)
    await ubahTindakLanjut(await ambil(id), { status: 'selesai' }, supA1)
    const sesudah = (await getDoc(doc(aktif.db!, 'supervisi', SV_A1))).data()!
    expect(sesudah.skor).toEqual(sebelum.skor)
    expect(sesudah.rev).toBe(sebelum.rev)
    expect(sesudah.ringkasan).toEqual(sebelum.ringkasan)
  })

  it('isolasi sekolah: tidak bisa membuat untuk supervisi sekolah lain atau membaca daftar sekolah lain', async () => {
    await expect(buatTindakLanjut({ id: SV_B1, schoolId: SEK_B, guruId: 'guru-b1', guruNama: 'Sari' }, isi, supA1)).rejects.toThrow()
    await expect(buatTindakLanjut({ ...rujukanA, id: SV_B1 }, isi, supA1)).rejects.toThrow()
    await expect(daftarTindakLanjut(SEK_B)).rejects.toMatchObject({ code: 'permission-denied' })
    aktif.db = sebagai('supB')
    expect((await daftarTindakLanjut(SEK_B)).item).toHaveLength(0)
    await expect(ubahTindakLanjut({ id: TL_A1 } as TindakLanjut & { rev: number }, { status: 'proses' }, { uid: 'supB', nama: 'B' })).rejects.toThrow()
  })
})

describe('admin — undangan dan pengguna', () => {
  beforeEach(() => {
    aktif.db = sebagai('adminA')
  })

  it('admin membuat undangan; muncul di daftar; dapat dicabut selama belum dipakai', async () => {
    const id = await buatUndangan({ schoolId: SEK_A, uid: 'adminA', role: 'supervisor', email: '  Guru@Contoh.ID ', hari: 7 })
    expect(id.length).toBeGreaterThanOrEqual(20)
    const u = (await daftarUndangan(SEK_A)).find((x) => x.id === id)!
    expect(u).toMatchObject({ role: 'supervisor', email: 'guru@contoh.id', terpakai: false })
    expect(u.expiresAt.getTime()).toBeGreaterThan(Date.now())
    await cabutUndangan(id)
    expect((await daftarUndangan(SEK_A)).some((x) => x.id === id)).toBe(false)
  })

  it('masa berlaku dibatasi (tidak melebihi batas UI) agar tidak ditolak Rules', async () => {
    const id = await buatUndangan({ schoolId: SEK_A, uid: 'adminA', role: 'supervisor', hari: 999 })
    const u = (await daftarUndangan(SEK_A)).find((x) => x.id === id)!
    expect(u.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(MAKS_HARI_UNDANGAN * 86_400_000 + 5000)
  })

  it('supervisor biasa tidak dapat membuat atau mencabut undangan', async () => {
    aktif.db = sebagai('supA1')
    await expect(buatUndangan({ schoolId: SEK_A, uid: 'supA1', role: 'supervisor', hari: 7 })).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(cabutUndangan(INVITE.ok)).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('admin tidak dapat membuat undangan untuk sekolah lain', async () => {
    await expect(buatUndangan({ schoolId: SEK_B, uid: 'adminA', role: 'supervisor', hari: 7 })).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('alur penuh: admin mengundang → pengguna baru menebus → bisa membaca data sekolah', async () => {
    const kode = await buatUndangan({ schoolId: SEK_A, uid: 'adminA', role: 'supervisor', email: BARU.email, hari: 3 })
    aktif.db = sebagaiBaru()
    await aktifkanAkun({ uid: BARU.uid, email: BARU.email } as User, `https://contoh.id/aktivasi?kode=${kode}`, '  Pengguna Baru  ')
    const profil = (await getDoc(doc(aktif.db, 'users', BARU.uid))).data()!
    expect(profil).toMatchObject({ schoolId: SEK_A, role: 'supervisor', status: 'active', nama: 'Pengguna Baru', inviteId: kode })
    expect((await getDoc(doc(aktif.db, 'schools', SEK_A))).exists()).toBe(true)
    // undangan sudah terpakai → tidak bisa dipakai lagi
    aktif.db = sebagaiBaru({ uid: 'baru2', email: BARU.email })
    await expect(aktifkanAkun({ uid: 'baru2', email: BARU.email } as User, kode, 'Orang Lain')).rejects.toThrow(/sudah dipakai/)
  })

  it('menebus dengan kode yang salah / kedaluwarsa memberi pesan jelas', async () => {
    aktif.db = sebagaiBaru()
    const user = { uid: BARU.uid, email: BARU.email } as User
    await expect(aktifkanAkun(user, 'kode-ngawur-yang-tidak-ada', 'X')).rejects.toThrow(/tidak ditemukan/)
    await expect(aktifkanAkun(user, INVITE.kadaluarsa, 'X')).rejects.toThrow(/kedaluwarsa/)
    await expect(aktifkanAkun(user, INVITE.khususEmail, 'X')).rejects.toThrow(/email lain/)
    await expect(aktifkanAkun(user, '   ', 'X')).rejects.toThrow(/kode undangan/i)
  })

  it('menonaktifkan pengguna memutus aksesnya segera; admin tidak bisa menonaktifkan dirinya', async () => {
    const pengguna = await daftarPengguna(SEK_A)
    expect(pengguna.every((p) => ['adminA', 'supA1', 'supA2', 'nonaktifA', 'belumVerifikasiA'].includes(p.uid))).toBe(true)
    await ubahStatusPengguna('supA2', 'disabled')
    aktif.db = sebagai('supA2')
    await expect(daftarTindakLanjut(SEK_A)).rejects.toMatchObject({ code: 'permission-denied' })
    aktif.db = sebagai('adminA')
    await expect(ubahStatusPengguna('adminA', 'disabled')).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('pengguna sekolah lain tidak muncul pada daftar', async () => {
    await expect(daftarPengguna(SEK_B)).rejects.toMatchObject({ code: 'permission-denied' })
  })
})
