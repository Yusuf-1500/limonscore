import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://limonscore.com'),
  title: {
    default: 'LimonScore — Canlı Maç Skorları, İstatistikler ve 2D Kadrolar',
    template: '%s | LimonScore',
  },
  description:
    'LimonScore ile Süper Lig, Premier League, Şampiyonlar Ligi ve dünya liglerinden canlı maç skorları, anlık gol bildirimleri, detaylı istatistikler ve 2D saha dizilişleri.',
  openGraph: {
    siteName: 'LimonScore',
    url: 'https://limonscore.com',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
              <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7870310846929838"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
