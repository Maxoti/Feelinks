'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/students', label: 'Students' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/business-accounts', label: 'Business accounts' },
  { href: '/terms', label: 'Terms' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 bg-ink-950 text-slate-300 min-h-screen px-4 py-6">
      <div className="px-2 mb-8">
        <p className="text-white font-semibold tracking-tight">Feelinks Fees</p>
        <p className="text-xs text-slate-500 mt-0.5">Fee management</p>
      </div>
      <nav className="space-y-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-ink-800 text-white font-medium'
                  : 'text-slate-400 hover:bg-ink-900 hover:text-slate-200'
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
