import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { useProfilAktif } from '@/features/auth/auth-context'
import { db } from '@/lib/firebase'

export interface Sekolah {
  id: string
  nama: string
  /**
   * Mengaktifkan kategori dokumen "pengajuan guru" (dengan alur review) untuk sekolah ini.
   * Diatur pemilik lewat konsol/skrip admin pada `schools/{id}.fitur.pengirimanDokumenGuru` (klien tidak bisa menulis
   * dokumen sekolah). Bawaan: mati.
   */
  pengirimanDokumenGuru: boolean
}

export function useSekolah() {
  const { schoolId } = useProfilAktif()
  return useQuery({
    queryKey: ['sekolah', schoolId],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Sekolah> => {
      const snap = await getDoc(doc(db, 'schools', schoolId))
      const d = snap.data()
      return {
        id: schoolId,
        nama: (d?.nama as string | undefined) ?? 'Sekolah',
        pengirimanDokumenGuru: d?.fitur?.pengirimanDokumenGuru === true,
      }
    },
  })
}
