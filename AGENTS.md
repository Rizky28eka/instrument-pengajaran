# AGENTS.md — aturan kerja untuk agen/kontributor di repo ini

Aplikasi supervisi akademik guru SMP (React 19 + Vite + TypeScript + Firebase). Data berisi
**penilaian kinerja guru**: perlakukan sebagai data sensitif.

## Perintah
- `npm run check` — typecheck + lint + unit test (cepat, wajib hijau sebelum commit)
- `npm run test:rules` — Firestore + Storage Rules dan integrasi API/layanan dokumen terhadap emulator (butuh Java + firebase-tools)
- `npm run test:e2e` — Playwright (Chrome sistem) di atas emulator
- `npm run build`

## Aturan yang tidak boleh dilanggar
1. **Keamanan ada di `firestore.rules`, bukan di UI.** Guard rute / menyembunyikan tombol hanya mengarahkan.
   Setiap perubahan rules wajib disertai tes di `tests/rules/` dan lolos `npm run test:rules`.
2. **Isolasi per sekolah** (`schoolId`): semua query dibatasi `where('schoolId', '==', …)`; query kunci cache memuat schoolId.
3. **Instrumen versi lama tidak boleh diubah.** Perubahan isi = berkas versi baru di `src/data/` + daftarkan di
   `instrumen.ts`. Dokumen menyimpan snapshot instrumennya sendiri. Jangan menyebut instrumen/ambang "resmi" sebelum
   pemiliknya mengesahkan (status `provisional`).
4. **Tulis data lewat batch + riwayat**: perubahan `supervisi`/`tindakLanjut` menaikkan `rev` 1 dan menulis
   `riwayat/{rev}` pada batch yang sama (rules menolak jika tidak).
5. **Tidak ada hard-delete** dari klien (soft-delete / nonaktifkan).
6. Jangan menampilkan pesan galat Firebase mentah ke pengguna (`pesanError` / `PesanGalat`).
7. Jangan commit `.env*.local`, kredensial, atau data guru nyata. `.env.e2e` hanya berisi nilai dummy emulator.
8. **Jangan deploy**, menjalankan migrasi, atau mengubah konfigurasi project Firebase tanpa persetujuan pemilik.
9. **Dokumen/berkas**: akses berkas dikunci di `storage.rules` (membaca metadata di `documents/{id}`); tidak ada URL publik/`getDownloadURL`.
   Urutan unggah *metadata → berkas → finalisasi* dan tahap idempotennya jangan diubah tanpa tes di `tests/rules/`. Batas ukuran/tipe/versi
   ditulis di `config.ts` **dan** kedua berkas rules (tes konsistensi menjaga). Jangan klaim upload berfungsi di project nyata sebelum
   Storage diaktifkan dan diuji di staging (lihat `docs/DOKUMEN.md`).

## Konvensi
- UI berbahasa Indonesia, kalimat biasa; komentar menjelaskan *mengapa*.
- Logika murni dipisah dari Firebase agar dapat diuji (`mapper.ts`, `logic.ts`, `sesi.ts`, `akses.ts`).
- Tes mengikuti perilaku, bukan implementasi; jangan mengubah tes agar lolos.
