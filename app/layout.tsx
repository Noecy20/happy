import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Happy — la liste d’anniversaire qui garde le secret',
  description: "Créez votre liste d'anniversaire, partagez-la, et découvrez qui vous a offert quoi après la fête.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%23E0456B'/%3E%3Cpath d='M8 14h16v10H8zM7 10h18v4H7z' fill='white'/%3E%3Cpath d='M15 10h2v14h-2z' fill='%23C8A26A'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#14112B' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
