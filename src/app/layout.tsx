import type { Metadata, Viewport } from 'next';
import { Fraunces, DM_Sans } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider } from '@/components/Toast';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MOCAB - Movie Cabin',
  description: 'Personal movie library dan film research companion by Beruang Sastra.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="bg-bg text-text min-h-screen font-sans selection:bg-accent-soft selection:text-text">
        <ToastProvider>
          <div id="app" className="max-w-[880px] mx-auto px-[18px] pt-5 pb-[110px]">
            <main id="view">{children}</main>
          </div>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
