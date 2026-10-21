import { useMemo, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, storage } from '@/lib/firebase'
import { useProfilAktif } from '@/features/auth/auth-context'
import { pesanError } from '@/features/auth/actions'
import type { DokumenDoc } from './model'
import type { ReviewStatus } from './review'
import { buatDokumenService, storageOpsFirebase, type DokumenService } from './service'
import type { TugasUnggah } from './upload-task'

export const dokumenKeys = {
  all: ['dokumen'] as const,
  sekolah: (schoolId: string) => [...dokumenKeys.all, schoolId] as const,
}

/** Layanan dokumen atas nama pengguna yang sedang login (Firestore + Storage nyata). */
export function useDokumenService(): DokumenService {
  const profil = useProfilAktif()
  return useMemo(() => {
    const pengguna = { uid: profil.uid, nama: profil.nama }
    return buatDokumenService({
      db,
      storageOps: storageOpsFirebase(storage),
      pengguna,
      pesanGalat: pesanError,
    })
  }, [profil.uid, profil.nama])
}

export function useDokumenSekolah(schoolId: string | null) {
  const svc = useDokumenService()
  return useQuery({
    queryKey: dokumenKeys.sekolah(schoolId ?? ''),
    queryFn: () => svc.daftarSekolah(schoolId!),
    enabled: !!schoolId,
  })
}

/** Mengikuti perubahan status satu TugasUnggah (progres, gagal, berhasil) tanpa polling. */
export function useTugasUnggah(tugas: TugasUnggah) {
  return useSyncExternalStore(
    (ubah) => tugas.subscribe(ubah),
    () => tugas.state,
  )
}

/** Mutasi dokumen yang memuat ulang daftar sekolah setelah berhasil. */
export function useAksiDokumen(schoolId: string | null) {
  const qc = useQueryClient()
  const svc = useDokumenService()
  const segarkan = () => qc.invalidateQueries({ queryKey: dokumenKeys.all })

  const hapusLunak = useMutation({ mutationFn: (d: DokumenDoc) => svc.hapusLunak(d), onSuccess: segarkan })
  const pulihkan = useMutation({ mutationFn: (d: DokumenDoc) => svc.pulihkan(d), onSuccess: segarkan })
  const hapusPermanen = useMutation({ mutationFn: (d: DokumenDoc) => svc.hapusPermanen(d), onSuccess: segarkan })
  const buangTertunda = useMutation({ mutationFn: (d: DokumenDoc) => svc.buangTertunda(d), onSuccess: segarkan })
  const selesaikanTertunda = useMutation({ mutationFn: (d: DokumenDoc) => svc.selesaikanTertunda(d), onSuccess: segarkan })
  const ubahJudul = useMutation({ mutationFn: ({ d, judul }: { d: DokumenDoc; judul: string }) => svc.ubahJudul(d, judul), onSuccess: segarkan })
  const putuskanReview = useMutation({
    mutationFn: ({ d, ke, catatan }: { d: DokumenDoc; ke: ReviewStatus; catatan: string }) => svc.putuskanReview(d, ke, catatan),
    onSuccess: segarkan,
  })

  return { svc, schoolId, segarkan, hapusLunak, pulihkan, hapusPermanen, buangTertunda, selesaikanTertunda, ubahJudul, putuskanReview }
}
