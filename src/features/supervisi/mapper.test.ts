import { describe, expect, it } from 'vitest'
import { ambilSnapshot, bentukAspek, hidrasiInstrumen, INSTRUMEN_AKTIF, INSTRUMEN_LEGACY, type Instrumen } from '@/data/instrumen'
import { hitungRingkasan } from '@/lib/scoring'
import { dokumenKeSupervisi, supervisiKeFormInput } from './mapper'

const identitas = {
  namaSekolah: 'SMP A',
  namaGuru: 'Budi',
  mataPelajaran: 'IPA',
  kelas: 'VII A',
  namaSupervisor: 'Siti',
  tanggal: '2026-10-21',
  kurikulum: 'Kurikulum Merdeka',
  modelPembelajaran: 'Tatap Muka',
}

/** Versi lama yang berbeda dari instrumen aktif: 2 indikator, ambang lebih ketat. */
const V_LAMA: Instrumen = {
  versi: 'lama-1',
  nama: 'Lama',
  status: 'resmi',
  ambang: [
    { predikat: 'Sangat Baik', min: 95 },
    { predikat: 'Baik', min: 80 },
    { predikat: 'Cukup', min: 60 },
    { predikat: 'Perlu Perbaikan', min: 0 },
  ],
  aspek: [
    bentukAspek({ id: 'Z', kode: 'Z', judul: 'Z', deskripsi: '', kelompok: [{ indikator: [{ id: 'Z1', teks: 'a' }, { id: 'Z2', teks: 'b' }] }] }),
  ],
}

describe('dokumenKeSupervisi — kompatibilitas data historis', () => {
  it('dokumen dengan snapshot dinilai memakai snapshot-nya, bukan instrumen aktif', () => {
    const doc = { identitas, skor: { Z1: 4, Z2: 3 }, instrumen: ambilSnapshot(V_LAMA), createdBy: 'u1' }
    const s = dokumenKeSupervisi('d1', doc)
    expect(s.instrumen.versi).toBe('lama-1')
    expect(s.ringkasan).toMatchObject({ total: 7, maks: 8, nilai: 87.5, predikat: 'Baik' })
  })

  it('hasil historis tidak berubah ketika instrumen aktif berbeda (nilai sama dengan saat dibuat)', () => {
    const snapshot = ambilSnapshot(V_LAMA)
    const saatDibuat = hitungRingkasan({ Z1: 4, Z2: 4 }, hidrasiInstrumen(snapshot))
    const sekarang = dokumenKeSupervisi('d1', { identitas, skor: { Z1: 4, Z2: 4 }, instrumen: snapshot, createdBy: 'u1' }).ringkasan
    expect(sekarang).toEqual(saatDibuat)
    expect(INSTRUMEN_AKTIF.versi).not.toBe(V_LAMA.versi)
  })

  it('dokumen tanpa snapshot (pra-versioning) memakai instrumen legacy', () => {
    const skor = Object.fromEntries(INSTRUMEN_LEGACY.aspek.flatMap((a) => a.indikator).map((i) => [i.id, 4]))
    const s = dokumenKeSupervisi('d2', { identitas, skor, createdBy: 'u1' })
    expect(s.instrumen).toBe(INSTRUMEN_LEGACY)
    expect(s.ringkasan.nilai).toBe(100)
  })

  it('field opsional hilang tidak membuat pemetaan gagal', () => {
    const s = dokumenKeSupervisi('d3', { identitas, createdBy: 'u1' })
    expect(s.skor).toEqual({})
    expect(s.catatan).toEqual({ kekuatan: '', perbaikan: '', rekomendasi: '' })
    expect(s.createdAt).toBeNull()
  })

  it('mengonversi Timestamp Firestore', () => {
    const tgl = new Date('2026-10-21T00:00:00Z')
    const s = dokumenKeSupervisi('d4', { identitas, createdBy: 'u1', createdAt: { toDate: () => tgl } })
    expect(s.createdAt).toEqual(tgl)
  })
})

describe('dokumenKeSupervisi — metadata baru', () => {
  it('memetakan sekolah, guru, rev, dan status hapus', () => {
    const hapus = new Date('2026-10-22T00:00:00Z')
    const s = dokumenKeSupervisi('d5', {
      identitas, schoolId: 'sA', guruId: 'g1', guruNama: 'Budi', rev: 3, updatedBy: 'u2', createdBy: 'u1',
      deletedAt: { toDate: () => hapus }, deletedBy: 'u2',
    })
    expect(s).toMatchObject({ schoolId: 'sA', guruId: 'g1', guruNama: 'Budi', rev: 3, updatedBy: 'u2', deletedBy: 'u2' })
    expect(s.deletedAt).toEqual(hapus)
  })

  it('dokumen yang belum dihapus memiliki deletedAt null', () => {
    expect(dokumenKeSupervisi('d6', { identitas, createdBy: 'u1', deletedAt: null }).deletedAt).toBeNull()
  })

  it('guruNama jatuh ke identitas.namaGuru pada dokumen lama', () => {
    expect(dokumenKeSupervisi('d7', { identitas: { ...identitas, namaGuru: 'Budi' }, createdBy: 'u1' }).guruNama).toBe('Budi')
  })
})

describe('supervisiKeFormInput', () => {
  it('membuang nama sekolah dan guru (berasal dari data master) dan menyertakan guruId', () => {
    const s = dokumenKeSupervisi('d8', { identitas, guruId: 'g1', createdBy: 'u1', skor: { A1: 3 } })
    const f = supervisiKeFormInput(s)
    expect(f.guruId).toBe('g1')
    expect(f.identitas).not.toHaveProperty('namaSekolah')
    expect(f.identitas).not.toHaveProperty('namaGuru')
    expect(f.identitas.mataPelajaran).toBe('IPA')
    expect(f.skor).toEqual({ A1: 3 })
  })
})

describe('dokumenKeSupervisi — snapshot rusak tidak merusak aplikasi', () => {
  it.each([
    ['ambang kosong', { ...ambilSnapshot(V_LAMA), ambang: [] }],
    ['aspek bukan array', { ...ambilSnapshot(V_LAMA), aspek: 'x' }],
    ['bukan objek', 'rusak'],
    ['array', []],
  ])('%s → memakai instrumen standar dan menandai snapshotSah=false, tanpa melempar', (_n, rusak) => {
    const s = dokumenKeSupervisi('x', { identitas, skor: { A1: 4 }, instrumen: rusak, createdBy: 'u' })
    expect(s.snapshotSah).toBe(false)
    expect(s.instrumen).toBe(INSTRUMEN_LEGACY)
    expect(Number.isFinite(s.ringkasan.nilai)).toBe(true)
  })

  it('snapshot sah ditandai sah; tanpa snapshot (legacy) juga dianggap sah', () => {
    expect(dokumenKeSupervisi('x', { identitas, instrumen: ambilSnapshot(V_LAMA), createdBy: 'u' }).snapshotSah).toBe(true)
    expect(dokumenKeSupervisi('x', { identitas, createdBy: 'u' }).snapshotSah).toBe(true)
  })

  it('perhitungan skor tidak melempar walau ambang kosong', () => {
    expect(() => hitungRingkasan({ Z1: 4 }, { ...V_LAMA, ambang: [] })).not.toThrow()
    expect(hitungRingkasan({ Z1: 4 }, { ...V_LAMA, ambang: [] }).predikat).toBe('Perlu Perbaikan')
  })
})
