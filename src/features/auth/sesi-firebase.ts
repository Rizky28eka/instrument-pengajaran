import { signOut } from 'firebase/auth'
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { DepKeluar, PenyimpananMini } from './sesi'

/** localStorage bisa melempar (mode privat / diblokir); gantikan dengan penyimpanan kosong. */
export function penyimpananLokal(): PenyimpananMini {
  try {
    const s = window.localStorage
    s.getItem('__uji__')
    return s
  } catch {
    return { length: 0, key: () => null, getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
}

export function bikinDepKeluar(queryClient: { clear(): void }): DepKeluar {
  return {
    storage: penyimpananLokal(),
    queryClient,
    signOut: () => signOut(auth),
    tulisanTersinkron: (batasMs) =>
      Promise.race([
        waitForPendingWrites(db).then(() => true),
        new Promise<boolean>((selesai) => setTimeout(() => selesai(false), batasMs)),
      ]).catch(() => false),
    // Hanya cache Firestore project ini yang dihapus (bukan seluruh penyimpanan browser).
    hentikanDanBersihkanCacheFirestore: async () => {
      await terminate(db)
      await clearIndexedDbPersistence(db)
    },
    keHalaman: (path) => window.location.replace(path),
  }
}
