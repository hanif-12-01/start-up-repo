import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeBootstrap } from '@/components/ThemeBootstrap';

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
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] font-sans">
        <ThemeBootstrap />
        {children}
      </body>
    </html>
  );
}
