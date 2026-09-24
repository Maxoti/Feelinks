import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { DataTable } from '@/components/DataTable';
import { StudentRowActions } from '@/components/StudentRowActions';
import type { Student } from '@/lib/types';

const PAGE_SIZE = 10;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const students = await api.students.list().catch(() => [] as Student[]);

  const sorted = [...students].sort(
    (a, b) => Number(a.admissionNo) - Number(b.admissionNo)
  );

  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Students"
        action={
          <Link href="/students/new">
            <Button>Add student</Button>
          </Link>
        }
      />
      <DataTable<Student>
        rows={pageRows}
        keyFor={(s) => s.id}
        emptyMessage="No students registered yet."
        columns={[
          { header: 'Admission no.', render: (s) => <span className="font-mono">{s.admissionNo}</span> },
          { header: 'Name', render: (s) => s.fullName },
          { header: 'Grade', render: (s) => s.grade ?? '—' },
          { header: 'Parent phone', render: (s) => s.parentPhone },
          { header: 'Status', render: (s) => s.status },
          { header: '', align: 'right', render: (s) => <StudentRowActions student={s} /> },
        ]}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Link
              href={`/students?page=${Math.max(1, currentPage - 1)}`}
              className={`rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50 ${
                currentPage === 1 ? 'pointer-events-none opacity-40' : ''
              }`}
            >
              Previous
            </Link>
            <Link
              href={`/students?page=${Math.min(totalPages, currentPage + 1)}`}
              className={`rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50 ${
                currentPage === totalPages ? 'pointer-events-none opacity-40' : ''
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </>
  );
}