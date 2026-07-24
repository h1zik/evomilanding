# Broadcast WhatsApp via Fonnte

Admin bisa mengirim satu pesan ke semua nomor pendaftar waitlist dari menu
**Broadcast WA** di `/admin/panel`.

## 1. Setup Fonnte

1. Daftar di [fonnte.com](https://fonnte.com) lalu beli/aktifkan paket.
2. Buka dashboard → **Device** → sambungkan nomor WhatsApp (scan QR).
3. Buka detail device → salin **Token Device** (bukan token akun).

## 2. Environment variable

Tambahkan di `.env` (lokal) atau Variables service di Railway:

```
FONNTE_TOKEN=xxxxxxxxxxxxxxxx
ADMIN_PASSWORD=evomi2026          # samakan dengan VITE_ADMIN_PASSWORD
```

Restart server setelah mengubah env (`npm run dev` / redeploy Railway).

Kalau `FONNTE_TOKEN` kosong, panel tetap terbuka tapi tombol kirim dimatikan dan
statusnya "Fonnte belum dikonfigurasi".

## 3. Cara pakai

- **Isi pesan** — mendukung format WhatsApp (`*tebal*`, `_miring_`, `~coret~`).
- **`{nama}`** — diganti otomatis dengan nama pendaftar. `{name}` juga bisa.
- **URL gambar** — opsional, harus URL publik (Fonnte yang mengunduh gambarnya,
  jadi `http://localhost:...` tidak akan jalan; pakai domain produksi).
- **Jeda antar pesan** — format `2-10` (detik, acak). Jangan terlalu cepat supaya
  nomor tidak kena blokir WhatsApp.
- **Penerima** — "Semua pendaftar" atau "Pilih manual" (centang satu per satu).
- **Kirim tes** — kirim ke satu nomor dulu untuk mengecek tampilan pesan.
  Tidak masuk riwayat.

Nomor disimpan tanpa prefix (`81234...`) dan dinormalisasi otomatis ke format
`6281234...`. Nomor yang tidak valid dilewati dan ditampilkan sebagai peringatan.

## 4. API

Semua endpoint butuh header `x-admin-password`.

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/broadcast/status` | Status token + device (kuota, nomor tersambung) |
| GET | `/api/broadcast/recipients` | Jumlah nomor valid / invalid |
| POST | `/api/broadcast` | Kirim broadcast (atau `testNumber` untuk tes) |
| GET | `/api/broadcast/history?limit=20` | Riwayat campaign |

Body `POST /api/broadcast`:

```json
{
  "message": "Halo {nama}!",
  "imageUrl": "https://evomi.id/uploads/promo.jpg",
  "delay": "2-10",
  "recipientIds": null,
  "testNumber": ""
}
```

`recipientIds: null` = kirim ke semua pendaftar. Isi array id kalau memilih manual.

## 5. Riwayat

Setiap broadcast dicatat di tabel `broadcast_campaigns` (pesan, jumlah target,
sukses, gagal, dan daftar nomor gagal). Tabel dibuat otomatis saat server start.

## Catatan penting

- Fonnte mengembalikan status "masuk antrian" — pengiriman sebenarnya berjalan di
  belakang layar, jadi angka "terkirim" = jumlah nomor yang diterima Fonnte.
- Broadcast memakai kuota Fonnte sebanyak jumlah penerima dan **tidak bisa
  dibatalkan** setelah dikirim.
- Pesan dikirim per batch 50 nomor. Batch yang gagal tidak menghentikan sisanya.
