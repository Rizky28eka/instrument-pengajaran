import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfilAktif } from '@/features/auth/auth-context'
import {
  ambilRiwayatTindak,
  buatTindakLanjut,
  daftarTindakLanjut,
  daftarUntukSupervisi,
  ubahTindakLanjut,
  type PerubahanTindak,
  type SupervisiRujukan,
} from './api'
import type { TindakLanjut } from './logic'
import type { TindakForm } from './schema'

// Kunci memuat schoolId agar cache satu sekolah tidak pernah dipakai sekolah lain.
export const tindakKeys = {
  semua: (schoolId: string) => ['tindak', schoolId] as const,
  sekolah: (schoolId: string) => [...tindakKeys.semua(schoolId), 'sekolah'] as const,
  supervisi: (schoolId: string, id: string) => [...tindakKeys.semua(schoolId), 'supervisi', id] as const,
  riwayat: (schoolId: string, id: string) => [...tindakKeys.semua(schoolId), 'riwayat', id] as const,
}

export function useTindakLanjutSekolah() {
  const { schoolId } = useProfilAktif()
  return useQuery({ queryKey: tindakKeys.sekolah(schoolId), queryFn: () => daftarTindakLanjut(schoolId) })
}

export function useTindakLanjutSupervisi(supervisiId: string) {
  const { schoolId } = useProfilAktif()
  return useQuery({ queryKey: tindakKeys.supervisi(schoolId, supervisiId), queryFn: () => daftarUntukSupervisi(schoolId, supervisiId) })
}

export function useRiwayatTindak(id: string, aktif: boolean) {
  const { schoolId } = useProfilAktif()
  return useQuery({ queryKey: tindakKeys.riwayat(schoolId, id), queryFn: () => ambilRiwayatTindak(id), enabled: aktif })
}

export function useBuatTindak(rujukan: SupervisiRujukan) {
  const qc = useQueryClient()
  const { uid, nama, schoolId } = useProfilAktif()
  return useMutation({
    mutationFn: (isi: TindakForm) => buatTindakLanjut(rujukan, isi, { uid, nama }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tindakKeys.semua(schoolId) }),
  })
}

export function useUbahTindak() {
  const qc = useQueryClient()
  const { uid, nama, schoolId } = useProfilAktif()
  return useMutation({
    mutationFn: ({ awal, perubahan }: { awal: TindakLanjut; perubahan: PerubahanTindak }) => ubahTindakLanjut(awal, perubahan, { uid, nama }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tindakKeys.semua(schoolId) }),
  })
}
