import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Paperclip, Plus, Trash2, X, PanelRight, AlertTriangle } from 'lucide-react';
import { money } from '../../lib/costing';

/**
 * Table primitives shared by every Bid Builder cost-category tab.
 *
 * The rules they encode, once, so no tab reinvents them:
 *  - groups open by default and carry their subtotal in the header, so the tab
 *    reads top to bottom without a click and the totals stay visible when the
 *    estimator collapses one;
 *  - advanced fields go in a right drawer, never a wider table;
 *  - row actions stay compact — an expand chevron and a delete, nothing else.
 */

// ─── Tokens ───────────────────────────────────────────────────────────────────

export const HEAD_CELL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
};

export type ColAlign = 'left' | 'right' | 'center';

/**
 * A column's label and how its contents sit. Headers used to be left-aligned
 * over right-aligned numbers, which left every money column reading as two
 * unrelated stacks. The alignment is declared once here and applied to both.
 */
export interface ColumnDef {
  label: string;
  align?: ColAlign;
}

/** Gap between columns. One value so every tab's grid and header agree. */
export const COL_GAP = 14;

export function headStyle(align: ColAlign = 'left'): React.CSSProperties {
  return { ...HEAD_CELL, textAlign: align };
}

/** Wraps a grid cell so its contents honour the column's alignment. */
export function Cell({ align = 'left', children }: { align?: ColAlign; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', minWidth: 0,
      justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
    }}>
      {children}
    </div>
  );
}

export const MONO: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace' };

const inputBase: React.CSSProperties = {
  height: 26, border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11,
  outline: 'none', boxSizing: 'border-box', background: 'white', color: '#374151',
};

// ─── Cells ────────────────────────────────────────────────────────────────────

export function TextCell({ value, onChange, placeholder, strong }: {
  value: string; onChange: (v: string) => void; placeholder?: string; strong?: boolean;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...inputBase, width: '100%', padding: '0 6px', border: '1px solid transparent',
        background: 'transparent', fontSize: strong ? 12 : 11,
        fontWeight: strong ? 500 : 400, color: strong ? '#374151' : '#6B7280', minWidth: 0,
      }}
      onFocus={(e) => { e.currentTarget.style.border = '1px solid #BFDBFE'; e.currentTarget.style.background = 'white'; }}
      onBlur={(e) => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; }}
    />
  );
}

export function SelectCell({ value, onChange, options, allowCustom, customLabel = '+ Custom…' }: {
  value: string; onChange: (v: string) => void; options: string[];
  allowCustom?: boolean; customLabel?: string;
}) {
  const [custom, setCustom] = useState(false);
  const known = options.includes(value);

  if (custom || (allowCustom && !known && value)) {
    return (
      <input
        autoFocus={custom}
        value={value}
        placeholder="Category name"
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setCustom(false)}
        style={{ ...inputBase, width: '100%', minWidth: 0, padding: '0 6px', borderColor: '#BFDBFE' }}
      />
    );
  }
  return (
    <select
      value={known ? value : ''}
      onChange={(e) => {
        if (e.target.value === '__custom__') { setCustom(true); onChange(''); return; }
        onChange(e.target.value);
      }}
      style={{ ...inputBase, width: '100%', minWidth: 0, padding: '0 4px', cursor: 'pointer' }}
    >
      {!known && <option value="">Select…</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      {allowCustom && <option value="__custom__">{customLabel}</option>}
    </select>
  );
}

export function NumCell({ value, onChange, prefix, suffix, step = 1, min, align = 'right', width }: {
  value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number; min?: number;
  align?: 'left' | 'right'; width?: number | string;
}) {
  return (
    <div style={{ position: 'relative', width: width ?? '100%' }}>
      {prefix && <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9CA3AF', pointerEvents: 'none' }}>{prefix}</span>}
      <input
        type="number"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          ...inputBase, ...MONO, width: '100%', textAlign: align,
          padding: `0 ${suffix ? 20 : 6}px 0 ${prefix ? 15 : 6}px`,
        }}
      />
      {suffix && <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#9CA3AF', pointerEvents: 'none' }}>{suffix}</span>}
    </div>
  );
}

/** Read-only computed money cell. */
export function AmountCell({ value, strong, muted, warn }: {
  value: number; strong?: boolean; muted?: boolean; warn?: boolean;
}) {
  return (
    <span style={{
      ...MONO, fontSize: 12, textAlign: 'right', display: 'block', width: '100%',
      fontWeight: strong ? 700 : 500,
      color: warn ? '#DC2626' : muted ? '#9CA3AF' : '#111827',
    }}>
      {money(value)}
    </span>
  );
}

/** Read-only text or figure in a column with a declared alignment. */
export function StaticCell({ children, align = 'right', mono = true, muted, strong, title }: {
  children: React.ReactNode; align?: ColAlign; mono?: boolean;
  muted?: boolean; strong?: boolean; title?: string;
}) {
  return (
    <span
      title={title}
      style={{
        ...(mono ? MONO : {}), fontSize: mono ? 11 : 12, display: 'block', width: '100%',
        textAlign: align, fontWeight: strong ? 700 : 400,
        color: muted ? '#9CA3AF' : '#374151', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {children}
    </span>
  );
}

export function IncludeCheck({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <input
        type="checkbox"
        checked={on}
        aria-label={`Include ${label}`}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#2563EB', width: 14, height: 14, cursor: 'pointer' }}
      />
    </span>
  );
}

export function TaxCheck({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <input
        type="checkbox"
        checked={on}
        aria-label={`Tax ${label}`}
        title={on ? 'Taxable' : 'Not taxable'}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#0891B2', width: 13, height: 13, cursor: 'pointer' }}
      />
    </span>
  );
}

export function AttachCell({ name, onToggle }: { name?: string; onToggle: () => void }) {
  return name ? (
    <button onClick={onToggle} title={name} style={{ display: 'flex', alignItems: 'center', gap: 3, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, color: '#1D4ED8', padding: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <Paperclip size={10} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    </button>
  ) : (
    <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 3, border: '1px dashed #D1D5DB', borderRadius: 5, background: 'transparent', cursor: 'pointer', fontSize: 10, color: '#9CA3AF', padding: '2px 6px' }}>
      <Paperclip size={9} /> Attach
    </button>
  );
}

/** Expand-to-drawer + delete. Nothing else earns a slot in the row. */
export function RowActions({ onOpen, onDelete, deleteLabel, locked }: {
  onOpen: () => void; onDelete?: () => void; deleteLabel: string; locked?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, width: '100%' }}>
      <button
        onClick={onOpen}
        title="Open details"
        aria-label={`Open details for ${deleteLabel}`}
        style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
      >
        <PanelRight size={12} color="#2563EB" />
      </button>
      {onDelete && !locked && (
        <button
          onClick={onDelete}
          aria-label={`Remove ${deleteLabel}`}
          style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
        >
          <Trash2 size={11} color="#DC2626" />
        </button>
      )}
    </div>
  );
}

// ─── Group table ──────────────────────────────────────────────────────────────

export interface TableGroup<T> {
  id: string;
  label: string;
  rows: T[];
  /** Shown on the right of the collapsed header. */
  subtotal: number;
  /** Optional second figure, e.g. included-of-total. */
  meta?: string;
  /** Renders a warning pip on the header. */
  warning?: string;
}

/**
 * Collapsible group list. Groups are open on load and show their subtotal in
 * the header, so collapsing one never hides what it contributes.
 */
export function GroupedTable<T extends { id: string }>({
  groups, columns, gridTemplate, minWidth, renderRow, open, onToggle,
}: {
  groups: TableGroup<T>[];
  columns: ColumnDef[];
  gridTemplate: string;
  minWidth: number;
  renderRow: (row: T, group: TableGroup<T>) => React.ReactNode;
  open: Pick<Set<string>, 'has'>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="bp-table-scroll" style={{ overflowX: 'auto' }}>
      <div style={{ minWidth }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, padding: '7px 14px', gap: COL_GAP, borderBottom: '2px solid #F3F4F6', background: '#FAFAFA', position: 'sticky', top: 0, zIndex: 2 }}>
          {columns.map((c, i) => (
            <div key={`${c.label}-${i}`} style={headStyle(c.align)}>{c.label}</div>
          ))}
        </div>

        {groups.map((g) => {
          const isOpen = open.has(g.id);
          const includedCount = (g.rows as unknown as { included?: boolean }[]).filter((r) => r.included !== false).length;
          return (
            <div key={g.id}>
              {/*
                The header content is pinned to the left edge of the scroller.
                A subtotal parked at the far right disappears the moment the
                table scrolls, and a total you cannot see is not a total.
              */}
              <button
                onClick={() => onToggle(g.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', minHeight: 34,
                  padding: 0, border: 'none', borderBottom: '1px solid #E5E7EB',
                  borderTop: '1px solid #E5E7EB', background: '#F3F4F6', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ position: 'sticky', left: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', whiteSpace: 'nowrap' }}>
                  {isOpen ? <ChevronDown size={12} color="#6B7280" /> : <ChevronRight size={12} color="#6B7280" />}
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{g.label}</span>
                  <span style={{ ...MONO, fontSize: 12, fontWeight: 700, color: '#111827' }}>{money(g.subtotal)}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                    {g.meta ?? `${includedCount} of ${g.rows.length} included`}
                  </span>
                  {g.warning && (
                    <span title={g.warning} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: 9999 }}>
                      <AlertTriangle size={9} /> {g.warning}
                    </span>
                  )}
                </span>
              </button>
              {isOpen && g.rows.map((row) => renderRow(row, g))}
              {isOpen && g.rows.length === 0 && (
                <div style={{ padding: '14px', fontSize: 11, color: '#9CA3AF' }}>Nothing in this group yet.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Expand all / Collapse all pair, plus whatever the tab adds beside them. */
export function TableToolbar({ onExpandAll, onCollapseAll, children }: {
  onExpandAll: () => void; onCollapseAll: () => void; children?: React.ReactNode;
}) {
  const btn: React.CSSProperties = {
    height: 26, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 6,
    background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
  };
  return (
    <div className="bp-toolbar" style={{ padding: '8px 14px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
      <button onClick={onExpandAll} style={btn}><ChevronDown size={11} /> Expand all</button>
      <button onClick={onCollapseAll} style={btn}><ChevronRight size={11} /> Collapse all</button>
      <div style={{ flex: 1 }} />
      {children}
    </div>
  );
}

export function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div style={{ padding: '8px 14px', borderTop: '1px dashed #E5E7EB' }}>
      <button
        onClick={onClick}
        style={{ height: 28, padding: '0 11px', border: '1px dashed #93C5FD', borderRadius: 6, background: '#F8FBFF', fontSize: 11, fontWeight: 600, color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Plus size={11} /> {label}
      </button>
    </div>
  );
}

/** Footer totals strip, matching the header grid so the columns line up. */
export function TotalsRow({ gridTemplate, cells }: { gridTemplate: string; cells: React.ReactNode[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center', minHeight: 36, padding: '0 14px', gap: COL_GAP, background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
      {cells.map((c, i) => <React.Fragment key={i}>{c}</React.Fragment>)}
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

/**
 * Right-hand drawer for the fields that would otherwise widen the table —
 * expiry dates, statuses, markup, contacts, notes.
 */
export function DetailDrawer({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(17,24,39,0.4)' }} />
      <div style={{ width: 420, maxWidth: '100%', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 32px rgba(0,0,0,0.16)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close details" style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>{children}</div>
        {footer && <div style={{ padding: '12px 18px', borderTop: '1px solid #E5E7EB', background: '#FAFAFA' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function DrawerField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

export const drawerInput: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB',
  borderRadius: 7, fontSize: 13, background: 'white', outline: 'none', boxSizing: 'border-box',
};

/** Two-column read-only readout used at the foot of a drawer. */
export function DrawerReadout({ rows }: { rows: { label: string; value: string; strong?: boolean }[] }) {
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 11px', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6', background: r.strong ? '#F9FAFB' : 'white' }}>
          <span style={{ fontSize: 12, color: '#6B7280', flex: 1 }}>{r.label}</span>
          <span style={{ ...MONO, fontSize: 12, fontWeight: r.strong ? 700 : 500, color: '#111827' }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Row shell so every tab's rows share padding, height and hover treatment. */
export function TableRow({ gridTemplate, muted, warn, children }: {
  gridTemplate: string; muted?: boolean; warn?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center',
      minHeight: 38, padding: '5px 14px', gap: COL_GAP, borderBottom: '1px solid #F3F4F6',
      background: warn ? '#FFFBEB' : muted ? '#FCFCFD' : 'white',
    }}>
      {children}
    </div>
  );
}
