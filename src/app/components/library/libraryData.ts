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
];

/** Which category a given assembly belongs to, derived from its code. */
export function categoryOf(a: Assembly): CategoryCode {
  if (a.code.includes('-FX-')) return 'BPC-01';
  if (a.code.includes('-DV-')) return 'BPC-02';
  if (a.code.includes('-RC-')) return 'BPC-03';
  if (a.code.includes('-FD-')) return 'BPC-04';
  if (a.code.includes('-FA-')) return 'BPC-08';
  return 'BPC-01';
}

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
  wiring: string;
  run: string;       // LF
  waste: string;     // %
  dimming: string;
  emergency: string;
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

export type AssemblyConfig = FixtureConfig | DeviceConfig;

export const FIXTURE_TYPES  = ['LED Troffer 2\xd74', 'LED Troffer 2\xd72', 'LED Emergency Troffer', 'Recessed Downlight', 'Linear Pendant', 'Surface-Mounted Fixture'];
export const FIXTURE_MOUNTS = ['T-Bar Drop-In', 'Surface Mount to Joist Framing', 'Suspension Cable and Beam Clamp', 'Concrete Anchor Mount'];
export const FIXTURE_WIRING = ['MC-PCS 12/3', 'MC 12/2', 'AC 12/2', 'EMT with THHN', 'Measure Separately'];
export const DIMMING_OPTIONS   = ['No dimming', '0\u201310V dimming', 'DALI control'];
export const EMERGENCY_OPTIONS = ['None', 'Constant hot leg', 'Emergency battery pack'];

export const DEVICE_TYPES  = ['Duplex Receptacle 20A', 'GFCI Receptacle 20A', 'Hospital-Grade Receptacle 20A', 'Single Receptacle', 'USB Receptacle', 'Switch', 'Occupancy Sensor'];
export const DEVICE_GRADES = ['Commercial', 'Hospital Grade', 'Residential', 'Weather Resistant'];
export const DEVICE_WIRING = ['MC 12/2', 'HCF MC 12/2', 'EMT with THHN', 'Measure Separately'];
export const DEVICE_BOXES  = ['New Work 1-Gang Metal Box', 'New Work 1-Gang Plastic Box', 'FS Box', '4-inch Square Box with Plaster Ring'];
export const DEVICE_COVERS = ['Standard Cover', 'Stainless-Steel Cover', 'Weatherproof In-Use Cover'];

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
  if (cfg.kind === 'fixture') {
    const calcLF = wasteAdjustedLF(cfg.run, cfg.waste);
    return [
      { id: 'g1', group: 'Fixture',   name: cfg.type, code: 'BPA-FX-CFG', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
      ...(cfg.mount === 'T-Bar Drop-In'
        ? [{ id: 'g2', group: 'Mounting', name: 'T-Bar Mounting Clip Set', code: 'MTC-TBAR-01', qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' as const }]
        : [{ id: 'g2', group: 'Mounting', name: 'Surface Mount Bracket',   code: 'SMB-GEN',     qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' as const }]),
      cfg.wiring !== 'Measure Separately'
        ? { id: 'g3', group: 'Wiring', name: cfg.wiring, code: 'WIRE-CFG', qty: calcLF, baseQty: calcLF, unit: 'LF', calc: `${cfg.run} LF + ${cfg.waste}% waste = ${calcLF} LF`, required: true, priceStatus: 'ok' as const }
        : { id: 'g3', group: 'Wiring', name: 'Wire measured separately', code: 'NOTE-SEP', qty: 1, unit: 'NOTE', required: false, priceStatus: 'ok' as const },
      { id: 'g4', group: 'Wiring',    name: 'MC Connector \xbd"', code: 'MCC-50',  qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' },
      { id: 'g5', group: 'Wiring',    name: 'Wire Connector',     code: 'WC-MARR', qty: 3, baseQty: 3, unit: 'EA', required: true, priceStatus: 'ok' },
      ...(cfg.dimming === '0\u201310V dimming' ? [{ id: 'g6', group: 'Controls',  name: '0-10V Control Wire 2C', code: 'CW-010V', qty: calcLF, baseQty: calcLF, unit: 'LF', required: true, priceStatus: 'ok' as const }] : []),
      ...(cfg.dimming === 'DALI control'   ? [{ id: 'g6', group: 'Controls',  name: 'DALI Control Cable',    code: 'CW-DALI', qty: calcLF, baseQty: calcLF, unit: 'LF', required: true, priceStatus: 'ok' as const }] : []),
      ...(cfg.emergency === 'Emergency battery pack' ? [{ id: 'g7', group: 'Emergency', name: 'Emergency Battery Pack', code: 'EBP-GEN', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' as const }] : []),
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
    { id: 'g5', group: 'Wiring',      name: 'MC Connector \xbd"', code: 'MCC-50', qty: 1, baseQty: 1, unit: 'EA', required: true, priceStatus: 'ok' },
    ...(cfg.app === 'Metal Framing' ? [{ id: 'g6', group: 'Hardware', name: 'Self-Drilling Screw #8', code: 'SDS-8-50', qty: 4, baseQty: 4, unit: 'EA', required: true, priceStatus: 'ok' as const }] : []),
    ...(cfg.app === 'Masonry'       ? [{ id: 'g6', group: 'Hardware', name: 'Concrete Anchor \xbc"',  code: 'CA-25',    qty: 2, baseQty: 2, unit: 'EA', required: true, priceStatus: 'ok' as const }] : []),
  ];
}

/** Default display name for a configuration. */
export function configName(cfg: AssemblyConfig): string {
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
    run: runFromCalc ?? String(wiringRow?.baseQty ?? wiringRow?.qty ?? 8),
    waste: wasteFromCalc ?? '5',
    dimming: has('CW-DALI') ? 'DALI control' : has('CW-010V') ? '0\u201310V dimming' : 'No dimming',
    emergency: has('EBP-GEN') ? 'Emergency battery pack' : has('CHW-122') ? 'Constant hot leg' : 'None',
  };
}

/** Component ids the spec bar owns — everything else was added by hand. */
export function isParametricRow(item: BOMItem): boolean {
  return /^g\d+$/.test(item.id);
}
