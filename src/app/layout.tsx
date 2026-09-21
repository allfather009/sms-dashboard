import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AirSMS Studio — Apple-Inspired SMS Management Dashboard',
  description: 'Modern bulk SMS dispatcher with client-side Excel/CSV parsing, department & funnel filtering, and real-time segment analysis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="min-h-full font-sans antialiased text-zinc-900 bg-[#f5f5f7]">
        {children}
      </body>
    </html>
  );
}
