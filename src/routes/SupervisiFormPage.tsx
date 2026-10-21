import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { User } from 'firebase/auth'
import { toast } from 'sonner'
import { FileQuestion, History } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { pesanError } from '@/features/auth/actions'
import { useAuth } from '@/features/auth/auth-context'
import { SupervisiForm } from '@/features/supervisi/components/SupervisiForm'
import { useSaveSupervisi, useSupervisi } from '@/features/supervisi/queries'
import type { SupervisiFormInput, SupervisiFormValues } from '@/features/supervisi/schema'
import { hariIniISO } from '@/lib/utils'

function nilaiKosong(user: User | null): SupervisiFormInput {
  return {
    identitas: {
      namaSekolah: '',
      namaGuru: '',
      mataPelajaran: '',
      kelas: '',
      namaSupervisor: user?.displayName ?? '',
      tanggal: hariIniISO(),
      kurikulum: 'Kurikulum Merdeka',
      kurikulumLainnya: '',
      modelPembelajaran: 'Tatap Muka',
    },
    skor: {},
    catatanAspek: {},
    catatan: { kekuatan: '', perbaikan: '', rekomendasi: '' },
  }
}

function bacaDraf(key: string): SupervisiFormInput | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SupervisiFormInput) : null
  } catch {
    return null
  }
}

export default function SupervisiFormPage() {
  const { id } = useParams()
  return id ? <EditSupervisi id={id} /> : <SupervisiBaru />
}

function useSimpan(id?: string) {
  const save = useSaveSupervisi()
  const navigate = useNavigate()
  return async (values: SupervisiFormValues) => {
    try {
      const savedId = await save.mutateAsync({ id, values })
      toast.success(id ? 'Perubahan disimpan.' : 'Hasil supervisi tersimpan.')
      navigate(`/supervisi/${savedId}`, { replace: true })
    } catch (e) {
      toast.error(pesanError(e))
      throw e
    }
  }
}

function SupervisiBaru() {
  const { user } = useAuth()
  const draftKey = `draf-supervisi:${user?.uid}`
  const [awal, setAwal] = useState(() => ({ nilai: bacaDraf(draftKey) ?? nilaiKosong(user), dariDraf: !!bacaDraf(draftKey), versi: 0 }))
  const simpan = useSimpan()

  function buangDraf() {
    localStorage.removeItem(draftKey)
    setAwal((a) => ({ nilai: nilaiKosong(user), dariDraf: false, versi: a.versi + 1 }))
  }

  return (
    <>
      <PageHeader title="Supervisi Baru" description="Isi identitas, beri skor setiap indikator, lalu simpan." />
      {awal.dariDraf && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <span className="flex items-center gap-2">
            <History className="size-4" /> Draf sebelumnya dipulihkan secara otomatis.
          </span>
          <Button size="sm" variant="ghost" onClick={buangDraf}>
            Mulai dari awal
          </Button>
        </div>
      )}
      <SupervisiForm
        key={awal.versi}
        defaultValues={awal.nilai}
        draftKey={draftKey}
        onSubmit={simpan}
        submitLabel="Simpan Supervisi"
      />
    </>
  )
}

function EditSupervisi({ id }: { id: string }) {
  const { user } = useAuth()
  const { data, isPending } = useSupervisi(id)
  const simpan = useSimpan(id)

  if (isPending) return <PageLoader />
  if (!data)
    return (
      <Card>
        <EmptyState icon={FileQuestion} title="Data tidak ditemukan" action={<Link to="/supervisi" className={buttonClass({ variant: 'secondary' })}>Kembali</Link>} />
      </Card>
    )
  if (data.createdBy !== user?.uid)
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Tidak dapat mengubah data ini"
          description="Hanya supervisor yang membuat data supervisi ini yang dapat mengubahnya."
          action={<Link to={`/supervisi/${id}`} className={buttonClass({ variant: 'secondary' })}>Lihat detail</Link>}
        />
      </Card>
    )

  return (
    <>
      <PageHeader title="Ubah Supervisi" description={`${data.identitas.namaGuru} · ${data.identitas.mataPelajaran}`} />
      <SupervisiForm
        defaultValues={{ identitas: data.identitas, skor: data.skor, catatanAspek: data.catatanAspek, catatan: data.catatan }}
        onSubmit={simpan}
        submitLabel="Simpan Perubahan"
      />
    </>
  )
}
