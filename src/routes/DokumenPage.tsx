import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ChevronLeft, ChevronRight, FolderOpen, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Field'
import { PageLoader } from '@/components/ui/Spinner'
import { useProfilAktif } from '@/features/auth/auth-context'
import { KATEGORI, type KategoriId } from '@/features/documents/config'
import { filterDokumen, paginasi, tertundaMilik } from '@/features/documents/daftar'
import { DaftarDokumen } from '@/features/documents/components/DaftarDokumen'
import { DetailDokumenDialog } from '@/features/documents/components/DetailDokumenDialog'
import { PratinjauDialog } from '@/features/documents/components/PratinjauDialog'
import { TertundaDaftar } from '@/features/documents/components/TertundaDaftar'
import { UnggahBerkas } from '@/features/documents/components/UnggahBerkas'
import { LABEL_REVIEW } from '@/features/documents/labels'
import { useAksiDokumen, useDokumenSekolah } from '@/features/documents/queries'
import { REVIEW_STATUS, type ReviewStatus } from '@/features/documents/review'
import { useSekolah } from '@/features/sekolah/queries'
import { useGuruList } from '@/features/guru/queries'
import { cn } from '@/lib/utils'

const UKURAN_HALAMAN = 10

type Tab = 'dokumen' | 'review' | 'belum-selesai' | 'sampah'
const TAB: { id: Tab; label: string }[] = [
  { id: 'dokumen', label: 'Dokumen' },
  { id: 'review', label: 'Antrean review' },
  { id: 'belum-selesai', label: 'Belum selesai' },
  { id: 'sampah', label: 'Tempat sampah' },
]

export default function DokumenPage() {
  const profil = useProfilAktif()
  const { schoolId } = profil
  const { data: sekolah } = useSekolah()
  const { data = [], isPending, isError, refetch } = useDokumenSekolah(schoolId)
  const aksi = useAksiDokumen(schoolId)
  const [params, setParams] = useSearchParams()
  const [detail, setDetail] = useState<string | null>(null)
  const [pratinjau, setPratinjau] = useState<{ dokId: string; versi: number } | null>(null)

  // Filter di URL agar dapat dibagikan dan bertahan saat tombol kembali.
  const tab = (params.get('tab') as Tab | null) ?? 'dokumen'
  const q = params.get('q') ?? ''
  const kategori = (params.get('kategori') ?? '') as KategoriId | ''
  const pengunggah = params.get('pengunggah') ?? ''
  const review = (params.get('review') ?? '') as ReviewStatus | ''
  const dari = params.get('dari') ?? ''
  const sampai = params.get('sampai') ?? ''
  const halaman = Number(params.get('hal') ?? '1')

  function set(kunci: string, nilai: string) {
    setParams(
      (prev) => {
        const baru = new URLSearchParams(prev)
        if (nilai) baru.set(kunci, nilai)
        else baru.delete(kunci)
        if (kunci !== 'hal') baru.delete('hal')
        return baru
      },
      { replace: true },
    )
  }

  const pengunggahUnik = useMemo(() => [...new Map(data.map((d) => [d.createdBy, d.createdByName || d.createdBy])).entries()], [data])

  const baris = useMemo(() => {
    if (tab === 'sampah') return filterDokumen(data, { status: 'dihapus', q, kategori, pengunggah, dari, sampai })
    if (tab === 'belum-selesai') return tertundaMilik(filterDokumen(data, { q, kategori }), profil.uid)
    const dasar = filterDokumen(data, { q, kategori, pengunggah, review, dari, sampai }).filter((d) => d.status === 'tersedia')
    return tab === 'review' ? dasar.filter((d) => d.reviewStatus === 'diajukan') : dasar
  }, [data, tab, q, kategori, pengunggah, review, dari, sampai, profil.uid])

  const hal = paginasi(baris, halaman, UKURAN_HALAMAN)
  const hitung = {
    review: data.filter((d) => d.status === 'tersedia' && d.reviewStatus === 'diajukan').length,
    belum: tertundaMilik(data, profil.uid).length,
    sampah: data.filter((d) => d.status === 'dihapus').length,
  }
  const dokPratinjau = pratinjau ? data.find((d) => d.id === pratinjau.dokId) : undefined

  return (
    <>
      <PageHeader title="Dokumen" description={`${sekolah?.nama ?? 'Sekolah'} · Dokumen sekolah, bukti pendukung supervisi, dan pengajuan guru. Berkas hanya dapat dibuka oleh anggota sekolah ini.`} />

      <div className="space-y-6">
        <UnggahSekolah schoolId={schoolId} daftarAda={data} onSelesai={() => void aksi.segarkan()} />

        <Card>
          <div className="flex flex-wrap gap-1 border-b border-slate-100 p-2" role="tablist">
            {TAB.map((t) => {
              const jumlah = t.id === 'review' ? hitung.review : t.id === 'belum-selesai' ? hitung.belum : t.id === 'sampah' ? hitung.sampah : null
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => set('tab', t.id === 'dokumen' ? '' : t.id)}
                  className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', tab === t.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50')}
                >
                  {t.label}
                  {jumlah ? <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{jumlah}</span> : null}
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input type="search" value={q} onChange={(e) => set('q', e.target.value)} placeholder="Cari judul, nama berkas, pengunggah…" className="pl-9" aria-label="Cari dokumen" />
            </div>
            <Select value={kategori} onChange={(e) => set('kategori', e.target.value)} aria-label="Filter kategori">
              <option value="">Semua kategori</option>
              {KATEGORI.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </Select>
            <Select value={pengunggah} onChange={(e) => set('pengunggah', e.target.value)} aria-label="Filter pengunggah">
              <option value="">Semua pengunggah</option>
              {pengunggahUnik.map(([uid, nama]) => (
                <option key={uid} value={uid}>
                  {nama}
                </option>
              ))}
            </Select>
            <Select value={review} onChange={(e) => set('review', e.target.value)} aria-label="Filter status review">
              <option value="">Semua status review</option>
              {REVIEW_STATUS.map((r) => (
                <option key={r} value={r}>
                  {LABEL_REVIEW[r]}
                </option>
              ))}
            </Select>
            <label className="text-xs text-slate-500">
              Dari tanggal
              <Input type="date" value={dari} onChange={(e) => set('dari', e.target.value)} className="mt-1" />
            </label>
            <label className="text-xs text-slate-500">
              Sampai tanggal
              <Input type="date" value={sampai} onChange={(e) => set('sampai', e.target.value)} className="mt-1" />
            </label>
          </div>

          {tab === 'belum-selesai' && hal.total > 0 && (
            <div className="p-4">
              <TertundaDaftar dokumen={hal.baris} schoolId={schoolId} />
            </div>
          )}

          {isPending ? (
            <PageLoader />
          ) : isError ? (
            <EmptyState icon={FolderOpen} title="Gagal memuat dokumen" description="Periksa koneksi internet atau izin akses." action={<Button variant="secondary" onClick={() => refetch()}>Coba lagi</Button>} />
          ) : hal.total === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={data.length ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen'}
              description={data.length ? 'Coba ubah kata kunci atau filter.' : 'Unggah dokumen pertama dari bagian di atas, atau lampirkan dari halaman detail supervisi.'}
            />
          ) : tab === 'belum-selesai' ? null : (
            <>
              <DaftarDokumen dokumen={hal.baris} onDetail={(d) => setDetail(d.id)} onPratinjau={(d) => setPratinjau({ dokId: d.id, versi: d.currentVersion })} />
              <nav aria-label="Halaman" className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                <span>
                  {hal.total} dokumen · halaman {hal.halaman} dari {hal.totalHalaman}
                </span>
                <span className="flex gap-1">
                  <Button size="sm" variant="secondary" disabled={hal.halaman <= 1} onClick={() => set('hal', String(hal.halaman - 1))}>
                    <ChevronLeft /> Sebelumnya
                  </Button>
                  <Button size="sm" variant="secondary" disabled={hal.halaman >= hal.totalHalaman} onClick={() => set('hal', String(hal.halaman + 1))}>
                    Berikutnya <ChevronRight />
                  </Button>
                </span>
              </nav>
            </>
          )}
        </Card>
      </div>

      {detail && (
        <DetailDokumenDialog dokId={detail} schoolId={schoolId} onTutup={() => setDetail(null)} onPratinjau={(d, versi) => setPratinjau({ dokId: d.id, versi })} />
      )}
      {pratinjau && dokPratinjau && <PratinjauDialog dok={dokPratinjau} versi={pratinjau.versi} onTutup={() => setPratinjau(null)} />}
    </>
  )
}

/** Unggah dokumen tingkat sekolah: administratif/template, atau pengajuan guru (bila fitur aktif). */
function UnggahSekolah({ schoolId, daftarAda, onSelesai }: { schoolId: string; daftarAda: Parameters<typeof UnggahBerkas>[0]['daftarAda']; onSelesai: () => void }) {
  const { data: sekolah } = useSekolah()
  const guru = useGuruList()
  const pengajuanAktif = sekolah?.pengirimanDokumenGuru === true
  const [mode, setMode] = useState<'sekolah' | 'guru'>('sekolah')
  const [guruId, setGuruId] = useState('')

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Unggah dokumen</h2>
        {pengajuanAktif && (
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-semibold" role="group" aria-label="Jenis unggahan">
            {(['sekolah', 'guru'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-md px-3 py-1', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                {m === 'sekolah' ? 'Dokumen sekolah' : 'Pengajuan guru'}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'sekolah' || !pengajuanAktif ? (
        <UnggahBerkas schoolId={schoolId} kategori={['administratif', 'template']} relasi={{}} daftarAda={daftarAda.filter((d) => !d.supervisiId && !d.guruId && !d.tindakId)} onSelesai={onSelesai} />
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Guru pengaju</span>
            <Select value={guruId} onChange={(e) => setGuruId(e.target.value)} className="sm:max-w-sm">
              <option value="">— pilih guru —</option>
              {guru.data?.filter((g) => g.aktif).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                </option>
              ))}
            </Select>
          </label>
          {guruId ? (
            <UnggahBerkas key={guruId} schoolId={schoolId} kategori={['pengajuan-guru']} relasi={{ guruId: guruId }} daftarAda={daftarAda.filter((d) => d.guruId === guruId)} onSelesai={onSelesai} />
          ) : (
            <p className="text-sm text-slate-500">Pilih guru terlebih dahulu. Guru belum memiliki akun, jadi dokumen diunggah supervisor atas nama guru lalu masuk antrean review.</p>
          )}
        </div>
      )}
    </Card>
  )
}
