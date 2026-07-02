# Security Runbook – WattWise AI

## 1. Rotasi Password Supabase DB

1. Buka Supabase Dashboard → Project Settings → Database.
2. Klik **Reset database password**.
3. Salin password baru.
4. Encode password (URL-encode karakter khusus).
5. Update `DATABASE_URL` dan `DIRECT_URL` di Vercel (lihat langkah 2).

## 2. Update Vercel Environment Variables

1. Buka [Vercel Dashboard](https://vercel.com) → Project → Settings → Environment Variables.
2. Edit variabel yang perlu diubah (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, dll.).
3. Pastikan variabel di-set untuk scope **Production**, **Preview**, dan **Development** sesuai kebutuhan.
4. Klik **Save**.

## 3. Rotasi NEXTAUTH_SECRET

1. Generate secret baru:
   ```bash
   openssl rand -base64 48
   ```
2. Update `NEXTAUTH_SECRET` di Vercel env vars (lihat langkah 2).
3. **Catatan:** Semua sesi JWT yang ada akan invalid setelah rotasi. User perlu login ulang.

## 4. Redeploy Tanpa Build Cache

1. Di Vercel Dashboard → Deployments → klik **⋯** pada deployment terakhir.
2. Pilih **Redeploy** → centang **Redeploy without build cache**.
3. Atau via CLI:
   ```bash
   vercel --force
   ```

## 5. Jika Environment Variable Bocor

**Langkah darurat:**

1. ⚠️ **Segera** rotasi password Supabase DB (langkah 1).
2. ⚠️ **Segera** rotasi `NEXTAUTH_SECRET` (langkah 3).
3. Update semua env vars di Vercel (langkah 2).
4. Redeploy tanpa cache (langkah 4).
5. Cek Supabase logs untuk akses tidak sah.
6. Jika secret di-commit ke git:
   - Gunakan `git filter-branch` atau `BFG Repo-Cleaner` untuk menghapus dari history.
   - Force push.
   - Rotasi semua credential yang terpapar.

## 6. Verifikasi Koneksi Prisma

```bash
npx prisma db pull
npx prisma validate
npx prisma migrate status
```

Jika error koneksi, periksa:
- Format `DATABASE_URL` dan `DIRECT_URL` (harus `postgresql://` atau `postgres://`).
- Password sudah URL-encoded.
- IP tidak di-block oleh Supabase network restrictions.
