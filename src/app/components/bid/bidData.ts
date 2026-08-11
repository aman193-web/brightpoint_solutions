/**
 * Bid Builder cost-category data.
 *
 * McCormick splits a bid into cost categories the estimator steps through one at
 * a time — quotes, subs, direct job expenses, equipment, bond, tax, external
 * adjustments. This module carries that model: the predefined categories,
 * scopes and checklists an electrical estimator expects to find already there,
 * plus the row shapes each category's table edits.
 *
 * The arithmetic lives here too, so a row's Cost Amount means the same thing on
 * every tab: unit cost × quantity × multiplier, tax applied on top when the row
 * is taxable.
 */

// ─── Cost codes ───────────────────────────────────────────────────────────────

/** Cost codes an entry can be booked to. Free text is allowed as well. */
export const COST_CODES = [
  '26-00-00 Electrical',
  '26-05-00 Common Work',
  '26-24-00 Switchboards',
  '26-27-00 Distribution',
  '26-28-00 Protection',
  '26-32-00 Generators',
  '26-33-00 UPS',
  '26-50-00 Lighting',
  '27-10-00 Structured Cabling',
  '27-40-00 Audio-Video',
  '28-10-00 Access Control',
  '28-30-00 Fire Detection',
  '01-50-00 Temp Facilities',
  '01-70-00 Closeout',
];

// ─── Quotes ───────────────────────────────────────────────────────────────────

/**
 * Quote categories that ship with the product. The list matches the equipment
 * an electrical estimator routinely puts out to quote; anything else is entered
 * as a custom category on the row.
 */
export const QUOTE_CATEGORIES = [
  'Switchgear',
  'Fixtures',
  'UPS',
  'Generator',
  'Data Equipment',
  'Voice Equipment',
  'Video Equipment',
  'Security Equipment',
  'Fire Alarm Equipment',
  'Intercom',
];

export type QuoteStatus = 'requested' | 'received' | 'under-review' | 'accepted' | 'declined';

export const QUOTE_STATUS_CFG: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  requested:      { label: 'Requested',    color: '#6B7280', bg: '#F3F4F6' },
  received:       { label: 'Received',     color: '#1D4ED8', bg: '#EFF6FF' },
  'under-review': { label: 'Under review', color: '#D97706', bg: '#FFFBEB' },
  accepted:       { label: 'Accepted',     color: '#16A34A', bg: '#F0FDF4' },
  declined:       { label: 'Declined',     color: '#DC2626', bg: '#FEF2F2' },
};

export interface QuoteRow {
  id: string;
  included: boolean;
  /** One of QUOTE_CATEGORIES, or anything the estimator typed. */
  quoteType: string;
  supplier: string;
  reference: string;
  costCode: string;
  /** Optional. A supplier quote usually carries no internal hours. */
  labourHours: number;
  taxable: boolean;
  unitCost: number;
  /** Applied to unit cost — escalation, freight, or a negotiated discount. */
  multiplier: number;
  attachment?: string;
  // Drawer fields
  expiration: string;
  status: QuoteStatus;
  markup: number;
  notes?: string;
}

export const SEED_QUOTE_ROWS: QuoteRow[] = [
  {
    id: 'q1', included: true, quoteType: 'Fixtures', supplier: 'Rexel USA',
    reference: 'QT-2026-0891', costCode: '26-50-00 Lighting', labourHours: 0, taxable: true,
    unitCost: 668.80, multiplier: 1, attachment: 'QT-2026-0891.pdf',
    expiration: '2026-08-31', status: 'accepted', markup: 5,
    notes: 'Troffers and MC cable, freight included to site.',
  },
  {
    id: 'q2', included: false, quoteType: 'Fixtures', supplier: 'Graybar Electric',
    reference: 'GBR-4429', costCode: '26-50-00 Lighting', labourHours: 0, taxable: true,
    unitCost: 510.00, multiplier: 1,
    expiration: '2026-08-15', status: 'under-review', markup: 5,
    notes: 'Alternate lighting package — awaiting cut sheets.',
  },
  {
    id: 'q3', included: true, quoteType: 'Switchgear', supplier: 'Schneider Electric',
    reference: 'SE-88104', costCode: '26-24-00 Switchboards', labourHours: 0, taxable: true,
    unitCost: 4250.00, multiplier: 1.04, attachment: 'SE-88104.pdf',
    expiration: '2026-09-12', status: 'received', markup: 8,
    notes: '4% escalation applied per supplier letter dated 12 Jul.',
  },
  {
    id: 'q4', included: false, quoteType: 'Fire Alarm Equipment', supplier: 'Notifier',
    reference: 'NOT-2211', costCode: '28-30-00 Fire Detection', labourHours: 0, taxable: true,
    unitCost: 2180.00, multiplier: 1,
    expiration: '2026-07-20', status: 'received', markup: 8,
  },
];

// ─── Subcontractors ───────────────────────────────────────────────────────────

/** Scopes commonly subcontracted out of an electrical package. */
export const SUB_SCOPES = [
  'Fire Alarm',
  'Saw Cutting',
  'Core Drilling',
  'Trenching',
  'Concrete',
  'Crane',
];

export interface SubRow {
  id: string;
  included: boolean;
  scope: string;
  subcontractor: string;
  costCode: string;
  /**
   * No labour hours. Subcontracted scope is quoted as a lump sum, so internal
   * hours were a McCormick habit rather than a number anyone filled in.
   */
  taxable: boolean;
  quotedCost: number;
  multiplier: number;
  attachment?: string;
  // Drawer fields
  contact?: string;
  phone?: string;
  insuranceExpiry?: string;
  notes?: string;
}

export const SEED_SUB_ROWS: SubRow[] = [
  {
    id: 's1', included: true, scope: 'Fire Alarm', subcontractor: 'Southwest Fire Protection',
    costCode: '28-30-00 Fire Detection', taxable: false,
    quotedCost: 8400.00, multiplier: 1, attachment: 'southwest-quote.pdf',
    contact: 'Dale Whitmore', phone: '(02) 9556 4120', insuranceExpiry: '2027-01-31',
    notes: 'Devices, programming and verification. FACP by others.',
  },
  {
    id: 's2', included: false, scope: 'Core Drilling', subcontractor: 'Precision Core Services',
    costCode: '26-05-00 Common Work', taxable: false,
    quotedCost: 3200.00, multiplier: 1,
    contact: 'Marie Osei', phone: '(02) 9412 8890',
    notes: '18 penetrations, X-ray scanning included.',
  },
  {
    id: 's3', included: false, scope: 'Trenching', subcontractor: 'Groundline Civil',
    costCode: '26-05-00 Common Work', taxable: false,
    quotedCost: 5600.00, multiplier: 1,
    notes: 'Service trench to transformer pad — 42 m.',
  },
];

// ─── Direct job expenses ──────────────────────────────────────────────────────

export type ExpenseGroupId = 'permits-admin' | 'site-field' | 'commercial-misc';

export const EXPENSE_GROUPS: { id: ExpenseGroupId; label: string }[] = [
  { id: 'permits-admin',   label: 'Permits and Administration' },
  { id: 'site-field',      label: 'Site and Field Operations' },
  { id: 'commercial-misc', label: 'Commercial and Miscellaneous' },
];

export interface ExpenseLine {
  id: string;
  group: ExpenseGroupId;
  included: boolean;
  expense: string;
  supplier: string;
  costCode: string;
  taxable: boolean;
  unitCost: number;
  /** Quantity only — no multiplier or duration. Defaults to 1. */
  quantity: number;
  notes?: string;
  /** Checklist defaults can be excluded but not deleted. */
  standard: boolean;
}

/**
 * The checklist an estimator runs down on every bid, grouped so the tab opens
 * as three collapsed headers rather than a wall of sixteen rows.
 */
export const STANDARD_EXPENSE_LINES: Omit<ExpenseLine, 'id'>[] = [
  // Permits and Administration
  { group: 'permits-admin', included: true,  expense: 'Permits and Fees', supplier: 'City of Wollongong', costCode: '01-50-00 Temp Facilities', taxable: false, unitCost: 350, quantity: 1, standard: true, notes: 'Electrical permit and inspection' },
  { group: 'permits-admin', included: false, expense: 'Plan Charges',     supplier: '', costCode: '01-50-00 Temp Facilities', taxable: true,  unitCost: 0,   quantity: 1, standard: true },
  { group: 'permits-admin', included: false, expense: 'Engineering',      supplier: '', costCode: '26-05-00 Common Work',     taxable: false, unitCost: 0,   quantity: 1, standard: true },
  { group: 'permits-admin', included: false, expense: 'As-Builts',        supplier: '', costCode: '01-70-00 Closeout',        taxable: false, unitCost: 0,   quantity: 1, standard: true },
  { group: 'permits-admin', included: false, expense: 'Bid Bond',         supplier: '', costCode: '01-50-00 Temp Facilities', taxable: false, unitCost: 0,   quantity: 1, standard: true, notes: 'Priced on the Bond tab when required' },
  { group: 'permits-admin', included: false, expense: 'Insurance',        supplier: '', costCode: '01-50-00 Temp Facilities', taxable: false, unitCost: 0,   quantity: 1, standard: true },

  // Site and Field Operations
  { group: 'site-field', included: false, expense: 'Telephone',          supplier: '', costCode: '01-50-00 Temp Facilities', taxable: true,  unitCost: 0,   quantity: 1,  standard: true },
  { group: 'site-field', included: false, expense: 'Trailer',            supplier: '', costCode: '01-50-00 Temp Facilities', taxable: true,  unitCost: 0,   quantity: 1,  standard: true },
  { group: 'site-field', included: true,  expense: 'Fuel, Oil and Gas',  supplier: 'Ampol Fleet', costCode: '01-50-00 Temp Facilities', taxable: true, unitCost: 25, quantity: 5, standard: true, notes: 'Site access and parking — 5 days' },
  { group: 'site-field', included: false, expense: 'Supervision',        supplier: '', costCode: '26-05-00 Common Work',     taxable: false, unitCost: 0,   quantity: 1,  standard: true },
  { group: 'site-field', included: false, expense: 'Temporary Power',    supplier: '', costCode: '01-50-00 Temp Facilities', taxable: true,  unitCost: 0,   quantity: 1,  standard: true },
  { group: 'site-field', included: false, expense: 'Demolition',         supplier: '', costCode: '26-05-00 Common Work',     taxable: false, unitCost: 0,   quantity: 1,  standard: true },
  { group: 'site-field', included: false, expense: 'Cleanup',            supplier: '', costCode: '01-70-00 Closeout',        taxable: false, unitCost: 0,   quantity: 1,  standard: true },

  // Commercial and Miscellaneous
  { group: 'commercial-misc', included: false, expense: 'Interest',              supplier: '', costCode: '01-50-00 Temp Facilities', taxable: false, unitCost: 0, quantity: 1, standard: true },
  { group: 'commercial-misc', included: false, expense: 'Warranty / Guarantee',  supplier: '', costCode: '01-70-00 Closeout',        taxable: false, unitCost: 0, quantity: 1, standard: true },
  { group: 'commercial-misc', included: false, expense: 'Miscellaneous',         supplier: '', costCode: '26-05-00 Common Work',     taxable: true,  unitCost: 0, quantity: 1, standard: true },
];

// ─── Equipment rental ─────────────────────────────────────────────────────────

export const RENTAL_PERIODS = ['Hour', 'Day', 'Week', 'Month'];

export interface EquipmentRow {
  id: string;
  included: boolean;
  equipment: string;
  supplier: string;
  costCode: string;
  labourHours: number;
  taxable: boolean;
  rate: number;
  period: string;
  quantity: number;
  /** Number of periods — 3 weeks, 5 days, and so on. */
  duration: number;
  attachment?: string;
  notes?: string;
  deliveryPickup?: number;
}

export const SEED_EQUIPMENT: EquipmentRow[] = [
  { id: 'e1', included: true,  equipment: '19 ft Scissor Lift', supplier: 'Coates Hire', costCode: '01-50-00 Temp Facilities', labourHours: 0, taxable: true, rate: 168, period: 'Week', quantity: 1, duration: 3, deliveryPickup: 240, attachment: 'coates-rate-card.pdf', notes: 'Narrow-aisle electric, indoor rated.' },
  { id: 'e2', included: false, equipment: '40 ft Boom Lift',    supplier: 'Kennards',    costCode: '01-50-00 Temp Facilities', labourHours: 0, taxable: true, rate: 420, period: 'Week', quantity: 1, duration: 1, deliveryPickup: 380 },
  { id: 'e3', included: false, equipment: 'Core Drill Rig',     supplier: 'Kennards',    costCode: '26-05-00 Common Work',     labourHours: 0, taxable: true, rate: 95,  period: 'Day',  quantity: 1, duration: 2 },
];

// ─── Bond ─────────────────────────────────────────────────────────────────────

export type BondKind = 'Bid Bond' | 'Performance Bond' | 'Payment Bond' | 'Maintenance Bond';

export interface BondRow {
  id: string;
  included: boolean;
  kind: BondKind;
  surety: string;
  costCode: string;
  /** Percent of the bonded amount. */
  rate: number;
  /**
   * Base the premium is charged on. Left at 0 the row follows the live sell
   * price, which is what a bid bond is normally written against.
   */
  bondedAmount: number;
  minimumPremium: number;
  taxable: boolean;
  attachment?: string;
  notes?: string;
}

export const SEED_BONDS: BondRow[] = [
  { id: 'b1', included: false, kind: 'Bid Bond',         surety: 'Vero Insurance', costCode: '01-50-00 Temp Facilities', rate: 1.0, bondedAmount: 0, minimumPremium: 250, taxable: false, notes: 'Follows the live sell price while the bonded amount is 0.' },
  { id: 'b2', included: false, kind: 'Performance Bond', surety: 'Vero Insurance', costCode: '01-50-00 Temp Facilities', rate: 1.5, bondedAmount: 0, minimumPremium: 500, taxable: false },
];

// ─── Adjustments (formerly Ext Adj) ───────────────────────────────────────────

export type AdjustmentKind = 'add' | 'deduct';
export type AdjustmentStatus = 'pending' | 'accepted' | 'rejected';

export const ADJUSTMENT_STATUS_CFG: Record<AdjustmentStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: '#D97706', bg: '#FFFBEB' },
  accepted: { label: 'Accepted', color: '#16A34A', bg: '#F0FDF4' },
  rejected: { label: 'Rejected', color: '#9CA3AF', bg: '#F9FAFB' },
};

export interface AdjustmentRow {
  id: string;
  /**
   * Whether the row reaches the bid. Status is the commercial state; this is
   * the estimator's switch. Setting status to accepted ticks it, rejecting
   * clears it, and it can be overridden either way.
   */
  included: boolean;
  description: string;
  kind: AdjustmentKind;
  amount: number;
  status: AdjustmentStatus;
  costCode: string;
  notes?: string;
}

export const SEED_ADJUSTMENTS: AdjustmentRow[] = [
  { id: 'adj1', included: false, description: 'Upgrade to 0-10V dimming throughout', kind: 'add',    amount: 3200.00, status: 'pending',  costCode: '26-50-00 Lighting', notes: 'Alt 1 on the bid form.' },
  { id: 'adj2', included: false, description: 'Delete emergency battery packs — central inverter', kind: 'deduct', amount: 890.00, status: 'pending', costCode: '26-50-00 Lighting', notes: 'Alt 2 on the bid form.' },
  { id: 'adj3', included: true,  description: 'Owner-supplied light fixtures credit', kind: 'deduct', amount: 1450.00, status: 'accepted', costCode: '26-50-00 Lighting' },
];

// ─── Row arithmetic ───────────────────────────────────────────────────────────
// One definition per concept, so Cost Amount reads the same on every tab.

/** Cost amount before tax: base × quantity × multiplier. */
export function costAmount(base: number, quantity = 1, multiplier = 1): number {
  return base * (quantity || 0) * (multiplier || 0);
}

/** Tax on a row, or 0 when the row is not taxable. */
export function rowTax(amount: number, taxable: boolean, taxRate: number): number {
  return taxable ? amount * (taxRate / 100) : 0;
}

/**
 * What is still outstanding on a row: the amount that has not been committed
 * because the row is excluded, or has no cost entered yet.
 */
export function remaining(amount: number, included: boolean): number {
  if (!included) return amount;
  return 0;
}

export function equipmentAmount(r: EquipmentRow): number {
  return costAmount(r.rate, r.quantity * r.duration, 1) + (r.deliveryPickup ?? 0);
}

export function bondPremium(r: BondRow, sellPrice: number): number {
  const base = r.bondedAmount > 0 ? r.bondedAmount : sellPrice;
  return Math.max(base * (r.rate / 100), r.minimumPremium);
}

/** Net of the included adjustments. Deducts arrive negative. */
export function adjustmentNet(rows: AdjustmentRow[]): number {
  return rows
    .filter((r) => r.included)
    .reduce((sum, r) => sum + (r.kind === 'add' ? r.amount : -r.amount), 0);
}
