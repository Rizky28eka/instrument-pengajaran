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

Project sudah dibuat: **`instrumen-supervisi-smp`** ([console](https://console.firebase.google.com/project/instrumen-supervisi-smp/overview)), terhubung lewat [.firebaserc](.firebaserc). Firestore (`asia-southeast2`) aktif dan aturannya sudah ter-deploy.

Di mesin baru:

```bash
npm install
firebase apps:sdkconfig WEB 1:599822176340:web:87b1b9bffb646e918bddc1 --project instrumen-supervisi-smp
# salin nilainya ke .env.local mengikuti format .env.example
npm run dev
```

**Wajib dilakukan manual sekali** — [Authentication → Sign-in method](https://console.firebase.google.com/project/instrumen-supervisi-smp/authentication/providers): klik *Get started*, lalu aktifkan *Email/Password* dan *Google* (pilih email dukungan project). Tanpa ini halaman login akan menampilkan galat.

Untuk domain produksi, tambahkan domain tersebut di *Authentication → Settings → Authorized domains*.

Aturan keamanan di [firestore.rules](firestore.rules): semua pengguna login dapat membaca; hanya pembuat dokumen yang dapat mengubah/menghapus. Deploy ulang setelah mengubahnya:

```bash
firebase deploy --only firestore:rules
```

Hosting (opsional): `npm run build && firebase deploy --only hosting`.

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
