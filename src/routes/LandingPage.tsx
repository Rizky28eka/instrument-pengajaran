import { Link } from 'react-router'
import { Check, GraduationCap, Plus } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PREDIKAT_STYLE } from '@/components/ui/predikat-style'
import { ASPEK, SEMUA_INDIKATOR, SKALA } from '@/data/instrumen'
import { useAuth } from '@/features/auth/auth-context'
import { ObservationSheet } from '@/features/landing/ObservationSheet'
import { BATAS_PREDIKAT, predikatDari } from '@/lib/scoring'
import { cn } from '@/lib/utils'

const tombol = {
  utama: 'inline-flex h-12 items-center justify-center rounded-lg bg-brand-600 px-6 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700',
  tepi: 'inline-flex h-12 items-center justify-center rounded-lg px-6 font-semibold text-ink ring-1 ring-inset ring-ink/25 transition-colors hover:bg-white',
}

const PERBANDINGAN = [
  ['Nilai dihitung dengan kalkulator, satu aspek demi satu aspek.', 'Skor, nilai, dan predikat muncul saat Anda menandai indikator.'],
  ['Hasil disalin ulang ke Excel agar bisa direkap.', 'Setiap supervisi tersimpan di akun. Ekspor CSV kapan saja untuk Google Sheets.'],
  ['Lembar kertas tercecer sebelum rapat evaluasi.', 'Semua hasil terkumpul di satu daftar yang bisa dicari per guru, mapel, dan kelas.'],
  ['Laporan untuk guru diketik ulang.', 'Cetak halaman A4 lengkap dengan kolom tanda tangan guru dan supervisor.'],
]

const LANGKAH = [
  ['Isi identitas', 'Sekolah, guru, mata pelajaran, kelas, tanggal, kurikulum, dan model pembelajaran.'],
  ['Beri skor tiap indikator', 'Skala 1 sampai 4 untuk setiap indikator, aspek demi aspek, dengan catatan pengamatan bila perlu.'],
  ['Simpan dan baca rekapnya', 'Nilai akhir, predikat, dan skor per aspek langsung tersedia, juga di dashboard.'],
]

const HASIL = [
  'Rata-rata nilai dan jumlah guru yang sudah disupervisi',
  'Capaian tiap aspek, supaya terlihat bagian mana yang paling perlu dibenahi',
  'Daftar guru dengan predikat Cukup atau Perlu Perbaikan untuk pendampingan',
  'Pencarian dan filter predikat di daftar supervisi',
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
      <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
        <GraduationCap className="size-[18px]" />
      </span>
      <span className={cn('font-serif text-lg font-semibold', terang ? 'text-white' : 'text-ink')}>Supervisi Akademik</span>
    </span>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const masuk = user ? '/dashboard' : '/login'
  const labelMasuk = user ? 'Buka dashboard' : 'Mulai supervisi'
  const terbanyak = Math.max(...ASPEK.map((a) => a.indikator.length))

  return (
    <div className="min-h-svh bg-paper text-ink">
      <a href="#utama" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Beranda">
            <Brand />
          </Link>
          <nav aria-label="Utama" className="hidden items-center gap-8 text-sm font-medium text-ink/75 md:flex">
            <a href="#instrumen" className="hover:text-ink">Instrumen</a>
            <a href="#cara-kerja" className="hover:text-ink">Cara kerja</a>
            <a href="#hasil" className="hover:text-ink">Hasil</a>
            <a href="#faq" className="hover:text-ink">Tanya jawab</a>
          </nav>
          <Link to={masuk} className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/85">
            {user ? 'Buka dashboard' : 'Masuk'}
          </Link>
        </div>
      </header>

      <main id="utama">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-8 lg:pt-20 lg:pb-28">
          <div>
            <h1 className="max-w-[18ch] font-serif text-4xl leading-[1.12] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
              Lembar supervisi guru, tanpa rekap manual.
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink/75">
              Nilai instrumen supervisi akademik Kurikulum Merdeka langsung dihitung, tersimpan, dan terekap per guru dan per aspek.
              Dibuat untuk kepala sekolah dan supervisor akademik SMP.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={masuk} className={tombol.utama}>
                {labelMasuk}
              </Link>
              <a href="#instrumen" className={tombol.tepi}>
                Lihat isi instrumen
              </a>
            </div>
          </div>
          <ObservationSheet />
        </section>

        {/* Perbandingan */}
        <section className="border-y border-ink/10 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="max-w-[24ch] font-serif text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              Dari lembar kertas ke rekap, tanpa menyalin ulang.
            </h2>
            <div className="mt-10 overflow-hidden rounded-xl ring-1 ring-ink/12">
              <table className="w-full text-left">
                <caption className="sr-only">Perbandingan cara supervisi manual dengan aplikasi ini</caption>
                <thead className="bg-paper text-sm text-ink/65">
                  <tr>
                    <th scope="col" className="w-1/2 px-5 py-3 font-medium">Cara yang biasa dipakai</th>
                    <th scope="col" className="w-1/2 px-5 py-3 font-medium">Di aplikasi ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {PERBANDINGAN.map(([lama, baru]) => (
                    <tr key={lama} className="align-top">
                      <td className="px-5 py-5 text-[15px] leading-relaxed text-ink/60">{lama}</td>
                      <td className="px-5 py-5 text-[15px] leading-relaxed font-medium">{baru}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Instrumen */}
        <section id="instrumen" className="scroll-mt-16 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
              <div>
                <h2 className="font-serif text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                  {ASPEK.length} aspek, {SEMUA_INDIKATOR.length} indikator, satu skala.
                </h2>
                <p className="mt-5 max-w-[48ch] leading-relaxed text-ink/75">
                  Perencanaan, pelaksanaan, asesmen, media dan teknologi, sampai evaluasi dan tindak lanjut. Setiap indikator dinilai
                  dari pengamatan dan bukti yang relevan.
                </p>
                <dl className="mt-8 space-y-3">
                  {[...SKALA].map((s) => (
                    <div key={s.nilai} className="flex items-center gap-4">
                      <dt className="grid size-9 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{s.nilai}</dt>
                      <dd className="font-medium">{s.label}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-6 max-w-[48ch] text-sm leading-relaxed text-ink/65">
                  Nilai adalah total skor dibagi skor maksimal, dikali 100.{' '}
                  {BATAS_PREDIKAT.slice(0, 3).map((b) => `${b.min} ke atas ${b.predikat}`).join(', ')}, dan di bawah {BATAS_PREDIKAT[2].min} Perlu Perbaikan.
                </p>
              </div>

              <ol className="divide-y divide-ink/12 border-y border-ink/12">
                {ASPEK.map((a) => (
                  <li key={a.id} className="grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[2.5rem_1fr]">
                    <span className="font-serif text-2xl leading-none font-semibold text-ink/35">{a.kode}</span>
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <h3 className="font-semibold">{a.judul}</h3>
                        <p className="text-sm text-ink/60 tabular-nums">
                          {a.indikator.length} indikator, skor maksimal {a.skorMaks}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-ink/65">{a.deskripsi}</p>
                      <div className="mt-3 h-1.5 rounded-full bg-ink/8" aria-hidden>
                        <div className="h-full rounded-full bg-ink" style={{ width: `${(a.indikator.length / terbanyak) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="scroll-mt-16 border-y border-ink/10 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="max-w-[22ch] font-serif text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              Tiga langkah dari kelas sampai rekap.
            </h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {LANGKAH.map(([judul, isi], i) => (
                <li key={judul}>
                  <span className="font-serif text-5xl leading-none font-semibold text-margin">{i + 1}</span>
                  <h3 className="mt-4 text-lg font-semibold">{judul}</h3>
                  <p className="mt-2 max-w-[38ch] leading-relaxed text-ink/70">{isi}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Hasil */}
        <section id="hasil" className="scroll-mt-16 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <h2 className="max-w-[22ch] font-serif text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                Lihat di mana pembelajaran perlu dibenahi.
              </h2>
              <ul className="mt-8 space-y-4">
                {HASIL.map((t) => (
                  <li key={t} className="flex gap-3 leading-relaxed text-ink/80">
                    <Check className="mt-1 size-5 shrink-0 text-brand-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <figure className="m-0">
              <div className="rounded-xl bg-white p-6 shadow-[0_24px_48px_-28px_rgba(18,35,63,0.3)] ring-1 ring-ink/10 sm:p-8">
                <p className="font-semibold">Capaian rata-rata per aspek</p>
                <ul className="mt-6 space-y-5">
                  {CONTOH_CAPAIAN.map(({ kode, nilai }) => {
                    const a = ASPEK.find((x) => x.kode === kode)
                    return (
                      <li key={kode}>
                        <div className="mb-1.5 flex justify-between gap-3 text-sm">
                          <span className="truncate">
                            <b className="mr-1.5 text-ink/40">{kode}</b>
                            {a?.judul}
                          </span>
                          <span className="font-semibold tabular-nums">{nilai}%</span>
                        </div>
                        <ProgressBar value={nilai} className="h-2.5" barClassName={PREDIKAT_STYLE[predikatDari(nilai)].bar} />
                      </li>
                    )
                  })}
                </ul>
              </div>
              <figcaption className="mt-3 text-sm text-ink/60">Contoh tampilan dengan data rekaan, bukan hasil supervisi sungguhan.</figcaption>
            </figure>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 border-t border-ink/10 bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16 lg:px-8">
            <h2 className="font-serif text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">Pertanyaan yang sering muncul.</h2>
            <div className="divide-y divide-ink/12 border-y border-ink/12">
              {FAQ.map(([tanya, jawab]) => (
                <details key={tanya} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                    {tanya}
                    <Plus className="mt-0.5 size-5 shrink-0 text-ink/50 transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 max-w-[60ch] leading-relaxed text-ink/75">{jawab}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Ajakan akhir */}
        <section className="bg-ink py-20 text-white sm:py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
            <h2 className="max-w-[24ch] font-serif text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              Supervisi berikutnya, langsung tercatat rapi.
            </h2>
            <Link
              to={masuk}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-white px-6 font-semibold text-ink transition-colors hover:bg-paper"
            >
              {labelMasuk}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-ink/65 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Brand />
          <p>Instrumen supervisi akademik guru SMP, Kurikulum Merdeka.</p>
        </div>
      </footer>
    </div>
  )
}
