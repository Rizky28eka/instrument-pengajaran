import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CircleAlert, FileUp } from 'lucide-react'
import { Select } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { ACCEPT_ATTR, DOKUMEN, kategoriById, type KategoriId } from '../config'
import { cariDuplikat, type RelasiDokumen } from '../daftar'
import { periksaBerkas } from '../file-check'
import { formatUkuran } from '../format'
import type { DokumenDoc } from '../model'
import { useDokumenService } from '../queries'
import type { TugasUnggah } from '../upload-task'
import { BarisTugas } from './BarisTugas'

interface Item {
  kunci: string
  berkas: File
  sha256: string
  tugas: TugasUnggah
  /** Isi identik dengan dokumen yang sudah ada (atau yang sedang antre); unggahan menunggu konfirmasi pengguna. */
  duplikat: boolean
}

interface Props {
  schoolId: string
  /** Kategori yang boleh dipilih untuk konteks ini (satu = tidak ada pilihan). */
  kategori: KategoriId[]
  relasi: RelasiDokumen
  /** Dokumen yang sudah ada pada relasi ini — untuk deteksi duplikat dan batas jumlah. */
  daftarAda: DokumenDoc[]
  onSelesai?: () => void
}

export function UnggahBerkas({ schoolId, kategori, relasi, daftarAda, onSelesai }: Props) {
  const svc = useDokumenService()
  const [pilihan, setPilihan] = useState<KategoriId>(kategori[0])
  const [antrean, setAntrean] = useState<Item[]>([])
  const [ditolak, setDitolak] = useState<{ nama: string; pesan: string }[]>([])
  const [menyeret, setMenyeret] = useState(false)
  const [aktif, setAktif] = useState<ReadonlySet<string>>(new Set())
  const input = useRef<HTMLInputElement>(null)

  // Peringatan sebelum menutup halaman selagi ada unggahan berjalan.
  useEffect(() => {
    if (aktif.size === 0) return
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', cegah)
    return () => window.removeEventListener('beforeunload', cegah)
  }, [aktif.size])

  const tandaiAktif = useCallback((kunci: string, berjalan: boolean) => {
    setAktif((prev) => {
      if (prev.has(kunci) === berjalan) return prev
      const baru = new Set(prev)
      if (berjalan) baru.add(kunci)
      else baru.delete(kunci)
      return baru
    })
  }, [])

  async function tambah(daftar: File[]) {
    if (daftar.length === 0) return
    const adaSekarang = daftarAda.filter((d) => d.status !== 'dihapus').length + antrean.filter((i) => i.tugas.state.status !== 'dibatalkan').length
    const sisa = DOKUMEN.maksDokumenPerRelasi - adaSekarang
    if (sisa <= 0) return void toast.error(`Batas ${DOKUMEN.maksDokumenPerRelasi} dokumen untuk entitas ini sudah tercapai.`)
    let berkas = daftar
    if (berkas.length > DOKUMEN.maksFilePerBatch) {
      toast.warning(`Maksimal ${DOKUMEN.maksFilePerBatch} berkas sekali unggah; sisanya diabaikan.`)
      berkas = berkas.slice(0, DOKUMEN.maksFilePerBatch)
    }
    if (berkas.length > sisa) {
      toast.warning(`Hanya ${sisa} berkas lagi yang dapat ditambahkan untuk entitas ini.`)
      berkas = berkas.slice(0, sisa)
    }

    const baruDitolak: { nama: string; pesan: string }[] = []
    const baruItem: Item[] = []
    for (const f of berkas) {
      const hasil = await periksaBerkas(f)
      if (!hasil.ok) {
        baruDitolak.push({ nama: f.name, pesan: hasil.pesan })
        continue
      }
      const serupaDiAntrean = [...antrean, ...baruItem].some((i) => i.sha256 === hasil.sha256 && i.tugas.state.status !== 'dibatalkan')
      const duplikat = serupaDiAntrean || cariDuplikat(daftarAda, hasil.sha256, relasi).length > 0
      const { tugas } = svc.siapkanUnggahBaru({ schoolId, kategori: pilihan, relasi, berkas: f, periksaSebelumnya: hasil })
      baruItem.push({ kunci: crypto.randomUUID(), berkas: f, sha256: hasil.sha256, tugas, duplikat })
    }
    setDitolak(baruDitolak)
    setAntrean((a) => [...a, ...baruItem])
    // Berkas tanpa duplikat langsung berjalan; yang berpotensi duplikat menunggu keputusan pengguna.
    for (const i of baruItem) if (!i.duplikat) void i.tugas.jalankan()
  }

  const lepas = (kunci: string) => setAntrean((a) => a.filter((i) => i.kunci !== kunci))

  return (
    <div className="space-y-3">
      {kategori.length > 1 && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Kategori dokumen</span>
          <Select value={pilihan} onChange={(e) => setPilihan(e.target.value as KategoriId)} className="sm:max-w-sm">
            {kategori.map((k) => (
              <option key={k} value={k}>
                {kategoriById(k)?.label ?? k}
              </option>
            ))}
          </Select>
        </label>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setMenyeret(true)
        }}
        onDragLeave={() => setMenyeret(false)}
        onDrop={(e) => {
          e.preventDefault()
          setMenyeret(false)
          void tambah([...e.dataTransfer.files])
        }}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
          menyeret ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/60',
        )}
      >
        <FileUp className="size-6 text-brand-600" aria-hidden />
        <p className="text-sm text-slate-700">
          Seret berkas ke sini, atau{' '}
          <button type="button" className="font-semibold text-brand-700 underline underline-offset-2" onClick={() => input.current?.click()}>
            pilih dari perangkat
          </button>
        </p>
        <p className="text-xs text-slate-500">
          PDF, Word, Excel, CSV, JPG/PNG · maks. {formatUkuran(DOKUMEN.maksUkuranByte)} per berkas · maks. {DOKUMEN.maksFilePerBatch} berkas sekali unggah
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="sr-only"
          aria-label="Pilih berkas untuk diunggah"
          onChange={(e) => {
            void tambah([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>

      {ditolak.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
          {ditolak.map((d, i) => (
            <li key={i} className="flex gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <b>{d.nama}</b> — {d.pesan}
              </span>
            </li>
          ))}
        </ul>
      )}

      {antrean.length > 0 && (
        <ul className="space-y-2">
          {antrean.map((item) => (
            <BarisItem key={item.kunci} item={item} onAktif={tandaiAktif} onBerhasil={onSelesai} onLepas={lepas} />
          ))}
        </ul>
      )}
    </div>
  )
}

function BarisItem({
  item,
  onAktif,
  onBerhasil,
  onLepas,
}: {
  item: Item
  onAktif: (kunci: string, berjalan: boolean) => void
  onBerhasil?: () => void
  onLepas: (kunci: string) => void
}) {
  // Callback stabil per item agar efek di BarisTugas tidak berjalan ulang setiap render induk.
  const aktif = useCallback((b: boolean) => onAktif(item.kunci, b), [onAktif, item.kunci])
  const lepas = useCallback(() => onLepas(item.kunci), [onLepas, item.kunci])
  return (
    <BarisTugas
      nama={item.berkas.name}
      ukuran={item.berkas.size}
      tipe={item.berkas.type}
      tugas={item.tugas}
      perluKonfirmasi={item.duplikat}
      pesanKonfirmasi="Berkas dengan isi yang sama sudah ada pada entitas ini. Unggah lagi hanya bila memang diperlukan."
      onAktif={aktif}
      onBerhasil={onBerhasil}
      onLepas={lepas}
    />
  )
}
