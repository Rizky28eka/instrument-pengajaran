import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { ambilSnapshot, INSTRUMEN_AKTIF, type Instrumen } from '@/data/instrumen'
import { hitungRingkasan } from '@/lib/scoring'
import { dokumenKeSupervisi, type Supervisi } from './mapper'
import type { SupervisiFormValues } from './schema'

export type { Supervisi }

const COLLECTION = 'supervisi'
const supervisiCol = collection(db, COLLECTION)

export async function listSupervisi(): Promise<Supervisi[]> {
  const snap = await getDocs(query(supervisiCol, orderBy('identitas.tanggal', 'desc')))
  return snap.docs.map((d) => dokumenKeSupervisi(d.id, d.data()))
}

export async function getSupervisi(id: string): Promise<Supervisi | null> {
  const snap = await getDoc(doc(db, COLLECTION, id))
  return snap.exists() ? dokumenKeSupervisi(snap.id, snap.data()) : null
}

export async function createSupervisi(values: SupervisiFormValues, user: User): Promise<string> {
  const ref = await addDoc(supervisiCol, {
    ...values,
    versiInstrumen: INSTRUMEN_AKTIF.versi,
    instrumen: ambilSnapshot(INSTRUMEN_AKTIF),
    // Ringkasan ikut disimpan agar mudah dibaca dari Firestore console / ekspor eksternal.
    ringkasan: hitungRingkasan(values.skor, INSTRUMEN_AKTIF),
    createdBy: user.uid,
    createdByName: user.displayName ?? user.email ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSupervisi(id: string, values: SupervisiFormValues, instrumen: Instrumen): Promise<void> {
  // Instrumen dokumen TIDAK diganti saat diubah: versi dan snapshot tetap seperti saat dibuat.
  await updateDoc(doc(db, COLLECTION, id), {
    ...values,
    ringkasan: hitungRingkasan(values.skor, instrumen),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteSupervisi(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
