import { useEffect, useState } from 'react';
import {
  BidTotals, BidInputs, MarkupSet, computeBid, effectiveMarkup, CREW_TEMPLATES, computeCrew,
  TAKEOFF_LABOR_HOURS, DEFAULT_SQUARE_FEET,
} from './costing';
import { materialTotal, onMaterialsChange, includedMaterialTotal } from './materials';
import {
  SEED_QUOTE_ROWS, SEED_SUB_ROWS, STANDARD_EXPENSE_LINES, SEED_EQUIPMENT,
  SEED_ADJUSTMENTS, costAmount, equipmentAmount, adjustmentNet,
} from '../components/bid/bidData';

/**
 * The current bid, published for the screens downstream of it.
 *
 * The Proposal Center used to carry its own hard-coded section amounts, so it
 * quoted a different figure from the Bid Builder for the same job. The bid is
 * the authority: it publishes here whenever its numbers move, and the proposal
 * reads this rather than inventing a total.
 *
 * A module store rather than context because the two screens are siblings that
 * are never mounted together — the proposal has to be able to read a bid it did
 * not watch being built.
 */

export interface BidBucket {
  id: string;
  label: string;
  /** Sell amount for this bucket, i.e. after its own markup. */
  amount: number;
  /** What the section covers, used to seed a proposal breakdown row. */
  description: string;
}

export interface BidSnapshot {
  totals: BidTotals;
  buckets: BidBucket[];
  /**
   * The inputs the totals came from, kept so the snapshot can be recomputed
   * when material prices change while the Bid Builder is not mounted — a price
   * fixed from the proposal review has to move the proposal's total.
   */
  inputs: BidInputs;
  markup: MarkupSet;
}

const BUCKET_COPY: Record<string, string> = {
  material: 'Materials supplied and installed as scheduled on the drawings.',
  labor: 'Installation labor at the crew mix and rates carried in this bid.',
  quotes: 'Equipment and materials priced from supplier quotations.',
  subs: 'Scope carried out by subcontractors under our coordination.',
  expenses: 'Direct job expenses — permits, fees, site running costs.',
  equipment: 'Access equipment and tooling hired for the duration of the works.',
  bond: 'Bond premium as required by the contract documents.',
  adjustments: 'Adjustments accepted against the base scope.',
};

/**
 * Builds the client-facing bucket list from a computed bid.
 *
 * The buckets carry cost, and they sum to raw cost. A proposal quotes the sell
 * price, so tax, overhead, profit and contingency are loaded across the buckets
 * pro rata rather than itemised — a client sees a priced schedule of work, not
 * the estimator's margin. The buckets therefore sum to the sell price exactly,
 * with the rounding residual placed on the largest one.
 */
export function bucketsFrom(totals: BidTotals): BidBucket[] {
  const raw: { id: string; label: string; cost: number }[] = [
    { id: 'material',    label: 'Materials',           cost: totals.materialSell },
    { id: 'labor',       label: 'Labor',               cost: totals.laborSell },
    { id: 'quotes',      label: 'Supplier quotes',     cost: totals.quotesCost },
    { id: 'subs',        label: 'Subcontractors',      cost: totals.subcontractorCost },
    { id: 'expenses',    label: 'Direct job expenses', cost: totals.directJobExpenses },
    { id: 'equipment',   label: 'Equipment rental',    cost: totals.equipmentRental },
    { id: 'bond',        label: 'Bond',                cost: totals.bond },
    { id: 'adjustments', label: 'Adjustments',         cost: totals.adjustments },
  ].filter((r) => r.cost !== 0);

  if (raw.length === 0) return [];

  // Load factor: what every dollar of cost has to sell for to reach the bid.
  const costBase = raw.reduce((sum, r) => sum + r.cost, 0);
  const factor = costBase !== 0 ? totals.sellPrice / costBase : 1;

  const buckets: BidBucket[] = raw.map((r) => ({
    id: r.id,
    label: r.label,
    amount: Math.round(r.cost * factor * 100) / 100,
    description: BUCKET_COPY[r.id] ?? '',
  }));

  // Put the rounding residual on the largest bucket so the schedule adds up.
  const summed = buckets.reduce((sum, b) => sum + b.amount, 0);
  const residual = Math.round((totals.sellPrice - summed) * 100) / 100;
  if (residual !== 0) {
    const largest = buckets.reduce((a, b) => (Math.abs(b.amount) > Math.abs(a.amount) ? b : a));
    largest.amount = Math.round((largest.amount + residual) * 100) / 100;
  }

  return buckets;
}

/**
 * The bid as it stands with nothing touched, so a proposal opened before the
 * Bid Builder still reads a real number rather than a placeholder.
 */
function defaultInputs(): BidInputs {
  return {
    materialCost: materialTotal(),
    laborCost: computeCrew(
      CREW_TEMPLATES[0].rows.map((r, i) => ({ ...r, id: `seed-${i}` })),
      TAKEOFF_LABOR_HOURS,
    ).costTotal,
    quotesCost: SEED_QUOTE_ROWS.filter((q) => q.included)
      .reduce((s, q) => s + costAmount(q.unitCost, 1, q.multiplier), 0),
    subcontractorCost: SEED_SUB_ROWS.filter((x) => x.included)
      .reduce((s, x) => s + costAmount(x.quotedCost, 1, x.multiplier), 0),
    directJobExpenses: STANDARD_EXPENSE_LINES.filter((e) => e.included)
      .reduce((s, e) => s + costAmount(e.unitCost, e.quantity, 1), 0),
    equipmentRental: SEED_EQUIPMENT.filter((e) => e.included)
      .reduce((s, e) => s + equipmentAmount(e), 0),
    bond: 0,
    adjustments: adjustmentNet(SEED_ADJUSTMENTS),
    squareFeet: DEFAULT_SQUARE_FEET,
  };
}

function defaultSnapshot(): BidSnapshot {
  const markup = effectiveMarkup({});
  const inputs = defaultInputs();
  const totals = computeBid(inputs, markup);
  return { totals, buckets: bucketsFrom(totals), inputs, markup };
}

let snapshot: BidSnapshot = defaultSnapshot();
const listeners = new Set<() => void>();

export function getBidSnapshot(): BidSnapshot {
  return snapshot;
}

/** Called by the Bid Builder whenever its totals change. */
export function publishBidSnapshot(next: BidSnapshot) {
  snapshot = next;
  for (const l of listeners) l();
}

/**
 * Material prices can change from outside the Bid Builder — the validation
 * review can price a line from the price book. Recompute with the last known
 * inputs so every screen reading this moves together.
 */
onMaterialsChange(() => {
  const inputs: BidInputs = { ...snapshot.inputs, materialCost: includedMaterialTotal() };
  const totals = computeBid(inputs, snapshot.markup);
  publishBidSnapshot({ totals, buckets: bucketsFrom(totals), inputs, markup: snapshot.markup });
});

export function useBidSnapshot(): BidSnapshot {
  const [snap, setSnap] = useState(snapshot);
  useEffect(() => {
    const listener = () => setSnap(snapshot);
    listeners.add(listener);
    listener();
    return () => { listeners.delete(listener); };
  }, []);
  return snap;
}
