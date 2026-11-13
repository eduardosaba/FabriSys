import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/lib/theme';
import FullScreenProvider from '@/lib/fullscreen';
import { AuthProvider } from '@/lib/auth';
import { ActiveLocalProvider } from '@/contexts/ActiveLocalContext';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'Larissa Saba - Doces Gourmet',
  description: 'Sistema de Gestão para Salgados e Confeitaria',
  icons: {
    icon: [{ url: '/c..svg', type: 'image/svg+xml' }],
    shortcut: '/c..svg',
    apple: [{ url: '/c..svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <AuthProvider>
          <ThemeProvider>
            <FullScreenProvider>
              <ActiveLocalProvider>
                {children}
                <Toaster position="top-right" richColors />
              </ActiveLocalProvider>
            </FullScreenProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
