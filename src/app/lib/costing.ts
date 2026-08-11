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
  /** Pennsylvania 6% plus Philadelphia's 2% — the company's home jurisdiction. */
  taxRate: 8,
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

/**
 * The cost categories an estimator prices and marks up.
 *
 * Named here rather than in the Bid Builder because the arithmetic that splits
 * overhead and profit across them lives here, and a category the engine does
 * not know about is a category that silently earns nothing.
 */
export type CostCategoryId =
  | 'material' | 'labor' | 'quotes' | 'subs' | 'expenses' | 'equipment' | 'bond';

export const CATEGORY_LABELS: Record<CostCategoryId, string> = {
  material: 'Materials',
  labor: 'Labor',
  quotes: 'Supplier quotes',
  subs: 'Subcontractors',
  expenses: 'Job expenses',
  equipment: 'Equipment rental',
  bond: 'Bond',
};

export const COST_CATEGORIES = Object.keys(CATEGORY_LABELS) as CostCategoryId[];

export interface CategoryRates {
  overhead: number;
  profit: number;
}

/**
 * Per-category overhead and profit.
 *
 * An absent entry inherits the bid's rate, which is what makes a deliberate 0%
 * different from an untouched category: pass-through subcontract work carrying
 * no overhead is a decision, and it has to survive a change to the bid default.
 */
export type CategoryRateMap = Partial<Record<CostCategoryId, Partial<CategoryRates>>>;

/**
 * Which categories sales tax is charged on, and whether it is charged at all.
 *
 * Goods are taxable and services are not in most jurisdictions, which is the
 * default below — but "most" is not "all": several states tax installation
 * labor, and a resale or exemption certificate takes material out of the base
 * on a job that would otherwise be textbook. So the basis is per bid, and the
 * whole thing switches off for a tax-exempt owner.
 */
export interface TaxSettings {
  /** Off means no tax on this bid, whatever the rate on record says. */
  enabled: boolean;
  /** Category → in the taxable base. Absent falls back to DEFAULT_TAXABLE. */
  taxable: Partial<Record<CostCategoryId, boolean>>;
  /**
   * Category → its own tax rate. Absent inherits the bid rate.
   *
   * Same inherit-vs-explicit distinction the overhead and profit rates use, and
   * for the same reason: a category taxed at a different rate is a fact about
   * the job — a reduced rate on equipment, a municipal surcharge on materials —
   * and it has to survive someone changing the bid's headline rate.
   */
  rates: Partial<Record<CostCategoryId, number>>;
}

export const DEFAULT_TAXABLE: Record<CostCategoryId, boolean> = {
  material: true,
  labor: false,
  quotes: true,
  subs: false,
  expenses: false,
  equipment: false,
  bond: false,
};

export const DEFAULT_TAX_SETTINGS: TaxSettings = { enabled: true, taxable: {}, rates: {} };

export function isTaxable(settings: TaxSettings, id: CostCategoryId): boolean {
  return settings.enabled && (settings.taxable[id] ?? DEFAULT_TAXABLE[id]);
}

/** The rate a category is taxed at — its own if set, the bid's otherwise. */
export function taxRateFor(settings: TaxSettings, id: CostCategoryId, bidRate: number): number {
  return settings.rates?.[id] ?? bidRate;
}

export interface CategoryLine {
  id: CostCategoryId;
  label: string;
  /** Cost after the category's own markup, before tax. */
  cost: number;
  taxable: boolean;
  tax: number;
  /** The rate this category's tax was charged at. */
  taxRate: number;
  /** True where that rate came from the bid rather than this category. */
  taxRateInherited: boolean;
  overheadPct: number;
  overhead: number;
  profitPct: number;
  profit: number;
  /** cost + tax + overhead + profit. The row's contribution to the bid. */
  sell: number;
  /** True where the rate came from the bid rather than this category. */
  overheadInherited: boolean;
  profitInherited: boolean;
}

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
  /** Every category, priced. The rows sum to the bid. */
  categories: CategoryLine[];
  totalBid: number;
  /** Alias of totalBid — the label the Bid Summary header uses. */
  sellPrice: number;
  /** Profit as a share of the total bid price. */
  profitPct: number;
  /** Sell price less what the job costs including tax. */
  returnAmt: number;
  /** Margin on cost: (sell − raw cost with tax) / raw cost with tax. */
  returnPct: number;
  pricePerSqFt: number;
  squareFeet: number;
}

export function computeBid(
  inputs: BidInputs,
  markup: MarkupSet,
  rates: CategoryRateMap = {},
  taxSettings: TaxSettings = DEFAULT_TAX_SETTINGS,
): BidTotals {
  const pct = (v: number) => (Number.isFinite(v) ? v : 0) / 100;

  const materialMarkupAmt = inputs.materialCost * pct(markup.materialMarkup);
  const materialSell = inputs.materialCost + materialMarkupAmt;
  const laborMarkupAmt = inputs.laborCost * pct(markup.laborMarkup);
  const laborSell = inputs.laborCost + laborMarkupAmt;

  const equipmentRental = inputs.equipmentRental ?? 0;
  const bond = inputs.bond ?? 0;
  const adjustments = inputs.adjustments ?? 0;

  /*
   * Overhead and profit are charged per category rather than on one lump.
   *
   * The arithmetic per row is the same shape the bid has always used — overhead
   * on cost including that row's tax, profit on cost plus overhead — so when
   * every category sits on the bid's rate the totals are identical to charging
   * once at the bottom. What changes is that a category can now carry its own
   * rate, including zero, without disturbing any other.
   *
   * Which categories carry sales tax is a per-bid decision — see TaxSettings.
   * The default is goods only (material and supplier quotes), which is right in
   * most jurisdictions and wrong in enough of them to be worth a checkbox.
   */
  const spec: { id: CostCategoryId; cost: number }[] = [
    { id: 'material',  cost: materialSell },
    { id: 'labor',     cost: laborSell },
    { id: 'quotes',    cost: inputs.quotesCost },
    { id: 'subs',      cost: inputs.subcontractorCost },
    { id: 'expenses',  cost: inputs.directJobExpenses },
    { id: 'equipment', cost: equipmentRental },
    { id: 'bond',      cost: bond },
  ];

  const categories: CategoryLine[] = spec.map((c) => {
    const own = rates[c.id];
    const overheadInherited = own?.overhead === undefined;
    const profitInherited = own?.profit === undefined;
    const overheadPct = overheadInherited ? markup.overhead : own!.overhead!;
    const profitPct = profitInherited ? markup.profit : own!.profit!;

    const taxable = isTaxable(taxSettings, c.id);
    const taxRateInherited = taxSettings.rates?.[c.id] === undefined;
    const taxRate = taxRateFor(taxSettings, c.id, markup.taxRate);
    const tax = taxable ? c.cost * pct(taxRate) : 0;
    const overhead = (c.cost + tax) * pct(overheadPct);
    const profit = (c.cost + tax + overhead) * pct(profitPct);

    return {
      id: c.id,
      label: CATEGORY_LABELS[c.id],
      cost: c.cost,
      taxable,
      tax,
      taxRate,
      taxRateInherited,
      overheadPct,
      overhead,
      profitPct,
      profit,
      sell: c.cost + tax + overhead + profit,
      overheadInherited,
      profitInherited,
    };
  });

  const sum = (pick: (l: CategoryLine) => number) => categories.reduce((a, l) => a + pick(l), 0);

  const rawCost = sum((l) => l.cost) + adjustments;
  const taxableBase = categories.filter((l) => l.taxable).reduce((a, l) => a + l.cost, 0);
  const tax = sum((l) => l.tax);
  const rawCostWithTax = rawCost + tax;

  const overheadAmt = sum((l) => l.overhead);
  const profitAmt = sum((l) => l.profit);
  // Contingency stays a bid-level allowance — it is not earned by a category.
  const contingencyAmt = rawCostWithTax * pct(markup.contingency);

  const totalBid = sum((l) => l.sell) + adjustments + contingencyAmt;
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
    categories,
    totalBid,
    sellPrice: totalBid,
    profitPct: totalBid > 0 ? (profitAmt / totalBid) * 100 : 0,
    returnAmt: totalBid - rawCostWithTax,
    returnPct: rawCostWithTax > 0 ? ((totalBid - rawCostWithTax) / rawCostWithTax) * 100 : 0,
    pricePerSqFt: squareFeet > 0 ? totalBid / squareFeet : 0,
    squareFeet,
  };
}

// ─── Crew allocation ──────────────────────────────────────────────────────────

/**
 * One crew role's rate build-up.
 *
 * The hourly cost is not a single number the estimator types — it is assembled
 * from a base rate, a burden percentage and a fringe benefit, because that is
 * how a union or Davis-Bacon rate is actually quoted and audited.
 */
export interface CrewRow {
  id: string;
  role: string;
  /** Share of total labor hours, as a percentage. Must sum to 100. */
  allocation: number;
  /** The bare wage, before burden or fringe. */
  baseRate: number;
  /**
   * Payroll taxes, workers' comp and unemployment, as a percentage.
   *
   * Charged on the base rate ONLY — never on fringe, and never on markup.
   * Compounding it onto fringe is the mistake this structure exists to prevent.
   */
  burdenPct: number;
  /**
   * Fringe benefit as a flat hourly dollar amount — the Davis-Bacon / union
   * form. Left at 0 on open-shop work, where the whole fringe pair is blank.
   */
  fringeDollars: number;
  /** A percentage *of the fringe dollars*, not of the base rate. */
  fringePct: number;
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
      { role: 'Foreman',       allocation: 15, baseRate: 62, burdenPct: 28, fringeDollars: 12,   fringePct: 2.5 },
      { role: 'Journeyman',    allocation: 55, baseRate: 54, burdenPct: 28, fringeDollars: 12,   fringePct: 2.5 },
      { role: 'Apprentice',    allocation: 25, baseRate: 33, burdenPct: 28, fringeDollars: 8.5,  fringePct: 2.5 },
      { role: 'General Labor', allocation: 5,  baseRate: 25, burdenPct: 22, fringeDollars: 0,    fringePct: 0 },
    ],
  },
  {
    id: 'service-work',
    name: 'Service work',
    rows: [
      { role: 'Foreman',    allocation: 25, baseRate: 62, burdenPct: 28, fringeDollars: 12, fringePct: 2.5 },
      { role: 'Journeyman', allocation: 75, baseRate: 54, burdenPct: 28, fringeDollars: 12, fringePct: 2.5 },
    ],
  },
  {
    id: 'ground-up',
    name: 'Ground-up construction',
    rows: [
      { role: 'Foreman',       allocation: 10, baseRate: 62, burdenPct: 28, fringeDollars: 12,  fringePct: 2.5 },
      { role: 'Journeyman',    allocation: 45, baseRate: 54, burdenPct: 28, fringeDollars: 12,  fringePct: 2.5 },
      { role: 'Apprentice',    allocation: 35, baseRate: 33, burdenPct: 28, fringeDollars: 8.5, fringePct: 2.5 },
      { role: 'General Labor', allocation: 10, baseRate: 25, burdenPct: 22, fringeDollars: 0,   fringePct: 0 },
    ],
  },
  {
    id: 'open-shop',
    name: 'Open shop (no fringe)',
    rows: [
      { role: 'Foreman',       allocation: 20, baseRate: 58, burdenPct: 26, fringeDollars: 0, fringePct: 0 },
      { role: 'Journeyman',    allocation: 55, baseRate: 46, burdenPct: 26, fringeDollars: 0, fringePct: 0 },
      { role: 'Apprentice',    allocation: 25, baseRate: 28, burdenPct: 26, fringeDollars: 0, fringePct: 0 },
    ],
  },
];

export interface CrewLine extends CrewRow {
  hours: number;
  /** Burden in dollars per hour — the row's burden quantification column. */
  burdenAmount: number;
  /** The fringe percentage in dollars per hour, taken off the fringe dollars. */
  fringeAmount: number;
  /** Base + burden + fringe: what one hour of this role actually costs. */
  loadedRate: number;
  extCost: number;
}

/** Assembles one role's fully burdened hourly rate from its parts. */
export function crewRate(r: CrewRow): {
  burdenAmount: number; fringeAmount: number; loadedRate: number;
} {
  const num = (v: number) => (Number.isFinite(v) ? v : 0);
  const base = num(r.baseRate);
  const fringe = num(r.fringeDollars);
  // Burden hits the base rate alone; the fringe percentage hits the fringe dollars.
  const burdenAmount = base * (num(r.burdenPct) / 100);
  const fringeAmount = fringe * (num(r.fringePct) / 100);
  return { burdenAmount, fringeAmount, loadedRate: base + burdenAmount + fringe + fringeAmount };
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
  /** Blended loaded rate across the included crew — cost ÷ hours. */
  blendedRate: number;
  balanced: boolean;
} {
  const inBid = (r: CrewRow) => r.included !== false;
  const lines = rows.map((r) => {
    const hours = inBid(r) ? totalHours * (r.allocation / 100) : 0;
    const rate = crewRate(r);
    return { ...r, hours, ...rate, extCost: hours * rate.loadedRate };
  });
  const allocationTotal = rows
    .filter(inBid)
    .reduce((s, r) => s + (Number.isFinite(r.allocation) ? r.allocation : 0), 0);
  const hoursTotal = lines.reduce((s, l) => s + l.hours, 0);
  const costTotal = lines.reduce((s, l) => s + l.extCost, 0);
  return {
    lines,
    allocationTotal,
    hoursTotal,
    costTotal,
    blendedRate: hoursTotal > 0 ? costTotal / hoursTotal : 0,
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
