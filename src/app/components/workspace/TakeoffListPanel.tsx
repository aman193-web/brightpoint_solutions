import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, X, ChevronDown, ChevronUp, ChevronRight, Columns3, Filter, ArrowUpDown,
  Trash2, StickyNote, Maximize2, Minimize2, PanelBottom, Move, RotateCcw,
} from 'lucide-react';
import {
  TakeoffRecord, MeasurementType, effectiveQuantity, effectiveLength, totalsFor,
} from '../../lib/takeoffRecords';
import { CategoryGroup, sortedGroups, selectableValues } from '../../lib/projectBreakdown';

/**
 * The Takeoff List — the project's audit trail.
 *
 * Every record the job holds, however it was created: an assembly counted on a
 * drawing and a panelboard typed in by hand are the same kind of row here, which
 * is the point. It is the central component of the workspace rather than a tab in
 * a sidebar, because it is what an estimator checks their work against.
 *
 * Docked along the bottom by default. Floating is a power-user affordance, not the
 * normal state, and closing a float returns the panel to its dock rather than
 * removing it — a project's record list is not something to be able to lose.
 */

export type DockMode = 'docked' | 'floating';

const MONO = 'IBM Plex Mono, monospace';

const HEAD: React.CSSProperties = {
  fontSize: 9.5, fontWeight: 700, color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
};

/**
 * A column, and how wide it is.
 *
 * Fixed widths for the same reason the bid tables use them: the header and the
 * rows are separate grid containers, and a flexible track resolves differently
 * between them, which walks every later column out of alignment.
 */
interface ColumnDef {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'right';
  /** Off by default — available through Columns rather than crowding the table. */
  optional?: boolean;
  /** Only meaningful on a linear record. */
  linearOnly?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'item',      label: 'Item / Assembly', width: 210 },
  { key: 'source',    label: 'Source',          width: 74 },
  { key: 'type',      label: 'Type',            width: 82 },
  { key: 'pkg',       label: 'Bid Package',     width: 108 },
  { key: 'area',      label: 'Area',            width: 96 },
  { key: 'system',    label: 'System / Scope',  width: 116 },
  { key: 'qty',       label: 'Qty',             width: 62, align: 'right' },
  { key: 'adjQty',    label: 'Adj. Qty',        width: 70, align: 'right' },
  { key: 'length',    label: 'LF',              width: 62, align: 'right', linearOnly: true },
  { key: 'adjLength', label: 'Adj. LF',         width: 70, align: 'right', linearOnly: true },
  { key: 'unit',      label: 'Unit',            width: 52 },
  { key: 'sheet',     label: 'Sheet',           width: 74 },
  { key: 'user',      label: 'User',            width: 96, optional: true },
  { key: 'created',   label: 'Date / Time',     width: 116, optional: true },
  { key: 'notes',     label: 'Notes',           width: 180, optional: true },
];

const DEFAULT_VISIBLE = COLUMNS.filter((c) => !c.optional).map((c) => c.key);

const ALL = '__all__';

/** Sort presets, in the words an estimator would use. */
const SORTS: { id: string; label: string }[] = [
  { id: 'recent',   label: 'Most recent first' },
  { id: 'oldest',   label: 'Oldest first' },
  { id: 'item-az',  label: 'Item A–Z' },
  { id: 'item-za',  label: 'Item Z–A' },
  { id: 'qty-desc', label: 'Quantity high–low' },
  { id: 'sheet',    label: 'Sheet' },
];

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
};

/** A borderless in-table editor. Thirteen boxed inputs read as a form, not a table. */
const cellInput: React.CSSProperties = {
  width: '100%', height: 20, padding: '0 3px', border: '1px solid transparent',
  borderRadius: 4, background: 'transparent', outline: 'none', boxSizing: 'border-box',
  fontSize: 11, color: '#374151',
};

const cellSelect: React.CSSProperties = {
  width: '100%', height: 22, padding: '0 2px', border: '1px solid transparent',
  borderRadius: 4, background: 'transparent', outline: 'none', boxSizing: 'border-box',
  fontSize: 10.5, color: '#374151', cursor: 'pointer', appearance: 'none',
};

function SourceChip({ source }: { source: TakeoffRecord['sourceType'] }) {
  const digital = source === 'digital';
  return (
    <span
      title={digital ? 'Placed on a drawing' : 'Entered by hand — no drawing placement'}
      style={{
        fontSize: 9.5, fontWeight: 600, padding: '1px 6px', borderRadius: 999, whiteSpace: 'nowrap',
        color: digital ? '#1D4ED8' : '#B45309',
        background: digital ? '#EFF6FF' : '#FFFBEB',
        border: `1px solid ${digital ? '#BFDBFE' : '#FDE68A'}`,
      }}
    >
      {digital ? 'Digital' : 'Manual'}
    </span>
  );
}

export interface TakeoffListPanelProps {
  records: TakeoffRecord[];
  groups: CategoryGroup[];
  /** Sheets, for the Sheet column and its filter. */
  pages: { id: string; num: string; title: string }[];
  /** Shared with the drawing so a marker and its row light up together. */
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onUpdate: (id: string, patch: Partial<TakeoffRecord>) => void;
  onReclassify: (ids: string[], groupId: string, valueId: string) => void;
  onRemove: (ids: string[]) => void;
  /** Dock state is the workspace's — the canvas has to know how much height it lost. */
  dock: DockMode;
  onDockChange: (d: DockMode) => void;
  collapsed: boolean;
  onCollapsedChange: (c: boolean) => void;
  height: number;
  onHeightChange: (h: number) => void;
  /** A record was dropped in from the assemblies or parts list. */
  onDropItem?: (payload: { kind: 'assembly' | 'part'; id: string }) => void;
}

export function TakeoffListPanel({
  records, groups, pages, selectedIds, onSelectionChange,
  onUpdate, onReclassify, onRemove,
  dock, onDockChange, collapsed, onCollapsedChange, height, onHeightChange,
  onDropItem,
}: TakeoffListPanelProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [groupByDim, setGroupByDim] = useState<string>('none');
  const [visible, setVisible] = useState<string[]>(DEFAULT_VISIBLE);
  const [showColumns, setShowColumns] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  /** Filters. `ALL` is "no opinion", never "none". */
  const [fSource, setFSource] = useState(ALL);
  const [fMeasure, setFMeasure] = useState(ALL);
  const [fSheet, setFSheet] = useState(ALL);
  const [fUser, setFUser] = useState(ALL);
  const [fCls, setFCls] = useState<Record<string, string>>({});

  /** Floating position, only used when undocked. */
  const [floatPos, setFloatPos] = useState({ x: 120, y: 120 });
  const [floatSize, setFloatSize] = useState({ w: 940, h: 420 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const dockResizeRef = useRef<{ y: number; h: number } | null>(null);

  const ordered = sortedGroups(groups);
  const cols = COLUMNS.filter((c) => visible.includes(c.key));
  const gridTemplate = `28px ${cols.map((c) => `${c.width}px`).join(' ')}`;
  const tableWidth = 28 + cols.reduce((s, c) => s + c.width, 0) + 24;

  const users = useMemo(
    () => [...new Set(records.map((r) => r.userId))].sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const filterCount = [fSource, fMeasure, fSheet, fUser].filter((v) => v !== ALL).length
    + Object.values(fCls).filter((v) => v && v !== ALL).length;

  function clearFilters() {
    setFSource(ALL); setFMeasure(ALL); setFSheet(ALL); setFUser(ALL); setFCls({});
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = records.filter((r) => {
      if (q && !(`${r.name} ${r.code} ${r.notes ?? ''}`.toLowerCase().includes(q))) return false;
      if (fSource !== ALL && r.sourceType !== fSource) return false;
      if (fMeasure !== ALL && r.measurementType !== fMeasure) return false;
      if (fSheet !== ALL && (r.sheetId ?? '__none__') !== fSheet) return false;
      if (fUser !== ALL && r.userId !== fUser) return false;
      for (const [gid, vid] of Object.entries(fCls)) {
        if (vid && vid !== ALL && r.classification[gid] !== vid) return false;
      }
      return true;
    });
    const by = (fn: (r: TakeoffRecord) => number | string, dir = 1) =>
      [...rows].sort((a, b) => {
        const av = fn(a); const bv = fn(b);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    switch (sort) {
      case 'oldest':   rows = by((r) => r.createdAt); break;
      case 'item-az':  rows = by((r) => r.name); break;
      case 'item-za':  rows = by((r) => r.name, -1); break;
      case 'qty-desc': rows = by((r) => effectiveQuantity(r), -1); break;
      case 'sheet':    rows = by((r) => r.sheetId ?? 'zzz'); break;
      default:         rows = by((r) => r.createdAt, -1); break;
    }
    return rows;
  }, [records, search, fSource, fMeasure, fSheet, fUser, fCls, sort]);

  /**
   * Grouped rows.
   *
   * Any breakdown dimension, plus Sheet, Assembly and Source. Custom Project
   * Breakdown groups appear here without a code change because the menu is built
   * from the store rather than a fixed list.
   */
  const grouped = useMemo(() => {
    if (groupByDim === 'none') return [{ key: 'all', label: '', rows: filtered }];
    const label = (r: TakeoffRecord): string => {
      if (groupByDim === 'sheet') {
        return pages.find((p) => p.id === r.sheetId)?.num ?? 'No sheet (manual)';
      }
      if (groupByDim === 'assembly') return r.name;
      if (groupByDim === 'source') return r.sourceType === 'digital' ? 'Digital' : 'Manual';
      const g = groups.find((x) => x.id === groupByDim);
      const v = g?.values.find((x) => x.id === r.classification[groupByDim]);
      return v?.name ?? `No ${g?.name ?? 'value'}`;
    };
    const map = new Map<string, TakeoffRecord[]>();
    for (const r of filtered) {
      const k = label(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, rows]) => ({ key, label: key, rows }));
  }, [filtered, groupByDim, groups, pages]);

  const totals = totalsFor(filtered);
  const pickedShown = filtered.filter((r) => selectedIds.includes(r.id));
  const allShownPicked = filtered.length > 0 && pickedShown.length === filtered.length;

  function togglePick(id: string, shift: boolean) {
    if (shift) {
      onSelectionChange(selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.includes(id) && selectedIds.length === 1 ? [] : [id]);
    }
  }

  // ── Float drag / resize ─────────────────────────────────────────────────────
  function startFloatDrag(e: React.MouseEvent) {
    dragRef.current = { x: e.clientX, y: e.clientY, px: floatPos.x, py: floatPos.y };
    const move = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setFloatPos({
        // Kept on screen: a panel dragged past the edge cannot be dragged back.
        x: Math.max(8, Math.min(window.innerWidth - 200, d.px + ev.clientX - d.x)),
        y: Math.max(8, Math.min(window.innerHeight - 80, d.py + ev.clientY - d.y)),
      });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function startFloatResize(e: React.MouseEvent) {
    e.stopPropagation();
    resizeRef.current = { x: e.clientX, y: e.clientY, w: floatSize.w, h: floatSize.h };
    const move = (ev: MouseEvent) => {
      const d = resizeRef.current;
      if (!d) return;
      setFloatSize({
        w: Math.max(420, d.w + ev.clientX - d.x),
        h: Math.max(200, d.h + ev.clientY - d.y),
      });
    };
    const up = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function startDockResize(e: React.MouseEvent) {
    e.preventDefault();
    dockResizeRef.current = { y: e.clientY, h: height };
    const move = (ev: MouseEvent) => {
      const d = dockResizeRef.current;
      if (!d) return;
      // Dragging up grows the panel, so the delta is inverted.
      onHeightChange(Math.max(120, Math.min(560, d.h - (ev.clientY - d.y))));
    };
    const up = () => {
      dockResizeRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  // ── Cell renderers ──────────────────────────────────────────────────────────
  function clsSelect(r: TakeoffRecord, g: CategoryGroup) {
    const current = r.classification[g.id] ?? '';
    return (
      <select
        value={current}
        onChange={(e) => onReclassify([r.id], g.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${g.name} for ${r.name}`}
        className="bp-cell-input"
        style={{ ...cellSelect, color: current ? '#374151' : '#D1D5DB' }}
      >
        <option value="">—</option>
        {selectableValues(g).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
    );
  }

  function numCell(r: TakeoffRecord, key: 'quantity' | 'adjustedQuantity' | 'measuredLength' | 'adjustedLength', label: string) {
    const raw = r[key];
    const adjusted = key === 'adjustedQuantity' || key === 'adjustedLength';

    /*
     * A digital row's measured figures come from the drawing.
     * ---------------------------------------------------
     * Qty *is* the number of markers and LF *is* the summed path length, both
     * recomputed from the canvas — so an edit here would be overwritten on the
     * next recompute, which is worse than not offering it. Shown read-only with
     * the reason, and the **adjusted** columns stay editable, which is where a
     * waste allowance or a site correction belongs anyway.
     */
    if (!adjusted && r.sourceType === 'digital') {
      return (
        <span
          title={`Counted from the drawing — ${r.measurementType === 'linear' ? 'measure or delete paths' : 'add or remove markers'} to change it. Use ${r.measurementType === 'linear' ? 'Adj. LF' : 'Adj. Qty'} to carry a different figure.`}
          style={{ fontSize: 11, fontFamily: MONO, color: '#6B7280', textAlign: 'right', display: 'block' }}
        >
          {raw ?? '—'}
        </span>
      );
    }

    return (
      <input
        type="number"
        min={0}
        step={key.includes('Length') ? 1 : 1}
        value={raw ?? ''}
        placeholder={adjusted ? '—' : '0'}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          // A cleared adjusted field means "no adjustment", which is a real state
          // and must not collapse to zero. A cleared base quantity holds instead.
          if (e.target.value === '') {
            onUpdate(r.id, { [key]: adjusted ? undefined : r[key] } as Partial<TakeoffRecord>);
            return;
          }
          if (Number.isFinite(n)) onUpdate(r.id, { [key]: n } as Partial<TakeoffRecord>);
        }}
        aria-label={`${label} for ${r.name}`}
        className="bp-cell-input"
        style={{
          ...cellInput, fontFamily: MONO, textAlign: 'right',
          color: adjusted && raw !== undefined ? '#B45309' : '#374151',
          fontWeight: adjusted && raw !== undefined ? 600 : 400,
        }}
      />
    );
  }

  function cell(r: TakeoffRecord, key: string): React.ReactNode {
    switch (key) {
      case 'item':
        return (
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </span>
            <span style={{ display: 'block', fontSize: 9.5, color: '#9CA3AF', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.code}{r.partId ? ' · part' : ''}
            </span>
          </span>
        );
      case 'source': return <SourceChip source={r.sourceType} />;
      case 'type':
        return (
          <select
            value={r.measurementType}
            onChange={(e) => onUpdate(r.id, { measurementType: e.target.value as MeasurementType })}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Measurement type for ${r.name}`}
            className="bp-cell-input"
            style={cellSelect}
          >
            <option value="count">Count</option>
            <option value="linear">Linear</option>
          </select>
        );
      case 'pkg':    { const g = ordered.find((x) => x.type === 'bid-package'); return g ? clsSelect(r, g) : null; }
      case 'area':   { const g = ordered.find((x) => x.type === 'area'); return g ? clsSelect(r, g) : null; }
      case 'system': { const g = ordered.find((x) => x.type === 'system'); return g ? clsSelect(r, g) : null; }
      case 'qty':    return numCell(r, 'quantity', 'Quantity');
      case 'adjQty': return numCell(r, 'adjustedQuantity', 'Adjusted quantity');
      case 'length': return r.measurementType === 'linear'
        ? numCell(r, 'measuredLength', 'Measured length')
        : <span style={{ fontSize: 11, color: '#E5E7EB', textAlign: 'right', display: 'block' }}>—</span>;
      case 'adjLength': return r.measurementType === 'linear'
        ? numCell(r, 'adjustedLength', 'Adjusted length')
        : <span style={{ fontSize: 11, color: '#E5E7EB', textAlign: 'right', display: 'block' }}>—</span>;
      case 'unit':
        return (
          <input
            value={r.unit}
            onChange={(e) => onUpdate(r.id, { unit: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Unit for ${r.name}`}
            className="bp-cell-input"
            style={{ ...cellInput, fontSize: 10.5, color: '#6B7280' }}
          />
        );
      case 'sheet':
        return (
          <select
            value={r.sheetId ?? ''}
            onChange={(e) => onUpdate(r.id, { sheetId: e.target.value || undefined })}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Sheet for ${r.name}`}
            className="bp-cell-input"
            style={{ ...cellSelect, fontFamily: MONO }}
          >
            <option value="">—</option>
            {pages.map((p) => <option key={p.id} value={p.id}>{p.num}</option>)}
          </select>
        );
      /*
       * User and Date / Time are the only read-only columns.
       *
       * They are the audit part of the audit trail: a record whose author and
       * timestamp can be typed over does not evidence anything. Everything the
       * estimator actually decides — quantity, adjustment, classification, sheet,
       * unit, type, notes — is editable in place.
       */
      case 'user':
        return <span title="Recorded by — not editable" style={{ fontSize: 10.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{r.userId}</span>;
      case 'created':
        return <span title={r.createdAt} style={{ fontSize: 10, color: '#9CA3AF', fontFamily: MONO, whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</span>;
      case 'notes':
        return (
          <input
            value={r.notes ?? ''}
            placeholder="Add a note…"
            onChange={(e) => onUpdate(r.id, { notes: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Notes for ${r.name}`}
            className="bp-cell-input"
            style={{ ...cellInput, fontSize: 10.5 }}
          />
        );
      default: return null;
    }
  }

  // ── Chrome ──────────────────────────────────────────────────────────────────
  const iconBtn = (title: string, on: boolean, onClick: () => void, icon: React.ReactNode, label?: string) => (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={on}
      style={{
        height: 26, padding: label ? '0 8px' : '0 6px', borderRadius: 6, cursor: 'pointer',
        border: `1px solid ${on ? '#BFDBFE' : '#E5E7EB'}`,
        background: on ? '#EFF6FF' : 'white',
        color: on ? '#1D4ED8' : '#6B7280',
        display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, flexShrink: 0,
      }}
    >
      {icon}{label}
    </button>
  );

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid #E5E7EB', background: '#FAFBFC', flexShrink: 0, flexWrap: 'wrap' }}>
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        title={collapsed ? 'Expand the Takeoff List' : 'Collapse to the title bar'}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0, flexShrink: 0 }}
      >
        {collapsed ? <ChevronUp size={13} color="#6B7280" /> : <ChevronDown size={13} color="#6B7280" />}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>Takeoff List</span>
      </button>
      <span style={{ fontSize: 10.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
        {totals.records} record{totals.records === 1 ? '' : 's'} · {totals.manual} manual · {totals.digital} digital
      </span>

      {!collapsed && (
        <>
          <div style={{ position: 'relative', width: 176, flexShrink: 0 }}>
            <Search size={11} color="#9CA3AF" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records…"
              style={{ width: '100%', height: 26, paddingLeft: 24, paddingRight: search ? 22 : 8, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, outline: 'none', boxSizing: 'border-box', background: 'white' }}
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}>
                <X size={10} color="#9CA3AF" />
              </button>
            )}
          </div>

          {iconBtn(`Filters${filterCount ? ` — ${filterCount} active` : ''}`, showFilters || filterCount > 0, () => setShowFilters((v) => !v), <Filter size={11} />, filterCount ? `Filters ${filterCount}` : 'Filters')}

          <label style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <ArrowUpDown size={11} color="#9CA3AF" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort records"
              style={{ height: 26, padding: '0 4px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, background: 'white', color: '#374151', outline: 'none', cursor: 'pointer' }}
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 10.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>Group</span>
            <select
              value={groupByDim}
              onChange={(e) => setGroupByDim(e.target.value)}
              aria-label="Group records by"
              style={{
                height: 26, padding: '0 4px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11,
                background: groupByDim === 'none' ? 'white' : '#EFF6FF',
                color: groupByDim === 'none' ? '#374151' : '#1D4ED8', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="none">No grouping</option>
              {/* Custom breakdown groups appear here automatically. */}
              {ordered.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              <option value="sheet">Sheet</option>
              <option value="assembly">Assembly</option>
              <option value="source">Manual / Digital</option>
            </select>
          </label>

          {iconBtn('Columns and view options', showColumns, () => setShowColumns((v) => !v), <Columns3 size={11} />, 'Columns')}
        </>
      )}

      <div style={{ flex: 1, minWidth: 4 }} />

      {/* Dock controls. Closing a float docks it — the list is never removed. */}
      {dock === 'docked'
        ? iconBtn('Float the Takeoff List', false, () => onDockChange('floating'), <Maximize2 size={11} />)
        : (
          <>
            {iconBtn('Dock to the bottom', false, () => onDockChange('docked'), <PanelBottom size={11} />, 'Dock')}
            {iconBtn('Reset position and size', false, () => { setFloatPos({ x: 120, y: 120 }); setFloatSize({ w: 940, h: 420 }); }, <RotateCcw size={11} />)}
          </>
        )}
    </div>
  );

  const filterBar = showFilters && !collapsed && (
    <div className="bp-scroll-x" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid #E5E7EB', background: '#FCFCFD', overflowX: 'auto', flexShrink: 0 }}>
      {ordered.map((g) => (
        <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{g.name}</span>
          <select
            value={fCls[g.id] ?? ALL}
            onChange={(e) => setFCls((prev) => ({ ...prev, [g.id]: e.target.value }))}
            aria-label={`Filter by ${g.name}`}
            style={{ height: 24, padding: '0 4px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 10.5, background: (fCls[g.id] ?? ALL) === ALL ? 'white' : '#EFF6FF', color: (fCls[g.id] ?? ALL) === ALL ? '#374151' : '#1D4ED8', outline: 'none', cursor: 'pointer' }}
          >
            <option value={ALL}>All</option>
            {selectableValues(g).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
      ))}

      {([
        ['Source', fSource, setFSource, [['manual', 'Manual'], ['digital', 'Digital']]],
        ['Type', fMeasure, setFMeasure, [['count', 'Count'], ['linear', 'Linear']]],
        ['Sheet', fSheet, setFSheet, [['__none__', 'No sheet'], ...pages.map((p) => [p.id, p.num])]],
        ['User', fUser, setFUser, users.map((u) => [u, u])],
      ] as [string, string, (v: string) => void, [string, string][]][]).map(([label, value, setter, opts]) => (
        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{label}</span>
          <select
            value={value}
            onChange={(e) => setter(e.target.value)}
            aria-label={`Filter by ${label}`}
            style={{ height: 24, padding: '0 4px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 10.5, background: value === ALL ? 'white' : '#EFF6FF', color: value === ALL ? '#374151' : '#1D4ED8', outline: 'none', cursor: 'pointer' }}
          >
            <option value={ALL}>All</option>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      ))}

      {filterCount > 0 && (
        <button onClick={clearFilters} style={{ height: 24, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', fontSize: 10.5, color: '#2563EB', cursor: 'pointer', flexShrink: 0 }}>
          Clear {filterCount}
        </button>
      )}
    </div>
  );

  const columnBar = showColumns && !collapsed && (
    <div className="bp-scroll-x" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderBottom: '1px solid #E5E7EB', background: '#FCFCFD', overflowX: 'auto', flexShrink: 0 }}>
      <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>Show columns</span>
      {COLUMNS.map((c) => {
        const on = visible.includes(c.key);
        return (
          <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => setVisible((prev) => (on
                // Item is the row's identity; hiding it would leave anonymous numbers.
                ? (c.key === 'item' ? prev : prev.filter((k) => k !== c.key))
                : [...prev, c.key]))}
              disabled={c.key === 'item'}
              style={{ accentColor: '#2563EB' }}
            />
            <span style={{ fontSize: 10.5, color: on ? '#374151' : '#9CA3AF', whiteSpace: 'nowrap' }}>{c.label}</span>
          </label>
        );
      })}
      <button onClick={() => setVisible(DEFAULT_VISIBLE)} style={{ height: 24, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', fontSize: 10.5, color: '#2563EB', cursor: 'pointer', flexShrink: 0 }}>
        Reset
      </button>
    </div>
  );

  /** Bulk actions, on whichever records are selected — from here or the drawing. */
  const bulkBar = pickedShown.length > 0 && !collapsed && (
    <div className="bp-scroll-x" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid #BFDBFE', background: '#EFF6FF', overflowX: 'auto', flexShrink: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1D4ED8', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {pickedShown.length} takeoff{pickedShown.length === 1 ? '' : 's'} selected
      </span>
      {ordered.map((g) => (
        <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap' }}>{g.name}</span>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const ids = pickedShown.map((r) => r.id);
              onReclassify(ids, g.id, e.target.value);
              const name = selectableValues(g).find((v) => v.id === e.target.value)?.name ?? '';
              toast.success('Reclassified', {
                description: `${ids.length} takeoff${ids.length === 1 ? '' : 's'} moved to ${name}. Nothing else changed.`,
              });
            }}
            aria-label={`Set ${g.name} for selected takeoffs`}
            style={{ height: 24, padding: '0 4px', border: '1px solid #BFDBFE', borderRadius: 5, fontSize: 10.5, background: 'white', color: '#374151', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Change to…</option>
            {selectableValues(g).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
      ))}
      <button
        onClick={() => {
          const note = window.prompt(`Note for ${pickedShown.length} selected takeoff(s):`);
          if (note === null) return;
          pickedShown.forEach((r) => onUpdate(r.id, { notes: note }));
          toast.success('Note applied');
        }}
        style={{ height: 24, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', fontSize: 10.5, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
      >
        <StickyNote size={10} /> Note
      </button>
      <button
        onClick={() => {
          const ids = pickedShown.map((r) => r.id);
          onRemove(ids);
          onSelectionChange([]);
          toast.success(`${ids.length} takeoff${ids.length === 1 ? '' : 's'} removed`);
        }}
        style={{ height: 24, padding: '0 8px', border: '1px solid #FECACA', borderRadius: 5, background: 'white', fontSize: 10.5, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
      >
        <Trash2 size={10} /> Remove
      </button>
      <div style={{ flex: 1, minWidth: 4 }} />
      <button onClick={() => onSelectionChange([])} style={{ height: 24, padding: '0 8px', border: 'none', background: 'transparent', fontSize: 10.5, color: '#6B7280', cursor: 'pointer', flexShrink: 0 }}>
        Clear selection
      </button>
    </div>
  );

  const table = !collapsed && (
    <div className="bp-parts-table" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
      <div style={{ minWidth: tableWidth }}>
        {/* Column header */}
        <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 8, padding: '6px 12px', background: '#F9FAFB', borderBottom: '2px solid #F3F4F6', position: 'sticky', top: 0, zIndex: 2 }}>
          <input
            type="checkbox"
            checked={allShownPicked}
            onChange={() => onSelectionChange(allShownPicked ? [] : filtered.map((r) => r.id))}
            aria-label={allShownPicked ? 'Clear selection' : 'Select all shown records'}
            style={{ width: 12, height: 12, cursor: 'pointer', accentColor: '#2563EB' }}
          />
          {cols.map((c) => (
            <span key={c.key} style={{ ...HEAD, textAlign: c.align ?? 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.label}
            </span>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '26px 14px', textAlign: 'center', fontSize: 11.5, color: '#9CA3AF' }}>
            {records.length === 0
              ? 'No takeoff yet. Count on a drawing, or add an assembly in Manual Takeoff — both land here.'
              : 'No records match the search and filters.'}
          </div>
        )}

        {grouped.map((grp) => {
          const groupCollapsed = collapsedGroups.has(grp.key);
          const gTotals = totalsFor(grp.rows);
          return (
            <div key={grp.key}>
              {groupByDim !== 'none' && (
                <div
                  onClick={() => setCollapsedGroups((prev) => { const n = new Set(prev); if (n.has(grp.key)) n.delete(grp.key); else n.add(grp.key); return n; })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 26, padding: '0 12px', background: '#F3F4F6', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', cursor: 'pointer', position: 'sticky', left: 0 }}
                >
                  {groupCollapsed ? <ChevronRight size={11} color="#6B7280" /> : <ChevronDown size={11} color="#6B7280" />}
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{grp.label}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{grp.rows.length}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: '#6B7280', fontFamily: MONO }}>
                    {gTotals.count > 0 && `${gTotals.count} ea`}
                    {gTotals.count > 0 && gTotals.linear > 0 && ' · '}
                    {gTotals.linear > 0 && `${gTotals.linear} LF`}
                  </span>
                </div>
              )}

              {!groupCollapsed && grp.rows.map((r) => {
                const on = selectedIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={(e) => togglePick(r.id, e.shiftKey || e.metaKey || e.ctrlKey)}
                    style={{
                      display: 'grid', gridTemplateColumns: gridTemplate, gap: 8, alignItems: 'center',
                      padding: '5px 12px', borderBottom: '1px solid #F9FAFB', cursor: 'pointer',
                      background: on ? '#EFF6FF' : 'white',
                      boxShadow: on ? 'inset 2px 0 0 #2563EB' : undefined,
                    }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#FAFAFA'; }}
                    onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'white'; }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => togglePick(r.id, true)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${r.name}`}
                      style={{ width: 12, height: 12, cursor: 'pointer', accentColor: '#2563EB' }}
                    />
                    {cols.map((c) => (
                      <div key={c.key} style={{ minWidth: 0, textAlign: c.align ?? 'left' }}>
                        {cell(r, c.key)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  const footer = !collapsed && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '5px 12px', borderTop: '1px solid #E5E7EB', background: '#FAFBFC', flexShrink: 0, fontSize: 10.5, color: '#6B7280' }}>
      <span>{filtered.length} of {records.length} shown</span>
      <span style={{ fontFamily: MONO }}>Count total <strong style={{ color: '#111827' }}>{totals.count}</strong></span>
      <span style={{ fontFamily: MONO }}>Linear total <strong style={{ color: '#111827' }}>{totals.linear} LF</strong></span>
      <div style={{ flex: 1 }} />
      <span style={{ color: '#9CA3AF' }}>Adjusted figures are what carry forward to Extensions.</span>
    </div>
  );

  const body = (
    <div
      onDragOver={(e) => { if (onDropItem) { e.preventDefault(); if (!dropActive) setDropActive(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDropActive(false); }}
      onDrop={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        setDropActive(false);
        const asmId = e.dataTransfer.getData('application/x-bp-assembly');
        const partId = e.dataTransfer.getData('application/x-bp-part');
        if (asmId) onDropItem({ kind: 'assembly', id: asmId });
        else if (partId) onDropItem({ kind: 'part', id: partId });
      }}
      style={{
        display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%',
        background: 'white',
        ...(dropActive ? { outline: '2px dashed #2563EB', outlineOffset: -3 } : {}),
      }}
    >
      {header}
      {filterBar}
      {columnBar}
      {bulkBar}
      {table}
      {footer}
      {dropActive && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,246,255,0.75)', pointerEvents: 'none', fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>
          Drop to add a takeoff record
        </div>
      )}
    </div>
  );

  if (dock === 'floating') {
    return (
      <div
        style={{
          position: 'fixed', left: floatPos.x, top: floatPos.y,
          width: floatSize.w, height: collapsed ? 40 : floatSize.h,
          zIndex: 60, background: 'white', border: '1px solid #D1D5DB', borderRadius: 10,
          boxShadow: '0 18px 50px rgba(17,24,39,0.22)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Drag strip — the title bar itself, which is where anyone reaches for it. */}
        <div
          onMouseDown={startFloatDrag}
          style={{ height: 26, background: '#F3F4F6', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', cursor: 'move', flexShrink: 0 }}
        >
          <Move size={11} color="#9CA3AF" />
          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6B7280' }}>Takeoff List — floating</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>{body}</div>
        {!collapsed && (
          <div
            onMouseDown={startFloatResize}
            title="Resize"
            style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, #D1D5DB 50%)' }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ height: collapsed ? 38 : height, flexShrink: 0, borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', position: 'relative', background: 'white' }}>
      {/* Vertical resize grip. Docked height is the canvas's to give up, so it is capped. */}
      {!collapsed && (
        <div
          onMouseDown={startDockResize}
          title="Drag to resize"
          style={{ position: 'absolute', top: -3, left: 0, right: 0, height: 6, cursor: 'ns-resize', zIndex: 5 }}
        />
      )}
      {body}
    </div>
  );
}
