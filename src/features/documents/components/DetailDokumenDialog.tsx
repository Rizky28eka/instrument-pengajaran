import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Download, Eye, Pencil, RotateCcw, Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Field'
import { useProfilAktif } from '@/features/auth/auth-context'
import { pesanError } from '@/features/auth/actions'
import { ACCEPT_ATTR, DOKUMEN, kategoriById } from '../config'
import { kedaluwarsa } from '../daftar'
import { periksaBerkas } from '../file-check'
import { bisaDipratinjau, formatUkuran, labelJenis } from '../format'
import { LABEL_KEPUTUSAN, LABEL_REVIEW, LABEL_STATUS_DOKUMEN, NADA_REVIEW } from '../labels'
import type { DokumenDoc } from '../model'
import { bolehGantiVersi, bolehHapusLunak, bolehHapusPermanen, bolehPulihkan, bolehUbahJudul, keputusanTersedia } from '../policy'
import { useAksiDokumen, useDokumenSekolah } from '../queries'
import { perluCatatan, type ReviewStatus } from '../review'
import type { UnggahSiap } from '../service'
import { simpanBlob } from '../simpan-lokal'
import { BarisTugas } from './BarisTugas'

const waktu = (d: Date | null) => (d ? d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

interface Props {
  dokId: string
  schoolId: string
  onTutup: () => void
  onPratinjau: (d: DokumenDoc, versi: number) => void
}

/** Detail metadata, riwayat versi dan review, serta aksi sesuai izin pengguna. */
export function DetailDokumenDialog({ dokId, schoolId, onTutup, onPratinjau }: Props) {
  const profil = useProfilAktif()
  const { data: semua = [] } = useDokumenSekolah(schoolId)
  const aksi = useAksiDokumen(schoolId)
  const dok = semua.find((d) => d.id === dokId)

  const [judulBaru, setJudulBaru] = useState<string | null>(null)
  const [catatan, setCatatan] = useState('')
  const [hapus, setHapus] = useState<'lunak' | 'permanen' | null>(null)
  const [ganti, setGanti] = useState<{ siap: UnggahSiap; berkas: File } | null>(null)
  const [galatGanti, setGalatGanti] = useState<string | null>(null)
  const [sekarang] = useState(() => new Date())
  const input = useRef<HTMLInputElement>(null)
  const berhasilGanti = useCallback(() => void aksi.segarkan(), [aksi])

  if (!dok)
    return (
      <Dialog judul="Dokumen tidak ditemukan" onTutup={onTutup}>
        <p className="text-sm text-slate-600">Dokumen ini mungkin sudah dihapus permanen.</p>
      </Dialog>
    )

  const pelaku = { uid: profil.uid, admin: profil.role === 'admin' }
  const keputusan = keputusanTersedia(dok)
  const versiTerurut = [...dok.versions].sort((a, b) => b.n - a.n)
  const bisaUnduh = dok.status === 'tersedia'

  async function jalankan(nama: string, fn: () => Promise<unknown>) {
    try {
      await fn()
      toast.success(nama)
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  async function unduhVersi(n: number) {
    try {
      const { blob, nama } = await aksi.svc.unduh(dok!, n)
      simpanBlob(blob, nama)
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  async function pilihGanti(f: File | undefined) {
    if (!f || !dok) return
    setGalatGanti(null)
    const hasil = await periksaBerkas(f)
    if (!hasil.ok) return setGalatGanti(hasil.pesan)
    const siap = aksi.svc.siapkanGantiVersi(dok, { berkas: f, periksaSebelumnya: hasil })
    setGanti({ siap, berkas: f })
    void siap.tugas.jalankan()
  }

  async function simpanJudul() {
    if (judulBaru === null || !dok) return
    await jalankan('Judul diperbarui.', () => aksi.ubahJudul.mutateAsync({ d: dok, judul: judulBaru }))
    setJudulBaru(null)
  }

  return (
    <Dialog
      judul={
        judulBaru === null ? (
          <span className="flex items-center gap-2">
            {dok.judul}
            {bolehUbahJudul(pelaku, dok) && (
              <button type="button" onClick={() => setJudulBaru(dok.judul)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Ubah judul">
                <Pencil className="size-3.5" />
              </button>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <input
              value={judulBaru}
              onChange={(e) => setJudulBaru(e.target.value)}
              maxLength={120}
              className="min-w-0 flex-1 rounded-md px-2 py-1 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              aria-label="Judul dokumen"
            />
            <Button size="sm" onClick={() => void simpanJudul()} loading={aksi.ubahJudul.isPending} disabled={!judulBaru.trim()}>
              Simpan
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setJudulBaru(null)}>
              Batal
            </Button>
          </span>
        )
      }
      deskripsi={kategoriById(dok.kategori)?.label}
      onTutup={onTutup}
      lebar="lg"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge nada={dok.status === 'tersedia' ? 'hijau' : dok.status === 'dihapus' ? 'merah' : 'kuning'}>{LABEL_STATUS_DOKUMEN[dok.status]}</Badge>
          {dok.reviewStatus && <Badge nada={NADA_REVIEW[dok.reviewStatus]}>Review: {LABEL_REVIEW[dok.reviewStatus]}</Badge>}
          {dok.pending && dok.status === 'tersedia' && <Badge nada="kuning">Versi baru belum selesai diunggah</Badge>}
        </div>

        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Meta k="Diunggah oleh" v={dok.createdByName || '—'} />
          <Meta k="Waktu unggah" v={waktu(dok.createdAt)} />
          <Meta k="Terakhir diubah" v={waktu(dok.updatedAt)} />
          <Meta
            k="Terkait"
            v={
              dok.supervisiId ? (
                <Link to={`/supervisi/${dok.supervisiId}`} className="font-medium text-brand-700 underline underline-offset-2">
                  Data supervisi
                </Link>
              ) : dok.tindakId ? (
                'Tindak lanjut'
              ) : dok.guruId ? (
                'Pengajuan guru'
              ) : (
                'Dokumen sekolah'
              )
            }
          />
        </dl>

        {dok.status === 'dihapus' && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900 ring-1 ring-rose-200">
            Dihapus {waktu(dok.deletedAt)}. Disimpan {DOKUMEN.retensiHariSetelahHapus} hari sebelum disarankan dihapus permanen
            {kedaluwarsa(dok, sekarang, DOKUMEN.retensiHariSetelahHapus) ? ' — masa simpan sudah lewat.' : '.'}
          </p>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Versi berkas</h3>
          {versiTerurut.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada versi final.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
              {versiTerurut.map((v) => (
                <li key={v.n} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      Versi {v.n}
                      {v.n === dok.currentVersion && <span className="ml-2 text-xs font-semibold text-emerald-700">berlaku</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {v.fileName} · {labelJenis(v.mimeType)} · {formatUkuran(v.size)} · {waktu(v.uploadedAt)}
                    </p>
                    <p className="text-[11px] text-slate-400" title={v.sha256}>
                      SHA-256 {v.sha256.slice(0, 16)}…
                    </p>
                  </div>
                  {bisaUnduh && (
                    <div className="flex gap-1">
                      {bisaDipratinjau(v.mimeType) && (
                        <Button size="sm" variant="ghost" onClick={() => onPratinjau(dok, v.n)} aria-label={`Pratinjau versi ${v.n}`}>
                          <Eye />
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => void unduhVersi(v.n)}>
                        <Download /> Unduh
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {bolehGantiVersi(pelaku, dok) && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Ganti dengan versi baru</h3>
            {ganti ? (
              <ul>
                <BarisTugas
                  nama={ganti.berkas.name}
                  ukuran={ganti.berkas.size}
                  tipe={ganti.berkas.type}
                  tugas={ganti.siap.tugas}
                  onBerhasil={berhasilGanti}
                  onLepas={() => setGanti(null)}
                />
              </ul>
            ) : (
              <>
                <Button variant="secondary" onClick={() => input.current?.click()}>
                  <Upload /> Pilih berkas pengganti
                </Button>
                <input
                  ref={input}
                  type="file"
                  accept={ACCEPT_ATTR}
                  className="sr-only"
                  aria-label="Pilih berkas pengganti"
                  onChange={(e) => {
                    void pilihGanti(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                {galatGanti && (
                  <p role="alert" className="mt-2 text-sm text-rose-700">
                    {galatGanti}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">Versi lama tetap tersimpan dan dapat diunduh. Maksimal {DOKUMEN.maksVersi} versi.</p>
              </>
            )}
          </section>
        )}

        {dok.reviewStatus && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Review</h3>
            <ol className="space-y-2">
              {dok.reviewRiwayat.map((r, i) => (
                <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200/70">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      {LABEL_REVIEW[r.status as ReviewStatus] ?? r.status} <span className="font-normal text-slate-500">oleh {r.nama || 'pengguna'}</span>
                    </span>
                    <span className="text-xs text-slate-500">{waktu(r.at)}</span>
                  </p>
                  {r.catatan && <p className="mt-1 whitespace-pre-line text-slate-700">{r.catatan}</p>}
                </li>
              ))}
            </ol>

            {keputusan.length > 0 && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  maxLength={1000}
                  placeholder="Alasan / catatan (wajib untuk menolak atau meminta revisi)"
                  aria-label="Catatan keputusan"
                />
                <div className="flex flex-wrap gap-2">
                  {keputusan.map((ke) => (
                    <Button
                      key={ke}
                      variant={ke === 'ditolak' ? 'danger' : ke === 'disetujui' ? 'primary' : 'secondary'}
                      disabled={perluCatatan(ke) && !catatan.trim()}
                      loading={aksi.putuskanReview.isPending && aksi.putuskanReview.variables?.ke === ke}
                      onClick={() =>
                        void jalankan(`Keputusan "${LABEL_KEPUTUSAN[ke]}" dicatat.`, async () => {
                          await aksi.putuskanReview.mutateAsync({ d: dok, ke, catatan })
                          setCatatan('')
                        })
                      }
                    >
                      {LABEL_KEPUTUSAN[ke]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {(bolehHapusLunak(pelaku, dok) || bolehPulihkan(pelaku, dok) || bolehHapusPermanen(pelaku, dok)) && (
          <section className="border-t border-slate-100 pt-4">
            {hapus === null ? (
              <div className="flex flex-wrap gap-2">
                {bolehHapusLunak(pelaku, dok) && (
                  <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setHapus('lunak')}>
                    <Trash2 /> Pindahkan ke sampah
                  </Button>
                )}
                {bolehPulihkan(pelaku, dok) && (
                  <Button variant="secondary" loading={aksi.pulihkan.isPending} onClick={() => void jalankan('Dokumen dipulihkan.', () => aksi.pulihkan.mutateAsync(dok))}>
                    <RotateCcw /> Pulihkan
                  </Button>
                )}
                {bolehHapusPermanen(pelaku, dok) && (
                  <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setHapus('permanen')}>
                    <Trash2 /> Hapus permanen
                  </Button>
                )}
              </div>
            ) : (
              <div role="alert" className="space-y-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-200">
                <p>
                  {hapus === 'lunak'
                    ? 'Dokumen dipindahkan ke tempat sampah dan tidak dapat diunduh sampai dipulihkan.'
                    : 'Semua versi berkas akan dihapus permanen dari penyimpanan. Tindakan ini tidak dapat dibatalkan.'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={aksi.hapusLunak.isPending || aksi.hapusPermanen.isPending}
                    onClick={() =>
                      void jalankan(hapus === 'lunak' ? 'Dipindahkan ke sampah.' : 'Dokumen dihapus permanen.', async () => {
                        if (hapus === 'lunak') await aksi.hapusLunak.mutateAsync(dok)
                        else {
                          await aksi.hapusPermanen.mutateAsync(dok)
                          onTutup()
                        }
                        setHapus(null)
                      })
                    }
                  >
                    {hapus === 'lunak' ? 'Ya, pindahkan' : 'Ya, hapus permanen'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setHapus(null)}>
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </Dialog>
  )
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-900">{v}</dd>
    </div>
  )
}
