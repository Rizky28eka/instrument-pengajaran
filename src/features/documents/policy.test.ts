import { describe, expect, it } from 'vitest'
import { dokumenKeDokumen } from './mapper'
import { bolehGantiVersi, bolehHapusLunak, bolehHapusPermanen, bolehPulihkan, bolehUbahJudul, keputusanTersedia, type PelakuIzin } from './policy'

const t = { toDate: () => new Date('2026-10-20T00:00:00Z') }
const berkas = (n: number) => ({
  n,
  storagePath: `sekolah/s1/dokumen/d1/v${n}/3f2c1a9e-8b7d-4c6e-9a10-5d4e3f2a1b0c.pdf`,
  fileName: 'a.pdf',
  mimeType: 'application/pdf',
  size: 10,
  sha256: 'a'.repeat(64),
  uploadedBy: 'u1',
  uploadedAt: t,
})

const U1: PelakuIzin = { uid: 'u1', admin: false } // pembuat
const U2: PelakuIzin = { uid: 'u2', admin: false } // rekan sesekolah
const ADM: PelakuIzin = { uid: 'adm', admin: true } // admin sekolah

function dok(u: Record<string, unknown> = {}) {
  return dokumenKeDokumen('d1', {
    schoolId: 's1',
    kategori: 'pendukung-supervisi',
    supervisiId: 'sv1',
    judul: 'a.pdf',
    status: 'tersedia',
    currentVersion: 1,
    versions: [berkas(1)],
    pending: null,
    reviewStatus: null,
    reviewRiwayat: [],
    createdBy: 'u1',
    createdByName: 'Ani',
    createdAt: t,
    updatedAt: t,
    ...u,
  })
}

describe('aksi dokumen (sama dengan firestore.rules)', () => {
  it('pembuat boleh mengganti versi, mengubah judul, dan menghapus-lunak dokumen tersedia', () => {
    expect(bolehGantiVersi(U1, dok())).toBe(true)
    expect(bolehUbahJudul(U1, dok())).toBe(true)
    expect(bolehHapusLunak(U1, dok())).toBe(true)
  })

  it('rekan sesekolah yang bukan pembuat tidak mendapat tombol aksi tersebut', () => {
    expect(bolehGantiVersi(U2, dok())).toBe(false)
    expect(bolehUbahJudul(U2, dok())).toBe(false)
    expect(bolehHapusLunak(U2, dok())).toBe(false)
  })

  it('admin sekolah boleh mengubah judul dan menghapus-lunak dokumen siapa pun, tetapi tidak mengganti versi', () => {
    expect(bolehUbahJudul(ADM, dok())).toBe(true)
    expect(bolehHapusLunak(ADM, dok())).toBe(true)
    expect(bolehGantiVersi(ADM, dok())).toBe(false)
  })

  it('tidak ada aksi ketika unggahan tertunda masih ada', () => {
    const d = dok({ pending: { ...berkas(2), startedAt: t } })
    expect(bolehGantiVersi(U1, d)).toBe(false)
    expect(bolehHapusLunak(U1, d)).toBe(false)
    expect(bolehHapusLunak(ADM, d)).toBe(false)
  })

  it('dokumen yang sudah diputuskan reviewer tidak dapat diganti, tetapi masih dapat dihapus-lunak', () => {
    for (const reviewStatus of ['disetujui', 'ditolak']) {
      const d = dok({ kategori: 'pengajuan-guru', reviewStatus })
      expect(bolehGantiVersi(U1, d)).toBe(false)
      expect(bolehHapusLunak(U1, d)).toBe(true)
    }
  })

  it('batas jumlah versi menutup tombol ganti versi', () => {
    const d = dok({ currentVersion: 20, versions: Array.from({ length: 20 }, (_, i) => berkas(i + 1)) })
    expect(bolehGantiVersi(U1, d)).toBe(false)
  })

  it('pulihkan dan hapus permanen untuk pembuat atau admin pada dokumen terhapus; tidak untuk rekan biasa', () => {
    const terhapus = dok({ status: 'dihapus' })
    for (const p of [U1, ADM]) {
      expect(bolehPulihkan(p, terhapus)).toBe(true)
      expect(bolehHapusPermanen(p, terhapus)).toBe(true)
    }
    expect(bolehPulihkan(U2, terhapus)).toBe(false)
    expect(bolehHapusPermanen(U2, terhapus)).toBe(false)
    expect(bolehHapusPermanen(U1, dok())).toBe(false)
  })
})

describe('keputusanTersedia (alur review)', () => {
  it('dokumen diajukan: reviewer dapat menyetujui, menolak, atau meminta revisi', () => {
    expect(keputusanTersedia(dok({ kategori: 'pengajuan-guru', reviewStatus: 'diajukan' })).sort()).toEqual(['disetujui', 'ditolak', 'perlu_revisi'])
  })

  it('perlu revisi hanya dapat diajukan kembali', () => {
    expect(keputusanTersedia(dok({ kategori: 'pengajuan-guru', reviewStatus: 'perlu_revisi' }))).toEqual(['diajukan'])
  })

  it('keputusan akhir tidak membuka aksi apa pun', () => {
    expect(keputusanTersedia(dok({ kategori: 'pengajuan-guru', reviewStatus: 'disetujui' }))).toEqual([])
    expect(keputusanTersedia(dok({ kategori: 'pengajuan-guru', reviewStatus: 'ditolak' }))).toEqual([])
  })

  it('dokumen tanpa alur review, terhapus, atau masih mengunggah: tidak ada keputusan', () => {
    expect(keputusanTersedia(dok())).toEqual([])
    expect(keputusanTersedia(dok({ kategori: 'pengajuan-guru', reviewStatus: 'diajukan', status: 'dihapus' }))).toEqual([])
    expect(keputusanTersedia(dok({ kategori: 'pengajuan-guru', reviewStatus: 'diajukan', pending: { ...berkas(2), startedAt: t } }))).toEqual([])
  })
})
