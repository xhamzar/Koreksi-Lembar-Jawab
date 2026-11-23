# Panduan Penggunaan untuk Guru — Koreksi Lembar Jawab

Panduan praktis langkah demi langkah untuk mengoperasikan aplikasi **Koreksi Lembar Jawab (SEKOLAHKITA KLJ)** mulai dari menyiapkan ujian, mencetak LJK, memindai hingga 3 lembar sekaligus, sampai mengekspor laporan nilai Excel dan PDF.

---

## Alur Kerja Ringkas (5 Langkah)

1. **Siapkan Ujian & Kunci Jawaban** di menu **Pengaturan**.
2. **Cetak Template LJK 2 Kolom** (PDF/A4) agar akurasi pemindaian otomatis maksimal.
3. **Pindai 1–3 Lembar Sekaligus** di menu **Pindai** menggunakan kamera HP atau foto galeri.
4. **Periksa & Konfirmasi** hasil deteksi (koreksi manual jika ada tanda kuning/merah) lalu pilih nama siswa.
5. **Lihat Peringkat, Analisis Soal & Ekspor** laporan Excel/PDF dari menu **Hasil**.

---

## 1. Mengenal Halaman Depan & Navigasi

- **Halaman Depan (Beranda)**:
  - Ketuk tombol biru **`Mulai Mengoreksi`** untuk langsung membuka halaman **Pindai**.
  - Ketuk ikon gerigi (**⚙**) di pojok kanan atas untuk membuka **Pengaturan Ujian**.
- **Navigasi Utama**:
  - Di **HP**: bilah navigasi bawah berisi 4 menu (*Pengaturan*, *Pindai*, *Hasil*, *Riwayat*) yang dirancang nyaman untuk satu tangan.
  - Di **Tablet / Desktop**: bilah samping kiri menampilkan navigasi lengkap, ringkasan ujian aktif, serta tombol mode **Terang / Gelap**.

---

## 2. Pengaturan Ujian, Kunci Jawaban & Template LJK

### A. Mengelola Ujian & Identitas Sekolah (Tab *Jenis Ujian*)

1. Pilih ujian aktif pada dropdown **Ujian aktif**, atau ketuk tombol **`+`** untuk menambah ujian baru.
2. Lengkapi informasi: **Jenis Ujian** (*Sumatif Ganjil/Genap, PTS, PAS, Try Out, Ulangan Harian*), **Mata Pelajaran**, **Kelas**, **Semester**, dan **Tahun Ajaran**.
3. Atur **Metode Penilaian**:
   - **Standar (0–100)**: menggunakan rumus `Nilai = (Jumlah Benar ÷ Total Soal) × 100`.
   - **Bobot Kustom**: tentukan poin tersendiri untuk jawaban Benar, Salah, dan Kosong.
4. Pada panel **Identitas Sekolah & Pembuat**, Anda dapat mengganti nama sekolah (default **`SEKOLAHKITA KLJ`**), alamat kop LJK, nama guru/pembuat (default **`Tim Pengajar SekolahKita`**), serta mengunggah logo sekolah sendiri.
5. Semua perubahan tersimpan otomatis (*autosave*) ke penyimpanan lokal perangkat.

> [!NOTE]
> Saat pertama kali dibuka, aplikasi menyertakan 1 ujian contoh (*Sumatif Ganjil · Kimia · Kelas X* dengan 3 hasil siswa contoh) agar Anda bisa langsung mencoba fitur hasil dan analisis. Anda dapat menghapusnya kapan saja dengan tombol ikon tempat sampah.

### B. Mengisi Kunci Jawaban (Tab *Kunci Jawaban*)

1. Pilih jumlah soal (**40 Soal** atau **50 Soal**).
2. Ketuk bulatan huruf (**A–D** atau **A–E**) pada setiap nomor soal hingga bilah progres mencapai 100%.
3. Jika kunci jawaban diubah setelah ada lembar siswa yang dipindai, **seluruh nilai, peringkat, dan analisis soal akan otomatis dihitung ulang**.

### C. Mencetak Template LJK & Mengelola Daftar Siswa (Tab *Lembar Jawab*)

1. Tentukan jumlah soal (`40` / `50`), jumlah opsi (`A–D` / `A–E`), judul kop LJK, dan kolom identitas siswa yang ingin ditampilkan.
2. Pratinjau LJK menampilkan desain 2 kolom dengan **4 kotak hitam penanda sudut** (*fiducial markers*).
3. Pilih **`Unduh PDF`** (disarankan untuk cetak A4), **`Unduh PNG`**, atau **`Cetak A4`** langsung.
4. Di bagian **Daftar Siswa**, tambahkan siswa satu per satu atau impor massal dari berkas **Excel (`.xlsx`) / CSV**.

#### Format Kolom Impor Siswa (Excel / CSV)

Aplikasi mengenali judul kolom berikut secara otomatis (tidak peka huruf besar/kecil):

| Nama Siswa | Nomor Peserta | Kelas |
| :--- | :--- | :--- |
| Budi Santoso | 2026-001 | Kelas X |
| Siti Rahmawati | 2026-002 | Kelas X |
| Ahmad Fauzi | 2026-003 | Kelas X |

*Alias kolom yang juga dikenali: `Nama`, `Nama Lengkap`, `No Peserta`, `No. Peserta`, `NIS`, `NISN`, `Rombel`.*

---

## 3. Memindai 1–3 Lembar Jawaban (Menu *Pindai*)

### Tips Pemotretan Agar Akurasi Maksimal

- Letakkan **1 hingga 3 lembar LJK** secara datar di atas meja dengan latar warna agak kontras (misalnya meja kayu/gelap lebih baik daripada meja putih polos).
- Pastikan pencahayaan merata dan tidak tertutup bayangan tangan atau badan.
- Pastikan **keempat kotak hitam sudut** pada setiap lembar terlihat utuh di dalam foto.
- Anjurkan siswa menghitamkan bulatan secara penuh menggunakan pensil 2B atau pulpen hitam/gelap.

### Langkah Pemindaian

1. Pilih **`Buka Kamera`** untuk memotret langsung, atau **`Unggah Foto`** (`JPG`, `JPEG`, `PNG`) dari galeri.
2. Pada tahap **Kalibrasi**:
   - Gunakan **Putar Kiri / Kanan** atau **Potong Tepi** jika orientasi foto terbalik/terlalu lebar.
   - Sistem otomatis mendeteksi posisi **1 hingga 3 lembar** secara independen.
   - Jika ingin menambah lembar secara manual atau memperbaiki posisi sudut (misalnya untuk LJK non-template), klik **`Tambah Lembar`** lalu geser ke-4 titik sudut tepat ke pusat 4 kotak sudut kertas.
3. Tekan **`Pindai & Baca Lembar`**. Web Worker akan meluruskan perspektif dan membaca rasio arsiran piksel setiap bulatan.

### Membaca Indikator Warna & Koreksi Manual

| Warna | Status | Arti |
| :--- | :--- | :--- |
| **Hijau** | Yakin / Manual | Satu bulatan terarsir jelas dan terbaca otomatis (atau sudah dikoreksi manual). |
| **Merah** | Ganda | Terdeteksi lebih dari satu bulatan terarsir pada nomor yang sama. |
| **Kuning** | Cek Ulang | Arsiran tipis/tidak penuh atau ada noda; nomor soal juga muncul pada banner `Cek: ...` di bagian atas. |
| **Abu-abu** | Kosong | Tidak ada bulatan yang diarsir di atas ambang deteksi. |

- Ketuk langsung bulatan pada gambar LJK atau pada daftar nomor di sampingnya untuk mengubah jawaban secara manual.
- Jika memindai 2 atau 3 lembar sekaligus, berpindahlah antar tab **`Lembar 1`**, **`Lembar 2`**, **`Lembar 3`**.
- Pilih nama siswa dari dropdown daftar kelas atau ketik cepat nama & nomor peserta, lalu tekan **`Simpan Semua Hasil`**.

---

## 4. Melihat Hasil, Analisis Soal & Ekspor (Menu *Hasil*)

- **4 Kartu Statistik**: menampilkan jumlah *siswa*, nilai *rata-rata*, *tertinggi*, dan *terendah*.
- **Tab Peringkat**: urutan nilai siswa tertinggi ke terendah dengan cincin nilai melingkar (hijau ≥ 75, kuning 55–74, merah < 55). Ketuk nama siswa mana pun untuk membuka halaman **Detail Siswa** dan mengoreksi jawaban per nomor jika diperlukan.
- **Tab Analisis Soal**: menampilkan sorotan **5 Soal Paling Sulit** serta grafik distribusi pilihan A–E dan kategori kesukaran (*Mudah / Sedang / Sulit*) untuk setiap nomor.
- **Ekspor Laporan**:
  - Tombol **`Excel`**: menghasilkan berkas `.xlsx` berisi 3 lembar (*Peringkat Siswa*, *Analisis Soal*, dan *Matriks Jawaban*).
  - Tombol **`PDF`**: menghasilkan laporan siap cetak dengan kop sekolah, tabel statistik, tabel peringkat, dan daftar soal tersulit.

---

## 5. Riwayat, Pencarian & Backup Data (Menu *Riwayat*)

- Gunakan kolom pencarian serta filter **Ujian** dan **Kelas** untuk menemukan riwayat sesi pemindaian atau hasil siswa lintas kelas.
- Klik **`Backup Database (JSON)`** untuk menyimpan seluruh data aplikasi ke satu berkas cadangan di HP/komputer Anda.
- Klik **`Restore Database`** untuk memulihkan cadangan JSON kapan saja (misalnya saat berpindah HP).
