import { HalamanAkun } from '@/components/layout/HalamanAkun'
import { Button } from '@/components/ui/Button'
import { UntukStatus } from '@/features/auth/RequireAkses'
import { useKeluar } from '@/features/auth/useKeluar'

function Isi() {
  const { mulaiKeluar, dialog } = useKeluar()
  return (
    <HalamanAkun
      judul="Akses dinonaktifkan"
      deskripsi="Akun Anda dinonaktifkan oleh admin sekolah, sehingga data supervisi tidak dapat dibuka. Hubungi admin sekolah bila ini keliru."
    >
      <Button variant="secondary" className="w-full" onClick={() => void mulaiKeluar()}>
        Keluar
      </Button>
      {dialog}
    </HalamanAkun>
  )
}

export default function AksesDitolakPage() {
  return (
    <UntukStatus status="dinonaktifkan">
      <Isi />
    </UntukStatus>
  )
}
