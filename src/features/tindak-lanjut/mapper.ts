import { STATUS, type StatusTindak, type TindakLanjut } from './logic'

type Waktu = { toDate?: () => Date } | null | undefined
const keDate = (t: Waktu) => t?.toDate?.() ?? null

/** Status tak dikenal (data rusak / versi lain) diperlakukan sebagai "belum" agar tetap tampil. */
const statusAman = (s: unknown): StatusTindak => ((STATUS as readonly string[]).includes(s as string) ? (s as StatusTindak) : 'belum')

export function dokumenKeTindak(id: string, d: Record<string, any>): TindakLanjut {
  return {
    id,
    schoolId: d.schoolId ?? '',
    supervisiId: d.supervisiId ?? '',
    guruId: d.guruId ?? '',
    guruNama: d.guruNama ?? '',
    deskripsi: d.deskripsi ?? '',
    status: statusAman(d.status),
    penanggungJawab: d.penanggungJawab ?? '',
    tenggat: typeof d.tenggat === 'string' ? d.tenggat : null,
    selesaiAt: keDate(d.selesaiAt),
    createdBy: d.createdBy ?? '',
    createdAt: keDate(d.createdAt),
    updatedAt: keDate(d.updatedAt),
    updatedBy: d.updatedBy ?? '',
    rev: typeof d.rev === 'number' ? d.rev : 0,
  }
}
