/**
 * Bid guardrails.
 *
 * A single rule set, run before a bid is submitted and before a proposal is
 * exported or sent. Every issue names the specific thing that is wrong — a
 * generic "bid incomplete" tells an estimator nothing they can act on.
 *
 * Only a missing required financial input blocks. Everything else is a warning
 * the estimator can acknowledge and proceed past deliberately.
 */

export type Severity = 'blocking' | 'warning';

export type IssueCategory =
  | 'Quotes' | 'Material' | 'Markup' | 'Tax' | 'Expenses' | 'Proposal' | 'Labor';

export interface ValidationIssue {
  id: string;
  severity: Severity;
  category: IssueCategory;
  /** The exact problem, in the estimator's language. */
  message: string;
  /** Where to go to fix it. */
  fixLabel?: string;
  fixPage?: string;
  /**
   * How the app can resolve this without the estimator leaving the review.
   * Present only where a defensible automatic answer exists — a price book
   * rate, a company default. Never a made-up number.
   */
  autoFix?: {
    /** Discriminator the host maps to an action. */
    kind: 'price-from-book' | 'exclude-line' | 'restore-markup-default' | 'restore-tax-default';
    /** Button text, e.g. "Use price book $3.80". */
    label: string;
    /** What the fix will actually do, shown under the button. */
    detail: string;
    /** Row / field the fix applies to. */
    target: string;
  };
}

export interface ValidationContext {
  /** Priced items with no unit price. */
  itemsMissingPrice: {
    description: string;
    code: string;
    /** Row id, so a fix can be applied to the right line. */
    id?: string;
    /**
     * Price book rate available for this line. When present the review can
     * resolve the issue in place; when 0 only a human can settle it.
     */
    priceBookRate?: number;
  }[];
  /**
   * Systems present in the takeoff that a supplier quote is normally required
   * for, and whether a matching quote has been entered.
   */
  requiredQuotes: { system: string; hasQuote: boolean; critical?: boolean }[];
  /** Direct job expenses ticked as included but left at zero. */
  includedExpensesWithoutValue: string[];
  /** Markup values by label; null means the estimator cleared it. */
  markup: { label: string; value: number | null; required: boolean }[];
  /** Sales tax rate, and whether a tax region has been resolved. */
  taxRate: number | null;
  taxRegion: string | null;
  /** Crew allocation total — 100 means balanced. */
  crewAllocationTotal?: number;
  /** Proposal sections and whether they have content. */
  proposalSections: { title: string; filled: boolean; required: boolean }[];
  /** Proposal breakdown rows included in the total. */
  proposalBreakdownRows: number;
}

export function validate(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // ── Material — a missing price understates the bid, so it blocks ──────────
  for (const item of ctx.itemsMissingPrice) {
    const rate = item.priceBookRate ?? 0;
    issues.push({
      id: `material-${item.code}`,
      severity: 'blocking',
      category: 'Material',
      message: `${item.description} (${item.code}) has no unit price — the material total is understated.`,
      fixLabel: 'Price it',
      fixPage: 'pricing',
      autoFix: item.id
        ? rate > 0
          ? {
            kind: 'price-from-book',
            label: `Use price book — $${rate.toFixed(2)}`,
            detail: 'Prices the line from the company price book and marks it complete.',
            target: item.id,
          }
          : {
            kind: 'exclude-line',
            label: 'Exclude from bid',
            detail: 'No price book rate exists. Excluding the line keeps the total honest.',
            target: item.id,
          }
        : undefined,
    });
  }

  // ── Quotes — named by the system that needs one ───────────────────────────
  for (const q of ctx.requiredQuotes) {
    if (q.hasQuote) continue;
    issues.push({
      id: `quote-${q.system.toLowerCase().replace(/\s+/g, '-')}`,
      severity: 'warning',
      category: 'Quotes',
      message: `${q.system} is included in the project, but no ${q.system.toLowerCase()} quote has been entered.`,
      fixLabel: 'Add quote',
      fixPage: 'bid-builder',
    });
  }

  // ── Direct job expenses ───────────────────────────────────────────────────
  for (const label of ctx.includedExpensesWithoutValue) {
    issues.push({
      id: `expense-${label.toLowerCase().replace(/\s+/g, '-')}`,
      severity: 'warning',
      category: 'Expenses',
      message: `"${label}" is ticked as included in Direct Job Expenses but has no value entered.`,
      fixLabel: 'Set amount',
      fixPage: 'bid-builder',
    });
  }

  // ── Markup — required financial input, so it blocks ───────────────────────
  for (const m of ctx.markup) {
    if (!m.required) continue;
    if (m.value === null || Number.isNaN(m.value)) {
      issues.push({
        id: `markup-${m.label.toLowerCase().replace(/\s+/g, '-')}`,
        severity: 'blocking',
        category: 'Markup',
        message: `${m.label} has no value — the bid cannot be priced without it.`,
        fixLabel: 'Set markup',
        fixPage: 'bid-builder',
        autoFix: {
          kind: 'restore-markup-default',
          label: 'Restore company default',
          detail: `Puts ${m.label} back to the company baseline in Settings.`,
          target: m.label,
        },
      });
    }
  }

  // ── Tax — required financial input ────────────────────────────────────────
  if (ctx.taxRate === null || Number.isNaN(ctx.taxRate)) {
    issues.push({
      id: 'tax-rate',
      severity: 'blocking',
      category: 'Tax',
      message: 'No sales tax rate is set — material and quote tax cannot be calculated.',
      fixLabel: 'Set tax',
      fixPage: 'bid-builder',
      autoFix: {
        kind: 'restore-tax-default',
        label: 'Restore company default',
        detail: 'Puts the sales tax rate back to the company baseline in Settings.',
        target: 'taxRate',
      },
    });
  } else if (!ctx.taxRegion) {
    issues.push({
      id: 'tax-region',
      severity: 'warning',
      category: 'Tax',
      message: `A tax rate of ${ctx.taxRate}% is applied but no tax region is recorded for the project.`,
      fixLabel: 'Set region',
      fixPage: 'settings',
    });
  }

  // ── Labor ─────────────────────────────────────────────────────────────────
  if (ctx.crewAllocationTotal !== undefined && Math.abs(ctx.crewAllocationTotal - 100) >= 0.01) {
    const short = ctx.crewAllocationTotal < 100;
    issues.push({
      id: 'crew-allocation',
      severity: 'warning',
      category: 'Labor',
      message: `Crew allocation totals ${ctx.crewAllocationTotal.toFixed(2)}% — ${
        short ? `${(100 - ctx.crewAllocationTotal).toFixed(2)}% of labor hours are unassigned` : 'labor hours are over-assigned'
      }.`,
      fixLabel: 'Fix allocation',
      fixPage: 'bid-builder',
    });
  }

  // ── Proposal ──────────────────────────────────────────────────────────────
  for (const sec of ctx.proposalSections) {
    if (sec.filled || !sec.required) continue;
    issues.push({
      id: `proposal-${sec.title.toLowerCase().replace(/[^a-z]+/g, '-')}`,
      severity: 'warning',
      category: 'Proposal',
      message: `The proposal's "${sec.title}" section is empty — it is normally required before sending.`,
      fixLabel: 'Write it',
      fixPage: 'proposal-center',
    });
  }

  if (ctx.proposalBreakdownRows === 0) {
    issues.push({
      id: 'proposal-breakdown',
      severity: 'warning',
      category: 'Proposal',
      message: 'The proposal breakdown has no included sections, so the recipient sees a total with no detail.',
      fixLabel: 'Add a section',
      fixPage: 'proposal-center',
    });
  }

  return issues;
}

export function countBySeverity(issues: ValidationIssue[]) {
  return {
    blocking: issues.filter((i) => i.severity === 'blocking').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
  };
}

/** Submission is blocked only by a missing required financial input. */
export function isBlocked(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'blocking');
}

export const CATEGORY_COLOR: Record<IssueCategory, { color: string; bg: string }> = {
  Quotes:   { color: '#0EA5E9', bg: '#F0F9FF' },
  Material: { color: '#2563EB', bg: '#EFF6FF' },
  Markup:   { color: '#7C3AED', bg: '#F5F3FF' },
  Tax:      { color: '#0891B2', bg: '#ECFEFF' },
  Expenses: { color: '#D97706', bg: '#FFFBEB' },
  Proposal: { color: '#16A34A', bg: '#F0FDF4' },
  Labor:    { color: '#16A34A', bg: '#F0FDF4' },
};
