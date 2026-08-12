/**
 * Takeoff symbols — the mark an assembly leaves on the plan.
 *
 * The estimator has to know which assembly they are counting *while* counting.
 * Discovering forty clicks later that the symbol was stale means recounting, so
 * the shape and color belong to the assembly and are changeable at the takeoff
 * screen rather than buried in a settings page.
 */

export type SymbolShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'letter';

export const SYMBOL_SHAPES: { id: SymbolShape; label: string }[] = [
  { id: 'circle',   label: 'Circle' },
  { id: 'square',   label: 'Square' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'diamond',  label: 'Diamond' },
  { id: 'hexagon',  label: 'Hexagon' },
  { id: 'letter',   label: 'Letter' },
];

/** Distinguishable at plan scale and against a grey drawing. */
export const SYMBOL_COLORS = [
  '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0891B2',
  '#2563EB', '#7C3AED', '#DB2777', '#111827', '#65A30D',
];

export interface TakeoffSymbol {
  shape: SymbolShape;
  color: string;
  /** Used when shape is 'letter' — one or two characters. */
  letter?: string;
}

/**
 * A stable default per assembly, so two assemblies never open with the same
 * mark by accident. Derived from the id, which means it survives a reload.
 */
export function defaultSymbol(id: string, name: string): TakeoffSymbol {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return {
    shape: SYMBOL_SHAPES[hash % SYMBOL_SHAPES.length].id,
    color: SYMBOL_COLORS[hash % SYMBOL_COLORS.length],
    letter: (name.trim()[0] ?? 'A').toUpperCase(),
  };
}


// ─── Symbol store ─────────────────────────────────────────────────────────────

/**
 * Takeoff symbols, per assembly, for the whole session.
 *
 * A module store rather than component state because the symbol has to be
 * settable in Build Mode — where the assembly does not exist yet — and readable
 * in Browse and on the takeoff, which are never mounted at the same time. Held
 * locally in Browse, a symbol chosen while building was lost on save, and one
 * chosen in Browse was lost the moment the screen unmounted.
 */
const symbols: Record<string, TakeoffSymbol> = {};
const symbolListeners = new Set<() => void>();

export function symbolFor(id: string, name: string): TakeoffSymbol {
  return symbols[id] ?? defaultSymbol(id, name);
}

export function setSymbolFor(id: string, sym: TakeoffSymbol) {
  symbols[id] = sym;
  for (const l of symbolListeners) l();
}

/**
 * Move a symbol from a draft key onto the saved assembly's id.
 *
 * Build Mode has no assembly id to key on until the save completes, so it holds
 * the symbol under a draft key and hands it over here. Without this the symbol
 * an estimator picked while building would silently reset on save.
 */
export function adoptSymbol(fromId: string, toId: string) {
  if (symbols[fromId]) {
    symbols[toId] = symbols[fromId];
    delete symbols[fromId];
    for (const l of symbolListeners) l();
  }
}

export function onSymbolChange(fn: () => void): () => void {
  symbolListeners.add(fn);
  return () => { symbolListeners.delete(fn); };
}
