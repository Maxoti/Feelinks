import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { DataTable } from '@/components/DataTable';
import { StudentRowActions } from '@/components/StudentRowActions';
import type { Student } from '@/lib/types';

export default async function StudentsPage() {
  const students = await api.students.list().catch(() => [] as Student[]);

  const sorted = [...students].sort(
    (a, b) => Number(a.admissionNo) - Number(b.admissionNo)
  );

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
        rows={sorted}
        keyFor={(s) => s.id}
        emptyMessage="No students registered yet."
        pageSize={10}
        columns={[
          { header: 'Admission no.', render: (s) => <span className="font-mono">{s.admissionNo}</span> },
          { header: 'Name', render: (s) => s.fullName },
          { header: 'Grade', render: (s) => s.grade ?? '\u2014' },
          { header: 'Parent phone', render: (s) => s.parentPhone },
          { header: 'Status', render: (s) => s.status },
          { header: '', align: 'right', render: (s) => <StudentRowActions student={s} /> },
        ]}
      />
    </>
  );
}