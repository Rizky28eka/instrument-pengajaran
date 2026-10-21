import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { toast } from 'sonner'
import { Copy, Link2, Trash2, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { PageLoader } from '@/components/ui/Spinner'
import { MAKS_HARI_UNDANGAN, tautanUndangan, type Pengguna, type UndanganAdmin } from '@/features/admin/api'
import { useBuatUndangan, useCabutUndangan, usePengguna, useUbahStatusPengguna, useUndangan } from '@/features/admin/queries'
import { pesanError } from '@/features/auth/actions'
import type { Peran } from '@/features/auth/akses'
import { useProfilAktif } from '@/features/auth/auth-context'
import { cn, formatTanggal } from '@/lib/utils'

const LABEL_PERAN: Record<Peran, string> = { admin: 'Admin sekolah', supervisor: 'Supervisor' }

async function salin(teks: string) {
  try {
    await navigator.clipboard.writeText(teks)
    toast.success('Tautan disalin.')
  } catch {
    // Tanpa izin clipboard (mis. HTTP / diblokir): tampilkan agar bisa disalin manual.
    window.prompt('Salin tautan undangan ini:', teks)
  }
}

function FormUndangan({ onSelesai }: { onSelesai: () => void }) {
  const buat = useBuatUndangan()
  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      const id = await buat.mutateAsync({
        role: f.get('role') as Peran,
        email: String(f.get('email') ?? ''),
        hari: Number(f.get('hari')) || 7,
      })
      toast.success('Undangan dibuat.')
      await salin(tautanUndangan(id))
      onSelesai()
    } catch (err) {
      toast.error(pesanError(err))
    }
  }
  return (
    <form onSubmit={kirim} className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-4 sm:items-end">
      <Field label="Peran">
        {(p) => (
          <Select {...p} name="role" defaultValue="supervisor">
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin sekolah</option>
          </Select>
        )}
      </Field>
      <Field label="Email (opsional)" hint="Bila diisi, hanya email ini yang bisa memakai.">
        {(p) => <Input {...p} name="email" type="email" autoComplete="off" />}
      </Field>
      <Field label="Berlaku (hari)">
        {(p) => <Input {...p} name="hari" type="number" min={1} max={MAKS_HARI_UNDANGAN} defaultValue={7} />}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={buat.isPending}>Buat & salin tautan</Button>
        <Button variant="ghost" onClick={onSelesai} disabled={buat.isPending}>Batal</Button>
      </div>
    </form>
  )
}

export default function PenggunaPage() {
  const { role, uid } = useProfilAktif()
  const pengguna = usePengguna()
  const undangan = useUndangan()
  const ubahStatus = useUbahStatusPengguna()
  const cabut = useCabutUndangan()
  const [formUndangan, setFormUndangan] = useState(false)
  const [targetNonaktif, setTargetNonaktif] = useState<Pengguna | null>(null)
  const [targetCabut, setTargetCabut] = useState<UndanganAdmin | null>(null)
  const [sekarang] = useState(() => Date.now())

  // Hanya mengarahkan; Rules yang menolak akses data bila bukan admin.
  if (role !== 'admin') return <Navigate to="/dashboard" replace />

  async function setStatus(p: Pengguna, status: Pengguna['status']) {
    try {
      await ubahStatus.mutateAsync({ uid: p.uid, status })
      toast.success(status === 'disabled' ? 'Pengguna dinonaktifkan.' : 'Pengguna diaktifkan kembali.')
    } catch (e) {
      toast.error(pesanError(e))
    } finally {
      setTargetNonaktif(null)
    }
  }

  async function cabutKode(u: UndanganAdmin) {
    try {
      await cabut.mutateAsync(u.id)
      toast.success('Undangan dicabut.')
    } catch (e) {
      toast.error(pesanError(e))
    } finally {
      setTargetCabut(null)
    }
  }

  const belumPakai = (undangan.data ?? []).filter((u) => !u.terpakai)

  return (
    <>
      <PageHeader title="Pengguna" description="Undang supervisor ke sekolah Anda dan kelola siapa yang boleh mengakses data." />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Undangan"
            description="Akun baru baru mendapat akses setelah menebus kode undangan."
            action={!formUndangan ? <Button size="sm" onClick={() => setFormUndangan(true)}><Link2 /> Buat undangan</Button> : undefined}
          />
          {formUndangan && <FormUndangan onSelesai={() => setFormUndangan(false)} />}
          {undangan.isPending ? (
            <PageLoader />
          ) : undangan.isError ? (
            <PanelGalat error={undangan.error} onCoba={() => void undangan.refetch()} />
          ) : belumPakai.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Tidak ada undangan yang menunggu dipakai.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {belumPakai.map((u) => {
                const kedaluwarsa = u.expiresAt.getTime() <= sekarang
                return (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-slate-900">{LABEL_PERAN[u.role]}{u.email ? ` · ${u.email}` : ' · siapa pun dengan kode'}</p>
                      <p className={cn('text-xs', kedaluwarsa ? 'font-semibold text-rose-700' : 'text-slate-500')}>
                        {kedaluwarsa ? 'Kedaluwarsa' : 'Berlaku sampai'} {formatTanggal(u.expiresAt.toISOString().slice(0, 10))}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!kedaluwarsa && <Button size="sm" variant="secondary" onClick={() => void salin(tautanUndangan(u.id))}><Copy /> Salin tautan</Button>}
                      <Button size="sm" variant="ghost" className="text-rose-700 hover:bg-rose-50" onClick={() => setTargetCabut(u)}><Trash2 /> Cabut</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Anggota sekolah" />
          {pengguna.isPending ? (
            <PageLoader />
          ) : pengguna.isError ? (
            <PanelGalat error={pengguna.error} onCoba={() => void pengguna.refetch()} />
          ) : pengguna.data.length === 0 ? (
            <EmptyState icon={UsersRound} title="Belum ada anggota" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pengguna.data.map((p) => (
                <li key={p.uid} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className={cn('min-w-0', p.status === 'disabled' && 'text-slate-400')}>
                    <p className="truncate font-medium text-slate-900">{p.nama}{p.uid === uid && <span className="ml-2 text-xs font-normal text-slate-500">(Anda)</span>}</p>
                    <p className="truncate text-xs text-slate-500">{p.email} · {LABEL_PERAN[p.role]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                      {p.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                    {p.uid !== uid && (
                      p.status === 'active' ? (
                        <Button size="sm" variant="ghost" onClick={() => setTargetNonaktif(p)}>Nonaktifkan</Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => void setStatus(p, 'active')} loading={ubahStatus.isPending}>Aktifkan</Button>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!targetNonaktif}
        judul="Nonaktifkan pengguna ini?"
        labelYa="Nonaktifkan"
        varian="danger"
        memproses={ubahStatus.isPending}
        onYa={() => targetNonaktif && void setStatus(targetNonaktif, 'disabled')}
        onBatal={() => setTargetNonaktif(null)}
      >
        <p><b>{targetNonaktif?.nama}</b> langsung kehilangan akses ke data sekolah. Data yang pernah dibuatnya tetap ada, dan akses dapat dipulihkan kapan saja.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!targetCabut}
        judul="Cabut undangan ini?"
        labelYa="Cabut"
        varian="danger"
        memproses={cabut.isPending}
        onYa={() => targetCabut && void cabutKode(targetCabut)}
        onBatal={() => setTargetCabut(null)}
      >
        <p>Kode undangan tidak dapat dipakai lagi. Orang yang sudah menerima tautannya perlu diundang ulang.</p>
      </ConfirmDialog>
    </>
  )
}
