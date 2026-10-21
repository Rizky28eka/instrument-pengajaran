# Instrumen Supervisi Akademik Guru

Aplikasi web digital untuk supervisi akademik guru **SMP · Kurikulum Merdeka**, dipakai kepala sekolah / supervisor akademik.

**Stack:** React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · React Router 8 · TanStack Query · React Hook Form + Zod · Firebase (Auth + Firestore)

## Fitur

- Login email/kata sandi atau Google (Firebase Auth)
- Form supervisi bertahap: identitas → 5 aspek (skala 1–4) → catatan & rekomendasi
- Nilai, predikat, dan skor per aspek dihitung otomatis; draf tersimpan otomatis di browser
- Dashboard: rata-rata nilai, capaian per aspek, distribusi predikat, guru yang perlu pendampingan
- Daftar data dengan pencarian & filter, detail, ubah, hapus, **cetak** (A4) dan **ekspor CSV** (siap impor ke Google Sheets)
- Cache offline Firestore untuk koneksi sekolah yang kurang stabil

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi dengan kredensial Web App Firebase
npm run dev
```

Skrip lain: `npm run build` · `npm run typecheck` · `npm run lint` · `npm test`

## Setup Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com), tambahkan **Web app**, salin konfigurasinya ke `.env.local`.
2. **Authentication → Sign-in method:** aktifkan *Email/Password* dan *Google*.
3. **Firestore Database:** buat database, lalu terapkan aturan keamanan:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
   Aturan di [firestore.rules](firestore.rules): semua pengguna login dapat membaca; hanya pembuat dokumen yang dapat mengubah/menghapus.
4. (Opsional) Deploy: `npm run build && npx firebase-tools deploy --only hosting`.

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

> **Perlu dikonfirmasi:** dokumen sumber berhenti pada indikator C3 (aspek Asesmen). Indikator **C4–C6** serta seluruh isi aspek **D (Media & Teknologi)** dan **E (Evaluasi & Tindak Lanjut)** adalah rancangan awal dan harus disesuaikan dengan instrumen resmi. Cukup edit file tersebut.
