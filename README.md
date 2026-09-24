# Info Lomba

Website katalog dan arsip kompetisi mahasiswa, dengan desain terinspirasi portofolio Radian: warna gelap, aksen merah dan emas, Plus Jakarta Sans, serta Playfair Display. Tersedia mode terang dan gelap, responsif di HP.

## Jalankan

Memerlukan **Node.js 24 atau lebih baru**. Tidak memerlukan instalasi paket npm.

```powershell
cd C:\Users\Adrian\.gemini\antigravity\scratch\info-lomba
npm start
```

Buka http://localhost:3000. Dashboard di http://localhost:3000/#admin.

### Akun admin

Untuk membuat akun atau mereset password:

```powershell
npm run admin -- admin
```

Perintah menghasilkan password acak dan menampilkannya di terminal. Simpan password tersebut. Semua sesi lama untuk username itu akan keluar saat password direset. Akun awal yang disiapkan saat pembuatan proyek dicatat di `ADMIN-ACCESS.txt`; file ini diabaikan Git. Setelah login dan menyimpan kredensial dengan aman, file tersebut bisa dihapus.

Untuk menggunakan password sendiri (minimal 12 karakter), isi environment variable `ADMIN_PASSWORD` sebelum menjalankan perintah admin. Jangan commit password ke repositori.

## Fitur

- Katalog publik tanpa login, cari judul, filter kategori / biaya / status, dan pengurutan.
- Detail lomba, poster yang bisa diperbesar, link pendaftaran, panduan, dan salin tautan detail.
- Pendaftaran dianggap buka sampai pukul 23.59 WIB pada tanggal akhir. Status dan arsip dihitung dari tanggal, bukan dijadwalkan secara manual.
- Login admin menggunakan password hash scrypt dan cookie sesi HttpOnly, SameSite=Strict, berlaku 8 jam.
- Admin: tambah, edit, hapus dengan konfirmasi, simpan draft, publikasi.
- Upload JPG / PNG / WebP sampai 5 MB, pemeriksaan signature file dan preview gambar.
- Empat kategori awal serta kategori tambahan. Kategori yang digunakan tidak dapat dihapus.
- Validasi tanggal, URL http/https, biaya nonnegatif dalam rupiah, dan field wajib di server.
- Biaya 0 tampil sebagai Gratis. Biaya early bird / per tim bisa dijelaskan pada catatan biaya.
- Data persisten dengan SQLite dan file poster di server. Bukan penyimpanan localStorage; localStorage hanya digunakan untuk preferensi tema.

## Data contoh

Pada inisialisasi pertama tersedia enam lomba fiktif untuk pratinjau desain. Seluruhnya diberi label **Contoh**, dan link pendaftarannya dinonaktifkan. Tanggal contoh dihitung sekali saat database pertama dibuat, lalu tersimpan. Label contoh tetap ada bila data contoh diedit. Gunakan **Tambah Lomba** untuk data sebenarnya, kemudian hapus data contoh melalui dashboard.

Untuk database baru tanpa data contoh, set `SEED_DEMO=false` **sebelum** menjalankan server atau perintah admin pertama kali. Mengubahnya setelah inisialisasi tidak menghapus data yang telah tersimpan.

## Konfigurasi

Environment variables dibaca dari proses (tidak otomatis membaca file `.env`):

| Variabel | Default | Fungsi |
|---|---|---|
| PORT | 3000 | Port HTTP |
| HOST | 127.0.0.1 | Alamat bind; 0.0.0.0 bila dibutuhkan pada hosting |
| DATA_DIR | folder data di proyek | Lokasi database dan uploads |
| SEED_DEMO | true | Isi contoh ketika database baru dibuat |
| NODE_ENV | development | Set production pada hosting HTTPS agar cookie Secure |
| ADMIN_PASSWORD | password acak | Password saat menjalankan script admin |

## Pengujian

```powershell
npm test
```

Tes memakai database sementara terpisah, mencakup autentikasi, proteksi mutasi, draft/publikasi, validasi data, upload, kategori, tanggal WIB, dan persistensi setelah server dimulai ulang.

## Penyimpanan dan deployment

- `data/info-lomba.sqlite` menyimpan lomba, kategori, akun, dan sesi; `data/uploads/` menyimpan poster upload.
- Backup folder `data/` saat server berhenti agar salinan SQLite konsisten, termasuk file WAL bila ada.
- Versi ini sudah dapat digunakan lokal. Belum dihosting ke internet.
- Gunakan hosting Node yang berjalan terus dengan disk persisten dan reverse proxy HTTPS. Hosting statis saja tidak menjalankan backend ini. Atur `NODE_ENV=production`, `HOST=0.0.0.0`, dan `DATA_DIR` ke volume persisten.
- Google Fonts opsional dan memerlukan internet; tersedia font fallback tanpa internet.
- Upload yang batal atau poster yang diganti tetap disimpan. Pembersihan file yang tidak lagi dipakai belum diotomatisasi.
- Arsitektur ditujukan untuk pengelolaan skala awal pada satu server. Email, reset password via email, pengingat deadline, dan favorit akun belum termasuk.

## Struktur

```text
public/         Frontend, CSS, JavaScript, dan poster contoh SVG
lib/            Database, password hashing, validasi dan status tanggal
scripts/        Pengelolaan akun admin lokal
tests/          Tes domain dan API
server.mjs      Server HTTP dan API
data/           Data lokal (diabaikan Git)
```
