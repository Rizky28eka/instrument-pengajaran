import type { Supervisi } from './mapper'

export interface TitikTren {
  id: string
  tanggal: string
  nilai: number
  /** Selisih nilai terhadap supervisi sebelumnya (kronologis); null untuk yang pertama. */
  selisih: number | null
}

/**
 * Tren nilai per guru, kronologis (lama → baru). Selisih hanya bermakna jika instrumen yang
 * dibandingkan sama; bila versi berbeda, selisih dikosongkan agar tidak menyesatkan.
 */
export function hitungTren(riwayat: Pick<Supervisi, 'id' | 'identitas' | 'ringkasan' | 'instrumen'>[]): TitikTren[] {
  const urut = [...riwayat].sort((a, b) => (a.identitas.tanggal === b.identitas.tanggal ? a.id.localeCompare(b.id) : a.identitas.tanggal < b.identitas.tanggal ? -1 : 1))
  return urut.map((s, i) => {
    const sebelumnya = urut[i - 1]
    const sebanding = sebelumnya && sebelumnya.instrumen.versi === s.instrumen.versi
    return {
      id: s.id,
      tanggal: s.identitas.tanggal,
      nilai: s.ringkasan.nilai,
      selisih: sebanding ? Math.round((s.ringkasan.nilai - sebelumnya.ringkasan.nilai) * 100) / 100 : null,
    }
  })
}
