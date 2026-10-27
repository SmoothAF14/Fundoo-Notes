import { ApiError } from '@/shared/api/ApiError';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Splits a DRF error into messages for known fields plus a general message for the rest. */
export function splitApiError<K extends string>(err: unknown, fields: readonly K[]): { fields: FieldErrors<K>; general: string | null } {
  if (!(err instanceof ApiError)) return { fields: {}, general: 'Something went wrong. Please try again.' };
  const out: FieldErrors<K> = {};
  const details = err.details;
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
      const first = Array.isArray(value) ? value[0] : value;
      if ((fields as readonly string[]).includes(key) && typeof first === 'string') out[key as K] = first;
    }
  }
  return { fields: out, general: Object.keys(out).length ? null : err.message };
}
