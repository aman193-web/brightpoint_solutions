/**
 * Shared library data — assemblies, parts and their category hierarchies.
 *
 * Both library workspaces read from here: the guided Builder view
 * (LibraryView) and the McCormick-style Column browser (ColumnLibraryView).
 */



// ─── Types ────────────────────────────────────────────────────────────────────

export type LibraryType = 'system' | 'company' | 'job' | 'customer';
export type CategoryCode = 'BPC-01' | 'BPC-02' | 'BPC-03' | 'BPC-04' | 'BPC-05' | 'BPC-06' | 'BPC-07' | 'BPC-08' | 'BPC-09' | 'BPC-10' | 'BPC-11';
export type WorkspaceMode = 'browse' | 'build';
export type AssemblyStatus = 'recommended' | 'compatible' | 'project-standard' | 'recently-used' | 'custom' | 'needs-review' | 'missing-price' | 'incompatible';

export interface Library {
  id: string;
  name: string;
  type: LibraryType;
  count: number;
  readonly: boolean;
  updated: string;
  /** Job libraries only — the project this library belongs to. */
  project?: string;
}

export interface Category {
  code: CategoryCode;
  name: string;
  count: number;
  warning?: string;
}

export interface BOMItem {
  id: string;
  group: string;
  name: string;
  code: string;
  qty: number;
  unit: string;
  calc?: string;
  baseQty?: number;
  required: boolean;
  manualOverride?: boolean;
  priceStatus: 'ok' | 'missing' | 'stale';
}

export interface Assembly {
  id: string;
  name: string;
  code: string;
  desc: string;
  status: AssemblyStatus;
  /** Subcategory beneath the assembly category — see ASSEMBLY_SUBCATS. */
  subcat?: string;
  /** Third level beneath the subcategory — see ASSEMBLY_TYPES. */
  type?: string;
  context: string[];
  wiringMethod: string;
  source: LibraryType;
  isFavorite: boolean;
  bom: BOMItem[];
}


// ─── Mock data ────────────────────────────────────────────────────────────────

/**
 * Libraries the estimator can work in. `job` libraries are scoped to one
 * project — switching between them is how you move from one job's assemblies to
 * another's, so the picker in the toolbar lists them by project.
 */
export const LIBRARIES: Library[] = [
  { id: 'bpl',        name: 'BPL – Primary Library',                type: 'system',   count: 248, readonly: true,  updated: '2026-06-15' },
  { id: 'company',    name: 'Acme Electrical — Company Standards',  type: 'company',  count: 86,  readonly: false, updated: '2026-07-02' },
  { id: 'riverside',  name: 'Riverside Medical Office',             type: 'customer', count: 34,  readonly: false, updated: '2026-06-28' },
  { id: 'dollartree', name: 'Dollar Tree Job Library',              type: 'job',      count: 12,  readonly: false, updated: '2026-07-10', project: 'BP-025 · Dollar Tree Retail Fit-Out — Store 1842' },
  { id: 'eastfield',  name: 'Eastfield Shopping Center — 4B',       type: 'job',      count: 9,   readonly: false, updated: '2026-07-08', project: 'BP-026 · Eastfield Shopping Center — Tenancy 4B' },
  { id: 'northgate',  name: 'Northgate Industrial — Phase 2',       type: 'job',      count: 21,  readonly: false, updated: '2026-07-09', project: 'BP-024 · Northgate Industrial Complex — Phase 2' },
  { id: 'woolworths', name: 'Woolworths Distribution — Stage 3',    type: 'job',      count: 17,  readonly: false, updated: '2026-07-06', project: 'BP-028 · Woolworths Distribution Hub — Stage 3' },
  { id: 'parramatta', name: 'Parramatta Council Depot',             type: 'job',      count: 6,   readonly: false, updated: '2026-06-30', project: 'BP-027 · Parramatta Council Depot Upgrade' },
];

export const CATEGORIES: Category[] = [
  { code: 'BPC-01', name: 'Fixtures',            count: 42 },
  { code: 'BPC-02', name: 'Devices',             count: 38 },
  { code: 'BPC-03', name: 'Raceway / Cable',     count: 31 },
  { code: 'BPC-04', name: 'Feeders',             count: 18 },
  { code: 'BPC-05', name: 'Service Gear',        count: 14 },
  { code: 'BPC-06', name: 'HVAC',                count: 9  },
  { code: 'BPC-07', name: 'Controls',            count: 16 },
  { code: 'BPC-08', name: 'Fire Alarm',          count: 22 },
  { code: 'BPC-09', name: 'Fire Pump',           count: 6  },
  { code: 'BPC-10', name: 'Residential',         count: 27 },
  { code: 'BPC-11', name: 'Low-Voltage Systems', count: 19, warning: '2 need review' },
];

export const FIXTURE_CONTEXTS = ['ACT Ceiling', 'Hard Ceiling – Metal Framing', 'Hard Ceiling – Wood Framing', 'Bar Joist – Open Ceiling', 'Concrete Deck'];
export const DEVICE_CONTEXTS  = ['Metal Framing', 'Surface Mount', 'Surface Mount on Concrete', 'Masonry'];
export const RACEWAY_CONTEXTS = ['Concealed', 'Exposed', 'Underground', 'Outdoor', 'Hazardous Location'];
export const FEEDER_CONTEXTS  = ['Indoor', 'Outdoor', 'Underground', 'Shaft', 'Roof'];

export function contextsForCategory(code: CategoryCode): string[] {
  if (code === 'BPC-01') return FIXTURE_CONTEXTS;
  if (code === 'BPC-02') return DEVICE_CONTEXTS;
  if (code === 'BPC-03') return RACEWAY_CONTEXTS;
  if (code === 'BPC-04') return FEEDER_CONTEXTS;
  return ['Standard', 'Special Conditions'];
}

// ─── Parts library ────────────────────────────────────────────────────────────
// Parts are individual materials and components; Assemblies are complete
// installations built from them. The two libraries stay separate and each keeps
// its own category / subcategory hierarchy.

export interface Part {
  id: string;
  name: string;
  code: string;
  cat: string;
  subcat: string;
  mfr: string;
  unit: string;
  price: number;
  /** BOM group a part lands in when added to an assembly. */
  bomGroup: string;
  /**
   * Labour class for installing one unit, and the hours it takes.
   *
   * Optional because the catalogue is large and most parts fall squarely into a
   * class their BOM group already implies — `laborTypeOf` derives it. Set
   * explicitly only where a part genuinely differs from its group, so a change to
   * the group's default still reaches everything that never needed an exception.
   */
  laborType?: LaborType;
  /** Hours per unit. Absent means take the labour type's standard. */
  laborUnit?: number;
  /** Where this price came from. Absent derives from the category. */
  pricingSource?: PricingSource;
  /** Which labour-unit column the hours are read from. Absent means NECA 2. */
  laborRateSource?: LaborRateSource;
}

// ─── Pricing source ───────────────────────────────────────────────────────────

/**
 * Where a price actually came from — the first thing an estimator checks before
 * trusting a number, and the reason a stale catalogue price and a quote received
 * this morning must not look alike in the table.
 */
export type PricingSource =
  | 'Supplier quote' | 'Trade price list' | 'Manufacturer list'
  | 'Brightpoint catalogue' | 'Manual entry';

export const PRICING_SOURCES: PricingSource[] = [
  'Supplier quote', 'Trade price list', 'Manufacturer list',
  'Brightpoint catalogue', 'Manual entry',
];

/**
 * Category → where its prices come from in practice.
 *
 * Commodity material is requoted constantly, so wire and conduit sit on a
 * supplier quote; fixtures and fire alarm heads are bought against a
 * manufacturer's list; small hardware nobody quotes stays on the catalogue.
 * A per-part `pricingSource` overrides this.
 */
const PRICING_BY_CATEGORY: Record<string, PricingSource> = {
  'Wire & Cable':        'Supplier quote',
  'Raceway & Fittings':  'Supplier quote',
  'Fixtures & Lamps':    'Manufacturer list',
  'Fire Alarm':          'Manufacturer list',
  Devices:               'Trade price list',
  'Boxes & Covers':      'Trade price list',
  'Hangers & Supports':  'Brightpoint catalogue',
  Fasteners:             'Brightpoint catalogue',
};

export function pricingSourceOf(p: Part): PricingSource {
  return p.pricingSource ?? PRICING_BY_CATEGORY[p.cat] ?? 'Brightpoint catalogue';
}

// ─── Labour rate source ───────────────────────────────────────────────────────

/**
 * Which published labour-unit column a part's hours are read from.
 *
 * The NECA columns are *installation conditions*, not prices: column 1 is the
 * easiest run, column 3 the hardest (height, congestion, existing building).
 * Brightpoint is the company's own history, which is why it sits slightly under
 * the book — an estimator who has measured their own crews should be able to say
 * so per part rather than discounting the whole bid at the end.
 */
export type LaborRateSource = 'NECA 1' | 'NECA 2' | 'NECA 3' | 'Brightpoint';

export const LABOR_RATE_SOURCES: LaborRateSource[] = ['NECA 1', 'NECA 2', 'NECA 3', 'Brightpoint'];

export const LABOR_SOURCE_FACTOR: Record<LaborRateSource, number> = {
  'NECA 1': 0.85,
  'NECA 2': 1,
  'NECA 3': 1.30,
  Brightpoint: 0.95,
};

export const LABOR_SOURCE_NOTE: Record<LaborRateSource, string> = {
  'NECA 1': 'NECA column 1 — favourable conditions, open and accessible',
  'NECA 2': 'NECA column 2 — normal conditions (the book default)',
  'NECA 3': 'NECA column 3 — difficult conditions, height or occupied space',
  Brightpoint: "Brightpoint's own measured install hours",
};

export function laborRateSourceOf(p: Part): LaborRateSource {
  return p.laborRateSource ?? 'NECA 2';
}

/**
 * How a part is installed, in the terms an estimator prices labour in.
 *
 * Deliberately about the *work*, not the material: a troffer and a wall pack are
 * both "Fixture install" because that is what the hours are drawn from.
 */
export type LaborType =
  | 'Fixture install' | 'Device trim' | 'Wire pull' | 'Raceway run'
  | 'Termination' | 'Equipment set' | 'Hardware' | 'No labour';

export const LABOR_TYPES: LaborType[] = [
  'Fixture install', 'Device trim', 'Wire pull', 'Raceway run',
  'Termination', 'Equipment set', 'Hardware', 'No labour',
];

/** Standard hours per unit for a labour class. The per-part override wins. */
export const LABOR_STANDARD: Record<LaborType, number> = {
  'Fixture install': 0.80,
  'Device trim':     0.45,
  'Wire pull':       0.03,
  'Raceway run':     0.18,
  Termination:       0.12,
  'Equipment set':   2.50,
  Hardware:          0.05,
  'No labour':       0,
};

/** BOM group → labour class. The derivation every part falls back to. */
const LABOR_BY_BOM_GROUP: Record<string, LaborType> = {
  Fixture: 'Fixture install',
  Emergency: 'Fixture install',
  Device: 'Device trim',
  Controls: 'Device trim',
  Wiring: 'Wire pull',
  Grounding: 'Wire pull',
  Raceway: 'Raceway run',
  'Box & Cover': 'Termination',
  Mounting: 'Hardware',
  Hardware: 'Hardware',
  'Primary Item': 'Equipment set',
};

/**
 * Part category → labour class, consulted before the BOM group.
 *
 * The BOM group answers "where does this sit in a bill of materials", which is
 * not always the same question as "how is it installed". A 0-10V control wire is
 * BOM group Controls and would inherit Device trim — 0.45 hrs for a foot of
 * wire. Where the category is unambiguous about the *work*, it wins.
 */
const LABOR_BY_CATEGORY: Record<string, LaborType> = {
  'Wire & Cable': 'Wire pull',
  'Raceway & Fittings': 'Raceway run',
  Fasteners: 'Hardware',
};

export function laborTypeOf(p: Part): LaborType {
  return p.laborType ?? LABOR_BY_CATEGORY[p.cat] ?? LABOR_BY_BOM_GROUP[p.bomGroup] ?? 'Hardware';
}

/**
 * Hours to install one unit of this part.
 *
 * An explicit `laborUnit` is the estimator's own figure and wins outright,
 * including a deliberate 0 — which is why this is `??` and not `||`. Otherwise
 * the labour class's standard is read through the part's rate source, so
 * switching a part to NECA 3 moves its hours the way the book says it should.
 */
export function laborHoursOf(p: Part): number {
  if (p.laborUnit !== undefined) return p.laborUnit;
  const std = LABOR_STANDARD[laborTypeOf(p)];
  return Math.round(std * LABOR_SOURCE_FACTOR[laborRateSourceOf(p)] * 1000) / 1000;
}

/** Installed labour cost for one unit, at a given loaded crew rate. */
export function laborCostOf(p: Part, loadedRate: number): number {
  return laborHoursOf(p) * loadedRate;
}

// ─── Recency ──────────────────────────────────────────────────────────────────

/**
 * How recently a part entered the catalogue — higher is newer.
 *
 * Position in `MASTER_PARTS` is the record of when a part was added: entries are
 * appended, so the tail is the newest. Defined here rather than in each list so
 * "Recently added" means the same thing in Settings, Browse and Build; three
 * screens each deciding their own answer is how the same sort ends up in three
 * different orders.
 *
 * A screen holding its own additions (Settings) ranks those above everything
 * here, since they are newer than anything shipped.
 */
let partOrder: Map<string, number> | null = null;

function partOrderMap(): Map<string, number> {
  /* Built on first call, never at module scope: `MASTER_PARTS` is declared
     further down this file, so a module-level initialiser reading it would run
     inside its temporal dead zone and throw on import. */
  if (!partOrder) partOrder = new Map(MASTER_PARTS.map((p, i) => [p.id, i]));
  return partOrder;
}

export function partRecency(p: Part): number {
  const i = partOrderMap().get(p.id);
  /* Not in the catalogue means a part this company added, which is newer than
     anything shipped with the product. */
  return i === undefined ? Number.MAX_SAFE_INTEGER : i;
}

/** Comparator: most recently added first. */
export function byRecentlyAdded(a: Part, b: Part): number {
  return partRecency(b) - partRecency(a);
}

export const PART_CATEGORIES: { name: string; subcats: string[] }[] = [
  { name: 'Wire & Cable',       subcats: ['THHN Copper', 'MC Cable', 'Control Wire', 'Grounding'] },
  { name: 'Raceway & Fittings', subcats: ['EMT', 'Flexible', 'Surface Raceway', 'Connectors'] },
  { name: 'Boxes & Covers',     subcats: ['Metal Boxes', 'Plaster Rings', 'Cover Plates'] },
  { name: 'Fixtures & Lamps',   subcats: ['Troffers', 'Downlights', 'Exit & Emergency'] },
  { name: 'Devices',            subcats: ['Receptacles', 'Switches', 'Data Outlets'] },
  { name: 'Hangers & Supports', subcats: ['T-Bar', 'Beam Clamps', 'Support Wire'] },
  { name: 'Fasteners',          subcats: ['Screws', 'Anchors'] },
  { name: 'Fire Alarm',         subcats: ['Devices', 'Wire'] },
];

export const MASTER_PARTS: Part[] = [
  // Wire & Cable
  { id: 'pt-1',  name: '12 THHN CU Stranded',            code: 'THHN-12-STR',  cat: 'Wire & Cable',       subcat: 'THHN Copper',     mfr: 'Southwire',      unit: 'LF', price: 0.62,  bomGroup: 'Wiring' },
  { id: 'pt-2',  name: '10 THHN CU Stranded',            code: 'THHN-10-STR',  cat: 'Wire & Cable',       subcat: 'THHN Copper',     mfr: 'Southwire',      unit: 'LF', price: 0.98,  bomGroup: 'Wiring' },
  { id: 'pt-3',  name: '14 THHN CU Solid',               code: 'THHN-14-SOL',  cat: 'Wire & Cable',       subcat: 'THHN Copper',     mfr: 'Southwire',      unit: 'LF', price: 0.41,  bomGroup: 'Wiring' },
  { id: 'pt-4',  name: 'MC-PCS 12/3',                    code: 'MC-PCS-123',   cat: 'Wire & Cable',       subcat: 'MC Cable',        mfr: 'Southwire',      unit: 'LF', price: 1.85,  bomGroup: 'Wiring' },
  { id: 'pt-5',  name: 'MC 12/2',                        code: 'MC-122',       cat: 'Wire & Cable',       subcat: 'MC Cable',        mfr: 'Southwire',      unit: 'LF', price: 1.42,  bomGroup: 'Wiring' },
  { id: 'pt-6',  name: 'HCF MC 12/2',                    code: 'HCF-MC-122',   cat: 'Wire & Cable',       subcat: 'MC Cable',        mfr: 'Southwire',      unit: 'LF', price: 2.10,  bomGroup: 'Wiring' },
  { id: 'pt-7',  name: '0-10V Control Wire 2C',          code: 'CW-010V',      cat: 'Wire & Cable',       subcat: 'Control Wire',    mfr: 'Belden',         unit: 'LF', price: 0.74,  bomGroup: 'Controls' },
  { id: 'pt-8',  name: 'DALI Control Cable',             code: 'CW-DALI',      cat: 'Wire & Cable',       subcat: 'Control Wire',    mfr: 'Belden',         unit: 'LF', price: 1.12,  bomGroup: 'Controls' },
  { id: 'pt-9',  name: 'Equipment Ground #12 Green',     code: 'EGC-12-GRN',   cat: 'Wire & Cable',       subcat: 'Grounding',       mfr: 'Southwire',      unit: 'EA', price: 0.45,  bomGroup: 'Grounding' },
  // Raceway & Fittings
  { id: 'pt-10', name: '3/4" EMT Conduit 10 ft',         code: 'EMT-075-10',   cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Allied',         unit: 'EA', price: 9.40,  bomGroup: 'Raceway' },
  { id: 'pt-11', name: '1/2" EMT Conduit 10 ft',         code: 'EMT-050-10',   cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Allied',         unit: 'EA', price: 7.10,  bomGroup: 'Raceway' },
  { id: 'pt-12', name: '1/2" EMT Coupling',              code: 'EMT-CPL-050',  cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Thomas & Betts', unit: 'EA', price: 0.52,  bomGroup: 'Raceway' },
  { id: 'pt-13', name: '3/4" One-Hole Strap',            code: 'STRAP-075',    cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Caddy',          unit: 'EA', price: 0.28,  bomGroup: 'Hardware' },
  { id: 'pt-14', name: '1/2" Flexible Metal Conduit',    code: 'FMC-050',      cat: 'Raceway & Fittings', subcat: 'Flexible',        mfr: 'Electri-Flex',   unit: 'LF', price: 1.05,  bomGroup: 'Raceway' },
  { id: 'pt-15', name: 'Wiremold 500 Raceway 10 ft',     code: 'WM-500-10',    cat: 'Raceway & Fittings', subcat: 'Surface Raceway', mfr: 'Legrand',        unit: 'EA', price: 14.20, bomGroup: 'Raceway' },
  { id: 'pt-16', name: 'Pan-Way 1" Raceway',             code: 'PW-1IN',       cat: 'Raceway & Fittings', subcat: 'Surface Raceway', mfr: 'Panduit',        unit: 'LF', price: 4.50,  bomGroup: 'Raceway' },
  { id: 'pt-17', name: 'MC Connector \xbd"',              code: 'MCC-50',       cat: 'Raceway & Fittings', subcat: 'Connectors',      mfr: 'Thomas & Betts', unit: 'EA', price: 1.10,  bomGroup: 'Wiring' },
  { id: 'pt-18', name: 'Wire Connector (Marr) Large',    code: 'WC-MARR-L',    cat: 'Raceway & Fittings', subcat: 'Connectors',      mfr: 'Ideal',          unit: 'EA', price: 0.35,  bomGroup: 'Wiring' },
  { id: 'pt-19', name: '1/2" EMT Connector D/S',         code: 'EMT-CON-050',  cat: 'Raceway & Fittings', subcat: 'Connectors',      mfr: 'Thomas & Betts', unit: 'EA', price: 0.64,  bomGroup: 'Raceway' },
  // Boxes & Covers
  { id: 'pt-20', name: 'New Work 1-Gang Metal Box',      code: 'MB-1G-NW',     cat: 'Boxes & Covers',     subcat: 'Metal Boxes',     mfr: 'Raco',           unit: 'EA', price: 2.35,  bomGroup: 'Box & Cover' },
  { id: 'pt-21', name: '4" Square Box 1-1/2" Deep',      code: 'BOX-4SQ-150',  cat: 'Boxes & Covers',     subcat: 'Metal Boxes',     mfr: 'Raco',           unit: 'EA', price: 3.80,  bomGroup: 'Box & Cover' },
  { id: 'pt-22', name: '4" Square Plaster Ring 1-Gang',  code: 'PR-4SQ-1G',    cat: 'Boxes & Covers',     subcat: 'Plaster Rings',   mfr: 'Raco',           unit: 'EA', price: 1.45,  bomGroup: 'Box & Cover' },
  { id: 'pt-23', name: 'Standard Cover Plate 1-Gang',    code: 'CP-STD-1G',    cat: 'Boxes & Covers',     subcat: 'Cover Plates',    mfr: 'Leviton',        unit: 'EA', price: 0.85,  bomGroup: 'Box & Cover' },
  { id: 'pt-24', name: 'Stainless-Steel Cover Plate',    code: 'CP-SS-1G',     cat: 'Boxes & Covers',     subcat: 'Cover Plates',    mfr: 'Leviton',        unit: 'EA', price: 3.25,  bomGroup: 'Box & Cover' },
  // Fixtures & Lamps
  { id: 'pt-25', name: 'LED Troffer 2\xd74 40W 5000K',     code: 'LT-240-40W',   cat: 'Fixtures & Lamps',   subcat: 'Troffers',        mfr: 'Lithonia',       unit: 'EA', price: 48.50, bomGroup: 'Fixture' },
  { id: 'pt-26', name: 'LED Troffer 2\xd72 25W 5000K',     code: 'LT-220-25W',   cat: 'Fixtures & Lamps',   subcat: 'Troffers',        mfr: 'Lithonia',       unit: 'EA', price: 39.80, bomGroup: 'Fixture' },
  { id: 'pt-27', name: 'LED Emergency Troffer 2\xd74',     code: 'LTE-240-40W',  cat: 'Fixtures & Lamps',   subcat: 'Troffers',        mfr: 'Lithonia',       unit: 'EA', price: 96.00, bomGroup: 'Fixture' },
  { id: 'pt-28', name: 'LED Recessed Can 4" 12W',        code: 'RC-4IN-12W',   cat: 'Fixtures & Lamps',   subcat: 'Downlights',      mfr: 'Halo',           unit: 'EA', price: 26.40, bomGroup: 'Fixture' },
  { id: 'pt-29', name: 'Emergency Exit Combo Unit',      code: 'EXIT-COMBO',   cat: 'Fixtures & Lamps',   subcat: 'Exit & Emergency',mfr: 'Lithonia',       unit: 'EA', price: 68.00, bomGroup: 'Fixture' },
  { id: 'pt-30', name: 'LED Exit Sign Universal',        code: 'EXIT-LED-U',   cat: 'Fixtures & Lamps',   subcat: 'Exit & Emergency',mfr: 'Lithonia',       unit: 'EA', price: 52.00, bomGroup: 'Fixture' },
  { id: 'pt-31', name: 'Emergency Battery Pack',         code: 'EBP-GEN',      cat: 'Fixtures & Lamps',   subcat: 'Exit & Emergency',mfr: 'Bodine',         unit: 'EA', price: 78.00, bomGroup: 'Emergency' },
  // Devices
  { id: 'pt-32', name: 'Duplex Receptacle 20A Comm.',    code: 'DR-20A-COM',   cat: 'Devices',            subcat: 'Receptacles',     mfr: 'Hubbell',        unit: 'EA', price: 8.50,  bomGroup: 'Device' },
  { id: 'pt-33', name: 'GFCI Receptacle 20A Comm.',      code: 'GR-20A-COM',   cat: 'Devices',            subcat: 'Receptacles',     mfr: 'Hubbell',        unit: 'EA', price: 22.50, bomGroup: 'Device' },
  { id: 'pt-34', name: 'Hospital-Grade Receptacle 20A',  code: 'HGR-20A',      cat: 'Devices',            subcat: 'Receptacles',     mfr: 'Hubbell',        unit: 'EA', price: 31.00, bomGroup: 'Device' },
  { id: 'pt-35', name: 'Single-Pole Switch 20A',         code: 'SW-1P-20A',    cat: 'Devices',            subcat: 'Switches',        mfr: 'Leviton',        unit: 'EA', price: 6.20,  bomGroup: 'Device' },
  { id: 'pt-36', name: 'CAT6 Keystone Jack',             code: 'CAT6-JACK',    cat: 'Devices',            subcat: 'Data Outlets',    mfr: 'Panduit',        unit: 'EA', price: 12.50, bomGroup: 'Device' },
  { id: 'pt-37', name: 'CAT6 Cable',                     code: 'CAT6-CBL',     cat: 'Devices',            subcat: 'Data Outlets',    mfr: 'Belden',         unit: 'LF', price: 0.42,  bomGroup: 'Wiring' },
  // Hangers & Supports
  { id: 'pt-38', name: 'T-Bar Mounting Clip Set',        code: 'MTC-TBAR-01',  cat: 'Hangers & Supports', subcat: 'T-Bar',           mfr: 'Caddy',          unit: 'EA', price: 0.85,  bomGroup: 'Mounting' },
  { id: 'pt-39', name: 'Beam Clamp 3/8"',                code: 'BC-375',       cat: 'Hangers & Supports', subcat: 'Beam Clamps',     mfr: 'Caddy',          unit: 'EA', price: 3.40,  bomGroup: 'Mounting' },
  { id: 'pt-40', name: 'Independent Support Wire 12ga',  code: 'ISW-12GA',     cat: 'Hangers & Supports', subcat: 'Support Wire',    mfr: 'Caddy',          unit: 'EA', price: 1.20,  bomGroup: 'Mounting' },
  { id: 'pt-41', name: 'Safety Cable 1/8" 6 LF',         code: 'SC-125-6LF',   cat: 'Hangers & Supports', subcat: 'Support Wire',    mfr: 'Caddy',          unit: 'EA', price: 4.60,  bomGroup: 'Mounting' },
  // Fasteners
  { id: 'pt-42', name: 'Self-Drilling Screw #8',         code: 'SDS-8-50',     cat: 'Fasteners',          subcat: 'Screws',          mfr: 'Grip-Rite',      unit: 'EA', price: 0.18,  bomGroup: 'Hardware' },
  { id: 'pt-43', name: 'Wood Screw #8 \xd7 1.5"',          code: 'WS-8-150',     cat: 'Fasteners',          subcat: 'Screws',          mfr: 'Grip-Rite',      unit: 'EA', price: 0.12,  bomGroup: 'Hardware' },
  { id: 'pt-44', name: 'Concrete Anchor 1/4"',           code: 'CA-25',        cat: 'Fasteners',          subcat: 'Anchors',         mfr: 'Hilti',          unit: 'EA', price: 0.65,  bomGroup: 'Hardware' },
  // Fire Alarm
  { id: 'pt-45', name: 'Manual Pull Station',            code: 'FA-PULL',      cat: 'Fire Alarm',         subcat: 'Devices',         mfr: 'Notifier',       unit: 'EA', price: 68.00, bomGroup: 'Device' },
  { id: 'pt-46', name: 'Smoke Detector Ceiling Mount',   code: 'FA-SMOKE',     cat: 'Fire Alarm',         subcat: 'Devices',         mfr: 'Notifier',       unit: 'EA', price: 52.00, bomGroup: 'Device' },
  { id: 'pt-47', name: 'FPLR Fire Alarm Cable 18/2',     code: 'FA-CBL-182',   cat: 'Fire Alarm',         subcat: 'Wire',            mfr: 'Genesis',        unit: 'LF', price: 0.58,  bomGroup: 'Wiring' },

  // ── Second batch: backs the codes the wider assembly catalogue references ──
  { id: 'pt-48', name: '1" EMT Conduit 10 ft',            code: 'EMT-100-10',  cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Allied',         unit: 'EA', price: 13.60, bomGroup: 'Raceway' },
  { id: 'pt-49', name: '2" EMT Conduit 10 ft',            code: 'EMT-200-10',  cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Allied',         unit: 'EA', price: 31.40, bomGroup: 'Raceway' },
  { id: 'pt-50', name: '1" EMT Coupling',                 code: 'EMT-CPL-100', cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Thomas & Betts', unit: 'EA', price: 0.94,  bomGroup: 'Raceway' },
  { id: 'pt-51', name: '2" EMT Coupling',                 code: 'EMT-CPL-200', cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Thomas & Betts', unit: 'EA', price: 2.85,  bomGroup: 'Raceway' },
  { id: 'pt-52', name: '1" EMT Connector D/S',            code: 'EMT-CON-100', cat: 'Raceway & Fittings', subcat: 'Connectors',      mfr: 'Thomas & Betts', unit: 'EA', price: 1.35,  bomGroup: 'Raceway' },
  { id: 'pt-53', name: '1" One-Hole Strap',               code: 'STRAP-100',   cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Caddy',          unit: 'EA', price: 0.42,  bomGroup: 'Hardware' },
  { id: 'pt-54', name: '2" Two-Hole Strap',               code: 'STRAP2-200',  cat: 'Raceway & Fittings', subcat: 'EMT',             mfr: 'Caddy',          unit: 'EA', price: 1.15,  bomGroup: 'Hardware' },
  { id: 'pt-55', name: '2" RMC Conduit 10 ft',            code: 'RMC-200-10',  cat: 'Raceway & Fittings', subcat: 'Rigid',           mfr: 'Wheatland',      unit: 'EA', price: 74.00, bomGroup: 'Raceway' },
  { id: 'pt-56', name: '2" Rigid Coupling',               code: 'RMC-CPL-200', cat: 'Raceway & Fittings', subcat: 'Rigid',           mfr: 'Wheatland',      unit: 'EA', price: 8.10,  bomGroup: 'Raceway' },
  { id: 'pt-57', name: '2" PVC Sch 40 Conduit 10 ft',     code: 'PVC-200-10',  cat: 'Raceway & Fittings', subcat: 'PVC',             mfr: 'Cantex',         unit: 'EA', price: 16.20, bomGroup: 'Raceway' },
  { id: 'pt-58', name: '2" PVC Coupling',                 code: 'PVC-CPL-200', cat: 'Raceway & Fittings', subcat: 'PVC',             mfr: 'Cantex',         unit: 'EA', price: 2.05,  bomGroup: 'Raceway' },
  { id: 'pt-59', name: '2" PVC 90\xb0 Sweep',              code: 'PVC-90-200',  cat: 'Raceway & Fittings', subcat: 'PVC',             mfr: 'Cantex',         unit: 'EA', price: 11.40, bomGroup: 'Raceway' },
  { id: 'pt-60', name: '\xbe" Liquidtight Flex',           code: 'LFMC-075',    cat: 'Raceway & Fittings', subcat: 'Flexible',        mfr: 'Electri-Flex',   unit: 'LF', price: 2.35,  bomGroup: 'Raceway' },
  { id: 'pt-61', name: '2" Liquidtight Flex',             code: 'LFMC-200',    cat: 'Raceway & Fittings', subcat: 'Flexible',        mfr: 'Electri-Flex',   unit: 'LF', price: 7.80,  bomGroup: 'Raceway' },
  { id: 'pt-62', name: '\xbe" Liquidtight Connector',      code: 'LFMC-CON-075', cat: 'Raceway & Fittings', subcat: 'Connectors',     mfr: 'Thomas & Betts', unit: 'EA', price: 3.60,  bomGroup: 'Raceway' },
  { id: 'pt-63', name: 'Cable Tray 12" Ladder 10ft',      code: 'CT-12-L10',   cat: 'Raceway & Fittings', subcat: 'Cable Tray',      mfr: 'B-Line',         unit: 'EA', price: 96.00, bomGroup: 'Raceway' },
  { id: 'pt-64', name: 'Tray Splice Plate Kit',           code: 'CT-SPL',      cat: 'Raceway & Fittings', subcat: 'Cable Tray',      mfr: 'B-Line',         unit: 'EA', price: 12.50, bomGroup: 'Raceway' },
  { id: 'pt-65', name: 'Tray Bonding Jumper',             code: 'CT-BOND',     cat: 'Grounding',          subcat: 'Bonding',         mfr: 'Burndy',         unit: 'EA', price: 6.90,  bomGroup: 'Grounding' },

  { id: 'pt-66', name: '10 THHN CU Stranded',             code: 'THHN-10-STR', cat: 'Wire & Cable',       subcat: 'THHN Copper',     mfr: 'Southwire',      unit: 'LF', price: 0.98,  bomGroup: 'Wiring' },
  { id: 'pt-67', name: '3/0 THHN CU',                     code: 'THHN-30-CU',  cat: 'Wire & Cable',       subcat: 'THHN Copper',     mfr: 'Southwire',      unit: 'LF', price: 6.40,  bomGroup: 'Wiring' },
  { id: 'pt-68', name: '2 AWG XHHW CU',                   code: 'XHHW-2-CU',   cat: 'Wire & Cable',       subcat: 'XHHW Copper',     mfr: 'Southwire',      unit: 'LF', price: 3.85,  bomGroup: 'Wiring' },
  { id: 'pt-69', name: 'NM-B 14/2 with Ground',           code: 'NMB-142',     cat: 'Wire & Cable',       subcat: 'NM Cable',        mfr: 'Southwire',      unit: 'LF', price: 0.52,  bomGroup: 'Wiring' },
  { id: 'pt-70', name: 'NM-B 12/2 with Ground',           code: 'NMB-122',     cat: 'Wire & Cable',       subcat: 'NM Cable',        mfr: 'Southwire',      unit: 'LF', price: 0.74,  bomGroup: 'Wiring' },
  { id: 'pt-71', name: '4 AWG Ground CU',                 code: 'GND-4-CU',    cat: 'Grounding',          subcat: 'Conductors',      mfr: 'Southwire',      unit: 'LF', price: 2.15,  bomGroup: 'Grounding' },
  { id: 'pt-72', name: '2 AWG Ground CU',                 code: 'GND-2-CU',    cat: 'Grounding',          subcat: 'Conductors',      mfr: 'Southwire',      unit: 'LF', price: 3.30,  bomGroup: 'Grounding' },
  { id: 'pt-73', name: '6 AWG Ground CU',                 code: 'GND-6-CU',    cat: 'Grounding',          subcat: 'Conductors',      mfr: 'Southwire',      unit: 'LF', price: 1.42,  bomGroup: 'Grounding' },
  { id: 'pt-74', name: 'Ground Rod 5/8" \xd7 8ft',         code: 'GRD-ROD-8',   cat: 'Grounding',          subcat: 'Electrodes',      mfr: 'Erico',          unit: 'EA', price: 18.40, bomGroup: 'Grounding' },
  { id: 'pt-75', name: 'Ground Bar Kit',                  code: 'GND-BAR',     cat: 'Grounding',          subcat: 'Bonding',         mfr: 'Square D',       unit: 'EA', price: 22.00, bomGroup: 'Grounding' },

  { id: 'pt-76', name: 'Panelboard 225A 42-Ckt MLO',      code: 'PNL-225-42',  cat: 'Distribution',       subcat: 'Panelboards',     mfr: 'Square D',       unit: 'EA', price: 1480.00, bomGroup: 'Primary Item' },
  { id: 'pt-77', name: 'Load Center 200A 40-Ckt MB',      code: 'LC-200-40',   cat: 'Distribution',       subcat: 'Load Centers',    mfr: 'Square D',       unit: 'EA', price: 312.00, bomGroup: 'Primary Item' },
  { id: 'pt-78', name: 'Circuit Breaker 2-Pole 30A',      code: 'PNL-BKR-230-30', cat: 'Distribution',    subcat: 'Breakers',        mfr: 'Square D',       unit: 'EA', price: 34.50, bomGroup: 'Device' },
  { id: 'pt-79', name: 'Transformer 45kVA 480-208Y',      code: 'XFMR-45',     cat: 'Distribution',       subcat: 'Transformers',    mfr: 'Acme',           unit: 'EA', price: 2650.00, bomGroup: 'Primary Item' },
  { id: 'pt-80', name: 'Fusible Disconnect 60A 3P 3R',    code: 'DISC-60-3R',  cat: 'Distribution',       subcat: 'Disconnects',     mfr: 'Square D',       unit: 'EA', price: 186.00, bomGroup: 'Primary Item' },
  { id: 'pt-81', name: 'Non-Fused Disconnect 30A 3R',     code: 'DISC-30-NF-3R', cat: 'Distribution',     subcat: 'Disconnects',     mfr: 'Square D',       unit: 'EA', price: 74.00, bomGroup: 'Primary Item' },
  { id: 'pt-82', name: 'Class RK5 Fuse 50A',              code: 'FUSE-RK5-50', cat: 'Distribution',       subcat: 'Fuses',           mfr: 'Bussmann',       unit: 'EA', price: 21.80, bomGroup: 'Device' },
  { id: 'pt-83', name: 'Relay Panel 8-Zone',              code: 'RP-8Z',       cat: 'Controls',           subcat: 'Relay Panels',    mfr: 'Wattstopper',    unit: 'EA', price: 940.00, bomGroup: 'Primary Item' },

  { id: 'pt-84', name: 'Astronomical Time Clock',         code: 'TC-ASTRO',    cat: 'Controls',           subcat: 'Time Clocks',     mfr: 'Intermatic',     unit: 'EA', price: 128.00, bomGroup: 'Controls' },
  { id: 'pt-85', name: 'Photocell Button 120V',           code: 'PC-BTN-120',  cat: 'Controls',           subcat: 'Photocells',      mfr: 'Intermatic',     unit: 'EA', price: 14.60, bomGroup: 'Controls' },
  { id: 'pt-86', name: '0-10V Wall Dimmer',               code: 'DIM-010V',    cat: 'Controls',           subcat: 'Dimmers',         mfr: 'Lutron',         unit: 'EA', price: 62.00, bomGroup: 'Controls' },
  { id: 'pt-87', name: 'Ceiling Occupancy Sensor 360',    code: 'OCC-360-C',   cat: 'Controls',           subcat: 'Sensors',         mfr: 'Wattstopper',    unit: 'EA', price: 78.00, bomGroup: 'Controls' },
  { id: 'pt-88', name: 'Sensor Power Pack 120/277V',      code: 'OCC-PP',      cat: 'Controls',           subcat: 'Sensors',         mfr: 'Wattstopper',    unit: 'EA', price: 46.00, bomGroup: 'Controls' },
  { id: 'pt-89', name: 'Occupancy Sensor Dual-Tech',      code: 'OCC-DT-WB',   cat: 'Devices',            subcat: 'Occupancy Sensors', mfr: 'Wattstopper',  unit: 'EA', price: 58.00, bomGroup: 'Device' },

  { id: 'pt-90', name: 'LED Troffer 2\xd72 25W 5000K',      code: 'LT-220-25W',  cat: 'Fixtures & Lamps',   subcat: 'Troffers',        mfr: 'Lithonia',       unit: 'EA', price: 39.80, bomGroup: 'Fixture' },
  { id: 'pt-91', name: 'Linear LED Pendant 4ft 40W',      code: 'LP-4FT-40W',  cat: 'Fixtures & Lamps',   subcat: 'Linear',          mfr: 'Lithonia',       unit: 'EA', price: 128.00, bomGroup: 'Fixture' },
  { id: 'pt-92', name: 'LED Wall Pack 40W',               code: 'WP-40W',      cat: 'Fixtures & Lamps',   subcat: 'Exterior',        mfr: 'Lithonia',       unit: 'EA', price: 96.00, bomGroup: 'Fixture' },
  { id: 'pt-93', name: 'Emergency Battery Pack 10W',      code: 'EBP-10W',     cat: 'Fixtures & Lamps',   subcat: 'Emergency & Exit', mfr: 'Bodine',        unit: 'EA', price: 74.00, bomGroup: 'Emergency' },
  { id: 'pt-94', name: 'Aircraft Cable Kit 10ft',         code: 'ACK-10',      cat: 'Hangers & Supports', subcat: 'Support Wire',    mfr: 'Gripple',        unit: 'EA', price: 8.90,  bomGroup: 'Mounting' },
  { id: 'pt-95', name: 'Trapeze Hanger Kit',              code: 'TRAP-KIT',    cat: 'Hangers & Supports', subcat: 'Trapeze',         mfr: 'B-Line',         unit: 'EA', price: 16.40, bomGroup: 'Mounting' },
  { id: 'pt-96', name: 'Strut Channel 1-5/8"',            code: 'STRUT-158',   cat: 'Hangers & Supports', subcat: 'Strut',           mfr: 'Unistrut',       unit: 'LF', price: 4.80,  bomGroup: 'Mounting' },
  { id: 'pt-97', name: 'Rooftop Pipe Support Block',      code: 'RTS-BLK',     cat: 'Hangers & Supports', subcat: 'Rooftop',         mfr: 'MIRO',           unit: 'EA', price: 24.00, bomGroup: 'Mounting' },

  { id: 'pt-98', name: 'Weatherproof Box 4"',             code: 'WP-BOX-4',    cat: 'Boxes & Covers',     subcat: 'Weatherproof',    mfr: 'Red Dot',        unit: 'EA', price: 9.20,  bomGroup: 'Box & Cover' },
  { id: 'pt-99', name: 'Weatherproof In-Use Cover',       code: 'WP-IU-1G',    cat: 'Boxes & Covers',     subcat: 'Weatherproof',    mfr: 'Taymac',         unit: 'EA', price: 12.80, bomGroup: 'Box & Cover' },
  { id: 'pt-100', name: 'FS Box 1-Gang',                  code: 'FS-1G',       cat: 'Boxes & Covers',     subcat: 'Metal Boxes',     mfr: 'Appleton',       unit: 'EA', price: 11.40, bomGroup: 'Box & Cover' },
  { id: 'pt-101', name: 'New Work 1-Gang Plastic Box',    code: 'PB-1G-NW',    cat: 'Boxes & Covers',     subcat: 'Plastic Boxes',   mfr: 'Carlon',         unit: 'EA', price: 0.68,  bomGroup: 'Box & Cover' },
  { id: 'pt-102', name: 'Low-Voltage Mud Ring 1-Gang',    code: 'LV-MR-1G',    cat: 'Boxes & Covers',     subcat: 'Plaster Rings',   mfr: 'Caddy',          unit: 'EA', price: 1.90,  bomGroup: 'Box & Cover' },

  { id: 'pt-103', name: 'CAT6 Plenum Cable',              code: 'CAT6-PLEN',   cat: 'Low Voltage',        subcat: 'Data',            mfr: 'Belden',         unit: 'LF', price: 0.46,  bomGroup: 'Wiring' },
  { id: 'pt-104', name: 'CAT6 Keystone Jack',             code: 'CAT6-KJ',     cat: 'Low Voltage',        subcat: 'Data',            mfr: 'Panduit',        unit: 'EA', price: 15.00, bomGroup: 'Device' },
  { id: 'pt-105', name: 'Patch Panel Port CAT6',          code: 'CAT6-PP',     cat: 'Low Voltage',        subcat: 'Data',            mfr: 'Panduit',        unit: 'EA', price: 9.40,  bomGroup: 'Device' },
  { id: 'pt-106', name: 'Faceplate 2-Port',               code: 'FP-2P',       cat: 'Low Voltage',        subcat: 'Data',            mfr: 'Panduit',        unit: 'EA', price: 3.20,  bomGroup: 'Device' },
  { id: 'pt-107', name: 'Proximity Card Reader',          code: 'ACC-RDR',     cat: 'Low Voltage',        subcat: 'Security',        mfr: 'HID',            unit: 'EA', price: 184.00, bomGroup: 'Device' },
  { id: 'pt-108', name: 'Door Position Switch',           code: 'ACC-DPS',     cat: 'Low Voltage',        subcat: 'Security',        mfr: 'GE',             unit: 'EA', price: 16.80, bomGroup: 'Device' },
  { id: 'pt-109', name: 'Access Composite Cable',         code: 'ACC-COMP',    cat: 'Low Voltage',        subcat: 'Security',        mfr: 'Belden',         unit: 'LF', price: 1.34,  bomGroup: 'Wiring' },
  { id: 'pt-110', name: 'Ceiling Speaker 8" 70V',         code: 'AV-SPK-8',    cat: 'Low Voltage',        subcat: 'AV',              mfr: 'Atlas',          unit: 'EA', price: 62.00, bomGroup: 'Device' },
  { id: 'pt-111', name: 'Speaker Backcan',                code: 'AV-BACKCAN',  cat: 'Low Voltage',        subcat: 'AV',              mfr: 'Atlas',          unit: 'EA', price: 28.00, bomGroup: 'Device' },
  { id: 'pt-112', name: 'Speaker Cable 16/2 Plenum',      code: 'AV-CBL-162',  cat: 'Low Voltage',        subcat: 'AV',              mfr: 'Belden',         unit: 'LF', price: 0.62,  bomGroup: 'Wiring' },
  { id: 'pt-113', name: 'Thermostat Cable 18/8 Plenum',   code: 'TSTAT-188',   cat: 'Low Voltage',        subcat: 'Controls',        mfr: 'Genesis',        unit: 'LF', price: 0.84,  bomGroup: 'Wiring' },

  { id: 'pt-114', name: 'Detector Base Addressable',      code: 'FA-BASE-A',   cat: 'Fire Alarm',         subcat: 'Devices',         mfr: 'Notifier',       unit: 'EA', price: 21.00, bomGroup: 'Device' },
  { id: 'pt-115', name: 'Horn/Strobe 15-110cd Red',       code: 'FA-HS-110',   cat: 'Fire Alarm',         subcat: 'Notification',    mfr: 'Wheelock',       unit: 'EA', price: 74.00, bomGroup: 'Device' },
  { id: 'pt-116', name: 'Notification Backbox',           code: 'FA-BB',       cat: 'Fire Alarm',         subcat: 'Notification',    mfr: 'Wheelock',       unit: 'EA', price: 12.40, bomGroup: 'Box & Cover' },
  { id: 'pt-117', name: 'Duct Smoke Detector',            code: 'FA-DUCT',     cat: 'Fire Alarm',         subcat: 'Devices',         mfr: 'Notifier',       unit: 'EA', price: 196.00, bomGroup: 'Device' },
  { id: 'pt-118', name: 'Remote Test Station',            code: 'FA-RTS',      cat: 'Fire Alarm',         subcat: 'Devices',         mfr: 'Notifier',       unit: 'EA', price: 58.00, bomGroup: 'Device' },

  { id: 'pt-119', name: 'Duplex Receptacle 15A Resi',     code: 'DUP-15-RES',  cat: 'Devices',            subcat: 'Receptacles',     mfr: 'Leviton',        unit: 'EA', price: 1.65,  bomGroup: 'Device' },
  { id: 'pt-120', name: 'GFCI Receptacle 20A',            code: 'GFCI-20A',    cat: 'Devices',            subcat: 'Receptacles',     mfr: 'Leviton',        unit: 'EA', price: 18.90, bomGroup: 'Device' },
  { id: 'pt-121', name: 'Cable Staple 1/2"',              code: 'STAPLE-50',   cat: 'Fasteners',          subcat: 'Staples',         mfr: 'Gardner Bender', unit: 'EA', price: 0.06,  bomGroup: 'Hardware' },
  { id: 'pt-122', name: 'Masonry Anchor 1/4"',            code: 'MA-25',       cat: 'Fasteners',          subcat: 'Anchors',         mfr: 'Hilti',          unit: 'EA', price: 0.58,  bomGroup: 'Hardware' },
  { id: 'pt-123', name: 'Wood Screw #10',                 code: 'WS-10',       cat: 'Fasteners',          subcat: 'Screws',          mfr: 'Grip-Rite',      unit: 'EA', price: 0.09,  bomGroup: 'Hardware' },
  { id: 'pt-124', name: 'Underground Warning Tape',       code: 'UG-TAPE',     cat: 'Fasteners',          subcat: 'Marking',         mfr: 'Presco',         unit: 'LF', price: 0.11,  bomGroup: 'Hardware' },
];

/** Subcategories beneath each assembly category — the drill-down level. */
export const ASSEMBLY_SUBCATS: Record<CategoryCode, string[]> = {
  'BPC-01': ['Troffers', 'Downlights', 'Emergency & Exit', 'High Bay', 'Linear'],
  'BPC-02': ['Receptacles', 'Switches', 'Data Outlets', 'Occupancy Sensors'],
  'BPC-03': ['EMT', 'Flex', 'Surface Raceway', 'Cable Tray'],
  'BPC-04': ['Indoor', 'Outdoor', 'Underground', 'Riser'],
  'BPC-05': ['Panelboards', 'Disconnects', 'Transformers'],
  'BPC-06': ['Unit Connections', 'Controls'],
  'BPC-07': ['Dimming', 'Relay Panels', 'Sensors'],
  'BPC-08': ['Initiating Devices', 'Notification', 'Wiring'],
  'BPC-09': ['Controllers', 'Feeders'],
  'BPC-10': ['Devices', 'Fixtures', 'Panels'],
  'BPC-11': ['Data', 'Security', 'AV'],
};


/**
 * Third hierarchy level: category → subcategory → type → assembly.
 * Mirrors how estimators drill down in McCormick (Wire → Branch → EMT → D/S Strap).
 */
export const ASSEMBLY_TYPES: Record<string, string[]> = {
  // BPC-01 Fixtures
  'BPC-01/Troffers':            ['2\xd74 Drop-In', '2\xd72 Drop-In', 'Surface Mount'],
  'BPC-01/Downlights':          ['4" Round', '6" Round', 'Square'],
  'BPC-01/Emergency & Exit':    ['Integral Battery', 'Central Inverter', 'Exit Sign Only'],
  'BPC-01/High Bay':            ['Linear High Bay', 'Round High Bay'],
  'BPC-01/Linear':              ['Suspended', 'Surface', 'Recessed'],
  // BPC-02 Devices
  'BPC-02/Receptacles':         ['Duplex 20A', 'GFCI 20A', 'Hospital Grade', 'Quad 20A'],
  'BPC-02/Switches':            ['Single Pole', '3-Way', 'Dimmer'],
  'BPC-02/Data Outlets':        ['CAT6 Single', 'CAT6 Duplex', 'Fibre'],
  'BPC-02/Occupancy Sensors':   ['Ceiling Mount', 'Wall Switch'],
  // BPC-03 Raceway / Cable
  'BPC-03/EMT':                 ['D/S Strap', 'D/C Strap', 'Beam Clamp', 'Rack'],
  'BPC-03/Flex':                ['D/S Strap', 'Whip'],
  'BPC-03/Surface Raceway':     ['Wiremold 500', 'Pan-Way 1"'],
  'BPC-03/Cable Tray':          ['Ladder', 'Basket'],
  // BPC-04 Feeders
  'BPC-04/Indoor':              ['EMT with THHN', 'MC Feeder'],
  'BPC-04/Outdoor':             ['PVC with THWN', 'Aluminium'],
  'BPC-04/Underground':         ['PVC 40 Direct Bury', 'PVC 80 Encased'],
  'BPC-04/Riser':               ['GRC Riser'],
  // BPC-08 Fire Alarm
  'BPC-08/Initiating Devices':  ['Pull Station', 'Smoke Detector', 'Heat Detector'],
  'BPC-08/Notification':        ['Horn/Strobe', 'Strobe Only'],
  'BPC-08/Wiring':              ['FPLR 18/2', 'FPLP 18/2'],
};

/** Types available beneath a category + subcategory pair. */
export function typesFor(category: CategoryCode, subcat: string): string[] {
  return ASSEMBLY_TYPES[`${category}/${subcat}`] ?? [];
}

/** Payload passed through an HTML5 drag from the Parts library to the BOM. */
export const PART_DRAG_TYPE = 'application/x-brightpoint-part';
/**
 * The part currently being dragged. A synthetic or cross-browser drag can lose
 * the custom dataTransfer type, so both library workspaces fall back to this.
 */
export const dragState: { part: Part | null } = { part: null };

export const FIXTURE_ASSEMBLIES: Assembly[] = [
  {
    id: 'fx-201', name: 'LED Troffer 2\xd74', code: 'BPA-FX-201',
    desc: 'LED Troffer 2\xd74 40W, 5000K, T-bar drop-in or surface, MC-PCS 12/3',
    status: 'recommended', subcat: 'Troffers', type: '2\xd74 Drop-In', context: ['ACT Ceiling', 'Hard Ceiling – Metal Framing'], wiringMethod: 'MC-PCS 12/3',
    source: 'system', isFavorite: true,
    bom: [
      { id: 'b1', group: 'Fixture',   name: 'LED Troffer 2\xd74 40W 5000K',  code: 'LT-240-40W',  qty: 1,   baseQty: 1,   unit: 'EA', required: true,  priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting',  name: 'T-Bar Mounting Clip Set',        code: 'MTC-TBAR-01', qty: 2,   baseQty: 2,   unit: 'EA', required: true,  priceStatus: 'ok' },
      { id: 'b3', group: 'Mounting',  name: 'Safety Cable 1/8" 6 LF',        code: 'SC-125-6LF',  qty: 1,   baseQty: 1,   unit: 'EA', required: false, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',    name: 'MC-PCS 12/3',                   code: 'MC-PCS-123',  qty: 8.4, baseQty: 8.4, unit: 'LF', calc: '8 LF + 5% waste = 8.4 LF', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Wiring',    name: 'MC Connector \xbd"',            code: 'MCC-50',      qty: 2,   baseQty: 2,   unit: 'EA', required: true,  priceStatus: 'ok' },
      { id: 'b6', group: 'Wiring',    name: 'Wire Connector (Marr)',          code: 'WC-MARR-L',   qty: 3,   baseQty: 3,   unit: 'EA', required: true,  priceStatus: 'ok' },
      { id: 'b7', group: 'Grounding', name: 'Equipment Ground #12 Green',    code: 'EGC-12-GRN',  qty: 1,   baseQty: 1,   unit: 'EA', required: true,  priceStatus: 'ok' },
    ],
  },
  {
    id: 'fx-202', name: 'LED Troffer 2\xd72', code: 'BPA-FX-202',
    desc: 'LED Troffer 2\xd72 25W, 5000K, T-bar drop-in, MC 12/2',
    status: 'compatible', subcat: 'Troffers', type: '2\xd72 Drop-In', context: ['ACT Ceiling'], wiringMethod: 'MC 12/2',
    source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture',  name: 'LED Troffer 2\xd72 25W 5000K', code: 'LT-220-25W',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting', name: 'T-Bar Mounting Clip Set',       code: 'MTC-TBAR-01', qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',   name: 'MC 12/2',                       code: 'MC-122',      qty: 6, baseQty: 6, unit: 'LF', calc: '6 LF run', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',   name: 'MC Connector \xbd"',            code: 'MCC-50',      qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
    ],
  },
  {
    id: 'fx-203', name: 'LED Emergency Troffer', code: 'BPA-FX-203',
    desc: 'LED Emergency Troffer 2\xd74 40W with integral battery backup, MC-PCS 12/3',
    status: 'project-standard', subcat: 'Emergency & Exit', type: 'Integral Battery', context: ['ACT Ceiling', 'Hard Ceiling – Metal Framing'], wiringMethod: 'MC-PCS 12/3',
    source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture',    name: 'LED Emergency Troffer 2\xd74 40W', code: 'LTE-240-40W', qty: 1,   baseQty: 1,   unit: 'EA', required: true,  priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting',   name: 'T-Bar Mounting Clip Set',           code: 'MTC-TBAR-01', qty: 2,   baseQty: 2,   unit: 'EA', required: true,  priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',     name: 'MC-PCS 12/3',                       code: 'MC-PCS-123',  qty: 8.4, baseQty: 8.4, unit: 'LF', required: true,  priceStatus: 'ok' },
      { id: 'b4', group: 'Emergency',  name: 'Constant Hot Leg Wire 12/2',        code: 'CHW-122',     qty: 4,   baseQty: 4,   unit: 'LF', required: true,  priceStatus: 'ok' },
      { id: 'b5', group: 'Emergency',  name: 'Emergency Battery Note',            code: 'NOTE-EMG',    qty: 1,   baseQty: 1,   unit: 'EA', required: false, priceStatus: 'ok' },
    ],
  },
  {
    id: 'fx-204', name: 'Recessed Downlight 4"', code: 'BPA-FX-204',
    desc: 'Recessed downlight 4" LED 12W drywall ceiling, MC 12/2',
    status: 'compatible', subcat: 'Downlights', type: '4" Round', context: ['Hard Ceiling – Metal Framing', 'Hard Ceiling – Wood Framing'], wiringMethod: 'MC 12/2',
    source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture',  name: 'LED Recessed Can 4" 12W 3000K', code: 'RC-4IN-12W', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting', name: 'New-Work Mounting Bracket',      code: 'MB-NW-4IN',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',   name: 'MC 12/2',                        code: 'MC-122',     qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',   name: 'MC Connector \xbd"',             code: 'MCC-50',     qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
    ],
  },
];

export const DEVICE_ASSEMBLIES: Assembly[] = [
  {
    id: 'dv-101', name: 'Duplex Receptacle – 20A Commercial', code: 'BPA-DV-101',
    desc: 'Duplex receptacle 20A commercial grade, metal framing, MC 12/2',
    status: 'recommended', subcat: 'Receptacles', type: 'Duplex 20A', context: ['Metal Framing'], wiringMethod: 'MC 12/2',
    source: 'system', isFavorite: true,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Duplex Receptacle 20A Commercial', code: 'DR-20A-COM', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box',        code: 'MB-1G-NW',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'Standard Cover Plate',             code: 'CP-STD-1G',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',      name: 'MC 12/2',                          code: 'MC-122',     qty: 6, baseQty: 6, unit: 'LF', calc: '6 LF run', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Wiring',      name: 'MC Connector \xbd"',               code: 'MCC-50',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b6', group: 'Hardware',    name: 'Self-Drilling Screw #8',            code: 'SDS-8-50',   qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
    ],
  },
  {
    id: 'dv-102', name: 'GFCI Receptacle – 20A Commercial', code: 'BPA-DV-102',
    desc: 'GFCI duplex receptacle 20A commercial grade, metal framing, MC 12/2',
    status: 'compatible', subcat: 'Receptacles', type: 'GFCI 20A', context: ['Metal Framing', 'Surface Mount on Concrete'], wiringMethod: 'MC 12/2',
    source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'GFCI Receptacle 20A Commercial',  code: 'GR-20A-COM', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box',        code: 'MB-1G-NW',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'Standard Cover Plate',             code: 'CP-STD-1G',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',      name: 'MC 12/2',                          code: 'MC-122',     qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Wiring',      name: 'MC Connector \xbd"',               code: 'MCC-50',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ],
  },
  {
    id: 'dv-103', name: 'Hospital-Grade Receptacle – 20A', code: 'BPA-DV-103',
    desc: 'Hospital-grade receptacle 20A, HCF MC cable required, metal framing',
    status: 'compatible', subcat: 'Receptacles', type: 'Hospital Grade', context: ['Metal Framing'], wiringMethod: 'HCF MC 12/2',
    source: 'customer', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Hospital-Grade Receptacle 20A',  code: 'HGR-20A',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box',       code: 'MB-1G-NW',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'Stainless-Steel Cover Plate',     code: 'CP-SS-1G',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',      name: 'HCF MC 12/2',                     code: 'HCF-MC-122', qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Wiring',      name: 'MC Connector \xbd"',              code: 'MCC-50',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b6', group: 'Hardware',    name: 'Self-Drilling Screw #8',          code: 'SDS-8-50',   qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
    ],
  },
];

export const GENERIC_ASSEMBLIES: Assembly[] = [
  { id: 'gen-1', name: 'EMT \xbe" Conduit Run', code: 'BPA-RC-301', desc: 'EMT \xbe" conduit exposed, couplings, straps, locknuts', status: 'compatible', subcat: 'EMT', type: 'D/S Strap', context: ['Exposed'], wiringMethod: 'EMT', source: 'system', isFavorite: false, bom: [] },
  { id: 'gen-2', name: '100A Panel Feeder',     code: 'BPA-FD-401', desc: '100A feeder 3#3 + #6G in 1" EMT, indoor', status: 'recommended', subcat: 'Indoor', type: 'EMT with THHN', context: ['Indoor'], wiringMethod: 'EMT', source: 'system', isFavorite: false, bom: [] },
];

/**
 * Second seed batch — enough breadth that every category has something in it.
 *
 * Nine of the eleven categories used to be empty, so any screen that drilled
 * past Fixtures or Devices demoed as "the catalogue import will populate it".
 * These carry real component lists at plausible quantities, priced against
 * MASTER_PARTS codes wherever a part for the job already exists.
 */
export const CATALOGUE_ASSEMBLIES: Assembly[] = [
  // ── Fixtures ────────────────────────────────────────────────────────────
  { id: 'fx-210', name: 'LED Troffer 2\xd72 Emergency', code: 'BPA-FX-210', desc: 'LED Troffer 2\xd72 30W with integral battery pack, ACT grid',
    status: 'recommended', subcat: 'Troffers', type: '2\xd72 Drop-In', context: ['ACT Ceiling'], wiringMethod: 'MC-PCS 12/3', source: 'company', isFavorite: true,
    bom: [
      { id: 'b1', group: 'Fixture',   name: 'LED Troffer 2\xd72 25W 5000K', code: 'LT-220-25W',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Emergency', name: 'Emergency Battery Pack 10W',  code: 'EBP-10W',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Mounting',  name: 'T-Bar Mounting Clip Set',     code: 'MTC-TBAR-01', qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',    name: 'MC-PCS 12/3',                 code: 'MC-PCS-123',  qty: 8, baseQty: 8, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Wiring',    name: 'MC Connector \xbd"',           code: 'MCC-50',      qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fx-211', name: 'Linear Pendant 4ft', code: 'BPA-FX-211', desc: 'Linear LED pendant 4ft 40W on aircraft cable, open ceiling',
    status: 'compatible', subcat: 'Linear', type: 'Pendant', context: ['Bar Joist – Open Ceiling'], wiringMethod: 'MC-PCS 12/3', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture',  name: 'Linear LED Pendant 4ft 40W', code: 'LP-4FT-40W',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting', name: 'Aircraft Cable Kit 10ft',    code: 'ACK-10',      qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Mounting', name: 'Beam Clamp 3/8"',            code: 'BC-375',      qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',   name: 'MC-PCS 12/3',                code: 'MC-PCS-123',  qty: 14, baseQty: 14, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fx-212', name: 'Wall Pack 40W Outdoor', code: 'BPA-FX-212', desc: 'LED wall pack 40W with photocell, exterior masonry',
    status: 'compatible', subcat: 'Linear', type: 'Wall Pack', context: ['Concrete Deck'], wiringMethod: 'EMT with THHN', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture',  name: 'LED Wall Pack 40W',        code: 'WP-40W',      qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Controls', name: 'Photocell Button 120V',    code: 'PC-BTN-120',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'Weatherproof Box 4"',   code: 'WP-BOX-4',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Hardware', name: 'Masonry Anchor 1/4"',      code: 'MA-25',       qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },

  // ── Devices ─────────────────────────────────────────────────────────────
  { id: 'dv-210', name: 'GFCI Receptacle 20A Weather', code: 'BPA-DV-210', desc: 'GFCI 20A with weatherproof in-use cover, exterior',
    status: 'compatible', subcat: 'Receptacles', type: 'GFCI', context: ['Surface Mount on Concrete'], wiringMethod: 'EMT with THHN', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'GFCI Receptacle 20A',            code: 'GFCI-20A',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'FS Box 1-Gang',                  code: 'FS-1G',       qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'Weatherproof In-Use Cover',      code: 'WP-IU-1G',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',      name: '12 THHN CU Stranded',            code: 'THHN-12-STR', qty: 30, baseQty: 30, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'dv-211', name: 'Occupancy Sensor Wall Switch', code: 'BPA-DV-211', desc: 'Dual-tech wall-box occupancy sensor, single-pole',
    status: 'recommended', subcat: 'Occupancy Sensors', type: 'Wall Box', context: ['Metal Framing'], wiringMethod: 'MC 12/2', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Occupancy Sensor Dual-Tech', code: 'OCC-DT-WB', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box',  code: 'MB-1G-NW',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'Standard Cover Plate 1-Gang', code: 'CP-STD-1G', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',      name: 'MC 12/2',                    code: 'MC-122',    qty: 12, baseQty: 12, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'dv-212', name: 'Data Outlet CAT6 Double', code: 'BPA-DV-212', desc: 'Two-port CAT6 outlet, plenum cable to IDF',
    status: 'compatible', subcat: 'Data Outlets', type: 'Double Port', context: ['Metal Framing'], wiringMethod: 'Measure Separately', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'CAT6 Keystone Jack',       code: 'CAT6-KJ',   qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device',      name: 'Faceplate 2-Port',         code: 'FP-2P',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'Low-Voltage Mud Ring 1-Gang', code: 'LV-MR-1G', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',      name: 'CAT6 Plenum Cable',        code: 'CAT6-PLEN', qty: 90, baseQty: 90, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },

  // ── Raceway / Cable ─────────────────────────────────────────────────────
  { id: 'rc-310', name: 'EMT 1" Home Run 4#12', code: 'BPA-RC-310', desc: '1" EMT with 4#12 THHN, one-hole strap every 10 ft',
    status: 'recommended', subcat: 'EMT', type: 'Home Run', context: ['Concealed'], wiringMethod: 'EMT', source: 'company', isFavorite: true,
    bom: [
      { id: 'b1', group: 'Raceway', name: '1" EMT Conduit',        code: 'EMT-100-10',  qty: 100, baseQty: 100, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Wiring',  name: '12 THHN CU Stranded',   code: 'THHN-12-STR', qty: 420, baseQty: 420, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Raceway', name: '1" EMT Coupling',       code: 'EMT-CPL-100', qty: 10, baseQty: 10, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Raceway', name: '1" EMT Connector D/S',  code: 'EMT-CON-100', qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Mounting', name: '1" One-Hole Strap',    code: 'STRAP-100',   qty: 10, baseQty: 10, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'rc-311', name: 'Liquidtight Flex Whip 6ft', code: 'BPA-RC-311', desc: '\xbe" liquidtight flexible whip to equipment, 3#10',
    status: 'compatible', subcat: 'Flex', type: 'Equipment Whip', context: ['Exposed', 'Outdoor'], wiringMethod: 'Liquidtight Flexible Metal', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway', name: '\xbe" Liquidtight Flex',      code: 'LFMC-075',    qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Wiring',  name: '10 THHN CU Stranded',        code: 'THHN-10-STR', qty: 20, baseQty: 20, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Raceway', name: '\xbe" Liquidtight Connector', code: 'LFMC-CON-075', qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'rc-312', name: 'Cable Tray 12" Ladder Run', code: 'BPA-RC-312', desc: '12" ladder tray, 10 ft sections with trapeze hangers',
    status: 'compatible', subcat: 'Cable Tray', type: 'Ladder 12"', context: ['Exposed'], wiringMethod: 'Measure Separately', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway',  name: 'Cable Tray 12" Ladder 10ft', code: 'CT-12-L10', qty: 5, baseQty: 5, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Raceway',  name: 'Tray Splice Plate Kit',      code: 'CT-SPL',    qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Mounting', name: 'Trapeze Hanger Kit',         code: 'TRAP-KIT',  qty: 5, baseQty: 5, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Grounding', name: 'Tray Bonding Jumper',       code: 'CT-BOND',   qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },

  // ── Feeders ─────────────────────────────────────────────────────────────
  { id: 'fd-410', name: '200A Feeder 3#3/0 + #4G', code: 'BPA-FD-410', desc: '200A feeder in 2" EMT, indoor riser to distribution panel',
    status: 'recommended', subcat: 'Riser', type: 'EMT with THHN', context: ['Indoor'], wiringMethod: 'EMT', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway',   name: '2" EMT Conduit',        code: 'EMT-200-10',  qty: 80, baseQty: 80, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Wiring',    name: '3/0 THHN CU',           code: 'THHN-30-CU',  qty: 250, baseQty: 250, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Grounding', name: '4 AWG Ground CU',       code: 'GND-4-CU',    qty: 85, baseQty: 85, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Raceway',   name: '2" EMT Coupling',       code: 'EMT-CPL-200', qty: 8, baseQty: 8, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Mounting',  name: '2" Two-Hole Strap',     code: 'STRAP2-200',  qty: 8, baseQty: 8, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fd-411', name: 'Underground Feeder PVC 2"', code: 'BPA-FD-411', desc: '2" PVC Sch 40 direct burial with 3#2 XHHW, warning tape',
    status: 'compatible', subcat: 'Underground', type: 'PVC Direct Burial', context: ['Underground'], wiringMethod: 'PVC Schedule 40', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway',   name: '2" PVC Sch 40 Conduit', code: 'PVC-200-10',  qty: 120, baseQty: 120, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Wiring',    name: '2 AWG XHHW CU',         code: 'XHHW-2-CU',   qty: 380, baseQty: 380, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Raceway',   name: '2" PVC Coupling',       code: 'PVC-CPL-200', qty: 12, baseQty: 12, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Raceway',   name: '2" PVC 90\xb0 Sweep',    code: 'PVC-90-200',  qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Hardware',  name: 'Underground Warning Tape', code: 'UG-TAPE',  qty: 120, baseQty: 120, unit: 'LF', required: false, priceStatus: 'ok' },
    ] },

  // ── Service Gear ────────────────────────────────────────────────────────
  { id: 'sg-510', name: '42-Circuit Panelboard 225A', code: 'BPA-SG-510', desc: '225A MLO panelboard, 42 circuits, surface mounted with breakers',
    status: 'recommended', subcat: 'Panelboards', type: '225A MLO', context: ['Indoor'], wiringMethod: 'EMT', source: 'company', isFavorite: true,
    bom: [
      { id: 'b1', group: 'Primary Item', name: 'Panelboard 225A 42-Ckt MLO', code: 'PNL-225-42',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device',       name: 'Circuit Breaker 1-Pole 20A', code: 'PNL-BKR-120-20', qty: 30, baseQty: 30, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Device',       name: 'Circuit Breaker 2-Pole 30A', code: 'PNL-BKR-230-30', qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Grounding',    name: 'Ground Bar Kit',            code: 'GND-BAR',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Hardware',     name: 'Panel Mounting Strut Kit',  code: 'PNL-STRUT',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'sg-511', name: 'Fused Disconnect 60A 3P', code: 'BPA-SG-511', desc: '60A 3-pole fusible disconnect, NEMA 3R, with fuses',
    status: 'compatible', subcat: 'Disconnects', type: '60A NEMA 3R', context: ['Outdoor'], wiringMethod: 'Liquidtight Flexible Metal', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Primary Item', name: 'Fusible Disconnect 60A 3P 3R', code: 'DISC-60-3R', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device',       name: 'Class RK5 Fuse 50A',          code: 'FUSE-RK5-50', qty: 3, baseQty: 3, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Hardware',     name: 'Unistrut Rack Kit',           code: 'UNI-RACK',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'sg-512', name: 'Dry-Type Transformer 45kVA', code: 'BPA-SG-512', desc: '45kVA 480-208/120V dry-type transformer with secondary breaker',
    status: 'compatible', subcat: 'Transformers', type: '45kVA 480-208Y', context: ['Indoor'], wiringMethod: 'EMT', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Primary Item', name: 'Transformer 45kVA 480-208Y', code: 'XFMR-45',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Raceway',      name: '2" Liquidtight Flex',        code: 'LFMC-200',   qty: 8, baseQty: 8, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Grounding',    name: '2 AWG Ground CU',            code: 'GND-2-CU',   qty: 25, baseQty: 25, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Hardware',     name: 'Vibration Isolation Pad',    code: 'VIB-PAD',    qty: 4, baseQty: 4, unit: 'EA', required: false, priceStatus: 'ok' },
    ] },

  // ── HVAC ────────────────────────────────────────────────────────────────
  { id: 'hv-610', name: 'RTU Power Connection 30A', code: 'BPA-HV-610', desc: 'Rooftop unit connection — disconnect, whip, 3#10',
    status: 'recommended', subcat: 'Unit Connections', type: 'RTU 30A', context: ['Outdoor'], wiringMethod: 'Liquidtight Flexible Metal', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Primary Item', name: 'Non-Fused Disconnect 30A 3R', code: 'DISC-30-NF-3R', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Raceway',      name: '\xbe" Liquidtight Flex',       code: 'LFMC-075',      qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',       name: '10 THHN CU Stranded',         code: 'THHN-10-STR',   qty: 22, baseQty: 22, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Raceway',      name: '\xbe" Liquidtight Connector',  code: 'LFMC-CON-075',  qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Hardware',     name: 'Rooftop Pipe Support Block',  code: 'RTS-BLK',       qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'hv-611', name: 'Thermostat Control Wiring', code: 'BPA-HV-611', desc: '18/8 thermostat cable from RTU to space, with plenum rating',
    status: 'compatible', subcat: 'Controls', type: 'Thermostat', context: ['Concealed'], wiringMethod: 'Measure Separately', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Wiring',      name: 'Thermostat Cable 18/8 Plenum', code: 'TSTAT-188', qty: 75, baseQty: 75, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'Low-Voltage Mud Ring 1-Gang',  code: 'LV-MR-1G',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },

  // ── Controls ────────────────────────────────────────────────────────────
  { id: 'ct-710', name: '0–10V Dimming Zone', code: 'BPA-CT-710', desc: '0–10V dimming control run with wall dimmer, one zone',
    status: 'recommended', subcat: 'Dimming', type: '0–10V Zone', context: ['ACT Ceiling'], wiringMethod: 'Measure Separately', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Controls',    name: '0-10V Wall Dimmer',        code: 'DIM-010V',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Controls',    name: '0-10V Control Wire 2C',    code: 'CW-010V',    qty: 120, baseQty: 120, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box', code: 'MB-1G-NW',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Box & Cover', name: 'Standard Cover Plate 1-Gang', code: 'CP-STD-1G', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'ct-711', name: 'Lighting Relay Panel 8-Zone', code: 'BPA-CT-711', desc: '8-relay lighting control panel with time clock and photocell input',
    status: 'compatible', subcat: 'Relay Panels', type: '8-Zone', context: ['Indoor'], wiringMethod: 'EMT', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Primary Item', name: 'Relay Panel 8-Zone',     code: 'RP-8Z',      qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Controls',     name: 'Astronomical Time Clock', code: 'TC-ASTRO',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Controls',     name: 'Photocell Button 120V',   code: 'PC-BTN-120', qty: 1, baseQty: 1, unit: 'EA', required: false, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',       name: '12 THHN CU Stranded',     code: 'THHN-12-STR', qty: 60, baseQty: 60, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'ct-712', name: 'Ceiling Occupancy Sensor 360\xb0', code: 'BPA-CT-712', desc: '360\xb0 ceiling occupancy sensor with power pack, ACT grid',
    status: 'compatible', subcat: 'Sensors', type: 'Ceiling 360\xb0', context: ['ACT Ceiling'], wiringMethod: 'MC 12/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Controls', name: 'Ceiling Occupancy Sensor 360', code: 'OCC-360-C', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Controls', name: 'Sensor Power Pack 120/277V',   code: 'OCC-PP',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',   name: 'MC 12/2',                      code: 'MC-122',   qty: 15, baseQty: 15, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },

  // ── Fire Alarm ──────────────────────────────────────────────────────────
  { id: 'fa-810', name: 'Smoke Detector Addressable', code: 'BPA-FA-810', desc: 'Addressable photoelectric smoke detector on ACT grid with base',
    status: 'recommended', subcat: 'Initiating Devices', type: 'Photoelectric', context: ['ACT Ceiling'], wiringMethod: 'Measure Separately', source: 'company', isFavorite: true,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Smoke Detector Ceiling Mount', code: 'FA-SMOKE',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device',      name: 'Detector Base Addressable',    code: 'FA-BASE-A',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: '4" Square Box 1-1/2" Deep',    code: 'BOX-4SQ-150', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',      name: 'FPLR Fire Alarm Cable 18/2',   code: 'FA-CBL-182', qty: 45, baseQty: 45, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fa-811', name: 'Horn/Strobe Wall Mount', code: 'BPA-FA-811', desc: 'Wall-mount horn/strobe 15-110cd with backbox, red',
    status: 'compatible', subcat: 'Notification', type: 'Horn/Strobe', context: ['Metal Framing'], wiringMethod: 'Measure Separately', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Horn/Strobe 15-110cd Red', code: 'FA-HS-110', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'Notification Backbox',     code: 'FA-BB',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',      name: 'FPLR Fire Alarm Cable 18/2', code: 'FA-CBL-182', qty: 40, baseQty: 40, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fa-812', name: 'Duct Detector with Sampling Tube', code: 'BPA-FA-812', desc: 'Duct smoke detector, sampling tube and remote test station',
    status: 'compatible', subcat: 'Initiating Devices', type: 'Duct Detector', context: ['Bar Joist – Open Ceiling'], wiringMethod: 'Measure Separately', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device', name: 'Duct Smoke Detector',       code: 'FA-DUCT',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device', name: 'Sampling Tube 2ft',         code: 'FA-TUBE-2',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Device', name: 'Remote Test Station',       code: 'FA-RTS',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring', name: 'FPLR Fire Alarm Cable 18/2', code: 'FA-CBL-182', qty: 60, baseQty: 60, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },

  // ── Fire Pump ───────────────────────────────────────────────────────────
  { id: 'fp-910', name: 'Fire Pump Controller Feed', code: 'BPA-FP-910', desc: 'Fire pump controller connection in RMC, 3#2 with #6 ground',
    status: 'compatible', subcat: 'Feeders', type: 'RMC Feed', context: ['Indoor'], wiringMethod: 'Rigid Metal Conduit (RMC)', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway',   name: '2" RMC Conduit',    code: 'RMC-200-10', qty: 40, baseQty: 40, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Wiring',    name: '2 AWG XHHW CU',     code: 'XHHW-2-CU',  qty: 130, baseQty: 130, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Grounding', name: '6 AWG Ground CU',   code: 'GND-6-CU',   qty: 45, baseQty: 45, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Raceway',   name: '2" Rigid Coupling', code: 'RMC-CPL-200', qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },

  // ── Residential ─────────────────────────────────────────────────────────
  { id: 'rs-1010', name: 'Bedroom Receptacle Circuit', code: 'BPA-RS-1010', desc: '15A bedroom circuit — six receptacles, NM-B cable, wood framing',
    status: 'recommended', subcat: 'Devices', type: 'Receptacle Circuit', context: ['Wood Framing'], wiringMethod: 'NM-B 14/2', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Duplex Receptacle 15A Resi', code: 'DUP-15-RES', qty: 6, baseQty: 6, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Plastic Box', code: 'PB-1G-NW',  qty: 6, baseQty: 6, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Box & Cover', name: 'Standard Cover Plate 1-Gang', code: 'CP-STD-1G', qty: 6, baseQty: 6, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring',      name: 'NM-B 14/2 with Ground',       code: 'NMB-142',   qty: 140, baseQty: 140, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b5', group: 'Hardware',    name: 'Cable Staple 1/2"',           code: 'STAPLE-50', qty: 30, baseQty: 30, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'rs-1011', name: 'Kitchen GFCI Small Appliance', code: 'BPA-RS-1011', desc: 'Two 20A small-appliance branch circuits with GFCI protection',
    status: 'compatible', subcat: 'Devices', type: 'GFCI Circuit', context: ['Wood Framing'], wiringMethod: 'NM-B 12/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'GFCI Receptacle 20A',        code: 'GFCI-20A',  qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Plastic Box', code: 'PB-1G-NW', qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',      name: 'NM-B 12/2 with Ground',      code: 'NMB-122',   qty: 160, baseQty: 160, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'rs-1012', name: '200A Residential Load Center', code: 'BPA-RS-1012', desc: '200A main breaker load center, 40 circuit, with breakers',
    status: 'compatible', subcat: 'Panels', type: '200A Main Breaker', context: ['Wood Framing'], wiringMethod: 'Measure Separately', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Primary Item', name: 'Load Center 200A 40-Ckt MB', code: 'LC-200-40',      qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device',       name: 'Circuit Breaker 1-Pole 20A', code: 'PNL-BKR-120-20', qty: 20, baseQty: 20, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Device',       name: 'Circuit Breaker 2-Pole 30A', code: 'PNL-BKR-230-30', qty: 3, baseQty: 3, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Grounding',    name: 'Ground Rod 5/8" \xd7 8ft',    code: 'GRD-ROD-8',     qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },

  // ── Low-Voltage Systems ─────────────────────────────────────────────────
  { id: 'lv-1110', name: 'CAT6 Horizontal Drop', code: 'BPA-LV-1110', desc: 'Single CAT6 drop from IDF to workstation outlet, tested',
    status: 'recommended', subcat: 'Data', type: 'CAT6 Drop', context: ['Metal Framing'], wiringMethod: 'Measure Separately', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Wiring',      name: 'CAT6 Plenum Cable',    code: 'CAT6-PLEN', qty: 110, baseQty: 110, unit: 'LF', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device',      name: 'CAT6 Keystone Jack',   code: 'CAT6-KJ',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Device',      name: 'Patch Panel Port CAT6', code: 'CAT6-PP',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Box & Cover', name: 'Low-Voltage Mud Ring 1-Gang', code: 'LV-MR-1G', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'lv-1111', name: 'Card Reader Door Position', code: 'BPA-LV-1111', desc: 'Access control door — reader, strike, position switch, composite cable',
    status: 'needs-review', subcat: 'Security', type: 'Access Door', context: ['Metal Framing'], wiringMethod: 'Measure Separately', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device', name: 'Proximity Card Reader',       code: 'ACC-RDR',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device', name: 'Electric Door Strike 12VDC',  code: 'ACC-STRK',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'missing' },
      { id: 'b3', group: 'Device', name: 'Door Position Switch',        code: 'ACC-DPS',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b4', group: 'Wiring', name: 'Access Composite Cable',      code: 'ACC-COMP',  qty: 95, baseQty: 95, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'lv-1112', name: 'Ceiling Speaker Zone', code: 'BPA-LV-1112', desc: '70V ceiling speaker on a paging zone, ACT grid, with backcan',
    status: 'compatible', subcat: 'AV', type: 'Ceiling Speaker', context: ['ACT Ceiling'], wiringMethod: 'Measure Separately', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device', name: 'Ceiling Speaker 8" 70V', code: 'AV-SPK-8',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Device', name: 'Speaker Backcan',        code: 'AV-BACKCAN', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring', name: 'Speaker Cable 16/2 Plenum', code: 'AV-CBL-162', qty: 70, baseQty: 70, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
];

export const STATUS_CFG: Record<AssemblyStatus, { label: string; color: string; bg: string; symbol: string }> = {
  'recommended':      { label: 'Recommended',  color: '#16A34A', bg: '#F0FDF4', symbol: '★' },
  'compatible':       { label: 'Compatible',   color: '#1D4ED8', bg: '#EFF6FF', symbol: '✓' },
  'project-standard': { label: 'Project Std',  color: '#7C3AED', bg: '#F5F3FF', symbol: '◆' },
  'recently-used':    { label: 'Recent',        color: '#6B7280', bg: '#F9FAFB', symbol: '↩' },
  'custom':           { label: 'Custom',        color: '#D97706', bg: '#FFFBEB', symbol: '⚙' },
  'needs-review':     { label: 'Needs Review',  color: '#D97706', bg: '#FFFBEB', symbol: '⚠' },
  'missing-price':    { label: 'Missing Price', color: '#DC2626', bg: '#FEF2F2', symbol: '!' },
  'incompatible':     { label: 'Incompatible',  color: '#9CA3AF', bg: '#F9FAFB', symbol: '✗' },
};

export const LIB_TYPE_CFG: Record<LibraryType, { label: string; color: string; bg: string }> = {
  system:   { label: 'System',   color: '#6B7280', bg: '#F3F4F6' },
  company:  { label: 'Company',  color: '#1D4ED8', bg: '#EFF6FF' },
  job:      { label: 'Job',      color: '#16A34A', bg: '#F0FDF4' },
  customer: { label: 'Customer', color: '#7C3AED', bg: '#F5F3FF' },
};

export const UNIT_OPTIONS = ['EA', 'LF', 'LB', 'HR', 'SF', 'CY', 'NOTE', 'SET'];

/**
 * Additional assemblies so each populated branch of the cascade has real leaves.
 * Kenneth's library import will replace these with the production catalogue.
 */
export const EXTRA_ASSEMBLIES: Assembly[] = [
  // Fixtures
  { id: 'fx-205', name: 'LED Troffer 2\xd74 Surface', code: 'BPA-FX-205', desc: 'LED Troffer 2\xd74 40W surface mounted to hard ceiling, MC 12/2',
    status: 'compatible', subcat: 'Troffers', type: 'Surface Mount', context: ['Hard Ceiling – Metal Framing', 'Hard Ceiling – Wood Framing'], wiringMethod: 'MC 12/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture',  name: 'LED Troffer 2\xd74 40W 5000K', code: 'LT-240-40W', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting', name: 'Surface Mount Bracket',      code: 'SMB-GEN',    qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',   name: 'MC 12/2',                    code: 'MC-122',     qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fx-206', name: 'LED Downlight 6" Round', code: 'BPA-FX-206', desc: 'Recessed downlight 6" LED 18W, drywall ceiling, MC 12/2',
    status: 'compatible', subcat: 'Downlights', type: '6" Round', context: ['Hard Ceiling – Metal Framing'], wiringMethod: 'MC 12/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture',  name: 'LED Recessed Can 6" 18W', code: 'RC-6IN-18W', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting', name: 'New-Work Mounting Bracket', code: 'MB-NW-6IN', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',   name: 'MC 12/2',                   code: 'MC-122',    qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fx-207', name: 'LED Exit Sign — Universal', code: 'BPA-FX-207', desc: 'LED exit sign, universal mount, no battery — central inverter fed',
    status: 'compatible', subcat: 'Emergency & Exit', type: 'Exit Sign Only', context: ['ACT Ceiling', 'Hard Ceiling – Metal Framing'], wiringMethod: 'MC 12/2', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture', name: 'LED Exit Sign Universal', code: 'EXIT-LED-U', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Wiring',  name: 'MC 12/2',                 code: 'MC-122',     qty: 8, baseQty: 8, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fx-208', name: 'Linear High Bay 150W', code: 'BPA-FX-208', desc: 'Linear LED high bay 150W on aircraft cable, open bar joist ceiling',
    status: 'compatible', subcat: 'High Bay', type: 'Linear High Bay', context: ['Bar Joist – Open Ceiling'], wiringMethod: 'MC-PCS 12/3', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Fixture',  name: 'LED Linear High Bay 150W', code: 'HB-LIN-150', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting', name: 'Beam Clamp 3/8"',          code: 'BC-375',     qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',   name: 'MC-PCS 12/3',              code: 'MC-PCS-123', qty: 12, baseQty: 12, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  // Devices
  { id: 'dv-104', name: 'Quad Receptacle 20A', code: 'BPA-DV-104', desc: 'Two duplex receptacles in a 2-gang box, 20A commercial, MC 12/2',
    status: 'compatible', subcat: 'Receptacles', type: 'Quad 20A', context: ['Metal Framing'], wiringMethod: 'MC 12/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Duplex Receptacle 20A Commercial', code: 'DR-20A-COM', qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 2-Gang Metal Box',        code: 'MB-2G-NW',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',      name: 'MC 12/2',                          code: 'MC-122',     qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'dv-105', name: 'Single-Pole Switch 20A', code: 'BPA-DV-105', desc: 'Single-pole switch 20A commercial grade, metal framing, MC 12/2',
    status: 'recommended', subcat: 'Switches', type: 'Single Pole', context: ['Metal Framing'], wiringMethod: 'MC 12/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Single-Pole Switch 20A',    code: 'SW-1P-20A', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box', code: 'MB-1G-NW',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',      name: 'MC 12/2',                   code: 'MC-122',    qty: 6, baseQty: 6, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'dv-106', name: 'CAT6 Data Outlet — Single', code: 'BPA-DV-106', desc: 'Single CAT6 keystone jack in 1-gang box with plaster ring, CAT6 home run',
    status: 'recommended', subcat: 'Data Outlets', type: 'CAT6 Single', context: ['Metal Framing'], wiringMethod: 'CAT6', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'CAT6 Keystone Jack',        code: 'CAT6-JACK', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box', code: 'MB-1G-NW',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',      name: 'CAT6 Cable',                code: 'CAT6-CBL',  qty: 60, baseQty: 60, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'dv-107', name: 'Ceiling Occupancy Sensor', code: 'BPA-DV-107', desc: 'Ceiling-mount dual-technology occupancy sensor with power pack',
    status: 'compatible', subcat: 'Occupancy Sensors', type: 'Ceiling Mount', context: ['ACT Ceiling'], wiringMethod: 'MC 12/2', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',   name: 'Occupancy Sensor Dual-Tech', code: 'OS-DT-CM',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Controls', name: 'Sensor Power Pack',          code: 'OS-PP-20A', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',   name: 'MC 12/2',                    code: 'MC-122',    qty: 10, baseQty: 10, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  // Raceway / Cable
  { id: 'rc-302', name: 'EMT \xbd" D/C Strap Run', code: 'BPA-RC-302', desc: 'EMT \xbd" exposed on double-clamp straps with couplings and connectors',
    status: 'compatible', subcat: 'EMT', type: 'D/C Strap', context: ['Exposed'], wiringMethod: 'EMT', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway',  name: '1/2" EMT Conduit 10 ft', code: 'EMT-050-10',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Hardware', name: '3/4" One-Hole Strap',    code: 'STRAP-075',   qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Raceway',  name: '1/2" EMT Coupling',      code: 'EMT-CPL-050', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'rc-303', name: 'EMT \xbe" Beam Clamp Run', code: 'BPA-RC-303', desc: 'EMT \xbe" suspended from structure on beam clamps, open ceiling',
    status: 'compatible', subcat: 'EMT', type: 'Beam Clamp', context: ['Exposed'], wiringMethod: 'EMT', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway',  name: '3/4" EMT Conduit 10 ft', code: 'EMT-075-10', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Mounting', name: 'Beam Clamp 3/8"',        code: 'BC-375',     qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  { id: 'rc-304', name: 'Wiremold 500 Surface Run', code: 'BPA-RC-304', desc: 'Wiremold 500 surface raceway with fittings, exposed on finished wall',
    status: 'compatible', subcat: 'Surface Raceway', type: 'Wiremold 500', context: ['Exposed'], wiringMethod: 'Surface Raceway', source: 'company', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway', name: 'Wiremold 500 Raceway 10 ft', code: 'WM-500-10', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ] },
  // Fire Alarm
  { id: 'fa-801', name: 'Fire Alarm Pull Station', code: 'BPA-FA-801', desc: 'Manual pull station, surface box, FPLR 18/2 to loop',
    status: 'recommended', subcat: 'Initiating Devices', type: 'Pull Station', context: ['Metal Framing', 'Surface Mount'], wiringMethod: 'FPLR 18/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Manual Pull Station',       code: 'FA-PULL',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box', code: 'MB-1G-NW',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',      name: 'FPLR Fire Alarm Cable 18/2', code: 'FA-CBL-182', qty: 40, baseQty: 40, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fa-802', name: 'Smoke Detector — Ceiling', code: 'BPA-FA-802', desc: 'Addressable ceiling smoke detector with base, FPLR 18/2 to loop',
    status: 'recommended', subcat: 'Initiating Devices', type: 'Smoke Detector', context: ['ACT Ceiling'], wiringMethod: 'FPLR 18/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device', name: 'Smoke Detector Ceiling Mount',  code: 'FA-SMOKE',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Wiring', name: 'FPLR Fire Alarm Cable 18/2',    code: 'FA-CBL-182', qty: 35, baseQty: 35, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  { id: 'fa-803', name: 'Horn/Strobe — Wall', code: 'BPA-FA-803', desc: 'Wall-mount horn/strobe notification appliance, FPLR 18/2',
    status: 'compatible', subcat: 'Notification', type: 'Horn/Strobe', context: ['Metal Framing'], wiringMethod: 'FPLR 18/2', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Device',      name: 'Horn/Strobe Wall Mount',     code: 'FA-HS-W',    qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Box & Cover', name: 'New Work 1-Gang Metal Box',  code: 'MB-1G-NW',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b3', group: 'Wiring',      name: 'FPLR Fire Alarm Cable 18/2', code: 'FA-CBL-182', qty: 30, baseQty: 30, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
  // Feeders
  { id: 'fd-402', name: '200A Feeder — EMT/THHN', code: 'BPA-FD-402', desc: '200A feeder 3#3/0 + #4G in 2" EMT, indoor',
    status: 'compatible', subcat: 'Indoor', type: 'EMT with THHN', context: ['Indoor'], wiringMethod: 'EMT', source: 'system', isFavorite: false,
    bom: [
      { id: 'b1', group: 'Raceway', name: '2" EMT Conduit 10 ft', code: 'EMT-200-10',  qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'b2', group: 'Wiring',  name: '3/0 THHN CU Stranded', code: 'THHN-30-STR', qty: 30, baseQty: 30, unit: 'LF', required: true, priceStatus: 'ok' },
    ] },
];

/** Every assembly across every category, keyed lookup for the cascade. */
export const ALL_ASSEMBLIES: Assembly[] = [
  ...FIXTURE_ASSEMBLIES, ...DEVICE_ASSEMBLIES, ...GENERIC_ASSEMBLIES, ...EXTRA_ASSEMBLIES,
  ...CATALOGUE_ASSEMBLIES,
];

/** Which category a given assembly belongs to, derived from its code. */
export function categoryOf(a: Assembly): CategoryCode {
  /*
   * Every category has a code segment now. It used to stop after five, and the
   * fallback silently filed a switchgear or fire-pump assembly under Fixtures —
   * which looks like data loss and is worse, because the row is *somewhere*.
   * A code segment added here also has to exist in `ASSEMBLY_CODE_SEGMENT`.
   */
  for (const [seg, code] of Object.entries(ASSEMBLY_CODE_SEGMENT)) {
    if (a.code.includes(`-${seg}-`)) return code;
  }
  // Saved from Build Mode: BPA-03-101 carries the category number directly.
  const numbered = a.code.match(/BPA-(\d{2})-/);
  if (numbered) {
    const guess = `BPC-${numbered[1]}` as CategoryCode;
    if (CATEGORIES.some((c) => c.code === guess)) return guess;
  }
  return 'BPC-01';
}

/** Assembly-code segment → category. The one place the mapping is written down. */
export const ASSEMBLY_CODE_SEGMENT: Record<string, CategoryCode> = {
  FX: 'BPC-01',
  DV: 'BPC-02',
  RC: 'BPC-03',
  FD: 'BPC-04',
  SG: 'BPC-05',
  HV: 'BPC-06',
  CT: 'BPC-07',
  FA: 'BPC-08',
  FP: 'BPC-09',
  RS: 'BPC-10',
  LV: 'BPC-11',
};

// ─── Parametric assembly engine ───────────────────────────────────────────────

/**
 * Configuration behind a parametric assembly. Each field swaps real components,
 * which is what makes one definition cover a whole family of McCormick rows.
 */
export interface FixtureConfig {
  kind: 'fixture';
  app: string;       // installation context — also the browse filter
  type: string;
  mount: string;
  /**
   * Drop below the structure, in feet. Only meaningful on a suspended or
   * pendant mount; ignored by the others, which is why it is optional rather
   * than a field every fixture has to answer.
   */
  drop?: string;
  wiring: string;
  run: string;       // LF
  waste: string;     // %
  dimming: string;
  emergency: string;
}

/** Mounts where a drop length is a real question rather than noise. */
export function mountHasDrop(mount: string): boolean {
  return /Suspension|Pendant|Cable/i.test(mount);
}

export interface DeviceConfig {
  kind: 'device';
  app: string;
  type: string;
  grade: string;
  wiring: string;
  run: string;
  box: string;
  cover: string;
}

/**
 * A conduit or cable run.
 *
 * Answered as one workflow rather than assembled by hunting a parts list: the
 * estimator says what raceway, what size, how many conductors of what, how it
 * is attached and how long the run is — and the fittings, couplings and
 * supports that necessarily follow are derived rather than searched for.
 */
export interface RacewayConfig {
  kind: 'raceway';
  app: string;
  /** Raceway / conduit type — EMT, rigid, PVC, flexible, surface raceway. */
  raceway: string;
  /** Trade size. */
  size: string;
  /** How many current-carrying conductors are pulled in. */
  conductors: string;
  /** Conductor type and gauge. */
  conductor: string;
  /** Structure / attachment type. */
  support: string;
  run: string;       // LF
  waste: string;     // %
}

export type AssemblyConfig = FixtureConfig | DeviceConfig | RacewayConfig;

export const FIXTURE_TYPES  = ['LED Troffer 2\xd74', 'LED Troffer 2\xd72', 'LED Emergency Troffer', 'Recessed Downlight', 'Linear Pendant', 'Surface-Mounted Fixture'];
export const FIXTURE_MOUNTS = ['T-Bar Drop-In', 'Surface Mount to Joist Framing', 'Suspension Cable and Beam Clamp', 'Concrete Anchor Mount'];
export const FIXTURE_WIRING = ['MC-PCS 12/3', 'MC 12/2', 'AC 12/2', 'EMT with THHN', 'Measure Separately'];
export const DIMMING_OPTIONS   = ['None', '0\u201310V dimming', 'DALI control'];
export const EMERGENCY_OPTIONS = ['None', 'Constant hot leg', 'Emergency battery pack'];

export const DEVICE_TYPES  = ['Duplex Receptacle 20A', 'GFCI Receptacle 20A', 'Hospital-Grade Receptacle 20A', 'Single Receptacle', 'USB Receptacle', 'Switch', 'Occupancy Sensor'];
export const DEVICE_GRADES = ['Commercial', 'Hospital Grade', 'Residential', 'Weather Resistant'];
export const DEVICE_WIRING = ['MC 12/2', 'HCF MC 12/2', 'EMT with THHN', 'Measure Separately'];
export const DEVICE_BOXES  = ['New Work 1-Gang Metal Box', 'New Work 1-Gang Plastic Box', 'FS Box', '4-inch Square Box with Plaster Ring'];
export const DEVICE_COVERS = ['Standard Cover', 'Stainless-Steel Cover', 'Weatherproof In-Use Cover'];

export const RACEWAY_TYPES = [
  'EMT',
  'IMC',
  'Rigid Metal Conduit (RMC)',
  'PVC Schedule 40',
  'Flexible Metal Conduit',
  'Liquidtight Flexible Metal',
  'Surface Raceway',
  'MC Cable — no raceway',
];
export const RACEWAY_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'];
export const CONDUCTOR_COUNTS = ['2', '3', '4', '5', '6'];
export const CONDUCTOR_TYPES = [
  'THHN 14 AWG', 'THHN 12 AWG', 'THHN 10 AWG', 'THHN 8 AWG', 'THHN 6 AWG', 'XHHW 4 AWG',
];
export const RACEWAY_SUPPORTS = [
  'One-Hole Strap',
  'Two-Hole Strap',
  'Conduit Hanger (Minerallac)',
  'Strut and Strap',
  'Beam Clamp',
  'Concrete Anchor',
  'Wood Screw',
];

// ─── Measurement type ─────────────────────────────────────────────────────────

/**
 * How an assembly is quantified on the plan: clicked one at a time, or measured
 * along a path.
 */
export type MeasureType = 'count' | 'linear';

/**
 * The measurement type an assembly implies.
 *
 * A fixture and a receptacle are counted; conduit, cable tray and an LED strip
 * are measured. Derived from the category, then refined by the name, because the
 * category is right about most of its members and wrong about a few — a lighting
 * category holds both troffers (count) and linear strip (measured), and the only
 * thing that distinguishes them is what the assembly is.
 *
 * A default, never a lock: the estimator overrides it in the header, and a run of
 * fixtures on a continuous row genuinely is a linear measure.
 */
export function defaultMeasureType(code: CategoryCode, name = ''): MeasureType {
  const n = name.toLowerCase();
  // Named exceptions first — these beat whatever their category usually is.
  if (/strip|tape light|cove|linear run|handrail/.test(n)) return 'linear';
  if (/\bwhip\b|pigtail/.test(n)) return 'count';

  switch (code) {
    case 'BPC-03':            // Raceway / Cable
    case 'BPC-04':            // Feeders
      return 'linear';
    default:
      return 'count';
  }
}

export const MEASURE_LABEL: Record<MeasureType, string> = {
  count: 'Count',
  linear: 'Linear',
};

/** The unit a measurement type is quantified in. */
export const MEASURE_UNIT: Record<MeasureType, string> = {
  count: 'EA',
  linear: 'LF',
};

// ─── Feeder sizing ────────────────────────────────────────────────────────────

/**
 * Feeder ampacities an estimator picks from — Feeders (BPC-04) only.
 *
 * A rating, not a calculation. This narrows which wiring methods are offered and
 * names the assembly; it deliberately does **not** derive a conductor size or a
 * conduit trade size from the amps. Which conductor an ampacity requires depends
 * on termination temperature, ambient correction, conduit fill and derating — it
 * is a code calculation, and inventing one here would be a wrong answer wearing
 * the costume of a right one. Same rule the raceway builder follows for fill.
 */
export const FEEDER_AMPS = ['60A', '100A', '125A', '200A', '400A', '600A', '800A', '1200A'];

export const feederAmpsValue = (amps: string) => parseInt(amps, 10) || 0;

/**
 * Whether a wiring method is a feeder method at this ampacity.
 *
 * Matched on the **conductor size in the label**, because that is what the option
 * actually says: the wiring list is branch-circuit cable (`MC 12/2`, `AC 12/2`,
 * `NM-B`) alongside raceway-and-conductor methods (`EMT with THHN`). A 12 or 14
 * AWG cable assembly is a 15–20 A branch circuit — it is not a 60 A feeder, let
 * alone an 800 A one, so it is removed at every feeder rating rather than at some
 * threshold.
 *
 * Not an ampacity calculation, and deliberately not a substitute for one: which
 * conductor a rating requires still depends on temperature, correction and
 * derating, and the estimator sizes it. This only stops the list offering methods
 * that could never be the answer.
 */
export function feederMethodAllowed(label: string, amps: string): boolean {
  if (!feederAmpsValue(amps)) return true;
  // Branch-circuit conductor sizes named in the option itself.
  if (/\b1[024]\/[23]\b|\b1[024] AWG\b|Romex|NM-B/i.test(label)) return false;
  return true;
}

/** The termination fitting a raceway type takes at each end. */
export function racewayConnector(raceway: string): { name: string; code: string } | null {
  if (/^EMT/.test(raceway)) return { name: 'EMT Connector D/S', code: 'EMT-CON-050' };
  if (/RMC|IMC|Rigid/i.test(raceway)) return { name: 'Rigid Conduit Connector', code: 'RMCC-50' };
  if (/PVC/i.test(raceway)) return { name: 'PVC Terminal Adapter', code: 'PVC-TA-050' };
  if (/Flexible|Liquidtight/i.test(raceway)) return { name: 'Flex Connector', code: 'FLEX-CON-050' };
  if (/MC Cable/i.test(raceway)) return { name: 'MC Connector \xbd"', code: 'MCC-50' };
  return null;
}

/** The coupling a raceway type takes between lengths. Surface raceway uses none. */
export function racewayCoupling(raceway: string): { name: string; code: string } | null {
  if (/^EMT/.test(raceway)) return { name: 'EMT Coupling', code: 'EMT-CPL-050' };
  if (/RMC|IMC|Rigid/i.test(raceway)) return { name: 'Rigid Coupling', code: 'RMC-CPL-050' };
  if (/PVC/i.test(raceway)) return { name: 'PVC Coupling', code: 'PVC-CPL-050' };
  return null;
}

/** The fastener a support method needs to reach the structure. */
export function supportAnchor(support: string): { name: string; code: string } | null {
  if (/Concrete Anchor/i.test(support)) return { name: 'Concrete Anchor 1/4"', code: 'CA-25' };
  if (/Beam Clamp/i.test(support)) return { name: 'Beam Clamp 3/8"', code: 'BC-375' };
  if (/Wood Screw/i.test(support)) return { name: 'Wood Screw #10', code: 'WS-10' };
  if (/Strut/i.test(support)) return { name: 'Strut Channel 1-5/8"', code: 'STRUT-158' };
  return null;
}

/**
 * The termination fitting a wiring method actually takes.
 *
 * This used to be a fixed MC connector on every fixture, which is wrong the
 * moment the run is EMT or rigid — and in a Class I location an ordinary MC
 * connector is exactly the part that must not appear. MC and AC keep the
 * connector they always had, so existing assemblies are unchanged.
 */
export function connectorFor(wiring: string): { name: string; code: string } {
  if (/rigid|\bRMC\b|\bGRC\b/i.test(wiring)) return { name: 'Rigid Conduit Connector \xbd"', code: 'RMCC-50' };
  if (/\bEMT\b/i.test(wiring)) return { name: 'EMT Connector \xbd"', code: 'EMTC-50' };
  return { name: 'MC Connector \xbd"', code: 'MCC-50' };
}

/**
 * Which configuration form a category takes.
 *
 * The parametric engine models two families in depth — fixtures and devices —
 * because those are the two the client specified and the two whose component
 * lists genuinely follow from a handful of answers. Every other category is
 * assembled from parts the estimator picks, which is why they map to
 * `generic`: the guided steps still apply, but there is no parametric core to
 * derive. This is a statement about coverage, not a second engine.
 */
export type BuildKind = 'fixture' | 'device' | 'raceway' | 'generic';

export function kindForCategory(code: CategoryCode): BuildKind {
  if (code === 'BPC-01') return 'fixture';
  if (code === 'BPC-02') return 'device';
  // Raceway / cable runs answer a different set of questions entirely.
  if (code === 'BPC-03') return 'raceway';
  // Residential is device-shaped: receptacles, switches, boxes and covers.
  if (code === 'BPC-10') return 'device';
  return 'generic';
}

export function wasteAdjustedLF(run: string, waste: string): number {
  const runLF = parseFloat(run) || 0;
  const pct = (parseFloat(waste) || 0) / 100;
  return +(runLF * (1 + pct)).toFixed(1);
}

/**
 * Derives the component list for a configuration. Single source of truth for
 * both the guided Builder and the unified Workbench, so the two never drift.
 */
export function deriveBom(cfg: AssemblyConfig): BOMItem[] {
  /*
   * Raceway runs.
   *
   * Quantities are simple, stated arithmetic — a coupling every ten feet, a
   * support every ten feet, a connector at each end, conductors at count ×
   * length. Every row carries its own `calc` string so the estimator can read
   * the rule rather than trust it.
   *
   * Deliberately NO conduit fill: how many conductors of what size fit in what
   * trade size is a code calculation, and inventing one here would be a wrong
   * answer wearing the costume of a right one. The count is the estimator's.
   */
  if (cfg.kind === 'raceway') {
    const calcLF = wasteAdjustedLF(cfg.run, cfg.waste);
    const runLF = parseFloat(cfg.run) || 0;
    const conductors = parseInt(cfg.conductors, 10) || 0;
    /** One every 10 ft, and never fewer than one on a run that exists. */
    const per10 = runLF > 0 ? Math.max(1, Math.ceil(runLF / 10)) : 0;
    const conn = racewayConnector(cfg.raceway);
    const cpl = racewayCoupling(cfg.raceway);
    const anchor = supportAnchor(cfg.support);
    const isCable = /MC Cable/i.test(cfg.raceway);

    const rows: BOMItem[] = [
      {
        id: 'g1', group: 'Raceway',
        name: `${cfg.size} ${cfg.raceway}`, code: 'RWY-CFG',
        qty: calcLF, baseQty: calcLF, unit: 'LF',
        calc: `${cfg.run} LF + ${cfg.waste}% waste = ${calcLF} LF`,
        required: true, priceStatus: 'ok',
      },
    ];

    if (conductors > 0) {
      const wireLF = +(calcLF * conductors).toFixed(1);
      rows.push({
        id: 'g2', group: 'Wiring',
        name: cfg.conductor, code: 'COND-CFG',
        qty: wireLF, baseQty: wireLF, unit: 'LF',
        calc: `${conductors} conductors \xd7 ${calcLF} LF = ${wireLF} LF`,
        required: true, priceStatus: 'ok',
      });
    }

    if (cpl && per10 > 0) {
      rows.push({
        id: 'g3', group: 'Raceway',
        name: `${cfg.size} ${cpl.name}`, code: cpl.code,
        qty: per10, baseQty: per10, unit: 'EA',
        calc: `1 per 10 LF of ${runLF} LF = ${per10}`,
        required: true, priceStatus: 'ok',
      });
    }

    if (conn) {
      rows.push({
        id: 'g4', group: 'Raceway',
        name: `${cfg.size} ${conn.name}`, code: conn.code,
        qty: 2, baseQty: 2, unit: 'EA',
        calc: 'One at each end of the run',
        required: true, priceStatus: 'ok',
      });
    }

    if (per10 > 0 && !isCable) {
      rows.push({
        id: 'g5', group: 'Mounting',
        name: `${cfg.size} ${cfg.support}`, code: 'SUP-CFG',
        qty: per10, baseQty: per10, unit: 'EA',
        calc: `1 per 10 LF of ${runLF} LF = ${per10}`,
        required: true, priceStatus: 'ok',
      });
      if (anchor) {
        rows.push({
          id: 'g6', group: 'Hardware',
          name: anchor.name, code: anchor.code,
          qty: per10, baseQty: per10, unit: 'EA',
          calc: `One per support (${per10})`,
          required: true, priceStatus: 'ok',
        });
      }
    }

    return rows;
  }

  if (cfg.kind === 'fixture') {
    const calcLF = wasteAdjustedLF(cfg.run, cfg.waste);
    return [
      { id: 'g1', group: 'Fixture',   name: cfg.type, code: 'BPA-FX-CFG', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      ...(cfg.mount === 'T-Bar Drop-In'
        ? [{ id: 'g2', group: 'Mounting', name: 'T-Bar Mounting Clip Set', code: 'MTC-TBAR-01', qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' as const }]
        : [{ id: 'g2', group: 'Mounting', name: 'Surface Mount Bracket',   code: 'SMB-GEN',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' as const }]),
      !(cfg.wiring === 'Measure Separately' || cfg.wiring === 'No Wire')
        ? { id: 'g3', group: 'Wiring', name: cfg.wiring, code: 'WIRE-CFG', qty: calcLF, baseQty: calcLF, unit: 'LF', calc: `${cfg.run} LF + ${cfg.waste}% waste = ${calcLF} LF`, required: true, priceStatus: 'ok' as const }
        : {
          id: 'g3', group: 'Wiring',
          name: cfg.wiring === 'No Wire' ? 'No wire in this assembly' : 'Wire measured separately',
          code: cfg.wiring === 'No Wire' ? 'NOTE-NOWIRE' : 'NOTE-SEP',
          qty: 1, unit: 'NOTE', required: false, priceStatus: 'ok' as const,
        },
      { id: 'g4', group: 'Wiring',    name: connectorFor(cfg.wiring).name, code: connectorFor(cfg.wiring).code, qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'g5', group: 'Wiring',    name: 'Wire Connector',     code: 'WC-MARR', qty: 3, baseQty: 3, unit: 'EA', required: true, priceStatus: 'ok' },
      ...(cfg.dimming === '0\u201310V dimming' ? [{ id: 'g6', group: 'Controls',  name: '0-10V Control Wire 2C', code: 'CW-010V', qty: calcLF, baseQty: calcLF, unit: 'LF', required: true, priceStatus: 'ok' as const }] : []),
      ...(cfg.dimming === 'DALI control'   ? [{ id: 'g6', group: 'Controls',  name: 'DALI Control Cable',    code: 'CW-DALI', qty: calcLF, baseQty: calcLF, unit: 'LF', required: true, priceStatus: 'ok' as const }] : []),
      ...(cfg.emergency === 'Emergency battery pack' ? [{ id: 'g7', group: 'Emergency', name: 'Emergency Battery Pack', code: 'EBP-GEN', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' as const }] : []),
      /*
       * A suspended fixture needs cable for the drop, at both hanging points.
       * Derived from the drop length rather than asked for separately, so the
       * quantity cannot disagree with the mounting the estimator chose.
       */
      ...(mountHasDrop(cfg.mount) && (parseFloat(cfg.drop ?? '0') || 0) > 0
        ? [{
          id: 'g9', group: 'Mounting', name: 'Aircraft Cable Kit \u2014 fixture drop', code: 'ACK-DROP',
          qty: +((parseFloat(cfg.drop ?? '0') || 0) * 2).toFixed(1),
          baseQty: +((parseFloat(cfg.drop ?? '0') || 0) * 2).toFixed(1),
          unit: 'LF', calc: `${cfg.drop} ft drop \u00d7 2 hanging points`,
          required: true, priceStatus: 'ok' as const,
        }]
        : []),
      { id: 'g8', group: 'Grounding', name: 'Equipment Ground #12', code: 'EGC-12', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ];
  }

  const calcLF = wasteAdjustedLF(cfg.run, '5');
  const isHospital = cfg.grade === 'Hospital Grade';
  return [
    { id: 'g1', group: 'Device',      name: cfg.type + (cfg.grade !== 'Commercial' ? ` (${cfg.grade})` : ''), code: 'DV-CFG', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    { id: 'g2', group: 'Box & Cover', name: cfg.box,   code: 'BOX-CFG',   qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    { id: 'g3', group: 'Box & Cover', name: cfg.cover, code: 'COVER-CFG', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    { id: 'g4', group: 'Wiring',      name: isHospital ? 'HCF MC 12/2' : cfg.wiring, code: isHospital ? 'HCF-MC-122' : 'WIRE-CFG', qty: calcLF, baseQty: calcLF, unit: 'LF', calc: `${cfg.run} LF`, required: true, priceStatus: 'ok' },
    { id: 'g5', group: 'Wiring',      name: connectorFor(isHospital ? 'HCF MC 12/2' : cfg.wiring).name, code: connectorFor(isHospital ? 'HCF MC 12/2' : cfg.wiring).code, qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ...(cfg.app === 'Metal Framing' ? [{ id: 'g6', group: 'Hardware', name: 'Self-Drilling Screw #8', code: 'SDS-8-50', qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' as const }] : []),
    ...(cfg.app === 'Masonry'       ? [{ id: 'g6', group: 'Hardware', name: 'Concrete Anchor \xbc"',  code: 'CA-25',    qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' as const }] : []),
  ];
}

/** Default display name for a configuration. */
export function configName(cfg: AssemblyConfig): string {
  if (cfg.kind === 'raceway') {
    const wire = (parseInt(cfg.conductors, 10) || 0) > 0
      ? ` \u2013 ${cfg.conductors}\xd7${cfg.conductor.replace(/^THHN /, '')}`
      : '';
    return `${cfg.size} ${cfg.raceway}${wire}`;
  }
  return cfg.kind === 'fixture' ? `${cfg.type} \u2013 ${cfg.app}` : `${cfg.type} \u2013 ${cfg.grade}`;
}

/**
 * Reverse-derives a parametric configuration from a saved assembly, so the spec
 * bar can show a real configuration the moment you select one — rather than
 * defaults that contradict the components on screen.
 */
export function configFromAssembly(a: Assembly): AssemblyConfig {
  const has = (code: string) => a.bom.some((i) => i.code === code);
  const wiringRow = a.bom.find((i) => i.group === 'Wiring' && (i.unit === 'LF'));
  const runFromCalc = wiringRow?.calc?.match(/^([\d.]+) LF/)?.[1];
  const wasteFromCalc = wiringRow?.calc?.match(/\+ ([\d.]+)% waste/)?.[1];

  if (categoryOf(a) === 'BPC-02') {
    return {
      kind: 'device',
      app: a.context[0] ?? 'Metal Framing',
      type: DEVICE_TYPES.find((t) => a.name.includes(t.split(' ')[0])) ?? 'Duplex Receptacle 20A',
      grade: has('HGR-20A') ? 'Hospital Grade' : 'Commercial',
      wiring: a.wiringMethod,
      run: runFromCalc ?? String(wiringRow?.qty ?? 6),
      box: a.bom.find((i) => i.group === 'Box & Cover')?.name ?? 'New Work 1-Gang Metal Box',
      cover: a.bom.filter((i) => i.group === 'Box & Cover')[1]?.name ?? 'Standard Cover',
    };
  }

  return {
    kind: 'fixture',
    app: a.context[0] ?? 'ACT Ceiling',
    type: FIXTURE_TYPES.find((t) => a.name.startsWith(t)) ?? a.name,
    mount: has('MTC-TBAR-01') ? 'T-Bar Drop-In'
      : has('BC-375') ? 'Suspension Cable and Beam Clamp'
      : has('CA-25') ? 'Concrete Anchor Mount'
      : 'Surface Mount to Joist Framing',
    wiring: a.wiringMethod,
    drop: a.bom.find((i) => i.code === 'ACK-DROP')?.calc?.match(/^([\d.]+) ft drop/)?.[1] ?? '',
    run: runFromCalc ?? String(wiringRow?.baseQty ?? wiringRow?.qty ?? 8),
    waste: wasteFromCalc ?? '5',
    dimming: has('CW-DALI') ? 'DALI control' : has('CW-010V') ? '0\u201310V dimming' : 'None',
    emergency: has('EBP-GEN') ? 'Emergency battery pack' : has('CHW-122') ? 'Constant hot leg' : 'None',
  };
}

/** Component ids the spec bar owns — everything else was added by hand. */
export function isParametricRow(item: BOMItem): boolean {
  return /^g\d+$/.test(item.id);
}
