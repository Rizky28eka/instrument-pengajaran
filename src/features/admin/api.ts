import { collection, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, deleteDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Peran } from '@/features/auth/akses'
import { buatKodeUndangan } from '@/features/auth/undangan'

export interface Pengguna {
  uid: string
  email: string
  nama: string
  role: Peran
  status: 'active' | 'disabled'
  createdAt: Date | null
}

export interface UndanganAdmin {
  id: string
  role: Peran
  email: string | null
  expiresAt: Date
  terpakai: boolean
  createdAt: Date | null
}

/** Batas masa berlaku di UI lebih ketat daripada Rules (30 hari) agar selisih jam perangkat tidak menolak undangan. */
export const MAKS_HARI_UNDANGAN = 14

export async function daftarPengguna(schoolId: string): Promise<Pengguna[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)))
  return snap.docs
    .map((d) => {
      const x = d.data()
      return { uid: d.id, email: x.email, nama: x.nama, role: x.role, status: x.status, createdAt: x.createdAt?.toDate?.() ?? null } as Pengguna
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
}

export const ubahStatusPengguna = (uid: string, status: Pengguna['status']) => updateDoc(doc(db, 'users', uid), { status })

export async function daftarUndangan(schoolId: string): Promise<UndanganAdmin[]> {
  const snap = await getDocs(query(collection(db, 'invites'), where('schoolId', '==', schoolId)))
  return snap.docs
    .map((d) => {
      const x = d.data()
      return {
        id: d.id,
        role: x.role,
        email: x.email ?? null,
        expiresAt: x.expiresAt.toDate(),
        terpakai: x.usedBy != null,
        createdAt: x.createdAt?.toDate?.() ?? null,
      } as UndanganAdmin
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
}

export interface MasukanUndangan {
  schoolId: string
  uid: string
  role: Peran
  /** Kosong = bisa ditebus siapa pun yang memegang kode. */
  email?: string
  hari: number
}

export async function buatUndangan({ schoolId, uid, role, email, hari }: MasukanUndangan): Promise<string> {
  const hariSah = Math.min(Math.max(Math.floor(hari), 1), MAKS_HARI_UNDANGAN)
  const id = buatKodeUndangan()
  await setDoc(doc(db, 'invites', id), {
    schoolId,
    role,
    email: email?.trim() ? email.trim().toLowerCase() : null,
    createdBy: uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + hariSah * 86_400_000),
    usedBy: null,
    usedAt: null,
  })
  return id
}

export const cabutUndangan = (id: string) => deleteDoc(doc(db, 'invites', id))

export const tautanUndangan = (id: string, asal = window.location.origin) => `${asal}/aktivasi?kode=${id}`
