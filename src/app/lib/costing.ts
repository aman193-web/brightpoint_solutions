/**
 * Shared bid costing model.
 *
 * One source of truth for the numbers that appear on the Pricing screen, the
 * Bid Builder top sheet and the Settings defaults, so the three can never
 * disagree.
 *
 * The arithmetic follows McCormick's recap logic: every cost bucket rolls into a
 * raw cost, sales tax is added as a cost, then overhead, profit and contingency
 * are applied on top to reach the sell price.
 */

// ─── Company defaults ─────────────────────────────────────────────────────────

export interface MarkupSet {
  /** Applied to material cost only. */
  materialMarkup: number;
  /** Applied to labor cost only. */
  laborMarkup: number;
  overhead: number;
  profit: number;
  contingency: number;
  /** Sales tax on taxable goods (material + supplier quotes). */
  taxRate: number;
}

export type MarkupKey = keyof MarkupSet;

export const MARKUP_FIELDS: { key: MarkupKey; label: string; hint: string }[] = [
  { key: 'materialMarkup', label: 'Material markup', hint: 'Applied to material cost before overhead' },
  { key: 'laborMarkup',    label: 'Labor markup',    hint: 'Applied to labor cost before overhead' },
  { key: 'overhead',       label: 'Overhead',        hint: 'Applied to raw cost including tax' },
  { key: 'profit',         label: 'Profit',          hint: 'Applied after overhead' },
  { key: 'contingency',    label: 'Contingency',     hint: 'Company baseline contingency' },
  { key: 'taxRate',        label: 'Sales tax',       hint: 'On material and supplier quotes' },
];

/**
 * Company-wide defaults, editable in Settings → Markup & pricing. Held in a
 * mutable module object so a change in Settings is inherited by bids opened
 * afterwards in the same session, which is what "auto-populate into new bids"
 * means without a backend.
 */
export const COMPANY_DEFAULTS: MarkupSet = {
  materialMarkup: 10,
  laborMarkup: 0,
  overhead: 12,
  profit: 8,
  contingency: 5,
  taxRate: 14.975,
};

export function setCompanyDefault(key: MarkupKey, value: number) {
  COMPANY_DEFAULTS[key] = value;
}

/** Project-level overrides. An absent key means "inherit from company". */
export type MarkupOverrides = Partial<Record<MarkupKey, number>>;

export function effectiveMarkup(overrides: MarkupOverrides): MarkupSet {
  return { ...COMPANY_DEFAULTS, ...overrides };
}

export function isInherited(overrides: MarkupOverrides, key: MarkupKey): boolean {
  return overrides[key] === undefined;
}

// ─── Bid computation ──────────────────────────────────────────────────────────

export interface BidInputs {
  materialCost: number;
  laborCost: number;
  quotesCost: number;
  subcontractorCost: number;
  directJobExpenses: number;
  /** Equipment rental, priced on its own tab. Defaults to 0. */
  equipmentRental?: number;
  /** Bid / performance / payment bond premium. Defaults to 0. */
  bond?: number;
  /**
   * Net of the external adjustments (add / deduct). Signed: a deduct arrives
   * negative. Defaults to 0.
   */
  adjustments?: number;
  /** Building area used for the price-per-square-foot readout. */
  squareFeet: number;
}

export interface BidTotals {
  materialCost: number;
  materialMarkupAmt: number;
  materialSell: number;
  laborCost: number;
  laborMarkupAmt: number;
  laborSell: number;
  quotesCost: number;
  subcontractorCost: number;
  directJobExpenses: number;
  equipmentRental: number;
  bond: number;
  adjustments: number;
  /** Sum of every bucket after per-bucket markup, before tax. */
  rawCost: number;
  taxableBase: number;
  tax: number;
  rawCostWithTax: number;
  overheadAmt: number;
  profitAmt: number;
  contingencyAmt: number;
  totalBid: number;
  /** Alias of totalBid — the label the Bid Summary header uses. */
  sellPrice: number;
  /** Profit as a share of the total bid price. */
  profitPct: number;
  /** Margin on cost: (sell − raw cost with tax) / raw cost with tax. */
  returnPct: number;
  pricePerSqFt: number;
  squareFeet: number;
}

export function computeBid(inputs: BidInputs, markup: MarkupSet): BidTotals {
  const pct = (v: number) => (Number.isFinite(v) ? v : 0) / 100;

  const materialMarkupAmt = inputs.materialCost * pct(markup.materialMarkup);
  const materialSell = inputs.materialCost + materialMarkupAmt;
  const laborMarkupAmt = inputs.laborCost * pct(markup.laborMarkup);
  const laborSell = inputs.laborCost + laborMarkupAmt;

  const equipmentRental = inputs.equipmentRental ?? 0;
  const bond = inputs.bond ?? 0;
  const adjustments = inputs.adjustments ?? 0;

  const rawCost = materialSell + laborSell + inputs.quotesCost
    + inputs.subcontractorCost + inputs.directJobExpenses
    + equipmentRental + bond + adjustments;

  // Sales tax is a cost on goods only — never on labor or subcontracted work.
  const taxableBase = materialSell + inputs.quotesCost;
  const tax = taxableBase * pct(markup.taxRate);
  const rawCostWithTax = rawCost + tax;

  const overheadAmt = rawCostWithTax * pct(markup.overhead);
  const profitAmt = (rawCostWithTax + overheadAmt) * pct(markup.profit);
  const contingencyAmt = rawCostWithTax * pct(markup.contingency);

  const totalBid = rawCostWithTax + overheadAmt + profitAmt + contingencyAmt;
  const squareFeet = inputs.squareFeet > 0 ? inputs.squareFeet : 0;

  return {
    materialCost: inputs.materialCost,
    materialMarkupAmt,
    materialSell,
    laborCost: inputs.laborCost,
    laborMarkupAmt,
    laborSell,
    quotesCost: inputs.quotesCost,
    subcontractorCost: inputs.subcontractorCost,
    directJobExpenses: inputs.directJobExpenses,
    equipmentRental,
    bond,
    adjustments,
    rawCost,
    taxableBase,
    tax,
    rawCostWithTax,
    overheadAmt,
    profitAmt,
    contingencyAmt,
    totalBid,
    sellPrice: totalBid,
    profitPct: totalBid > 0 ? (profitAmt / totalBid) * 100 : 0,
    returnPct: rawCostWithTax > 0 ? ((totalBid - rawCostWithTax) / rawCostWithTax) * 100 : 0,
    pricePerSqFt: squareFeet > 0 ? totalBid / squareFeet : 0,
    squareFeet,
  };
}

// ─── Crew allocation ──────────────────────────────────────────────────────────

export interface CrewRow {
  id: string;
  role: string;
  /** Share of total labor hours, as a percentage. Must sum to 100. */
  allocation: number;
  hourlyCost: number;
  /**
   * Whether the role reaches the bid. Absent means included — existing callers
   * that never set it keep the behaviour they had.
   */
  included?: boolean;
}

export const CREW_ROLES = ['Foreman', 'Journeyman', 'Apprentice', 'General Labor'];

/** Company crew templates — the mix an estimator starts from. */
export const CREW_TEMPLATES: { id: string; name: string; rows: Omit<CrewRow, 'id'>[] }[] = [
  {
    id: 'retail-fitout',
    name: 'Retail fit-out (default)',
    rows: [
      { role: 'Foreman',       allocation: 15, hourlyCost: 98 },
      { role: 'Journeyman',    allocation: 55, hourlyCost: 85 },
      { role: 'Apprentice',    allocation: 25, hourlyCost: 52 },
      { role: 'General Labor', allocation: 5,  hourlyCost: 38 },
    ],
  },
  {
    id: 'service-work',
    name: 'Service work',
    rows: [
      { role: 'Foreman',    allocation: 25, hourlyCost: 98 },
      { role: 'Journeyman', allocation: 75, hourlyCost: 85 },
    ],
  },
  {
    id: 'ground-up',
    name: 'Ground-up construction',
    rows: [
      { role: 'Foreman',       allocation: 10, hourlyCost: 98 },
      { role: 'Journeyman',    allocation: 45, hourlyCost: 85 },
      { role: 'Apprentice',    allocation: 35, hourlyCost: 52 },
      { role: 'General Labor', allocation: 10, hourlyCost: 38 },
    ],
  },
];

export interface CrewLine extends CrewRow {
  hours: number;
  extCost: number;
}

/**
 * Splits total labor hours across the crew mix.
 *
 * An excluded role keeps its allocation on screen but contributes no hours, no
 * cost and nothing to the 100% check — taking a role out of the bid should not
 * leave the allocation looking unbalanced.
 */
export function computeCrew(rows: CrewRow[], totalHours: number): {
  lines: CrewLine[];
  allocationTotal: number;
  hoursTotal: number;
  costTotal: number;
  balanced: boolean;
} {
  const inBid = (r: CrewRow) => r.included !== false;
  const lines = rows.map((r) => {
    const hours = inBid(r) ? totalHours * (r.allocation / 100) : 0;
    return { ...r, hours, extCost: hours * r.hourlyCost };
  });
  const allocationTotal = rows
    .filter(inBid)
    .reduce((s, r) => s + (Number.isFinite(r.allocation) ? r.allocation : 0), 0);
  return {
    lines,
    allocationTotal,
    hoursTotal: lines.reduce((s, l) => s + l.hours, 0),
    costTotal: lines.reduce((s, l) => s + l.extCost, 0),
    // Tolerance covers the rounding an estimator types by hand.
    balanced: Math.abs(allocationTotal - 100) < 0.01,
  };
}

// ─── Direct job expenses ──────────────────────────────────────────────────────

export interface ExpenseRow {
  id: string;
  label: string;
  amount: number;
  included: boolean;
  /** Standard checklist entries cannot be deleted, only excluded. */
  standard: boolean;
  note?: string;
}

/** The checklist an estimator runs down on every bid. */
export const STANDARD_EXPENSES: Omit<ExpenseRow, 'id'>[] = [
  { label: 'Demolition',              amount: 0,      included: false, standard: true },
  { label: 'Permits',                 amount: 350,    included: true,  standard: true, note: 'Electrical permit & inspection fees' },
  { label: 'Equipment rental',        amount: 239.07, included: true,  standard: true, note: 'Tool & equipment allowance (3%)' },
  { label: 'Temporary power',         amount: 0,      included: false, standard: true },
  { label: 'Lifts',                   amount: 0,      included: false, standard: true },
  { label: 'Travel',                  amount: 125,    included: true,  standard: true, note: 'Site access & parking — 5 days' },
  { label: 'Housing',                 amount: 0,      included: false, standard: true },
  { label: 'Other project expenses',  amount: 0,      included: false, standard: true },
];

// ─── Formatting ───────────────────────────────────────────────────────────────

export function money(v: number) {
  return '$' + v.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function money0(v: number) {
  return '$' + v.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function pct(v: number) {
  return v.toFixed(1) + '%';
}

// ─── Shared seed rows ─────────────────────────────────────────────────────────
// Pricing and the Bid Builder read the same seeds so their totals cannot drift.

export interface QuoteSeed {
  id: string; vendor: string; description: string; ref: string;
  amount: number; expiration: string; included: boolean; attachment?: string;
}

export const SEED_QUOTES: QuoteSeed[] = [
  { id: 'q1', vendor: 'Rexel USA', description: 'Lighting package — troffers & MC cable', ref: 'QT-2026-0891', amount: 668.80, expiration: '2026-08-31', included: true, attachment: 'QT-2026-0891.pdf' },
  { id: 'q2', vendor: 'Graybar Electric', description: 'Alternate lighting package', ref: 'GBR-4429', amount: 510.00, expiration: '2026-08-15', included: false },
];

export interface SubSeed {
  id: string; name: string; scope: string; amount: number; included: boolean; attachment?: string;
}

export const SEED_SUBS: SubSeed[] = [
  { id: 's1', name: 'Southwest Fire Protection', scope: 'Fire alarm devices & controls', amount: 8400.00, included: true, attachment: 'southwest-quote.pdf' },
  { id: 's2', name: 'DataTech Structured Cabling', scope: 'CAT6 cabling & patch panels', amount: 3200.00, included: false },
];

/** Labor hours carried from the takeoff into the crew allocation. */
export const TAKEOFF_LABOR_HOURS = 99.64;

/** Default building area used until the estimator sets one. */
export const DEFAULT_SQUARE_FEET = 4200;

/** Labor cost of the default crew template at the takeoff hours. */
export function defaultCrewCost(): number {
  return computeCrew(
    CREW_TEMPLATES[0].rows.map((r, i) => ({ ...r, id: `seed-${i}` })),
    TAKEOFF_LABOR_HOURS,
  ).costTotal;
}
