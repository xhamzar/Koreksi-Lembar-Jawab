# Koreksi Lembar Jawab — SEKOLAHKITA KLJ

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-1273AA)](./docs/INSTALASI.md#instalasi-sebagai-aplikasi-pwa-di-hp)
[![License: MIT](https://img.shields.io/badge/Lisensi-MIT-16A34A.svg)](./LICENSE)

**Koreksi Lembar Jawab** adalah aplikasi Progressive Web App (PWA) berbasis *Optical Mark Recognition* (OMR) untuk memindai, membaca arsiran bulatan, dan mengoreksi Lembar Jawaban Komputer (LJK) pilihan ganda secara otomatis langsung dari kamera HP atau galeri foto.

Dirancang khusus untuk kebutuhan guru dan sekolah dengan prinsip **100% pemrosesan lokal di perangkat** — tanpa akun, tanpa login, tanpa backend, dan tetap bekerja secara offline di ruang kelas.

---

## Fitur Utama

- **Pemindaian Multi-LJK (1–3 Lembar Sekaligus)** — Deteksi independen hingga 3 lembar jawaban dalam satu kali jepret foto atau unggah gambar (`JPG`, `JPEG`, `PNG`), tanpa mengharuskan posisi kertas selalu sama.
- **Mesin OMR Lokal di Web Worker** — Konversi grayscale, Gaussian blur, *adaptive thresholding* tahan pencahayaan tidak merata, deteksi 4 penanda sudut hitam, koreksi perspektif homografi (dukungan OpenCV.js + mesin piksel native), dan analisis rasio isian bulatan yang tidak membuat UI HP lag.
- **Kalibrasi Manual & Pra-Pemrosesan** — Mendukung rotasi gambar (`±90°`), potong tepi (*crop*), serta kalibrasi 4 sudut manual yang dapat digeser langsung untuk LJK dari sekolah lain atau kondisi foto ekstrem.
- **Indikator Visual & Koreksi Manual** — Menandai status tiap soal langsung di atas gambar LJK yang sudah diluruskan (**Hijau** terdeteksi yakin, **Merah** jawaban ganda, **Kuning** perlu cek ulang, **Abu-abu** kosong) dengan koreksi manual sekali ketuk.
- **40 & 50 Soal (Pilihan A–D / A–E)** — Pengaturan ujian lengkap dengan penyimpanan otomatis (*autosave*), grid kunci jawaban interaktif, dan metode penilaian standar `(Benar / Total Soal) × 100` maupun bobot kustom.
- **Template LJK 2 Kolom Siap Cetak** — Pratinjau langsung template LJK berpenanda sudut hitam lengkap dengan ekspor **PDF A4**, **PNG**, dan **Cetak Langsung**.
- **Hasil, Peringkat & Analisis Butir Soal** — Kartu ringkasan statistik (*Siswa*, *Rata-rata*, *Tertinggi*, *Terendah*), daftar peringkat dengan cincin nilai melingkar, distribusi opsi A–E, deteksi otomatis 5 soal tersulit, serta halaman **Detail Siswa**.
- **Ekspor & Manajemen Data Lokal (IndexedDB)** — Ekspor hasil ke **Excel (`.xlsx`)** 3 sheet dan **Laporan PDF**, impor daftar siswa dari **Excel/CSV**, serta **Backup & Restore database (`.json`)**.
- **PWA Offline-First & Mode Terang/Gelap** — Dapat diinstal langsung ke layar utama Android dan iOS dengan tampilan responsif untuk HP, tablet, dan desktop.

---

## Teknologi yang Digunakan

| Lapisan | Teknologi | Peran |
| :--- | :--- | :--- |
| **Framework & UI** | Next.js 15 (App Router), React 19, TypeScript | Aplikasi web modern, PWA manifest native, arsitektur modular |
| **Styling & Animasi** | Tailwind CSS v4, Motion (`motion/react`), Lucide React | Tampilan bersih terang/gelap, animasi ringan, ikon seragam |
| **Pemrosesan Citra (OMR)** | Web Worker, OpenCV.js (WASM) + Mesin Piksel Native | Deteksi lembar, koreksi perspektif, analisis rasio piksel arsiran |
| **Penyimpanan Lokal** | IndexedDB (Native Wrapper) | Penyimpanan persisten ujian, kunci, siswa, hasil, & riwayat |
| **Ekspor / Impor** | SheetJS (`xlsx`), jsPDF, `jspdf-autotable` | Ekspor Excel 3 sheet, Laporan PDF, Cetak LJK A4, Impor CSV/Excel |
| **PWA & Offline** | Web App Manifest + Custom Service Worker | Instalasi layar utama Android/iOS & cache offline aset aplikasi |

---

## Mulai Cepat (*Quick Start*)

Pastikan **Node.js v18.18+** (disarankan **Node.js 20 LTS**) dan **Git** sudah terpasang di komputer Anda.

```bash
# 1. Klon repositori dari GitHub
git clone https://github.com/USERNAME_ANDA/koreksi-lembar-jawab.git
cd koreksi-lembar-jawab

# 2. Pasang seluruh dependensi
npm install

# 3. Jalankan server pengembangan lokal
npm run dev
```

Buka peramban dan akses **`http://localhost:3000`**.

> [!NOTE]
> Aplikasi ini tidak memerlukan konfigurasi database eksternal, server backend, maupun API key apa pun agar seluruh fitur utamanya berjalan.

---

## Perintah NPM yang Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan lokal di `http://localhost:3000` |
| `npm run build` | Membangun bundel produksi yang teroptimasi |
| `npm run start` | Menjalankan server produksi setelah proses `npm run build` |
| `npm run lint` | Memeriksa kualitas kode TypeScript & React dengan ESLint |
| `npm run clean` | Membersihkan direktori hasil build sementara (`.next`) |

---

## Struktur Direktori Ringkas

```text
koreksi-lembar-jawab/
├── app/                     # Next.js App Router (layout, halaman utama, manifest PWA, CSS)
├── components/              # Komponen antarmuka modular
│   ├── landing/             # Halaman depan sederhana (SEKOLAHKITA KLJ)
│   ├── navigation/          # Navigasi mobile bottom bar & sidebar desktop
│   ├── providers/           # State global tersinkronisasi dengan IndexedDB
│   ├── settings/            # Pengaturan ujian, kunci jawaban, & template LJK
│   ├── scanner/             # Kamera, unggah foto, kalibrasi sudut, & koreksi manual
│   ├── results/             # Peringkat, analisis soal, & detail siswa
│   ├── history/             # Riwayat sesi, pencarian, backup/restore JSON
│   └── ui/                  # Toast, modal konfirmasi, cincin nilai, tombol instal PWA
├── hooks/                   # Hook instalasi PWA & status koneksi offline
├── lib/                     # Logika inti klien
│   ├── storage/             # Wrapper IndexedDB CRUD & migrasi default
│   ├── omr/                 # Spesifikasi koordinat LJK, klien Web Worker, renderer LJK
│   ├── grading/             # Mesin perhitungan nilai, peringkat, & analisis butir soal
│   └── export/              # Ekspor Excel/PDF & impor daftar siswa CSV/Excel
├── public/                  # Aset statis, ikon PWA, Service Worker, & OMR Web Worker
│   ├── sw.js                # Service Worker offline-first
│   └── workers/omr-worker.js# Pipeline pemrosesan citra OMR off-main-thread
├── docs/                    # Dokumentasi lengkap proyek
└── LICENSE                  # Lisensi MIT
```

---

## Dokumentasi Lengkap

Silakan baca panduan terperinci berikut sesuai kebutuhan Anda:

1. **[Panduan Instalasi & Deployment Lengkap (`docs/INSTALASI.md`)](./docs/INSTALASI.md)**  
   Instalasi lokal Node.js, pengujian kamera HP, deployment HTTPS gratis ke **Vercel** & **Netlify**, cara instalasi **PWA di Android/iOS**, serta *troubleshooting*.
2. **[Panduan Penggunaan untuk Guru (`docs/PANDUAN_PENGGUNA.md`)](./docs/PANDUAN_PENGGUNA.md)**  
   Alur kerja lengkap dari membuat ujian, mencetak LJK, memotret 1–3 lembar sekaligus, format berkas impor siswa Excel/CSV, hingga ekspor laporan dan backup data.
3. **[Arsitektur Teknis & Algoritma OMR (`docs/ARSITEKTUR_OMR.md`)](./docs/ARSITEKTUR_OMR.md)**  
   Penjelasan mendalam pipeline Web Worker + OpenCV.js, geometri 4 penanda sudut, algoritma rasio arsiran bulatan, skema IndexedDB, dan strategi cache Service Worker.

---

## Privasi & Keamanan Data

- Seluruh foto lembar jawaban diproses sepenuhnya di memori peramban perangkat Anda dan **tidak pernah diunggah ke server mana pun**.
- Seluruh data ujian, kunci jawaban, daftar siswa, dan nilai disimpan secara lokal di **IndexedDB** perangkat.
- Disarankan melakukan **Backup Database (JSON)** secara berkala dari menu **Riwayat** untuk menjaga cadangan data apabila berganti perangkat atau membersihkan data peramban.

---

## Lisensi

Proyek ini didistribusikan di bawah **[Lisensi MIT](./LICENSE)**. Anda bebas menggunakan, memodifikasi, dan menyebarluaskan aplikasi ini untuk kebutuhan pendidikan dan sekolah dengan tetap menyertakan pemberitahuan lisensi.
