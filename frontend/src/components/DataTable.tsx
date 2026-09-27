'use client';

import { useState } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

export function DataTable<T>({
  columns,
  rows,
  keyFor,
  emptyMessage = 'Nothing here yet.',
  pageSize = 10,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  emptyMessage?: string;
  // Pagination is client-side (all rows already fetched, sliced for display).
  // Pass a larger pageSize, or omit rows you don't want paginated at all, if a
  // page's list is always small enough not to need it.
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const clampedPage = Math.min(page, totalPages); // guards against stale page state if rows shrink (e.g. after a deactivate)
  const start = (clampedPage - 1) * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`px-4 py-3 font-medium text-slate-600 ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={keyFor(row)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > pageSize && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <p>
            Showing {start + 1}&ndash;{Math.min(start + pageSize, rows.length)} of {rows.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage === 1}
              className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage === totalPages}
              className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}