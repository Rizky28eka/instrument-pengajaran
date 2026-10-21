import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { FileQuestion, History, Lock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { PageLoader } from '@/components/ui/Spinner'
import { INSTRUMEN_AKTIF } from '@/data/instrumen'
import { pesanError } from '@/features/auth/actions'
import type { Profil } from '@/features/auth/akses'
import { useProfilAktif } from '@/features/auth/auth-context'
import { bacaDraf, hapusDraf, simpanDraf } from '@/features/auth/sesi'
import { penyimpananLokal } from '@/features/auth/sesi-firebase'
import { useGuruList } from '@/features/guru/queries'
import { SupervisiForm } from '@/features/supervisi/components/SupervisiForm'
import { supervisiKeFormInput } from '@/features/supervisi/mapper'
import { useBuatSupervisi, useSupervisi, useUbahSupervisi } from '@/features/supervisi/queries'
import type { SupervisiFormInput, SupervisiFormValues } from '@/features/supervisi/schema'
import { hariIniISO } from '@/lib/utils'

function nilaiKosong(profil: Profil): SupervisiFormInput {
  return {
    guruId: '',
    identitas: {
      mataPelajaran: '',
      kelas: '',
      namaSupervisor: profil.nama,
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

/** Draf dari penyimpanan tidak dipercaya: bentuknya harus sesuai sebelum dipakai. */
function drafLayak(x: unknown): x is SupervisiFormInput {
  const d = x as Partial<SupervisiFormInput> | null
  return !!d && typeof d === 'object' && typeof d.guruId === 'string' && !!d.identitas && typeof d.identitas === 'object' &&
    !!d.skor && typeof d.skor === 'object' && !!d.catatan && typeof d.catatan === 'object'
}

export default function SupervisiFormPage() {
  const { id } = useParams()
  return id ? <EditSupervisi id={id} /> : <SupervisiBaru />
}

function SupervisiBaru() {
  const profil = useProfilAktif()
  const navigate = useNavigate()
  const buat = useBuatSupervisi()
  const guru = useGuruList()
  const storage = penyimpananLokal()

  const [awal, setAwal] = useState(() => {
    const draf = bacaDraf<unknown>(storage, profil.uid, profil.schoolId)
    const valid = drafLayak(draf)
    return { nilai: valid ? draf : nilaiKosong(profil), dariDraf: valid, versi: 0 }
  })

  const onDraf = useCallback(
    (v: SupervisiFormInput) => void simpanDraf(penyimpananLokal(), profil.uid, profil.schoolId, v),
    [profil.uid, profil.schoolId],
  )

  function buangDraf() {
    hapusDraf(storage, profil.uid)
    setAwal((a) => ({ nilai: nilaiKosong(profil), dariDraf: false, versi: a.versi + 1 }))
  }

  async function simpan(values: SupervisiFormValues) {
    const g = guru.data?.find((x) => x.id === values.guruId && x.aktif)
    if (!g) {
      toast.error('Guru yang dipilih tidak ditemukan atau sudah tidak aktif.')
      throw new Error('guru tidak valid')
    }
    try {
      const id = await buat.mutateAsync({ values, guru: g })
      hapusDraf(storage, profil.uid)
      toast.success('Hasil supervisi tersimpan.')
      navigate(`/supervisi/${id}`, { replace: true })
    } catch (e) {
      toast.error(pesanError(e))
      throw e
    }
  }

  return (
    <>
      <PageHeader title="Supervisi Baru" description="Pilih guru, beri skor setiap indikator, lalu simpan." />
      {awal.dariDraf && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <span className="flex items-center gap-2">
            <History className="size-4" /> Draf sebelumnya dipulihkan. Draf hanya tersimpan di perangkat ini selama 7 hari.
          </span>
          <Button size="sm" variant="ghost" onClick={buangDraf}>
            Mulai dari awal
          </Button>
        </div>
      )}
      <SupervisiForm
        key={awal.versi}
        instrumen={INSTRUMEN_AKTIF}
        defaultValues={awal.nilai}
        onDraf={onDraf}
        onSubmit={simpan}
        submitLabel="Simpan Supervisi"
      />
    </>
  )
}

function EditSupervisi({ id }: { id: string }) {
  const profil = useProfilAktif()
  const navigate = useNavigate()
  const { data, isPending, isError, error, refetch } = useSupervisi(id)
  const ubah = useUbahSupervisi()

  if (isPending) return <PageLoader />
  if (isError) return <Card><PanelGalat error={error} onCoba={() => void refetch()} /></Card>
  if (!data)
    return (
      <Card>
        <EmptyState icon={FileQuestion} title="Data tidak ditemukan" action={<Link to="/supervisi" className={buttonClass({ variant: 'secondary' })}>Kembali</Link>} />
      </Card>
    )

  const boleh = !data.deletedAt && (data.createdBy === profil.uid || profil.role === 'admin')
  if (!boleh)
    return (
      <Card>
        <EmptyState
          icon={Lock}
          title="Tidak dapat mengubah data ini"
          description={
            data.deletedAt
              ? 'Data ini sudah dihapus. Admin sekolah dapat memulihkannya terlebih dahulu.'
              : 'Hanya pembuat data atau admin sekolah yang dapat mengubahnya.'
          }
          action={<Link to={`/supervisi/${id}`} className={buttonClass({ variant: 'secondary' })}>Lihat detail</Link>}
        />
      </Card>
    )

  async function simpan(values: SupervisiFormValues) {
    try {
      await ubah.mutateAsync({ awal: data!, values })
      toast.success('Perubahan disimpan.')
      navigate(`/supervisi/${id}`, { replace: true })
    } catch (e) {
      toast.error(pesanError(e))
      throw e
    }
  }

  return (
    <>
      <PageHeader title="Ubah Supervisi" description={`${data.guruNama} · ${data.identitas.mataPelajaran}`} />
      <SupervisiForm
        instrumen={data.instrumen}
        defaultValues={supervisiKeFormInput(data)}
        guruTetap={{ id: data.guruId, nama: data.guruNama }}
        peringatiPerubahan
        onSubmit={simpan}
        submitLabel="Simpan Perubahan"
      />
    </>
  )
}
