import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, ChevronUp, AlertTriangle, Sparkles,
  Plus, Trash2, ArrowRight, X, RotateCcw, Info, Users,
  ShieldCheck, Layers, MoreHorizontal, SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProjectHeader } from '../projects/ProjectHeader';
import { ValidationReview } from '../common/ValidationReview';
import { validate, isBlocked, countBySeverity, ValidationIssue } from '../../lib/validation';
import {
  MarkupKey, MarkupOverrides, MARKUP_FIELDS, COMPANY_DEFAULTS, effectiveMarkup, isInherited,
  computeBid, BidTotals, CrewRow, CREW_ROLES, CREW_TEMPLATES, computeCrew,
  CostCategoryId, CategoryRateMap, CategoryLine, TaxSettings, DEFAULT_TAX_SETTINGS,
  COST_CATEGORIES,
  money, pct,
  TAKEOFF_LABOR_HOURS, DEFAULT_SQUARE_FEET,
  LABOR_PROFILES, DEFAULT_LABOR_PROFILE, laborProfile, applyLaborProfile, useLaborProfile,
} from '../../lib/costing';
import {
  MATERIAL_LINES, missingPriceLines, priceBookRate, applyPriceBook, excludeLine,
  useMaterialsRevision,
} from '../../lib/materials';
import { setCompanyDefault } from '../../lib/costing';
import { MONO } from './bidTable';
import { publishBidSnapshot, getBidSnapshot, bucketsFrom } from '../../lib/bidSnapshot';
import {
  QuoteRow, SEED_QUOTE_ROWS, SubRow, SEED_SUB_ROWS,
  ExpenseLine, STANDARD_EXPENSE_LINES, EquipmentRow, SEED_EQUIPMENT,
  BondRow, SEED_BONDS, AdjustmentRow, SEED_ADJUSTMENTS,
  costAmount, equipmentAmount, bondPremium,
} from './bidData';
import {
  QuotesTab, SubcontractorsTab, ExpensesTab, EquipmentTab, BondTab, TaxTab, AdjustmentsTab,
} from './BidCategoryTabs';
import { RateBasis, findRegion } from '../../lib/taxRegions';
import {
  AREAS, SYSTEMS, ScopeSelection, ScopeSource, scopedCosts,
  AREA_BY_DRAWING, SYSTEM_BY_GROUP, systemFromText,
} from '../../lib/bidScope';
import {
  BidSummary, SummaryScope, PricedSummary, BID_PACKAGES, SUMMARY_STATUS_CFG,
  initialSummaries, newSummary, scopeSelectionOf, scopeAreaLabels, scopeSystemLabels,
  areasText, systemsText,
} from '../../lib/bidSummaries';

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
/**
 * The Bid Summary strip.
 *
 * One card per summary in this estimate, the active one marked, each showing the
 * price it produces. This is the layer that used to be missing: an Area/System
 * selection was standing in for a bid, so a project could only ever have one
 * price. Now the scope defines what goes *into* a summary and the summary is
 * what gets quoted.
 */
function SummaryStrip({ summaries, activeId, priceOf, onSelect, onEditScope, onRename, onDuplicate, onDelete }: {
  summaries: BidSummary[];
  activeId: string;
  priceOf: (s: BidSummary) => number;
  onSelect: (id: string) => void;
  /** Edit the scope of the selected summary. Offered on the active card only. */
  onEditScope: () => void;
  onRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, padding: '10px 16px', background: 'white', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap' }}>
      {summaries.map((s) => {
        const active = s.id === activeId;
        return (
          <div
            key={s.id}
            style={{
              position: 'relative', minWidth: 168,
              border: `1px solid ${active ? '#2563EB' : '#E5E7EB'}`,
              borderRadius: 9,
              background: active ? '#F8FBFF' : 'white',
              boxShadow: active ? '0 0 0 2px #EFF6FF' : 'none',
            }}
          >
            <button
              onClick={() => onSelect(s.id)}
              aria-current={active}
              style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: `9px ${active ? 58 : 34}px 9px 11px`, cursor: 'pointer', display: 'block' }}
            >
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: active ? '#1D4ED8' : '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.name}
              </span>
              <span style={{ display: 'block', ...MONO, fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 2 }}>
                {money(priceOf(s))}
              </span>
            </button>

            {/*
              Edit Scope, as a square beside the summary it edits (client, 11 Aug
              2026). It replaces a full-width labelled button that sat in the scope
              band below — which read as an action on the screen rather than on one
              summary, and cost a row of height to say so.

              On the **active** card only. Scope editing applies to the selected
              summary, so an icon on an unselected card would either edit the wrong
              one or silently switch selection under the estimator; the card is the
              thing you select, and once selected it carries the action.
            */}
            {active && (
              <button
                onClick={onEditScope}
                aria-label={`Edit scope — ${s.name}`}
                title={`Edit scope — ${s.name}. Choose the Bid Package, Areas and Systems inside this summary. Scope defines what is in the summary; it is not the bid itself.`}
                style={{
                  position: 'absolute', top: 6, right: 28, width: 22, height: 22,
                  border: '1px solid #BFDBFE', borderRadius: 5, background: 'white',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <SlidersHorizontal size={11} color="#1D4ED8" />
              </button>
            )}

            <button
              onClick={() => setMenuFor(menuFor === s.id ? null : s.id)}
              aria-label={`${s.name} actions`}
              style={{ position: 'absolute', top: 6, right: 5, width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}
            >
              <MoreHorizontal size={13} color="#9CA3AF" />
            </button>

            {menuFor === s.id && (
              <>
                <div onClick={() => setMenuFor(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', right: 4, top: 28, zIndex: 41, minWidth: 150, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 8px 24px rgba(17,24,39,0.14)', overflow: 'hidden' }}>
                  {([
                    ['Rename', () => onRename(s.id), false],
                    ['Duplicate', () => onDuplicate(s.id), false],
                    /*
                     * Base Bid stays. A project always has a base price, and a
                     * proposal holding a deleted summary's id would have nothing
                     * to quote — so the option is absent, not merely disabled
                     * with an explanation nobody reads.
                     */
                    ['Delete', () => onDelete(s.id), !!s.protected],
                  ] as [string, () => void, boolean][]).filter(([, , hidden]) => !hidden).map(([label, fn]) => (
                    <button
                      key={label}
                      onClick={() => { setMenuFor(null); fn(); }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '7px 11px', border: 'none',
                        background: 'white', cursor: 'pointer', fontSize: 12,
                        color: label === 'Delete' ? '#B91C1C' : '#374151',
                        borderBottom: '1px solid #F9FAFB',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}

    </div>
  );
}

/**
 * Summary Scope — what the selected summary covers, and the way in.
 *
 * The chips are a read-out; Edit Scope is where the selection actually happens.
 * Showing chips that look interactive but are not is the thing this had to avoid.
 */
function SummaryScopeBand({ summary }: { summary: BidSummary }) {
  const sc = summary.scope;

  /*
   * One line, not a three-column block with its own heading.
   * ------------------------------------------------------
   * This band sat above the financial table and consumed as much height as four
   * rows of it — a stacked heading, an explanatory sentence and a grid of
   * labelled chip groups, all to show three short values that rarely change. The
   * inline label → chips form says the same thing in a single row, and the
   * sentence it used to need is now the Edit Scope button's tooltip.
   */
  const field = (label: string, values: string[], tone: 'neutral' | 'package') => {
    const cfg = tone === 'package'
      ? { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' }
      : { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' };
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
        {values.map((v) => (
          <span
            key={v}
            title={v}
            style={{
              fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap',
              color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
            }}
          >
            {v}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div
      className="bp-scope-band"
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px',
        background: '#FAFBFF', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        Scope
      </span>
      {field('Package', [sc.bidPackage], 'package')}
      {field('Areas', scopeAreaLabels(sc), 'neutral')}
      {field('Systems', scopeSystemLabels(sc), 'neutral')}

      {/*
        No Edit button here any more — it moved onto the active summary card above,
        beside the name it belongs to. This band is purely a read-out of what the
        selected summary covers, which is what it was always meant to be.
      */}
    </div>
  );
}

/**
 * Edit Scope.
 *
 * Applies to the selected summary and nothing else — the draft is held locally
 * and only written on Apply, so Cancel genuinely cancels and a half-made
 * selection never reprices a bid mid-edit.
 */
function EditScopeDrawer({ summary, onCancel, onApply }: {
  summary: BidSummary;
  onCancel: () => void;
  onApply: (scope: SummaryScope) => void;
}) {
  const [draft, setDraft] = useState<SummaryScope>(() => ({
    ...summary.scope,
    areas: [...summary.scope.areas],
    systems: [...summary.scope.systems],
    includes: [...summary.scope.includes],
  }));

  const toggle = (key: 'areas' | 'systems', id: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((v) => v !== id) : [...d[key], id],
    }));

  const column = (title: string, hint: string, children: React.ReactNode) => (
    <div style={{ flex: 1, minWidth: 168 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 5, marginBottom: 7, borderBottom: '1px solid #F3F4F6' }}>
        {title}
      </div>
      {children}
      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 7, lineHeight: '14px' }}>{hint}</div>
    </div>
  );

  const check = (on: boolean, label: string, onChange: () => void, key: string) => (
    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={on}
        aria-label={label}
        onChange={onChange}
        style={{ accentColor: '#2563EB', width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }}
      />
      <span style={{ fontSize: 11, color: '#374151', lineHeight: '15px' }}>{label}</span>
    </label>
  );

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(17,24,39,0.35)' }} />
      <div
        role="dialog"
        aria-label={`Edit scope — ${summary.name}`}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 71,
          width: 'min(560px, calc(100vw - 48px))', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
          background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 20px 50px rgba(17,24,39,0.24)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #F3F4F6' }}>
          <SlidersHorizontal size={14} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', flex: 1 }}>
            Edit Scope — {summary.name}
          </span>
          <button onClick={onCancel} aria-label="Close" style={{ width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>

        <div style={{ padding: '14px 18px' }}>
          <div style={{ marginBottom: 14, maxWidth: 300 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
              Bid Package
            </div>
            <select
              value={draft.bidPackage}
              onChange={(e) => setDraft((d) => ({ ...d, bidPackage: e.target.value }))}
              aria-label="Bid package"
              style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, background: 'white', outline: 'none', color: '#374151' }}
            >
              {BID_PACKAGES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {column('Areas', 'Nothing ticked means every area.', (
              <>
                {check(draft.areas.length === 0, 'All Areas', () => setDraft((d) => ({ ...d, areas: [] })), 'all-areas')}
                {AREAS.map((a) => check(draft.areas.includes(a.id), a.label, () => toggle('areas', a.id), a.id))}
              </>
            ))}

            {column('Systems / Scope', 'Nothing ticked means every system.', (
              <>
                {check(draft.systems.length === 0, 'All Systems', () => setDraft((d) => ({ ...d, systems: [] })), 'all-systems')}
                {SYSTEMS.map((sy) => check(draft.systems.includes(sy.id), sy.label, () => toggle('systems', sy.id), sy.id))}
              </>
            ))}

          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA', borderRadius: '0 0 11px 11px' }}>
          <span style={{ fontSize: 11, color: '#6B7280', flex: 1 }}>
            Applies to <strong>{summary.name}</strong> only — every other summary keeps its own scope.
          </span>
          <button onClick={onCancel} style={{ height: 32, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onApply(draft)}
            style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 8, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer' }}
          >
            Apply Scope
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * All Summaries in this Estimate.
 *
 * A comparison table, not a project list — every row is the same takeoff priced
 * differently. Selecting a row switches the active summary above.
 */
function AllSummariesTable({ priced, activeId, onSelect, onNew }: {
  priced: PricedSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Creating a summary belongs here, beside the ones it will be compared with. */
  onNew: () => void;
}) {
  const GRID = '1.4fr 0.9fr 1.1fr 1.1fr 100px 84px 104px 112px 74px 84px';
  const head: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  };
  const num: React.CSSProperties = { ...MONO, fontSize: 11, textAlign: 'right', color: '#374151' };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, background: 'white', overflow: 'hidden', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>All Summaries in this Estimate</span>
        <span style={{ fontSize: 11, color: '#6B7280', flex: 1 }}>
          One master estimate, {priced.length} priced {priced.length === 1 ? 'summary' : 'summaries'} — select a row to work on it.
        </span>
      </div>

      <div className="bp-scroll-x" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 1040 }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, padding: '7px 14px', background: '#FAFAFA', borderBottom: '2px solid #F3F4F6' }}>
            <span style={head}>Summary</span>
            <span style={head}>Bid Package</span>
            <span style={head}>Areas</span>
            <span style={head}>Systems</span>
            <span style={{ ...head, textAlign: 'right' }}>Material</span>
            <span style={{ ...head, textAlign: 'right' }}>Labor hrs</span>
            <span style={{ ...head, textAlign: 'right' }}>Raw cost</span>
            <span style={{ ...head, textAlign: 'right' }}>Sell price</span>
            <span style={{ ...head, textAlign: 'right' }}>Return %</span>
            <span style={head}>Status</span>
          </div>

          {priced.map(({ summary: s, totals, laborHours }) => {
            const active = s.id === activeId;
            const st = SUMMARY_STATUS_CFG[s.status];
            return (
              <div
                key={s.id}
                onClick={() => onSelect(s.id)}
                style={{
                  display: 'grid', gridTemplateColumns: GRID, gap: 10, alignItems: 'center',
                  padding: '9px 14px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                  background: active ? '#F8FBFF' : 'white',
                  borderLeft: `2px solid ${active ? '#2563EB' : 'transparent'}`,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#FAFAFA'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'white'; }}
              >
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 500, color: active ? '#1D4ED8' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
                <span style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.scope.bidPackage}</span>
                <span style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={areasText(s.scope)}>{areasText(s.scope)}</span>
                <span style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={systemsText(s.scope)}>{systemsText(s.scope)}</span>
                <span style={num}>{money(totals.materialSell)}</span>
                <span style={num}>{laborHours.toFixed(1)}</span>
                <span style={num}>{money(totals.rawCost)}</span>
                <span style={{ ...num, fontWeight: 700, color: '#111827' }}>{money(totals.sellPrice)}</span>
                <span style={{ ...num, color: '#16A34A' }}>{pct(totals.returnPct)}</span>
                <span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                    {st.label}
                  </span>
                </span>
              </div>
            );
          })}

          {/*
            The add row sits with the summaries rather than up in the selector
            strip: this table is where an estimator is comparing what exists and
            deciding another one is needed.
          */}
          <button
            onClick={onNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              padding: '10px 14px', border: 'none', borderTop: '1px dashed #E5E7EB',
              background: '#FAFAFA', cursor: 'pointer', color: '#1D4ED8',
              fontSize: 12, fontWeight: 600, textAlign: 'left',
            }}
          >
            <Plus size={13} /> New Summary
            <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>
              — starts from the same master estimate
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** A percentage cell that inherits the bid rate until it is edited, 0% included. */
function RateCell({ value, inherited, onChange, onReset, label }: {
  value: number;
  inherited: boolean;
  onChange: (v: number) => void;
  onReset: () => void;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
      {!inherited && (
        <button
          onClick={onReset}
          title="Back to the bid rate"
          aria-label={`Reset ${label} to the bid rate`}
          style={{ width: 16, height: 16, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <RotateCcw size={9} color="#FCD34D" />
        </button>
      )}
      <div style={{ position: 'relative', width: 62 }}>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          aria-label={label}
          /*
           * `parseFloat(x) || 0` would be wrong here in a way that costs money:
           * it turns a cleared field into 0% overhead rather than leaving the
           * rate alone. Only a real number is an override.
           */
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          style={{
            width: '100%', height: 24, padding: '0 16px 0 5px', borderRadius: 5,
            border: `1px solid ${inherited ? '#374151' : '#D97706'}`,
            background: '#111827', color: '#F9FAFB', fontSize: 11,
            fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#6B7280' }}>%</span>
      </div>
    </div>
  );
}

function TopSheet({
  totals, markup, overrides, onMarkupChange, onResetKey, onResetAll,
  squareFeet, onSquareFeetChange, onBuildQuote, buckets, onBucketToggle,
  onCatRate, summaryName,
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
  onCatRate: (id: CostCategoryId, field: 'overhead' | 'profit', value: number | undefined) => void;
  /** The selected Bid Summary's name — the totals panel is titled with it. */
  summaryName: string;
}) {
  const [open, setOpen] = useState(true);
  /*
   * Collapsed by default. The summary above it is what an estimator reads on
   * every visit; these four rates and the building area are set once and then
   * left alone, so expanded they were consuming the panel to no purpose.
   */
  const [ratesOpen, setRatesOpen] = useState(false);

  /*
   * Overhead and profit are set per category now, so what remains bid-wide is
   * the markups, contingency and tax. They are filtered out of this panel rather
   * than removed from MARKUP_FIELDS, because Settings still publishes them as
   * the company default that every untouched category inherits.
   */
  const bidRateFields = MARKUP_FIELDS.filter((f) => f.key !== 'overhead' && f.key !== 'profit');
  const inheritedCount = bidRateFields.filter((f) => isInherited(overrides, f.key)).length;

  /** Only categories in the bid contribute; an excluded one reads as zero. */
  const included = (l: CategoryLine) => buckets[l.id as BucketId] !== false;
  const sum = (pick: (l: CategoryLine) => number) =>
    totals.categories.reduce((a, l) => a + (included(l) ? pick(l) : 0), 0);

  const numCell: React.CSSProperties = {
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, textAlign: 'right', padding: '6px 10px', whiteSpace: 'nowrap',
  };

  /** Running totals for the selected summary. Read-only — rates live on the rows. */
  const summary: { label: string; value: string; color: string; strong?: boolean; rule?: boolean }[] = [
    { label: 'Raw cost',                 value: money(totals.rawCost),        color: '#D1D5DB' },
    { label: `Tax (${markup.taxRate}%)`, value: money(totals.tax),            color: '#FCD34D' },
    { label: 'Cost w/ tax',              value: money(totals.rawCostWithTax), color: '#E5E7EB' },
    { label: 'Overhead',                 value: money(totals.overheadAmt),    color: '#C4B5FD' },
    { label: 'Profit',                   value: money(totals.profitAmt),      color: '#6EE7B7' },
    { label: 'Bond',                     value: money(totals.bond),           color: '#93C5FD' },
    ...(totals.contingencyAmt !== 0
      ? [{ label: `Contingency (${markup.contingency}%)`, value: money(totals.contingencyAmt), color: '#FCA5A5' }]
      : []),
    { label: 'Sell price',       value: money(totals.totalBid),  color: '#FFFFFF', strong: true, rule: true },
    { label: 'Return $',         value: money(totals.returnAmt), color: '#6EE7B7' },
    { label: 'Return %',         value: pct(totals.returnPct),   color: '#6EE7B7' },
  ];

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
<>{summaryName} — every cost category, the overhead and profit it carries, and the price it sells for.</>
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
          {/* Per-category recap — the only place overhead and profit are set. */}
          <div className="bp-recap-table" style={{ flex: 1, minWidth: 380, padding: '14px 16px' }}>
            <div className="bp-table-scroll" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      { h: '', w: 26 },
                      { h: 'Category', align: 'left' as const },
                      { h: 'Cost' },
                      { h: 'Overhead %' },
                      { h: 'Overhead $' },
                      { h: 'Profit %' },
                      { h: 'Profit $' },
                      { h: 'Sell price' },
                    ].map((c) => (
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
                  {totals.categories.map((r) => {
                    const on = included(r);
                    const cell = (v: number, strong?: boolean) => (
                      <td style={{ ...numCell, color: on ? (strong ? '#F9FAFB' : '#9CA3AF') : '#6B7280', fontWeight: strong ? 600 : 400 }}>
                        {money(on ? v : 0)}
                      </td>
                    );
                    return (
                      <tr key={r.id} style={{ borderTop: '1px solid #374151', opacity: on ? 1 : 0.45 }}>
                        <td style={{ padding: '5px 0 5px 10px' }}>
                          <input
                            type="checkbox"
                            checked={on}
                            aria-label={`Include ${r.label} in the bid`}
                            title={on ? `${r.label} is in the bid` : `${r.label} is excluded from the bid`}
                            onChange={(e) => onBucketToggle(r.id as BucketId, e.target.checked)}
                            style={{ accentColor: '#3B82F6', width: 13, height: 13, cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ fontSize: 12, color: on ? '#D1D5DB' : '#6B7280', padding: '6px 10px', whiteSpace: 'nowrap', textDecoration: on ? 'none' : 'line-through' }}>
                          {r.label}
                          {r.taxable && (
                            <span
                              title={`Taxable — ${money(r.tax)} at ${markup.taxRate}%. Overhead and profit are charged on cost including this tax.`}
                              style={{ fontSize: 9, fontWeight: 700, color: '#D6A93B', background: '#2A2413', border: '1px solid #4A3D18', padding: '1px 4px', borderRadius: 3, marginLeft: 6 }}
                            >
                              +TAX
                            </span>
                          )}
                        </td>
                        {cell(r.cost)}
                        <td style={{ padding: '4px 10px' }}>
                          <RateCell
                            value={r.overheadPct}
                            inherited={r.overheadInherited}
                            label={`${r.label} overhead percent`}
                            onChange={(v) => onCatRate(r.id, 'overhead', v)}
                            onReset={() => onCatRate(r.id, 'overhead', undefined)}
                          />
                        </td>
                        {cell(r.overhead)}
                        <td style={{ padding: '4px 10px' }}>
                          <RateCell
                            value={r.profitPct}
                            inherited={r.profitInherited}
                            label={`${r.label} profit percent`}
                            onChange={(v) => onCatRate(r.id, 'profit', v)}
                            onReset={() => onCatRate(r.id, 'profit', undefined)}
                          />
                        </td>
                        {cell(r.profit)}
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
                    <td style={{ ...numCell, color: '#C4B5FD', fontWeight: 600 }}>{money(totals.overheadAmt)}</td>
                    <td />
                    <td style={{ ...numCell, color: '#6EE7B7', fontWeight: 600 }}>{money(totals.profitAmt)}</td>
                    <td style={{ ...numCell, color: 'white', fontWeight: 700, fontSize: 14 }}>{money(totals.totalBid)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 10, fontSize: 10, color: '#6B7280', lineHeight: '14px' }}>
              <Info size={10} style={{ flexShrink: 0, marginTop: 1 }} />
              Each category carries its own overhead and profit — set either to 0% and no other
              category moves. Overhead is charged on cost including that category&apos;s tax, profit
              on cost plus overhead. A rate still on the bid default follows it when the default
              changes; an edited one holds until you reset it.
            </div>
          </div>

          {/* Summary — read-only by design. Rates are set on the rows, never here. */}
          <div className="bp-recap-markup" style={{ width: 320, minWidth: 280, padding: '14px 16px', borderLeft: '1px solid #374151', background: '#1A2432' }}>
            {/* Titled by the summary, so nobody reads one bid's totals as another's. */}
            <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {summaryName} Totals
            </span>

            <div style={{ marginTop: 6 }}>
              {summary.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    borderTop: row.rule ? '1px solid #374151' : undefined,
                    marginTop: row.rule ? 5 : undefined,
                    padding: row.rule ? '7px 0 4px' : '4px 0',
                  }}
                >
                  <span style={{ fontSize: 11, color: row.strong ? '#E5E7EB' : '#9CA3AF', flex: 1, minWidth: 0 }}>{row.label}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: row.strong ? 14 : 12, color: row.color, fontWeight: row.strong ? 700 : 600 }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Rates that really are bid-wide. Overhead and profit are not among them. */}
            <div style={{ borderTop: '1px solid #374151', marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: ratesOpen ? 8 : 0 }}>
                <button
                  onClick={() => setRatesOpen((v) => !v)}
                  aria-expanded={ratesOpen}
                  style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  {ratesOpen ? <ChevronUp size={11} color="#6B7280" /> : <ChevronDown size={11} color="#6B7280" />}
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bid rates</span>
                  {/*
                    Collapsed, it still has to say whether anything inside is
                    overridden — a hidden override is a price nobody can account
                    for, which is exactly what collapsing must not create.
                  */}
                  {!ratesOpen && (
                    <span style={{ fontSize: 10, color: inheritedCount < bidRateFields.length ? '#FCD34D' : '#4B5563' }}>
                      {inheritedCount < bidRateFields.length
                        ? `${bidRateFields.length - inheritedCount} overridden`
                        : 'company defaults'}
                    </span>
                  )}
                </button>
                {ratesOpen && inheritedCount < bidRateFields.length && (
                  <button
                    onClick={onResetAll}
                    style={{ height: 22, padding: '0 7px', border: '1px solid #374151', borderRadius: 5, background: '#111827', fontSize: 10, color: '#E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <RotateCcw size={9} /> Reset all
                  </button>
                )}
              </div>

              {ratesOpen && (
              <>

              {bidRateFields.map((f) => {
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
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

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 10, fontSize: 10, color: '#6B7280', lineHeight: '14px' }}>
                <Info size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                Overhead and profit are set per category on the left. Values marked COMPANY come from
                Settings &rarr; Markup &amp; pricing.
              </div>
              </>
              )}
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

/** Right-aligned monospace figure, the shape every computed cell here takes. */
const FIG: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, textAlign: 'right',
  display: 'block', width: '100%',
};

/** A rate input with its unit sitting inside the field. */
function RateInput({ value, onChange, prefix, suffix, step = 0.5, disabled, title }: {
  value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number; disabled?: boolean; title?: string;
}) {
  return (
    <div style={{ position: 'relative', opacity: disabled ? 0.45 : 1 }} title={title}>
      {prefix && (
        <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9CA3AF', pointerEvents: 'none' }}>{prefix}</span>
      )}
      <input
        type="number" step={step} min={0} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: '100%', height: 26, boxSizing: 'border-box',
          padding: `0 ${suffix ? 17 : 6}px 0 ${prefix ? 16 : 6}px`,
          border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11,
          fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none',
          background: disabled ? '#F9FAFB' : 'white',
        }}
      />
      {suffix && (
        <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#9CA3AF', pointerEvents: 'none' }}>{suffix}</span>
      )}
    </div>
  );
}

/**
 * The labor rate build-up.
 *
 * Total labor hours come from the takeoff and are split across the crew mix by
 * allocation percentage, so hours and cost recalculate as the estimator moves a
 * percentage — and the allocation is not allowed to drift off 100%.
 *
 * The hourly cost is built in the open rather than typed as one number:
 *
 *   Allocation % · Labor Hours · Base Labor Rate · Burden % · Burden $
 *                · Fringe $ · Fringe % · Total
 *
 * Hours sit beside allocation because they are read together. Burden is charged
 * on the base rate ALONE — payroll taxes, workers' comp, unemployment — and gets
 * its own quantification column so the dollar figure is auditable rather than
 * buried in a rate. Fringe carries both a dollar amount and a percentage, the
 * Davis-Bacon / union form, and the percentage quantifies off the fringe dollars,
 * never off the base. On open-shop work the fringe pair is left blank and can be
 * collapsed out of the way entirely.
 */
function LaborCrewSection({ totalHours, rows, onRowsChange }: {
  totalHours: number;
  rows: CrewRow[];
  onRowsChange: (rows: CrewRow[]) => void;
}) {
  const [template, setTemplate] = useState('retail-fitout');
  // Fringe columns start open when any role actually carries a fringe benefit.
  const [showFringe, setShowFringe] = useState(() => rows.some((r) => r.fringeDollars > 0));

  /*
   * The labor profile is selectable and priced through (client, 11 Aug 2026).
   *
   * It was a static chip reading "NECA 2 · Union standard · set in Pricing" — a
   * label describing a decision made on another screen, which an estimator could
   * neither see the effect of nor change from where the crew rates are. Selecting
   * a profile now re-bases the crew and every figure below follows.
   *
   * The rows themselves are untouched: the factor is applied on the way into
   * `computeCrew`, so the base rates on record stay the base rates on record and
   * switching back to NECA 2 restores them exactly.
   */
  const [profileId, setProfileId] = useLaborProfile();
  const profile = laborProfile(profileId);
  const pricedRows = applyLaborProfile(rows, profileId);
  const crew = computeCrew(pricedRows, totalHours);
  const fringeInTotal = crew.lines.reduce(
    (s, l) => s + (l.included !== false ? (l.fringeDollars + l.fringeAmount) * l.hours : 0),
    0,
  );

  function update(id: string, patch: Partial<CrewRow>) {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function applyTemplate(id: string) {
    const t = CREW_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplate(id);
    onRowsChange(t.rows.map((r, i) => ({ ...r, id: `crew-${id}-${i}` })));
    setShowFringe(t.rows.some((r) => r.fringeDollars > 0));
    toast.success('Crew template applied', { description: `${t.name} — allocation reset to 100%.` });
  }

  /*
   * Fixed tracks, not minmax: a header grid and a row grid are separate
   * containers, so a flexible track can resolve a few pixels apart between them
   * and drag every later column out of line.
   */
  const GRID = showFringe
    ? '30px 176px 76px 80px 92px 68px 88px 84px 68px 106px 28px'
    : '30px 176px 76px 80px 92px 68px 88px 106px 28px';

  /** Column labels, in the order the client specified. */
  const COLS: [string, 'left' | 'right' | 'center'][] = [
    ['Incl', 'center'], ['Crew role', 'left'],
    ['Allocation', 'right'], ['Labor hours', 'right'],
    ['Base labor rate', 'right'], ['Burden %', 'right'], ['Burden $', 'right'],
    ...(showFringe
      ? ([['Fringe $', 'right'], ['Fringe %', 'right']] as [string, 'right'][])
      : []),
    ['Total', 'right'], ['', 'right'],
  ];

  return (
    <SectionShell
      title="Labor" accent="#16A34A" bg="#F0FDF4" border="#BBF7D0"
      meta={`${rows.filter((r) => r.included !== false).length} of ${rows.length} crew roles in bid · ${totalHours.toFixed(2)} h · ${money(crew.blendedRate)}/h blended`}
      total={money(crew.costTotal)}
    >
      {/* Profile + template */}
      <div className="bp-toolbar" style={{ padding: '8px 14px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
        <span style={{ fontSize: 11, color: '#6B7280' }}>Labor profile</span>
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          aria-label="Labor profile"
          title="The published rate basis this estimate is priced on. Applies to every crew row below."
          style={{
            height: 26, padding: '0 6px', borderRadius: 5, fontSize: 11, outline: 'none',
            border: `1px solid ${profileId === DEFAULT_LABOR_PROFILE ? '#E5E7EB' : '#BFDBFE'}`,
            background: profileId === DEFAULT_LABOR_PROFILE ? 'white' : '#EFF6FF',
            color: profileId === DEFAULT_LABOR_PROFILE ? '#374151' : '#1D4ED8',
            fontWeight: 600,
          }}
        >
          {LABOR_PROFILES.map((p) => (
            <option key={p.id} value={p.id}>{p.label} · {p.desc}</option>
          ))}
        </select>
        {/* The factor, stated. A profile that silently moves the money is worse
            than no profile at all. */}
        <span style={{ fontSize: 10, color: profile.rateFactor === 1 ? '#9CA3AF' : '#B45309' }}>
          {profile.rateFactor === 1
            ? 'base rates as entered'
            : `base rates × ${profile.rateFactor.toFixed(2)}`}
        </span>
        <div style={{ flex: 1 }} />
        <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          <input
            type="checkbox" checked={showFringe}
            onChange={(e) => setShowFringe(e.target.checked)}
            style={{ accentColor: '#2563EB', width: 13, height: 13, cursor: 'pointer' }}
          />
          Fringe benefits
        </label>
        {/* Collapsing hides the columns, not the money — say so rather than let it look dropped. */}
        {!showFringe && fringeInTotal > 0 && (
          <span style={{ fontSize: 10, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 6px', borderRadius: 4 }}>
            {money(fringeInTotal)} fringe still in total
          </span>
        )}
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

      <div className="bp-scroll-x">
      <div style={{ minWidth: showFringe ? 1146 : 926 }}>
      {/* Header alignment mirrors each column's contents, same as the other tabs. */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '7px 14px', gap: 12, borderBottom: '2px solid #F3F4F6', background: '#FAFAFA' }}>
        {COLS.map(([h, align], i) => (
          <div key={h || `blank-${i}`} style={{ ...COL_HEAD, textAlign: align }}>{h}</div>
        ))}
      </div>

      {crew.lines.map((line) => {
        const inBid = line.included !== false;
        const dim = inBid ? '#374151' : '#9CA3AF';
        return (
        <div key={line.id} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', minHeight: 38, padding: '5px 14px', gap: 12, borderBottom: '1px solid #F3F4F6', background: inBid ? 'white' : '#FCFCFD' }}>
          <span style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <input
              type="checkbox"
              checked={inBid}
              aria-label={`Include ${line.role}`}
              onChange={(e) => update(line.id, { included: e.target.checked })}
              style={{ accentColor: '#2563EB', width: 14, height: 14, cursor: 'pointer' }}
            />
          </span>
          {/*
            Full column width. It was sized to its content, so it sat short of
            the Crew role track and every value below the header looked indented
            relative to it.
          */}
          <select
            value={line.role}
            onChange={(e) => update(line.id, { role: e.target.value })}
            style={{ height: 28, width: '100%', minWidth: 0, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, background: 'white', outline: 'none', color: '#374151', boxSizing: 'border-box' }}
          >
            {CREW_ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>

          {/* Allocation, with the hours it produces immediately beside it. */}
          <RateInput value={line.allocation} onChange={(v) => update(line.id, { allocation: v })} suffix="%" />
          <span style={{ ...FIG, color: dim }}>{line.hours.toFixed(2)} h</span>

          {/* Base rate, then burden — a percentage and the dollars it comes to. */}
          {/*
            Bound to the row's **own** base rate, not the profile-scaled one that
            `crew.lines` carries. Showing the scaled figure here would let an edit
            write it back as the new base rate and bake the factor in permanently —
            the profile is a lens over the rates, never an edit to them.
          */}
          <RateInput
            value={rows.find((r) => r.id === line.id)?.baseRate ?? line.baseRate}
            onChange={(v) => update(line.id, { baseRate: v })}
            prefix="$"
          />
          <RateInput
            value={line.burdenPct} onChange={(v) => update(line.id, { burdenPct: v })} suffix="%"
            title="Payroll taxes, workers' comp and unemployment — charged on the base rate only"
          />
          <span style={{ ...FIG, color: dim }} title="Burden on the base rate">{money(line.burdenAmount)}</span>

          {/* Fringe: a dollar amount, and a percentage quantified off that amount. */}
          {showFringe && (
            <>
              <RateInput
                value={line.fringeDollars} onChange={(v) => update(line.id, { fringeDollars: v })} prefix="$"
                title="Davis-Bacon / union fringe benefit per hour — leave at zero on open shop work"
              />
              <div>
                <RateInput
                  value={line.fringePct} onChange={(v) => update(line.id, { fringePct: v })} suffix="%" step={0.1}
                  disabled={line.fringeDollars === 0}
                  title="A percentage of the fringe dollars, not of the base rate"
                />
                {line.fringeAmount > 0 && (
                  <span style={{ ...FIG, fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>+{money(line.fringeAmount)}</span>
                )}
              </div>
            </>
          )}

          {/* Total for the row, with the loaded rate that produced it. */}
          <span>
            <span style={{ ...FIG, fontWeight: 600, color: inBid ? '#111827' : '#9CA3AF' }}>{money(line.extCost)}</span>
            <span style={{ ...FIG, fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>{money(line.loadedRate)}/h</span>
          </span>

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
      <div style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', minHeight: 38, padding: '0 14px', gap: 12, background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
        <span />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</span>
        <span style={{ ...FIG, fontWeight: 700, color: crew.balanced ? '#16A34A' : '#DC2626' }}>
          {crew.allocationTotal.toFixed(2)}%
        </span>
        <span style={{ ...FIG, fontWeight: 700, color: '#111827' }}>{crew.hoursTotal.toFixed(2)} h</span>
        <span />
        <span />
        <span style={{ ...FIG, color: '#6B7280' }}>{money(crew.lines.reduce((s, l) => s + (l.included !== false ? l.burdenAmount : 0), 0))}</span>
        {showFringe && <><span /><span /></>}
        <span>
          <span style={{ ...FIG, fontWeight: 700, color: '#111827' }}>{money(crew.costTotal)}</span>
          <span style={{ ...FIG, fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>{money(crew.blendedRate)}/h blended</span>
        </span>
        <span />
      </div>
      </div>
      </div>

      <AddLineButton
        label="Add crew role"
        onClick={() => onRowsChange([...rows, {
          id: `crew-${rows.length}-${Math.round(crew.allocationTotal)}`,
          role: 'General Labor', allocation: 0,
          baseRate: 25, burdenPct: 28, fringeDollars: 0, fringePct: 0,
        }])}
      />
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

/**
 * Cost categories, in the order the estimator works them.
 *
 * "Overview" and "Job Expenses" replace McCormick's "Top Sheet" and "Direct Job
 * Expenses" — the client wants the McCormick echo softened.
 *
 * Adjustments is parked, not deleted: it is the future home for job-level
 * factors (building height, unproductive labor), so it stays in the union and
 * still renders — it is simply left out of VISIBLE_BID_TABS.
 */
const BID_TABS = [
  'Overview',
  'Labor',
  'Quotes',
  'Subcontractors',
  'Job Expenses',
  'Equipment Rental',
  'Bond',
  'Tax',
  'Adjustments',
] as const;

type BidTab = (typeof BID_TABS)[number];

const PARKED_TABS: BidTab[] = ['Adjustments'];
const VISIBLE_BID_TABS = BID_TABS.filter((t) => !PARKED_TABS.includes(t));

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
      {VISIBLE_BID_TABS.map((tab) => {
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
  const [tab, setTab] = useState<BidTab>('Overview');
  const [sections, setSections] = useState<Section[]>(INIT_SECTIONS);
  const [showHealth, setShowHealth] = useState(true);
  const [showValidation, setShowValidation] = useState(false);

  // Markup: project overrides layered over the company defaults.
  const [overrides, setOverrides] = useState<MarkupOverrides>({});
  const markup = effectiveMarkup(overrides);

  const [squareFeet, setSquareFeet] = useState(String(DEFAULT_SQUARE_FEET));
  /**
   * Tax region: a state from the 50-state table, the rate basis to read off it,
   * and whatever county or city percentage sits on top. The rate that actually
   * prices the bid is markup.taxRate — these drive it, and the Tax tab offers to
   * apply the derived figure whenever the two drift apart.
   */
  const [taxRegion, setTaxRegion] = useState('PA');
  const [taxBasis, setTaxBasis] = useState<RateBasis>('state');
  const [taxCustom, setTaxCustom] = useState(2);

  /**
   * The Bid Summaries in this estimate, and which one is being worked on.
   *
   * ONE master estimate, several priced bids. Scope, overhead, profit, tax and
   * bond all live on the summary — not on the screen — which is what lets Base
   * Bid carry 12%/13% on material while the Fire Alarm Alternate carries 8%/10%
   * without either touching the other.
   *
   * The takeoff and the material list are shared and are never copied. Editing a
   * summary edits a reference into the master, so a price fixed tomorrow reaches
   * every summary at once.
   */
  const [summaries, setSummaries] = useState<BidSummary[]>(initialSummaries);
  const [activeSummaryId, setActiveSummaryId] = useState('sum-base');
  const [editScopeOpen, setEditScopeOpen] = useState(false);

  const activeSummary = summaries.find((x) => x.id === activeSummaryId) ?? summaries[0];

  /** Patch the selected summary. Every other summary is left exactly as it was. */
  const patchActive = (patch: Partial<BidSummary>) =>
    setSummaries((prev) => prev.map((x) => (x.id === activeSummary.id ? { ...x, ...patch } : x)));

  const taxSettings = activeSummary.tax;
  const catRates = activeSummary.rates;

  const setTaxable = (id: CostCategoryId, on: boolean) =>
    patchActive({ tax: { ...taxSettings, taxable: { ...taxSettings.taxable, [id]: on } } });

  /** `undefined` removes the override so the category follows the bid rate again. */
  const setCategoryTaxRate = (id: CostCategoryId, rate: number | undefined) => {
    const rates = { ...taxSettings.rates };
    if (rate === undefined) delete rates[id]; else rates[id] = rate;
    patchActive({ tax: { ...taxSettings, rates } });
  };

  /*
   * `buckets` mirrors the selected summary's `includes`. It stays as its own
   * state because the cost tabs read it on every render; it is written back to
   * the summary so the include set survives switching summaries.
   */
  const buckets = useMemo(() => {
    const out = { ...ALL_BUCKETS_IN };
    /*
     * Only the seven real cost categories map to `includes`. `adjustments` is
     * out of the bid entirely and has no category — leaving it in this loop made
     * every summary report "1 bucket excluded" about work that does not exist.
     */
    COST_CATEGORIES.forEach((c) => {
      out[c as BucketId] = activeSummary.scope.includes.includes(c);
    });
    return out;
  }, [activeSummary]);

  const setBuckets = (next: Record<BucketId, boolean> | ((p: Record<BucketId, boolean>) => Record<BucketId, boolean>)) => {
    const resolved = typeof next === 'function' ? next(buckets) : next;
    patchActive({
      scope: {
        ...activeSummary.scope,
        includes: COST_CATEGORIES.filter((c) => resolved[c as BucketId] !== false),
      },
    });
  };

  // Crew allocation, seeded from the default company template.
  const [crewRows, setCrewRows] = useState<CrewRow[]>(
    CREW_TEMPLATES[0].rows.map((r, i) => ({ ...r, id: `crew-init-${i}` })),
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

  /**
   * Per-category overhead and profit, set on the Overview.
   *
   * An absent entry inherits the bid rate, so raising the bid's overhead still
   * moves every category that has not been given its own — while an explicit 0%
   * on pass-through subcontract work stays 0% regardless.
   */
  const setCatRate = (id: CostCategoryId, field: 'overhead' | 'profit', value: number | undefined) => {
    const next: CategoryRateMap = { ...catRates, [id]: { ...catRates[id], [field]: value } };
    if (next[id]!.overhead === undefined && next[id]!.profit === undefined) delete next[id];
    patchActive({ rates: next });
  };

  // ── Derived totals — every input feeds one computation ────────────────────
  const materialCost = useMemo(
    () => (sections.find((sec) => sec.id === 'material')?.items ?? [])
      .filter((i) => i.included !== false)
      .reduce((sum, i) => sum + i.extCost, 0),
    [sections],
  );

  /**
   * Derived here rather than reported up from the Labor tab: the summary header
   * is always on screen, so labor cannot wait for its own tab to mount before
   * it counts.
   */
  /*
   * The crew as the selected labor profile prices it.
   *
   * Derived once and used by every consumer below, so the Labor section's own
   * total and the bid's labor cost cannot be computed on different rate bases —
   * a profile that changed one panel and not the sell price would be worse than
   * the static label it replaced.
   */
  const [bidLaborProfile] = useLaborProfile();
  const pricedCrewRows = useMemo(
    () => applyLaborProfile(crewRows, bidLaborProfile),
    [crewRows, bidLaborProfile],
  );

  const laborCost = useMemo(
    () => computeCrew(pricedCrewRows, TAKEOFF_LABOR_HOURS).costTotal,
    [pricedCrewRows],
  );

  /**
   * Every direct cost, tagged with the area and system it belongs to.
   *
   * Material joins back to its pricing row for the drawing page and system —
   * the takeoff was counted page by page, so the page *is* the area. Quotes and
   * subcontracts are read from their own descriptions and carry no area: a
   * switchgear package is service scope wherever it is installed.
   */
  const scopeSource: ScopeSource = useMemo(() => ({
    material: (sections.find((sec) => sec.id === 'material')?.items ?? [])
      .filter((i) => i.included !== false)
      .map((i) => {
        const line = MATERIAL_LINES.find((r) => r.id === i.id);
        return {
          tag: {
            area: line ? AREA_BY_DRAWING[line.drawingPage] ?? null : null,
            system: line ? SYSTEM_BY_GROUP[line.system] ?? null : null,
          },
          cost: i.extCost,
          hours: line?.totalLabourHrs ?? 0,
        };
      }),
    quotes: quotes.filter((q) => q.included).map((q) => ({
      tag: { area: null, system: systemFromText(`${q.quoteType} ${q.supplier}`) },
      cost: costAmount(q.unitCost, 1, q.multiplier),
    })),
    subs: subs.filter((x) => x.included).map((x) => ({
      tag: { area: null, system: systemFromText(x.scope) },
      cost: costAmount(x.quotedCost, 1, x.multiplier),
    })),
  }), [sections, quotes, subs]);

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
    /*
     * Adjustments contributes nothing. Its tab is parked, so an estimator can
     * neither see nor change it, and a category that moves the price from
     * behind a hidden tab is worse than one that is simply not in the bid yet.
     * Restore it here and on the Overview together, never one without the other.
     */
    adjustments: 0,
    squareFeet: parseFloat(squareFeet) || 0,
  };

  const preBond = useMemo(() => computeBid({ ...baseInputs, bond: 0 }, markup, catRates, taxSettings), [
    materialCost, laborCost, quotesCost, subsCost, expensesCost, equipmentCost, squareFeet, markup, buckets, catRates, taxSettings,
  ]);

  const bondCost = useMemo(
    () => (buckets.bond
      ? bonds.filter((b) => b.included).reduce((s, b) => s + bondPremium(b, preBond.sellPrice), 0)
      : 0),
    [bonds, preBond.sellPrice, buckets.bond],
  );


  /**
   * Price a Bid Summary.
   *
   * Same `computeBid`, same tagged estimate, same crew mix — what the summary
   * supplies is its scope, its per-category overhead and profit, its tax
   * settings and whether it carries bond. Nothing is copied: the summary is a
   * set of references and rates applied to the one master estimate.
   *
   * Job-running costs (expenses, equipment hire, bond) are apportioned by the
   * selection's share of direct cost — they are not attributable to a floor or a
   * system, and charging a part-scope bid for all of them would price it off the
   * job. A full-scope summary gets all of them, because its share is 1.
   */
  const priceSummary = useCallback((sum: BidSummary): { totals: BidTotals; laborHours: number } => {
    const sc = scopedCosts(scopeSource, scopeSelectionOf(sum));
    const inc = (id: CostCategoryId, v: number) => (sum.scope.includes.includes(id) ? v : 0);
    const hours = TAKEOFF_LABOR_HOURS * sc.laborShare;
    const scopedLabor = computeCrew(pricedCrewRows, hours).costTotal;
    const totals = computeBid({
      materialCost: inc('material', sc.materialCost),
      laborCost: inc('labor', scopedLabor),
      quotesCost: inc('quotes', sc.quotesCost),
      subcontractorCost: inc('subs', sc.subcontractorCost),
      directJobExpenses: inc('expenses', expensesCost * sc.share),
      equipmentRental: inc('equipment', equipmentCost * sc.share),
      bond: sum.bond ? inc('bond', bondCost * sc.share) : 0,
      adjustments: 0,
      squareFeet: parseFloat(squareFeet) || 0,
    }, markup, sum.rates, sum.tax);
    return { totals, laborHours: sum.scope.includes.includes('labor') ? hours : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeSource, pricedCrewRows, expensesCost, equipmentCost, bondCost, squareFeet, markup]);

  /** Every summary, priced. One computation each, read by every consumer. */
  const pricedSummaries: PricedSummary[] = useMemo(
    () => summaries.map((sum) => ({ summary: sum, ...priceSummary(sum) })),
    [summaries, priceSummary],
  );

  const activePriced = pricedSummaries.find((x) => x.summary.id === activeSummary.id) ?? pricedSummaries[0];

  /**
   * The selected summary's numbers, and the only `totals` on this screen.
   *
   * The header strip, the recap table and the right-hand panel all read this, so
   * switching summaries moves every figure together — there is no second total
   * for them to disagree with.
   */
  const totals: BidTotals = activePriced.totals;


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
      /*
       * The priced summaries travel with the snapshot. The Proposal Center picks
       * whole summaries — it never re-derives a price and never sees the scope
       * arithmetic, which is what stops the two screens disagreeing.
       */
      summaries: pricedSummaries,
      activeSummaryId: activeSummary.id,
    });
  }, [totals, pricedSummaries, activeSummary.id]);

  // ── Bid Summary actions ───────────────────────────────────────────────────
  /*
   * Creating a summary never touches the takeoff or the material list. It adds a
   * reference — a scope plus its own rates — over the estimate that already
   * exists, which is the whole point of the layer.
   */
  function handleNewSummary() {
    const name = window.prompt('Name this Bid Summary', `Alternate ${summaries.length}`);
    if (!name || !name.trim()) return;
    const created = newSummary(name.trim(), activeSummary);
    setSummaries((prev) => [...prev, created]);
    setActiveSummaryId(created.id);
    toast.success('Bid Summary created', {
      description: `${created.name} starts from the same master estimate — set its scope next.`,
    });
  }

  function handleRenameSummary(id: string) {
    const target = summaries.find((x) => x.id === id);
    if (!target) return;
    const name = window.prompt('Rename Bid Summary', target.name);
    if (!name || !name.trim()) return;
    setSummaries((prev) => prev.map((x) => (x.id === id ? { ...x, name: name.trim() } : x)));
  }

  function handleDuplicateSummary(id: string) {
    const target = summaries.find((x) => x.id === id);
    if (!target) return;
    const copy = newSummary(`Copy of ${target.name}`, target);
    setSummaries((prev) => [...prev, copy]);
    setActiveSummaryId(copy.id);
    toast.success('Bid Summary duplicated', { description: `${copy.name} — same scope and rates, its own result.` });
  }

  function handleDeleteSummary(id: string) {
    const target = summaries.find((x) => x.id === id);
    if (!target || target.protected) return;
    setSummaries((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (id === activeSummaryId) setActiveSummaryId(next[0]?.id ?? 'sum-base');
      return next;
    });
    toast.success('Bid Summary deleted', { description: `${target.name} removed. The master estimate is untouched.` });
  }

  function handleApplyScope(scope: SummaryScope) {
    patchActive({ scope });
    setEditScopeOpen(false);
    toast.success('Scope applied', { description: `${activeSummary.name} repriced from the master estimate.` });
  }

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
      /*
       * A generator quote is only expected once the other major packages are
       * priced — an empty Quotes tab should not accuse the estimator of missing
       * something they have not started.
       */
      {
        system: 'Generator',
        hasQuote: quotes.some((q) => q.included && /generator/i.test(q.quoteType))
          || !(quotes.some((q) => q.included && q.quoteType === 'Fixtures')
            && quotes.some((q) => q.included && q.quoteType === 'Switchgear')),
      },
    ],
    includedExpensesWithoutValue: expenses
      .filter((e) => e.included && costAmount(e.unitCost, e.quantity, 1) === 0)
      .map((e) => e.expense),
    markup: MARKUP_FIELDS.map((f) => ({ label: f.label, value: markup[f.key], required: f.key !== 'laborMarkup' })),
    taxRate: markup.taxRate,
    taxRegion: findRegion(taxRegion)?.name ?? '',
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
    'Job Expenses': on('expenses', expensesCost),
    'Equipment Rental': on('equipment', equipmentCost),
    Bond: bondCost,
    Tax: totals.tax,
    // Adjustments carries no amount: its tab is parked and it is out of the bid.
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
          onShowTopSheet={() => setTab('Overview')}
        />
        <BidTabBar active={tab} onChange={setTab} amounts={tabAmounts} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '12px 20px 24px', maxWidth: 1560, margin: '0 auto' }}>
          {tab === 'Overview' && (
            <>
              <SummaryStrip
                summaries={summaries}
                activeId={activeSummary.id}
                priceOf={(sum) => pricedSummaries.find((x) => x.summary.id === sum.id)?.totals.totalBid ?? 0}
                onSelect={setActiveSummaryId}
                onEditScope={() => setEditScopeOpen(true)}
                onRename={handleRenameSummary}
                onDuplicate={handleDuplicateSummary}
                onDelete={handleDeleteSummary}
              />

              <SummaryScopeBand summary={activeSummary} />

              <TopSheet
                summaryName={activeSummary.name}
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
                onCatRate={setCatRate}
              />

              <AllSummariesTable
                priced={pricedSummaries}
                activeId={activeSummary.id}
                onSelect={setActiveSummaryId}
                onNew={handleNewSummary}
              />

              {showHealth && healthIssues.length > 0 && (
                <HealthPanel issues={healthIssues} onDismiss={() => setShowHealth(false)} onAction={handleHealthAction} />
              )}

              <CollapsiblePanel title="Bid review" meta="AI inspector" accent="#7C3AED" bg="#F5F3FF" border="#DDD6FE" defaultOpen>
                <ReviewPanel />
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

          {tab === 'Job Expenses' && (
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
              region={taxRegion}
              onRegionChange={setTaxRegion}
              basis={taxBasis}
              onBasisChange={setTaxBasis}
              custom={taxCustom}
              onCustomChange={setTaxCustom}
              taxSettings={taxSettings}
              onTaxEnabled={(on) => patchActive({ tax: { ...taxSettings, enabled: on } })}
              onTaxableChange={setTaxable}
              onTaxRateChange={setCategoryTaxRate}
            />
          )}

          {tab === 'Adjustments' && (
            <AdjustmentsTab rows={adjustments} onChange={setAdjustments} />
          )}
        </div>
      </div>

      {editScopeOpen && (
        <EditScopeDrawer
          summary={activeSummary}
          onCancel={() => setEditScopeOpen(false)}
          onApply={handleApplyScope}
        />
      )}

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
