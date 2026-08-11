import {
  BidTotals, CategoryRateMap, CostCategoryId, TaxSettings, DEFAULT_TAX_SETTINGS, COST_CATEGORIES,
} from './costing';
import { ScopeSelection, FULL_SCOPE, areaLabel, systemLabel } from './bidScope';

/**
 * Bid Summaries — one master estimate, several priced bids.
 *
 * A project has ONE estimate and ONE takeoff. What varies is how much of it a
 * given bid covers and what financial treatment that bid gets: Base Bid, Fire
 * Alarm Alternate, Lighting Only, Service Alternate. Each is an independent
 * priced result with its own overhead, profit, tax and bond — and each one
 * *references* parts of the master rather than copying them.
 *
 * That reference-not-copy rule is the whole architecture. Duplicating the
 * estimate per alternate is the obvious shortcut and it is wrong: a material
 * price fixed after the split reaches one bid and not the others, and nobody
 * finds out until the numbers are compared in a meeting.
 *
 * This replaces the earlier arrangement where an Area/System selection *was*
 * the proposal unit. Three layers, not two:
 *
 *   Master Estimate → Bid Summary (scope + its own financials) → Proposal
 *
 * Area, System and Bid Package define what belongs *inside* a summary. They are
 * not bids themselves and must not be collapsed back into one.
 */

/**
 * Bid packages, as a GC's bid form names them.
 *
 * A flat list today. A project-level Breakdown / Labels manager can supply this
 * later — the summary stores the value, not the vocabulary, so replacing the
 * source of these strings does not touch the pricing or the proposal.
 */
export const BID_PACKAGES = ['Base Bid', 'Alternate 1', 'Alternate 2', 'Value Engineering'];

/**
 * What work a summary covers.
 *
 * `areas` and `systems` are the *price filter* — empty means all of that
 * dimension, the same convention `ScopeSelection` uses.
 *
 * `includes` is which cost categories reach the bid. It is **not** edited in Edit
 * Scope: the include checkbox already lives on each row of the Overview's
 * financial table, which is where an estimator is looking when they decide a
 * category is out. Two editors for one value is how they end up disagreeing.
 *
 * There is deliberately no `excludes` here. Customer-facing exclusions are the
 * Proposal Center's own Excludes section — a summary carrying a second, separate
 * exclusion list meant the same statement had two homes and no single answer.
 */
export interface SummaryScope {
  bidPackage: string;
  areas: string[];
  systems: string[];
  includes: CostCategoryId[];
}

export const ALL_INCLUDED: CostCategoryId[] = [...COST_CATEGORIES];

export function defaultScope(bidPackage = BID_PACKAGES[0]): SummaryScope {
  return { bidPackage, areas: [], systems: [], includes: [...ALL_INCLUDED] };
}

export type SummaryStatus = 'draft' | 'ready' | 'submitted';

export const SUMMARY_STATUS_CFG: Record<SummaryStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  ready:     { label: 'Ready',    color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  submitted: { label: 'Submitted', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
};

export interface BidSummary {
  id: string;
  name: string;
  /**
   * The Base Bid cannot be deleted — a project always has a base price, and a
   * proposal referencing a deleted summary would have nothing to quote. It can
   * still be renamed; the protection is about existence, not the label.
   */
  protected?: boolean;
  scope: SummaryScope;
  /** Per-category overhead and profit. Absent entries inherit the bid rate. */
  rates: CategoryRateMap;
  tax: TaxSettings;
  /** Bond premium applies to this summary. Bonds are quoted per bid, not per job. */
  bond: boolean;
  status: SummaryStatus;
}

/** The scope filter, in the shape `scopedCosts` already understands. */
export function scopeSelectionOf(s: BidSummary): ScopeSelection {
  return { areas: s.scope.areas, systems: s.scope.systems };
}

export function newSummary(name: string, seedFrom?: BidSummary): BidSummary {
  return {
    id: `sum-${nextSummarySeq()}`,
    name,
    /*
     * A new summary starts from the master estimate, not from a copy of another
     * summary's numbers — but it does inherit the *settings* of the one it was
     * created beside, because an estimator adding an alternate almost always
     * wants the same markups they just set.
     */
    scope: seedFrom
      ? { ...seedFrom.scope, areas: [...seedFrom.scope.areas], systems: [...seedFrom.scope.systems], includes: [...seedFrom.scope.includes] }
      : defaultScope(),
    rates: seedFrom ? JSON.parse(JSON.stringify(seedFrom.rates)) : {},
    tax: seedFrom ? JSON.parse(JSON.stringify(seedFrom.tax)) : { ...DEFAULT_TAX_SETTINGS },
    bond: seedFrom ? seedFrom.bond : true,
    status: 'draft',
  };
}

/**
 * Counter-based ids.
 *
 * Not derived from the name: two summaries can legitimately be called the same
 * thing mid-edit, and a proposal holds summary *ids* — a collision there would
 * silently repoint a sent proposal at different work.
 */
let summarySeq = 0;
export function nextSummarySeq(): number {
  summarySeq += 1;
  return summarySeq;
}

export function initialSummaries(): BidSummary[] {
  return [
    {
      id: 'sum-base',
      name: 'Base Bid',
      protected: true,
      scope: { bidPackage: 'Base Bid', areas: [], systems: [], includes: [...ALL_INCLUDED] },
      rates: {},
      tax: { ...DEFAULT_TAX_SETTINGS },
      bond: true,
      status: 'ready',
    },
    {
      id: 'sum-fa',
      name: 'Fire Alarm Alternate',
      scope: { bidPackage: 'Alternate 1', areas: [], systems: ['fire-alarm'], includes: [...ALL_INCLUDED] },
      rates: { material: { overhead: 8, profit: 10 } },
      tax: { ...DEFAULT_TAX_SETTINGS },
      bond: false,
      status: 'draft',
    },
    {
      id: 'sum-lighting',
      name: 'Lighting Only',
      scope: { bidPackage: 'Alternate 2', areas: [], systems: ['lighting'], includes: [...ALL_INCLUDED] },
      rates: {},
      tax: { ...DEFAULT_TAX_SETTINGS },
      bond: false,
      status: 'draft',
    },
    {
      id: 'sum-service',
      name: 'Service Alternate',
      scope: { bidPackage: 'Alternate 2', areas: ['floor-2'], systems: ['service'], includes: [...ALL_INCLUDED] },
      rates: {},
      tax: { ...DEFAULT_TAX_SETTINGS },
      bond: false,
      status: 'draft',
    },
  ];
}

// ─── Display ──────────────────────────────────────────────────────────────────

export const scopeAreaLabels = (s: SummaryScope) =>
  (s.areas.length ? s.areas.map(areaLabel) : ['All Areas']);

export const scopeSystemLabels = (s: SummaryScope) =>
  (s.systems.length ? s.systems.map(systemLabel) : ['All Systems']);

/** One-line area summary for a table cell. */
export const areasText = (s: SummaryScope) => scopeAreaLabels(s).join(', ');
export const systemsText = (s: SummaryScope) => scopeSystemLabels(s).join(', ');

// ─── Priced summaries ─────────────────────────────────────────────────────────

/**
 * A summary and the numbers it currently produces.
 *
 * Priced by the caller, because only the Bid Builder holds the tagged estimate
 * and the crew mix. Kept together so every consumer — the selector cards, the
 * comparison table, the proposal — reads one computed result rather than each
 * re-deriving it and drifting.
 */
export interface PricedSummary {
  summary: BidSummary;
  totals: BidTotals;
  /** Labor hours this summary carries, for the comparison table. */
  laborHours: number;
}

/** What the customer is quoted for a summary: its sell price, and the tax in it. */
export function lumpSumOf(p: PricedSummary): { exTax: number; tax: number; total: number } {
  return {
    exTax: p.totals.sellPrice - p.totals.tax,
    tax: p.totals.tax,
    total: p.totals.sellPrice,
  };
}
