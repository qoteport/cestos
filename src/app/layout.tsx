import React from 'react';
import ApplicationAnalytics from '@/components/ApplicationAnalytics';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import '../styles/tailwind.css';
import '../styles/integration.css';
import AppToaster from '@/components/AppToaster';
import PwaRuntime from '@/components/PwaRuntime';
import UniversalFileViewerHost from '@/components/UniversalFileViewerHost';
import RefreshButtonFeedback from '@/components/RefreshButtonFeedback';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Cestos Operations — Field Operations Command Platform',
  description: 'Cestos Operations helps mining and drilling companies manage workforce, equipment fleet, and inventory across multiple active projects from one command platform.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/assets/cestos-logo-with-company-name-no-bg.jpg', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/assets/cestos-logo-with-company-name-no-bg.jpg', type: 'image/jpeg' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning className={inter.className}>
        <AuthProvider>
        {children}
        <AppToaster />
        <PwaRuntime />
        <UniversalFileViewerHost />
        <RefreshButtonFeedback />

        </AuthProvider>

        <ApplicationAnalytics /></body>
    </html>
  );
}
