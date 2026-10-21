import { Link } from 'react-router'
import { GraduationCap, Plus } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PREDIKAT_STYLE } from '@/components/ui/predikat-style'
import { ASPEK, SEMUA_INDIKATOR, SKALA } from '@/data/instrumen'
import { rutePerStatus } from '@/features/auth/akses'
import { useAuth } from '@/features/auth/auth-context'
import { ObservationSheet } from '@/features/landing/ObservationSheet'
import { BATAS_PREDIKAT, predikatDari } from '@/lib/scoring'
import { cn } from '@/lib/utils'

const fokusTerang = 'focus-visible:outline-marker'

const LANGKAH = [
  ['Isi identitas', 'Sekolah, guru, mata pelajaran, kelas, tanggal, kurikulum, dan model pembelajaran.'],
  ['Beri skor tiap indikator', 'Skala 1 sampai 4, aspek demi aspek, dengan catatan pengamatan bila perlu.'],
  ['Simpan dan baca rekapnya', 'Nilai akhir, predikat, dan skor per aspek langsung tersedia.'],
]

// Contoh tampilan saja, bukan data nyata.
const CONTOH_CAPAIAN = [
  { kode: 'A', nilai: 88 },
  { kode: 'B', nilai: 79 },
  { kode: 'C', nilai: 72 },
  { kode: 'D', nilai: 64 },
  { kode: 'E', nilai: 70 },
]

const FAQ = [
  [
    'Siapa yang bisa memakai aplikasi ini?',
    'Kepala sekolah dan supervisor akademik. Setiap orang masuk dengan akunnya sendiri. Semua akun yang sudah masuk dapat melihat hasil supervisi, tetapi hanya pembuatnya yang dapat mengubah atau menghapus.',
  ],
  [
    'Apakah cocok untuk sekolah yang belum memakai Kurikulum Merdeka?',
    'Instrumennya disusun untuk Kurikulum Merdeka. Identitas supervisi tetap bisa mencatat Kurikulum 2013 atau kurikulum lain, tetapi indikator penilaiannya sama.',
  ],
  [
    'Bagaimana kalau sinyal putus saat mengisi?',
    'Isian tersimpan otomatis di perangkat sebagai draf dan dipulihkan saat halaman dibuka lagi. Untuk menyimpan hasil akhir, perangkat harus terhubung ke internet.',
  ],
  [
    'Bisakah datanya dipindah ke Google Sheets?',
    'Bisa. Ekspor CSV menghasilkan satu baris per supervisi, lengkap dengan skor tiap indikator, dan siap diimpor ke Google Sheets atau Excel.',
  ],
  [
    'Bisakah hasilnya dicetak?',
    'Bisa. Halaman detail supervisi punya tombol Cetak dengan format A4 dan kolom tanda tangan untuk guru dan supervisor.',
  ],
]

function Brand({ terang }: { terang?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={cn('grid size-8 place-items-center rounded-lg', terang ? 'bg-white text-brand-700' : 'bg-brand-600 text-white')}>
        <GraduationCap className="size-[18px]" />
      </span>
      <span className={cn('font-display text-lg font-bold', terang && 'text-white')}>Supervisi Akademik</span>
    </span>
  )
}

export default function LandingPage() {
  const { status } = useAuth()
  const aktif = status === 'aktif'
  const masuk = rutePerStatus(status) ?? '/login'
  const labelMasuk = aktif ? 'Buka dashboard' : status === 'anonim' || status === 'memuat' ? 'Mulai supervisi' : 'Lanjutkan'

  return (
    <div className="min-h-svh bg-page font-text text-ink">
      <a href="#utama" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Lewati ke konten
      </a>

      {/* Hero: ungu tinta stempel */}
      <header className="bg-brand-700 text-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Beranda" className={fokusTerang}>
            <Brand terang />
          </Link>
          <nav aria-label="Utama" className="hidden items-center gap-8 text-[15px] text-white/85 md:flex">
            <a href="#instrumen" className={cn('hover:text-white', fokusTerang)}>Instrumen</a>
            <a href="#cara-kerja" className={cn('hover:text-white', fokusTerang)}>Cara kerja</a>
            <a href="#faq" className={cn('hover:text-white', fokusTerang)}>Tanya jawab</a>
          </nav>
          <Link
            to={masuk}
            className={cn('inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white ring-1 ring-inset ring-white/45 transition-colors hover:bg-white/10', fokusTerang)}
          >
            {aktif ? 'Buka dashboard' : status === 'anonim' || status === 'memuat' ? 'Masuk' : 'Lanjutkan'}
          </Link>
        </div>
      </header>

      <main id="utama">
        <section className="bg-brand-700 text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-8 lg:pt-12 lg:pb-24">
            <div>
              <h1 className="max-w-[16ch] font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Lembar supervisi guru, tanpa rekap manual.
              </h1>
              <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-white/90">
                Nilai instrumen supervisi akademik Kurikulum Merdeka langsung dihitung, tersimpan, dan terekap per guru dan per aspek.
                Dibuat untuk kepala sekolah dan supervisor akademik SMP.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link
                  to={masuk}
                  className={cn('inline-flex h-12 items-center rounded-lg bg-marker px-6 font-semibold text-ink transition-colors hover:bg-white', fokusTerang)}
                >
                  {labelMasuk}
                </Link>
                <a href="#instrumen" className={cn('font-semibold underline decoration-white/50 underline-offset-4 hover:decoration-white', fokusTerang)}>
                  Lihat isi instrumen
                </a>
              </div>
            </div>
            <ObservationSheet />
          </div>
        </section>

      {/* Yang tidak perlu lagi: coretan pena merah */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <h2 className="sr-only">Yang tidak perlu lagi Anda lakukan</h2>
        <p className="max-w-[30ch] font-display text-3xl leading-snug font-bold text-balance sm:text-4xl lg:text-5xl lg:leading-[1.2]">
          Tidak perlu lagi <del className="decoration-margin decoration-[3px]">menghitung skor dengan kalkulator</del>,{' '}
          <del className="decoration-margin decoration-[3px]">menyalin hasil ke Excel</del>, atau{' '}
          <del className="decoration-margin decoration-[3px]">mencari lembar yang terselip</del> sebelum rapat evaluasi.
        </p>
        <p className="mt-8 max-w-[44ch] text-lg leading-relaxed text-ink/80">Cukup tandai skornya, simpan, dan baca rekapnya.</p>
      </section>

      {/* Instrumen: bergaya daftar isi buku */}
      <section id="instrumen" className="scroll-mt-6 border-y border-ink/10 bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20 lg:px-8">
          <div>
            <h2 className="font-display text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              {ASPEK.length} aspek, {SEMUA_INDIKATOR.length} indikator, satu skala.
            </h2>
            <dl className="mt-8 space-y-3">
              {SKALA.map((s) => (
                <div key={s.nilai} className="flex items-center gap-4">
                  <dt className="grid size-9 place-items-center rounded-full bg-ink text-sm font-bold text-white">{s.nilai}</dt>
                  <dd className="font-medium">{s.label}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 max-w-[34ch] text-[15px] leading-relaxed text-ink/80">
              Nilai adalah total skor dibagi skor maksimal, dikali 100.{' '}
              {BATAS_PREDIKAT.slice(0, 3).map((b) => `${b.min} ke atas ${b.predikat}`).join(', ')}, dan di bawah {BATAS_PREDIKAT[2].min} Perlu
              Perbaikan.
            </p>
          </div>

          <ol>
            {ASPEK.map((a) => (
              <li key={a.id} className="border-b border-ink/10 py-6 first:pt-0 last:border-b-0">
                <div className="flex items-end gap-3">
                  <h3 className="font-display text-xl leading-snug font-bold sm:text-2xl">
                    <span className="mr-2 text-ink/60">{a.kode}</span>
                    {a.judul}
                  </h3>
                  <span aria-hidden className="mb-2 min-w-6 flex-1 border-b-2 border-dotted border-ink/35" />
                  <span className="mb-0.5 shrink-0 font-medium tabular-nums">{a.indikator.length} indikator</span>
                </div>
                <p className="mt-2 max-w-[56ch] leading-relaxed text-ink/80">{a.deskripsi}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Cara kerja dan hasil: kuning stabilo */}
      <section id="cara-kerja" className="scroll-mt-6 bg-marker py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div>
            <h2 className="max-w-[18ch] font-display text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              Dari lembar isian sampai rekap, tiga langkah.
            </h2>
            <ol className="mt-10 space-y-8">
              {LANGKAH.map(([judul, isi], i) => (
                <li key={judul} className="grid grid-cols-[2.75rem_1fr] gap-x-3">
                  <span className="font-display text-4xl leading-none font-extrabold">{i + 1}</span>
                  <div>
                    <h3 className="text-lg font-bold">{judul}</h3>
                    <p className="mt-1 max-w-[42ch] leading-relaxed text-ink/85">{isi}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <figure className="m-0">
            <div className="rounded-xl bg-white p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] sm:p-8">
              <p className="font-bold">Capaian rata-rata per aspek</p>
              <ul className="mt-6 space-y-5">
                {CONTOH_CAPAIAN.map(({ kode, nilai }) => {
                  const a = ASPEK.find((x) => x.kode === kode)
                  return (
                    <li key={kode}>
                      <div className="mb-1.5 flex justify-between gap-3 text-sm">
                        <span className="truncate">
                          <b className="mr-1.5 text-ink/65">{kode}</b>
                          {a?.judul}
                        </span>
                        <span className="font-bold tabular-nums">{nilai}%</span>
                      </div>
                      <ProgressBar value={nilai} className="h-2.5" barClassName={PREDIKAT_STYLE[predikatDari(nilai)].bar} />
                    </li>
                  )
                })}
              </ul>
            </div>
            <figcaption className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-ink/85">
              Contoh tampilan dengan data rekaan. Dashboard juga menandai guru berpredikat Cukup atau Perlu Perbaikan agar bisa segera
              didampingi.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-6 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.7fr] lg:gap-20 lg:px-8">
          <h2 className="font-display text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">Sebelum Anda mulai.</h2>
          <div className="divide-y divide-ink/15 border-y border-ink/15">
            {FAQ.map(([tanya, jawab]) => (
              <details key={tanya} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                  {tanya}
                  <Plus className="mt-1 size-5 shrink-0 text-ink/60 transition-transform group-open:rotate-45 motion-reduce:transition-none" />
                </summary>
                <p className="mt-3 max-w-[60ch] leading-relaxed text-ink/85">{jawab}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Ajakan akhir */}
      <section className="bg-brand-700 py-24 text-white sm:py-32">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-10 px-4 sm:px-6 lg:px-8">
          <h2 className="max-w-[18ch] font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Supervisi berikutnya, langsung tercatat rapi.
          </h2>
          <Link
            to={masuk}
            className={cn('inline-flex h-12 items-center rounded-lg bg-marker px-6 font-semibold text-ink transition-colors hover:bg-white', fokusTerang)}
          >
            {labelMasuk}
          </Link>
        </div>
      </section>
      </main>

      <footer className="bg-ink py-8 text-white/75">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Brand terang />
          <p>Instrumen supervisi akademik guru SMP, Kurikulum Merdeka.</p>
        </div>
      </footer>
    </div>
  )
}
