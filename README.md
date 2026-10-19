# UMKM Insight — Analisis Data Penjualan UMKM

Proyek studi kasus untuk menganalisis perubahan pendapatan dan keuntungan menggunakan dashboard **HTML, CSS, JavaScript** serta analisis lanjutan dengan **Python**.

> **Penting:** `data/penjualan_umkm.csv` adalah dataset simulasi yang dibuat untuk kebutuhan pembelajaran. Angka, pola penurunan keuntungan, dan rekomendasi yang muncul bukan laporan atau kesimpulan tentang UMKM nyata.

## Fitur

- Dashboard bertema biru navy dan biru pastel.
- Kartu metrik: pendapatan, keuntungan, unit terjual, dan tingkat diskon.
- Grafik tren pendapatan dan keuntungan bulanan.
- Grafik kontribusi keuntungan berdasarkan kategori.
- Peringkat produk berdasarkan keuntungan.
- Filter tahun, kategori, dan saluran penjualan.
- Temuan awal yang dihitung dari data terfilter.
- Analisis Python menghasilkan ringkasan JSON dan grafik PNG.
- Prediksi eksploratif dengan regresi tren linear sederhana.

## Struktur repository

```text
analisis-penjualan-umkm/
├── index.html
├── style.css
├── script.js
├── analysis.py
├── requirements.txt
├── README.md
├── data/
│   └── penjualan_umkm.csv
└── output/
    └── (hasil analisis dibuat saat analysis.py dijalankan)
```

## 1. Menjalankan dashboard

Karena browser biasanya membatasi `fetch()` ketika HTML dibuka langsung sebagai `file://`, jalankan website menggunakan server lokal.

### Opsi A — Python

Buka terminal pada folder proyek, lalu jalankan:

```bash
python -m http.server 8000
```

Buka `http://localhost:8000` pada browser.

### Opsi B — Visual Studio Code

Pasang ekstensi **Live Server**, klik kanan `index.html`, lalu pilih **Open with Live Server**.

Dashboard menggunakan Chart.js dan PapaParse dari CDN, sehingga koneksi internet diperlukan saat halaman pertama kali dimuat.

## 2. Menjalankan analisis Python

Gunakan Python 3.10 atau lebih baru. Buat virtual environment jika diperlukan, lalu instal dependensi:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Instal dan jalankan:

```bash
pip install -r requirements.txt
python analysis.py
```

Skrip akan membuat:

- `output/analysis_summary.json` — ringkasan metrik, perubahan bulanan, kategori, produk, dugaan penyebab, prediksi, rekomendasi, dan batasan.
- `output/tren_pendapatan_keuntungan.png` — grafik tren bulanan.
- `output/keuntungan_per_kategori.png` — grafik keuntungan per kategori.

## 3. Skema dataset

| Kolom | Keterangan |
|---|---|
| `tanggal` | Tanggal transaksi |
| `produk` | Nama produk |
| `kategori` | Kelompok produk |
| `jumlah` | Unit terjual pada transaksi |
| `harga_satuan` | Harga per unit sebelum diskon |
| `modal_satuan` | Estimasi modal per unit |
| `diskon` | Nilai potongan harga untuk transaksi |
| `biaya_operasional` | Biaya operasional yang dialokasikan ke transaksi |
| `pendapatan` | Pendapatan setelah diskon |
| `keuntungan` | Pendapatan dikurangi estimasi modal barang dan biaya operasional |
| `channel` | Saluran penjualan |
| `wilayah` | Kelompok wilayah simulasi |

## 4. Metode dan interpretasi

1. **Deskriptif:** menjumlahkan pendapatan, keuntungan, unit, diskon, dan biaya.
2. **Perbandingan:** membandingkan bulan pertama dan terakhir serta mengurutkan produk/kategori berdasarkan keuntungan.
3. **Prediksi eksploratif:** menggunakan regresi linear pada agregat bulanan untuk memproyeksikan tiga titik bulan berikutnya.
4. **Rekomendasi:** menyusun tindakan awal yang perlu divalidasi oleh pemilik usaha melalui data nyata.

Prediksi linear adalah baseline sederhana, bukan jaminan hasil masa depan. Dataset simulasi sengaja memuat variasi transaksi dan tekanan margin yang berubah sepanjang waktu, sehingga temuan dashboard hanya menunjukkan cara kerja analisis.

## 5. Batasan

- Data sintetis, bukan data lapangan atau data keuangan UMKM nyata.
- Pola yang muncul tidak cukup untuk menyimpulkan hubungan sebab-akibat.
- Prediksi tidak memperhitungkan musim, inflasi aktual, perubahan pemasok, kompetitor, atau kejadian eksternal.
- Biaya operasional pada dataset dialokasikan per transaksi untuk menyederhanakan studi kasus.
- Untuk analisis bisnis nyata, validasi data, definisi laba, pajak, retur, biaya tetap, dan periode pembukuan harus ditetapkan terlebih dahulu.

## Pengembangan berikutnya

- Unggah CSV dari UMKM dengan validasi skema dan rentang tanggal.
- Tambahkan perbandingan periode, margin per produk, dan analisis kanal.
- Gunakan model prediksi yang divalidasi dengan data historis yang memadai.
- Tambahkan ekspor laporan PDF dan dokumentasikan asumsi bisnis.
