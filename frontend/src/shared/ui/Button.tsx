import React from 'react';

import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap cursor-pointer ' +
  'transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-sm hover:bg-primary-hover',
  secondary: 'bg-white text-ink border border-line shadow-sm hover:bg-muted',
  ghost: 'text-subtle hover:bg-muted hover:text-ink',
  danger: 'bg-danger text-white shadow-sm hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return [base, variants[variant], sizes[size], extra].join(' ');
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
};

export function Button({ variant, size, icon, loading, className = '', children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  tone?: 'default' | 'danger';
};

export function IconButton({ icon, label, tone = 'default', className = '', type = 'button', ...rest }: IconButtonProps) {
  const toneClass = tone === 'danger' ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-muted hover:text-ink';
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-subtle cursor-pointer',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        toneClass,
        className,
      ].join(' ')}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} animate-spin`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
