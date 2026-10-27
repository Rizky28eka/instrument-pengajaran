// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from '@/features/auth/auth-context'

// Halaman ini hanya diuji perilaku tampilannya; instance Firebase tidak boleh diinisialisasi.
vi.mock('@/lib/firebase', () => ({ auth: {}, googleProvider: {}, db: {}, app: {}, storage: {} }))

const { default: LoginPage } = await import('./LoginPage')

function tampilkan(state: Partial<AuthState>) {
  const nilai: AuthState = { user: null, profil: undefined, status: 'anonim', muatUlang: async () => {}, ...state }
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext value={nilai}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe('LoginPage', () => {
  it('tamu melihat formulir masuk', () => {
    tampilkan({ status: 'anonim' })
    expect(screen.getByLabelText(/^Email/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeTruthy()
  })

  // Dulu: sudah masuk tetapi profil gagal dibaca → formulir yang sama muncul lagi tanpa pesan apa pun,
  // sehingga login tampak "tidak bisa sama sekali" padahal autentikasinya berhasil.
  it('sudah masuk tetapi akun gagal dimuat: menjelaskan keadaannya dan menyediakan jalan keluar', () => {
    tampilkan({ status: 'galat' })
    expect(screen.getByRole('heading', { name: 'Akun tidak dapat dimuat' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Keluar' })).toBeTruthy()
    expect(screen.queryByLabelText(/^Email/)).toBeNull()
  })

  it('izin ditolak saat membaca akun: petunjuknya menyebut aturan keamanan database', () => {
    tampilkan({ status: 'galat', kodeGalat: 'permission-denied' })
    expect(screen.getByText(/aturan keamanan/i)).toBeTruthy()
  })
})
