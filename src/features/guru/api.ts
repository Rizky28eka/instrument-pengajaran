import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Guru {
  id: string
  schoolId: string
  nama: string
  mapel: string
  aktif: boolean
}

const guruCol = () => collection(db, 'guru')

export async function daftarGuru(schoolId: string): Promise<Guru[]> {
  const snap = await getDocs(query(guruCol(), where('schoolId', '==', schoolId), orderBy('nama')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Guru, 'id'>) }))
}

export async function tambahGuru(schoolId: string, uid: string, data: { nama: string; mapel: string }): Promise<string> {
  const ref = await addDoc(guruCol(), {
    schoolId,
    nama: data.nama.trim(),
    mapel: data.mapel.trim(),
    aktif: true,
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  })
  return ref.id
}

/** Mengganti nama / mapel / status guru. ID tetap sehingga riwayat supervisi tidak terputus. */
export async function ubahGuru(id: string, uid: string, data: { nama: string; mapel: string; aktif: boolean }): Promise<void> {
  await updateDoc(doc(db, 'guru', id), {
    nama: data.nama.trim(),
    mapel: data.mapel.trim(),
    aktif: data.aktif,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  })
}
