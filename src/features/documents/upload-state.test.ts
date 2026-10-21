import { describe, expect, it } from 'vitest'
import { bolehUlangi, keadaanAwal, unggahReducer, type UnggahEvent, type UnggahState } from './upload-state'

const jalankan = (...events: UnggahEvent[]): UnggahState => events.reduce(unggahReducer, keadaanAwal)

describe('alur sukses', () => {
  it('melewati semua tahap hingga berhasil', () => {
    expect(jalankan({ type: 'mulai' }).status).toBe('memvalidasi')
    expect(jalankan({ type: 'mulai' }, { type: 'valid' }).status).toBe('menyimpan-metadata')
    expect(jalankan({ type: 'mulai' }, { type: 'valid' }, { type: 'metadata-tersimpan' }).status).toBe('mengunggah')
    const akhir = jalankan(
      { type: 'mulai' },
      { type: 'valid' },
      { type: 'metadata-tersimpan' },
      { type: 'unggah-selesai' },
      { type: 'selesai' },
    )
    expect(akhir).toMatchObject({ status: 'berhasil', progres: 1 })
  })

  it('progres dibatasi 0..1 dan tidak pernah mundur', () => {
    const awal = jalankan({ type: 'mulai' }, { type: 'valid' }, { type: 'metadata-tersimpan' })
    expect(unggahReducer(awal, { type: 'progres', fraksi: 0.4 }).progres).toBe(0.4)
    const maju = unggahReducer(awal, { type: 'progres', fraksi: 0.4 })
    expect(unggahReducer(maju, { type: 'progres', fraksi: 0.2 }).progres).toBe(0.4)
    expect(unggahReducer(maju, { type: 'progres', fraksi: 7 }).progres).toBe(1)
    expect(unggahReducer(maju, { type: 'progres', fraksi: -3 }).progres).toBe(0.4)
  })
})

describe('kegagalan dan percobaan ulang', () => {
  const sampaiUnggah = [{ type: 'mulai' }, { type: 'valid' }, { type: 'metadata-tersimpan' }] as const

  it('validasi ditolak: gagal dan tidak dapat diulangi', () => {
    const s = jalankan({ type: 'mulai' }, { type: 'ditolak', pesan: 'Tipe tidak didukung' })
    expect(s).toMatchObject({ status: 'gagal', tahapGagal: 'validasi', pesan: 'Tipe tidak didukung' })
    expect(bolehUlangi(s)).toBe(false)
    expect(unggahReducer(s, { type: 'ulangi' })).toBe(s)
  })

  it('jaringan putus saat unggah: ulangi kembali ke tahap unggah (bukan dari awal) dan menambah percobaan', () => {
    const gagal = jalankan(...sampaiUnggah, { type: 'progres', fraksi: 0.6 }, { type: 'gagal', tahap: 'unggah', pesan: 'Jaringan terputus' })
    expect(gagal).toMatchObject({ status: 'gagal', tahapGagal: 'unggah', pesan: 'Jaringan terputus' })
    expect(bolehUlangi(gagal)).toBe(true)
    const ulang = unggahReducer(gagal, { type: 'ulangi' })
    expect(ulang).toMatchObject({ status: 'mengunggah', progres: 0, percobaan: 1 })
    expect(ulang.pesan).toBeUndefined()
  })

  it('finalisasi metadata gagal: ulangi hanya tahap finalisasi (file tidak diunggah ulang)', () => {
    const gagal = jalankan(...sampaiUnggah, { type: 'unggah-selesai' }, { type: 'gagal', tahap: 'finalisasi', pesan: 'x' })
    expect(unggahReducer(gagal, { type: 'ulangi' }).status).toBe('menyelesaikan')
  })

  it('penyimpanan metadata awal gagal: ulangi tahap metadata', () => {
    const gagal = jalankan({ type: 'mulai' }, { type: 'valid' }, { type: 'gagal', tahap: 'metadata', pesan: 'x' })
    expect(unggahReducer(gagal, { type: 'ulangi' }).status).toBe('menyimpan-metadata')
  })
})

describe('pembatalan dan peristiwa yang tidak relevan', () => {
  it('dapat dibatalkan pada tahap berjalan', () => {
    expect(jalankan({ type: 'mulai' }, { type: 'valid' }, { type: 'metadata-tersimpan' }, { type: 'batal' }).status).toBe('dibatalkan')
  })

  it('status akhir (berhasil, dibatalkan) tidak berubah oleh peristiwa apa pun', () => {
    const berhasil = jalankan({ type: 'mulai' }, { type: 'valid' }, { type: 'metadata-tersimpan' }, { type: 'unggah-selesai' }, { type: 'selesai' })
    expect(unggahReducer(berhasil, { type: 'batal' })).toBe(berhasil)
    expect(unggahReducer(berhasil, { type: 'gagal', tahap: 'unggah', pesan: 'x' })).toBe(berhasil)
    const batal = jalankan({ type: 'mulai' }, { type: 'batal' })
    expect(unggahReducer(batal, { type: 'ulangi' })).toBe(batal)
  })

  it('peristiwa di luar urutan diabaikan (mis. progres sebelum mulai, selesai tanpa unggah)', () => {
    expect(unggahReducer(keadaanAwal, { type: 'progres', fraksi: 0.5 })).toBe(keadaanAwal)
    expect(unggahReducer(keadaanAwal, { type: 'selesai' })).toBe(keadaanAwal)
    const s = jalankan({ type: 'mulai' })
    expect(unggahReducer(s, { type: 'unggah-selesai' })).toBe(s)
  })

  it('mulai dua kali (klik ganda) tidak mengulang dari awal', () => {
    const s = jalankan({ type: 'mulai' }, { type: 'valid' })
    expect(unggahReducer(s, { type: 'mulai' })).toBe(s)
  })
})
