import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { PesanAplikasi } from './actions'
import type { Peran } from './akses'

export interface Undangan {
  id: string
  schoolId: string
  role: Peran
  /** Bila terisi, hanya email ini yang boleh menebus. */
  email: string | null
  expiresAt: Date
  terpakai: boolean
}

export type AlasanDitolak = 'terpakai' | 'kedaluwarsa' | 'email-berbeda'

export const PESAN_UNDANGAN: Record<AlasanDitolak | 'tidak-ditemukan', string> = {
  'tidak-ditemukan': 'Kode undangan tidak ditemukan. Periksa kembali kode dari admin sekolah.',
  terpakai: 'Kode undangan ini sudah dipakai.',
  kedaluwarsa: 'Kode undangan sudah kedaluwarsa. Minta admin sekolah membuat yang baru.',
  'email-berbeda': 'Undangan ini dibuat untuk alamat email lain. Masuk dengan email yang diundang.',
}

/** Menerima kode polos maupun tautan lengkap (`.../aktivasi?kode=...`) yang ditempel pengguna. */
export function normalisasiKode(masukan: string): string {
  const teks = masukan.trim()
  if (!teks) return ''
  try {
    const kode = new URL(teks).searchParams.get('kode')
    if (kode) return kode.trim()
  } catch {
    /* bukan URL — pakai apa adanya */
  }
  return teks.replace(/\s+/g, '')
}

export function periksaUndangan(u: Undangan, emailPengguna: string, sekarang: Date): { ok: true } | { ok: false; alasan: AlasanDitolak } {
  if (u.terpakai) return { ok: false, alasan: 'terpakai' }
  if (u.expiresAt.getTime() <= sekarang.getTime()) return { ok: false, alasan: 'kedaluwarsa' }
  if (u.email && u.email.toLowerCase() !== emailPengguna.toLowerCase()) return { ok: false, alasan: 'email-berbeda' }
  return { ok: true }
}

export async function ambilUndangan(id: string): Promise<Undangan | null> {
  const snap = await getDoc(doc(db, 'invites', id))
  const d = snap.data()
  if (!snap.exists() || !d) return null
  return {
    id: snap.id,
    schoolId: d.schoolId,
    role: d.role,
    email: d.email ?? null,
    expiresAt: d.expiresAt.toDate(),
    terpakai: d.usedBy != null,
  }
}

/**
 * Menebus undangan: profil dan penandaan undangan ditulis dalam SATU batch — Rules
 * mensyaratkan keduanya terjadi bersamaan, sehingga tidak ada status setengah jadi.
 */
export async function aktifkanAkun(user: User, kodeMentah: string, nama: string): Promise<void> {
  const kode = normalisasiKode(kodeMentah)
  if (!kode) throw new PesanAplikasi('Masukkan kode undangan.')
  if (!user.email) throw new PesanAplikasi('Akun ini tidak memiliki alamat email.')
  const namaBersih = nama.trim()
  if (!namaBersih) throw new PesanAplikasi('Masukkan nama lengkap.')

  let undangan: Undangan | null
  try {
    undangan = await ambilUndangan(kode)
  } catch {
    // ID yang tidak valid / tidak dapat dibaca diperlakukan sama dengan "tidak ditemukan".
    undangan = null
  }
  if (!undangan) throw new PesanAplikasi(PESAN_UNDANGAN['tidak-ditemukan'])
  const hasil = periksaUndangan(undangan, user.email, new Date())
  if (!hasil.ok) throw new PesanAplikasi(PESAN_UNDANGAN[hasil.alasan])

  const batch = writeBatch(db)
  batch.set(doc(db, 'users', user.uid), {
    email: user.email,
    nama: namaBersih,
    schoolId: undangan.schoolId,
    role: undangan.role,
    status: 'active',
    inviteId: undangan.id,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'invites', undangan.id), { usedBy: user.uid, usedAt: serverTimestamp() })
  try {
    await batch.commit()
  } catch (e) {
    const code = (e as { code?: string }).code
    // Biasanya karena undangan baru saja dipakai orang lain / dicabut pada saat yang sama.
    if (code === 'permission-denied') throw new PesanAplikasi('Undangan tidak dapat dipakai. Minta admin sekolah membuat undangan baru.')
    throw e
  }
}

export const buatKodeUndangan = () => crypto.randomUUID().replaceAll('-', '')
