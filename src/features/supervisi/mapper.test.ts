import { describe, expect, it } from 'vitest'
import { ambilSnapshot, bentukAspek, hidrasiInstrumen, INSTRUMEN_AKTIF, INSTRUMEN_LEGACY, type Instrumen } from '@/data/instrumen'
import { hitungRingkasan } from '@/lib/scoring'
import { dokumenKeSupervisi } from './mapper'

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
