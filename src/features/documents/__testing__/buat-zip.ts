/**
 * Pembuat arsip ZIP minimal untuk tes (entri kosong, tanpa kompresi). Hanya dipakai oleh tes:
 * cukup valid bagi pembaca direktori pusat, bukan arsip yang bisa diekstrak penuh.
 */
const enc = new TextEncoder()

export function buatZip(names: string[], opsi: { komentar?: Uint8Array } = {}): Uint8Array<ArrayBuffer> {
  const bagian: Uint8Array[] = []
  const pusat: Uint8Array[] = []
  let offset = 0

  for (const nama of names) {
    const n = enc.encode(nama)

    const lokal = new Uint8Array(30 + n.length)
    const lv = new DataView(lokal.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(26, n.length, true)
    lokal.set(n, 30)

    const entri = new Uint8Array(46 + n.length)
    const ev = new DataView(entri.buffer)
    ev.setUint32(0, 0x02014b50, true)
    ev.setUint16(4, 20, true)
    ev.setUint16(6, 20, true)
    ev.setUint16(8, 0x0800, true)
    ev.setUint16(28, n.length, true)
    ev.setUint32(42, offset, true)
    entri.set(n, 46)

    bagian.push(lokal)
    pusat.push(entri)
    offset += lokal.length
  }

  const ukuranPusat = pusat.reduce((s, p) => s + p.length, 0)
  const komentar = opsi.komentar ?? new Uint8Array(0)
  const akhir = new Uint8Array(22 + komentar.length)
  const av = new DataView(akhir.buffer)
  av.setUint32(0, 0x06054b50, true)
  av.setUint16(8, names.length, true)
  av.setUint16(10, names.length, true)
  av.setUint32(12, ukuranPusat, true)
  av.setUint32(16, offset, true)
  av.setUint16(20, komentar.length, true)
  akhir.set(komentar, 22)

  const total = offset + ukuranPusat + akhir.length
  const hasil = new Uint8Array(total)
  let pos = 0
  for (const b of [...bagian, ...pusat, akhir]) {
    hasil.set(b, pos)
    pos += b.length
  }
  return hasil
}
