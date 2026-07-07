import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import AdSenseScript from "@/components/ads/adsense-script";

export const metadata: Metadata = {
  title: "WattWise AI — Listrik Lebih Cerdas, Cash Flow Lebih Terkendali",
  description:
    "SaaS electricity cost intelligence untuk pemilik kos, pengelola properti kecil, dan UMKM padat energi. Pantau biaya listrik, keselarasan arus kas, deteksi kemungkinan pemborosan, dan proyeksikan tagihan bulanan secara cerdas.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='28'>⚡</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="google-adsense-account" content="ca-pub-1234567890123456" />
        <AdSenseScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}