// -> frontend/src/components/AutoRefresh.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Re-runs the server components on the page (re-fetching the stats) on a timer. Pauses while the tab is hidden.
export function AutoRefresh({ everyMs = 60_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}