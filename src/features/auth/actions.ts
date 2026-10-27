import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth, googleProvider } from '@/lib/firebase'

export const masukEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export async function daftarEmail(nama: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: nama })
  // Gagal mengirim tidak membatalkan pendaftaran; pengguna bisa meminta kirim ulang di halaman verifikasi.
  await sendEmailVerification(cred.user).catch((e) => console.error('Gagal mengirim email verifikasi', e))
  return cred
}

export const kirimUlangVerifikasi = () => {
  if (!auth.currentUser) return Promise.reject(new Error('Sesi berakhir, silakan masuk kembali.'))
  return sendEmailVerification(auth.currentUser)
}

/**
 * Selalu berhasil bagi pemanggil bila emailnya tidak terdaftar, agar tidak membocorkan email mana
 * yang memiliki akun (Firebase produksi sudah begitu; emulator / proyek lama mengembalikan galat).
 */
export async function kirimResetSandi(email: string) {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (e) {
    if (e instanceof FirebaseError && e.code === 'auth/user-not-found') return
    throw e
  }
}

export const masukGoogle = () => signInWithPopup(auth, googleProvider)

const PESAN: Record<string, string> = {
  // Sandi salah dan akun tidak ada diberi pesan yang sama (tidak membocorkan keberadaan akun).
  'auth/invalid-credential': 'Email atau kata sandi salah.',
  'auth/wrong-password': 'Email atau kata sandi salah.',
  'auth/user-not-found': 'Email atau kata sandi salah.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/user-disabled': 'Akun ini dinonaktifkan.',
  'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk.',
  'auth/weak-password': 'Kata sandi minimal 6 karakter.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
  'auth/popup-closed-by-user': 'Jendela login Google ditutup.',
  // Galat konfigurasi/browser yang sering menggagalkan login Google; tanpa pesan khusus pengguna hanya melihat "terjadi kesalahan".
  'auth/popup-blocked': 'Jendela login Google diblokir browser. Izinkan popup untuk situs ini, lalu coba lagi.',
  'auth/unauthorized-domain':
    'Alamat aplikasi ini belum diizinkan untuk login Google. Buka lewat http://localhost atau minta pengelola menambahkannya di Firebase Authentication (Authorized domains).',
  'auth/operation-not-allowed': 'Metode masuk ini belum diaktifkan di Firebase Authentication.',
  'auth/network-request-failed': 'Tidak ada koneksi internet.',
  'auth/missing-email': 'Masukkan alamat email.',
  'auth/requires-recent-login': 'Sesi sudah lama. Silakan masuk kembali.',
  'permission-denied': 'Anda tidak memiliki izin untuk tindakan ini.',
  unauthenticated: 'Sesi berakhir. Silakan masuk kembali.',
  unavailable: 'Server tidak dapat dijangkau. Periksa koneksi internet.',
  'deadline-exceeded': 'Server terlalu lama merespons. Coba lagi.',
  'failed-precondition': 'Data telah berubah. Muat ulang halaman lalu coba lagi.',
  aborted: 'Data telah berubah oleh pengguna lain. Muat ulang halaman lalu coba lagi.',
}

/**
 * Pesan untuk pengguna. Kode Firebase yang tidak dikenal TIDAK diteruskan apa adanya
 * (bisa memuat detail internal); kode teknisnya hanya dicatat di konsol.
 */
export function pesanError(e: unknown) {
  if (e instanceof FirebaseError) {
    const pesan = PESAN[e.code] ?? PESAN[e.code.replace(/^[^/]+\//, '')]
    if (!pesan) console.error('Galat Firebase tidak dikenal:', e.code)
    return pesan ?? 'Terjadi kesalahan. Coba lagi beberapa saat.'
  }
  if (e instanceof Error && e.name === 'PesanAplikasi') return e.message
  console.error(e)
  return 'Terjadi kesalahan. Coba lagi beberapa saat.'
}

/** Galat yang pesannya memang ditulis untuk pengguna (aman ditampilkan). */
export class PesanAplikasi extends Error {
  constructor(pesan: string) {
    super(pesan)
    this.name = 'PesanAplikasi'
  }
}
