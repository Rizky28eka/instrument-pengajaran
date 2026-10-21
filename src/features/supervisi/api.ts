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
  type DocumentSnapshot,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { hitungRingkasan, type Ringkasan } from '@/lib/scoring'
import type { Identitas, SupervisiFormValues } from './schema'

export interface Supervisi {
  id: string
  identitas: Identitas
  skor: Record<string, number>
  catatanAspek: Record<string, string>
  catatan: SupervisiFormValues['catatan']
  ringkasan: Ringkasan
  createdBy: string
  createdByName: string
  createdAt: Date | null
  updatedAt: Date | null
}

const COLLECTION = 'supervisi'
const supervisiCol = collection(db, COLLECTION)

function fromSnapshot(snap: DocumentSnapshot): Supervisi {
  const d = snap.data()!
  const skor = (d.skor ?? {}) as Record<string, number>
  return {
    id: snap.id,
    identitas: d.identitas,
    skor,
    catatanAspek: d.catatanAspek ?? {},
    catatan: { kekuatan: '', perbaikan: '', rekomendasi: '', ...d.catatan },
    // Dihitung ulang agar selalu konsisten dengan master instrumen terbaru.
    ringkasan: hitungRingkasan(skor),
    createdBy: d.createdBy,
    createdByName: d.createdByName ?? '',
    createdAt: d.createdAt?.toDate?.() ?? null,
    updatedAt: d.updatedAt?.toDate?.() ?? null,
  }
}

export async function listSupervisi(): Promise<Supervisi[]> {
  const snap = await getDocs(query(supervisiCol, orderBy('identitas.tanggal', 'desc')))
  return snap.docs.map(fromSnapshot)
}

export async function getSupervisi(id: string): Promise<Supervisi | null> {
  const snap = await getDoc(doc(db, COLLECTION, id))
  return snap.exists() ? fromSnapshot(snap) : null
}

export async function createSupervisi(values: SupervisiFormValues, user: User): Promise<string> {
  const ref = await addDoc(supervisiCol, {
    ...values,
    // Ringkasan ikut disimpan agar mudah dibaca dari Firestore console / ekspor eksternal.
    ringkasan: hitungRingkasan(values.skor),
    createdBy: user.uid,
    createdByName: user.displayName ?? user.email ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSupervisi(id: string, values: SupervisiFormValues): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...values,
    ringkasan: hitungRingkasan(values.skor),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteSupervisi(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
