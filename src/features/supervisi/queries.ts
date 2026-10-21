import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfilAktif } from '@/features/auth/auth-context'
import type { Guru } from '@/features/guru/api'
import { useSekolah } from '@/features/sekolah/queries'
import { PesanAplikasi } from '@/features/auth/actions'
import {
  ambilDihapus,
  ambilHalaman,
  ambilRiwayat,
  ambilSupervisi,
  ambilTerbaru,
  BATAS_EKSPOR,
  buatSupervisi,
  hapusSupervisi,
  pulihkanSupervisi,
  ubahSupervisi,
  type Supervisi,
} from './api'
import type { SupervisiFormValues } from './schema'

// Kunci selalu memuat schoolId: cache satu sekolah tidak pernah dipakai untuk sekolah lain.
export const supervisiKeys = {
  semua: (schoolId: string) => ['supervisi', schoolId] as const,
  halaman: (schoolId: string) => [...supervisiKeys.semua(schoolId), 'halaman'] as const,
  terbaru: (schoolId: string) => [...supervisiKeys.semua(schoolId), 'terbaru'] as const,
  dihapus: (schoolId: string) => [...supervisiKeys.semua(schoolId), 'dihapus'] as const,
  detail: (schoolId: string, id: string) => [...supervisiKeys.semua(schoolId), 'detail', id] as const,
  riwayat: (schoolId: string, id: string) => [...supervisiKeys.semua(schoolId), 'riwayat', id] as const,
}

export function useSupervisiHalaman() {
  const { schoolId } = useProfilAktif()
  return useInfiniteQuery({
    queryKey: supervisiKeys.halaman(schoolId),
    queryFn: ({ pageParam }) => ambilHalaman(schoolId, pageParam),
    initialPageParam: null as Parameters<typeof ambilHalaman>[1],
    getNextPageParam: (terakhir) => (terakhir.adaLagi ? terakhir.kursor : undefined),
  })
}

export function useSupervisiTerbaru() {
  const { schoolId } = useProfilAktif()
  return useQuery({ queryKey: supervisiKeys.terbaru(schoolId), queryFn: () => ambilTerbaru(schoolId) })
}

export function useSupervisiDihapus(aktif: boolean) {
  const { schoolId, role } = useProfilAktif()
  return useQuery({
    queryKey: supervisiKeys.dihapus(schoolId),
    queryFn: () => ambilDihapus(schoolId),
    enabled: aktif && role === 'admin',
  })
}

export function useSupervisi(id: string | undefined) {
  const { schoolId } = useProfilAktif()
  return useQuery({
    queryKey: supervisiKeys.detail(schoolId, id ?? ''),
    queryFn: () => ambilSupervisi(id!),
    enabled: !!id,
    retry: false, // izin ditolak / tidak ada tidak membaik dengan percobaan ulang
  })
}

export function useRiwayatSupervisi(id: string | undefined) {
  const { schoolId } = useProfilAktif()
  return useQuery({
    queryKey: supervisiKeys.riwayat(schoolId, id ?? ''),
    queryFn: () => ambilRiwayat(id!),
    enabled: !!id,
  })
}

/** Mengambil semua data (maks. BATAS_EKSPOR) untuk diekspor — bukan hanya halaman yang sudah dimuat. */
export function useAmbilUntukEkspor() {
  const { schoolId } = useProfilAktif()
  return useMutation({ mutationFn: () => ambilTerbaru(schoolId, BATAS_EKSPOR) })
}

function usePelaku() {
  const { uid, nama } = useProfilAktif()
  return { uid, nama }
}

export function useBuatSupervisi() {
  const qc = useQueryClient()
  const { schoolId } = useProfilAktif()
  const pelaku = usePelaku()
  const { data: sekolah } = useSekolah()
  return useMutation({
    mutationFn: ({ values, guru }: { values: SupervisiFormValues; guru: Guru }) => {
      if (!sekolah) throw new PesanAplikasi('Data sekolah belum termuat. Coba lagi sebentar.')
      return buatSupervisi({ values, guru, namaSekolah: sekolah.nama, schoolId, pelaku })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisiKeys.semua(schoolId) }),
  })
}

export function useUbahSupervisi() {
  const qc = useQueryClient()
  const { schoolId } = useProfilAktif()
  const pelaku = usePelaku()
  return useMutation({
    mutationFn: ({ awal, values }: { awal: Supervisi; values: SupervisiFormValues }) => ubahSupervisi(awal, values, pelaku),
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisiKeys.semua(schoolId) }),
  })
}

export function useHapusSupervisi() {
  const qc = useQueryClient()
  const { schoolId } = useProfilAktif()
  const pelaku = usePelaku()
  return useMutation({
    mutationFn: (awal: Supervisi) => hapusSupervisi(awal, pelaku),
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisiKeys.semua(schoolId) }),
  })
}

export function usePulihkanSupervisi() {
  const qc = useQueryClient()
  const { schoolId } = useProfilAktif()
  const pelaku = usePelaku()
  return useMutation({
    mutationFn: (awal: Supervisi) => pulihkanSupervisi(awal, pelaku),
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisiKeys.semua(schoolId) }),
  })
}
