import { useEffect, useState } from 'react';
import {
  CategoryGroup, CategoryValue, getGroups, onGroupsChange, selectableValues, sortedGroups,
  setUsageProvider,
} from './projectBreakdown';

/**
 * Takeoff classification — Project Breakdown values carried by takeoff work.
 *
 * This is the middle of the chain:
 *
 *   Project Breakdown  defines the available classifications
 *   Takeoff            assigns them to estimated work      ← here
 *   Master Estimate    holds all the classified work
 *   Bid Summary        filters it and prices independently
 *   Proposal           selects finished summaries
 *
 * **Ids, never names.** A classification is `{ [groupId]: valueId }`, so renaming
 * "Floor 1" to "Level 1" in Project Breakdown leaves every takeoff attached. It
 * also means a takeoff carries whatever groups exist — the three defaults today,
 * a custom Phase or Zone group tomorrow — without this type changing.
 */

/** groupId → valueId. Absent group means unclassified on that dimension. */
export type Classification = Record<string, string>;

export const groupByType = (groups: CategoryGroup[], type: CategoryGroup['type']) =>
  groups.find((g) => g.type === type);

/** The value a classification points at, or null. Resolved live, never cached. */
export function valueOf(groups: CategoryGroup[], cls: Classification, groupId: string): CategoryValue | null {
  const g = groups.find((x) => x.id === groupId);
  const id = cls[groupId];
  return (g && id && g.values.find((v) => v.id === id)) || null;
}

export function labelOf(groups: CategoryGroup[], cls: Classification, type: CategoryGroup['type']): string {
  const g = groupByType(groups, type);
  if (!g) return '—';
  return valueOf(groups, cls, g.id)?.name ?? '—';
}

/** "Floor 1 · Lighting" — how a classification reads in a table cell or badge. */
export function classificationLabel(groups: CategoryGroup[], cls: Classification): string {
  const parts = sortedGroups(groups)
    .map((g) => valueOf(groups, cls, g.id)?.name)
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Unclassified';
}

/**
 * A starting classification: each group's default value, or its first active one.
 *
 * Every group gets an entry rather than only the three defaults, so a custom
 * group added later is filled in for new work without anyone wiring it up.
 */
export function defaultClassification(groups: CategoryGroup[]): Classification {
  const out: Classification = {};
  for (const g of groups) {
    const values = selectableValues(g);
    const pick = values.find((v) => v.isDefault) ?? values[0];
    if (pick) out[g.id] = pick.id;
  }
  return out;
}

/** True where two classifications agree on every group present in either. */
export function sameClassification(a: Classification, b: Classification): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

// ─── System / Scope suggestion ────────────────────────────────────────────────

/**
 * Which system an assembly obviously belongs to.
 *
 * A suggestion, not a rule: it seeds the active System when the estimator picks
 * an assembly and is silent once they have chosen one themselves. Forcing it
 * would be worse than not having it — the estimator is the one who knows the
 * job, and a control that keeps overwriting them gets fought rather than used.
 *
 * Matched on `sourceKey` so a renamed system still receives its suggestions.
 */
const SUGGEST_RULES: { test: RegExp; sourceKey: string }[] = [
  { test: /fire.?alarm|smoke|pull.?station|horn|strobe|duct.?detector/i, sourceKey: 'fire-alarm' },
  { test: /troffer|downlight|fixture|lighting|luminaire|exit sign|high.?bay|wall.?pack|pendant/i, sourceKey: 'lighting' },
  { test: /feeder/i, sourceKey: 'feeders' },
  { test: /switchgear|switchboard|panelboard|panel|disconnect|transformer|service/i, sourceKey: 'service' },
  { test: /receptacle|duplex|gfci|device|switch|occupancy/i, sourceKey: 'power' },
  { test: /cat6|data|cabling|speaker|card reader|access/i, sourceKey: 'low-voltage' },
  { test: /emt|conduit|raceway|homerun|home run|mc cable|branch|wire|thhn/i, sourceKey: 'branch' },
];

/**
 * The System value an assembly name suggests, or null if nothing obvious.
 *
 * Order matters: a "Fire Alarm Pull Station" mentions neither conduit nor a
 * fixture, but "Emergency Exit Combo" would match lighting *and* the branch
 * rule, so the more specific tests come first.
 */
export function suggestSystemValue(groups: CategoryGroup[], assemblyName: string): CategoryValue | null {
  const g = groupByType(groups, 'system');
  if (!g || !assemblyName) return null;
  for (const rule of SUGGEST_RULES) {
    if (!rule.test.test(assemblyName)) continue;
    const match = selectableValues(g).find((v) => v.sourceKey === rule.sourceKey);
    if (match) return match;
  }
  return null;
}

// ─── Page defaults ────────────────────────────────────────────────────────────

export interface PageDefault {
  /** The classification new takeoffs on this page inherit. */
  cls: Classification;
  /** False until the estimator sets it — a seeded guess is not a decision. */
  set: boolean;
}

let pageDefaults: Record<string, PageDefault> = {};
const pageListeners = new Set<() => void>();
const emitPages = () => { for (const l of pageListeners) l(); };

export function getPageDefault(pageId: string): PageDefault | null {
  return pageDefaults[pageId] ?? null;
}

export function setPageDefault(pageId: string, cls: Classification) {
  pageDefaults = { ...pageDefaults, [pageId]: { cls: { ...cls }, set: true } };
  emitPages();
}

export function clearPageDefault(pageId: string) {
  const next = { ...pageDefaults };
  delete next[pageId];
  pageDefaults = next;
  emitPages();
}

export function allPageDefaults(): Record<string, PageDefault> {
  return pageDefaults;
}

export function usePageDefaults(): Record<string, PageDefault> {
  const [snap, setSnap] = useState(pageDefaults);
  useEffect(() => {
    const l = () => setSnap(pageDefaults);
    pageListeners.add(l);
    l();
    return () => { pageListeners.delete(l); };
  }, []);
  return snap;
}

/**
 * Seed page defaults from what the drawing set already says about itself.
 *
 * A sheet titled "Lighting Plan Level 2" is Floor 2 + Lighting, and making the
 * estimator retype that on every page is the tedium this feature exists to
 * remove. Seeded entries are marked `set: false` — they are a suggestion the
 * estimator can accept with "Use as page default", not a decision made for them.
 */
export function seedPageDefaults(pages: { id: string; num: string; title: string; discipline: string }[]) {
  const groups = getGroups();
  const areaG = groupByType(groups, 'area');
  const sysG = groupByType(groups, 'system');
  const pkgG = groupByType(groups, 'bid-package');
  if (!areaG || !sysG || !pkgG) return;

  const bySourceKey = (g: CategoryGroup, key: string) => g.values.find((v) => v.sourceKey === key);
  const basePkg = selectableValues(pkgG).find((v) => v.isDefault) ?? selectableValues(pkgG)[0];

  const next: Record<string, PageDefault> = { ...pageDefaults };
  for (const p of pages) {
    if (next[p.id]?.set) continue;   // never overwrite a real decision
    const text = `${p.num} ${p.title}`;

    // Level / floor from the sheet title, falling back to floor 1.
    const level = /level\s*3|third/i.test(text) ? null
      : /level\s*2|second/i.test(text) ? 'floor-2'
      : 'floor-1';
    const area = level ? bySourceKey(areaG, level) : null;

    const sys = suggestSystemValue(groups, text)
      ?? (/power/i.test(text) ? bySourceKey(sysG, 'power') : null)
      ?? bySourceKey(sysG, 'branch');

    const cls: Classification = {};
    if (basePkg) cls[pkgG.id] = basePkg.id;
    if (area) cls[areaG.id] = area.id;
    if (sys) cls[sysG.id] = sys.id;
    next[p.id] = { cls, set: false };
  }
  pageDefaults = next;
  emitPages();
}

/**
 * Re-resolve page defaults after a Project Breakdown change.
 *
 * A value that was deleted leaves a dangling id; a value that went inactive must
 * stop being handed to new work. Existing takeoffs are deliberately untouched —
 * they keep what they were assigned, which is the promise inactive values make.
 */
export function reconcilePageDefaults() {
  const groups = getGroups();
  let changed = false;
  const next: Record<string, PageDefault> = {};
  for (const [pageId, pd] of Object.entries(pageDefaults)) {
    const cls: Classification = {};
    for (const [groupId, valueId] of Object.entries(pd.cls)) {
      const g = groups.find((x) => x.id === groupId);
      const v = g?.values.find((y) => y.id === valueId);
      if (v && v.active) {
        cls[groupId] = valueId;
      } else if (g) {
        const fallback = selectableValues(g).find((x) => x.isDefault) ?? selectableValues(g)[0];
        if (fallback) cls[groupId] = fallback.id;
        changed = true;
      } else {
        changed = true;
      }
    }
    next[pageId] = { ...pd, cls };
  }
  if (changed) { pageDefaults = next; emitPages(); }
}

/** Keep page defaults valid when the vocabulary moves under them. */
onGroupsChange(reconcilePageDefaults);

// ─── Classified takeoff, published downstream ─────────────────────────────────

export interface ClassifiedTakeoff {
  /** Marker or path id. */
  id: string;
  assemblyId: string;
  assembly: string;
  pageId: string;
  cls: Classification;
  /** Counts are 1 per marker; a linear path carries its measured length. */
  quantity: number;
}

let classified: ClassifiedTakeoff[] = [];
const classifiedListeners = new Set<() => void>();

/**
 * The Master Estimate's view of classified takeoff.
 *
 * Published as a flat list so a Bid Summary can filter it by any dimension
 * without the estimate being split or rebuilt — which is the whole reason the
 * classification is stored on the takeoff rather than derived from drawing
 * numbers downstream.
 */
export function publishClassifiedTakeoff(rows: ClassifiedTakeoff[]) {
  classified = rows;
  for (const l of classifiedListeners) l();
}

export function getClassifiedTakeoff(): ClassifiedTakeoff[] {
  return classified;
}

export function onClassifiedTakeoffChange(fn: () => void): () => void {
  classifiedListeners.add(fn);
  return () => { classifiedListeners.delete(fn); };
}

/**
 * Counts per value id, for the Project Breakdown usage column.
 *
 * Real assignments now, where that screen previously had to infer usage from
 * drawing pages. A value with no takeoff on it reports nothing rather than a
 * guess.
 */
export function takeoffUsageByValue(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of classified) {
    for (const valueId of Object.values(row.cls)) {
      out[valueId] = (out[valueId] ?? 0) + row.quantity;
    }
  }
  return out;
}

/*
 * Hand Project Breakdown its usage source. Registered here, not imported there,
 * so the dependency runs one way: Takeoff knows about the vocabulary, the
 * vocabulary does not need to know about Takeoff.
 */
setUsageProvider(takeoffUsageByValue);
