import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "WattWise AI — Listrik Lebih Cerdas, Biaya Lebih Terkendali",
  description:
    "Asisten AI hemat listrik untuk UMKM Indonesia. Pantau pemakaian, prediksi tagihan, deteksi pemakaian tidak normal, dan dapatkan saran hemat listrik.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='28'>⚡</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}