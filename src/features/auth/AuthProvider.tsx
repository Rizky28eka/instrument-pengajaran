import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase'
import { tentukanStatusAkses, type Profil } from './akses'
import { AuthContext } from './auth-context'
import { bersihkanDrafKedaluwarsa } from './sesi'
import { penyimpananLokal } from './sesi-firebase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [authSiap, setAuthSiap] = useState(false)
  // Hasil langganan profil disimpan bersama uid + versi pemiliknya; hasil milik pengguna / sesi
  // sebelumnya otomatis dianggap "belum dimuat" tanpa perlu mengatur ulang state di dalam effect.
  const [hasil, setHasil] = useState<{ uid: string; versi: number; profil: Profil | null; galat: boolean } | null>(null)
  // Naik setiap kali status akun dimuat ulang → langganan profil dibuat ulang dengan token baru.
  const [versi, setVersi] = useState(0)
  const uidSebelumnya = useRef<string | null>(null)

  useEffect(() => {
    bersihkanDrafKedaluwarsa(penyimpananLokal())
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthSiap(true)
    })
  }, [])

  // Pergantian atau hilangnya pengguna: cache data pengguna sebelumnya tidak boleh terbawa.
  useEffect(() => {
    const uid = user?.uid ?? null
    if (uidSebelumnya.current !== uid) {
      if (uidSebelumnya.current !== null) queryClient.clear()
      uidSebelumnya.current = uid
    }
  }, [user, queryClient])

  const uid = user?.uid
  useEffect(() => {
    if (!uid) return
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const d = snap.data()
        setHasil({
          uid,
          versi,
          galat: false,
          profil:
            snap.exists() && d
              ? { uid, email: d.email, nama: d.nama, schoolId: d.schoolId, role: d.role, status: d.status }
              : null,
        })
      },
      (e) => {
        console.error('Gagal membaca profil pengguna', e.code)
        setHasil({ uid, versi, profil: null, galat: true })
      },
    )
  }, [uid, versi])

  const berlaku = hasil && hasil.uid === uid && hasil.versi === versi ? hasil : null
  const profil: Profil | null | undefined = berlaku ? berlaku.profil : undefined
  const galatProfil = berlaku?.galat ?? false

  const muatUlang = useCallback(async () => {
    const u = auth.currentUser
    if (!u) return
    await u.reload()
    await u.getIdToken(true) // klaim email_verified di token harus diperbarui agar Rules menerimanya
    setUser(auth.currentUser)
    setVersi((v) => v + 1)
  }, [])

  const status = tentukanStatusAkses({
    authSiap,
    userAda: !!user,
    emailTerverifikasi: !!user?.emailVerified,
    profil,
    galatProfil,
  })

  const nilai = useMemo(() => ({ user, profil, status, muatUlang }), [user, profil, status, muatUlang])
  return <AuthContext value={nilai}>{children}</AuthContext>
}
