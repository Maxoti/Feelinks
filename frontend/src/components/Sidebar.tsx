'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/students', label: 'Students' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/payments', label: 'Payments' },
  { href: '/reconciliation', label: 'Reconciliation' },
  { href: '/business-accounts', label: 'Business accounts' },
  { href: '/terms', label: 'Terms' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 text-slate-600 min-h-screen px-4 py-6">
      <div className="px-2 mb-8">
        <Image
          src="/feelinkslogo.png"
          alt="Feelinks"
          width={140}
          height={140}
          className="w-28 h-auto -ml-1"
          priority
        />
      </div>
      <nav className="space-y-1">
        {LINKS.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-accent/10 text-accent-dark font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}