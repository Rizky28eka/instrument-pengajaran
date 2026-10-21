# Inventaris Instrumen Supervisi

Sumber kode: [src/data/instrumen-v1.ts](../src/data/instrumen-v1.ts) (versi `1-provisional`, status `provisional`).
Dokumen sumber ("Database Instrumen Supervisi Akademik Guru Berbasis Digital") **tidak berada di repositori**; menurut
catatan di kode, dokumen itu berhenti pada indikator C3. Tidak ada indikator yang ditambahkan, dan **berkas v1 tidak
diubah** (aturan AGENTS.md).

## Status konfirmasi per indikator

| Aspek | Indikator | Jumlah | Status |
|---|---|---|---|
| A. Perencanaan Pembelajaran | A1–A6 | 6 | bersumber dari dokumen |
| B. Pelaksanaan Pembelajaran | B1–B20 (pendahuluan 4, inti 11, penutup 5) | 20 | bersumber dari dokumen |
| C. Asesmen dan Hasil Belajar | C1–C3 | 3 | bersumber dari dokumen |
| C. Asesmen dan Hasil Belajar | **C4–C6** | 3 | **rancangan awal — belum terkonfirmasi** |
| D. Pemanfaatan Media dan Teknologi | **D1–D5** | 5 | **rancangan awal — belum terkonfirmasi** |
| E. Evaluasi dan Tindak Lanjut | **E1–E5** | 5 | **rancangan awal — belum terkonfirmasi** |
| **Total** | | **42** | **29 bersumber, 13 belum terkonfirmasi** |

Skor maksimal total 168 (42 × 4). Nilai = total ÷ maksimal × 100. Ambang predikat 86 / 71 / 56 **bukan** dari dokumen
sumber; dipertahankan (tidak ditetapkan sebagai standar resmi).

## Bagaimana penandaannya bekerja

- Daftar indikator rancangan disimpan **terpisah** di [src/data/konfirmasi.ts](../src/data/konfirmasi.ts), dicocokkan lewat
  **versi instrumen + ID indikator**. Berkas instrumen dan snapshot yang tersimpan di dokumen supervisi tidak berubah,
  sehingga dokumen lama pun ikut ditandai tanpa migrasi.
- Penanda tidak memengaruhi skor, nilai, maupun predikat.
- UI: lencana "Rancangan awal · belum terkonfirmasi" pada form, halaman Instrumen, dan detail supervisi; pemberitahuan
  instrumen menyebut jumlahnya ("13 dari 42 indikator").
- Tes: `src/data/konfirmasi.test.ts` mengunci daftar 13 indikator, 29 terkonfirmasi, total 42/168, ambang predikat, dan
  bahwa objek indikator v1 tidak membawa penanda.

## Melengkapi instrumen kelak

1. Dapatkan dokumen sumber lengkap dari pemilik instrumen.
2. Buat `src/data/instrumen-v2.ts` (jangan edit v1 — dokumen lama bergantung padanya), daftarkan di `instrumen.ts`, dan ubah
   `INSTRUMEN_AKTIF`. Isi v2 yang sudah terkonfirmasi tidak perlu entri di `konfirmasi.ts`; set `status: 'resmi'` hanya
   setelah disahkan pemiliknya.
3. Supervisi baru memakai v2; supervisi lama tetap dinilai dengan snapshot v1 miliknya.
