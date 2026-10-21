import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { useProfilAktif } from '@/features/auth/auth-context'
import { db } from '@/lib/firebase'

export interface Sekolah {
  id: string
  nama: string
}

export function useSekolah() {
  const { schoolId } = useProfilAktif()
  return useQuery({
    queryKey: ['sekolah', schoolId],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Sekolah> => {
      const snap = await getDoc(doc(db, 'schools', schoolId))
      return { id: schoolId, nama: (snap.data()?.nama as string | undefined) ?? 'Sekolah' }
    },
  })
}
