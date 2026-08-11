/**
 * Sales tax regions.
 *
 * Every US state, plus the District of Columbia, with the state-level rate and a
 * typical combined rate once average local taxes are added. An estimator picks
 * the state and, where the job sits in a county or city that adds its own
 * percentage, types that on top in the custom field — which is why `custom`
 * exists as a separate number rather than being folded into the region.
 *
 * `stateRate` is the statutory state rate. `typicalCombined` is the state rate
 * plus a representative local average, which is the figure that actually shows
 * up on an invoice in most of the state. They are equal where a state has no
 * local sales tax.
 *
 * These are baselines for pricing a bid, not a tax filing. Rates move, and a
 * specific address can differ from its state average — RATES_AS_OF is carried
 * through to the UI so nobody treats a stale figure as authoritative. The five
 * NOMAD states (no state sales tax) are included with 0% so they can be selected
 * deliberately rather than looking like missing data.
 */

export const RATES_AS_OF = 'January 2026';

export interface TaxRegion {
  /** Two-letter postal code, or 'DC'. */
  code: string;
  name: string;
  stateRate: number;
  typicalCombined: number;
  note?: string;
}

export const TAX_REGIONS: TaxRegion[] = [
  { code: 'AL', name: 'Alabama',              stateRate: 4.000, typicalCombined: 9.29,  note: 'Local rates are among the highest in the country' },
  { code: 'AK', name: 'Alaska',               stateRate: 0.000, typicalCombined: 1.82,  note: 'No state sales tax — boroughs and cities levy their own' },
  { code: 'AZ', name: 'Arizona',              stateRate: 5.600, typicalCombined: 8.38 },
  { code: 'AR', name: 'Arkansas',             stateRate: 6.500, typicalCombined: 9.46 },
  { code: 'CA', name: 'California',           stateRate: 7.250, typicalCombined: 8.85,  note: 'Highest state rate; district taxes push some cities past 10.75%' },
  { code: 'CO', name: 'Colorado',             stateRate: 2.900, typicalCombined: 7.86,  note: 'Home-rule cities administer their own tax' },
  { code: 'CT', name: 'Connecticut',          stateRate: 6.350, typicalCombined: 6.35,  note: 'No local sales tax' },
  { code: 'DE', name: 'Delaware',             stateRate: 0.000, typicalCombined: 0.00,  note: 'No sales tax' },
  { code: 'DC', name: 'District of Columbia', stateRate: 6.000, typicalCombined: 6.00 },
  { code: 'FL', name: 'Florida',              stateRate: 6.000, typicalCombined: 7.00,  note: 'County discretionary surtax on top' },
  { code: 'GA', name: 'Georgia',              stateRate: 4.000, typicalCombined: 7.42 },
  { code: 'HI', name: 'Hawaii',               stateRate: 4.000, typicalCombined: 4.50,  note: 'General excise tax, not a true sales tax' },
  { code: 'ID', name: 'Idaho',                stateRate: 6.000, typicalCombined: 6.03 },
  { code: 'IL', name: 'Illinois',             stateRate: 6.250, typicalCombined: 8.86,  note: 'Chicago is among the highest large-city rates' },
  { code: 'IN', name: 'Indiana',              stateRate: 7.000, typicalCombined: 7.00,  note: 'No local sales tax' },
  { code: 'IA', name: 'Iowa',                 stateRate: 6.000, typicalCombined: 6.94 },
  { code: 'KS', name: 'Kansas',               stateRate: 6.500, typicalCombined: 8.75 },
  { code: 'KY', name: 'Kentucky',             stateRate: 6.000, typicalCombined: 6.00,  note: 'No local sales tax' },
  { code: 'LA', name: 'Louisiana',            stateRate: 5.000, typicalCombined: 10.11, note: 'Highest average combined rate in the country' },
  { code: 'ME', name: 'Maine',                stateRate: 5.500, typicalCombined: 5.50,  note: 'No local sales tax' },
  { code: 'MD', name: 'Maryland',             stateRate: 6.000, typicalCombined: 6.00,  note: 'No local sales tax' },
  { code: 'MA', name: 'Massachusetts',        stateRate: 6.250, typicalCombined: 6.25,  note: 'No local sales tax' },
  { code: 'MI', name: 'Michigan',             stateRate: 6.000, typicalCombined: 6.00,  note: 'No local sales tax' },
  { code: 'MN', name: 'Minnesota',            stateRate: 6.875, typicalCombined: 8.13 },
  { code: 'MS', name: 'Mississippi',          stateRate: 7.000, typicalCombined: 7.06 },
  { code: 'MO', name: 'Missouri',             stateRate: 4.225, typicalCombined: 8.39 },
  { code: 'MT', name: 'Montana',              stateRate: 0.000, typicalCombined: 0.00,  note: 'No sales tax' },
  { code: 'NE', name: 'Nebraska',             stateRate: 5.500, typicalCombined: 6.97 },
  { code: 'NV', name: 'Nevada',               stateRate: 6.850, typicalCombined: 8.24 },
  { code: 'NH', name: 'New Hampshire',        stateRate: 0.000, typicalCombined: 0.00,  note: 'No sales tax' },
  { code: 'NJ', name: 'New Jersey',           stateRate: 6.625, typicalCombined: 6.60,  note: 'Urban Enterprise Zones charge half rate' },
  { code: 'NM', name: 'New Mexico',           stateRate: 4.875, typicalCombined: 7.62,  note: 'Gross receipts tax' },
  { code: 'NY', name: 'New York',             stateRate: 4.000, typicalCombined: 8.53,  note: 'New York City is 8.875%' },
  { code: 'NC', name: 'North Carolina',       stateRate: 4.750, typicalCombined: 7.00 },
  { code: 'ND', name: 'North Dakota',         stateRate: 5.000, typicalCombined: 7.04 },
  { code: 'OH', name: 'Ohio',                 stateRate: 5.750, typicalCombined: 7.24 },
  { code: 'OK', name: 'Oklahoma',             stateRate: 4.500, typicalCombined: 8.99 },
  { code: 'OR', name: 'Oregon',               stateRate: 0.000, typicalCombined: 0.00,  note: 'No sales tax' },
  { code: 'PA', name: 'Pennsylvania',         stateRate: 6.000, typicalCombined: 6.34,  note: 'Philadelphia 8%, Allegheny County 7%' },
  { code: 'RI', name: 'Rhode Island',         stateRate: 7.000, typicalCombined: 7.00,  note: 'No local sales tax' },
  { code: 'SC', name: 'South Carolina',       stateRate: 6.000, typicalCombined: 7.50 },
  { code: 'SD', name: 'South Dakota',         stateRate: 4.200, typicalCombined: 6.11 },
  { code: 'TN', name: 'Tennessee',            stateRate: 7.000, typicalCombined: 9.55 },
  { code: 'TX', name: 'Texas',                stateRate: 6.250, typicalCombined: 8.20,  note: 'Local add-ons capped at 2%' },
  { code: 'UT', name: 'Utah',                 stateRate: 6.100, typicalCombined: 7.25,  note: 'State rate includes a mandatory 1.25% local share' },
  { code: 'VT', name: 'Vermont',              stateRate: 6.000, typicalCombined: 6.36 },
  { code: 'VA', name: 'Virginia',             stateRate: 5.300, typicalCombined: 5.77,  note: 'Northern Virginia and Hampton Roads add 0.7%' },
  { code: 'WA', name: 'Washington',           stateRate: 6.500, typicalCombined: 9.38 },
  { code: 'WV', name: 'West Virginia',        stateRate: 6.000, typicalCombined: 6.57 },
  { code: 'WI', name: 'Wisconsin',            stateRate: 5.000, typicalCombined: 5.70 },
  { code: 'WY', name: 'Wyoming',              stateRate: 4.000, typicalCombined: 5.44 },
];

/** Which of the two published rates a bid is pricing against. */
export type RateBasis = 'state' | 'combined';

export function findRegion(code: string): TaxRegion | undefined {
  return TAX_REGIONS.find((r) => r.code === code);
}

export function baseRateOf(region: TaxRegion | undefined, basis: RateBasis): number {
  if (!region) return 0;
  return basis === 'state' ? region.stateRate : region.typicalCombined;
}

/**
 * The rate a bid actually charges: the region's published rate plus whatever
 * county or city percentage the estimator added on top.
 */
export function effectiveTaxRate(
  region: TaxRegion | undefined,
  basis: RateBasis,
  custom: number,
): number {
  const extra = Number.isFinite(custom) ? custom : 0;
  return Math.round((baseRateOf(region, basis) + extra) * 1000) / 1000;
}

/** Regions with no sales tax at all — worth saying out loud rather than showing 0%. */
export const NO_TAX_STATES = TAX_REGIONS.filter((r) => r.typicalCombined === 0).map((r) => r.code);
