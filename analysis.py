"""
Analisis data penjualan UMKM (dataset simulasi).
Menjalankan skrip akan menghasilkan ringkasan JSON dan grafik PNG di folder output/.
"""
from pathlib import Path
import json
import warnings

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "penjualan_umkm.csv"
OUTPUT_DIR = ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["tanggal"])
    required = {
        "tanggal", "produk", "kategori", "jumlah", "harga_satuan",
        "modal_satuan", "diskon", "biaya_operasional", "pendapatan",
        "keuntungan", "channel", "wilayah"
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Kolom wajib tidak ditemukan: {', '.join(sorted(missing))}")
    numeric = required - {"tanggal", "produk", "kategori", "channel", "wilayah"}
    for col in numeric:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["tanggal", "pendapatan", "keuntungan"])
    if df.empty:
        raise ValueError("Dataset tidak memiliki baris valid.")
    return df


def safe_pct(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / abs(previous) * 100, 2)


def analyze(df: pd.DataFrame) -> dict:
    data = df.copy()
    data["bulan"] = data["tanggal"].dt.to_period("M").astype(str)
    monthly = data.groupby("bulan", as_index=False).agg(
        pendapatan=("pendapatan", "sum"),
        keuntungan=("keuntungan", "sum"),
        unit_terjual=("jumlah", "sum"),
        diskon=("diskon", "sum"),
        biaya_operasional=("biaya_operasional", "sum"),
    )
    product = data.groupby(["produk", "kategori"], as_index=False).agg(
        pendapatan=("pendapatan", "sum"),
        keuntungan=("keuntungan", "sum"),
        unit_terjual=("jumlah", "sum"),
        total_diskon=("diskon", "sum"),
    ).sort_values("keuntungan", ascending=False)
    category = data.groupby("kategori", as_index=False).agg(
        pendapatan=("pendapatan", "sum"),
        keuntungan=("keuntungan", "sum"),
        unit_terjual=("jumlah", "sum"),
    ).sort_values("keuntungan", ascending=False)

    total_revenue = float(data["pendapatan"].sum())
    total_profit = float(data["keuntungan"].sum())
    gross_sales = float((data["jumlah"] * data["harga_satuan"]).sum())
    discount_total = float(data["diskon"].sum())
    margin = total_profit / total_revenue * 100 if total_revenue else 0
    first, last = monthly.iloc[0], monthly.iloc[-1]
    revenue_change = safe_pct(float(last["pendapatan"]), float(first["pendapatan"]))
    profit_change = safe_pct(float(last["keuntungan"]), float(first["keuntungan"]))
    discount_rate = discount_total / gross_sales * 100 if gross_sales else 0

    # Linear trend is an exploratory baseline, not a reliable forecasting model.
    x = np.arange(len(monthly), dtype=float)
    prediction = {}
    if len(monthly) >= 3:
        next_x = np.array([len(monthly), len(monthly) + 1, len(monthly) + 2], dtype=float)
        for column in ("pendapatan", "keuntungan"):
            coeff = np.polyfit(x, monthly[column].to_numpy(dtype=float), 1)
            values = np.polyval(coeff, next_x)
            prediction[column] = [round(float(v), 2) for v in values]
    else:
        prediction = {"pendapatan": [], "keuntungan": []}

    if discount_rate >= 10:
        cause = "Diskon relatif tinggi terhadap omzet kotor; evaluasi efektivitas promo per produk."
    elif profit_change is not None and profit_change < 0:
        cause = "Keuntungan pada bulan terakhir lebih rendah daripada bulan pertama; periksa volume, harga, diskon, dan biaya."
    else:
        cause = "Belum ada satu penyebab yang dapat dipastikan; analisis margin dan biaya per produk diperlukan."

    recommendations = [
        "Hitung margin kontribusi setiap produk setelah diskon dan biaya variabel.",
        "Uji promo dengan periode dan kelompok produk pembanding; ukur keuntungan, bukan omzet saja.",
        "Bandingkan harga pemasok dan pantau biaya operasional per transaksi.",
        "Prioritaskan produk yang memiliki kombinasi permintaan dan margin sehat.",
    ]
    return {
        "metadata": {
            "jenis_data": "simulasi",
            "rentang_tanggal": [data["tanggal"].min().strftime("%Y-%m-%d"), data["tanggal"].max().strftime("%Y-%m-%d")],
            "jumlah_baris": int(len(data)),
            "catatan": "Hasil deskriptif dari data simulasi, bukan bukti kondisi UMKM nyata. Prediksi menggunakan tren linear sederhana."
        },
        "ringkasan": {
            "total_pendapatan": round(total_revenue, 2),
            "total_keuntungan": round(total_profit, 2),
            "total_unit_terjual": int(data["jumlah"].sum()),
            "margin_keuntungan_persen": round(margin, 2),
            "tingkat_diskon_persen": round(discount_rate, 2),
            "perubahan_pendapatan_bulan_awal_ke_akhir_persen": revenue_change,
            "perubahan_keuntungan_bulan_awal_ke_akhir_persen": profit_change,
        },
        "dugaan_penyebab": cause,
        "prediksi_tiga_bulan_berikutnya": prediction,
        "produk_berdasarkan_keuntungan": product.head(10).to_dict(orient="records"),
        "kategori": category.to_dict(orient="records"),
        "data_bulanan": monthly.to_dict(orient="records"),
        "rekomendasi": recommendations,
        "batasan": [
            "Dataset dibuat secara sintetis untuk demonstrasi, bukan dikumpulkan dari UMKM nyata.",
            "Hubungan yang terlihat tidak membuktikan sebab-akibat.",
            "Prediksi tren linear tidak memperhitungkan musim, perubahan pasar, atau kejadian eksternal.",
            "Biaya operasional dialokasikan per transaksi dalam simulasi; praktik akuntansi nyata dapat berbeda.",
        ],
    }


def make_charts(result: dict) -> None:
    monthly = pd.DataFrame(result["data_bulanan"])
    if monthly.empty:
        return
    plt.figure(figsize=(10, 5))
    plt.plot(monthly["bulan"], monthly["pendapatan"], marker="o", label="Pendapatan")
    plt.plot(monthly["bulan"], monthly["keuntungan"], marker="o", label="Keuntungan")
    plt.title("Tren Pendapatan dan Keuntungan (Simulasi)")
    plt.xlabel("Bulan")
    plt.ylabel("Rupiah")
    plt.xticks(rotation=45, ha="right")
    plt.grid(alpha=0.25)
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "tren_pendapatan_keuntungan.png", dpi=160)
    plt.close()

    cats = pd.DataFrame(result["kategori"]).sort_values("keuntungan", ascending=False)
    plt.figure(figsize=(8, 5))
    plt.bar(cats["kategori"], cats["keuntungan"])
    plt.title("Keuntungan per Kategori (Simulasi)")
    plt.xlabel("Kategori")
    plt.ylabel("Rupiah")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "keuntungan_per_kategori.png", dpi=160)
    plt.close()


def main() -> None:
    df = load_data(DATA_PATH)
    result = analyze(df)
    out = OUTPUT_DIR / "analysis_summary.json"
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    make_charts(result)
    print(f"Analisis selesai. Ringkasan: {out}")
    print(f"Jumlah baris: {result['metadata']['jumlah_baris']}")
    print(f"Pendapatan: Rp{result['ringkasan']['total_pendapatan']:,.0f}")
    print(f"Keuntungan: Rp{result['ringkasan']['total_keuntungan']:,.0f}")
    print(f"Dugaan awal: {result['dugaan_penyebab']}")


if __name__ == "__main__":
    main()
