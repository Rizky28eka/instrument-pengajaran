import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from './auth-context'
import { keluarBersih, periksaSebelumKeluar, type PemeriksaanKeluar } from './sesi'
import { bikinDepKeluar } from './sesi-firebase'

/**
 * Alur keluar yang aman di perangkat bersama. Bila ada draf atau tulisan yang belum tersinkron,
 * pengguna diminta memutuskan sebelum data itu dihapus — tidak ada data aktif yang hilang diam-diam.
 */
export function useKeluar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [temuan, setTemuan] = useState<PemeriksaanKeluar | null>(null)
  const [memproses, setMemproses] = useState(false)

  const jalankan = useCallback(
    async (hapusDraf: boolean) => {
      setMemproses(true)
      await keluarBersih(bikinDepKeluar(queryClient), { uid: user?.uid, hapusDraf })
    },
    [queryClient, user?.uid],
  )

  const mulaiKeluar = useCallback(async () => {
    const dep = bikinDepKeluar(queryClient)
    const hasil = user ? await periksaSebelumKeluar(dep, user.uid) : { adaDraf: false, tulisanTertunda: false }
    if (hasil.adaDraf || hasil.tulisanTertunda) setTemuan(hasil)
    else await jalankan(false)
  }, [jalankan, queryClient, user])

  const dialog = (
    <ConfirmDialog
      open={!!temuan}
      judul="Keluar dari akun?"
      labelYa={temuan?.tulisanTertunda ? 'Keluar dan buang' : 'Keluar'}
      varian={temuan?.tulisanTertunda ? 'danger' : 'primary'}
      memproses={memproses}
      onYa={() => void jalankan(true)}
      onBatal={() => setTemuan(null)}
    >
      {temuan?.tulisanTertunda && (
        <p>
          <b>Ada perubahan yang belum terkirim ke server</b> (mungkin karena koneksi terputus). Jika Anda keluar sekarang,
          perubahan itu akan hilang.
        </p>
      )}
      {temuan?.adaDraf && (
        <p>Draf supervisi yang belum disimpan di perangkat ini akan dihapus agar tidak terbaca pengguna berikutnya.</p>
      )}
    </ConfirmDialog>
  )

  return { mulaiKeluar, dialog }
}
