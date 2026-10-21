import { describe, expect, it, vi } from 'vitest'
import type { UnggahStatus } from './upload-state'
import { TugasUnggah, type TahapUnggah } from './upload-task'

/** Tahap palsu yang menghitung panggilan; tiap tahap dapat dibuat gagal sekali. */
function tahapPalsu(o: { gagalMetadata?: number; gagalUnggah?: number; gagalFinalisasi?: number; validasi?: { ok: true } | { ok: false; pesan: string } } = {}) {
  const sisa = { metadata: o.gagalMetadata ?? 0, unggah: o.gagalUnggah ?? 0, finalisasi: o.gagalFinalisasi ?? 0 }
  const panggilan = { validasi: 0, metadata: 0, unggah: 0, finalisasi: 0, bersihkan: 0 }
  const urutan: string[] = []
  const tahap: TahapUnggah = {
    validasi: async () => {
      panggilan.validasi++
      urutan.push('validasi')
      return o.validasi ?? { ok: true }
    },
    simpanMetadata: async () => {
      panggilan.metadata++
      urutan.push('metadata')
      if (sisa.metadata-- > 0) throw new Error('Firestore tidak dapat dijangkau')
    },
    kirimBerkas: async (onProgres) => {
      panggilan.unggah++
      urutan.push('unggah')
      onProgres(0.5)
      if (sisa.unggah-- > 0) throw new Error('Jaringan terputus')
      onProgres(1)
    },
    finalisasi: async () => {
      panggilan.finalisasi++
      urutan.push('finalisasi')
      if (sisa.finalisasi-- > 0) throw new Error('Gagal menyimpan metadata')
    },
    bersihkan: async () => {
      panggilan.bersihkan++
      urutan.push('bersihkan')
    },
  }
  return { tahap, panggilan, urutan }
}

describe('TugasUnggah: alur sukses', () => {
  it('menjalankan validasi → metadata → unggah → finalisasi secara berurutan', async () => {
    const { tahap, urutan } = tahapPalsu()
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    expect(urutan).toEqual(['validasi', 'metadata', 'unggah', 'finalisasi'])
    expect(t.state).toMatchObject({ status: 'berhasil', progres: 1, percobaan: 0 })
  })

  it('memberi tahu pelanggan tentang setiap perubahan status, termasuk progres', async () => {
    const { tahap } = tahapPalsu()
    const t = new TugasUnggah(tahap)
    const dilihat: UnggahStatus[] = []
    const progres: number[] = []
    t.subscribe((s) => {
      dilihat.push(s.status)
      progres.push(s.progres)
    })
    await t.jalankan()
    // Pembaruan progres menghasilkan beberapa notifikasi berstatus sama; urutan status itulah yang dijamin.
    expect(dilihat.filter((s, i) => s !== dilihat[i - 1])).toEqual(['memvalidasi', 'menyimpan-metadata', 'mengunggah', 'menyelesaikan', 'berhasil'])
    expect(progres).toContain(0.5)
    expect(progres.at(-1)).toBe(1)
  })

  it('pelanggan dapat berhenti berlangganan', async () => {
    const { tahap } = tahapPalsu()
    const t = new TugasUnggah(tahap)
    const fn = vi.fn()
    t.subscribe(fn)()
    await t.jalankan()
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('TugasUnggah: pencegahan pengiriman ganda', () => {
  it('jalankan() dua kali bersamaan (klik ganda) hanya mengeksekusi sekali', async () => {
    const { tahap, panggilan } = tahapPalsu()
    const t = new TugasUnggah(tahap)
    await Promise.all([t.jalankan(), t.jalankan()])
    expect(panggilan).toMatchObject({ validasi: 1, metadata: 1, unggah: 1, finalisasi: 1 })
  })

  it('jalankan() setelah berhasil tidak mengulang apa pun', async () => {
    const { tahap, panggilan } = tahapPalsu()
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    await t.jalankan()
    expect(panggilan.metadata).toBe(1)
    expect(panggilan.unggah).toBe(1)
  })
})

describe('TugasUnggah: kegagalan dan percobaan ulang hanya pada tahap yang gagal', () => {
  it('jaringan putus saat unggah: ulangi tidak mengulang validasi atau metadata', async () => {
    const { tahap, panggilan } = tahapPalsu({ gagalUnggah: 1 })
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    expect(t.state).toMatchObject({ status: 'gagal', tahapGagal: 'unggah', pesan: 'Jaringan terputus' })

    await t.ulangi()
    expect(t.state).toMatchObject({ status: 'berhasil', percobaan: 1 })
    expect(panggilan).toMatchObject({ validasi: 1, metadata: 1, unggah: 2, finalisasi: 1 })
  })

  it('finalisasi gagal: berkas yang sudah terunggah TIDAK diunggah ulang', async () => {
    const { tahap, panggilan } = tahapPalsu({ gagalFinalisasi: 1 })
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    expect(t.state).toMatchObject({ status: 'gagal', tahapGagal: 'finalisasi' })
    await t.ulangi()
    expect(t.state.status).toBe('berhasil')
    expect(panggilan).toMatchObject({ unggah: 1, finalisasi: 2 })
  })

  it('metadata awal gagal: ulangi dimulai dari metadata, belum ada berkas terunggah', async () => {
    const { tahap, panggilan } = tahapPalsu({ gagalMetadata: 1 })
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    expect(panggilan.unggah).toBe(0)
    await t.ulangi()
    expect(t.state.status).toBe('berhasil')
    expect(panggilan).toMatchObject({ metadata: 2, unggah: 1 })
  })

  it('gagal berkali-kali menambah hitungan percobaan', async () => {
    const { tahap } = tahapPalsu({ gagalUnggah: 2 })
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    await t.ulangi()
    expect(t.state.status).toBe('gagal')
    await t.ulangi()
    expect(t.state).toMatchObject({ status: 'berhasil', percobaan: 2 })
  })

  it('ulangi() tanpa kegagalan tidak melakukan apa pun', async () => {
    const { tahap, panggilan } = tahapPalsu()
    const t = new TugasUnggah(tahap)
    await t.ulangi()
    expect(panggilan.validasi).toBe(0)
  })

  it('pesan galat dapat diterjemahkan oleh pemanggil (mis. kode izin Storage)', async () => {
    const { tahap } = tahapPalsu({ gagalUnggah: 1 })
    const t = new TugasUnggah(tahap, { pesanGalat: (e) => `[id] ${(e as Error).message}` })
    await t.jalankan()
    expect(t.state.pesan).toBe('[id] Jaringan terputus')
  })
})

describe('TugasUnggah: validasi ditolak', () => {
  it('tidak membuat metadata maupun mengunggah, dan tidak dapat diulangi', async () => {
    const { tahap, panggilan } = tahapPalsu({ validasi: { ok: false, pesan: 'Isi berkas tidak sesuai dengan ekstensinya.' } })
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    expect(t.state).toMatchObject({ status: 'gagal', tahapGagal: 'validasi', pesan: 'Isi berkas tidak sesuai dengan ekstensinya.' })
    expect(panggilan).toMatchObject({ metadata: 0, unggah: 0, finalisasi: 0 })
    await t.ulangi()
    expect(t.state.status).toBe('gagal')
    expect(panggilan.metadata).toBe(0)
  })
})

describe('TugasUnggah: pembatalan', () => {
  it('membatalkan saat mengunggah: sinyal abort menyala, bersihkan dipanggil sekali, finalisasi tidak jalan', async () => {
    let sinyalDiterima: AbortSignal | undefined
    const panggilan = { finalisasi: 0, bersihkan: 0 }
    let lepas!: () => void
    const tahap: TahapUnggah = {
      validasi: async () => ({ ok: true }),
      simpanMetadata: async () => {},
      kirimBerkas: (_p, sinyal) =>
        new Promise<void>((_ok, tolak) => {
          sinyalDiterima = sinyal
          lepas = () => tolak(new Error('canceled'))
          sinyal.addEventListener('abort', () => tolak(new Error('canceled')))
        }),
      finalisasi: async () => void panggilan.finalisasi++,
      bersihkan: async () => void panggilan.bersihkan++,
    }
    const t = new TugasUnggah(tahap)
    const jalan = t.jalankan()
    await vi.waitFor(() => expect(t.state.status).toBe('mengunggah'))

    await t.batal()
    await jalan
    lepas?.()

    expect(sinyalDiterima?.aborted).toBe(true)
    expect(t.state.status).toBe('dibatalkan')
    expect(panggilan).toEqual({ finalisasi: 0, bersihkan: 1 })
  })

  it('membuang unggahan yang sudah gagal juga membersihkan sisa metadata/berkas', async () => {
    const { tahap, panggilan } = tahapPalsu({ gagalUnggah: 1 })
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    await t.batal()
    expect(t.state.status).toBe('dibatalkan')
    expect(panggilan.bersihkan).toBe(1)
  })

  it('setelah berhasil, batal diabaikan dan tidak membersihkan apa pun', async () => {
    const { tahap, panggilan } = tahapPalsu()
    const t = new TugasUnggah(tahap)
    await t.jalankan()
    await t.batal()
    expect(t.state.status).toBe('berhasil')
    expect(panggilan.bersihkan).toBe(0)
  })

  it('kegagalan saat membersihkan tidak melempar galat (status tetap dibatalkan)', async () => {
    const { tahap } = tahapPalsu({ gagalUnggah: 1 })
    const t = new TugasUnggah({ ...tahap, bersihkan: async () => Promise.reject(new Error('izin dicabut')) })
    await t.jalankan()
    await expect(t.batal()).resolves.toBeUndefined()
    expect(t.state.status).toBe('dibatalkan')
  })
})
