import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { DataTable } from '@/components/DataTable';
import type { Term } from '@/lib/types';

export default async function TermsPage() {
  const terms = await api.terms.list().catch(() => [] as Term[]);

  return (
    <>
      <PageHeader
        title="Terms"
        action={
          <Link href="/terms/new">
            <Button>Add term</Button>
          </Link>
        }
      />
      <DataTable<Term>
        rows={terms}
        keyFor={(t) => t.id}
        emptyMessage="No terms configured yet."
        columns={[
          { header: 'Name', render: (t) => t.name },
          { header: 'Year', render: (t) => <span className="font-mono">{t.year}</span> },
          { header: 'Term', render: (t) => t.termNumber },
          { header: 'Status', render: (t) => (t.isActive ? 'Active' : '—') },
        ]}
      />
    </>
  );
}
