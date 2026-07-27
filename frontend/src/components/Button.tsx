import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white hover:bg-accent-dark'
      : 'bg-white text-ink-900 border border-slate-300 hover:bg-slate-50';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
