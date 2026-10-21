import { bentukAspek, type Instrumen } from './instrumen-types'

/**
 * Instrumen versi 1 — PROVISIONAL.
 *
 * Sumber: dokumen "Database Instrumen Supervisi Akademik Guru Berbasis Digital".
 * Dokumen tersebut berhenti pada indikator C3, sehingga:
 *   - indikator C4–C6, seluruh aspek D dan E adalah rancangan awal;
 *   - ambang predikat (86/71/56) bukan dari dokumen sumber.
 * Jangan menyebut nilai ini "resmi" sebelum pemilik instrumen mengesahkannya.
 * Untuk mengubah isi, buat berkas versi baru (mis. instrumen-v2.ts) dan daftarkan di
 * `instrumen.ts`; versi lama JANGAN diubah agar hasil historis tetap bermakna.
 */

function aspek(
  kode: string,
  judul: string,
  deskripsi: string,
  kelompok: { judul?: string; items: string[] }[],
) {
  let n = 0
  return bentukAspek({
    id: kode,
    kode,
    judul,
    deskripsi,
    kelompok: kelompok.map((k) => ({
      ...(k.judul ? { judul: k.judul } : {}),
      indikator: k.items.map((teks) => ({ id: `${kode}${++n}`, teks })),
    })),
  })
}

export const INSTRUMEN_V1: Instrumen = {
  versi: '1-provisional',
  nama: 'Instrumen Supervisi Akademik SMP (Kurikulum Merdeka)',
  status: 'provisional',
  ambang: [
    { predikat: 'Sangat Baik', min: 86 },
    { predikat: 'Baik', min: 71 },
    { predikat: 'Cukup', min: 56 },
    { predikat: 'Perlu Perbaikan', min: 0 },
  ],
  aspek: [
    aspek('A', 'Perencanaan Pembelajaran', 'Kesesuaian dokumen dan rancangan pembelajaran dengan kurikulum.', [
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
    aspek('B', 'Pelaksanaan Pembelajaran', 'Kegiatan pendahuluan, inti, dan penutup di kelas.', [
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
    aspek('C', 'Asesmen dan Hasil Belajar', 'Teknik asesmen, umpan balik, dan pemanfaatan hasil belajar.', [
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
    aspek('D', 'Pemanfaatan Media dan Teknologi', 'Penggunaan media dan teknologi digital dalam pembelajaran.', [
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
    aspek('E', 'Evaluasi dan Tindak Lanjut', 'Refleksi guru serta program remedial dan pengayaan.', [
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
  ],
}
