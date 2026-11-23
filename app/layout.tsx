import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EFF5F9' },
    { media: '(prefers-color-scheme: dark)', color: '#08101C' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Koreksi Lembar Jawab — Koreksi LJK Otomatis',
  description:
    'Aplikasi PWA koreksi lembar jawaban komputer (LJK) pilihan ganda otomatis langsung di perangkat menggunakan kamera atau foto tanpa akun dan tanpa internet.',
  applicationName: 'Koreksi Lembar Jawab',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Koreksi LJK',
  },
  icons: {
    icon: [
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Koreksi Lembar Jawab',
    description:
      'Koreksi pilihan ganda otomatis dari foto, langsung di HP Anda. Mendukung 3 lembar sekali foto, 40 & 50 soal, data tersimpan lokal.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koreksi Lembar Jawab',
    description: 'Koreksi pilihan ganda otomatis dari foto, langsung di HP Anda.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#EFF5F9] text-slate-900 antialiased selection:bg-[#1273AA]/20 selection:text-[#0B4A73] dark:bg-[#0B1220] dark:text-slate-100"
      >
        {children}
      </body>
    </html>
  );
}
