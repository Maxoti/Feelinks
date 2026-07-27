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
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 px-8 py-8 max-w-6xl">{children}</main>
      </body>
    </html>
  );
}
