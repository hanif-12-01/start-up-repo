# Security Policy – WattWise AI

## Supported Versions

| Version | Supported |
|---------|-----------|
| MVP 2   | ✅         |

## Reporting a Vulnerability

Jika Anda menemukan celah keamanan, silakan kirim email ke **security@wattwise.id** (atau hubungi maintainer langsung). Jangan membuat issue publik untuk masalah keamanan.

### Yang kami harapkan:
- Deskripsi singkat masalah
- Langkah reproduksi (jika memungkinkan)
- Dampak potensial

Kami akan merespons dalam **48 jam kerja**.

## Security Measures

- Environment variables divalidasi saat server start (`src/lib/env.ts`).
- `NEXTAUTH_SECRET` wajib ada di production; tidak ada fallback.
- Logging menggunakan redaksi otomatis (`src/lib/safe-log.ts`).
- Rate limiting untuk login/register via `AuthAttempt` model.
- Security headers (HSTS, X-Frame-Options, dll.) diterapkan di `next.config.mjs`.
- Tidak ada secret yang di-expose ke client bundle.
- `.env` dan `.env.local` tercantum di `.gitignore`.

## Rotating Secrets

Lihat `docs/SECURITY_RUNBOOK.md` untuk panduan rotasi credential.
