# NOVA Control Panel — Local Prototype

## Kebutuhan
- Node.js 20 atau lebih baru
- npm
- Koneksi internet saat `npm install` untuk mengunduh dependensi

## Jalankan di Android (Termux)
1. Pasang Termux dari sumber resminya (F-Droid atau repositori resmi Termux).
2. Buka Termux, lalu jalankan:
   ```sh
   pkg update && pkg upgrade
   pkg install nodejs-lts unzip
   ```
3. Ekstrak ZIP proyek ke folder yang mudah diakses, lalu masuk ke folder `nova-blast`.
   Jika ZIP berada di folder Downloads:
   ```sh
   termux-setup-storage
   cd ~/storage/downloads
   unzip nova-blast-prototype.zip
   cd nova-blast
   ```
   Sesuaikan lokasi jika ZIP disimpan di tempat lain.
4. Pasang dependensi:
   ```sh
   npm install
   ```
5. Salin file contoh environment:
   ```sh
   cp .env.example .env
   ```
   Untuk demo lokal, aplikasi bisa berjalan dengan nilai default. Untuk penggunaan selain lokal, buat `SESSION_SECRET` yang panjang dan acak.
6. Jalankan:
   ```sh
   npm start
   ```
7. Buka browser HP dan kunjungi `http://127.0.0.1:3000`.

## Akun demo
- User: `user_demo` / `DemoUser123!`
- Admin: `admin_demo` / `DemoAdmin123!`
- Bos: `boss_demo` / `DemoBoss123!`

Pilih akun di halaman login untuk mengisi kredensial demo secara otomatis.

## Catatan penting
- `sql.js` memakai SQLite melalui WebAssembly dan menyimpan database ke `data/app.db` saat inisialisasi atau ada perubahan.
- Ini prototype lokal, bukan sistem produksi. `express-session` memakai MemoryStore default, cocok hanya untuk demo lokal.
- Jangan membuka port ke internet atau menggunakan akun/password demo di server publik.
- VPS, CPU/RAM, job, device, referral, dan withdrawal tertentu adalah data simulasi. Tidak ada WhatsApp blast atau transaksi sungguhan.
- Sebelum produksi, perlu hardening keamanan, CSRF protection yang sesuai, rate limiting, session store persisten, secret management, validasi dan audit tambahan, backup/restore yang diuji, serta deployment dan monitoring.
