# Database lokal (tanpa Docker)

Project memakai **PostgreSQL**. Pilih salah satu:

## Opsi 1 — Railway saja (paling simpel)

Tidak perlu Postgres di laptop. Di `.env` lokal, paste `DATABASE_URL` dari service PostgreSQL Railway (Variables → Connect).

```env
DATABASE_URL=postgresql://...
VITE_ADMIN_PASSWORD=admin
PORT=3001
```

Lalu `npm run dev`. Konten & waitlist tersimpan di cloud.

---

## Opsi 2 — PostgreSQL terpasang di Windows

1. Install dari [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Saat install, catat password user `postgres`
3. Buka **pgAdmin** atau `psql`, buat database:

```sql
CREATE USER evomi WITH PASSWORD 'evomi';
CREATE DATABASE evomi OWNER evomi;
```

4. File `.env`:

```env
DATABASE_URL=postgresql://evomi:evomi@localhost:5432/evomi
VITE_ADMIN_PASSWORD=admin
PORT=3001
```

5. Jalankan:

```powershell
npm run dev
```

Tabel dibuat otomatis saat API pertama kali start. Cek: [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## Upload gambar lokal

Default: `public/uploads/` (tidak perlu setting tambahan).

`UPLOAD_PUBLIC_DIR` hanya wajib di Railway jika pakai volume.
