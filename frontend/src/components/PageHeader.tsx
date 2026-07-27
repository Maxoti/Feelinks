export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold text-ink-950 tracking-tight">{title}</h1>
      {action}
    </div>
  );
}
