import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Info, Save } from 'lucide-react';
import { money, pct, MarkupKey, MarkupOverrides, isInherited, COMPANY_DEFAULTS } from '../../lib/costing';
import {
  QuoteRow, QUOTE_CATEGORIES, QUOTE_STATUS_CFG, QuoteStatus,
  SubRow, SUB_SCOPES,
  ExpenseLine, EXPENSE_GROUPS, ExpenseGroupId,
  EquipmentRow, RENTAL_PERIODS, equipmentAmount,
  BondRow, BondKind, bondPremium,
  AdjustmentRow, AdjustmentStatus, ADJUSTMENT_STATUS_CFG, adjustmentNet,
  COST_CODES, costAmount, rowTax, remaining,
} from './bidData';
import {
  GroupedTable, TableGroup, TableRow, TableToolbar, AddRowButton, TotalsRow,
  TextCell, SelectCell, NumCell, AmountCell, StaticCell, IncludeCheck, TaxCheck, AttachCell,
  RowActions, DetailDrawer, DrawerField, DrawerReadout, drawerInput, HEAD_CELL, MONO,
  ColumnDef, headStyle,
} from './bidTable';

/** Column sets, alignment declared beside the label so headers match cells. */
const L = (label: string): ColumnDef => ({ label, align: 'left' });
const R = (label: string): ColumnDef => ({ label, align: 'right' });
const C = (label: string): ColumnDef => ({ label, align: 'center' });

/**
 * The Bid Builder's cost-category tabs.
 *
 * Each tab is the same shape: a toolbar (expand / collapse / tab-specific
 * actions), a grouped table whose groups start collapsed with their subtotal in
 * the header, an add action, and a right drawer for the fields that would
 * otherwise widen the table past reading.
 */

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Groups start expanded.
 *
 * Tracked as the set of *closed* ids rather than open ones, so a group that
 * appears later — a new quote category, a new hire company — is open like the
 * rest instead of hiding the row that was just added.
 */
function useGroups(allIds: string[]) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  return {
    open: {
      has: (id: string) => !closed.has(id),
    } as Pick<Set<string>, 'has'>,
    toggle: (id: string) => setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    }),
    expandAll: () => setClosed(new Set()),
    collapseAll: () => setClosed(new Set(allIds)),
  };
}

function TabShell({ title, meta, total, children }: {
  title: string; meta: string; total: number; children: React.ReactNode;
}) {
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</span>
        <span style={{ fontSize: 11, color: '#6B7280', flex: 1 }}>{meta}</span>
        <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In bid</span>
        <span style={{ ...MONO, fontSize: 16, fontWeight: 700, color: '#111827' }}>{money(total)}</span>
      </div>
      {children}
    </div>
  );
}

function NoteBanner({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warn' }) {
  const cfg = tone === 'warn'
    ? { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: <AlertTriangle size={11} color="#D97706" /> }
    : { bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', icon: <Info size={11} color="#2563EB" /> };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
      {cfg.icon}
      <span style={{ fontSize: 11, color: cfg.color }}>{text}</span>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  height: 26, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 6,
  background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
};

// ─── Quotes ───────────────────────────────────────────────────────────────────

const Q_GRID = '34px 132px 148px 118px 146px 72px 34px 94px 66px 104px 96px 104px 52px';
const Q_COLS: ColumnDef[] = [
  C('Incl'), L('Quote type'), L('Supplier'), L('Quote ref'), L('Cost code'),
  R('Labor hrs'), C('Tax'), R('Unit cost'), R('Mult'), R('Cost amount'), R('Remaining'),
  L('Attachment'), R(''),
];

export function QuotesTab({ rows, onChange, taxRate }: {
  rows: QuoteRow[]; onChange: (r: QuoteRow[]) => void; taxRate: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const today = '2026-08-02';

  const categories = useMemo(() => {
    const used = Array.from(new Set(rows.map((r) => r.quoteType))).filter(Boolean);
    return Array.from(new Set([...QUOTE_CATEGORIES, ...used]));
  }, [rows]);

  const present = useMemo(
    () => categories.filter((c) => rows.some((r) => r.quoteType === c)),
    [categories, rows],
  );
  const g = useGroups(present);

  function update(id: string, patch: Partial<QuoteRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const amountOf = (r: QuoteRow) => costAmount(r.unitCost, 1, r.multiplier);

  const groups: TableGroup<QuoteRow>[] = present.map((cat) => {
    const list = rows.filter((r) => r.quoteType === cat);
    const expiredIncluded = list.filter((r) => r.included && r.expiration && r.expiration < today).length;
    return {
      id: cat,
      label: cat,
      rows: list,
      subtotal: list.filter((r) => r.included).reduce((s, r) => s + amountOf(r), 0),
      warning: expiredIncluded > 0 ? `${expiredIncluded} expired` : undefined,
    };
  });

  const includedTotal = rows.filter((r) => r.included).reduce((s, r) => s + amountOf(r), 0);
  const remainingTotal = rows.reduce((s, r) => s + remaining(amountOf(r), r.included), 0);
  const active = rows.find((r) => r.id === openId) ?? null;

  function addQuote() {
    const id = `q-${rows.length + 1}-${Math.round(includedTotal)}`;
    onChange([...rows, {
      id, included: false, quoteType: QUOTE_CATEGORIES[0], supplier: '', reference: '',
      costCode: COST_CODES[0], labourHours: 0, taxable: true, unitCost: 0, multiplier: 1,
      expiration: '', status: 'requested', markup: 0,
    }]);
    if (!g.open.has(QUOTE_CATEGORIES[0])) g.toggle(QUOTE_CATEGORIES[0]);
    setOpenId(id);
  }

  return (
    <TabShell
      title="Quotes"
      meta={`${rows.filter((r) => r.included).length} of ${rows.length} included · ${present.length} categories`}
      total={includedTotal}
    >
      <TableToolbar onExpandAll={g.expandAll} onCollapseAll={g.collapseAll}>
        <button onClick={addQuote} style={{ ...smallBtn, borderColor: '#93C5FD', color: '#1D4ED8', fontWeight: 600 }}>
          + Add Quote
        </button>
      </TableToolbar>

      <GroupedTable
        groups={groups}
        columns={Q_COLS}
        gridTemplate={Q_GRID}
        minWidth={1490}
        open={g.open}
        onToggle={g.toggle}
        renderRow={(row) => {
          const amt = amountOf(row);
          const expired = !!row.expiration && row.expiration < today;
          return (
            <TableRow key={row.id} gridTemplate={Q_GRID} muted={!row.included} warn={expired && row.included}>
              <IncludeCheck on={row.included} onChange={(v) => update(row.id, { included: v })} label={row.supplier || 'quote'} />
              <SelectCell value={row.quoteType} onChange={(v) => update(row.id, { quoteType: v })} options={categories} allowCustom />
              <TextCell value={row.supplier} onChange={(v) => update(row.id, { supplier: v })} placeholder="Supplier" strong />
              <TextCell value={row.reference} onChange={(v) => update(row.id, { reference: v })} placeholder="Quote ref" />
              <SelectCell value={row.costCode} onChange={(v) => update(row.id, { costCode: v })} options={COST_CODES} allowCustom />
              <NumCell value={row.labourHours} onChange={(v) => update(row.id, { labourHours: v })} step={0.25} suffix="h" />
              <TaxCheck on={row.taxable} onChange={(v) => update(row.id, { taxable: v })} label={row.supplier || 'quote'} />
              <NumCell value={row.unitCost} onChange={(v) => update(row.id, { unitCost: v })} prefix="$" step={0.01} />
              <NumCell value={row.multiplier} onChange={(v) => update(row.id, { multiplier: v })} step={0.01} />
              <AmountCell value={amt} strong muted={!row.included} />
              <AmountCell value={remaining(amt, row.included)} muted />
              <AttachCell
                name={row.attachment}
                onToggle={() => {
                  update(row.id, { attachment: row.attachment ? undefined : `${(row.reference || 'quote').replace(/\s+/g, '-')}.pdf` });
                  toast.info(row.attachment ? 'Attachment removed' : 'Attachment linked');
                }}
              />
              <RowActions
                onOpen={() => setOpenId(row.id)}
                onDelete={() => onChange(rows.filter((r) => r.id !== row.id))}
                deleteLabel={row.supplier || 'quote'}
              />
            </TableRow>
          );
        }}
      />

      <TotalsRow
        gridTemplate={Q_GRID}
        cells={[
          <span key="l" style={{ ...headStyle('left'), color: '#374151' }}>Total</span>,
          <span key="1" />, <span key="2" />, <span key="3" />, <span key="4" />,
          <span key="hrs" style={{ ...MONO, fontSize: 11, color: '#6B7280', textAlign: 'right', display: 'block', width: '100%' }}>
            {rows.filter((r) => r.included).reduce((s, r) => s + r.labourHours, 0).toFixed(2)} h
          </span>,
          <span key="6" />,
          <StaticCell key="tax" align="right">{money(rows.filter((r) => r.included).reduce((s, r) => s + rowTax(amountOf(r), r.taxable, taxRate), 0))}</StaticCell>,
          <span key="8" />,
          <AmountCell key="amt" value={includedTotal} strong />,
          <AmountCell key="rem" value={remainingTotal} muted />,
          <span key="11" />, <span key="12" />,
        ]}
      />

      <AddRowButton onClick={addQuote} label="Add Quote" />

      {active && (
        <DetailDrawer
          title={active.supplier || 'New quote'}
          subtitle={`${active.quoteType}${active.reference ? ` · ${active.reference}` : ''}`}
          onClose={() => setOpenId(null)}
        >
          <DrawerField label="Expiration date" hint={active.expiration && active.expiration < today ? 'This quote has expired.' : undefined}>
            <input type="date" value={active.expiration} onChange={(e) => update(active.id, { expiration: e.target.value })} style={drawerInput} />
          </DrawerField>
          <DrawerField label="Status">
            <select value={active.status} onChange={(e) => update(active.id, { status: e.target.value as QuoteStatus })} style={drawerInput}>
              {(Object.keys(QUOTE_STATUS_CFG) as QuoteStatus[]).map((s) => (
                <option key={s} value={s}>{QUOTE_STATUS_CFG[s].label}</option>
              ))}
            </select>
          </DrawerField>
          <DrawerField label="Markup %" hint="Applied to this quote only, on top of the bid-level markup.">
            <input type="number" step="0.1" value={active.markup} onChange={(e) => update(active.id, { markup: parseFloat(e.target.value) || 0 })} style={drawerInput} />
          </DrawerField>
          <DrawerField label="Notes">
            <textarea
              value={active.notes ?? ''}
              onChange={(e) => update(active.id, { notes: e.target.value })}
              rows={3}
              style={{ ...drawerInput, height: 'auto', padding: 10, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </DrawerField>
          <DrawerReadout rows={[
            { label: 'Unit cost', value: money(active.unitCost) },
            { label: `Multiplier ×${active.multiplier}`, value: money(costAmount(active.unitCost, 1, active.multiplier)) },
            { label: `Markup ${active.markup}%`, value: money(costAmount(active.unitCost, 1, active.multiplier) * (active.markup / 100)) },
            { label: `Tax ${active.taxable ? `${taxRate}%` : '—'}`, value: money(rowTax(costAmount(active.unitCost, 1, active.multiplier), active.taxable, taxRate)) },
            { label: 'Sell price', value: money(costAmount(active.unitCost, 1, active.multiplier) * (1 + active.markup / 100)), strong: true },
          ]} />
        </DetailDrawer>
      )}
    </TabShell>
  );
}

// ─── Subcontractors ───────────────────────────────────────────────────────────

const S_GRID = '34px 132px 168px 146px 72px 34px 104px 66px 104px 96px 104px 52px';
const S_COLS: ColumnDef[] = [
  C('Incl'), L('Scope'), L('Subcontractor'), L('Cost code'),
  R('Labor hrs'), C('Tax'), R('Quoted cost'), R('Mult'), R('Cost amount'), R('Remaining'),
  L('Attachment'), R(''),
];

export function SubcontractorsTab({ rows, onChange, taxRate }: {
  rows: SubRow[]; onChange: (r: SubRow[]) => void; taxRate: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const scopes = useMemo(() => {
    const used = Array.from(new Set(rows.map((r) => r.scope))).filter(Boolean);
    return Array.from(new Set([...SUB_SCOPES, ...used]));
  }, [rows]);
  const present = useMemo(() => scopes.filter((s) => rows.some((r) => r.scope === s)), [scopes, rows]);
  const g = useGroups(present);

  function update(id: string, patch: Partial<SubRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const amountOf = (r: SubRow) => costAmount(r.quotedCost, 1, r.multiplier);

  const groups: TableGroup<SubRow>[] = present.map((scope) => {
    const list = rows.filter((r) => r.scope === scope);
    return {
      id: scope,
      label: scope,
      rows: list,
      subtotal: list.filter((r) => r.included).reduce((s, r) => s + amountOf(r), 0),
    };
  });

  const includedTotal = rows.filter((r) => r.included).reduce((s, r) => s + amountOf(r), 0);
  const remainingTotal = rows.reduce((s, r) => s + remaining(amountOf(r), r.included), 0);
  const active = rows.find((r) => r.id === openId) ?? null;

  function addSub() {
    const id = `s-${rows.length + 1}-${Math.round(includedTotal)}`;
    onChange([...rows, {
      id, included: false, scope: SUB_SCOPES[0], subcontractor: '', costCode: COST_CODES[0],
      labourHours: 0, taxable: false, quotedCost: 0, multiplier: 1,
    }]);
    if (!g.open.has(SUB_SCOPES[0])) g.toggle(SUB_SCOPES[0]);
    setOpenId(id);
  }

  return (
    <TabShell
      title="Subcontractors"
      meta={`${rows.filter((r) => r.included).length} of ${rows.length} included · ${present.length} scopes`}
      total={includedTotal}
    >
      <NoteBanner text="Labor hours are optional on subcontracted scope and are never derived — the quoted cost is the whole price." />

      <TableToolbar onExpandAll={g.expandAll} onCollapseAll={g.collapseAll}>
        <button onClick={addSub} style={{ ...smallBtn, borderColor: '#93C5FD', color: '#1D4ED8', fontWeight: 600 }}>
          + Add Subcontractor
        </button>
      </TableToolbar>

      <GroupedTable
        groups={groups}
        columns={S_COLS}
        gridTemplate={S_GRID}
        minWidth={1440}
        open={g.open}
        onToggle={g.toggle}
        renderRow={(row) => {
          const amt = amountOf(row);
          return (
            <TableRow key={row.id} gridTemplate={S_GRID} muted={!row.included}>
              <IncludeCheck on={row.included} onChange={(v) => update(row.id, { included: v })} label={row.subcontractor || 'subcontractor'} />
              <SelectCell value={row.scope} onChange={(v) => update(row.id, { scope: v })} options={scopes} allowCustom />
              <TextCell value={row.subcontractor} onChange={(v) => update(row.id, { subcontractor: v })} placeholder="Subcontractor" strong />
              <SelectCell value={row.costCode} onChange={(v) => update(row.id, { costCode: v })} options={COST_CODES} allowCustom />
              <NumCell value={row.labourHours} onChange={(v) => update(row.id, { labourHours: v })} step={0.25} suffix="h" />
              <TaxCheck on={row.taxable} onChange={(v) => update(row.id, { taxable: v })} label={row.subcontractor || 'subcontractor'} />
              <NumCell value={row.quotedCost} onChange={(v) => update(row.id, { quotedCost: v })} prefix="$" step={0.01} />
              <NumCell value={row.multiplier} onChange={(v) => update(row.id, { multiplier: v })} step={0.01} />
              <AmountCell value={amt} strong muted={!row.included} />
              <AmountCell value={remaining(amt, row.included)} muted />
              <AttachCell
                name={row.attachment}
                onToggle={() => {
                  update(row.id, { attachment: row.attachment ? undefined : `${(row.subcontractor || 'sub').split(' ')[0].toLowerCase()}-quote.pdf` });
                  toast.info(row.attachment ? 'Attachment removed' : 'Attachment linked');
                }}
              />
              <RowActions
                onOpen={() => setOpenId(row.id)}
                onDelete={() => onChange(rows.filter((r) => r.id !== row.id))}
                deleteLabel={row.subcontractor || 'subcontractor'}
              />
            </TableRow>
          );
        }}
      />

      <TotalsRow
        gridTemplate={S_GRID}
        cells={[
          <span key="l" style={{ ...headStyle('left'), color: '#374151' }}>Total</span>,
          <span key="1" />, <span key="2" />, <span key="3" />,
          <span key="hrs" style={{ ...MONO, fontSize: 11, color: '#6B7280', textAlign: 'right', display: 'block', width: '100%' }}>
            {rows.filter((r) => r.included).reduce((s, r) => s + r.labourHours, 0).toFixed(2)} h
          </span>,
          <span key="5" />,
          <StaticCell key="tax" align="right">{money(rows.filter((r) => r.included).reduce((s, r) => s + rowTax(amountOf(r), r.taxable, taxRate), 0))}</StaticCell>,
          <span key="7" />,
          <AmountCell key="amt" value={includedTotal} strong />,
          <AmountCell key="rem" value={remainingTotal} muted />,
          <span key="10" />, <span key="11" />,
        ]}
      />

      <AddRowButton onClick={addSub} label="Add Subcontractor" />

      {active && (
        <DetailDrawer
          title={active.subcontractor || 'New subcontractor'}
          subtitle={active.scope}
          onClose={() => setOpenId(null)}
        >
          <DrawerField label="Contact">
            <input value={active.contact ?? ''} onChange={(e) => update(active.id, { contact: e.target.value })} placeholder="Contact name" style={drawerInput} />
          </DrawerField>
          <DrawerField label="Phone">
            <input value={active.phone ?? ''} onChange={(e) => update(active.id, { phone: e.target.value })} placeholder="(02) 0000 0000" style={drawerInput} />
          </DrawerField>
          <DrawerField label="Insurance expiry" hint="Flagged at bid review when it lands before the programmed completion date.">
            <input type="date" value={active.insuranceExpiry ?? ''} onChange={(e) => update(active.id, { insuranceExpiry: e.target.value })} style={drawerInput} />
          </DrawerField>
          <DrawerField label="Scope notes">
            <textarea
              value={active.notes ?? ''}
              onChange={(e) => update(active.id, { notes: e.target.value })}
              rows={3}
              style={{ ...drawerInput, height: 'auto', padding: 10, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </DrawerField>
          <DrawerReadout rows={[
            { label: 'Quoted cost', value: money(active.quotedCost) },
            { label: `Multiplier ×${active.multiplier}`, value: money(amountOf(active)) },
            { label: `Tax ${active.taxable ? `${taxRate}%` : '—'}`, value: money(rowTax(amountOf(active), active.taxable, taxRate)) },
            { label: 'Labor hours', value: `${active.labourHours.toFixed(2)} h` },
            { label: 'Cost amount', value: money(amountOf(active)), strong: true },
          ]} />
        </DetailDrawer>
      )}
    </TabShell>
  );
}

// ─── Direct job expenses ──────────────────────────────────────────────────────

const E_GRID = '34px 158px 146px 146px 72px 34px 90px 60px 102px 96px 126px 52px';
const E_COLS: ColumnDef[] = [
  C('Incl'), L('Expense'), L('Supplier'), L('Cost code'),
  R('Labor hrs'), C('Tax'), R('Unit cost'), R('Qty'), R('Total cost'), R('Remaining'),
  L('Notes'), R(''),
];

export function ExpensesTab({ rows, onChange, taxRate }: {
  rows: ExpenseLine[]; onChange: (r: ExpenseLine[]) => void; taxRate: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const g = useGroups(EXPENSE_GROUPS.map((x) => x.id));

  function update(id: string, patch: Partial<ExpenseLine>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const totalOf = (r: ExpenseLine) => costAmount(r.unitCost, r.quantity, 1);

  /** Included rows with no cost entered — the estimator ticked it and moved on. */
  const missingCost = rows.filter((r) => r.included && totalOf(r) === 0);

  const groups: TableGroup<ExpenseLine>[] = EXPENSE_GROUPS.map((grp) => {
    const list = rows.filter((r) => r.group === grp.id);
    const missing = list.filter((r) => r.included && totalOf(r) === 0).length;
    return {
      id: grp.id,
      label: grp.label,
      rows: list,
      subtotal: list.filter((r) => r.included).reduce((s, r) => s + totalOf(r), 0),
      warning: missing > 0 ? `${missing} missing cost` : undefined,
    };
  });

  const includedTotal = rows.filter((r) => r.included).reduce((s, r) => s + totalOf(r), 0);
  const remainingTotal = rows.reduce((s, r) => s + remaining(totalOf(r), r.included), 0);
  const active = rows.find((r) => r.id === openId) ?? null;

  function addExpense() {
    const id = `dje-${rows.length + 1}-${Math.round(includedTotal)}`;
    onChange([...rows, {
      id, group: 'commercial-misc', included: true, expense: 'New expense', supplier: '',
      costCode: COST_CODES[0], labourHours: 0, taxable: false, unitCost: 0, quantity: 1, standard: false,
    }]);
    if (!g.open.has('commercial-misc')) g.toggle('commercial-misc');
    setOpenId(id);
  }

  return (
    <TabShell
      title="Direct Job Expenses"
      meta={`${rows.filter((r) => r.included).length} of ${rows.length} on the checklist`}
      total={includedTotal}
    >
      {missingCost.length > 0 && (
        <NoteBanner
          tone="warn"
          text={`${missingCost.length} included expense${missingCost.length === 1 ? '' : 's'} carr${missingCost.length === 1 ? 'ies' : 'y'} no cost: ${missingCost.slice(0, 3).map((r) => r.expense).join(', ')}${missingCost.length > 3 ? `, +${missingCost.length - 3} more` : ''}.`}
        />
      )}

      <TableToolbar onExpandAll={g.expandAll} onCollapseAll={g.collapseAll}>
        <button
          onClick={() => toast.success('Saved as company default', {
            description: `${rows.filter((r) => r.included).length} expenses will pre-tick on new bids.`,
          })}
          style={smallBtn}
        >
          <Save size={11} /> Save as Company Default
        </button>
        <button onClick={addExpense} style={{ ...smallBtn, borderColor: '#93C5FD', color: '#1D4ED8', fontWeight: 600 }}>
          + Add Expense
        </button>
      </TableToolbar>

      <GroupedTable
        groups={groups}
        columns={E_COLS}
        gridTemplate={E_GRID}
        minWidth={1390}
        open={g.open}
        onToggle={g.toggle}
        renderRow={(row) => {
          const total = totalOf(row);
          const missing = row.included && total === 0;
          return (
            <TableRow key={row.id} gridTemplate={E_GRID} muted={!row.included} warn={missing}>
              <IncludeCheck on={row.included} onChange={(v) => update(row.id, { included: v })} label={row.expense} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: row.included ? '#111827' : '#9CA3AF', fontWeight: row.included ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.expense}
                </span>
                {row.standard && (
                  <span title="Standard checklist entry — can be excluded but not deleted" style={{ fontSize: 8, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>STD</span>
                )}
              </span>
              <TextCell value={row.supplier} onChange={(v) => update(row.id, { supplier: v })} placeholder="Supplier" />
              <SelectCell value={row.costCode} onChange={(v) => update(row.id, { costCode: v })} options={COST_CODES} allowCustom />
              <NumCell value={row.labourHours} onChange={(v) => update(row.id, { labourHours: v })} step={0.25} suffix="h" />
              <TaxCheck on={row.taxable} onChange={(v) => update(row.id, { taxable: v })} label={row.expense} />
              <NumCell value={row.unitCost} onChange={(v) => update(row.id, { unitCost: v })} prefix="$" step={0.01} />
              <NumCell value={row.quantity} onChange={(v) => update(row.id, { quantity: v })} step={1} />
              <AmountCell value={total} strong muted={!row.included} warn={missing} />
              <AmountCell value={remaining(total, row.included)} muted />
              <TextCell value={row.notes ?? ''} onChange={(v) => update(row.id, { notes: v })} placeholder="Note" />
              <RowActions
                onOpen={() => setOpenId(row.id)}
                onDelete={row.standard ? undefined : () => onChange(rows.filter((r) => r.id !== row.id))}
                deleteLabel={row.expense}
                locked={row.standard}
              />
            </TableRow>
          );
        }}
      />

      <TotalsRow
        gridTemplate={E_GRID}
        cells={[
          <span key="l" style={{ ...headStyle('left'), color: '#374151' }}>Total</span>,
          <span key="1" />, <span key="2" />, <span key="3" />,
          <span key="hrs" style={{ ...MONO, fontSize: 11, color: '#6B7280', textAlign: 'right', display: 'block', width: '100%' }}>
            {rows.filter((r) => r.included).reduce((s, r) => s + r.labourHours, 0).toFixed(2)} h
          </span>,
          <span key="5" />,
          <StaticCell key="tax" align="right">{money(rows.filter((r) => r.included).reduce((s, r) => s + rowTax(totalOf(r), r.taxable, taxRate), 0))}</StaticCell>,
          <span key="7" />,
          <AmountCell key="amt" value={includedTotal} strong />,
          <AmountCell key="rem" value={remainingTotal} muted />,
          <span key="10" />, <span key="11" />,
        ]}
      />

      <AddRowButton onClick={addExpense} label="Add Expense" />

      {active && (
        <DetailDrawer title={active.expense} subtitle={EXPENSE_GROUPS.find((x) => x.id === active.group)?.label} onClose={() => setOpenId(null)}>
          <DrawerField label="Expense name">
            <input value={active.expense} onChange={(e) => update(active.id, { expense: e.target.value })} style={drawerInput} disabled={active.standard} />
          </DrawerField>
          <DrawerField label="Group">
            <select value={active.group} onChange={(e) => update(active.id, { group: e.target.value as ExpenseGroupId })} style={drawerInput}>
              {EXPENSE_GROUPS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </DrawerField>
          <DrawerField label="Notes">
            <textarea
              value={active.notes ?? ''}
              onChange={(e) => update(active.id, { notes: e.target.value })}
              rows={3}
              style={{ ...drawerInput, height: 'auto', padding: 10, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </DrawerField>
          <DrawerReadout rows={[
            { label: 'Unit cost', value: money(active.unitCost) },
            { label: `Quantity × ${active.quantity}`, value: money(totalOf(active)) },
            { label: `Tax ${active.taxable ? `${taxRate}%` : '—'}`, value: money(rowTax(totalOf(active), active.taxable, taxRate)) },
            { label: 'Total cost', value: money(totalOf(active)), strong: true },
          ]} />
        </DetailDrawer>
      )}
    </TabShell>
  );
}

// ─── Equipment rental ─────────────────────────────────────────────────────────

const R_GRID = '34px 168px 138px 146px 34px 86px 76px 58px 72px 98px 104px 96px 52px';
const R_COLS: ColumnDef[] = [
  C('Incl'), L('Equipment'), L('Supplier'), L('Cost code'), C('Tax'),
  R('Rate'), L('Period'), R('Qty'), R('Duration'), R('Delivery'),
  R('Cost amount'), R('Remaining'), R(''),
];

export function EquipmentTab({ rows, onChange, taxRate }: {
  rows: EquipmentRow[]; onChange: (r: EquipmentRow[]) => void; taxRate: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const suppliers = useMemo(() => Array.from(new Set(rows.map((r) => r.supplier).filter(Boolean))), [rows]);
  const g = useGroups(suppliers);

  function update(id: string, patch: Partial<EquipmentRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const groups: TableGroup<EquipmentRow>[] = suppliers.map((sup) => {
    const list = rows.filter((r) => r.supplier === sup);
    return {
      id: sup,
      label: sup,
      rows: list,
      subtotal: list.filter((r) => r.included).reduce((s, r) => s + equipmentAmount(r), 0),
    };
  });

  const includedTotal = rows.filter((r) => r.included).reduce((s, r) => s + equipmentAmount(r), 0);
  const remainingTotal = rows.reduce((s, r) => s + remaining(equipmentAmount(r), r.included), 0);
  const active = rows.find((r) => r.id === openId) ?? null;

  function addRental() {
    const id = `eq-${rows.length + 1}-${Math.round(includedTotal)}`;
    const supplier = suppliers[0] ?? 'New supplier';
    onChange([...rows, {
      id, included: false, equipment: 'New equipment', supplier, costCode: COST_CODES[12],
      labourHours: 0, taxable: true, rate: 0, period: 'Week', quantity: 1, duration: 1,
    }]);
    if (!g.open.has(supplier)) g.toggle(supplier);
    setOpenId(id);
  }

  return (
    <TabShell
      title="Equipment Rental"
      meta={`${rows.filter((r) => r.included).length} of ${rows.length} included · ${suppliers.length} suppliers`}
      total={includedTotal}
    >
      <TableToolbar onExpandAll={g.expandAll} onCollapseAll={g.collapseAll}>
        <button onClick={addRental} style={{ ...smallBtn, borderColor: '#93C5FD', color: '#1D4ED8', fontWeight: 600 }}>
          + Add Rental
        </button>
      </TableToolbar>

      <GroupedTable
        groups={groups}
        columns={R_COLS}
        gridTemplate={R_GRID}
        minWidth={1440}
        open={g.open}
        onToggle={g.toggle}
        renderRow={(row) => {
          const amt = equipmentAmount(row);
          return (
            <TableRow key={row.id} gridTemplate={R_GRID} muted={!row.included}>
              <IncludeCheck on={row.included} onChange={(v) => update(row.id, { included: v })} label={row.equipment} />
              <TextCell value={row.equipment} onChange={(v) => update(row.id, { equipment: v })} placeholder="Equipment" strong />
              <TextCell value={row.supplier} onChange={(v) => update(row.id, { supplier: v })} placeholder="Supplier" />
              <SelectCell value={row.costCode} onChange={(v) => update(row.id, { costCode: v })} options={COST_CODES} allowCustom />
              <TaxCheck on={row.taxable} onChange={(v) => update(row.id, { taxable: v })} label={row.equipment} />
              <NumCell value={row.rate} onChange={(v) => update(row.id, { rate: v })} prefix="$" step={0.01} />
              <SelectCell value={row.period} onChange={(v) => update(row.id, { period: v })} options={RENTAL_PERIODS} />
              <NumCell value={row.quantity} onChange={(v) => update(row.id, { quantity: v })} step={1} />
              <NumCell value={row.duration} onChange={(v) => update(row.id, { duration: v })} step={0.5} />
              <NumCell value={row.deliveryPickup ?? 0} onChange={(v) => update(row.id, { deliveryPickup: v })} prefix="$" step={0.01} />
              <AmountCell value={amt} strong muted={!row.included} />
              <AmountCell value={remaining(amt, row.included)} muted />
              <RowActions
                onOpen={() => setOpenId(row.id)}
                onDelete={() => onChange(rows.filter((r) => r.id !== row.id))}
                deleteLabel={row.equipment}
              />
            </TableRow>
          );
        }}
      />

      <TotalsRow
        gridTemplate={R_GRID}
        cells={[
          <span key="l" style={{ ...headStyle('left'), color: '#374151' }}>Total</span>,
          <span key="1" />, <span key="2" />, <span key="3" />,
          <StaticCell key="tax" align="right">{money(rows.filter((r) => r.included).reduce((s, r) => s + rowTax(equipmentAmount(r), r.taxable, taxRate), 0))}</StaticCell>,
          <span key="5" />, <span key="6" />, <span key="7" />, <span key="8" />, <span key="9" />,
          <AmountCell key="amt" value={includedTotal} strong />,
          <AmountCell key="rem" value={remainingTotal} muted />,
          <span key="12" />,
        ]}
      />

      <AddRowButton onClick={addRental} label="Add Rental" />

      {active && (
        <DetailDrawer title={active.equipment} subtitle={active.supplier} onClose={() => setOpenId(null)}>
          <DrawerField label="Rate card / agreement">
            <AttachCell
              name={active.attachment}
              onToggle={() => {
                update(active.id, { attachment: active.attachment ? undefined : `${active.supplier.split(' ')[0].toLowerCase()}-rate-card.pdf` });
                toast.info(active.attachment ? 'Attachment removed' : 'Attachment linked');
              }}
            />
          </DrawerField>
          <DrawerField label="Labor hours" hint="Optional — operator time, if it is yours rather than the hire company's.">
            <input type="number" step="0.25" value={active.labourHours} onChange={(e) => update(active.id, { labourHours: parseFloat(e.target.value) || 0 })} style={drawerInput} />
          </DrawerField>
          <DrawerField label="Notes">
            <textarea
              value={active.notes ?? ''}
              onChange={(e) => update(active.id, { notes: e.target.value })}
              rows={3}
              style={{ ...drawerInput, height: 'auto', padding: 10, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </DrawerField>
          <DrawerReadout rows={[
            { label: `Rate per ${active.period.toLowerCase()}`, value: money(active.rate) },
            { label: `${active.quantity} × ${active.duration} ${active.period.toLowerCase()}${active.duration === 1 ? '' : 's'}`, value: money(active.rate * active.quantity * active.duration) },
            { label: 'Delivery / pickup', value: money(active.deliveryPickup ?? 0) },
            { label: `Tax ${active.taxable ? `${taxRate}%` : '—'}`, value: money(rowTax(equipmentAmount(active), active.taxable, taxRate)) },
            { label: 'Cost amount', value: money(equipmentAmount(active)), strong: true },
          ]} />
        </DetailDrawer>
      )}
    </TabShell>
  );
}

// ─── Bond ─────────────────────────────────────────────────────────────────────

const B_GRID = '34px 168px 168px 156px 74px 120px 110px 114px 52px';
const B_COLS: ColumnDef[] = [
  C('Incl'), L('Bond type'), L('Surety'), L('Cost code'),
  R('Rate'), R('Bonded amount'), R('Min premium'), R('Premium'), R(''),
];

export function BondTab({ rows, onChange, sellPrice }: {
  rows: BondRow[]; onChange: (r: BondRow[]) => void; sellPrice: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const g = useGroups(['bonds']);

  function update(id: string, patch: Partial<BondRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const includedTotal = rows.filter((r) => r.included).reduce((s, r) => s + bondPremium(r, sellPrice), 0);
  const groups: TableGroup<BondRow>[] = [{
    id: 'bonds', label: 'Bonds', rows, subtotal: includedTotal,
  }];
  const active = rows.find((r) => r.id === openId) ?? null;

  function addBond() {
    const id = `bond-${rows.length + 1}`;
    onChange([...rows, {
      id, included: false, kind: 'Performance Bond', surety: '', costCode: COST_CODES[12],
      rate: 1.0, bondedAmount: 0, minimumPremium: 0, taxable: false,
    }]);
    if (!g.open.has('bonds')) g.toggle('bonds');
    setOpenId(id);
  }

  return (
    <TabShell title="Bond" meta={`${rows.filter((r) => r.included).length} of ${rows.length} included`} total={includedTotal}>
      <NoteBanner text={`A bonded amount of 0 follows the live sell price — currently ${money(sellPrice)}.`} />

      <TableToolbar onExpandAll={g.expandAll} onCollapseAll={g.collapseAll}>
        <button onClick={addBond} style={{ ...smallBtn, borderColor: '#93C5FD', color: '#1D4ED8', fontWeight: 600 }}>
          + Add Bond
        </button>
      </TableToolbar>

      <GroupedTable
        groups={groups}
        columns={B_COLS}
        gridTemplate={B_GRID}
        minWidth={1140}
        open={g.open}
        onToggle={g.toggle}
        renderRow={(row) => {
          const premium = bondPremium(row, sellPrice);
          const atMinimum = row.minimumPremium > 0
            && (row.bondedAmount > 0 ? row.bondedAmount : sellPrice) * (row.rate / 100) < row.minimumPremium;
          return (
            <TableRow key={row.id} gridTemplate={B_GRID} muted={!row.included}>
              <IncludeCheck on={row.included} onChange={(v) => update(row.id, { included: v })} label={row.kind} />
              <SelectCell
                value={row.kind}
                onChange={(v) => update(row.id, { kind: v as BondKind })}
                options={['Bid Bond', 'Performance Bond', 'Payment Bond', 'Maintenance Bond']}
              />
              <TextCell value={row.surety} onChange={(v) => update(row.id, { surety: v })} placeholder="Surety" strong />
              <SelectCell value={row.costCode} onChange={(v) => update(row.id, { costCode: v })} options={COST_CODES} allowCustom />
              <NumCell value={row.rate} onChange={(v) => update(row.id, { rate: v })} step={0.05} suffix="%" />
              <NumCell value={row.bondedAmount} onChange={(v) => update(row.id, { bondedAmount: v })} prefix="$" step={100} />
              <NumCell value={row.minimumPremium} onChange={(v) => update(row.id, { minimumPremium: v })} prefix="$" step={10} />
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                {atMinimum && <span title="Minimum premium applies" style={{ fontSize: 8, fontWeight: 700, color: '#B45309', background: '#FFFBEB', padding: '1px 4px', borderRadius: 3 }}>MIN</span>}
                <AmountCell value={premium} strong muted={!row.included} />
              </span>
              <RowActions
                onOpen={() => setOpenId(row.id)}
                onDelete={() => onChange(rows.filter((r) => r.id !== row.id))}
                deleteLabel={row.kind}
              />
            </TableRow>
          );
        }}
      />

      <TotalsRow
        gridTemplate={B_GRID}
        cells={[
          <span key="l" style={{ ...headStyle('left'), color: '#374151' }}>Total</span>,
          <span key="1" />, <span key="2" />, <span key="3" />, <span key="4" />, <span key="5" />, <span key="6" />,
          <AmountCell key="amt" value={includedTotal} strong />,
          <span key="8" />,
        ]}
      />

      <AddRowButton onClick={addBond} label="Add Bond" />

      {active && (
        <DetailDrawer title={active.kind} subtitle={active.surety || 'No surety set'} onClose={() => setOpenId(null)}>
          <DrawerField label="Surety agreement">
            <AttachCell
              name={active.attachment}
              onToggle={() => {
                update(active.id, { attachment: active.attachment ? undefined : `${active.kind.toLowerCase().replace(/\s+/g, '-')}.pdf` });
                toast.info(active.attachment ? 'Attachment removed' : 'Attachment linked');
              }}
            />
          </DrawerField>
          <DrawerField label="Notes">
            <textarea
              value={active.notes ?? ''}
              onChange={(e) => update(active.id, { notes: e.target.value })}
              rows={3}
              style={{ ...drawerInput, height: 'auto', padding: 10, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </DrawerField>
          <DrawerReadout rows={[
            { label: 'Bonded amount', value: active.bondedAmount > 0 ? money(active.bondedAmount) : `${money(sellPrice)} (sell price)` },
            { label: `Rate ${active.rate}%`, value: money((active.bondedAmount > 0 ? active.bondedAmount : sellPrice) * (active.rate / 100)) },
            { label: 'Minimum premium', value: money(active.minimumPremium) },
            { label: 'Premium', value: money(bondPremium(active, sellPrice)), strong: true },
          ]} />
        </DetailDrawer>
      )}
    </TabShell>
  );
}

// ─── Tax ──────────────────────────────────────────────────────────────────────

export function TaxTab({ markup, overrides, onMarkupChange, onResetKey, totals, taxRegion, onTaxRegionChange }: {
  markup: Record<MarkupKey, number>;
  overrides: MarkupOverrides;
  onMarkupChange: (key: MarkupKey, value: number) => void;
  onResetKey: (key: MarkupKey) => void;
  totals: { materialSell: number; quotesCost: number; taxableBase: number; tax: number };
  taxRegion: string;
  onTaxRegionChange: (v: string) => void;
}) {
  const inherited = isInherited(overrides, 'taxRate');
  const REGIONS = ['QC — GST 5% + QST 9.975%', 'ON — HST 13%', 'NSW — GST 10%', 'No tax'];

  return (
    <TabShell title="Tax" meta={`${markup.taxRate}% on taxable goods`} total={totals.tax}>
      <div style={{ padding: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ ...HEAD_CELL, marginBottom: 8 }}>Tax basis</div>
          <DrawerReadout rows={[
            { label: 'Material (with markup)', value: money(totals.materialSell) },
            { label: 'Supplier quotes', value: money(totals.quotesCost) },
            { label: 'Taxable base', value: money(totals.taxableBase), strong: true },
            { label: `Sales tax @ ${markup.taxRate}%`, value: money(totals.tax), strong: true },
          ]} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10, fontSize: 11, color: '#6B7280', lineHeight: '16px' }}>
            <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            Tax applies to goods only. Labor, subcontracted scope and bond premiums are excluded from the base — flip a row&apos;s Tax checkbox on its own tab to change that.
          </div>
        </div>

        <div style={{ width: 320, minWidth: 280 }}>
          <div style={{ ...HEAD_CELL, marginBottom: 8 }}>Rate</div>
          <DrawerField label="Tax region">
            <select value={taxRegion} onChange={(e) => onTaxRegionChange(e.target.value)} style={drawerInput}>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </DrawerField>
          <DrawerField
            label="Sales tax rate"
            hint={inherited ? `Inherited from Company Settings (${COMPANY_DEFAULTS.taxRate}%).` : 'Overridden for this project.'}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  step="0.001"
                  value={markup.taxRate}
                  onChange={(e) => onMarkupChange('taxRate', parseFloat(e.target.value) || 0)}
                  style={{ ...drawerInput, ...MONO, paddingRight: 24, textAlign: 'right', borderColor: inherited ? '#E5E7EB' : '#D97706' }}
                />
                <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF' }}>%</span>
              </div>
              {inherited
                ? <span style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '3px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>COMPANY</span>
                : <button onClick={() => onResetKey('taxRate')} style={smallBtn}>Reset</button>}
            </div>
          </DrawerField>
        </div>
      </div>
    </TabShell>
  );
}

// ─── Adjustments (formerly Ext Adj) ───────────────────────────────────────────

/*
 * All tracks fixed. A 1fr Description column resolved 8px differently in the
 * header grid than in the row grids, which pushed every later column out of
 * line — fixed tracks resolve identically everywhere.
 */
const A_GRID = '34px 300px 96px 116px 116px 166px 52px';
const A_COLS: ColumnDef[] = [
  C('Incl'), L('Description'), L('Type'), R('Amount'), L('Status'), L('Cost code'), R(''),
];

export function AdjustmentsTab({ rows, onChange }: {
  rows: AdjustmentRow[]; onChange: (r: AdjustmentRow[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const g = useGroups(['accepted', 'pending', 'rejected']);

  function update(id: string, patch: Partial<AdjustmentRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const signed = (r: AdjustmentRow) => (r.kind === 'add' ? r.amount : -r.amount);
  const net = adjustmentNet(rows);

  /** Accepting an adjustment ticks it into the bid; rejecting takes it out. */
  function setStatus(id: string, status: AdjustmentStatus) {
    update(id, status === 'accepted' ? { status, included: true }
      : status === 'rejected' ? { status, included: false }
      : { status });
  }

  const groups: TableGroup<AdjustmentRow>[] = (['accepted', 'pending', 'rejected'] as AdjustmentStatus[]).map((st) => {
    const list = rows.filter((r) => r.status === st);
    return {
      id: st,
      label: ADJUSTMENT_STATUS_CFG[st].label,
      rows: list,
      meta: `${list.filter((r) => r.included).length} of ${list.length} in bid`,
      subtotal: list.filter((r) => r.included).reduce((s, r) => s + signed(r), 0),
    };
  }).filter((grp) => grp.rows.length > 0);

  const active = rows.find((r) => r.id === openId) ?? null;

  function addAdjustment() {
    const id = `adj-${rows.length + 1}`;
    onChange([...rows, { id, included: false, description: 'New adjustment', kind: 'add', amount: 0, status: 'pending', costCode: COST_CODES[0] }]);
    if (!g.open.has('pending')) g.toggle('pending');
    setOpenId(id);
  }

  return (
    <TabShell
      title="Adjustments"
      meta={`${rows.filter((r) => r.included).length} of ${rows.length} included in the bid`}
      total={net}
    >
      <TableToolbar onExpandAll={g.expandAll} onCollapseAll={g.collapseAll}>
        <button onClick={addAdjustment} style={{ ...smallBtn, borderColor: '#93C5FD', color: '#1D4ED8', fontWeight: 600 }}>
          + Add Adjustment
        </button>
      </TableToolbar>

      <GroupedTable
        groups={groups}
        columns={A_COLS}
        gridTemplate={A_GRID}
        minWidth={1000}
        open={g.open}
        onToggle={g.toggle}
        renderRow={(row) => {
          const cfg = ADJUSTMENT_STATUS_CFG[row.status];
          return (
            <TableRow key={row.id} gridTemplate={A_GRID} muted={!row.included}>
              <IncludeCheck on={row.included} onChange={(v) => update(row.id, { included: v })} label={row.description} />
              <TextCell value={row.description} onChange={(v) => update(row.id, { description: v })} placeholder="Description" strong />
              <SelectCell
                value={row.kind === 'add' ? 'Add' : 'Deduct'}
                onChange={(v) => update(row.id, { kind: v === 'Add' ? 'add' : 'deduct' })}
                options={['Add', 'Deduct']}
              />
              <NumCell value={row.amount} onChange={(v) => update(row.id, { amount: v })} prefix="$" step={0.01} />
              <select
                value={row.status}
                onChange={(e) => setStatus(row.id, e.target.value as AdjustmentStatus)}
                style={{ height: 26, width: '100%', minWidth: 0, padding: '0 5px', border: `1px solid ${cfg.bg}`, borderRadius: 5, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, outline: 'none', cursor: 'pointer' }}
              >
                {(Object.keys(ADJUSTMENT_STATUS_CFG) as AdjustmentStatus[]).map((s) => (
                  <option key={s} value={s}>{ADJUSTMENT_STATUS_CFG[s].label}</option>
                ))}
              </select>
              <SelectCell value={row.costCode} onChange={(v) => update(row.id, { costCode: v })} options={COST_CODES} allowCustom />
              <RowActions
                onOpen={() => setOpenId(row.id)}
                onDelete={() => onChange(rows.filter((r) => r.id !== row.id))}
                deleteLabel={row.description}
              />
            </TableRow>
          );
        }}
      />

      <TotalsRow
        gridTemplate={A_GRID}
        cells={[
          <span key="l" style={{ ...headStyle('center'), color: '#374151' }}>Net</span>,
          <span key="1" />, <span key="2" />,
          <span key="net" style={{ ...MONO, fontSize: 12, fontWeight: 700, textAlign: 'right', display: 'block', width: '100%', color: net >= 0 ? '#16A34A' : '#DC2626' }}>
            {net >= 0 ? '+' : '−'}{money(Math.abs(net))}
          </span>,
          <span key="4" />, <span key="5" />, <span key="6" />,
        ]}
      />

      <AddRowButton onClick={addAdjustment} label="Add Adjustment" />

      {active && (
        <DetailDrawer title={active.description} subtitle={ADJUSTMENT_STATUS_CFG[active.status].label} onClose={() => setOpenId(null)}>
          <DrawerField label="Notes">
            <textarea
              value={active.notes ?? ''}
              onChange={(e) => update(active.id, { notes: e.target.value })}
              rows={4}
              style={{ ...drawerInput, height: 'auto', padding: 10, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </DrawerField>
          <DrawerReadout rows={[
            { label: 'Type', value: active.kind === 'add' ? 'Add' : 'Deduct' },
            { label: 'Amount', value: money(active.amount) },
            { label: 'Effect on bid', value: active.included ? `${signed(active) >= 0 ? '+' : '−'}${money(Math.abs(signed(active)))}` : 'excluded', strong: true },
          ]} />
        </DetailDrawer>
      )}
    </TabShell>
  );
}
