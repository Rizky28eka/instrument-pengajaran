import { vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'

/** Firestore yang dipakai kode aplikasi selama tes; diganti per skenario (pengguna berbeda). */
export const aktif: { db: Firestore | null } = { db: null }

// Kode aplikasi mengimpor `db` dari '@/lib/firebase'. Pada tes integrasi, `db` diarahkan ke emulator
// dengan identitas pengguna uji, sehingga fungsi API ASLI diuji terhadap Firestore Rules ASLI.
vi.mock('@/lib/firebase', () => ({
  get db() {
    if (!aktif.db) throw new Error('aktif.db belum diatur pada tes ini')
    return aktif.db
  },
  auth: {},
  app: {},
  googleProvider: {},
}))
