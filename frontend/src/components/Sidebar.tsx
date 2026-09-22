'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const [open, setOpen] = useState(false);

  // Close the drawer automatically whenever the route changes (link click, back button, etc.)
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Mobile top bar: hamburger + title. Hidden at md and up, where the sidebar is always visible. */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-ink-950 px-4 py-3 text-white">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="rounded-md p-1.5 hover:bg-ink-800"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
        <p className="font-semibold tracking-tight">Feelinks Fees</p>
      </div>

      {/* Backdrop: only rendered (and only clickable) while the drawer is open on mobile. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto bg-ink-950 px-4 py-6 text-slate-300
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:static md:z-auto md:w-56 md:translate-x-0 md:min-h-screen`}
      >
        <div className="mb-8 hidden px-2 md:block">
          <p className="font-semibold tracking-tight text-white">Feelinks Fees</p>
          <p className="mt-0.5 text-xs text-slate-500">Fee management</p>
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
                    ? 'bg-ink-800 text-white font-medium shadow-[inset_3px_0_0_#B6FF3B]'
                    : 'text-slate-400 hover:bg-ink-900 hover:text-slate-200'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}