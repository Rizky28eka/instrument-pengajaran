# Operasional

Dokumen ini mencatat apa yang **sudah ada di kode** dan apa yang **masih perlu dilakukan pemilik** di konsol /
CLI. Tidak ada perubahan ke project Firebase yang dilakukan otomatis oleh repo ini.

## 1. Urutan deploy (WAJIB diikuti)

Aplikasi versi ini memakai model akses baru. Deploy dengan urutan:

1. `firebase deploy --only firestore:rules,firestore:indexes --project <id>` (indeks butuh beberapa menit)
   - Fitur dokumen: aktifkan Storage dulu (bagian 11), lalu tambahkan `storage` ke daftar `--only`. `firestore.rules` kini
     juga memuat aturan `documents`; men-deploy-nya tanpa Storage aktif aman (koleksi `documents` hanya tidak terpakai).
2. Buat sekolah + admin pertama (bagian 2)
3. `npm run build && firebase deploy --only hosting --project <id>`

Rules baru **menolak** pembacaan data lama (tanpa `schoolId`). Project `instrumen-supervisi-smp` saat ini kosong,
sehingga tidak ada migrasi data yang diperlukan. Jika kelak ada data lama, lihat bagian 8.

## 2. Membuat sekolah dan admin pertama (satu kali, manual)

Klien tidak bisa membuat sekolah atau admin (sengaja). Di Firebase Console → Firestore:
1. Koleksi `schools`, dokumen ID bebas (mis. `smpn-1`): `{ nama: "SMP Negeri 1 …", createdAt: <timestamp> }`
2. Pendaftaran akun admin lewat aplikasi (daftar → verifikasi email). Salin UID-nya dari Authentication.
3. Koleksi `users`, dokumen ID = UID tadi:
   `{ email, nama, schoolId: "smpn-1", role: "admin", status: "active", inviteId: "bootstrap", createdAt: <timestamp> }`
4. Admin masuk dan membuat undangan untuk supervisor lain di menu **Pengguna**.

## 3. Region database — perlu keputusan

Database `(default)` saat ini berada di **`nam5` (AS)**, bukan `asia-southeast2` (Jakarta). Lokasi tidak dapat diubah
setelah dibuat. Karena database masih kosong, opsi termurah adalah membuat ulang:

```bash
# MENGHAPUS database — hanya jika kosong dan sudah disetujui pemilik
firebase firestore:databases:delete '(default)' --project instrumen-supervisi-smp
firebase firestore:databases:create '(default)' --location asia-southeast2 --project instrumen-supervisi-smp
firebase deploy --only firestore --project instrumen-supervisi-smp
```
Keputusan yang dibutuhkan: lokasi data yang disetujui (mis. pertimbangan UU PDP). **Belum dijalankan.**

## 4. Pemulihan data — perlu keputusan

Status saat dicek: Point-in-Time Recovery **nonaktif**, Delete Protection **nonaktif**, retensi versi 1 jam.
- Delete protection: `firebase firestore:databases:update '(default)' --delete-protection ENABLED`
- Backup terjadwal / PITR: kemungkinan memerlukan paket berbayar (Blaze). Verifikasi sebelum mengaktifkan.
- Aplikasi sudah memakai **soft-delete** dan riwayat (`riwayat/{rev}`), sehingga penghapusan tidak disengaja dapat
  dipulihkan admin dari menu "data yang dihapus". Itu bukan pengganti backup.
- Uji restore minimal sekali pada data uji sebelum dipakai nyata.

## 5. Lingkungan (dev / staging / produksi)

Saat ini satu project Firebase. Rekomendasi: buat project staging terpisah, lalu
`firebase use --add` (alias `staging`) dan salin `.env.example` → `.env.staging.local`. Tes lokal memakai emulator
(`demo-instrumen`), tidak menyentuh project mana pun. **Belum dibuat** (membuat project = tindakan di akun Anda).

## 6. Header keamanan dan CSP

`firebase.json` menambahkan `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`,
`Permissions-Policy`, dan cache immutable untuk `/assets/**`.

**Content-Security-Policy belum dipasang**: kebijakan yang aman harus diuji terhadap Google sign-in
(`apis.google.com`, iframe `*.firebaseapp.com`), Firestore, dan Identity Toolkit di lingkungan sungguhan; CSP yang
keliru akan merusak login. Saat dipasang, mulai dengan `Content-Security-Policy-Report-Only`.
Tidak dapat diperiksa dari repo: App Check, pembatasan API key (HTTP referrer), anggaran/alert Google Cloud.

## 7. Google Sheets — belum diimplementasikan

Ekspor CSV (siap impor ke Sheets) sudah ada dan disanitasi dari formula injection. Sinkronisasi otomatis
memerlukan Cloud Functions (paket Blaze), OAuth/Service Account, dan API Sheets. Desain yang disarankan:
fungsi terjadwal/terpicu `onWrite supervisi` → tulis satu baris per `supervisi/{id}` ke Sheet dengan kunci
idempoten = `id` dokumen (upsert, bukan append), retry dengan backoff, tanpa mencatat kredensial. Menunggu keputusan
pemilik soal biaya dan kepemilikan Sheet.

## 8. Migrasi data lama

Dokumen versi lama (tanpa `schoolId`, `guruId`, `rev`, `deletedAt`, snapshot instrumen) tidak dapat dibaca klien.
Aplikasi membaca dokumen tanpa snapshot memakai instrumen "legacy" (= v1). Bila ada data lama yang harus dipertahankan,
perlu skrip Admin SDK **dengan dry-run** yang: menetapkan `schoolId`, membuat `guru` dari nama (dedup butuh tinjauan
manusia), mengisi `guruId`, `rev=1`, `deletedAt=null`, snapshot instrumen, dan entri `riwayat/1`. **Skrip belum ditulis**
karena tidak ada data untuk dimigrasikan dan pemetaan sekolah/guru membutuhkan keputusan pemilik.

## 9. Dependensi

`npm audit --omit=dev` melaporkan 4 temuan "high" yang seluruhnya bersumber dari `@grpc/grpc-js`
(GHSA-m9gg-hp2v-232j, sisi **server**). Bundle produksi tidak memuat `grpc-js` (diperiksa: 0 referensi), sehingga
tidak dapat dieksploitasi di browser. Saran `npm audit fix --force` (menurunkan Firebase ke 9.14.0) **jangan diikuti**.
Tinjau ulang saat Firebase SDK merilis versi yang memperbarui dependensinya.

## 10. Jejak audit — batasan

`riwayat/{rev}` bersifat append-only dan wajib menyertai setiap perubahan (ditegakkan Rules); pelaku dan waktu
tidak dapat dipalsukan oleh klien. Namun isi ringkasan pada entri dikirim klien, dan siapa pun dengan akses
konsol/Admin SDK dapat mengubahnya. Ini bukan bukti tak-dapat-dimanipulasi sekelas log server.

## 11. Dokumen dan Firebase Storage — belum aktif

Fitur unggah dokumen (menu **Dokumen** dan panel di detail supervisi) sudah ada di kode dan teruji di emulator, tetapi
**Firebase Storage belum aktif** di project ini (bucket menjawab 404). Mengaktifkannya kemungkinan membutuhkan paket
Blaze (keputusan Anda), deploy `storage.rules` dengan persetujuan IAM lintas-layanan, dan CORS bucket
(`storage.cors.json`). Langkah lengkap, model data, batas ukuran/tipe, kebijakan retensi, dan batasannya:
[docs/DOKUMEN.md](DOKUMEN.md). Kategori *pengajuan guru* mati secara bawaan; diaktifkan per sekolah dengan menulis
`fitur: { pengirimanDokumenGuru: true }` pada dokumen `schools/{id}` di konsol (klien tidak bisa menulis dokumen sekolah).
Tidak ada yang di-deploy atau diubah di project oleh perubahan ini.

## 12. Login tidak berhasil — urutan pemeriksaan

Aplikasi **belum di-deploy ke Hosting** (`instrumen-supervisi-smp.web.app` menjawab 404 "Site Not Found"); jalankan lokal
dengan `npm run dev` dan buka **`http://localhost:5173`** (bukan `127.0.0.1` atau alamat IP jaringan — login Google hanya
diizinkan untuk `localhost` dan domain `*.firebaseapp.com` / `*.web.app`, daftar di Authentication → Settings → Authorized domains).

Pada saat ini Authentication sudah benar: Email/Password dan Google aktif, kunci API valid. Jadi bila login gagal, lihat gejalanya:

| Gejala | Penyebab yang paling mungkin |
|---|---|
| Toast "Email atau kata sandi salah." | Akun belum ada di project ini. Daftar dulu, atau buat admin pertama (bagian 2). |
| Toast soal popup / alamat belum diizinkan | Popup diblokir browser, atau aplikasi dibuka dari alamat yang bukan `localhost`. |
| Setelah masuk, layar **"Akun tidak dapat dimuat"** (konsol: `Gagal membaca profil pengguna permission-denied`) | Aturan Firestore di project belum di-deploy atau bukan versi repo ini. Lihat bagian 1 (butuh persetujuan pemilik untuk deploy). |
| Setelah masuk, diarahkan ke **/verifikasi-email** | Email belum diverifikasi. Klik tautan di email, lalu muat ulang. |
| Setelah masuk, diarahkan ke **/aktivasi** | Akun belum punya profil. Butuh kode undangan dari admin sekolah — dan sekolah + admin pertama harus dibuat manual dulu (bagian 2). |

Sebelumnya, kasus "Akun tidak dapat dimuat" tidak tampil di halaman login (formulir yang sama muncul lagi tanpa pesan, sehingga
tampak seperti login yang rusak). Sekarang selalu tampil, lengkap dengan tombol **Keluar**.
