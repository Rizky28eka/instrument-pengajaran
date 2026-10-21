# Dokumen, Bukti, dan Firebase Storage

Dokumen (PDF, DOC/DOCX, XLS/XLSX, CSV, JPG/PNG) disimpan di **Firebase Storage**; **metadata, relasi, versi, dan
riwayat review** disimpan di Firestore (`documents/{docId}`). Isi berkas tidak pernah masuk Firestore.

> **Status integrasi nyata:** Firebase Storage **belum aktif** pada project `instrumen-supervisi-smp` (bucket
> menjawab HTTP 404 untuk `.firebasestorage.app` maupun `.appspot.com`). Seluruh alur di bawah teruji di
> **Firebase Emulator** (Rules, layanan, dan UI), **bukan** di project nyata. Lihat
> [Mengaktifkan Storage](#mengaktifkan-storage). Tidak ada yang di-deploy.

## Prinsip

1. **Firestore dan Storage bukan satu transaksi.** Urutan operasi dirancang agar setiap kegagalan meninggalkan keadaan
   yang *terlihat* dan *dapat dipulihkan*, bukan berkas yatim yang tak terlacak.
2. **Metadata dulu, berkas kemudian, finalisasi terakhir.** Storage Rules hanya menerima berkas pada path yang sudah
   dicadangkan metadata.
3. **Tidak ada URL publik permanen.** Unduhan lewat SDK terautentikasi dan lolos Storage Rules; isi diverifikasi
   dengan SHA-256 terhadap catatan.
4. **Berkas tidak pernah dieksekusi atau di-render sebagai HTML.** Hanya PDF dan PNG/JPEG yang dipratinjau; Office/CSV
   hanya diunduh.

## Akses (mengikuti model `main`)

Pengguna aktif = email terverifikasi + profil `status:'active'` (lihat `firestore.rules`). Setiap dokumen milik satu
sekolah; pengguna hanya mengakses dokumen `schoolId`-nya.

| Aksi | Siapa |
|---|---|
| Membaca metadata, mengunduh, pratinjau, unggah dokumen baru, review | pengguna aktif sekolah itu |
| Mengganti versi, memfinalisasi/membatalkan unggahan | **pengunggah/pembuat** saja |
| Ubah judul, hapus-lunak, pulihkan, hapus permanen | pembuat **atau admin sekolah** |
| Apa pun terhadap dokumen sekolah lain | tidak ada (termasuk admin sekolah lain) |

Hapus permanen hanya setelah hapus-lunak; unggahan pertama yang gagal dibersihkan oleh pengunggahnya. Tidak ada
penghapusan otomatis (butuh Cloud Functions/Blaze); UI menandai dokumen yang melewati masa simpan 30 hari.

## Model data `documents/{docId}`

| Field | Isi |
|---|---|
| `schoolId`, `kategori`, `supervisiId?`, `guruId?`, `tindakId?` | relasi ber-ID stabil sesuai kategori (tabel di bawah) |
| `judul` | teks tampilan (≤120) |
| `status` | `mengunggah` · `tersedia` · `dihapus` |
| `currentVersion`, `versions[]` | riwayat versi append-only: `{n, storagePath, fileName, mimeType, size, sha256, uploadedBy, uploadedAt}` |
| `pending` | unggahan berjalan/tertunda (`null` bila tidak ada) |
| `reviewStatus`, `reviewRiwayat[]` | hanya kategori *pengajuan guru*: `diajukan → disetujui | ditolak | perlu_revisi` |
| `createdBy`, `createdByName`, `createdAt`, `updatedAt`, `deletedAt`, `deletedBy` | |

| Kategori | Relasi wajib |
|---|---|
| `pendukung-supervisi`, `bukti-pelaksanaan`, `lampiran-rekomendasi` | `supervisiId` (supervisi se-sekolah, belum dihapus) |
| `tindak-lanjut` | `tindakId` (tindak lanjut se-sekolah) |
| `pengajuan-guru` | `guruId` (guru aktif se-sekolah) **dan** fitur sekolah aktif |
| `template`, `administratif` | tidak ada |

Path Storage: `sekolah/{schoolId}/dokumen/{docId}/v{n}/{uuid}.{ext}` — nama objek acak; nama asli berkas hanya `fileName`
(disanitasi: tanpa path, karakter kendali, pengubah arah teks). Metadata dokumen **tidak** disalin ke koleksi lain.

## Alur unggah (`features/documents/service.ts`)

```
validasi → metadata (status "mengunggah", rincian di `pending`) → berkas ke Storage → finalisasi
```

| Tahap | Operasi | Idempoten karena |
|---|---|---|
| validasi | ekstensi, ukuran, magic bytes, SHA-256 (`file-check.ts`) | murni |
| metadata | `setDoc documents/{id}` dengan `versions:[]`, `pending:{…}` | cek dokumen sudah ada & `pending.storagePath` sama |
| berkas | `uploadBytesResumable` ke `pending.storagePath` | cek ukuran objek yang sudah ada; lewati bila sama |
| finalisasi | `updateDoc`: tambah **satu** entri `versions`, `pending:null`, `status:'tersedia'` | bila `pending` sudah kosong, tidak melakukan apa pun |

Mesin status + retry (`upload-state.ts`, `upload-task.ts`): yang diulang **hanya tahap yang gagal** (finalisasi yang
gagal tidak mengunggah ulang berkas). Klik ganda memakai satu eksekusi. Pembatalan mengirim `AbortSignal`, lalu
membersihkan sisa (berkas bila ada, kemudian metadata atau `pending`).

## Kegagalan dan hasilnya

| Kejadian | Keadaan akhir | Pemulihan |
|---|---|---|
| Upload berhasil, finalisasi gagal | `pending` terisi, berkas ada | "Selesaikan" — finalisasi tanpa unggah ulang |
| Metadata tersimpan, upload gagal / halaman ditutup | `pending` terisi, **tanpa berkas** | "Pilih berkas yang sama" (SHA-256 harus sama) atau "Buang" |
| Jaringan putus saat unggah | tugas `gagal` (tahap `unggah`) | "Coba lagi" mengulang hanya unggah |
| Akun dinonaktifkan / dipindah sekolah di tengah proses | Storage menolak; **tidak ada berkas yatim** | metadata tertinggal sebagai unggahan tertunda; dibuang oleh pengunggah atau admin sekolah |
| Pengguna menekan "Batal" | metadata/`pending` dan berkas dibersihkan | otomatis |
| Berkas sama diunggah berulang | peringatan duplikat (SHA-256 + relasi sama); unggah hanya bila dikonfirmasi | — |
| Hapus permanen gagal sebagian | metadata (`dihapus`) **tetap ada** selagi masih ada berkas | ulangi — operasi idempoten (objek hilang ≠ galat) |
| Berkas diubah di Storage di luar aplikasi | unduhan ditolak ("SHA-256 berbeda") | selidiki; unggah versi baru |

## Keamanan berlapis

| Lapis | Mekanisme | Batas |
|---|---|---|
| UI | `accept`, validator, tombol sesuai izin | dapat dilewati klien yang dimodifikasi |
| Klien | ekstensi + ukuran + **magic bytes** (PDF/PNG/JPEG/OLE2/ZIP-OOXML/UTF-8); tolak `vbaProject.bin`, zip-slip, EOCD palsu | tidak memindai malware; makro di `.doc/.xls` lama tidak terdeteksi |
| Firestore Rules | relasi se-sekolah, kategori↔relasi, MIME↔ekstensi↔path, ukuran, status/riwayat append-only | tidak membaca isi berkas |
| Storage Rules | pengguna aktif sekolah (via `firestore.get`), path = `pending.storagePath`, ukuran & `contentType` = metadata, ≤10 MB, tanpa overwrite, tanpa list | tidak membaca isi berkas |
| Integritas | SHA-256 diverifikasi saat unduh | — |

**Pemindaian malware tidak diklaim.** Untuk dokumen berisiko tinggi rancang backend tepercaya (Cloud Function
`onFinalize` + antivirus yang menandai status, dan menahan akses baca sampai lolos) — butuh Blaze, di luar cakupan ini.

## Batas dan konfigurasi

Sumber tunggal: `src/features/documents/config.ts`. Nilai yang ditegakkan Rules ditulis ulang di `firestore.rules` dan
`storage.rules`; `tests/rules/dokumen-config.test.ts` memastikan ketiganya tidak berbeda.

| Batas | Nilai | Ditegakkan oleh |
|---|---|---|
| Ukuran berkas | 10 MB | validator, Firestore Rules, Storage Rules |
| Berkas sekali unggah | 5 | UI |
| Dokumen per entitas induk | 30 | UI (Rules tidak dapat menghitung koleksi) |
| Versi per dokumen | 20 | Firestore Rules |
| Tipe | pdf, doc, docx, xls, xlsx, csv, jpg, jpeg, png | validator + Rules |

Mengubah batas = ubah `config.ts` **dan** kedua berkas Rules, jalankan `npm run test:rules`, lalu deploy Rules.

## Fitur "pengajuan guru"

Kategori `pengajuan-guru` (dengan alur review) hanya tersedia bila `schools/{id}.fitur.pengirimanDokumenGuru == true`.
Klien tidak bisa menulis dokumen sekolah, jadi flag ini diatur pemilik lewat konsol/skrip admin (sama seperti pembuatan
sekolah di OPERASIONAL.md). Bawaan: mati. Guru belum memiliki akun; dokumen diunggah pengguna atas nama guru lalu
masuk antrean review. Review dapat dilakukan pengguna aktif mana pun di sekolah itu (tidak disyaratkan berbeda dari
pengunggah) — keputusan ini perlu dikonfirmasi pemilik.

## Mengaktifkan Storage

**Belum dilakukan; butuh keputusan pemilik.**
1. Firebase Console → Storage → *Get started*; pilih lokasi (selaraskan dengan keputusan region di OPERASIONAL.md §3;
   tidak dapat diubah setelah dibuat). Project baru umumnya mensyaratkan paket **Blaze** untuk bucket default —
   aktivasi billing adalah keputusan pemilik; tetapkan anggaran dan peringatan biaya lebih dulu.
2. `firebase deploy --only storage --project <id>`. Karena aturan membaca Firestore, CLI meminta peran IAM lintas-layanan
   ("Firebase Rules Firestore Service Agent") — setujui hanya bila Anda memahaminya.
3. CORS untuk unduhan lewat SDK: ganti origin di `storage.cors.json`, lalu
   `gcloud storage buckets update gs://<bucket> --cors-file=storage.cors.json`.
4. Uji end-to-end di project **staging** dahulu; baru setelah itu fitur ini boleh dinyatakan berfungsi di project nyata.
5. Urutan deploy penuh: lihat OPERASIONAL.md §1 (rules Firestore + Storage sebelum hosting).

Biaya (kasar; periksa tarif terbaru): penyimpanan GB-bulan + operasi + egress; setiap pembacaan berkas memicu
pembacaan Firestore tambahan oleh Storage Rules.

## Batasan yang diakui

1. Rules memeriksa data kiriman klien; tidak membaca isi berkas atau memindai malware.
2. Entri riwayat dalam array memakai jam klien (array tidak boleh memuat `serverTimestamp`); Rules membatasi selisih
   ≤10 menit. Waktu otoritatif = `updatedAt`.
3. `get` pada dokumen yang **belum ada** mengembalikan "tidak ada" bagi pengguna aktif (dibutuhkan agar unggahan
   idempoten); pengguna aktif dapat membedakan ID yang ada dari yang tidak (ID acak; isi tetap tertutup).
4. Batas jumlah dokumen per entitas dan laju unggahan tidak dapat dihitung di Rules; pembatasan laju butuh backend.
5. Tidak ada jejak audit terpisah untuk dokumen (berbeda dengan `riwayat/{rev}` pada supervisi): jejaknya adalah
   riwayat versi, `reviewRiwayat`, dan `deletedAt/By` di dalam dokumen.
6. **Belum ada** impor/ekstraksi data dari CSV/Excel, OCR, atau pengiriman dokumen ke layanan eksternal/AI. Bila kelak
   dibutuhkan: pratinjau dan pemetaan kolom sebelum impor, validasi per baris, deteksi duplikat, impor batch idempoten
   dengan ringkasan, persetujuan pengguna, dan tanpa mengeksekusi makro/rumus.

## Pengujian

```bash
npm run test:rules   # Firestore + Storage Emulator: Rules, layanan unggah/unduh/hapus, kegagalan, review, admin sekolah
npm test             # unit: validasi berkas, mesin unggah, orkestrator, pemeta, izin, penanda instrumen
npm run test:e2e     # Playwright di atas emulator (termasuk alur dokumen di UI)
```

Kasus yang diuji di `tests/rules/` (diizinkan **dan** ditolak): anonim, email belum terverifikasi, akun nonaktif/tanpa
profil, pengguna sekolah A vs B, admin sekolah sendiri vs lain, manipulasi `schoolId/guruId/createdBy/path/MIME/ukuran/
riwayat`, transisi review (tabel-driven dari kode aplikasi), unggah/unduh/hapus lintas sekolah, jaringan putus, izin
dicabut di tengah proses, rekonsiliasi unggahan tertunda, pembatalan, hapus sebagian, integritas SHA-256. Rules juga
diuji dengan *mutation testing*: aturan kunci dirusak satu per satu dan tes harus gagal.
