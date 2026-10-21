/**
 * Master data instrumen supervisi akademik guru SMP (Kurikulum Merdeka).
 * Seluruh form, perhitungan skor, dan ekspor dibangun dari data ini —
 * ubah teks/indikator di sini, tidak perlu mengubah komponen.
 */

export interface Indikator {
  id: string
  teks: string
}

export interface KelompokIndikator {
  judul?: string
  indikator: Indikator[]
}

export interface Aspek {
  id: string
  kode: string
  judul: string
  deskripsi: string
  kelompok: KelompokIndikator[]
  indikator: Indikator[]
  skorMaks: number
}

export const SKALA = [
  { nilai: 4, label: 'Sangat Baik' },
  { nilai: 3, label: 'Baik' },
  { nilai: 2, label: 'Cukup' },
  { nilai: 1, label: 'Perlu Perbaikan' },
] as const

export const SKOR_MAKS_INDIKATOR = 4

function buatAspek(
  kode: string,
  judul: string,
  deskripsi: string,
  kelompok: { judul?: string; items: string[] }[],
): Aspek {
  let n = 0
  const grup = kelompok.map((k) => ({
    judul: k.judul,
    indikator: k.items.map((teks) => ({ id: `${kode}${++n}`, teks })),
  }))
  const indikator = grup.flatMap((g) => g.indikator)
  return {
    id: kode,
    kode,
    judul,
    deskripsi,
    kelompok: grup,
    indikator,
    skorMaks: indikator.length * SKOR_MAKS_INDIKATOR,
  }
}

export const ASPEK: Aspek[] = [
  buatAspek('A', 'Perencanaan Pembelajaran', 'Kesesuaian dokumen dan rancangan pembelajaran dengan kurikulum.', [
    {
      items: [
        'Guru memiliki dokumen perencanaan pembelajaran yang sesuai dengan kurikulum yang diterapkan sekolah.',
        'Guru merumuskan tujuan pembelajaran secara jelas dan sesuai dengan capaian pembelajaran yang relevan.',
        'Guru memilih materi pembelajaran sesuai dengan tujuan yang hendak dicapai.',
        'Guru merencanakan kegiatan pembelajaran yang mendorong keterlibatan aktif peserta didik.',
        'Guru memilih metode dan sumber belajar sesuai dengan karakteristik materi.',
        'Guru merencanakan asesmen untuk mengetahui ketercapaian tujuan pembelajaran.',
      ],
    },
  ]),
  buatAspek('B', 'Pelaksanaan Pembelajaran', 'Kegiatan pendahuluan, inti, dan penutup di kelas.', [
    {
      judul: 'Kegiatan Pendahuluan',
      items: [
        'Guru membuka pembelajaran dan menyiapkan peserta didik untuk mengikuti kegiatan belajar.',
        'Guru memeriksa kesiapan belajar peserta didik.',
        'Guru menghubungkan materi dengan pengetahuan atau pengalaman sebelumnya.',
        'Guru menyampaikan tujuan pembelajaran dengan jelas.',
      ],
    },
    {
      judul: 'Kegiatan Inti',
      items: [
        'Guru menguasai materi yang disampaikan.',
        'Guru menjelaskan materi menggunakan bahasa yang mudah dipahami.',
        'Guru menggunakan metode pembelajaran yang sesuai dengan tujuan dan karakteristik materi.',
        'Guru memberikan kesempatan kepada peserta didik untuk bertanya dan menyampaikan pendapat.',
        'Guru melibatkan peserta didik secara aktif dalam proses pembelajaran.',
        'Guru menggunakan media atau sumber belajar yang relevan.',
        'Guru memberikan bimbingan kepada peserta didik yang mengalami kesulitan belajar.',
        'Guru memperhatikan perbedaan kemampuan dan kebutuhan belajar peserta didik.',
        'Guru mengelola kelas agar pembelajaran berlangsung tertib dan kondusif.',
        'Guru membangun komunikasi yang positif serta menghargai pendapat peserta didik.',
        'Guru mengaitkan materi dengan penerapannya dalam kehidupan sehari-hari apabila relevan.',
      ],
    },
    {
      judul: 'Kegiatan Penutup',
      items: [
        'Guru membimbing peserta didik menyimpulkan materi pembelajaran.',
        'Guru memeriksa pemahaman peserta didik terhadap materi yang dipelajari.',
        'Guru memberikan umpan balik terhadap proses atau hasil belajar.',
        'Guru mengajak peserta didik melakukan refleksi pembelajaran.',
        'Guru menyampaikan tindak lanjut pembelajaran sesuai kebutuhan peserta didik.',
      ],
    },
  ]),
  // C4–C6, serta seluruh aspek D dan E, belum tercantum di dokumen sumber —
  // ini rancangan awal yang perlu dikonfirmasi oleh tim penyusun instrumen.
  buatAspek('C', 'Asesmen dan Hasil Belajar', 'Teknik asesmen, umpan balik, dan pemanfaatan hasil belajar.', [
    {
      items: [
        'Guru menggunakan teknik asesmen yang sesuai dengan tujuan pembelajaran.',
        'Guru memeriksa pemahaman peserta didik selama proses pembelajaran.',
        'Guru memberikan umpan balik yang jelas dan membangun.',
        'Guru menilai hasil belajar secara objektif berdasarkan kriteria yang jelas.',
        'Guru mendokumentasikan hasil asesmen peserta didik secara tertib.',
        'Guru memanfaatkan hasil asesmen untuk memperbaiki pembelajaran.',
      ],
    },
  ]),
  buatAspek('D', 'Pemanfaatan Media dan Teknologi', 'Penggunaan media dan teknologi digital dalam pembelajaran.', [
    {
      items: [
        'Guru menggunakan media pembelajaran yang sesuai dengan tujuan dan materi.',
        'Guru memanfaatkan teknologi digital untuk mendukung proses pembelajaran.',
        'Guru menggunakan media atau teknologi secara efektif dan efisien waktu.',
        'Guru memfasilitasi peserta didik memanfaatkan teknologi untuk belajar.',
        'Guru memanfaatkan platform digital untuk berbagi materi, tugas, atau umpan balik.',
      ],
    },
  ]),
  buatAspek('E', 'Evaluasi dan Tindak Lanjut', 'Refleksi guru serta program remedial dan pengayaan.', [
    {
      items: [
        'Guru melakukan refleksi diri terhadap pelaksanaan pembelajaran.',
        'Guru menganalisis hasil asesmen untuk mengidentifikasi kebutuhan belajar peserta didik.',
        'Guru merencanakan program remedial bagi peserta didik yang belum mencapai tujuan pembelajaran.',
        'Guru merencanakan program pengayaan bagi peserta didik yang telah mencapai tujuan pembelajaran.',
        'Guru menindaklanjuti hasil supervisi sebelumnya untuk perbaikan pembelajaran.',
      ],
    },
  ]),
]

export const SEMUA_INDIKATOR: Indikator[] = ASPEK.flatMap((a) => a.indikator)
export const SKOR_MAKS_TOTAL = ASPEK.reduce((s, a) => s + a.skorMaks, 0)
