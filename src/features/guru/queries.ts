import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfilAktif } from '@/features/auth/auth-context'
import { daftarGuru, tambahGuru, ubahGuru } from './api'

export const guruKeys = {
  daftar: (schoolId: string) => ['guru', schoolId, 'daftar'] as const,
}

export function useGuruList() {
  const { schoolId } = useProfilAktif()
  return useQuery({ queryKey: guruKeys.daftar(schoolId), queryFn: () => daftarGuru(schoolId) })
}

export function useTambahGuru() {
  const qc = useQueryClient()
  const { schoolId, uid } = useProfilAktif()
  return useMutation({
    mutationFn: (data: { nama: string; mapel: string }) => tambahGuru(schoolId, uid, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: guruKeys.daftar(schoolId) }),
  })
}

export function useUbahGuru() {
  const qc = useQueryClient()
  const { schoolId, uid } = useProfilAktif()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; nama: string; mapel: string; aktif: boolean }) => ubahGuru(id, uid, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: guruKeys.daftar(schoolId) }),
  })
}
