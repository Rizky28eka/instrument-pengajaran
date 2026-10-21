import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfilAktif } from '@/features/auth/auth-context'
import { buatUndangan, cabutUndangan, daftarPengguna, daftarUndangan, ubahStatusPengguna, type MasukanUndangan, type Pengguna } from './api'

const kunci = (schoolId: string, bagian: string) => ['admin', schoolId, bagian] as const

export function usePengguna() {
  const { schoolId, role } = useProfilAktif()
  return useQuery({ queryKey: kunci(schoolId, 'pengguna'), queryFn: () => daftarPengguna(schoolId), enabled: role === 'admin' })
}

export function useUndangan() {
  const { schoolId, role } = useProfilAktif()
  return useQuery({ queryKey: kunci(schoolId, 'undangan'), queryFn: () => daftarUndangan(schoolId), enabled: role === 'admin' })
}

export function useUbahStatusPengguna() {
  const qc = useQueryClient()
  const { schoolId } = useProfilAktif()
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: Pengguna['status'] }) => ubahStatusPengguna(uid, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: kunci(schoolId, 'pengguna') }),
  })
}

export function useBuatUndangan() {
  const qc = useQueryClient()
  const { schoolId, uid } = useProfilAktif()
  return useMutation({
    mutationFn: (m: Omit<MasukanUndangan, 'schoolId' | 'uid'>) => buatUndangan({ ...m, schoolId, uid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: kunci(schoolId, 'undangan') }),
  })
}

export function useCabutUndangan() {
  const qc = useQueryClient()
  const { schoolId } = useProfilAktif()
  return useMutation({
    mutationFn: cabutUndangan,
    onSuccess: () => qc.invalidateQueries({ queryKey: kunci(schoolId, 'undangan') }),
  })
}
