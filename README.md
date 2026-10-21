# Instrumen Supervisi Akademik Guru

Aplikasi web digital untuk supervisi akademik guru **SMP · Kurikulum Merdeka**, dipakai kepala sekolah / supervisor akademik.

**Stack:** React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · React Router 8 · TanStack Query · React Hook Form + Zod · Firebase (Auth + Firestore + Storage)

## Fitur

- Akses per sekolah: akun baru **tidak punya akses** sampai menebus kode undangan dari admin sekolah; email wajib terverifikasi
- Form supervisi bertahap (identitas → 5 aspek skala 1–4 → catatan), nilai/predikat otomatis, draf aman di perangkat
- Instrumen **berversi**: tiap dokumen menyimpan snapshot instrumennya; status `provisional` ditandai jelas di UI
- Master data guru (nonaktifkan, tidak dihapus), riwayat dan tren per guru
- Tindak lanjut terstruktur (status, penanggung jawab, tenggat, catatan, riwayat) + ringkasan dashboard
- Soft-delete + pemulihan oleh admin, riwayat perubahan, perlindungan terhadap penimpaan (lost update)
- Ekspor CSV (aman dari formula injection) dan cetak A4
- **Dokumen & bukti** (PDF, Word, Excel, CSV, JPG/PNG): unggah dengan progres, batal, coba lagi, dan deteksi duplikat;
  versi; pratinjau PDF/gambar; unduh terotorisasi (tanpa URL publik); hapus-lunak/pulihkan; antrean review untuk pengajuan guru.
  Lihat [docs/DOKUMEN.md](docs/DOKUMEN.md) — **Firebase Storage belum aktif di project**, fitur ini baru teruji di emulator
- Indikator instrumen yang **belum terkonfirmasi** dengan dokumen sumber (13 dari 42) ditandai di UI

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi dari Firebase Console (lihat docs/OPERASIONAL.md untuk bootstrap sekolah + admin)
npm run dev
```

Pengujian: `npm run check` (cepat) · `npm run test:rules` (emulator; butuh Java + `firebase-tools`) · `npm run test:e2e` (Playwright, Chrome terpasang).

> **Penting sebelum dipakai nyata:** baca [docs/OPERASIONAL.md](docs/OPERASIONAL.md) — urutan deploy rules/indeks,
> pembuatan admin pertama, region database (`nam5`, bukan Jakarta), pemulihan data, dan hal yang belum dikerjakan.

## Struktur data

Koleksi `supervisi`, satu dokumen per kegiatan supervisi:

| Field | Isi |
|---|---|
| `identitas` | sekolah, guru, mapel, kelas, supervisor, tanggal, kurikulum, model pembelajaran |
| `skor` | peta id indikator → 1–4 (mis. `A1`, `B12`) |
| `catatanAspek`, `catatan` | catatan per aspek; kekuatan, perbaikan, rekomendasi |
| `ringkasan` | total, nilai (0–100), predikat, skor per aspek |
| `createdBy`, `createdAt`, `updatedAt` | metadata |

Predikat dari nilai = skor ÷ skor maksimal × 100: **≥86 Sangat Baik · ≥71 Baik · ≥56 Cukup · <56 Perlu Perbaikan** (ubah di [src/lib/scoring.ts](src/lib/scoring.ts)).

## Master instrumen

Seluruh indikator ada di [src/data/instrumen.ts](src/data/instrumen.ts); form, skor, dan ekspor dibangun dari sana.

> **Perlu dikonfirmasi:** dokumen sumber berhenti pada indikator C3 (aspek Asesmen). Indikator **C4–C6** serta seluruh isi aspek **D (Media & Teknologi)** dan **E (Evaluasi & Tindak Lanjut)** adalah rancangan awal dan harus disesuaikan dengan instrumen resmi. Indikator itu ditandai di UI ([src/data/konfirmasi.ts](src/data/konfirmasi.ts), [docs/INSTRUMEN-INVENTARIS.md](docs/INSTRUMEN-INVENTARIS.md)). Untuk melengkapinya buat berkas versi baru; jangan mengedit versi lama.
