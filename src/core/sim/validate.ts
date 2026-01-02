import type { WebCeeSimEffect } from './types';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isEffect(v: unknown): v is WebCeeSimEffect {
  if (!isRecord(v)) return false;
  const t = v.type;
  if (t === 'set') return typeof v.key === 'string' && 'val' in v;
  if (t === 'setTemplate') return typeof v.key === 'string' && typeof v.template === 'string';
  if (t === 'inc') return typeof v.key === 'string' && (v.by === undefined || typeof v.by === 'number');
  if (t === 'toggle') return typeof v.key === 'string';
  return false;
}

function asEffectOrArray(v: unknown): WebCeeSimEffect | WebCeeSimEffect[] | null {
  if (isEffect(v)) return v;
  if (Array.isArray(v) && v.every(isEffect)) return v as WebCeeSimEffect[];
  return null;
}

export function coerceHandlerEffects(v: unknown): Record<string, WebCeeSimEffect | WebCeeSimEffect[]> {
  if (!isRecord(v)) return {};
  const out: Record<string, WebCeeSimEffect | WebCeeSimEffect[]> = {};
  for (const [k, val] of Object.entries(v)) {
    const coerced = asEffectOrArray(val);
    if (coerced) out[k] = coerced;
  }
  return out;
}

export function coerceInitialData(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) out[k] = val == null ? '' : String(val);
  return out;
}

export function coerceLists(v: unknown): Record<string, unknown[]> {
  if (!isRecord(v)) return {};
  const out: Record<string, unknown[]> = {};
  for (const [k, val] of Object.entries(v)) {
    if (Array.isArray(val)) out[k] = val;
  }
  return out;
}
