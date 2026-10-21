/**
 * Menyerahkan Blob ke pengguna sebagai unduhan lalu melepas URL objeknya. URL ini hanya hidup
 * sebentar di tab ini dan tidak dapat dibagikan — berbeda dengan URL unduhan Firebase yang permanen.
 */
export function simpanBlob(blob: Blob, nama: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
