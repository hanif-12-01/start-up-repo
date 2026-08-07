import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'WattWise AI — Listrik Lebih Cerdas, Cash Flow Lebih Terkendali',
  description: 'Mulai dari tagihan yang Anda punya. WattWise membantu menemukan apa yang perlu diperiksa lebih dahulu.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f7f9f4] text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
