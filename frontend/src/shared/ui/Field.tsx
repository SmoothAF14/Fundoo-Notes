import React, { useId } from 'react';

export const inputClass =
  'block w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] text-ink placeholder:text-faint ' +
  'transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 ' +
  'disabled:cursor-not-allowed disabled:bg-muted';

type FieldProps = {
  label: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
};

/** Visible label + optional hint, wired to the control via a generated id. */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="mt-1.5 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function TextField({ label, hint, className = '', ...rest }: TextFieldProps) {
  return <Field label={label} hint={hint}>{(id) => <input id={id} className={`${inputClass} ${className}`} {...rest} />}</Field>;
}
