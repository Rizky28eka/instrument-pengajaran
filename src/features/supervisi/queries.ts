import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Instrumen } from '@/data/instrumen'
import { useAuth } from '@/features/auth/auth-context'
import { createSupervisi, deleteSupervisi, getSupervisi, listSupervisi, updateSupervisi } from './api'
import type { SupervisiFormValues } from './schema'

export const supervisiKeys = {
  all: ['supervisi'] as const,
  list: () => [...supervisiKeys.all, 'list'] as const,
  detail: (id: string) => [...supervisiKeys.all, 'detail', id] as const,
}

export function useSupervisiList() {
  return useQuery({ queryKey: supervisiKeys.list(), queryFn: listSupervisi })
}

export function useSupervisi(id: string | undefined) {
  return useQuery({
    queryKey: supervisiKeys.detail(id ?? ''),
    queryFn: () => getSupervisi(id!),
    enabled: !!id,
  })
}

export function useSaveSupervisi() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, values, instrumen }: { id?: string; values: SupervisiFormValues; instrumen?: Instrumen }) => {
      if (id) {
        if (!instrumen) throw new Error('Instrumen dokumen tidak diketahui.')
        await updateSupervisi(id, values, instrumen)
        return id
      }
      if (!user) throw new Error('Sesi login berakhir, silakan masuk kembali.')
      return createSupervisi(values, user)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisiKeys.all }),
  })
}

export function useDeleteSupervisi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSupervisi,
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: supervisiKeys.detail(id) })
      return qc.invalidateQueries({ queryKey: supervisiKeys.list() })
    },
  })
}
