/** Stempel waktu Firestore (atau yang menyerupainya) → Date; null bila belum ada (mis. menunggu server). */
export type Waktu = { toDate?: () => Date } | null | undefined

export const keDate = (t: Waktu): Date | null => t?.toDate?.() ?? null
