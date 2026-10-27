import { Button } from '@/components/ui/Button'
import { useAuth } from './auth-context'
import { useKeluar } from './useKeluar'

/**
 * Layar untuk pengguna yang SUDAH masuk tetapi akunnya tidak bisa dimuat dari Firestore.
 * Dipakai di halaman login juga: tanpa itu formulir login yang sama muncul lagi tanpa pesan, dan pengguna
 * mengira login-nya yang rusak. Tombol Keluar wajib ada agar pengguna tidak terjebak di akun ini.
 */
export function GalatMemuatAkun() {
  const { kodeGalat } = useAuth()
  const { mulaiKeluar, dialog } = useKeluar()

  return (
    <div className="grid min-h-svh place-items-center px-4 text-center">
      <div className="max-w-sm">
        <h1 className="text-lg font-bold text-slate-900">Akun tidak dapat dimuat</h1>
        <p className="mt-2 text-sm text-slate-600">
          Anda sudah masuk, tetapi data akun belum bisa dimuat. Periksa koneksi internet Anda, lalu muat ulang halaman. Data Anda tidak hilang.
        </p>
        {kodeGalat === 'permission-denied' && (
          <p className="mt-2 text-sm text-slate-600">
            Aplikasi tidak diizinkan membaca data akun. Biasanya aturan keamanan database (Firestore Rules) belum dipasang di project ini;
            pengelola aplikasi dapat melihat docs/OPERASIONAL.md bagian 1.
          </p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Muat ulang</Button>
          <Button variant="secondary" onClick={() => void mulaiKeluar()}>
            Keluar
          </Button>
        </div>
        {dialog}
      </div>
    </div>
  )
}
