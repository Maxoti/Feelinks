import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { DataTable } from '@/components/DataTable';
import { Money } from '@/components/Money';
import { StatusBadge } from '@/components/StatusBadge';
import type { Invoice } from '@/lib/types';

export default async function InvoicesPage() {
  const invoices = await api.invoices.list().catch(() => [] as Invoice[]);

  return (
    <>
      <PageHeader
        title="Invoices"
        action={
          <Link href="/invoices/new">
            <Button>New invoice</Button>
          </Link>
        }
      />
      <DataTable<Invoice>
        rows={invoices}
        keyFor={(inv) => inv.id}
        emptyMessage="No invoices yet."
        columns={[
          {
            header: 'Student',
            render: (inv) => (
              <Link href={`/invoices/${inv.id}`} className="text-accent hover:underline">
                {inv.student?.fullName ?? inv.studentId}
              </Link>
            ),
          },
          { header: 'Term', render: (inv) => inv.term?.name ?? '—' },
          { header: 'Amount due', align: 'right', render: (inv) => <Money amount={inv.amountDue} /> },
          { header: 'Balance', align: 'right', render: (inv) => <Money amount={inv.balance} /> },
          { header: 'Status', render: (inv) => <StatusBadge status={inv.status} /> },
        ]}
      />
    </>
  );
}
