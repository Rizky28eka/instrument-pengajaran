import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HalamanAkun } from '@/components/layout/HalamanAkun'
import { Button } from '@/components/ui/Button'
import { kirimUlangVerifikasi, pesanError } from '@/features/auth/actions'
import { useAuth } from '@/features/auth/auth-context'
import { UntukStatus } from '@/features/auth/RequireAkses'
import { useKeluar } from '@/features/auth/useKeluar'

const JEDA_KIRIM_DETIK = 60

function Isi() {
  const { user, muatUlang } = useAuth()
  const { mulaiKeluar, dialog } = useKeluar()
  const [jeda, setJeda] = useState(0)
  const [mengirim, setMengirim] = useState(false)
  const [memeriksa, setMemeriksa] = useState(false)

  useEffect(() => {
    if (jeda <= 0) return
    const t = setTimeout(() => setJeda((j) => j - 1), 1000)
    return () => clearTimeout(t)
  }, [jeda])

  // Setelah pengguna membuka tautan di tab/aplikasi lain lalu kembali, periksa otomatis.
  useEffect(() => {
    const periksa = () => {
      if (document.visibilityState === 'visible') void muatUlang().catch(() => {})
    }
    document.addEventListener('visibilitychange', periksa)
    return () => document.removeEventListener('visibilitychange', periksa)
  }, [muatUlang])

  async function kirimUlang() {
    setMengirim(true)
    try {
      await kirimUlangVerifikasi()
      toast.success('Email verifikasi dikirim ulang.')
      setJeda(JEDA_KIRIM_DETIK)
    } catch (e) {
      toast.error(pesanError(e))
    } finally {
      setMengirim(false)
    }
  }

  async function sudahVerifikasi() {
    setMemeriksa(true)
    try {
      await muatUlang()
      // Bila berhasil, status berubah dan halaman ini otomatis berpindah; bila tidak, beri tahu.
      if (!user?.emailVerified) toast.info('Email belum terverifikasi. Buka tautan di email Anda terlebih dahulu.')
    } catch (e) {
      toast.error(pesanError(e))
    } finally {
      setMemeriksa(false)
    }
  }

  return (
    <HalamanAkun
      judul="Verifikasi email Anda"
      deskripsi={
        <>
          Kami mengirim tautan verifikasi ke <b className="text-slate-900">{user?.email}</b>. Buka email tersebut, klik tautannya, lalu
          kembali ke sini. Periksa juga folder spam.
        </>
      }
    >
      <div className="space-y-3">
        <Button className="w-full" size="lg" onClick={sudahVerifikasi} loading={memeriksa}>
          Saya sudah verifikasi
        </Button>
        <Button className="w-full" variant="secondary" onClick={kirimUlang} loading={mengirim} disabled={jeda > 0}>
          {jeda > 0 ? `Kirim ulang email (${jeda} dtk)` : 'Kirim ulang email'}
        </Button>
        <Button className="w-full" variant="ghost" onClick={() => void mulaiKeluar()}>
          Keluar
        </Button>
      </div>
      {dialog}
    </HalamanAkun>
  )
}

export default function VerifikasiEmailPage() {
  return (
    <UntukStatus status="belum-verifikasi">
      <Isi />
    </UntukStatus>
  )
}
