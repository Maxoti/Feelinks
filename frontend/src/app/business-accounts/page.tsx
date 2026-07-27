import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { DataTable } from '@/components/DataTable';
import type { BusinessAccount } from '@/lib/types';

export default async function BusinessAccountsPage() {
  const accounts = await api.businessAccounts.list().catch(() => [] as BusinessAccount[]);

  return (
    <>
      <PageHeader
        title="Business accounts"
        action={
          <Link href="/business-accounts/new">
            <Button>Add account</Button>
          </Link>
        }
      />
      <p className="text-sm text-slate-500 mb-4">
        Registered Paybill and Till shortcodes. Every C2B callback is matched against this list —
        a callback on an unregistered shortcode is rejected rather than guessed at.
      </p>
      <DataTable<BusinessAccount>
        rows={accounts}
        keyFor={(a) => a.id}
        emptyMessage="No business accounts registered yet."
        columns={[
          { header: 'Label', render: (a) => a.label },
          { header: 'Shortcode', render: (a) => <span className="font-mono">{a.shortcode}</span> },
          { header: 'Type', render: (a) => (a.accountType === 'till' ? 'Till' : 'Paybill') },
          { header: 'Status', render: (a) => (a.isActive ? 'Active' : 'Inactive') },
        ]}
      />
    </>
  );
}
