import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type FormFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  hint?: string;
  error?: string | null;
};

/** Mono label, input and an inline error wired up with aria-invalid / aria-describedby. */
export function FormField({ label, hint, error, id, className, ...rest }: FormFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <Input id={inputId} aria-invalid={!!error} aria-describedby={describedBy} className={cn('mt-2 h-11 text-[15px]', className)} {...rest} />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
