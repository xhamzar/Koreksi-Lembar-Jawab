# Arsitektur Teknis & Algoritma OMR — Koreksi Lembar Jawab

Dokumen ini menjelaskan arsitektur perangkat lunak, alur pemrosesan citra *Optical Mark Recognition* (OMR) berbasis Web Worker, geometri template LJK, skema penyimpanan IndexedDB, dan strategi offline PWA.

---

## 1. Gambaran Arsitektur Sistem

Aplikasi dibangun di atas **Next.js 15 App Router** sebagai aplikasi *100% client-side offline-first*. Tidak ada komunikasi server untuk penyimpanan data maupun pemrosesan citra.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          UI Layer (React 19)                            │
│   LandingScreen · SettingsView · ScannerView · ResultsView · History    │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌────────────────────────────────────┐  ┌─────────────────────────────────┐
│     IndexedDB Storage Layer        │  │     OMR Web Worker (Off-Thread) │
│     (koreksi_ljk_local_db v1)      │  │     public/workers/omr-worker.js│
│  • settings      • results         │  │  • OpenCV.js WASM (lazy cached) │
│  • exams         • sessions        │  │  • Native Pixel OMR Engine      │
│  • students      • activities      │  │  • Transferable ArrayBuffers    │
└────────────────────────────────────┘  └─────────────────────────────────┘
```

---

## 2. Pipeline Pemrosesan Citra OMR (Web Worker)

Seluruh komputasi berat dijalankan di `public/workers/omr-worker.js` menggunakan *Transferable `ArrayBuffer`* (zero-copy) agar antarmuka utama tetap responsif pada perangkat Android ber-RAM terbatas.

### Tahap 1: Downscaling & Pra-Pemrosesan
- Gambar kamera beresolusi tinggi (mis. 12MP+) diperkecil secara proporsional hingga sisi terpanjang maksimum **`1600px`** sebelum dikirim ke Worker untuk menjaga batas memori rendah.
- Konversi **RGBA → Grayscale** berbasis luminansi `(77R + 150G + 29B) >> 8`.
- **Gaussian Blur 3×3** untuk menekan derau sensor kamera dan tekstur kertas.

### Tahap 2: Adaptive Thresholding (Tahan Pencahayaan Tidak Merata)
- Menggunakan **Integral Image (Summed-Area Table)** untuk menghitung rata-rata intensitas lokal dalam jendela adaptif di sekitar setiap piksel dalam kompleksitas `O(1)` per piksel.
- Piksel diklasifikasikan sebagai gelap bila lebih gelap dari rata-rata lingkungan lokal berdasarkan rasio ambang adaptif, sehingga bayangan gradien atau lampu tidak merata tidak mengacaukan pembacaan.

### Tahap 3: Deteksi Multi-LJK Independen (1–3 Lembar)
1. **Connected Components Analysis** mengekstrak kandidat blok persegi gelap (*fiducial markers*) dengan rasio aspek `0.62–1.62` dan kepadatan isi `≥ 0.58`.
2. **Pengelompokan Kuartet Independen**: mengevaluasi kombinasi 4 penanda sudut yang memiliki konsistensi ukuran area, simetri diagonal, rasio sisi berlawanan (toleransi perspektif), dan rasio aspek potret LJK.
3. Memilih hingga **3 lembar non-overlapping** terbaik lalu mengurutkannya dari kiri ke kanan / atas ke bawah menjadi *Lembar 1*, *Lembar 2*, dan *Lembar 3*.
4. Jika penanda sudut tidak ditemukan (misalnya LJK non-template), sistem otomatis beralih ke **deteksi kontur kertas** (memanfaatkan `cv.findContours` + `cv.approxPolyDP` bila OpenCV.js aktif, atau batas wilayah kertas terang) serta selalu menerima **koordinat 4 sudut kalibrasi manual** dari pengguna.

### Tahap 4: Koreksi Perspektif (Homografi 3×3)
- Setiap lembar yang terdeteksi diluruskan ke ukuran kanonis **`700 × 1000 px`** menggunakan:
  - `cv.getPerspectiveTransform` + `cv.warpPerspective` saat runtime **OpenCV.js WASM** sudah aktif, atau
  - Penyelesai matriks homografi 8×8 (*Gaussian elimination with partial pivoting*) + interpolasi bilinear native ketika berjalan offline sebelum WASM dimuat.

### Tahap 5: Analisis Rasio Piksel & Uniformitas Kuadran Bulatan
- Geometri kisi bulatan 2 kolom didefinisikan secara terpusat di `lib/omr/layout-spec.ts` dan dipakai bersama oleh generator cetak LJK (`lib/omr/template-renderer.ts`) dan Web Worker sehingga posisi cetak dan pemindaian selaras 1:1.
- Untuk setiap bulatan pada tiap soal:
  1. Dilakukan pencarian mikro `±2px` di sekitar pusat koordinat untuk mengompensasi kelengkungan tipis kertas.
  2. Rasio piksel gelap diukur khusus pada **inti dalam bulatan** (`0.66 × radius`) guna mengabaikan garis lingkar cetakan.
  3. **Pemeriksaan Uniformitas 4 Kuadran** memverifikasi distribusi piksel gelap pada 4 kuadran inti untuk meredam noda kecil atau garis coretan tipis.
  4. Pengurangan *baseline* rata-rata opsi kosong pada baris yang sama menghasilkan skor efektif tiap opsi untuk klasifikasi 4 status:
     - **`empty`**: skor efektif tertinggi `< 0.21`.
     - **`double`**: opsi tertinggi kedua `≥ 0.27` dengan selisih margin sempit (`< 0.14`) atau kedua opsi terisi pekat (`≥ 0.36` & `≥ 0.34`).
     - **`uncertain`**: arsiran tipis (`0.21–0.34`), margin sempit (`< 0.12`), atau uniformitas kuadran rendah (`< 0.50`).
     - **`confident`**: satu bulatan terisi kuat (`≥ 0.34`) dengan margin tegas terhadap opsi lainnya.

---

## 3. Mesin Penilaian & Analisis Statistik

Dikelola pada `lib/grading/engine.ts`:

- **Mode Standar**:
  $$\text{Nilai} = \frac{\text{Jumlah Benar}}{\text{Total Soal}} \times 100$$
- **Mode Bobot Kustom**:
  $$\text{Nilai} = \max\left(0,\ \frac{(\text{Benar} \cdot P_b) + (\text{Salah} \cdot P_s) + (\text{Kosong} \cdot P_k)}{\text{Total Soal} \cdot P_b} \times 100\right)$$
- **Analisis Butir Soal**:
  - Menghitung distribusi pilihan `A–E`, jumlah benar/salah/kosong, dan persentase ketepatan per nomor soal.
  - Klasifikasi tingkat kesukaran: **Mudah** (`≥ 70%`), **Sedang** (`40%–69,9%`), **Sulit** (`< 40%`), serta mengekstrak 5 nomor soal dengan persentase benar terendah.

---

## 4. Skema Database Lokal (IndexedDB)

Database lokal bernama **`koreksi_ljk_local_db`** (`v1`) memiliki 6 *object store*:

| Object Store | Key Path | Indeks | Fungsi |
| :--- | :--- | :--- | :--- |
| `settings` | `id` (`'main'`) | — | Identitas sekolah (`SEKOLAHKITA KLJ`), nama guru, logo, tema, ujian aktif |
| `exams` | `id` | — | Metadata ujian, kunci jawaban `Record<number, AnswerLetter>`, aturan nilai, & template LJK |
| `students` | `id` | `className` | Daftar siswa per kelas (input manual & impor Excel/CSV) |
| `results` | `id` | `examId` | Hasil koreksi tiap siswa, rincian jawaban per nomor, nilai akhir, & thumbnail terkompresi |
| `sessions` | `id` | `examId` | Riwayat sesi pemindaian (sumber kamera/galeri, jumlah lembar 1–3, durasi proses) |
| `activities` | `id` | — | Log aktivitas lokal (maks. 150 entri terbaru ditampilkan) |

---

## 5. Strategi PWA & Service Worker (`public/sw.js`)

- **Manifest**: didefinisikan secara native melalui `app/manifest.ts` dengan `display: 'standalone'`, ikon `192×192`, `512×512`, ikon *maskable* `512×512` (safe-zone margin), dan `apple-touch-icon.png` (`180×180`).
- **Strategi Cache (`koreksi-ljk-v2`)**:
  - **Network-First (fallback ke Cache)**: untuk seluruh aset asal yang sama (halaman utama, bundel JS/CSS, Web Worker, ikon) agar setiap pembaruan antarmuka segera tampil saat online namun tetap berjalan lancar saat offline.
  - **Cache-First**: untuk pustaka eksternal besar dan statis (*OpenCV.js CDN* & *Google Fonts*) guna menghemat kuota data dan mempercepat pemuatan ulang di perangkat mobile.
