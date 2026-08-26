# Bagi-bagi Kode Voucher lewat Broadcast

Fitur ini untuk membagikan sekumpulan kode voucher **unik** ke pendaftar
waitlist: satu orang satu kode, dikirim bersamaan dengan pesan broadcast
WhatsApp. Menu ada di `/admin/panel` → **Kode Voucher** dan **Broadcast WA**.

## Alur singkat

1. **Kode Voucher** → buat batch baru, tempel semua kode (satu per baris).
2. **Broadcast WA** → tulis pesan, sisipkan placeholder `{voucher}`.
3. Pilih batch di bagian **Lampirkan kode voucher**.
4. Kirim tes ke nomor sendiri (memakai kode contoh, stok tidak berkurang).
5. Kirim broadcast — tiap penerima menerima kode yang berbeda.

## 1. Membuat batch voucher

Di menu **Kode Voucher**:

- **Nama batch** — misal "Voucher Early Bird 70 orang".
- **Catatan** — opsional, misal masa berlaku.
- **Kode voucher** — tempel dari Excel/Sheets. Pemisah yang dikenali: baris
  baru, koma, titik koma, dan tab.

Yang terjadi saat import:

- Duplikat di dalam input dibuang (tidak membedakan huruf besar/kecil).
- Kode yang sudah ada di batch yang sama dilewati.
- Kode yang memuat `|` atau `,` atau lebih dari 64 karakter ditolak — dua
  karakter itu adalah pemisah target di API Fonnte.

Batch bisa ditambah kodenya kapan saja lewat tombol **Lihat kode** → **Tambah**.

## 2. Status kode

| Status | Arti |
| --- | --- |
| `available` | Belum dibagikan, siap dikirim |
| `assigned` | Sedang dikunci untuk satu penerima saat broadcast berjalan |
| `sent` | Pesan berisi kode ini sudah masuk antrian Fonnte — terkunci permanen |

Kalau server mati di tengah pengiriman, ada kode yang tertinggal di status
`assigned`. Tombol **Lepas** di baris batch mengembalikannya ke stok.

## 3. Menulis pesan

Di **Broadcast WA**, tombol `+ {voucher}` menyisipkan placeholder. Alias yang
juga dikenali: `{kode}` dan `{kupon}`.

```
Halo {nama}! 🎉

Kamu dapat voucher khusus pendaftar waitlist EVOMI:

*{voucher}*

Tukarkan sebelum 30 September ya.
```

Server menolak pengiriman kalau batch dipilih tapi pesan belum memuat
placeholder — supaya kode tidak terbuang tanpa terlihat penerima.

Di balik layar, kode dikirim sebagai variabel per-penerima Fonnte
(`nomor|nama|kode` di parameter `target`, `{var1}` di pesan), jadi 70 penerima
tetap terkirim dalam beberapa request batch, bukan 70 request terpisah.

## 4. Pilihan saat mengirim

- **Lewati pendaftar yang sudah pernah dapat kode dari batch ini** (default
  aktif) — mencegah satu orang menerima dua kode kalau broadcast diulang.
- **Tetap kirim walau kode kurang** — kalau stok kode lebih sedikit dari jumlah
  penerima. Kode dibagikan sesuai urutan pendaftar, sisanya tidak dikirimi
  pesan. Tanpa opsi ini, pengiriman dibatalkan dan tidak ada kode yang terpakai.

## 5. Kalau ada yang gagal terkirim

Kode milik nomor yang gagal **dikembalikan otomatis ke stok** (`available`),
jadi broadcast bisa diulang tanpa kode terbuang. Orang yang sudah berhasil
menerima kode akan dilewati di percobaan kedua.

## 6. Rekap

Tombol **CSV** di baris batch mengunduh rekap `kode, status, nama, whatsapp,
dikirim_pada` — untuk dicocokkan saat penukaran voucher. Export dulu sebelum
menghapus batch, karena riwayat siapa dapat kode apa ikut terhapus.

## Catatan teknis

Tabel: `voucher_batches` dan `voucher_codes` (dibuat otomatis oleh
`initDatabase()`), plus kolom `voucher_batch_id` di `broadcast_campaigns`.

Pengambilan kode memakai `FOR UPDATE SKIP LOCKED` di dalam satu transaksi, jadi
dua broadcast yang berjalan bersamaan tidak mungkin mengambil kode yang sama.

Semua endpoint `/api/vouchers/*` butuh header `x-admin-password`, sama seperti
endpoint broadcast.
