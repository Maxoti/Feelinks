import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Feelinks Fees',
  description: 'School fee management and M-Pesa reconciliation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen md:flex">
        <Sidebar />
        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 max-w-6xl">{children}</main>
      </body>
    </html>
  );
}
