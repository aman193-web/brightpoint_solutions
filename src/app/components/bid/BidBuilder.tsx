import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, ChevronUp, AlertTriangle, Check, Sparkles,
  Plus, Trash2, ArrowRight, X, RotateCcw, Info, Users,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProjectHeader } from '../projects/ProjectHeader';
import { ValidationReview } from '../common/ValidationReview';
import { validate, isBlocked, countBySeverity, ValidationIssue } from '../../lib/validation';
import {
  MarkupKey, MarkupOverrides, MARKUP_FIELDS, COMPANY_DEFAULTS, effectiveMarkup, isInherited,
  computeBid, BidTotals, CrewRow, CREW_ROLES, CREW_TEMPLATES, computeCrew,
  money, pct,
  TAKEOFF_LABOR_HOURS, DEFAULT_SQUARE_FEET,
} from '../../lib/costing';
import {
  MATERIAL_LINES, missingPriceLines, priceBookRate, applyPriceBook, excludeLine,
  useMaterialsRevision,
} from '../../lib/materials';
import { setCompanyDefault } from '../../lib/costing';
import { publishBidSnapshot, getBidSnapshot, bucketsFrom } from '../../lib/bidSnapshot';
import {
  QuoteRow, SEED_QUOTE_ROWS, SubRow, SEED_SUB_ROWS,
  ExpenseLine, STANDARD_EXPENSE_LINES, EquipmentRow, SEED_EQUIPMENT,
  BondRow, SEED_BONDS, AdjustmentRow, SEED_ADJUSTMENTS,
  costAmount, equipmentAmount, bondPremium, adjustmentNet,
} from './bidData';
import {
  QuotesTab, SubcontractorsTab, ExpensesTab, EquipmentTab, BondTab, TaxTab, AdjustmentsTab,
} from './BidCategoryTabs';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionType = 'material' | 'labour';
type Discipline = 'lighting' | 'power' | 'fire-alarm' | 'data' | 'safety' | 'general';

interface LineItem {
  id: string;
  description: string;
  qty: number;
  uom: string;
  unitCost: number;
  extCost: number;
  notes?: string;
  ai?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  approved?: boolean;
  locked?: boolean;
  discipline?: Discipline;
  /** Whether the line reaches the bid. Absent means included. */
  included?: boolean;
}

interface Section {
  id: SectionType;
  label: string;
  items: LineItem[];
  collapsed: boolean;
}

/**
 * The cost buckets the top sheet can switch in and out of the bid wholesale.
 * A bucket switched off zeroes its contribution without touching its rows, so
 * the estimator can price a scope out and back in without losing the detail.
 */
export type BucketId =
  | 'material' | 'labor' | 'quotes' | 'subs'
  | 'expenses' | 'equipment' | 'bond' | 'adjustments';

export const ALL_BUCKETS_IN: Record<BucketId, boolean> = {
  material: true, labor: true, quotes: true, subs: true,
  expenses: true, equipment: true, bond: true, adjustments: true,
};

interface HealthIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  action?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

/**
 * Material comes from the same priced lines the Pricing screen edits, so the
 * two screens can never quote different material figures for one job. Labor is
 * the crew allocation's business and lives on its own tab.
 */
const INIT_SECTIONS: Section[] = [
  {
    id: 'material', label: 'Material', collapsed: false,
    items: MATERIAL_LINES.map((r) => ({
      id: r.id,
      description: r.description,
      qty: r.qty,
      uom: r.uom,
      unitCost: r.selectedPrice,
      extCost: r.extMaterialCost,
      notes: r.notes,
      ai: r.status === 'ai-suggested',
      approved: r.status !== 'ai-suggested',
      locked: r.status === 'locked',
      // Pricing has no 'general' bucket; its five disciplines map straight over.
      discipline: r.discipline as Discipline,
      included: r.status !== 'excluded',
    })),
  },
];

const HEALTH_ISSUES: HealthIssue[] = [
  { type: 'error',   message: '1 item is missing a unit price — material total may be understated.', action: 'Go to Pricing' },
  { type: 'warning', message: '2 items have stale pricing (>90 days). Consider refreshing.', action: 'Refresh prices' },
  { type: 'warning', message: 'AI suggested smoke detectors are in the bid but unapproved — review before submitting.', action: 'Review AI items' },
  { type: 'info',    message: 'Contingency is below company baseline of 5%.', action: 'View policy' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────


// ─── Top sheet ────────────────────────────────────────────────────────────────

/**
 * McCormick's bid recap: every cost category, its markup, and the sell price it
 * rolls into. The bottom line lives in the sticky summary header above, so this
 * is the arithmetic behind it rather than a second scoreboard.
 */
function TopSheet({
  totals, markup, overrides, onMarkupChange, onResetKey, onResetAll,
  squareFeet, onSquareFeetChange, onBuildQuote, buckets, onBucketToggle,
}: {
  totals: BidTotals;
  markup: ReturnType<typeof effectiveMarkup>;
  overrides: MarkupOverrides;
  onMarkupChange: (key: MarkupKey, value: number) => void;
  onResetKey: (key: MarkupKey) => void;
  onResetAll: () => void;
  squareFeet: string;
  onSquareFeetChange: (v: string) => void;
  onBuildQuote: () => void;
  /** Bucket id → in the bid. A bucket switched off contributes nothing. */
  buckets: Record<BucketId, boolean>;
  onBucketToggle: (id: BucketId, on: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const inheritedCount = MARKUP_FIELDS.filter((f) => isInherited(overrides, f.key)).length;

  /**
   * McCormick's recap gives every cost category its own overhead and profit
   * column, so an estimator can read what each bucket is actually carrying
   * rather than seeing one lump at the bottom.
   *
   * Overhead, profit and contingency are charged on raw cost including tax, so
   * each bucket takes its pro-rata share of that base. The columns therefore
   * total to exactly the bid's overhead, profit and contingency, and the Sell
   * column totals to the sell price — no residual to explain away.
   */
  const recap = (() => {
    const base = totals.rawCostWithTax;
    const rows: {
      id: BucketId; label: string;
      cost: number; markupKey?: MarkupKey; marked: number;
      taxable: boolean;
    }[] = [
      { id: 'material',    label: 'Material',            cost: totals.materialCost,      markupKey: 'materialMarkup', marked: totals.materialSell, taxable: true },
      { id: 'labor',       label: 'Labor',               cost: totals.laborCost,         markupKey: 'laborMarkup',    marked: totals.laborSell,    taxable: false },
      { id: 'quotes',      label: 'Supplier quotes',     cost: totals.quotesCost,        marked: totals.quotesCost,        taxable: true },
      { id: 'subs',        label: 'Subcontractors',      cost: totals.subcontractorCost, marked: totals.subcontractorCost, taxable: false },
      { id: 'expenses',    label: 'Direct job expenses', cost: totals.directJobExpenses, marked: totals.directJobExpenses, taxable: false },
      { id: 'equipment',   label: 'Equipment rental',    cost: totals.equipmentRental,   marked: totals.equipmentRental,   taxable: false },
      { id: 'bond',        label: 'Bond',                cost: totals.bond,              marked: totals.bond,              taxable: false },
      { id: 'adjustments', label: 'Adjustments',         cost: totals.adjustments,       marked: totals.adjustments,       taxable: false },
    ];

    return rows.map((r) => {
      const tax = r.taxable ? r.marked * (markup.taxRate / 100) : 0;
      const share = base !== 0 ? (r.marked + tax) / base : 0;
      const overhead = totals.overheadAmt * share;
      const profit = totals.profitAmt * share;
      const contingency = totals.contingencyAmt * share;
      return {
        ...r, tax, overhead, profit, contingency,
        sell: r.marked + tax + overhead + profit + contingency,
      };
    });
  })();

  type RecapRow = (typeof recap)[number];
  const sum = (pick: (r: RecapRow) => number) =>
    recap.reduce((acc, r) => acc + (buckets[r.id] ? pick(r) : 0), 0);

  const numCell: React.CSSProperties = {
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, textAlign: 'right', padding: '6px 10px', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#111827', borderRadius: 10, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(17,24,39,0.18)' }}>
      {/*
        A title bar, not a second scoreboard. The sticky header above already
        carries raw cost, profit and sell price; repeating them here was the
        clutter. What belongs here is what the recap *is* and how to act on it.
      */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Bid recap</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
            Every cost bucket, its markup, and the sell price it rolls into.
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 8 }} />
        <button
          onClick={onBuildQuote}
          style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          Build proposal <ArrowRight size={13} />
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ height: 32, padding: '0 10px', border: '1px solid #374151', borderRadius: 7, background: '#1F2937', fontSize: 12, color: '#E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {open ? 'Hide recap' : 'Show recap'}
        </button>
      </div>

      {open && (
        <div style={{ background: '#1F2937', borderTop: '1px solid #374151', display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
          {/* Recap */}
          <div className="bp-recap-table" style={{ flex: 1, minWidth: 380, padding: '14px 16px' }}>
            <div className="bp-table-scroll" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 840, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      { h: '', w: 26 },
                      { h: 'Category', align: 'left' as const },
                      { h: 'Cost' },
                      { h: 'Markup' },
                      { h: 'Tax' },
                      { h: 'Overhead' },
                      { h: 'Profit' },
                      { h: 'Conting.' },
                      { h: 'Sell' },
                    ].map((c, i) => (
                      <th
                        key={c.h || 'incl'}
                        style={{
                          fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase',
                          letterSpacing: '0.05em', textAlign: c.align ?? 'right',
                          padding: '0 10px 5px', width: c.w, whiteSpace: 'nowrap',
                        }}
                      >
                        {c.h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recap.map((r) => {
                    const on = buckets[r.id];
                    const cell = (v: number, strong?: boolean) => (
                      <td style={{ ...numCell, color: on ? (strong ? '#F9FAFB' : '#9CA3AF') : '#6B7280', fontWeight: strong ? 600 : 400 }}>
                        {money(on ? v : 0)}
                      </td>
                    );
                    return (
                      <tr key={r.label} style={{ borderTop: '1px solid #374151', opacity: on ? 1 : 0.45 }}>
                        <td style={{ padding: '5px 0 5px 10px' }}>
                          <input
                            type="checkbox"
                            checked={on}
                            aria-label={`Include ${r.label} in the bid`}
                            title={on ? `${r.label} is in the bid` : `${r.label} is excluded from the bid`}
                            onChange={(e) => onBucketToggle(r.id, e.target.checked)}
                            style={{ accentColor: '#3B82F6', width: 13, height: 13, cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ fontSize: 12, color: on ? '#D1D5DB' : '#6B7280', padding: '6px 10px', whiteSpace: 'nowrap', textDecoration: on ? 'none' : 'line-through' }}>
                          {r.label}
                        </td>
                        {cell(r.cost)}
                        <td style={{ ...numCell, color: '#9CA3AF' }}>
                          {r.markupKey ? `${markup[r.markupKey]}%` : '—'}
                        </td>
                        {cell(r.tax)}
                        {cell(r.overhead)}
                        {cell(r.profit)}
                        {cell(r.contingency)}
                        {cell(r.sell, true)}
                      </tr>
                    );
                  })}

                  {/* Column totals — these are the bid, read down instead of across. */}
                  <tr style={{ borderTop: '2px solid #6B7280', background: '#111827' }}>
                    <td />
                    <td style={{ fontSize: 12, color: 'white', fontWeight: 700, padding: '8px 10px', whiteSpace: 'nowrap' }}>Total bid</td>
                    <td style={{ ...numCell, color: '#D1D5DB', fontWeight: 600 }}>{money(sum((r) => r.cost))}</td>
                    <td />
                    <td style={{ ...numCell, color: '#FCD34D', fontWeight: 600 }}>{money(totals.tax)}</td>
                    <td style={{ ...numCell, color: '#C4B5FD', fontWeight: 600 }}>{money(totals.overheadAmt)}</td>
                    <td style={{ ...numCell, color: '#6EE7B7', fontWeight: 600 }}>{money(totals.profitAmt)}</td>
                    <td style={{ ...numCell, color: '#FCA5A5', fontWeight: 600 }}>{money(totals.contingencyAmt)}</td>
                    <td style={{ ...numCell, color: 'white', fontWeight: 700, fontSize: 14 }}>{money(totals.totalBid)}</td>
                  </tr>

                  {/*
                    Rates under the columns they drive. The Cost column totals
                    pre-markup cost, so raw cost is spelled out on the label
                    rather than parked under a column it does not equal.
                  */}
                  <tr>
                    <td />
                    <td style={{ fontSize: 10, color: '#6B7280', padding: '3px 10px 0', whiteSpace: 'nowrap' }}>
                      Rate applied · raw cost {money(totals.rawCost)}
                    </td>
                    <td />
                    <td style={{ ...numCell, color: '#6B7280', fontSize: 10, padding: '3px 10px 0' }}>
                      +{money(totals.materialMarkupAmt + totals.laborMarkupAmt)}
                    </td>
                    <td style={{ ...numCell, color: '#6B7280', fontSize: 10, padding: '3px 10px 0' }}>{markup.taxRate}%</td>
                    <td style={{ ...numCell, color: '#6B7280', fontSize: 10, padding: '3px 10px 0' }}>{markup.overhead}%</td>
                    <td style={{ ...numCell, color: '#6B7280', fontSize: 10, padding: '3px 10px 0' }}>{markup.profit}%</td>
                    <td style={{ ...numCell, color: '#6B7280', fontSize: 10, padding: '3px 10px 0' }}>{markup.contingency}%</td>
                    <td style={{ ...numCell, color: '#6B7280', fontSize: 10, padding: '3px 10px 0' }}>
                      {pct(totals.returnPct)} ret.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 10, fontSize: 10, color: '#6B7280', lineHeight: '14px' }}>
              <Info size={10} style={{ flexShrink: 0, marginTop: 1 }} />
              Overhead, profit and contingency are charged on raw cost including tax, so each category
              carries its pro-rata share. Read a row across for one category&apos;s sell price, or a
              column down for the bid&apos;s.
            </div>
          </div>

          {/* Markup controls + square footage */}
          <div className="bp-recap-markup" style={{ width: 320, minWidth: 280, padding: '14px 16px', borderLeft: '1px solid #374151', background: '#1A2432' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>Markup</span>
              {inheritedCount < MARKUP_FIELDS.length && (
                <button
                  onClick={onResetAll}
                  style={{ height: 22, padding: '0 7px', border: '1px solid #374151', borderRadius: 5, background: '#111827', fontSize: 10, color: '#E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <RotateCcw size={9} /> Reset all
                </button>
              )}
            </div>

            {MARKUP_FIELDS.map((f) => {
              const inherited = isInherited(overrides, f.key);
              return (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span title={f.hint} style={{ fontSize: 11, color: '#D1D5DB', flex: 1, minWidth: 0 }}>{f.label}</span>
                  {inherited ? (
                    <span title={`Inherited from Company Settings (${COMPANY_DEFAULTS[f.key]}%)`} style={{ fontSize: 8, fontWeight: 700, color: '#93C5FD', background: '#1E3A5F', padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                      COMPANY
                    </span>
                  ) : (
                    <button
                      onClick={() => onResetKey(f.key)}
                      title="Reset to Company Default"
                      style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <RotateCcw size={10} color="#FCD34D" />
                    </button>
                  )}
                  <div style={{ position: 'relative', width: 68 }}>
                    <input
                      type="number"
                      step="0.01"
                      value={markup[f.key]}
                      onChange={(e) => onMarkupChange(f.key, parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%', height: 26, padding: '0 18px 0 6px', borderRadius: 5,
                        border: `1px solid ${inherited ? '#374151' : '#D97706'}`,
                        background: '#111827', color: '#F9FAFB', fontSize: 11,
                        fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#6B7280' }}>%</span>
                  </div>
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid #374151', marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#D1D5DB', flex: 1 }}>Building area</span>
                <div style={{ position: 'relative', width: 96 }}>
                  <input
                    type="number"
                    value={squareFeet}
                    onChange={(e) => onSquareFeetChange(e.target.value)}
                    style={{ width: '100%', height: 26, padding: '0 34px 0 6px', border: '1px solid #374151', borderRadius: 5, background: '#111827', color: '#F9FAFB', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#6B7280' }}>sq ft</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#D1D5DB', flex: 1 }}>Price per sq ft</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#C4B5FD', fontWeight: 600 }}>
                  {totals.pricePerSqFt > 0 ? money(totals.pricePerSqFt) : '—'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 10, fontSize: 10, color: '#6B7280', lineHeight: '14px' }}>
              <Info size={10} style={{ flexShrink: 0, marginTop: 1 }} />
              Values marked COMPANY come from Settings → Markup &amp; pricing. Editing one overrides it for this project only.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Health Panel ─────────────────────────────────────────────────────────────

function HealthPanel({ issues, onDismiss, onAction }: { issues: HealthIssue[]; onDismiss: () => void; onAction: (action: string) => void }) {
  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warnCount = issues.filter((i) => i.type === 'warning').length;

  return (
    <div style={{ padding: '10px 14px', background: errorCount > 0 ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${errorCount > 0 ? '#FECACA' : '#FDE68A'}`, borderRadius: 8, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={14} color={errorCount > 0 ? '#DC2626' : '#D97706'} />
        <span style={{ fontSize: 13, fontWeight: 600, color: errorCount > 0 ? '#B91C1C' : '#92400E' }}>
          {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}, ` : ''}{warnCount} warning{warnCount !== 1 ? 's' : ''}
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={onDismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X size={12} color="#9CA3AF" />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {issues.map((issue, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: issue.type === 'error' ? '#DC2626' : issue.type === 'warning' ? '#D97706' : '#6B7280',
            }} />
            <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{issue.message}</span>
            {issue.action && (
              <button
                onClick={() => onAction(issue.action!)}
                style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                {issue.action}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section shell ────────────────────────────────────────────────────────────

function SectionShell({ title, meta, total, totalColor, bg, border, accent, children, defaultOpen = true }: {
  title: string; meta?: string; total?: string; totalColor?: string;
  bg: string; border: string; accent: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', background: 'white', marginBottom: 10 }}>
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', background: bg, borderBottom: collapsed ? 'none' : `1px solid ${border}`, gap: 8, flexWrap: 'wrap' }}
      >
        {collapsed ? <ChevronRight size={14} color={accent} /> : <ChevronDown size={14} color={accent} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', flex: 1 }}>{title}</span>
        {meta && <span style={{ fontSize: 11, color: '#6B7280' }}>{meta}</span>}
        {total && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: totalColor ?? accent }}>{total}</span>}
      </div>
      {!collapsed && children}
    </div>
  );
}

const COL_HEAD: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em',
};

function AddLineButton({ onClick, label = 'Add line' }: { onClick: () => void; label?: string }) {
  return (
    <div style={{ padding: '8px 14px', borderTop: '1px dashed #E5E7EB' }}>
      <button onClick={onClick} style={{ height: 28, padding: '0 10px', border: '1px dashed #D1D5DB', borderRadius: 6, background: 'transparent', fontSize: 11, color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Plus size={11} /> {label}
      </button>
    </div>
  );
}

// ─── Labor: crew allocation ───────────────────────────────────────────────────

/**
 * Percentage-based crew allocation. Total labor hours come from the takeoff and
 * are split across the crew mix, so hours and cost recalculate as the estimator
 * moves a percentage. Mirrors McCormick's Assigned Labor grid, including its
 * refusal to let the allocation drift off 100%.
 */
function LaborCrewSection({ totalHours, rows, onRowsChange }: {
  totalHours: number;
  rows: CrewRow[];
  onRowsChange: (rows: CrewRow[]) => void;
}) {
  const [template, setTemplate] = useState('retail-fitout');
  const crew = computeCrew(rows, totalHours);

  function update(id: string, patch: Partial<CrewRow>) {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function applyTemplate(id: string) {
    const t = CREW_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplate(id);
    onRowsChange(t.rows.map((r, i) => ({ ...r, id: `crew-${id}-${i}` })));
    toast.success('Crew template applied', { description: `${t.name} — allocation reset to 100%.` });
  }

  const GRID = '34px minmax(200px, 1fr) 88px 96px 92px 106px 30px';

  return (
    <SectionShell
      title="Labor" accent="#16A34A" bg="#F0FDF4" border="#BBF7D0"
      meta={`${rows.filter((r) => r.included !== false).length} of ${rows.length} crew roles in bid · ${totalHours.toFixed(2)} h`}
      total={money(crew.costTotal)}
    >
      {/* Profile + template */}
      <div className="bp-toolbar" style={{ padding: '8px 14px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
        <span style={{ fontSize: 11, color: '#6B7280' }}>Labor profile</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', background: 'white', border: '1px solid #E5E7EB', padding: '3px 8px', borderRadius: 5 }}>
          NECA 2 · Union standard
        </span>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>set in Pricing</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} /> Crew template</span>
        <select
          value={template}
          onChange={(e) => applyTemplate(e.target.value)}
          style={{ height: 26, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, background: 'white', outline: 'none', color: '#374151' }}
        >
          {CREW_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Allocation warning */}
      {!crew.balanced && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
          <AlertTriangle size={12} color="#DC2626" />
          <span style={{ fontSize: 11, color: '#B91C1C', flex: 1 }}>
            Crew allocation is <strong>{crew.allocationTotal.toFixed(2)}%</strong> — must total 100%.
            {crew.allocationTotal < 100
              ? ` ${(100 - crew.allocationTotal).toFixed(2)}% of labor hours are unassigned.`
              : ` ${(crew.allocationTotal - 100).toFixed(2)}% over-assigned.`}
          </span>
        </div>
      )}

      {/* Header alignment mirrors each column's contents, same as the other tabs. */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '7px 14px', gap: 14, borderBottom: '2px solid #F3F4F6', background: '#FAFAFA' }}>
        {([
          ['Incl', 'center'], ['Crew role', 'left'], ['Allocation', 'right'],
          ['Hourly cost', 'right'], ['Hours', 'right'], ['Ext. cost', 'right'], ['', 'right'],
        ] as [string, 'left' | 'right' | 'center'][]).map(([h, align]) => (
          <div key={h} style={{ ...COL_HEAD, textAlign: align }}>{h}</div>
        ))}
      </div>

      {crew.lines.map((line) => {
        const inBid = line.included !== false;
        return (
        <div key={line.id} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', minHeight: 38, padding: '5px 14px', gap: 14, borderBottom: '1px solid #F3F4F6', background: inBid ? 'white' : '#FCFCFD' }}>
          <span style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <input
              type="checkbox"
              checked={inBid}
              aria-label={`Include ${line.role}`}
              onChange={(e) => update(line.id, { included: e.target.checked })}
              style={{ accentColor: '#2563EB', width: 14, height: 14, cursor: 'pointer' }}
            />
          </span>
          <select
            value={line.role}
            onChange={(e) => update(line.id, { role: e.target.value })}
            style={{ height: 26, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, background: 'white', outline: 'none', color: '#374151' }}
          >
            {CREW_ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <input
              type="number" step="0.5" min={0} max={100} value={line.allocation}
              onChange={(e) => update(line.id, { allocation: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', height: 26, padding: '0 18px 0 6px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#9CA3AF' }}>%</span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9CA3AF' }}>$</span>
            <input
              type="number" step="0.5" min={0} value={line.hourlyCost}
              onChange={(e) => update(line.id, { hourlyCost: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', height: 26, padding: '0 6px 0 16px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: inBid ? '#374151' : '#9CA3AF', textAlign: 'right', display: 'block', width: '100%' }}>{line.hours.toFixed(2)} h</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: inBid ? '#111827' : '#9CA3AF', textAlign: 'right', display: 'block', width: '100%' }}>{money(line.extCost)}</span>
          <button
            onClick={() => onRowsChange(rows.filter((r) => r.id !== line.id))}
            aria-label={`Remove ${line.role}`}
            style={{ width: 22, height: 22, marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
          >
            <Trash2 size={11} color="#DC2626" />
          </button>
        </div>
        );
      })}

      {/* Totals row */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', minHeight: 36, padding: '0 14px', gap: 14, background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
        <span />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, textAlign: 'right', display: 'block', width: '100%', color: crew.balanced ? '#16A34A' : '#DC2626' }}>
          {crew.allocationTotal.toFixed(2)}%
        </span>
        <span />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#111827', textAlign: 'right', display: 'block', width: '100%' }}>{crew.hoursTotal.toFixed(2)} h</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#111827', textAlign: 'right', display: 'block', width: '100%' }}>{money(crew.costTotal)}</span>
        <span />
      </div>

      <AddLineButton label="Add crew role" onClick={() => onRowsChange([...rows, { id: `crew-${rows.length}-${Math.round(crew.allocationTotal)}`, role: 'General Labor', allocation: 0, hourlyCost: 38 }])} />
    </SectionShell>
  );
}

// ─── Generic collapsible panel (review / approval) ────────────────────────────

function CollapsiblePanel({
  title, meta, accent, bg, border, defaultOpen = false, children,
}: {
  title: string; meta?: string; accent: string; bg: string; border: string;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', background: 'white', marginBottom: 10 }}>
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', background: bg, borderBottom: collapsed ? 'none' : `1px solid ${border}`, gap: 8 }}
      >
        {collapsed ? <ChevronRight size={14} color={accent} /> : <ChevronDown size={14} color={accent} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', flex: 1 }}>{title}</span>
        {meta && <span style={{ fontSize: 11, color: '#6B7280' }}>{meta}</span>}
      </div>
      {!collapsed && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
}

// ─── Estimate review panel ────────────────────────────────────────────────────

function ReviewPanel() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
        {[
          { label: 'Project', value: 'Dollar Tree — Store #1842' },
          { label: 'Bid #', value: 'BID-2026-0117' },
          { label: 'Prepared by', value: 'J. Martinez' },
          { label: 'Date', value: '2026-07-12' },
          { label: 'Revision', value: 'Rev 1' },
          { label: 'Status', value: 'Draft' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, padding: 14, background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} color="#7C3AED" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED' }}>AI review inspector</span>
        </div>
        <div style={{ fontSize: 12, color: '#6D28D9', lineHeight: '18px', marginBottom: 10 }}>
          Brightpoint has reviewed this bid against 47 similar retail fit-out projects. Here are key findings:
        </div>
        {[
          { icon: '📊', msg: 'Labor-to-material ratio (1.06×) is within expected range for retail (0.9–1.2×).' },
          { icon: '⚠️', msg: 'Contingency at 3% is below the 5% company baseline for first-time clients.' },
          { icon: '✅', msg: 'Fire alarm scope aligns with the spec and matches permit drawings.' },
          { icon: '🔍', msg: '4" square junction boxes show no pricing — gap of ~$56 estimated.' },
        ].map(({ icon, msg }, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, padding: '6px 10px', background: 'white', borderRadius: 6, fontSize: 12, color: '#374151' }}>
            <span>{icon}</span><span>{msg}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 10, color: '#8B5CF6' }}>
          AI review is advisory only. All values require estimator approval before submission.
        </div>
      </div>
    </>
  );
}

// ─── Approval workflow panel ──────────────────────────────────────────────────

function ApprovalPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { step: 1, role: 'Estimator', name: 'J. Martinez', status: 'approved', date: '2026-07-12', note: 'Ready for PM review.' },
        { step: 2, role: 'Project Manager', name: 'S. Thompson', status: 'pending', date: null, note: null },
        { step: 3, role: 'Director', name: 'M. Patel', status: 'waiting', date: null, note: null },
      ].map(({ step, role, name, status, date, note }) => (
        <div key={step} style={{ display: 'flex', gap: 12, padding: 14, background: 'white', borderRadius: 10, border: `1px solid ${status === 'approved' ? '#BBF7D0' : '#E5E7EB'}` }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: status === 'approved' ? '#16A34A' : status === 'pending' ? '#2563EB' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {status === 'approved' ? <Check size={14} color="white" /> : <span style={{ fontSize: 12, fontWeight: 700, color: status === 'pending' ? 'white' : '#9CA3AF' }}>{step}</span>}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{role} — {name}</div>
            {date && <div style={{ fontSize: 11, color: '#6B7280' }}>{date}</div>}
            {note && <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>{note}</div>}
            {status === 'pending' && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => toast.success('Bid approved', { description: 'Sent to Director for final sign-off.' })} style={{ height: 28, padding: '0 12px', border: 'none', background: '#2563EB', borderRadius: 6, fontSize: 12, color: 'white', cursor: 'pointer' }}>Approve</button>
                <button onClick={() => toast.info('Returned for revision')} style={{ height: 28, padding: '0 12px', border: '1px solid #E5E7EB', background: 'white', borderRadius: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>Return for revision</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main BidBuilder ──────────────────────────────────────────────────────────

// ─── Bid summary header ───────────────────────────────────────────────────────

/**
 * The bid's bottom line, pinned above the tab bar.
 *
 * Every cost category writes into one computation, so these eight readings are
 * the same numbers the tabs are editing — they move the moment a row changes.
 * White, not McCormick's grey chrome: this is a BrightPoint header that happens
 * to carry McCormick's recap figures.
 */
function BidSummaryHeader({ totals, status, issueCount, blocked, onValidate, excludedBuckets, onShowTopSheet }: {
  totals: BidTotals;
  status: string;
  issueCount: number;
  blocked: boolean;
  onValidate: () => void;
  /** Buckets switched off on the top sheet, named so the omission is visible. */
  excludedBuckets: string[];
  onShowTopSheet: () => void;
}) {
  const statusCfg: Record<string, { label: string; color: string; bg: string; border: string }> = {
    takeoff:  { label: 'Takeoff in progress', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    pricing:  { label: 'Pricing required',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    bidding:  { label: 'Bid in progress',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
    won:      { label: 'Won',                 color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
    lost:     { label: 'Lost',                color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    archived: { label: 'Archived',            color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  const sc = statusCfg[status] ?? statusCfg.bidding;

  const label: React.CSSProperties = {
    fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase',
    letterSpacing: '0.05em', whiteSpace: 'nowrap', marginBottom: 1,
  };
  const figure: React.CSSProperties = {
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600,
    color: '#374151', whiteSpace: 'nowrap',
  };
  const rule = <div className="bp-metrics-rule" style={{ width: 1, alignSelf: 'stretch', minHeight: 34, background: '#E5E7EB', flexShrink: 0 }} />;

  return (
    <div className="bp-metrics" style={{ padding: '10px 20px', background: 'white', borderBottom: '1px solid #E5E7EB', alignItems: 'center', gap: 20 }}>
      {/*
        Three zones, not eight loose numbers: what the job costs, what it sells
        for, and what to do about it. The cost build-up is deliberately quiet —
        it is the working, and the sell price is the answer.
      */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
        <div>
          <div style={label}>Raw cost</div>
          <div style={figure}>{money(totals.rawCost)}</div>
        </div>
        <div>
          <div style={label}>Overhead</div>
          <div style={figure}>{money(totals.overheadAmt)}</div>
        </div>
        <div>
          <div style={label}>Profit</div>
          <div style={{ ...figure, color: '#16A34A' }}>{money(totals.profitAmt)}</div>
        </div>
      </div>

      {rule}

      <div>
        <div style={label}>Sell price</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
            {money(totals.sellPrice)}
          </span>
          <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
            <strong style={{ color: totals.returnPct >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
              {pct(totals.returnPct)}
            </strong>
            {' return'}
            {totals.pricePerSqFt > 0 && (
              <> · <strong style={{ color: '#374151', fontWeight: 600 }}>{money(totals.pricePerSqFt)}</strong>/sq ft</>
            )}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 8 }} />

      {excludedBuckets.length > 0 && (
        <button
          onClick={onShowTopSheet}
          title="Switched off on the top sheet"
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', border: '1px solid #FDE68A', borderRadius: 9999, background: '#FFFBEB', fontSize: 11, color: '#92400E', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <AlertTriangle size={11} color="#D97706" />
          {excludedBuckets.length} bucket{excludedBuckets.length === 1 ? '' : 's'} excluded
        </button>
      )}

      {rule}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: '4px 10px', borderRadius: 9999, whiteSpace: 'nowrap' }}>
          {sc.label}
        </span>
        <button
          onClick={onValidate}
          title={issueCount === 0 ? 'Every check passed' : `${issueCount} issue${issueCount === 1 ? '' : 's'} to review`}
          style={{
            height: 34, padding: '0 14px', borderRadius: 7, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            border: blocked ? '1px solid #FECACA' : '1px solid #BFDBFE',
            background: blocked ? '#FEF2F2' : '#EFF6FF',
            color: blocked ? '#B91C1C' : '#1D4ED8',
            whiteSpace: 'nowrap',
          }}
        >
          {blocked ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
          Validate Bid
          {issueCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: blocked ? '#DC2626' : '#2563EB', borderRadius: 9999, padding: '1px 6px' }}>
              {issueCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Category tab bar ─────────────────────────────────────────────────────────

const BID_TABS = [
  'Top Sheet',
  'Labor',
  'Quotes',
  'Subcontractors',
  'Direct Job Expenses',
  'Equipment Rental',
  'Bond',
  'Tax',
  'Adjustments',
] as const;

type BidTab = (typeof BID_TABS)[number];

/**
 * Horizontal category navigation, in McCormick's order. Same blue-underline
 * treatment as the project tab strip above it, so the two read as one hierarchy
 * rather than two competing navigations.
 */
function BidTabBar({ active, onChange, amounts }: {
  active: BidTab;
  onChange: (t: BidTab) => void;
  amounts: Partial<Record<BidTab, number>>;
}) {
  return (
    <div
      className="bp-scroll-x"
      style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: '0 20px', background: 'white', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}
    >
      {BID_TABS.map((tab) => {
        const isActive = tab === active;
        const amt = amounts[tab];
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              height: 40, padding: '0 14px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#2563EB' : '#6B7280',
              borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
            }}
          >
            {tab}
            {amt !== undefined && amt !== 0 && (
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                color: isActive ? '#1D4ED8' : '#9CA3AF',
                background: isActive ? '#EFF6FF' : '#F3F4F6',
                padding: '1px 6px', borderRadius: 9999,
              }}>
                {amt < 0 ? '−' : ''}${Math.abs(Math.round(amt)).toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Bid Builder ──────────────────────────────────────────────────────────────

interface BidBuilderProps {
  onNavigateTo?: (page: string) => void;
  onBack?: () => void;
  projectStatus?: string;
  onStatusChange?: (status: string) => void;
}

export function BidBuilder({ onNavigateTo, onBack, projectStatus, onStatusChange }: BidBuilderProps) {
  const [tab, setTab] = useState<BidTab>('Top Sheet');
  const [sections, setSections] = useState<Section[]>(INIT_SECTIONS);
  const [showHealth, setShowHealth] = useState(true);
  const [showValidation, setShowValidation] = useState(false);

  // Markup: project overrides layered over the company defaults.
  const [overrides, setOverrides] = useState<MarkupOverrides>({});
  const markup = effectiveMarkup(overrides);
  const [squareFeet, setSquareFeet] = useState(String(DEFAULT_SQUARE_FEET));
  const [taxRegion, setTaxRegion] = useState('QC — GST 5% + QST 9.975%');
  const [buckets, setBuckets] = useState<Record<BucketId, boolean>>(ALL_BUCKETS_IN);

  // Crew allocation, seeded from the default company template.
  const [crewRows, setCrewRows] = useState<CrewRow[]>(
    CREW_TEMPLATES[0].rows.map((r, i) => ({ ...r, id: `crew-init-${i}` })),
  );
  /**
   * Derived here rather than reported up from the Labor tab: the summary header
   * is always on screen, so labor cannot wait for its own tab to mount before
   * it counts.
   */
  const laborCost = useMemo(
    () => computeCrew(crewRows, TAKEOFF_LABOR_HOURS).costTotal,
    [crewRows],
  );

  // Cost categories.
  const [quotes, setQuotes] = useState<QuoteRow[]>(SEED_QUOTE_ROWS);
  const [subs, setSubs] = useState<SubRow[]>(SEED_SUB_ROWS);
  const [expenses, setExpenses] = useState<ExpenseLine[]>(
    STANDARD_EXPENSE_LINES.map((e, i) => ({ ...e, id: `dje-std-${i}` })),
  );
  const [equipment, setEquipment] = useState<EquipmentRow[]>(SEED_EQUIPMENT);
  const [bonds, setBonds] = useState<BondRow[]>(SEED_BONDS);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>(SEED_ADJUSTMENTS);

  // ── Derived totals — every input feeds one computation ────────────────────
  const materialCost = useMemo(
    () => (sections.find((sec) => sec.id === 'material')?.items ?? [])
      .filter((i) => i.included !== false)
      .reduce((sum, i) => sum + i.extCost, 0),
    [sections],
  );

  const quotesCost = useMemo(
    () => quotes.filter((q) => q.included).reduce((s, q) => s + costAmount(q.unitCost, 1, q.multiplier), 0),
    [quotes],
  );
  const subsCost = useMemo(
    () => subs.filter((x) => x.included).reduce((s, x) => s + costAmount(x.quotedCost, 1, x.multiplier), 0),
    [subs],
  );
  const expensesCost = useMemo(
    () => expenses.filter((e) => e.included).reduce((s, e) => s + costAmount(e.unitCost, e.quantity, 1), 0),
    [expenses],
  );
  const equipmentCost = useMemo(
    () => equipment.filter((e) => e.included).reduce((s, e) => s + equipmentAmount(e), 0),
    [equipment],
  );
  const adjustmentsNet = useMemo(() => adjustmentNet(adjustments), [adjustments]);

  /**
   * Bond premiums can be written against the sell price, which the premium then
   * feeds back into. Two passes settle it: price the bid without bond, then use
   * that as the bonded base. Deep enough for an estimate, and it terminates.
   */
  /** A bucket switched off on the top sheet contributes zero. */
  const on = (id: BucketId, value: number) => (buckets[id] ? value : 0);
  const excludedBuckets = (Object.keys(buckets) as BucketId[]).filter((k) => !buckets[k]);

  const baseInputs = {
    materialCost: on('material', materialCost),
    laborCost: on('labor', laborCost),
    quotesCost: on('quotes', quotesCost),
    subcontractorCost: on('subs', subsCost),
    directJobExpenses: on('expenses', expensesCost),
    equipmentRental: on('equipment', equipmentCost),
    adjustments: on('adjustments', adjustmentsNet),
    squareFeet: parseFloat(squareFeet) || 0,
  };

  const preBond = useMemo(() => computeBid({ ...baseInputs, bond: 0 }, markup), [
    materialCost, laborCost, quotesCost, subsCost, expensesCost, equipmentCost, adjustmentsNet, squareFeet, markup, buckets,
  ]);

  const bondCost = useMemo(
    () => (buckets.bond
      ? bonds.filter((b) => b.included).reduce((s, b) => s + bondPremium(b, preBond.sellPrice), 0)
      : 0),
    [bonds, preBond.sellPrice, buckets.bond],
  );

  const totals: BidTotals = useMemo(
    () => computeBid({ ...baseInputs, bond: bondCost }, markup),
    [materialCost, laborCost, quotesCost, subsCost, expensesCost, equipmentCost, adjustmentsNet, bondCost, squareFeet, markup, buckets],
  );

  /**
   * Publish the bid downstream. The Proposal Center reads this rather than
   * carrying its own figures, so the two screens cannot quote different totals.
   */
  useEffect(() => {
    publishBidSnapshot({
      totals,
      buckets: bucketsFrom(totals),
      inputs: { ...baseInputs, bond: bondCost },
      markup,
    });
  }, [totals]);

  // ── Validation ────────────────────────────────────────────────────────────
  const materialsRev = useMaterialsRevision();

  /**
   * Adopt price changes made to the shared material list from anywhere else —
   * the Pricing screen, or a price-book fix applied in a validation review.
   * User edits to a line's own fields and its include flag are preserved; only
   * an explicit exclusion upstream overrides the local flag.
   */
  useEffect(() => {
    setSections((prev) => prev.map((sec) => (sec.id !== 'material' ? sec : {
      ...sec,
      items: sec.items.map((i) => {
        const line = MATERIAL_LINES.find((r) => r.id === i.id);
        if (!line) return i;
        return {
          ...i,
          unitCost: line.selectedPrice,
          extCost: line.extMaterialCost,
          included: line.status === 'excluded' ? false : i.included,
        };
      }),
    })));
  }, [materialsRev]);

  const issues = useMemo(() => validate({
    itemsMissingPrice: missingPriceLines()
      .filter((r) => {
        const line = (sections.find((s) => s.id === 'material')?.items ?? []).find((i) => i.id === r.id);
        return !line || line.included !== false;
      })
      .map((r) => ({ id: r.id, description: r.description, code: r.code, priceBookRate: priceBookRate(r) })),
    requiredQuotes: [
      { system: 'Switchgear', hasQuote: quotes.some((q) => q.included && q.quoteType === 'Switchgear'), critical: true },
      { system: 'Fire Alarm Equipment', hasQuote: quotes.some((q) => q.included && q.quoteType === 'Fire Alarm Equipment') },
    ],
    includedExpensesWithoutValue: expenses
      .filter((e) => e.included && costAmount(e.unitCost, e.quantity, 1) === 0)
      .map((e) => e.expense),
    markup: MARKUP_FIELDS.map((f) => ({ label: f.label, value: markup[f.key], required: f.key !== 'laborMarkup' })),
    taxRate: markup.taxRate,
    taxRegion,
    crewAllocationTotal: computeCrew(crewRows, TAKEOFF_LABOR_HOURS).allocationTotal,
    proposalSections: [],
    proposalBreakdownRows: 1,
  }), [sections, quotes, expenses, markup, taxRegion, crewRows, materialsRev]);

  /** Same resolvers the proposal review uses, so a fix means one thing. */
  function applyAutoFix(issue: ValidationIssue): boolean {
    const fix = issue.autoFix;
    if (!fix) return false;

    if (fix.kind === 'price-from-book' || fix.kind === 'exclude-line') {
      const ok = fix.kind === 'price-from-book' ? applyPriceBook(fix.target) : excludeLine(fix.target);
      if (!ok) return false;
      // Mirror the change onto the bid's own line so the recap moves with it.
      const line = MATERIAL_LINES.find((r) => r.id === fix.target);
      setSections((prev) => prev.map((sec) => ({
        ...sec,
        items: sec.items.map((i) => (i.id === fix.target
          ? fix.kind === 'exclude-line'
            ? { ...i, included: false }
            : { ...i, unitCost: line?.selectedPrice ?? i.unitCost, extCost: line?.extMaterialCost ?? i.extCost }
          : i)),
      })));
      toast.success(fix.kind === 'exclude-line' ? 'Line excluded from the bid' : 'Priced from the price book', {
        description: line?.description,
      });
      return true;
    }

    if (fix.kind === 'restore-markup-default') {
      const field = MARKUP_FIELDS.find((f) => f.label === fix.target);
      if (!field) return false;
      setOverrides((prev) => { const next = { ...prev }; delete next[field.key]; return next; });
      setCompanyDefault(field.key, COMPANY_DEFAULTS[field.key]);
      toast.success(`${field.label} restored to the company baseline`);
      return true;
    }

    if (fix.kind === 'restore-tax-default') {
      setOverrides((prev) => { const next = { ...prev }; delete next.taxRate; return next; });
      setCompanyDefault('taxRate', COMPANY_DEFAULTS.taxRate);
      toast.success(`Sales tax restored to ${COMPANY_DEFAULTS.taxRate}%`);
      return true;
    }

    return false;
  }

  const blocked = isBlocked(issues);
  const issueCounts = countBySeverity(issues);

  const pendingAi = sections.reduce((n, sec) => n + sec.items.filter((i) => i.ai && !i.approved).length, 0);

  function approveAiItems() {
    setSections((prev) => prev.map((sec) => ({
      ...sec,
      items: sec.items.map((item) => (item.ai && !item.approved ? { ...item, approved: true } : item)),
    })));
    toast.success('AI suggestions approved', { description: 'Smoke detectors (×12) are confirmed — the amber flag clears.' });
  }

  // Health issues are derived, not static — a warning that contradicts the top
  // sheet is worse than no warning.
  const healthIssues = useMemo(() => HEALTH_ISSUES.filter((i) => {
    if (i.action === 'Review AI items') return pendingAi > 0;
    if (i.action === 'View policy') return markup.contingency < COMPANY_DEFAULTS.contingency;
    return true;
  }), [pendingAi, markup.contingency]);

  function handleHealthAction(action: string) {
    if (action === 'Go to Pricing') { onNavigateTo?.('pricing'); return; }
    if (action === 'Refresh prices') { toast.success('Prices refreshed', { description: '2 stale items re-priced from the company price book.' }); return; }
    if (action === 'Review AI items') { approveAiItems(); return; }
    toast.info('Company markup policy', { description: `Contingency baseline is ${COMPANY_DEFAULTS.contingency}% — set in Settings → Markup & pricing.` });
  }

  // ── Markup handlers ───────────────────────────────────────────────────────
  const handleMarkupChange = useCallback((key: MarkupKey, value: number) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetKey = useCallback((key: MarkupKey) => {
    setOverrides((prev) => { const next = { ...prev }; delete next[key]; return next; });
    toast.info('Reset to Company Default', { description: `${MARKUP_FIELDS.find((f) => f.key === key)?.label} is ${COMPANY_DEFAULTS[key]}% again.` });
  }, []);

  const handleResetAll = useCallback(() => {
    setOverrides({});
    toast.info('All markup reset to Company Defaults');
  }, []);

  const tabAmounts: Partial<Record<BidTab, number>> = {
    Labor: on('labor', laborCost),
    Quotes: on('quotes', quotesCost),
    Subcontractors: on('subs', subsCost),
    'Direct Job Expenses': on('expenses', expensesCost),
    'Equipment Rental': on('equipment', equipmentCost),
    Bond: bondCost,
    Tax: totals.tax,
    Adjustments: on('adjustments', adjustmentsNet),
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', background: '#F6F7F9' }}>
      <ProjectHeader
        activeTab="Bid Builder"
        onNavigateTab={onNavigateTo}
        onBack={onBack}
        projectStatus={projectStatus}
        onStatusChange={onStatusChange}
      />

      {/* Sticky: the bid's bottom line, then the category tabs directly below */}
      <div style={{ flexShrink: 0, zIndex: 20 }}>
        <BidSummaryHeader
          totals={totals}
          status={projectStatus ?? 'bidding'}
          issueCount={issues.length}
          blocked={blocked}
          onValidate={() => setShowValidation(true)}
          excludedBuckets={excludedBuckets}
          onShowTopSheet={() => setTab('Top Sheet')}
        />
        <BidTabBar active={tab} onChange={setTab} amounts={tabAmounts} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '12px 20px 24px', maxWidth: 1560, margin: '0 auto' }}>
          {tab === 'Top Sheet' && (
            <>
              <TopSheet
                totals={totals}
                markup={markup}
                overrides={overrides}
                onMarkupChange={handleMarkupChange}
                onResetKey={handleResetKey}
                onResetAll={handleResetAll}
                squareFeet={squareFeet}
                onSquareFeetChange={setSquareFeet}
                onBuildQuote={() => onNavigateTo?.('proposal-center')}
                buckets={buckets}
                onBucketToggle={(id, value) => setBuckets((prev) => ({ ...prev, [id]: value }))}
              />

              {showHealth && healthIssues.length > 0 && (
                <HealthPanel issues={healthIssues} onDismiss={() => setShowHealth(false)} onAction={handleHealthAction} />
              )}

              <CollapsiblePanel title="Bid review" meta="AI inspector" accent="#7C3AED" bg="#F5F3FF" border="#DDD6FE" defaultOpen>
                <ReviewPanel />
              </CollapsiblePanel>
              <CollapsiblePanel title="Approval workflow" meta="1 of 3 approved" accent="#16A34A" bg="#F0FDF4" border="#BBF7D0" defaultOpen>
                <ApprovalPanel />
              </CollapsiblePanel>
            </>
          )}

          {tab === 'Labor' && (
            <LaborCrewSection
              totalHours={TAKEOFF_LABOR_HOURS}
              rows={crewRows}
              onRowsChange={setCrewRows}
            />
          )}

          {tab === 'Quotes' && (
            <QuotesTab rows={quotes} onChange={setQuotes} taxRate={markup.taxRate} />
          )}

          {tab === 'Subcontractors' && (
            <SubcontractorsTab rows={subs} onChange={setSubs} taxRate={markup.taxRate} />
          )}

          {tab === 'Direct Job Expenses' && (
            <ExpensesTab rows={expenses} onChange={setExpenses} taxRate={markup.taxRate} />
          )}

          {tab === 'Equipment Rental' && (
            <EquipmentTab rows={equipment} onChange={setEquipment} taxRate={markup.taxRate} />
          )}

          {tab === 'Bond' && (
            <BondTab rows={bonds} onChange={setBonds} sellPrice={preBond.sellPrice} />
          )}

          {tab === 'Tax' && (
            <TaxTab
              markup={markup}
              overrides={overrides}
              onMarkupChange={handleMarkupChange}
              onResetKey={handleResetKey}
              totals={totals}
              taxRegion={taxRegion}
              onTaxRegionChange={setTaxRegion}
            />
          )}

          {tab === 'Adjustments' && (
            <AdjustmentsTab rows={adjustments} onChange={setAdjustments} />
          )}
        </div>
      </div>

      <ValidationReview
        open={showValidation}
        title="Validate bid"
        actionLabel="Mark bid ready"
        issues={issues}
        onClose={() => setShowValidation(false)}
        onAutoFix={applyAutoFix}
        onConfirm={() => {
          setShowValidation(false);
          // Read the snapshot rather than the render closure: a fix applied in
          // the same press has already moved the numbers.
          const live = getBidSnapshot().totals;
          toast.success('Bid marked ready', {
            description: `${money(live.sellPrice)} · ${pct(live.returnPct)} return${issueCounts.warning > 0 ? ` · ${issueCounts.warning} warning${issueCounts.warning === 1 ? '' : 's'} acknowledged` : ''}.`,
          });
        }}
        onNavigate={onNavigateTo}
      />
    </div>
  );
}
