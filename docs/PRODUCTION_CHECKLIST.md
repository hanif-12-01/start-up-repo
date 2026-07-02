# Production Checklist – WattWise AI

## Environment Variables

- [ ] `DATABASE_URL` set dan dimulai dengan `postgresql://` atau `postgres://`
- [ ] `DIRECT_URL` set dan dimulai dengan `postgresql://` atau `postgres://`
- [ ] `NEXTAUTH_URL` set dan dimulai dengan `https://`
- [ ] `NEXTAUTH_SECRET` set, minimal 32 karakter
- [ ] Tidak ada placeholder (`[YOUR-PASSWORD]`, `<PROJECT_REF>`, `localhost`) di URL database
- [ ] `.env` dan `.env.local` **TIDAK** di-commit ke git

## Database

- [ ] `npx prisma validate` berhasil
- [ ] `npx prisma migrate deploy` berhasil di production
- [ ] Seed demo user: `npx prisma db seed`

## Fungsionalitas

- [ ] Login demo user berhasil (`demo@wattwise.id` / `demo123456`)
- [ ] Register user baru berhasil
- [ ] Onboarding usaha baru berhasil
- [ ] Dashboard menampilkan data dengan benar
- [ ] Input data listrik berhasil
- [ ] Laporan PDF bisa di-download
- [ ] Rate limiting aktif (5x gagal login → blocked 15 menit)

## Keamanan

- [ ] Tidak ada secret di client bundle (cek browser DevTools → Sources)
- [ ] Security headers aktif (cek response headers di browser)
- [ ] `NEXTAUTH_SECRET` tidak menggunakan fallback di production
- [ ] Safe logging aktif (tidak ada credential di Vercel logs)

## Deployment

- [ ] `npm run build` berhasil tanpa error
- [ ] Vercel deployment berhasil
- [ ] Cek Vercel Runtime Logs untuk error startup
- [ ] Test semua flow utama di production URL
