import { FirebaseError } from 'firebase/app'
import { describe, expect, it, vi } from 'vitest'

// actions.ts mengimpor instance Firebase; untuk uji murni cukup tiruan.
vi.mock('@/lib/firebase', () => ({ auth: {}, googleProvider: {}, db: {}, app: {} }))

const { pesanError, PesanAplikasi } = await import('./actions')

describe('pesanError', () => {
  it.each(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'])(
    '%s → pesan yang sama (tidak membocorkan apakah akun ada)',
    (kode) => {
      expect(pesanError(new FirebaseError(kode, 'x'))).toBe('Email atau kata sandi salah.')
    },
  )

  it('kode Firebase tidak dikenal tidak diteruskan apa adanya', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const pesan = pesanError(new FirebaseError('auth/internal-secret-code', 'Firebase: detail internal rahasia (auth/internal-secret-code)'))
    expect(pesan).toBe('Terjadi kesalahan. Coba lagi beberapa saat.')
    expect(pesan).not.toContain('rahasia')
    expect(err).toHaveBeenCalled() // tetap dicatat untuk pengembang
    err.mockRestore()
  })

  it('galat umum (Error biasa) juga tidak diteruskan', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(pesanError(new Error('SELECT * FROM rahasia'))).toBe('Terjadi kesalahan. Coba lagi beberapa saat.')
    err.mockRestore()
  })

  it('PesanAplikasi memang ditulis untuk pengguna sehingga diteruskan', () => {
    expect(pesanError(new PesanAplikasi('Kode undangan sudah dipakai.'))).toBe('Kode undangan sudah dipakai.')
  })

  it('kode Firestore yang dikenal dipetakan', () => {
    expect(pesanError(new FirebaseError('permission-denied', 'x'))).toContain('tidak memiliki izin')
    expect(pesanError(new FirebaseError('unavailable', 'x'))).toContain('Periksa koneksi')
  })
})
