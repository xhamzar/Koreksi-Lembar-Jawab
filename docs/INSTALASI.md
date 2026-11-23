# Panduan Instalasi & Deployment — Koreksi Lembar Jawab

Dokumen ini menjelaskan secara lengkap cara memasang, menjalankan secara lokal, men-deploy ke layanan hosting HTTPS gratis (**Vercel** & **Netlify**), serta menginstal aplikasi sebagai **PWA** di HP Android maupun iOS.

---

## Daftar Isi

1. [Prasyarat Sistem](#1-prasyarat-sistem)
2. [Instalasi Lokal (Pengembangan)](#2-instalasi-lokal-pengembangan)
3. [Build & Menjalankan Mode Produksi Lokal](#3-build--menjalankan-mode-produksi-lokal)
4. [Menguji Kamera HP dari Komputer Lokal](#4-menguji-kamera-hp-dari-komputer-lokal)
5. [Deploy ke Vercel (Direkomendasikan — Gratis HTTPS)](#5-deploy-ke-vercel-direkomendasikan--gratis-https)
6. [Deploy ke Netlify (Gratis HTTPS)](#6-deploy-ke-netlify-gratis-https)
7. [Instalasi Sebagai Aplikasi (PWA) di HP](#7-instalasi-sebagai-aplikasi-pwa-di-hp)
8. [Pemecahan Masalah (Troubleshooting)](#8-pemecahan-masalah-troubleshooting)

---

## 1. Prasyarat Sistem

Pastikan perangkat pengembangan Anda telah terpasang perangkat lunak berikut:

- **Node.js**: versi **18.18.0** atau lebih baru (sangat disarankan **Node.js 20 LTS** atau **22 LTS**).  
  Cek versi: `node -v`
- **Package Manager**: `npm` (bawaan Node.js), `pnpm`, atau `bun`.  
  Cek versi: `npm -v`
- **Git**: untuk klon repositori dan sinkronisasi GitHub.  
  Cek versi: `git --version`
- **Peramban Modern**: Google Chrome, Microsoft Edge, Firefox, atau Safari versi terbaru (mendukung Web Workers, IndexedDB, dan MediaDevices API).

---

## 2. Instalasi Lokal (Pengembangan)

### Langkah 1: Klon Repositori

```bash
git clone https://github.com/USERNAME_ANDA/koreksi-lembar-jawab.git
cd koreksi-lembar-jawab
```

### Langkah 2: Pasang Dependensi

```bash
npm install
```

> [!TIP]
> Jika Anda menggunakan **Bun**, Anda juga dapat menjalankan `bun install` untuk pemasangan yang lebih cepat.

### Langkah 3: Konfigurasi Lingkungan (Opsional)

Aplikasi berjalan **100% di sisi klien** dan tidak membutuhkan API key apa pun untuk fitur pemindaian OMR, IndexedDB, ekspor Excel/PDF, maupun PWA. Berkas `.env.example` hanya disediakan sebagai referensi standar bila Anda hendak menambahkan integrasi server di masa depan.

### Langkah 4: Jalankan Server Pengembangan

```bash
npm run dev
```

Setelah server aktif, buka **`http://localhost:3000`** di peramban Anda.

---

## 3. Build & Menjalankan Mode Produksi Lokal

Untuk menguji performa sesungguhnya (termasuk verifikasi build TypeScript dan Service Worker produksi):

```bash
# 1. Periksa linting
npm run lint

# 2. Bangun bundel produksi
npm run build

# 3. Jalankan server produksi
npm run start
```

Aplikasi produksi lokal akan berjalan di **`http://localhost:3000`**.

---

## 4. Menguji Kamera HP dari Komputer Lokal

> [!IMPORTANT]
> Peramban HP (Chrome Android & Safari iOS) **mewajibkan koneksi HTTPS** untuk mengizinkan akses kamera (`getUserMedia`) dan instalasi PWA. Mengakses IP lokal biasa seperti `http://192.168.1.10:3000` akan memblokir kamera secara otomatis oleh keamanan peramban.

Ada dua cara mudah untuk menguji kamera langsung di HP:

1. **Cara Tercepat (HTTPS Tunnel Sementara)**:  
   Jalankan `npm run dev`, lalu buka tunnel HTTPS menggunakan salah satu alat berikut di terminal terpisah:
   ```bash
   # Menggunakan Cloudflare Tunnel (tanpa akun)
   npx cloudflared tunnel --url http://localhost:3000
   ```
   Buka URL `https://*.trycloudflare.com` yang muncul langsung dari HP Anda.
2. **Cara Permanen (Deploy ke Vercel / Netlify)**:  
   Layanan hosting seperti Vercel dan Netlify menyediakan sertifikat **HTTPS otomatis gratis** sehingga kamera dan instalasi PWA langsung berfungsi penuh di semua HP.

---

## 5. Deploy ke Vercel (Direkomendasikan — Gratis HTTPS)

Vercel adalah platform paling optimal untuk Next.js App Router karena mendukung manifest, aset statis, dan HTTPS otomatis tanpa konfigurasi rumit.

### Opsi A: Melalui Dashboard GitHub (Paling Mudah)

1. Unggah (*push*) repositori proyek ini ke akun GitHub Anda:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Koreksi Lembar Jawab SEKOLAHKITA KLJ"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/koreksi-lembar-jawab.git
   git push -u origin main
   ```
2. Masuk ke [vercel.com](https://vercel.com/) menggunakan akun GitHub Anda.
3. Klik **Add New → Project**, lalu pilih repositori **`koreksi-lembar-jawab`**.
4. Pastikan pengaturan build terdeteksi otomatis sebagai berikut:
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run build`
   - **Output Directory**: *(biarkan default `.next`)*
5. Tidak ada Environment Variable wajib yang perlu diisi. Langsung klik **Deploy**.
6. Setelah selesai (~1–2 menit), Anda akan mendapatkan URL `https://nama-proyek.vercel.app` yang langsung siap dipakai dan diinstal sebagai PWA di Android/iOS.

### Opsi B: Melalui Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 6. Deploy ke Netlify (Gratis HTTPS)

1. Pastikan proyek sudah di-*push* ke GitHub.
2. Masuk ke [app.netlify.com](https://app.netlify.com/) lalu pilih **Add new site → Import an existing project**.
3. Hubungkan akun GitHub dan pilih repositori **`koreksi-lembar-jawab`**.
4. Isi konfigurasi build:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - *(Netlify secara otomatis mengaktifkan `@netlify/plugin-nextjs` untuk Next.js 15).*
5. Klik **Deploy site**. Setelah aktif, situs otomatis mendapatkan HTTPS (`https://*.netlify.app`) dan siap digunakan dengan kamera HP serta PWA.

---

## 7. Instalasi Sebagai Aplikasi (PWA) di HP

Setelah aplikasi dibuka melalui URL **HTTPS** (misalnya dari Vercel atau Netlify):

### Android (Google Chrome / Edge / Brave)

1. Buka alamat aplikasi di **Google Chrome**.
2. Ketuk tombol **`Instal Aplikasi (PWA)`** yang muncul di halaman depan atau menu **Pengaturan**.  
   *(Alternatif: ketuk ikon menu titik tiga **⋮** di kanan atas Chrome → pilih **Tambahkan ke layar utama / Instal aplikasi**).*
3. Ketuk **Instal**. Ikon **Koreksi LJK** akan muncul di layar utama dan berjalan layar penuh (*standalone*) seperti aplikasi Android asli — termasuk saat offline.

### iPhone / iPad (iOS Safari)

1. Buka alamat aplikasi menggunakan **Safari** (bukan peramban dalam aplikasi seperti WhatsApp/Instagram).
2. Ketuk ikon **Bagikan (Share)** di bilah bawah Safari.
3. Gulir ke bawah dan pilih **Tambahkan ke Layar Utama (Add to Home Screen)**.
4. Ketuk **Tambah**. Aplikasi kini tersedia langsung dari layar utama iPhone/iPad.

---

## 8. Pemecahan Masalah (*Troubleshooting*)

| Masalah | Penyebab Umum | Solusi |
| :--- | :--- | :--- |
| **Kamera tidak dapat dibuka di HP** | Situs diakses lewat `http://` (bukan `https://`) atau izin kamera ditolak. | Gunakan URL `https://` (Vercel/Netlify/Tunnel), lalu buka pengaturan situs di peramban dan aktifkan izin **Kamera**. Anda tetap bisa memakai tombol **Unggah Foto** sebagai alternatif. |
| **Tampilan tidak berubah setelah update kode** | Cache Service Worker lama masih aktif di peramban. | Muat ulang halaman (*refresh*) 1–2 kali agar Service Worker baru mengambil alih. Jika masih tertahan, buka *DevTools → Application → Service Workers → Unregister* lalu *Hard Reload*. |
| **Tombol Instal PWA tidak muncul** | Aplikasi sudah terinstal, dibuka di mode Incognito, atau belum memakai HTTPS. | Pastikan diakses di mode normal melalui **HTTPS** menggunakan Chrome (Android) atau Safari (iOS). |
| **Pemindaian terasa lambat di HP RAM kecil** | Foto resolusi sangat tinggi atau banyak tab terbuka. | Aplikasi sudah otomatis mengecilkan gambar ke sisi maks. `1600px` di Web Worker. Tutup tab peramban lain agar memori lega. |
| **Data hilang saat ganti HP / hapus cache browser** | IndexedDB bersifat lokal per perangkat & peramban. | Lakukan **Backup Database (JSON)** secara rutin dari menu **Riwayat**, lalu gunakan **Restore Database** di perangkat baru. |
