/**
 * Building context — the filter model shared by Browse and Build.
 *
 * An estimator states the conditions once and the library stops offering what
 * those conditions forbid. This is deterministic, not advisory: in a Class I
 * hazardous location the MC cable and Romex rows are *absent*, not greyed out,
 * because an option you can still click is an option you can still get wrong.
 *
 * The vocabulary deliberately matches `BUILDING_CONDITIONS` in the project
 * wizard, so a bid that recorded its conditions at setup can hand them straight
 * to the builder instead of asking the same questions twice.
 */

import { useEffect, useState } from 'react';
import { Part, MASTER_PARTS, BOMItem } from './libraryData';

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export type ContextId =
  | 'wood-framing' | 'metal-framing' | 'cmu-masonry' | 'concrete'
  | 'bar-joist' | 'open-ceiling' | 'act-ceiling' | 'surface-mount' | 'hazardous';

export interface ContextOption {
  id: ContextId;
  label: string;
  /** Grouping for the filter menu — structure, ceiling, or condition. */
  group: 'Structure' | 'Ceiling' | 'Condition';
  hint: string;
}

export const CONTEXT_OPTIONS: ContextOption[] = [
  { id: 'wood-framing',  label: 'Wood Framing',              group: 'Structure', hint: 'Timber studs and joists' },
  { id: 'metal-framing', label: 'Metal Framing',             group: 'Structure', hint: 'Steel studs and bar joist' },
  { id: 'cmu-masonry',   label: 'CMU / Masonry',             group: 'Structure', hint: 'Block and brick walls' },
  { id: 'concrete',      label: 'Concrete',                  group: 'Structure', hint: 'Poured slab, tilt-up, deck' },
  { id: 'bar-joist',     label: 'Bar Joist',                 group: 'Structure', hint: 'Open web steel joist' },
  { id: 'open-ceiling',  label: 'Open Ceiling',              group: 'Ceiling',   hint: 'Exposed structure above' },
  { id: 'act-ceiling',   label: 'ACT / Drop Ceiling',        group: 'Ceiling',   hint: 'Suspended acoustic tile grid' },
  { id: 'surface-mount', label: 'Surface Mount',             group: 'Ceiling',   hint: 'Mounted to the finished face' },
  { id: 'hazardous',     label: 'Hazardous / Explosion-Proof', group: 'Condition', hint: 'Class I fuelling, solvents, dust' },
];

export const contextLabel = (id: ContextId) =>
  CONTEXT_OPTIONS.find((o) => o.id === id)?.label ?? id;

/**
 * Conditions recorded in Project Setup, translated into this vocabulary.
 *
 * The wizard's ids are nearly the same words; the two that differ are mapped
 * here rather than by renaming the wizard, which is outside this change.
 */
const PROJECT_CONDITION_MAP: Record<string, ContextId> = {
  'wood-framing': 'wood-framing',
  'metal-framing': 'metal-framing',
  'cmu-walls': 'cmu-masonry',
  'concrete-deck': 'concrete',
  'bar-joists': 'bar-joist',
  'open-ceiling': 'open-ceiling',
  'act-ceiling': 'act-ceiling',
  'hazardous': 'hazardous',
};

export function contextsFromProject(conditionIds: string[]): ContextId[] {
  return conditionIds.map((id) => PROJECT_CONDITION_MAP[id]).filter(Boolean) as ContextId[];
}

/**
 * What the current project recorded at setup.
 *
 * Stands in for the project record until Libraries is opened in a project
 * scope — the seeded job is a metal-framed retail fit-out with an ACT ceiling,
 * which is what the rest of the demo data describes.
 */
export const PROJECT_CONTEXTS: ContextId[] = contextsFromProject([
  'metal-framing', 'act-ceiling',
]);

// ─── The workspace-wide filter selection ──────────────────────────────────────

/**
 * The active building conditions, held for the whole Libraries workspace.
 *
 * A module store rather than state in each view, because Browse and Build are
 * never mounted at the same time — `LibraryView` returns one or the other. With
 * the selection held locally, switching Browse → Build unmounted the filters and
 * remounted them at the project defaults, silently discarding what the estimator
 * had set. The conditions are a fact about the *job*, not about which screen is
 * open, so they live outside both.
 *
 * Same subscribe/snapshot shape as `takeoffQueue` and `projectBreakdown`.
 */
let contextFilters: ContextId[] = [...PROJECT_CONTEXTS];
const filterListeners = new Set<() => void>();

export function getContextFilters(): ContextId[] {
  return contextFilters;
}

export function setContextFilters(next: ContextId[]) {
  contextFilters = next;
  for (const l of filterListeners) l();
}

export function onContextFiltersChange(fn: () => void): () => void {
  filterListeners.add(fn);
  return () => { filterListeners.delete(fn); };
}

/** Subscribe a view to the shared selection. Returns [active, setActive]. */
export function useContextFilters(): [ContextId[], (next: ContextId[]) => void] {
  const [snap, setSnap] = useState(contextFilters);
  useEffect(() => {
    const l = () => setSnap(contextFilters);
    filterListeners.add(l);
    l();
    return () => { filterListeners.delete(l); };
  }, []);
  return [snap, setContextFilters];
}

// ─── Compatibility ────────────────────────────────────────────────────────────

/**
 * A wiring method and the conditions that permit it.
 *
 * `forbiddenBy` wins over `allowedIn`: hazardous is a disqualifier no amount of
 * structure makes acceptable, which is the rule the client's gas-station
 * example turns on.
 */
export interface WiringOption {
  id: string;
  label: string;
  /** Empty means no structural restriction. */
  allowedIn?: ContextId[];
  forbiddenBy?: ContextId[];
  note?: string;
}

export const WIRING_OPTIONS: WiringOption[] = [
  { id: 'mc-pcs-123', label: 'MC-PCS 12/3',      allowedIn: ['metal-framing', 'wood-framing', 'act-ceiling', 'bar-joist', 'open-ceiling'], forbiddenBy: ['hazardous'], note: 'Concealed dry locations' },
  { id: 'mc-122',     label: 'MC 12/2',          allowedIn: ['metal-framing', 'wood-framing', 'act-ceiling', 'bar-joist', 'open-ceiling'], forbiddenBy: ['hazardous'] },
  { id: 'hcf-mc-122', label: 'HCF MC 12/2',      allowedIn: ['metal-framing', 'act-ceiling'], forbiddenBy: ['hazardous'], note: 'Health-care facility rated' },
  { id: 'ac-122',     label: 'AC 12/2',          allowedIn: ['metal-framing', 'wood-framing'], forbiddenBy: ['hazardous'] },
  { id: 'nm-b',       label: 'NM-B (Romex)',     allowedIn: ['wood-framing'], forbiddenBy: ['hazardous', 'metal-framing'], note: 'Residential and light commercial' },
  { id: 'emt-thhn',   label: 'EMT with THHN',    forbiddenBy: ['hazardous'] },
  { id: 'rmc-thhn',   label: 'Rigid Metal Conduit with THHN', note: 'The only raceway rated for Class I here' },
  { id: 'sep',        label: 'Measure Separately' },
  /*
   * Distinct from "Measure Separately": that says the wire is counted on
   * another line, this says the assembly has none. Both are always offered
   * because neither depends on the building conditions.
   */
  { id: 'none',       label: 'No Wire' },
];

/** Wiring choices that put no conductor on the bill of material. */
export function wiringCarriesNoWire(label: string): boolean {
  return label === 'No Wire' || label === 'Measure Separately';
}

/** Mounting methods, filtered the same way. */
export interface MountOption {
  id: string;
  label: string;
  allowedIn?: ContextId[];
  forbiddenBy?: ContextId[];
}

export const MOUNT_OPTIONS: MountOption[] = [
  { id: 'tbar',    label: 'T-Bar Drop-In',                   allowedIn: ['act-ceiling'] },
  { id: 'joist',   label: 'Surface Mount to Joist Framing',  allowedIn: ['metal-framing', 'wood-framing', 'bar-joist', 'open-ceiling', 'surface-mount'] },
  { id: 'cable',   label: 'Suspension Cable and Beam Clamp', allowedIn: ['bar-joist', 'open-ceiling', 'metal-framing'] },
  { id: 'anchor',  label: 'Concrete Anchor Mount',           allowedIn: ['concrete', 'cmu-masonry', 'surface-mount'] },
  { id: 'strut',   label: 'Strut / Unistrut Mount',          allowedIn: ['concrete', 'cmu-masonry', 'bar-joist', 'open-ceiling', 'hazardous'] },
  { id: 'wood',    label: 'Wood Screw',                      allowedIn: ['wood-framing', 'surface-mount'] },
];

/** Box options — a hazardous location takes cast enclosures only. */
export interface BoxOption {
  id: string;
  label: string;
  forbiddenBy?: ContextId[];
  allowedIn?: ContextId[];
}

export const BOX_OPTIONS: BoxOption[] = [
  { id: 'nw-metal',   label: 'New Work 1-Gang Metal Box',        forbiddenBy: ['hazardous'] },
  { id: 'nw-plastic', label: 'New Work 1-Gang Plastic Box',      forbiddenBy: ['hazardous', 'metal-framing'] },
  { id: 'sq4',        label: '4-inch Square Box with Plaster Ring', forbiddenBy: ['hazardous'] },
  { id: 'fs',         label: 'FS Box' },
  { id: 'xp-cast',    label: 'Explosion-Proof Cast Box',         allowedIn: ['hazardous'] },
];

export const COVER_OPTIONS: BoxOption[] = [
  { id: 'standard', label: 'Standard Cover',           forbiddenBy: ['hazardous'] },
  { id: 'ss',       label: 'Stainless-Steel Cover',    forbiddenBy: ['hazardous'] },
  { id: 'wp',       label: 'Weatherproof In-Use Cover' },
  { id: 'xp',       label: 'Explosion-Proof Cover',    allowedIn: ['hazardous'] },
];

/**
 * One rule for every option list.
 *
 * With no filters set nothing is constrained — an empty filter is "show me
 * everything", not "show me nothing". A structural `allowedIn` only bites when
 * the estimator has actually named a structure.
 */
function permitted<T extends { allowedIn?: ContextId[]; forbiddenBy?: ContextId[] }>(
  opt: T, active: ContextId[],
): boolean {
  if (active.length === 0) return true;
  if (opt.forbiddenBy?.some((c) => active.includes(c))) return false;
  if (!opt.allowedIn) return true;
  return opt.allowedIn.some((c) => active.includes(c));
}

export const allowedWiring = (active: ContextId[]) => WIRING_OPTIONS.filter((o) => permitted(o, active));
export const allowedMounts = (active: ContextId[]) => MOUNT_OPTIONS.filter((o) => permitted(o, active));
export const allowedBoxes  = (active: ContextId[]) => BOX_OPTIONS.filter((o) => permitted(o, active));
export const allowedCovers = (active: ContextId[]) => COVER_OPTIONS.filter((o) => permitted(o, active));

/**
 * Raceway types and attachment methods the active conditions permit.
 *
 * The same rule the rest of Build Mode follows: filters *remove* options rather
 * than warning about them. In a Class I location EMT and PVC are not choices an
 * estimator should be able to click past, and a beam clamp is not an option in
 * a poured concrete deck.
 */
export const RACEWAY_OPTIONS: { id: string; forbiddenBy?: ContextId[]; allowedIn?: ContextId[] }[] = [
  { id: 'EMT', forbiddenBy: ['hazardous'] },
  { id: 'IMC' },
  { id: 'Rigid Metal Conduit (RMC)' },
  { id: 'PVC Schedule 40', forbiddenBy: ['hazardous'] },
  { id: 'Flexible Metal Conduit', forbiddenBy: ['hazardous'] },
  { id: 'Liquidtight Flexible Metal', forbiddenBy: ['hazardous'] },
  { id: 'Surface Raceway', forbiddenBy: ['hazardous'], allowedIn: ['surface-mount', 'cmu-masonry'] },
  { id: 'MC Cable — no raceway', forbiddenBy: ['hazardous'] },
];

export const SUPPORT_OPTIONS: { id: string; forbiddenBy?: ContextId[]; allowedIn?: ContextId[] }[] = [
  { id: 'One-Hole Strap' },
  { id: 'Two-Hole Strap' },
  { id: 'Conduit Hanger (Minerallac)' },
  { id: 'Strut and Strap' },
  { id: 'Beam Clamp', allowedIn: ['metal-framing', 'bar-joist', 'open-ceiling'] },
  { id: 'Concrete Anchor', allowedIn: ['concrete', 'cmu-masonry'] },
  { id: 'Wood Screw', allowedIn: ['wood-framing'] },
];

export const allowedRaceways = (active: ContextId[]) =>
  RACEWAY_OPTIONS.filter((o) => permitted(o, active)).map((o) => o.id);
export const allowedSupports = (active: ContextId[]) =>
  SUPPORT_OPTIONS.filter((o) => permitted(o, active)).map((o) => o.id);

/** Human sentence for why a list is short, shown under a constrained control. */
export function constraintNote(active: ContextId[]): string | null {
  if (active.includes('hazardous')) {
    return 'Explosion-proof location — rigid raceway and cast fittings only.';
  }
  if (active.includes('metal-framing') && !active.includes('wood-framing')) {
    return 'Metal framing — non-metallic cable is not offered.';
  }
  return null;
}

// ─── Parts the context permits ────────────────────────────────────────────────

/**
 * Whether a catalog part may be used under the active conditions.
 *
 * Matched on the part's own name and code rather than a hand-maintained
 * allow-list, so a part added to the catalog tomorrow is governed by the same
 * rule without anyone remembering to register it.
 */
export function partAllowed(part: Part, active: ContextId[]): boolean {
  if (active.length === 0) return true;
  const s = `${part.name} ${part.code}`.toLowerCase();
  const haz = active.includes('hazardous');

  if (haz) {
    // Only rigid raceway, cast enclosures and explosion-proof fittings survive.
    if (/\bmc\b|mc cable|mc-pcs|romex|\bnm-b\b|\bac 12|flex(?!.*liquidtight)/.test(s)) return false;
    if (/\bemt\b/.test(s)) return false;
    if (/plastic|pvc/.test(s)) return false;
    if (/(box|cover|connector|coupling|strap|ring)/.test(s)
      && !/explosion|cast|rigid|\bxp\b|liquidtight/.test(s)) return false;
  }

  if (active.includes('metal-framing') && !active.includes('wood-framing')) {
    if (/romex|\bnm-b\b|wood screw/.test(s)) return false;
  }
  if (active.includes('wood-framing') && !active.includes('metal-framing')) {
    if (/self-drilling|self drilling/.test(s)) return false;
  }
  if (!active.includes('act-ceiling')) {
    if (/t-bar/.test(s)) return false;
  }
  if (!active.includes('concrete') && !active.includes('cmu-masonry')) {
    if (/concrete anchor/.test(s)) return false;
  }
  return true;
}

export const contextParts = (active: ContextId[]) => MASTER_PARTS.filter((p) => partAllowed(p, active));

// ─── Assemblies the context permits ───────────────────────────────────────────

/**
 * An assembly's declared contexts, read into the filter vocabulary.
 *
 * `Assembly.context` is display text written for an estimator to read — "Bar
 * Joist – Open Ceiling", "Hard Ceiling – Metal Framing" — not ids. Matched on
 * substrings rather than a lookup table so a phrasing added to the catalog
 * tomorrow is still understood, and so the en dash in those labels cannot break
 * the match by being typed as a hyphen somewhere.
 *
 * Only structure and ceiling are read. "Indoor", "Exposed", "Outdoor",
 * "Concealed" and "Underground" describe the *environment*, which the filter
 * vocabulary does not cover — an assembly declaring only those is unconstrained
 * here rather than being hidden by a condition nobody expressed.
 */
export function assemblyContextIds(context: string[]): ContextId[] {
  const out = new Set<ContextId>();
  for (const c of context) {
    const s = c.toLowerCase();
    if (/metal framing/.test(s)) out.add('metal-framing');
    if (/wood framing/.test(s)) out.add('wood-framing');
    if (/act ceiling|drop ceiling/.test(s)) out.add('act-ceiling');
    if (/bar joist/.test(s)) out.add('bar-joist');
    if (/open ceiling/.test(s)) out.add('open-ceiling');
    if (/concrete/.test(s)) out.add('concrete');
    if (/cmu|masonry/.test(s)) out.add('cmu-masonry');
    if (/surface mount/.test(s)) out.add('surface-mount');
    if (/hazardous|explosion/.test(s)) out.add('hazardous');
  }
  return [...out];
}

/**
 * Whether an assembly belongs on a job with these conditions.
 *
 * Two independent tests, both of which must pass:
 *
 * 1. **What it claims.** An assembly built for a suspended grid says "ACT
 *    Ceiling"; on a job with no ACT ceiling it is the wrong assembly, so a
 *    declared structure or ceiling has to be one the job actually has. An
 *    assembly that declares nothing structural is not judged on this.
 * 2. **What it is wired with.** The wiring method runs through the same
 *    `permitted()` rule the Build Mode dropdowns use, so Romex disappears on
 *    metal framing and everything non-rigid disappears in a Class I location by
 *    the same rule, not a second copy of it.
 *
 * A wiring method this module does not know (`FPLR 18/2`, `Measure Separately`)
 * is left alone deliberately: hiding an assembly because its wiring string was
 * unrecognised would be a false negative, and a filter that hides the right
 * answer is worse than one that shows an extra row.
 */
export function assemblyAllowed(
  a: { context: string[]; wiringMethod: string }, active: ContextId[],
): boolean {
  if (active.length === 0) return true;

  const declared = assemblyContextIds(a.context);
  if (declared.length > 0 && !declared.some((id) => active.includes(id))) return false;

  const wiring = WIRING_OPTIONS.find((o) => o.label === a.wiringMethod);
  if (wiring && !permitted(wiring, active)) return false;

  return true;
}

// ─── The contextual configurator ──────────────────────────────────────────────

/**
 * The roles a configured assembly needs filled, in the order an estimator
 * works them. Each maps to the BOM group its parts land in.
 */
export type PartRole =
  | 'mounting' | 'wiring' | 'raceway' | 'fittings' | 'boxes'
  | 'supports' | 'grounding' | 'controls';

export const ROLE_LABEL: Record<PartRole, string> = {
  mounting: 'Mounting',
  wiring: 'Wiring',
  raceway: 'Raceway',
  fittings: 'Fittings',
  boxes: 'Boxes & covers',
  supports: 'Supports',
  grounding: 'Grounding',
  controls: 'Controls',
};

/** Which BOM group a role's parts belong to once chosen. */
export const ROLE_BOM_GROUP: Record<PartRole, string> = {
  mounting: 'Mounting',
  wiring: 'Wiring',
  raceway: 'Raceway',
  fittings: 'Wiring',
  boxes: 'Box & Cover',
  supports: 'Mounting',
  grounding: 'Grounding',
  controls: 'Controls',
};

/** How a role is recognised in the catalog. */
const ROLE_MATCH: Record<PartRole, (p: Part) => boolean> = {
  mounting:  (p) => p.cat === 'Hangers & Supports' || p.bomGroup === 'Mounting',
  wiring:    (p) => p.cat === 'Wire & Cable' && p.subcat !== 'Grounding' && p.subcat !== 'Control Wire',
  raceway:   (p) => p.cat === 'Raceway & Fittings' && p.subcat !== 'Connectors',
  fittings:  (p) => p.subcat === 'Connectors',
  boxes:     (p) => p.cat === 'Boxes & Covers',
  supports:  (p) => p.cat === 'Fasteners' || p.subcat === 'Support Wire' || p.subcat === 'Beam Clamps',
  grounding: (p) => p.subcat === 'Grounding',
  controls:  (p) => p.subcat === 'Control Wire',
};

/**
 * Which roles a configuration actually needs.
 *
 * A T-bar drop-in fixture on MC needs mounting, wiring, fittings and grounding
 * — it does not need raceway, so no raceway picker is shown. Offering an empty
 * or irrelevant picker is the same failure as offering the whole catalog.
 */
export function rolesFor(opts: {
  kind: 'fixture' | 'device';
  wiring: string;
  dimming?: string;
  active: ContextId[];
}): PartRole[] {
  const roles: PartRole[] = ['mounting'];
  const conduit = /EMT|Rigid|Conduit/i.test(opts.wiring);
  if (opts.wiring !== 'Measure Separately') roles.push('wiring');
  if (conduit) roles.push('raceway');
  roles.push('fittings');
  if (opts.kind === 'device') roles.push('boxes');
  roles.push('supports', 'grounding');
  if (opts.dimming && opts.dimming !== 'None') roles.push('controls');
  return roles;
}

export interface RoleChoice {
  role: PartRole;
  label: string;
  parts: Part[];
  /** The part pre-selected because the configuration implies it. */
  defaultPartId?: string;
}

/**
 * The parts on offer for each role the configuration needs, already narrowed to
 * what the conditions permit. This is what replaces searching the catalog.
 */
export function choicesFor(opts: {
  kind: 'fixture' | 'device';
  wiring: string;
  mount?: string;
  dimming?: string;
  active: ContextId[];
}): RoleChoice[] {
  const pool = contextParts(opts.active);
  return rolesFor(opts).map((role) => {
    const parts = pool.filter(ROLE_MATCH[role]);
    return {
      role,
      label: ROLE_LABEL[role],
      parts,
      defaultPartId: preferredPart(role, parts, opts)?.id,
    };
  }).filter((c) => c.parts.length > 0);
}

/** The obvious pick for a role, so the BOM is complete before anyone clicks. */
function preferredPart(role: PartRole, parts: Part[], opts: { wiring: string; mount?: string }): Part | undefined {
  const byName = (re: RegExp) => parts.find((p) => re.test(p.name));
  if (role === 'wiring') {
    const exact = parts.find((p) => opts.wiring.includes(p.name) || p.name === opts.wiring);
    if (exact) return exact;
  }
  if (role === 'mounting' && opts.mount) {
    if (/T-Bar/i.test(opts.mount)) return byName(/T-Bar/i) ?? parts[0];
    if (/Beam Clamp|Suspension/i.test(opts.mount)) return byName(/Beam Clamp/i) ?? parts[0];
    if (/Concrete/i.test(opts.mount)) return byName(/Anchor/i) ?? parts[0];
  }
  if (role === 'raceway') return byName(/EMT Conduit|Rigid/i) ?? parts[0];
  if (role === 'fittings') return byName(/Connector/i) ?? parts[0];
  if (role === 'grounding') return parts[0];
  return parts[0];
}

/**
 * Genuinely optional extras — the small secondary area, not the main flow.
 *
 * These are the belt-and-braces items an estimator adds by judgement: code
 * requires the support wire on an ACT ceiling, but the fixture works without
 * the spare connector set.
 */
export interface AddOn {
  id: string;
  name: string;
  code: string;
  unit: string;
  qty: number;
  bomGroup: string;
  reason: string;
}

export function addOnsFor(active: ContextId[], mount: string, kind?: string): AddOn[] {
  const out: AddOn[] = [];
  /*
   * Two of these are about hanging a *fixture* in a grid. They were offered on
   * every build, so a conduit run was being told to add fixture support wire —
   * a recommendation that is wrong rather than merely unhelpful, which is the
   * kind that costs trust. The conduit-seal and wire-connector entries below
   * apply to any build and stay.
   */
  const fixtureLike = kind !== 'raceway';
  if (fixtureLike && active.includes('act-ceiling')) {
    out.push({ id: 'ao-sw', name: 'Independent Support Wire', code: 'ISW-12GA', unit: 'EA', qty: 2, bomGroup: 'Mounting', reason: 'Required by code for ACT ceiling fixtures' });
  }
  if (fixtureLike && /T-Bar/i.test(mount)) {
    out.push({ id: 'ao-tb', name: 'T-Bar Clip Set', code: 'TBC-STD', unit: 'EA', qty: 2, bomGroup: 'Mounting', reason: 'Secures the fixture to the grid' });
  }
  if (fixtureLike && (active.includes('bar-joist') || active.includes('open-ceiling'))) {
    out.push({ id: 'ao-rod', name: 'Suspension Rod 3/8" 24"', code: 'SR-375-24', unit: 'EA', qty: 1, bomGroup: 'Mounting', reason: 'Drop support for open structure' });
  }
  if (active.includes('hazardous')) {
    out.push({ id: 'ao-seal', name: 'Explosion-Proof Sealing Fitting', code: 'XP-SEAL-050', unit: 'EA', qty: 2, bomGroup: 'Raceway', reason: 'Conduit seal required at Class I boundaries' });
  }
  out.push({ id: 'ao-wc', name: 'Wire Connector Set', code: 'WC-MARR', unit: 'EA', qty: 3, bomGroup: 'Wiring', reason: 'Terminate conductors' });
  return out;
}

/** Turns a chosen catalog part into a BOM row for the given role. */
export function partToBomItem(part: Part, role: PartRole, qty: number): BOMItem {
  return {
    id: `sel-${role}-${part.id}`,
    group: ROLE_BOM_GROUP[role],
    name: part.name,
    code: part.code,
    qty,
    unit: part.unit,
    required: false,
    priceStatus: 'ok',
  };
}

// ─── AI suggestions ───────────────────────────────────────────────────────────

/**
 * A proposal about the assembly being built, drawn from the configuration and
 * the components already on the bench.
 *
 * These are *suggestions*, deliberately kept apart from the deterministic
 * configurator around them. The role pickers and the add-on list state what an
 * assembly needs; this states what it looks like it is missing — a weaker claim,
 * so it is labelled, reasoned, and always dismissible. Nothing here changes the
 * BOM until the estimator accepts it.
 */
export interface AiSuggestion {
  id: string;
  /** What to do, in the estimator's language. */
  title: string;
  /** Why it is being raised. Shown, never hidden behind a tooltip. */
  reason: string;
  severity: 'advice' | 'gap' | 'code';
  /** The component this would add, when it adds one. */
  add?: { name: string; code: string; unit: string; qty: number; bomGroup: string };
}

export interface AiContext {
  kind: 'fixture' | 'device' | 'generic';
  active: ContextId[];
  wiring: string;
  mount: string;
  runLF: number;
  dropFt: number;
  dimming: string;
  emergency: string;
  /** Codes already on the bench, so nothing is proposed twice. */
  presentCodes: string[];
  bomGroups: string[];
}

const SEVERITY_ORDER: AiSuggestion['severity'][] = ['code', 'gap', 'advice'];

/**
 * Reads the configuration and the bench, and raises what an experienced
 * estimator would notice. Rule-based on purpose: a suggestion an estimator
 * cannot trace back to a reason is a suggestion they will ignore.
 */
export function aiSuggestionsFor(ctx: AiContext): AiSuggestion[] {
  const out: AiSuggestion[] = [];
  const has = (re: RegExp) => ctx.presentCodes.some((c) => re.test(c));
  const hasGroup = (g: string) => ctx.bomGroups.includes(g);

  // ── Code-driven ─────────────────────────────────────────────────────────
  if (ctx.active.includes('hazardous') && !has(/XP-SEAL/)) {
    out.push({
      id: 'ai-seal',
      title: 'Add a conduit sealing fitting',
      reason: 'Class I locations require a seal where the raceway leaves the classified area.',
      severity: 'code',
      add: { name: 'Explosion-Proof Sealing Fitting', code: 'XP-SEAL-050', unit: 'EA', qty: 2, bomGroup: 'Raceway' },
    });
  }
  if (ctx.kind !== 'raceway' && ctx.active.includes('act-ceiling') && !has(/ISW-/)) {
    out.push({
      id: 'ai-support-wire',
      title: 'Add independent support wire',
      reason: 'Fixtures in a suspended grid need support independent of the ceiling system.',
      severity: 'code',
      add: { name: 'Independent Support Wire', code: 'ISW-12GA', unit: 'EA', qty: 2, bomGroup: 'Mounting' },
    });
  }
  if (!hasGroup('Grounding') && ctx.kind !== 'generic') {
    out.push({
      id: 'ai-ground',
      title: 'No grounding component on the bench',
      reason: 'Every assembly that carries a circuit needs an equipment ground.',
      severity: 'code',
      add: { name: 'Equipment Ground #12 Green', code: 'EGC-12-GRN', unit: 'EA', qty: 1, bomGroup: 'Grounding' },
    });
  }

  // ── Gaps the configuration implies ──────────────────────────────────────
  if (ctx.emergency === 'Emergency battery pack' && !has(/EBP-TEST/)) {
    out.push({
      id: 'ai-em-test',
      title: 'Add an emergency test switch',
      reason: 'A battery pack needs a test switch to be commissioned and inspected.',
      severity: 'gap',
      add: { name: 'Emergency Test Switch', code: 'EBP-TEST', unit: 'EA', qty: 1, bomGroup: 'Emergency' },
    });
  }
  if (ctx.dimming !== 'None' && !hasGroup('Controls')) {
    out.push({
      id: 'ai-control-wire',
      title: 'Dimming selected but no control wiring',
      reason: `${ctx.dimming} needs a control pair run alongside the branch circuit.`,
      severity: 'gap',
    });
  }
  if (ctx.runLF >= 100 && !has(/PB-/)) {
    out.push({
      id: 'ai-pullbox',
      title: 'Consider a pull box on this run',
      reason: `${ctx.runLF} ft is long enough that a pull point saves labor on the install.`,
      severity: 'advice',
      add: { name: 'Pull Box 6×6×4', code: 'PB-664', unit: 'EA', qty: 1, bomGroup: 'Box & Cover' },
    });
  }
  if (ctx.dropFt >= 8 && !has(/SR-375/)) {
    out.push({
      id: 'ai-sway',
      title: 'Long drop — add a stabiliser',
      reason: `A ${ctx.dropFt} ft drop will swing without lateral bracing.`,
      severity: 'advice',
      add: { name: 'Suspension Rod 3/8" 24"', code: 'SR-375-24', unit: 'EA', qty: 1, bomGroup: 'Mounting' },
    });
  }
  if (/EMT|Rigid|Conduit/i.test(ctx.wiring) && !hasGroup('Raceway')) {
    out.push({
      id: 'ai-raceway',
      title: 'Conduit wiring method with no raceway on the bench',
      reason: `${ctx.wiring} needs the conduit itself counted, not just the conductors.`,
      severity: 'gap',
    });
  }

  return out.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
}


// ─── Parts by assembly category ───────────────────────────────────────────────

/**
 * Which part categories belong to each assembly category.
 *
 * The parts catalog is organized by what a part *is* (Wire & Cable, Boxes &
 * Covers); an estimator building an assembly thinks in terms of what they are
 * building (Fixtures, Fire Alarm). This maps one onto the other so the rail can
 * be filtered by the same vocabulary the rest of Build Mode uses.
 */
export const PART_CATS_BY_ASSEMBLY_CATEGORY: Record<string, string[]> = {
  'BPC-01': ['Fixtures & Lamps', 'Hangers & Supports', 'Wire & Cable', 'Boxes & Covers', 'Fasteners'],
  'BPC-02': ['Devices', 'Boxes & Covers', 'Wire & Cable', 'Raceway & Fittings', 'Fasteners'],
  'BPC-03': ['Raceway & Fittings', 'Wire & Cable', 'Hangers & Supports', 'Fasteners'],
  'BPC-04': ['Wire & Cable', 'Raceway & Fittings', 'Hangers & Supports'],
  'BPC-05': ['Raceway & Fittings', 'Wire & Cable', 'Boxes & Covers', 'Fasteners'],
  'BPC-06': ['Raceway & Fittings', 'Wire & Cable', 'Boxes & Covers', 'Devices'],
  'BPC-07': ['Wire & Cable', 'Devices', 'Boxes & Covers'],
  'BPC-08': ['Fire Alarm', 'Boxes & Covers', 'Raceway & Fittings', 'Wire & Cable'],
  'BPC-09': ['Raceway & Fittings', 'Wire & Cable', 'Boxes & Covers'],
  'BPC-10': ['Devices', 'Boxes & Covers', 'Wire & Cable', 'Fasteners'],
  'BPC-11': ['Wire & Cable', 'Devices', 'Boxes & Covers', 'Raceway & Fittings'],
};

/** True when the part belongs to the given assembly category. */
export function partInAssemblyCategory(part: Part, code: string): boolean {
  const cats = PART_CATS_BY_ASSEMBLY_CATEGORY[code];
  return !cats || cats.includes(part.cat);
}
