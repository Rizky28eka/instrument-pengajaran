import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)
const configured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID)

if (configured) {
  // Dimuat dinamis: Firebase akan error saat inisialisasi bila konfigurasi kosong.
  import('./App').then(({ App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
} else {
  root.render(
    <div className="grid min-h-svh place-items-center p-6">
      <div className="max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Firebase belum dikonfigurasi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Salin <code className="rounded bg-slate-100 px-1">.env.example</code> menjadi{' '}
          <code className="rounded bg-slate-100 px-1">.env.local</code>, isi kredensial Web App dari Firebase Console, lalu
          jalankan ulang <code className="rounded bg-slate-100 px-1">npm run dev</code>.
        </p>
      </div>
    </div>,
  )
}
