/**
 * Bid scope — selecting part of the master estimate without copying it.
 *
 * A general contractor asks for "Floor 1 only", or "fire alarm across the
 * building", or "everything except the service". The wrong answer is to
 * duplicate the estimate and delete rows: two estimates immediately disagree,
 * and a price change made after the split reaches only one of them.
 *
 * So scope is a *filter over the master*, never a copy. Every cost carries a
 * tag, a selection is a pair of independent lists, and the price is recomputed
 * through the same `computeBid` engine the whole bid uses. Nothing is
 * duplicated and nothing can drift.
 *
 * The two dimensions are independent on purpose. Area and system cross, so
 * "Floor 1 + Lighting" is one selection rather than a category someone has to
 * create in advance. A fuller project-level Bid Categories screen can be built
 * on this later: it would edit AREAS and SYSTEMS and the tags, not replace the
 * matching or the pricing.
 */

export interface ScopeDimensionValue {
  id: string;
  label: string;
}

/**
 * Areas of the building. Project-level today, seeded from the drawing series
 * the takeoff was counted against — E-101 is floor 1, E-301 is building A.
 */
export const AREAS: ScopeDimensionValue[] = [
  { id: 'floor-1', label: 'Floor 1' },
  { id: 'floor-2', label: 'Floor 2' },
  { id: 'east-wing', label: 'East Wing' },
  { id: 'building-a', label: 'Building A' },
];

/**
 * Systems, as a GC asks for them. Wider than the client's example list by one:
 * Low Voltage is real scope in this estimate, and a system with cost in it that
 * no selection can name is cost that quietly disappears from every proposal.
 */
export const SYSTEMS: ScopeDimensionValue[] = [
  { id: 'lighting', label: 'Lighting' },
  { id: 'power', label: 'Power' },
  { id: 'branch', label: 'Branch' },
  { id: 'feeders', label: 'Feeders' },
  { id: 'fire-alarm', label: 'Fire Alarm' },
  { id: 'service', label: 'Service / Switchgear' },
  { id: 'low-voltage', label: 'Low Voltage' },
  /*
   * These three carry no tagged cost in this estimate yet, and they are here
   * anyway: a Bid Summary has to be able to *name* data, AV and security as
   * exclusions on a customer's proposal, which is a statement the client needs
   * whether or not the estimate ever priced that work.
   */
  { id: 'data', label: 'Data' },
  { id: 'av', label: 'AV' },
  { id: 'security', label: 'Security' },
];

export const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label ?? id;
export const systemLabel = (id: string) => SYSTEMS.find((s) => s.id === id)?.label ?? id;

/**
 * A selection on both dimensions.
 *
 * **An empty list means "all of this dimension", not "none".** That is what
 * makes the dimensions independent: picking only systems leaves every area in,
 * so "Fire Alarm across all floors" needs no area input at all. It also means
 * the default value — two empty lists — is the whole estimate, which is the
 * right thing for a bid nobody has scoped yet.
 */
export interface ScopeSelection {
  areas: string[];
  systems: string[];
}

export const FULL_SCOPE: ScopeSelection = { areas: [], systems: [] };

export function isFullScope(sel: ScopeSelection): boolean {
  return sel.areas.length === 0 && sel.systems.length === 0;
}

/** Reads the way an estimator would say it out loud. */
export function scopeLabel(sel: ScopeSelection): string {
  if (isFullScope(sel)) return 'Full estimate';
  const areas = sel.areas.length ? sel.areas.map(areaLabel).join(', ') : 'All areas';
  const systems = sel.systems.length ? sel.systems.map(systemLabel).join(', ') : 'All systems';
  return `${areas} · ${systems}`;
}

/**
 * What a cost belongs to.
 *
 * `null` on a dimension means "every value of it" — a switchgear quote is
 * service scope wherever it lands, and a permit belongs to no system at all.
 * A null dimension therefore matches every selection, which is what keeps
 * project-wide costs from vanishing the moment anyone picks a floor.
 */
export interface ScopeTag {
  area: string | null;
  system: string | null;
}

export function matchesScope(tag: ScopeTag, sel: ScopeSelection): boolean {
  const areaOk = tag.area === null || sel.areas.length === 0 || sel.areas.includes(tag.area);
  const systemOk = tag.system === null || sel.systems.length === 0 || sel.systems.includes(tag.system);
  return areaOk && systemOk;
}

/** Toggle one value on one dimension, leaving the other dimension alone. */
export function toggleScope(sel: ScopeSelection, dim: 'areas' | 'systems', id: string): ScopeSelection {
  const current = sel[dim];
  const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
  return { ...sel, [dim]: next };
}

/**
 * Select every value *except* the given ones — "everything except Service".
 *
 * Expressed as an explicit list rather than an exclusion flag, so a system
 * added to the vocabulary later joins the selection instead of silently
 * arriving already excluded from every saved scope.
 */
export function allExcept(dim: 'areas' | 'systems', excluded: string[]): string[] {
  const all = dim === 'areas' ? AREAS : SYSTEMS;
  return all.filter((v) => !excluded.includes(v.id)).map((v) => v.id);
}

// ─── Tagging the estimate ─────────────────────────────────────────────────────

/** Drawing series → area. The takeoff was counted page by page. */
export const AREA_BY_DRAWING: Record<string, string> = {
  'E-101': 'floor-1',
  'E-102': 'floor-2',
  'E-201': 'east-wing',
  'E-301': 'building-a',
};

/**
 * The estimate's own system vocabulary → the one a GC uses.
 *
 * Raceway and wire are branch work, receptacles are power. Deliberately a
 * mapping rather than a rename: the material list keeps the granularity an
 * estimator needs, and the proposal speaks the coarser language of the ask.
 */
export const SYSTEM_BY_GROUP: Record<string, string> = {
  Lighting: 'lighting',
  Devices: 'power',
  'Branch Circuitry': 'branch',
  Wire: 'branch',
  Raceway: 'branch',
  Feeders: 'feeders',
  'Service Gear': 'service',
  'Fire Alarm': 'fire-alarm',
  'Low Voltage': 'low-voltage',
};

/** Quote and subcontract descriptions → system. Unmatched stays project-wide. */
export function systemFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (/fire alarm|smoke|notif/.test(t)) return 'fire-alarm';
  if (/switchgear|switchboard|service|panel/.test(t)) return 'service';
  if (/fixture|lighting|luminaire/.test(t)) return 'lighting';
  if (/feeder/.test(t)) return 'feeders';
  if (/cat6|data|cabling|low volt/.test(t)) return 'low-voltage';
  if (/device|receptacle/.test(t)) return 'power';
  return null;
}

// ─── Pricing a selection ──────────────────────────────────────────────────────

export interface ScopedCosts {
  materialCost: number;
  quotesCost: number;
  subcontractorCost: number;
  /**
   * Share of the estimate's labor hours this selection carries, 0–1.
   *
   * A share rather than an hour count, because the row-level hours are a
   * *distribution key*, not the bid's hours — the bid carries the takeoff total.
   * Applying the share to that total keeps a full selection priced identically
   * to the master instead of a few hours adrift.
   */
  laborShare: number;
  /** Share of the master's direct cost this selection represents, 0–1. */
  share: number;
}

export interface ScopeSource {
  /** Material lines, already tagged and priced. */
  material: { tag: ScopeTag; cost: number; hours: number }[];
  quotes: { tag: ScopeTag; cost: number }[];
  subs: { tag: ScopeTag; cost: number }[];
}

/**
 * Direct costs for a selection, plus the share of the whole they represent.
 *
 * Labor comes back as a share of hours, not dollars, so the caller runs it
 * through the same crew mix the bid uses — pricing scoped labor any other way
 * would let the blended rate drift away from the master estimate.
 *
 * The share is what job-running costs are apportioned by. Permits, equipment
 * hire and bond are not attributable to a floor or a system, and charging the
 * whole lot to a part-scope proposal would price it off the job.
 */
export function scopedCosts(src: ScopeSource, sel: ScopeSelection): ScopedCosts {
  const pick = <T extends { tag: ScopeTag }>(rows: T[]) => rows.filter((r) => matchesScope(r.tag, sel));

  const material = pick(src.material);
  const quotes = pick(src.quotes);
  const subs = pick(src.subs);

  const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((a, r) => a + f(r), 0);

  const direct = sum(material, (r) => r.cost) + sum(quotes, (r) => r.cost) + sum(subs, (r) => r.cost);
  const directAll = sum(src.material, (r) => r.cost) + sum(src.quotes, (r) => r.cost) + sum(src.subs, (r) => r.cost);

  const hours = sum(material, (r) => r.hours);
  const hoursAll = sum(src.material, (r) => r.hours);

  return {
    materialCost: sum(material, (r) => r.cost),
    quotesCost: sum(quotes, (r) => r.cost),
    subcontractorCost: sum(subs, (r) => r.cost),
    laborShare: hoursAll > 0 ? hours / hoursAll : 0,
    share: directAll > 0 ? direct / directAll : 0,
  };
}
