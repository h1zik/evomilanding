# Kenapa data hilang setelah deploy / restart?

Project ini menyimpan **konten CMS** dan **waitlist** di **PostgreSQL**, bukan di file di dalam container.

Upload gambar disimpan di **folder disk** (`UPLOAD_PUBLIC_DIR` atau `public/uploads`).

Setup database lokal: lihat [LOCAL-DATABASE.md](./LOCAL-DATABASE.md) (tanpa Docker).

---

## Yang HARUS persisten

| Data | Tempat | Hilang kalau… |
|------|--------|----------------|
| Teks landing, maskot, dekor | PostgreSQL `site_content` | Database baru / kosong |
| Pendaftar waitlist | PostgreSQL `waitlist_submissions` | Database baru / kosong |
| File gambar upload | Folder di server | Redeploy tanpa **Volume** (Railway) |

---

## Railway (production)

### 1. PostgreSQL harus service **terpisah**

- Di project Railway: ada service **Web** (Node) **dan** service **PostgreSQL**.
- Jangan hapus / buat ulang service Postgres tiap deploy.
- Di service **Web** → Variables → `DATABASE_URL` harus **Reference** ke Postgres:
  - `${{Postgres.DATABASE_URL}}` (nama service bisa beda)

Kalau `DATABASE_URL` salah atau Postgres ikut terhapus → tiap deploy = **database kosong** → server mengisi ulang dari `public/content.json` di repo (seperti reset).

### 2. Cek database yang sama

Setelah deploy, buka:

`https://domain-kamu/api/health`

Contoh respons:

```json
{
  "ok": true,
  "database": "connected",
  "dbHost": "containers-us-west-xxx.railway.app",
  "contentRows": 1,
  "waitlistRows": 42
}
```

Catat `dbHost`. Deploy lagi — **harus sama**. Kalau host berubah, kamu pakai DB baru (data “hilang”).

### 3. Volume untuk gambar

- Service Web → **Volumes** → mount mis. `/data`
- Variable: `UPLOAD_PUBLIC_DIR=/data/uploads`
- Tanpa volume, gambar upload **hilang** tiap redeploy (tapi teks di Postgres tetap ada).

### 4. Jangan andalkan `public/content.json`

File itu hanya dipakai **sekali** saat database masih kosong (seed awal). Bukan penyimpanan utama.

---

## Lokal (development)

- Postgres: install native **atau** pakai `DATABASE_URL` Railway — lihat [LOCAL-DATABASE.md](./LOCAL-DATABASE.md)
- Jalankan **`npm run dev`** (web + API). Tanpa API, data cuma di localStorage browser.

---

## Ringkas

- **Teks & waitlist hilang** → Postgres tidak persisten atau `DATABASE_URL` berubah.
- **Gambar hilang** → tidak pakai Railway Volume + `UPLOAD_PUBLIC_DIR`.
- **Tampak reset ke default** → DB kosong → auto-seed dari `content.json` di Git.

Setelah Postgres + Volume benar, redeploy **tidak** menghapus data.
