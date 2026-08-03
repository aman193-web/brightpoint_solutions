import { useEffect, useState } from 'react';

/**
 * Priced material lines — the single list the Pricing screen edits and the Bid
 * Builder totals.
 *
 * These used to be two separate mock arrays, so the two screens quoted
 * different material figures for the same job. One list, imported by both, is
 * the only way that cannot drift.
 */


export type PricingSource = 'programme' | 'company' | 'supplier' | 'override' | 'missing' | 'stale' | 'quoted' | 'locked';
export type ItemStatus = 'complete' | 'missing-price' | 'ai-suggested' | 'pending-review' | 'locked' | 'excluded';
export type Discipline = 'lighting' | 'power' | 'fire-alarm' | 'data' | 'safety';

/** Electrical system used to group the Materials section. */
export type SystemGroup =
  | 'Lighting' | 'Devices' | 'Branch Circuitry' | 'Raceway'
  | 'Wire' | 'Service Gear' | 'Fire Alarm' | 'Low Voltage';

export const SYSTEM_ORDER: SystemGroup[] = [
  'Lighting', 'Devices', 'Branch Circuitry', 'Raceway',
  'Wire', 'Service Gear', 'Fire Alarm', 'Low Voltage',
];

export interface DrawingLocation { page: string; markerNum: number; }

export interface PricingRow {
  id: string;
  description: string;
  code: string;
  assembly: string;
  discipline: Discipline;
  system: SystemGroup;
  category: string;
  drawingPage: string;
  qty: number;
  uom: string;
  baseProgrammePrice: number;
  companyPrice?: number;
  supplierPrice?: number;
  selectedPrice: number;
  selectedSource: PricingSource;
  supplierName?: string;
  quoteRef?: string;
  extMaterialCost: number;
  labourProfile: string;
  /**
   * NECA Column 1 labour unit — hours to install one unit of this material
   * under normal conditions. Catalogue data that travels with the part, which
   * is why it belongs on the material line even though labour totals are
   * assembled in the Bid Builder.
   */
  neca1: number;
  labourUnit: number;
  totalLabourHrs: number;
  status: ItemStatus;
  notes?: string;
  locations: DrawingLocation[];
  lastUpdated: string;
  updatedBy?: string;
  overrideReason?: string;
}

// ─── The job's priced material ────────────────────────────────────────────────

export const MATERIAL_LINES: PricingRow[] = [
  {
    id: 'pr-001', description: '2×4 LED Troffer 40W — ACT Ceiling, MC', code: 'LIT-LED-001',
    assembly: '2×4 LED Troffer 40W — ACT Ceiling, MC Cable', discipline: 'lighting', system: 'Lighting', category: 'Lighting Fixtures',
    drawingPage: 'E-101', qty: 16, uom: 'ea',
    baseProgrammePrice: 48.50, companyPrice: 44.00, supplierPrice: 41.80,
    selectedPrice: 41.80, selectedSource: 'supplier', supplierName: 'Rexel', quoteRef: 'QT-2026-0891',
    extMaterialCost: 668.80, labourProfile: 'Retail — L2', neca1: 0.68, labourUnit: 0.80, totalLabourHrs: 12.80,
    status: 'complete', lastUpdated: '2026-07-10', updatedBy: 'J. Martinez',
    locations: [{ page: 'E-101', markerNum: 1 }, { page: 'E-101', markerNum: 2 }, { page: 'E-102', markerNum: 1 }],
  },
  {
    id: 'pr-002', description: 'Emergency Exit Combo — Ceiling Mount', code: 'LIT-EXIT-001',
    assembly: 'Emergency Exit Combo — Ceiling Mount', discipline: 'safety', system: 'Lighting', category: 'Safety & Emergency',
    drawingPage: 'E-101', qty: 2, uom: 'ea',
    baseProgrammePrice: 68.00, companyPrice: 65.00,
    selectedPrice: 65.00, selectedSource: 'company',
    extMaterialCost: 130.00, labourProfile: 'Retail — L2', neca1: 0.77, labourUnit: 0.90, totalLabourHrs: 1.80,
    status: 'complete', lastUpdated: '2026-07-08', updatedBy: 'J. Martinez',
    locations: [{ page: 'E-101', markerNum: 5 }, { page: 'E-101', markerNum: 6 }],
  },
  {
    id: 'pr-003', description: '3/4" EMT Conduit — Surface Run', code: 'CON-EMT-075',
    assembly: '3/4" EMT Conduit — Surface Run', discipline: 'power', system: 'Raceway', category: 'Conduit & Fittings',
    drawingPage: 'E-101', qty: 27.3, uom: 'm',
    baseProgrammePrice: 3.80, companyPrice: 3.50,
    selectedPrice: 3.80, selectedSource: 'programme',
    extMaterialCost: 103.74, labourProfile: 'Retail — L2', neca1: 0.15, labourUnit: 0.18, totalLabourHrs: 4.91,
    status: 'complete', lastUpdated: '2026-07-06',
    locations: [{ page: 'E-101', markerNum: 3 }],
  },
  {
    id: 'pr-004', description: 'MC Cable 12/3', code: 'WIR-MC-123',
    assembly: '2×4 LED Troffer 40W — ACT Ceiling, MC Cable', discipline: 'lighting', system: 'Wire', category: 'Wire & Cable',
    drawingPage: 'E-101', qty: 128, uom: 'm',
    baseProgrammePrice: 2.10, companyPrice: 1.95,
    selectedPrice: 1.95, selectedSource: 'company',
    extMaterialCost: 249.60, labourProfile: 'Retail — L2', neca1: 0.034, labourUnit: 0.04, totalLabourHrs: 5.12,
    status: 'complete', lastUpdated: '2026-07-08',
    locations: [{ page: 'E-101', markerNum: 1 }, { page: 'E-101', markerNum: 2 }],
  },
  {
    id: 'pr-005', description: '4" Square Junction Box 1-1/2"', code: 'HW-BOX-4SQ',
    assembly: '2×4 LED Troffer 40W — ACT Ceiling, MC Cable', discipline: 'lighting', system: 'Branch Circuitry', category: 'Hardware',
    drawingPage: 'E-101', qty: 16, uom: 'ea',
    baseProgrammePrice: 3.80, companyPrice: 3.50,
    selectedPrice: 0, selectedSource: 'missing',
    extMaterialCost: 0, labourProfile: 'Retail — L2', neca1: 0.085, labourUnit: 0.10, totalLabourHrs: 1.60,
    status: 'missing-price', lastUpdated: '2026-07-01',
    locations: [{ page: 'E-101', markerNum: 1 }],
  },
  {
    id: 'pr-006', description: 'Circuit Breaker 1-Pole 20A', code: 'PNL-BKR-120-20',
    assembly: '20A Circuit Homerun — EMT to Panel', discipline: 'power', system: 'Service Gear', category: 'Panelboard',
    drawingPage: 'E-101', qty: 3, uom: 'ea',
    baseProgrammePrice: 12.50, companyPrice: 11.80,
    selectedPrice: 11.80, selectedSource: 'company',
    extMaterialCost: 35.40, labourProfile: 'Retail — L2', neca1: 0.17, labourUnit: 0.20, totalLabourHrs: 0.60,
    status: 'complete', lastUpdated: '2026-07-05',
    locations: [{ page: 'E-101', markerNum: 4 }],
  },
  {
    id: 'pr-007', description: 'LED Exit Sign — Universal', code: 'LIT-EXIT-002',
    assembly: 'Emergency Exit Combo — Ceiling Mount', discipline: 'safety', system: 'Lighting', category: 'Safety & Emergency',
    drawingPage: 'E-102', qty: 4, uom: 'ea',
    baseProgrammePrice: 52.00,
    selectedPrice: 52.00, selectedSource: 'stale',
    extMaterialCost: 208.00, labourProfile: 'Retail — L2', neca1: 0.68, labourUnit: 0.80, totalLabourHrs: 3.20,
    status: 'pending-review', lastUpdated: '2025-11-15', updatedBy: 'System',
    locations: [{ page: 'E-102', markerNum: 1 }, { page: 'E-102', markerNum: 2 }],
  },
  {
    id: 'pr-008', description: 'Duplex Receptacle 20A', code: 'WD-DUP-001',
    assembly: 'Duplex Receptacle 20A — New Construction', discipline: 'power', system: 'Devices', category: 'Wiring Devices',
    drawingPage: 'E-201', qty: 24, uom: 'ea',
    baseProgrammePrice: 8.50, companyPrice: 8.00, supplierPrice: 7.20,
    selectedPrice: 7.20, selectedSource: 'supplier', supplierName: 'Home Depot Pro',
    extMaterialCost: 172.80, labourProfile: 'Retail — L2', neca1: 0.43, labourUnit: 0.50, totalLabourHrs: 12.00,
    status: 'complete', lastUpdated: '2026-07-11',
    locations: [{ page: 'E-201', markerNum: 1 }, { page: 'E-201', markerNum: 2 }],
  },
  {
    id: 'pr-009', description: 'Fire Alarm Pull Station', code: 'FA-PULL-001',
    assembly: 'Fire Alarm Pull Station — Surface Mount', discipline: 'fire-alarm', system: 'Fire Alarm', category: 'Fire Alarm',
    drawingPage: 'E-301', qty: 6, uom: 'ea',
    baseProgrammePrice: 68.00, companyPrice: 65.00,
    selectedPrice: 58.50, selectedSource: 'quoted', quoteRef: 'NOTIFIER-2026-114',
    extMaterialCost: 351.00, labourProfile: 'Retail — L2', neca1: 1.02, labourUnit: 1.20, totalLabourHrs: 7.20,
    status: 'complete', lastUpdated: '2026-07-09',
    locations: [{ page: 'E-301', markerNum: 1 }],
  },
  {
    id: 'pr-010', description: 'CAT6 Keystone Jack', code: 'DAT-CAT6-001',
    assembly: 'CAT6 Data Outlet — New Construction', discipline: 'data', system: 'Low Voltage', category: 'Data & Communications',
    drawingPage: 'E-201', qty: 24, uom: 'ea',
    baseProgrammePrice: 12.50, companyPrice: 12.50,
    selectedPrice: 15.00, selectedSource: 'override', overrideReason: 'Premium jack required per spec section 27',
    extMaterialCost: 360.00, labourProfile: 'Retail — L2', neca1: 0.3, labourUnit: 0.35, totalLabourHrs: 8.40,
    status: 'complete', lastUpdated: '2026-07-07', updatedBy: 'S. Thompson',
    locations: [{ page: 'E-201', markerNum: 3 }],
  },
  {
    id: 'pr-011', description: '12 AWG THHN Wire', code: 'WIR-THHN-12',
    assembly: '20A Circuit Homerun — EMT to Panel', discipline: 'power', system: 'Wire', category: 'Wire & Cable',
    drawingPage: 'E-101', qty: 85, uom: 'm',
    baseProgrammePrice: 0.65, companyPrice: 0.62,
    selectedPrice: 0.62, selectedSource: 'company',
    extMaterialCost: 52.70, labourProfile: 'Retail — L2', neca1: 0.025, labourUnit: 0.03, totalLabourHrs: 2.55,
    status: 'complete', lastUpdated: '2026-07-08',
    locations: [{ page: 'E-101', markerNum: 3 }],
  },
  {
    id: 'pr-012', description: 'Smoke Detector — Ceiling Mount', code: 'FA-SMOK-001',
    assembly: 'Fire Alarm Pull Station — Surface Mount', discipline: 'fire-alarm', system: 'Fire Alarm', category: 'Fire Alarm',
    drawingPage: 'E-301', qty: 12, uom: 'ea',
    baseProgrammePrice: 52.00, companyPrice: 49.00,
    selectedPrice: 49.00, selectedSource: 'company',
    extMaterialCost: 588.00, labourProfile: 'Retail — L2', neca1: 0.85, labourUnit: 1.00, totalLabourHrs: 12.00,
    status: 'ai-suggested', lastUpdated: '2026-07-12', updatedBy: 'AI',
    locations: [{ page: 'E-301', markerNum: 2 }],
  },
];

/** Total extended material cost across every line. */
export function materialTotal(rows: PricingRow[] = MATERIAL_LINES): number {
  return rows.reduce((sum, r) => sum + r.extMaterialCost, 0);
}

// ─── Resolving a missing price ────────────────────────────────────────────────

/**
 * Lines that are in the bid but carry no price. These are what block a bid or
 * proposal from going out: an unpriced line silently understates the total.
 */
export function missingPriceLines(rows: PricingRow[] = MATERIAL_LINES): PricingRow[] {
  return rows.filter((r) => r.selectedPrice === 0 && r.status !== 'excluded');
}

/**
 * The price this line would take if resolved automatically — the company price
 * book, falling back to the programme rate. Returns 0 when neither exists, in
 * which case only a human can settle it.
 */
export function priceBookRate(row: PricingRow): number {
  return row.companyPrice || row.baseProgrammePrice || 0;
}

const listeners = new Set<() => void>();

/** Bumped whenever a line changes, so every screen re-reads the same list. */
let revision = 0;

export function materialsRevision(): number {
  return revision;
}

/**
 * Prices a line from the price book. Mutates the shared list on purpose: the
 * Pricing screen, the Bid Builder and the proposal all read this array, and a
 * price fixed in one place has to be fixed in all of them.
 */
export function applyPriceBook(id: string): boolean {
  const row = MATERIAL_LINES.find((r) => r.id === id);
  if (!row) return false;
  const rate = priceBookRate(row);
  if (rate <= 0) return false;

  row.selectedPrice = rate;
  row.extMaterialCost = Math.round(rate * row.qty * 100) / 100;
  row.selectedSource = row.companyPrice ? 'company' : 'programme';
  row.status = 'complete';
  row.lastUpdated = '2026-08-03';
  row.updatedBy = 'Price book';
  revision += 1;
  for (const l of listeners) l();
  return true;
}

/** Takes a line out of the bid instead of pricing it. */
export function excludeLine(id: string): boolean {
  const row = MATERIAL_LINES.find((r) => r.id === id);
  if (!row) return false;
  row.status = 'excluded';
  revision += 1;
  for (const l of listeners) l();
  return true;
}

export function useMaterialsRevision(): number {
  const [rev, setRev] = useState(revision);
  useEffect(() => {
    const listener = () => setRev(revision);
    listeners.add(listener);
    listener();
    return () => { listeners.delete(listener); };
  }, []);
  return rev;
}

/** Material cost of the lines actually in the bid. */
export function includedMaterialTotal(rows: PricingRow[] = MATERIAL_LINES): number {
  return rows.filter((r) => r.status !== 'excluded').reduce((sum, r) => sum + r.extMaterialCost, 0);
}

/** Subscribe outside React — used by the bid snapshot to stay in step. */
export function onMaterialsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
