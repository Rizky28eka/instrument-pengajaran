import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth, googleProvider } from '@/lib/firebase'

export const masukEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export async function daftarEmail(nama: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: nama })
  return cred
}

export const masukGoogle = () => signInWithPopup(auth, googleProvider)

export const keluar = () => signOut(auth)

const PESAN: Record<string, string> = {
  'auth/invalid-credential': 'Email atau kata sandi salah.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/user-disabled': 'Akun ini dinonaktifkan.',
  'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk.',
  'auth/weak-password': 'Kata sandi minimal 6 karakter.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
  'auth/popup-closed-by-user': 'Jendela login Google ditutup.',
  'auth/network-request-failed': 'Tidak ada koneksi internet.',
  'permission-denied': 'Anda tidak memiliki izin untuk tindakan ini.',
  unavailable: 'Server tidak dapat dijangkau. Periksa koneksi internet.',
}

export function pesanError(e: unknown) {
  if (e instanceof FirebaseError) return PESAN[e.code] ?? e.message
  if (e instanceof Error) return e.message
  return 'Terjadi kesalahan.'
}
