import React, { useMemo, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Search, X, Star, ChevronRight, Plus, RefreshCw, Play, Save, Download,
  Package, AlertTriangle, ChevronDown, ChevronUp, List, Columns3,
  GripHorizontal, Layers, Trash2, ClipboardList, Palette, MoreHorizontal, Clock, Copy, ArrowUpDown,
} from 'lucide-react';
import {
  CategoryCode, Assembly, Part, Library,
  CATEGORIES, ASSEMBLY_SUBCATS, typesFor, ALL_ASSEMBLIES, categoryOf,
  PART_CATEGORIES, MASTER_PARTS, PART_DRAG_TYPE, dragState,
  STATUS_CFG, BOMItem, contextsForCategory,
} from './libraryData';
import {
  useTakeoffQueue, enqueue, updateEntry, removeEntry, clearQueue, queueTotals,
} from '../../lib/takeoffQueue';
import {
  TakeoffSymbol, symbolFor, setSymbolFor, onSymbolChange,
} from './libraryBuild';
import { SymbolMark, SymbolPicker } from './SymbolControl';
import { SaveAssemblyModal } from './SaveAssemblyModal';
import { ContextId, PROJECT_CONTEXTS, partAllowed } from './libraryFilters';
import { FilterBar } from './FilterBar';
import { useRecentAssemblies, recordSaved, createdAgo } from '../../lib/recentAssemblies';

/**
 * Column browser — the McCormick drill-down (category → subcategory → type →
 * assembly) rebuilt in Brightpoint's design system.
 *
 * What it keeps from McCormick: the cascading columns estimators already know,
 * assemblies and parts open at the same time, a byproducts/BOM pane, and a
 * count field next to the takeoff action.
 *
 * What it improves: one workspace instead of four floating windows, search that
 * spans every level, a breadcrumb that shows and clears the current path,
 * inline favourites, and drag-and-drop from parts straight into the BOM.
 */

// ─── Shared column primitives ─────────────────────────────────────────────────

const COL_W = 190;

function Column({ title, count, children, flex }: {
  title: string; count?: number; children: React.ReactNode; flex?: boolean;
}) {
  return (
    <div style={{
      width: flex ? undefined : COL_W, minWidth: flex ? 220 : COL_W, flex: flex ? 1 : undefined,
      borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'white',
    }}>
      <div style={{
        padding: '6px 10px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB',
        fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
      }}>
        {title}
        {count != null && <span style={{ fontSize: 9, fontWeight: 600, color: '#9CA3AF' }}>{count}</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>{children}</div>
    </div>
  );
}

function ColumnRow({ label, sub, active, disabled, chevron, onClick, right, draggable, onDragStart, onDragEnd, title }: {
  label: string; sub?: string; active?: boolean; disabled?: boolean; chevron?: boolean;
  onClick?: () => void; right?: React.ReactNode; draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void; title?: string;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        borderBottom: '1px solid #F9FAFB', cursor: disabled ? 'default' : draggable ? 'grab' : 'pointer',
        background: active ? '#EFF6FF' : 'transparent',
        borderLeft: `2px solid ${active ? '#2563EB' : 'transparent'}`,
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={(e) => { if (!active && !disabled) e.currentTarget.style.background = '#F9FAFB'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#1D4ED8' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {right}
      {chevron && <ChevronRight size={11} color={active ? '#2563EB' : '#D1D5DB'} style={{ flexShrink: 0 }} />}
    </div>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return <div style={{ padding: '14px 10px', fontSize: 11, color: '#9CA3AF', lineHeight: '16px' }}>{text}</div>;
}

// ─── Section chrome ───────────────────────────────────────────────────────────

type ViewMode = 'columns' | 'list';

/**
 * Header for each cascade band. Carries the collapse toggle, the
 * columns-vs-flat-list switch, and whatever actions the section owns.
 */
function SectionBar({ label, count, collapsed, onToggle, mode, onModeChange, children }: {
  label: string;
  count: string;
  collapsed: boolean;
  onToggle: () => void;
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB', flexShrink: 0, flexWrap: 'wrap' }}>
      <button
        onClick={onToggle}
        aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
      >
        {collapsed ? <ChevronDown size={12} color="#6B7280" /> : <ChevronUp size={12} color="#6B7280" />}
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{count}</span>
      </button>

      <div style={{ flex: 1, minWidth: 8 }} />
      {children}

      {/* Columns vs complete list */}
      <div style={{ display: 'flex', border: '1px solid #D1D5DB', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
        {([['columns', Columns3, 'Drill by category'], ['list', List, 'Complete list, no drilling']] as const).map(([m, Icon, title]) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            title={title}
            style={{
              width: 28, height: 24, border: 'none', cursor: 'pointer',
              background: mode === m ? '#EFF6FF' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon size={12} color={mode === m ? '#1D4ED8' : '#9CA3AF'} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Drag handle between the two cascades. */
function ResizeHandle({ onStart }: { onStart: (e: React.MouseEvent) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseDown={onStart}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Drag to resize"
      style={{
        height: 7, flexShrink: 0, cursor: 'row-resize',
        background: hover ? '#BFDBFE' : '#E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 120ms',
      }}
    >
      <GripHorizontal size={11} color={hover ? '#1D4ED8' : '#9CA3AF'} />
    </div>
  );
}

/**
 * How the assembly list is ordered.
 *
 * "Recently created" is the default because the estimator's last save is what
 * they most often want next; the rest are there for when the library is being
 * read rather than worked.
 */
type SortMode = 'recent' | 'az' | 'za' | 'code' | 'category';

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'recent',   label: 'Recently created' },
  { id: 'az',       label: 'Name A–Z' },
  { id: 'za',       label: 'Name Z–A' },
  { id: 'code',     label: 'Assembly code' },
  { id: 'category', label: 'Category path' },
];

/**
 * Marks an assembly created in this session, on the row it already occupies.
 *
 * The alternative — a separate Recently Created list above the library — meant
 * the same assembly appeared twice and the estimator had to work out whether
 * they were looking at one thing or two. Recency is a property of the row.
 */
function RecentBadge({ savedAt, compact }: { savedAt: number; compact?: boolean }) {
  const ago = createdAgo(savedAt).replace(/^Created /, '');
  return (
    <span
      title={createdAgo(savedAt)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
        fontSize: 9, fontWeight: 600, color: '#15803D',
        background: '#F0FDF4', border: '1px solid #BBF7D0',
        padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap',
      }}
    >
      <Clock size={8} />
      {compact ? ago : `Recently created · ${ago}`}
    </span>
  );
}

/** Flat, searchable list of every row in a library — no category drilling. */
function FlatList({ rows, emptyText }: {
  rows: { id: string; primary: string; secondary: string; path?: string; badge?: React.ReactNode; active?: boolean; right?: React.ReactNode; lead?: React.ReactNode; onClick?: () => void; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void }[];
  emptyText: string;
}) {
  if (rows.length === 0) return <EmptyColumn text={emptyText} />;
  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: 'white' }}>
      {rows.map((r) => (
        <div
          key={r.id}
          onClick={r.onClick}
          draggable={r.draggable}
          onDragStart={r.onDragStart}
          onDragEnd={r.onDragEnd}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
            borderBottom: '1px solid #F9FAFB', cursor: r.draggable ? 'grab' : 'pointer',
            background: r.active ? '#EFF6FF' : 'transparent',
            borderLeft: `2px solid ${r.active ? '#2563EB' : 'transparent'}`,
          }}
          onMouseEnter={(e) => { if (!r.active) e.currentTarget.style.background = '#F9FAFB'; }}
          onMouseLeave={(e) => { if (!r.active) e.currentTarget.style.background = 'transparent'; }}
        >
          {r.lead && <span style={{ display: 'flex', flexShrink: 0 }}>{r.lead}</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: r.active ? 600 : 400, color: r.active ? '#1D4ED8' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.primary}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.secondary}</div>
          </div>
          {r.badge}
          {r.path && (
            <span style={{ fontSize: 10, color: '#9CA3AF', background: '#F9FAFB', border: '1px solid #F3F4F6', padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.path}
            </span>
          )}
          {r.right}
        </div>
      ))}
    </div>
  );
}

// ─── Save assembly modal ──────────────────────────────────────────────────────

/**
 * Files the assembly on the bench under a category → subcategory → type, so it
 * lands in the right branch of the cascade rather than an "uncategorised" bucket.
 *
 * Reached from Save, not from New assembly: the draft already exists and its BOM
 * is already built by the time this opens, so this is where the naming and
 * filing happens — not a gate in front of the work.
 */
/**
 * The mark this assembly leaves on the plan.
 *
 * Rendered at the size it appears in a list, and again on the takeoff screen —
 * the estimator has to be able to tell at a glance which assembly they are
 * counting, because finding out forty clicks later means recounting.
 */


// ─── Takeoff queue modal ──────────────────────────────────────────────────────

/** Everything queued for takeoff, with counts still editable before placing. */
function TakeoffQueueModal({ onClose }: { onClose: () => void }) {
  const entries = useTakeoffQueue();
  const totals = queueTotals(entries);
  const SHEETS = ['E-101', 'E-102', 'E-201', 'E-202', 'E-301', 'E-401'];
  const GRID = '1fr 96px 76px 96px 96px 28px';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,24,39,0.45)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 780, maxHeight: '88vh', background: 'white', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={15} color="#2563EB" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Sent to takeoff</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              {totals.assemblies} assembl{totals.assemblies === 1 ? 'y' : 'ies'} · {totals.placements} placement{totals.placements === 1 ? '' : 's'} queued
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <ClipboardList size={32} color="#E5E7EB" />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 12 }}>Nothing queued yet</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              Pick an assembly, set a count and press Add to Takeoff — it lands here before it is placed on a drawing.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '6px 18px', gap: 10, background: '#FAFAFA', borderBottom: '2px solid #F3F4F6' }}>
              {['Assembly', 'Sheet', 'Count', 'Material', 'Hours', ''].map((h) => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {entries.map((e) => (
                <div key={e.entryId} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', minHeight: 44, padding: '5px 18px', gap: 10, borderBottom: '1px solid #F9FAFB' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.code} · {e.category}{e.subcat ? ` › ${e.subcat}` : ''} · {e.componentCount} components
                    </div>
                  </div>
                  <select
                    value={e.sheet}
                    onChange={(ev) => updateEntry(e.entryId, { sheet: ev.target.value })}
                    style={{ height: 26, padding: '0 4px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', background: 'white', outline: 'none' }}
                  >
                    {SHEETS.map((sh) => <option key={sh}>{sh}</option>)}
                  </select>
                  <input
                    type="number" min={1} value={e.count}
                    onChange={(ev) => updateEntry(e.entryId, { count: Math.max(1, parseInt(ev.target.value, 10) || 1) })}
                    style={{ width: '100%', height: 26, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#374151', textAlign: 'right' }}>${(e.materialCost * e.count).toFixed(2)}</span>
                  <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', textAlign: 'right' }}>{(e.labourHours * e.count).toFixed(1)} h</span>
                  <button onClick={() => removeEntry(e.entryId)} aria-label={`Remove ${e.name}`}
                    style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    <Trash2 size={11} color="#DC2626" />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px', borderTop: '1px solid #E5E7EB', background: '#FAFAFA', flexWrap: 'wrap' }}>
              {[
                { label: 'Placements', value: String(totals.placements) },
                { label: 'Material', value: `$${totals.material.toFixed(2)}` },
                { label: 'Labor', value: `${totals.hours.toFixed(1)} h` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'IBM Plex Mono, monospace' }}>{value}</div>
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={() => { clearQueue(); toast.info('Takeoff queue cleared'); }}
                style={{ height: 32, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                Clear queue
              </button>
              <button
                onClick={() => { toast.success('Placed on drawings', { description: `${totals.placements} placement${totals.placements === 1 ? '' : 's'} handed to the takeoff workspace.` }); clearQueue(); onClose(); }}
                style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Play size={11} /> Place on drawings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ColumnLibraryView({ activeLib, libraries, viewSwitcher, libraryPicker }: {
  activeLib: Library;
  libraries?: Library[];
  /** Browse | Build. Last in the toolbar, right-aligned. */
  viewSwitcher: React.ReactNode;
  libraryPicker?: React.ReactNode;
}) {
  // Assembly cascade
  const [cat, setCat]           = useState<CategoryCode>('BPC-01');
  const [subcat, setSubcat]     = useState<string | null>('Troffers');
  const [type, setType]         = useState<string | null>('2×4 Drop-In');
  const [asmId, setAsmId]       = useState<string | null>('fx-201');
  const [asmFavs, setAsmFavs]   = useState<Set<string>>(new Set(['fx-201', 'fx-203']));
  const [search, setSearch]     = useState('');

  // Section chrome: collapse, view mode, and a resizable split between bands.
  const [asmCollapsed, setAsmCollapsed]   = useState(false);
  const [partsCollapsed, setPartsCollapsed] = useState(false);
  const [asmMode, setAsmMode]   = useState<ViewMode>('columns');
  const [partsMode, setPartsMode] = useState<ViewMode>('columns');
  const [asmHeight, setAsmHeight] = useState(330);
  const [dragging, setDragging]   = useState(false);
  const dragStart = useRef({ y: 0, h: 330 });

  // Assemblies created in this session, merged into the cascade.
  const [customAssemblies, setCustomAssemblies] = useState<{ a: Assembly; cat: CategoryCode }[]>([]);
  /** The unsaved assembly on the bench, if any. Lives in the cascade like any other. */
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftSeq = useRef(0);
  /**
   * Building conditions, inherited from Project Setup and overridable here.
   * They narrow the parts on offer; the cascade itself is untouched.
   */
  const [ctxFilters, setCtxFilters] = useState<ContextId[]>(PROJECT_CONTEXTS);

  /**
   * Assemblies saved this session. They live in the shared store because Build
   * Mode is unmounted by the time Browse needs to show what it saved.
   */
  const recent = useRecentAssemblies();

  /**
   * Recency, as a property of the assembly rather than a place to look.
   * Marked inline on the row it already occupies — no second list to scan.
   */
  const recentOf = useMemo(
    () => new Map(recent.map((r) => [r.assembly.id, r.savedAt])),
    [recent],
  );

  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  /** True while the Save dialog is filing a copy rather than the draft itself. */
  const [duplicating, setDuplicating] = useState(false);
  const [showSaveAssembly, setShowSaveAssembly] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const takeoffQueue = useTakeoffQueue();

  /** Takeoff symbol per assembly. Defaults are derived, then overridden here. */
  const [symbolOpen, setSymbolOpen] = useState(false);

  // Parts cascade
  const [partCat, setPartCat]       = useState<string | null>('Hangers & Supports');
  const [partSubcat, setPartSubcat] = useState<string | null>('T-Bar');
  const [partSearch, setPartSearch] = useState('');
  const [partFavs, setPartFavs]     = useState<Set<string>>(new Set(['pt-38', 'pt-4']));

  // Selected assembly's working BOM
  const [bom, setBom]                   = useState<BOMItem[]>(ALL_ASSEMBLIES.find((a) => a.id === 'fx-201')?.bom ?? []);
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [dropActive, setDropActive]     = useState(false);
  /** Starts at zero: opening an assembly must not put work in the job. */
  const [count, setCount]               = useState('0');

  // Drag the divider between the two cascades.
  useEffect(() => {
    if (!dragging) return;
    function move(e: MouseEvent) {
      const next = dragStart.current.h + (e.clientY - dragStart.current.y);
      setAsmHeight(Math.max(120, Math.min(760, next)));
    }
    function up() { setDragging(false); }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.userSelect = '';
    };
  }, [dragging]);

  /**
   * Shipped assemblies, this view's drafts, and anything Build Mode saved.
   *
   * Saved assemblies are filed here like any other — Recently Created is only a
   * shortcut to them, never a separate store.
   */
  const assemblies = useMemo(() => {
    const seen = new Set<string>();
    const out: Assembly[] = [];
    for (const a of [...ALL_ASSEMBLIES, ...customAssemblies.map((c) => c.a), ...recent.map((r) => r.assembly)]) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
    return out;
  }, [customAssemblies, recent]);

  /** Custom and saved assemblies carry their category explicitly. */
  const catOf = useMemo(() => {
    const overrides = new Map<string, CategoryCode>([
      ...customAssemblies.map((c) => [c.a.id, c.cat] as [string, CategoryCode]),
      ...recent.map((r) => [r.assembly.id, r.cat] as [string, CategoryCode]),
    ]);
    return (a: Assembly) => overrides.get(a.id) ?? categoryOf(a);
  }, [customAssemblies, recent]);

  const selectedAsm = asmId ? assemblies.find((a) => a.id === asmId) ?? null : null;

  /** An assembly's mark: whatever was chosen, else a stable derived default. */
  /*
   * Read from the shared store, not local state: a symbol set in Build Mode has
   * to already be on the assembly when Browse first renders it.
   */
  const [, symbolRev] = useState(0);
  useEffect(() => onSymbolChange(() => symbolRev((n) => n + 1)), []);
  const symbolOf = (a: Assembly): TakeoffSymbol => symbolFor(a.id, a.name);
  const setSymbol = (id: string, sym: TakeoffSymbol) => setSymbolFor(id, sym);
  const isDraft = !!draftId && asmId === draftId;
  const savedCustomCount = customAssemblies.filter((c) => c.a.id !== draftId).length;

  // ── Assembly cascade data ───────────────────────────────────────────────────
  const subcats = ASSEMBLY_SUBCATS[cat] ?? [];
  const types   = subcat ? typesFor(cat, subcat) : [];

  const assembliesInBranch = useMemo(() => assemblies.filter((a) => {
    if (catOf(a) !== cat) return false;
    if (subcat && a.subcat !== subcat) return false;
    if (type && a.type !== type) return false;
    return true;
  }), [assemblies, catOf, cat, subcat, type]);

  /** Search short-circuits the cascade and searches every level at once. */
  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return assemblies.filter((a) =>
      a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) ||
      a.desc.toLowerCase().includes(q) || (a.subcat ?? '').toLowerCase().includes(q) ||
      (a.type ?? '').toLowerCase().includes(q));
  }, [assemblies, search]);

  const assemblyList = searchHits ?? assembliesInBranch;

  function countInBranch(code: CategoryCode, sc?: string, ty?: string) {
    return assemblies.filter((a) =>
      catOf(a) === code && (!sc || a.subcat === sc) && (!ty || a.type === ty)).length;
  }

  function selectAssembly(a: Assembly) {
    setAsmId(a.id);
    setBom(a.bom);
    setSelectedBomId(null);
    // Keep the cascade in step when the pick came from a search hit.
    setCat(catOf(a));
    if (a.subcat) setSubcat(a.subcat);
    if (a.type) setType(a.type);
  }

  // ── Parts cascade data ──────────────────────────────────────────────────────
  const partSubcats = partCat ? (PART_CATEGORIES.find((c) => c.name === partCat)?.subcats ?? []) : [];

  /** Parts the active building conditions permit. Empty filters = everything. */
  const allowedParts = useMemo(
    () => MASTER_PARTS.filter((pt) => partAllowed(pt, ctxFilters)),
    [ctxFilters],
  );
  const partsHidden = MASTER_PARTS.length - allowedParts.length;

  const partList = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (q) {
      return allowedParts.filter((pt) =>
        pt.name.toLowerCase().includes(q) || pt.code.toLowerCase().includes(q) || pt.mfr.toLowerCase().includes(q));
    }
    return allowedParts.filter((pt) =>
      (!partCat || pt.cat === partCat) && (!partSubcat || pt.subcat === partSubcat));
  }, [allowedParts, partCat, partSubcat, partSearch]);

  /**
   * Complete-list mode deliberately ignores the cascade selection — the point of
   * the list is to see every part in one scroll without picking a category. The
   * search box still narrows it; each row carries its own category › subcategory
   * path so nothing is ambiguous.
   */
  const partFlatList = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return allowedParts;
    return allowedParts.filter((pt) =>
      pt.name.toLowerCase().includes(q) || pt.code.toLowerCase().includes(q) || pt.mfr.toLowerCase().includes(q));
  }, [allowedParts, partSearch]);

  /**
   * Applies the chosen order.
   *
   * Under "Recently created", saves float to the top and everything else keeps
   * the library's own order — a badge alone is not enough on a long list, since
   * an assembly saved a minute ago sitting at row 25 is still a hunt.
   */
  const sortRows = useMemo(() => (rows: Assembly[]) => {
    const path = (a: Assembly) =>
      `${CATEGORIES.find((c) => c.code === catOf(a))?.name ?? ''} ${a.subcat ?? ''} ${a.type ?? ''}`;
    switch (sortMode) {
      case 'az':
        return [...rows].sort((x, y) => x.name.localeCompare(y.name));
      case 'za':
        return [...rows].sort((x, y) => y.name.localeCompare(x.name));
      case 'code':
        return [...rows].sort((x, y) => x.code.localeCompare(y.code));
      case 'category':
        return [...rows].sort((x, y) => path(x).localeCompare(path(y)) || x.name.localeCompare(y.name));
      default:
        if (recentOf.size === 0) return rows;
        return [...rows].sort((x, y) => (recentOf.get(y.id) ?? 0) - (recentOf.get(x.id) ?? 0));
    }
  }, [recentOf, sortMode, catOf]);

  /** Same rule for assemblies: the whole library, filtered only by the search. */
  const asmFlatList = useMemo(
    () => sortRows(search ? assemblyList : assemblies),
    [search, assemblyList, assemblies, sortRows],
  );

  // ── BOM actions ─────────────────────────────────────────────────────────────
  function addPart(part: Part) {
    setBom((prev) => [...prev, {
      id: `part-${part.id}-${Date.now()}`, group: part.bomGroup, name: part.name,
      code: part.code, qty: 1, unit: part.unit, required: false, priceStatus: 'ok',
    }]);
    toast.success('Part added to assembly', { description: `${part.name} · ${part.bomGroup}` });
  }

  function replacePart(part: Part) {
    if (!selectedBomId) {
      toast.error('Select a component first', { description: 'Click a row in the assembly BOM, then Replace.' });
      return;
    }
    const target = bom.find((i) => i.id === selectedBomId);
    setBom((prev) => prev.map((i) => i.id === selectedBomId
      ? { ...i, name: part.name, code: part.code, unit: part.unit } : i));
    toast.success('Component replaced', { description: `${target?.name ?? 'Component'} → ${part.name}` });
  }

  /** Editable component quantity — a bracket goes 1 → 10, wire 20 ft → 10 ft. */
  function setBomQty(id: string, qty: number) {
    setBom((prev) => prev.map((i) => (i.id === id
      // A hand-typed quantity overrides any parametric calculation behind it,
      // and says so, so nobody wonders why the formula stopped applying.
      ? { ...i, qty, manualOverride: true, calc: i.baseQty !== undefined ? `overridden — was ${i.baseQty}` : i.calc }
      : i)));
  }

  function removeBomItem(id: string) {
    setBom((prev) => prev.filter((i) => i.id !== id));
    if (selectedBomId === id) setSelectedBomId(null);
  }

  /**
   * Send the assembly to the takeoff screen ready to count.
   *
   * It arrives at zero on purpose. Pre-adding a count of one means every
   * assembly the estimator opens and abandons leaves a phantom fixture in the
   * job — the count comes from clicking the plan, not from opening a panel.
   */
  function addToTakeoff() {
    if (!selectedAsm) { toast.error('Select an assembly first'); return; }
    const qty = Math.max(0, parseInt(count, 10) || 0);
    enqueue({
      assemblyId: selectedAsm.id,
      name: selectedAsm.name,
      code: selectedAsm.code,
      category: CATEGORIES.find((c) => c.code === catOf(selectedAsm))?.name ?? '',
      subcat: selectedAsm.subcat,
      type: selectedAsm.type,
      count: qty,
      componentCount: bom.length,
      materialCost: matCost,
      labourHours: labourHrs,
      sheet: 'E-101',
    });
    toast.success('Ready to count on the plan', {
      description: qty > 0
        ? `${selectedAsm.name} — starting at ${qty}.`
        : `${selectedAsm.name} — click the plan to count. Nothing is added until you do.`,
    });
  }

  /**
   * Drops a draft tile into the selected branch with an empty BOM.
   *
   * Unreachable from Browse since the New assembly button was removed on the
   * client's instruction — creating an assembly is Build Mode's job. Kept
   * because the draft *rendering* is still live: an in-progress draft shows here
   * with its DRAFT chip, and nothing else knows how to construct one.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function startDraft() {
    draftSeq.current += 1;
    const id = `draft-${draftSeq.current}`;
    const draft: Assembly = {
      id,
      name: 'New assembly',
      code: 'Unsaved',
      desc: 'Draft — add parts from the Parts library, then Save to file it.',
      status: 'custom',
      subcat: subcat ?? undefined,
      type: type ?? undefined,
      context: [],
      wiringMethod: '—',
      source: activeLib.type,
      isFavorite: false,
      bom: [],
    };
    setCustomAssemblies((prev) => [...prev, { a: draft, cat }]);
    setDraftId(id);
    setAsmId(id);
    setBom([]);
    setSelectedBomId(null);
    setSearch('');
    toast.success('Draft assembly added', {
      description: `Building in ${CATEGORIES.find((c) => c.code === cat)?.name}${subcat ? ` › ${subcat}` : ''}. Save when the BOM is ready.`,
    });
  }

  /** Keeps the draft tile's BOM in step with the bench while it is being built. */
  useEffect(() => {
    if (!draftId || asmId !== draftId) return;
    setCustomAssemblies((prev) => prev.map((c) => (c.a.id === draftId ? { ...c, a: { ...c.a, bom } } : c)));
  }, [bom, draftId, asmId]);

  function discardDraft() {
    if (!draftId) return;
    setCustomAssemblies((prev) => prev.filter((c) => c.a.id !== draftId));
    setDraftId(null);
    setAsmId(null);
    setBom([]);
    setSelectedBomId(null);
    toast.info('Draft discarded');
  }

  /** Save turns the draft into a filed assembly, in place. */
  function saveAssembly(a: Assembly, catCode: CategoryCode, libraryId?: string) {
    const isCopy = duplicating;
    setCustomAssemblies((prev) => (
      /*
       * A copy is always a new row. Only a draft being filed replaces itself —
       * duplicating while a draft is open must not consume the draft.
       */
      draftId && !isCopy
        ? prev.map((c) => (c.a.id === draftId ? { a, cat: catCode } : c))
        : [...prev, { a, cat: catCode }]
    ));
    if (!isCopy) setDraftId(null);

    // Mark it recent, which is what puts the badge on its row in both views.
    const lib = (libraries ?? [activeLib]).find((l) => l.id === libraryId);
    recordSaved({
      assembly: a,
      cat: catCode,
      libraryId: libraryId ?? activeLib.id,
      libraryName: lib?.name ?? activeLib.name,
    });

    setShowSaveAssembly(false);
    setDuplicating(false);
    // Reveal it where it filed, so the estimator sees it land.
    setCat(catCode);
    if (a.subcat) setSubcat(a.subcat);
    setType(a.type ?? null);
    setSearch('');
    setAsmId(a.id);
    setBom(a.bom);
    setSelectedBomId(null);
    toast.success(isCopy ? 'Duplicate created' : 'Assembly saved', {
      description: `${a.name} filed under ${CATEGORIES.find((c) => c.code === catCode)?.name}${a.subcat ? ` › ${a.subcat}` : ''}.`,
    });
  }

  const matCost   = bom.reduce((sum, i) => sum + i.qty * 24.5, 0);
  const labourHrs = bom.length * 0.35;


  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', background: '#F6F7F9' }}>
      {/* Toolbar */}
      <div className="bp-toolbar" style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <div className="bp-toolbar-grow" style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assemblies at any level…"
            style={{ width: '100%', height: 34, paddingLeft: 30, paddingRight: 26, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}>
              <X size={12} color="#9CA3AF" />
            </button>
          )}
        </div>

        <FilterBar active={ctxFilters} onChange={setCtxFilters} inherited={PROJECT_CONTEXTS} compact />

        {/* Pushes the library picker, takeoff queue and view switcher flush
            right, matching the Workbench toolbar. */}
        <div style={{ flex: 1 }} />

        {libraryPicker}

        <button
          onClick={() => setShowQueue(true)}
          title="Assemblies sent to takeoff"
          style={{ height: 34, padding: '0 12px', border: `1px solid ${takeoffQueue.length ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 8, background: takeoffQueue.length ? '#EFF6FF' : 'white', fontSize: 12, fontWeight: takeoffQueue.length ? 600 : 400, color: takeoffQueue.length ? '#1D4ED8' : '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
        >
          <ClipboardList size={13} /> Takeoff
          {takeoffQueue.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#2563EB', borderRadius: 9999, padding: '1px 6px' }}>
              {queueTotals(takeoffQueue).placements}
            </span>
          )}
        </button>

        <div style={{ flexShrink: 0 }}>{viewSwitcher}</div>
      </div>

      {/* Breadcrumb */}
      <div className="bp-scroll-x" style={{ padding: '8px 16px', background: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 12 }}>
        {search ? (
          <span style={{ color: '#6B7280' }}>
            Search results for <strong style={{ color: '#111827' }}>"{search}"</strong> · {assemblyList.length} assembl{assemblyList.length === 1 ? 'y' : 'ies'} across all categories
          </span>
        ) : (
          <>
            <span style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>Assemblies</span>
            <ChevronRight size={11} color="#D1D5DB" style={{ flexShrink: 0 }} />
            <button onClick={() => { setSubcat(null); setType(null); }} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {CATEGORIES.find((c) => c.code === cat)?.name}
            </button>
            {subcat && (
              <>
                <ChevronRight size={11} color="#D1D5DB" style={{ flexShrink: 0 }} />
                <button onClick={() => setType(null)} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>{subcat}</button>
              </>
            )}
            {type && (
              <>
                <ChevronRight size={11} color="#D1D5DB" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#1D4ED8', whiteSpace: 'nowrap' }}>{type}</span>
              </>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{assemblyList.length} in this branch</span>
          </>
        )}
      </div>

      {/* Body: cascades + BOM. bp-lib stacks the BOM below the cascades ≤1024px. */}
      <div className="bp-lib" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Left: assembly cascade over parts cascade */}
        <div className="bp-lib-centre" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {/* Assemblies band */}
          <SectionBar
            label="Assemblies"
            count={`${(asmMode === 'list' ? asmFlatList : assemblyList).length}${savedCustomCount ? ` · ${savedCustomCount} new` : ''}${draftId ? ' · 1 draft' : ''}`}
            collapsed={asmCollapsed}
            onToggle={() => setAsmCollapsed((v) => !v)}
            mode={asmMode}
            onModeChange={setAsmMode}
          >
            {/* Ordering sits with the list it orders, next to the action that adds to it. */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <ArrowUpDown size={11} color="#9CA3AF" />
              <span className="bp-hide-sm" style={{ fontSize: 10, color: '#9CA3AF' }}>Sort</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                aria-label="Sort assemblies"
                style={{ height: 24, padding: '0 4px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, background: 'white', outline: 'none', color: '#374151', minWidth: 0 }}
              >
                {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>

            
          </SectionBar>

          {!asmCollapsed && (asmMode === 'list' ? (
            <div style={{ height: partsCollapsed ? undefined : asmHeight, flex: partsCollapsed ? 1 : undefined, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <FlatList
                emptyText="No assemblies match."
                rows={asmFlatList.map((a) => ({
                  id: a.id,
                  // The same mark the cascade shows — the list was the only
                  // assembly view that did not say which symbol it carries.
                  lead: <SymbolMark symbol={symbolOf(a)} size={13} />,
                  primary: a.name,
                  secondary: `${a.code} · ${a.wiringMethod}`,
                  path: `${CATEGORIES.find((c) => c.code === catOf(a))?.name ?? ''}${a.subcat ? ` › ${a.subcat}` : ''}${a.type ? ` › ${a.type}` : ''}`,
                  active: a.id === asmId,
                  onClick: () => selectAssembly(a),
                  badge: recentOf.has(a.id) ? <RecentBadge savedAt={recentOf.get(a.id)!} /> : undefined,
                  right: a.id === draftId ? (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, color: '#B45309', background: '#FFFBEB', letterSpacing: '0.04em', flexShrink: 0 }}>
                      DRAFT
                    </span>
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, color: STATUS_CFG[a.status].color, background: STATUS_CFG[a.status].bg, flexShrink: 0 }}>
                      {STATUS_CFG[a.status].symbol}
                    </span>
                  ),
                }))}
              />
            </div>
          ) : (
          <div className="bp-scroll-x" style={{ height: partsCollapsed ? undefined : asmHeight, flex: partsCollapsed ? 1 : undefined, display: 'flex', minHeight: 0, overflowX: 'auto' }}>
            <Column title="Category" count={CATEGORIES.length}>
              {CATEGORIES.map((c) => (
                <ColumnRow
                  key={c.code}
                  label={c.name}
                  sub={`${c.code} · ${c.count}`}
                  active={c.code === cat && !search}
                  chevron
                  onClick={() => { setCat(c.code); setSubcat(null); setType(null); setSearch(''); }}
                  right={c.warning ? <AlertTriangle size={10} color="#D97706" /> : undefined}
                />
              ))}
            </Column>

            <Column title="Subcategory" count={subcats.length}>
              {subcats.length === 0
                ? <EmptyColumn text="No subcategories defined for this category yet." />
                : subcats.map((sc) => (
                  <ColumnRow
                    key={sc}
                    label={sc}
                    sub={`${countInBranch(cat, sc)} assemblies`}
                    active={sc === subcat && !search}
                    chevron
                    onClick={() => { setSubcat(sc); setType(null); setSearch(''); }}
                  />
                ))}
            </Column>

            <Column title="Type" count={types.length}>
              {!subcat
                ? <EmptyColumn text="Pick a subcategory." />
                : types.length === 0
                  ? <EmptyColumn text="No types defined for this subcategory yet." />
                  : types.map((t) => (
                    <ColumnRow
                      key={t}
                      label={t}
                      sub={`${countInBranch(cat, subcat, t)} assemblies`}
                      active={t === type && !search}
                      chevron
                      onClick={() => { setType(t); setSearch(''); }}
                    />
                  ))}
            </Column>

            <Column title={search ? 'Matching assemblies' : 'Assembly'} count={assemblyList.length} flex>
              {assemblyList.length === 0
                ? <EmptyColumn text="No assemblies in this branch yet. The catalogue import will populate it." />
                : sortRows(assemblyList).map((a) => {
                  const st = STATUS_CFG[a.status];
                  const fav = asmFavs.has(a.id);
                  const draft = a.id === draftId;
                  return (
                    <div key={a.id}>
                    <ColumnRow
                      label={a.name}
                      sub={search ? `${a.code} · ${a.subcat ?? ''}${a.type ? ' · ' + a.type : ''}` : a.code}
                      active={a.id === asmId}
                      onClick={() => selectAssembly(a)}
                      right={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          {recentOf.has(a.id) && <RecentBadge savedAt={recentOf.get(a.id)!} compact />}
                          {/* The mark it leaves on the plan, visible before it is picked. */}
                          <SymbolMark symbol={symbolOf(a)} size={13} />
                          {draft
                            ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, color: '#B45309', background: '#FFFBEB', letterSpacing: '0.04em' }}>DRAFT</span>
                            : <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, color: st.color, background: st.bg }}>{st.symbol}</span>}
                          <button
                            onClick={(e) => { e.stopPropagation(); setAsmFavs((prev) => { const n = new Set(prev); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; }); }}
                            aria-label={fav ? 'Remove favourite' : 'Add favourite'}
                            style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Star size={11} fill={fav ? '#F59E0B' : 'none'} color={fav ? '#F59E0B' : '#D1D5DB'} />
                          </button>
                          {/* Row actions. Duplicate opens a copy in Build Mode. */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setRowMenuId(rowMenuId === a.id ? null : a.id); }}
                            aria-label={`Actions for ${a.name}`}
                            style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <MoreHorizontal size={12} color="#9CA3AF" />
                          </button>
                        </div>
                      }
                    />
                    {rowMenuId === a.id && (
                      <>
                        <div onClick={() => setRowMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 44 }} />
                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', right: 8, top: -4, zIndex: 45, minWidth: 172, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 6px 20px rgba(17,24,39,0.14)', overflow: 'hidden' }}>
                            {([
                              ['Open', () => selectAssembly(a)],
                              ['Duplicate Assembly', () => { selectAssembly(a); setDuplicating(true); setShowSaveAssembly(true); }],
                              [fav ? 'Unfavorite' : 'Favorite', () => setAsmFavs((prev) => { const n = new Set(prev); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })],
                            ] as [string, () => void][]).map(([label, act]) => (
                              <button
                                key={label}
                                onClick={() => { setRowMenuId(null); act(); }}
                                style={{ width: '100%', padding: '7px 11px', border: 'none', background: 'white', cursor: 'pointer', textAlign: 'left', fontSize: 12, color: '#374151', borderBottom: '1px solid #F9FAFB' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    </div>
                  );
                })}
            </Column>
          </div>
          ))}

          {/* Resizable divider between the two bands */}
          {!asmCollapsed && !partsCollapsed && (
            <ResizeHandle onStart={(e) => { dragStart.current = { y: e.clientY, h: asmHeight }; setDragging(true); }} />
          )}

          {/* Parts band */}
          <SectionBar
            label="Parts"
            count={`${(partsMode === 'list' ? partFlatList : partList).length}`}
            collapsed={partsCollapsed}
            onToggle={() => setPartsCollapsed((v) => !v)}
            mode={partsMode}
            onModeChange={setPartsMode}
          >
            <div style={{ position: 'relative', width: 200, flexShrink: 0 }}>
              <Search size={11} color="#9CA3AF" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Search parts…"
                style={{ width: '100%', height: 24, paddingLeft: 24, paddingRight: 8, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, outline: 'none', boxSizing: 'border-box', background: 'white' }}
              />
            </div>
            {partsHidden > 0 && (
              <span title="Hidden by the active building conditions" style={{ fontSize: 10, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 7px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {partsHidden} filtered out
              </span>
            )}
            <span className="bp-hide-sm" style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>drag onto the BOM</span>
          </SectionBar>

          {!partsCollapsed && (partsMode === 'list' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <FlatList
                emptyText="No parts match."
                rows={partFlatList.map((pt) => ({
                  id: pt.id,
                  primary: pt.name,
                  secondary: `${pt.code} · ${pt.mfr} · $${pt.price.toFixed(2)}/${pt.unit}`,
                  path: `${pt.cat} › ${pt.subcat}`,
                  draggable: true,
                  onDragStart: (e: React.DragEvent) => {
                    dragState.part = pt;
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData(PART_DRAG_TYPE, pt.id);
                    e.dataTransfer.setData('text/plain', pt.name);
                  },
                  onDragEnd: () => { dragState.part = null; },
                  right: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <button onClick={(e) => { e.stopPropagation(); addPart(pt); }} title="Add to assembly"
                        style={{ width: 20, height: 20, border: 'none', background: '#EFF6FF', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={10} color="#1D4ED8" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); replacePart(pt); }} title={selectedBomId ? 'Replace the selected BOM component' : 'Select a BOM component first'}
                        style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={10} color={selectedBomId ? '#6B7280' : '#D1D5DB'} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setPartFavs((prev) => { const n = new Set(prev); if (n.has(pt.id)) n.delete(pt.id); else n.add(pt.id); return n; }); }}
                        aria-label="Toggle favourite"
                        style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Star size={10} fill={partFavs.has(pt.id) ? '#F59E0B' : 'none'} color={partFavs.has(pt.id) ? '#F59E0B' : '#D1D5DB'} />
                      </button>
                    </div>
                  ),
                }))}
              />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="bp-scroll-x" style={{ flex: 1, display: 'flex', minHeight: 0, overflowX: 'auto' }}>
                <Column title="Part category" count={PART_CATEGORIES.length}>
                  {PART_CATEGORIES.map((c) => (
                    <ColumnRow
                      key={c.name}
                      label={c.name}
                      sub={`${allowedParts.filter((pt) => pt.cat === c.name).length} parts`}
                      active={c.name === partCat && !partSearch}
                      chevron
                      onClick={() => { setPartCat(c.name); setPartSubcat(null); setPartSearch(''); }}
                    />
                  ))}
                </Column>

                <Column title="Subcategory" count={partSubcats.length}>
                  {partSubcats.length === 0
                    ? <EmptyColumn text="Pick a part category." />
                    : partSubcats.map((sc) => (
                      <ColumnRow
                        key={sc}
                        label={sc}
                        sub={`${allowedParts.filter((pt) => pt.cat === partCat && pt.subcat === sc).length} parts`}
                        active={sc === partSubcat && !partSearch}
                        chevron
                        onClick={() => { setPartSubcat(sc); setPartSearch(''); }}
                      />
                    ))}
                </Column>

                <Column title={partSearch ? 'Matching parts' : 'Part'} count={partList.length} flex>
                  {partList.length === 0
                    ? <EmptyColumn text="No parts match." />
                    : partList.map((pt) => {
                      const fav = partFavs.has(pt.id);
                      return (
                        <ColumnRow
                          key={pt.id}
                          label={pt.name}
                          sub={`${pt.code} · ${pt.mfr} · $${pt.price.toFixed(2)}/${pt.unit}`}
                          draggable
                          title="Drag onto the assembly BOM"
                          onDragStart={(e) => {
                            dragState.part = pt;
                            e.dataTransfer.effectAllowed = 'copy';
                            e.dataTransfer.setData(PART_DRAG_TYPE, pt.id);
                            e.dataTransfer.setData('text/plain', pt.name);
                          }}
                          onDragEnd={() => { dragState.part = null; }}
                          right={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                              <button onClick={(e) => { e.stopPropagation(); addPart(pt); }} title="Add to assembly"
                                style={{ width: 20, height: 20, border: 'none', background: '#EFF6FF', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Plus size={10} color="#1D4ED8" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); replacePart(pt); }} title={selectedBomId ? 'Replace the selected BOM component' : 'Select a BOM component first'}
                                style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCw size={10} color={selectedBomId ? '#6B7280' : '#D1D5DB'} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setPartFavs((prev) => { const n = new Set(prev); if (n.has(pt.id)) n.delete(pt.id); else n.add(pt.id); return n; }); }}
                                aria-label={fav ? 'Remove favourite' : 'Add favourite'}
                                style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Star size={10} fill={fav ? '#F59E0B' : 'none'} color={fav ? '#F59E0B' : '#D1D5DB'} />
                              </button>
                            </div>
                          }
                        />
                      );
                    })}
                </Column>
              </div>
            </div>
          ))}
        </div>

        {/* Right: selected assembly — BOM, count, takeoff */}
        <div
          className="bp-lib-right"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!dropActive) setDropActive(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDropActive(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDropActive(false);
            const id = e.dataTransfer.getData(PART_DRAG_TYPE) || dragState.part?.id;
            const part = MASTER_PARTS.find((pt) => pt.id === id);
            if (part) addPart(part);
          }}
          style={{
            width: 340, minWidth: 340, background: 'white', borderLeft: '1px solid #E5E7EB',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            ...(dropActive ? { outline: '2px dashed #2563EB', outlineOffset: -4, background: '#F8FBFF' } : {}),
          }}
        >
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1 }}>
              {isDraft ? 'Assembly BOM · draft' : 'Assembly BOM'}
            </span>
            {isDraft ? (
              <button onClick={discardDraft} title="Discard this draft"
                style={{ height: 26, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', fontSize: 11, color: '#6B7280' }}>
                Discard
              </button>
            ) : (
              <button onClick={() => toast.info('BOM export — CSV download')} title="Export BOM"
                style={{ width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={11} color="#6B7280" />
              </button>
            )}
            {/*
              A draft has never been filed, so it needs Save to collect a name
              and a branch. A filed assembly does not — saving it again was a
              no-op — so the same slot offers Duplicate, which is the action an
              estimator actually wants on an assembly that already exists.
            */}
            <button
              onClick={() => {
                if (!selectedAsm) { toast.error('Select an assembly first'); return; }
                if (isDraft) { setDuplicating(false); setShowSaveAssembly(true); return; }
                setDuplicating(true);
                setShowSaveAssembly(true);
              }}
              title={isDraft ? 'File this draft' : `Create a copy of ${selectedAsm?.name ?? 'this assembly'}`}
              style={{
                height: 26, padding: '0 8px', borderRadius: 5, cursor: 'pointer', fontSize: 11,
                display: 'flex', alignItems: 'center', gap: 3,
                border: isDraft ? 'none' : '1px solid #E5E7EB',
                background: isDraft ? '#2563EB' : 'white',
                color: isDraft ? 'white' : '#374151',
                fontWeight: isDraft ? 600 : 400,
              }}
            >
              {isDraft ? <><Save size={10} /> Save</> : <><Copy size={10} /> Duplicate</>}
            </button>
          </div>

          {selectedAsm ? (
            <>
              <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #E5E7EB', flexShrink: 0, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedAsm.name}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', marginTop: 1 }}>{selectedAsm.code}</div>
                  </div>
                  {/*
                    Shape and colour live with the assembly and are changeable
                    here and on the takeoff screen, so the estimator always knows
                    which assembly the marks on the plan belong to.
                  */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={() => setSymbolOpen((v) => !v)}
                      title="Takeoff symbol — the mark this assembly leaves on the plan"
                      style={{ height: 30, padding: '0 7px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <SymbolMark symbol={symbolOf(selectedAsm)} size={16} />
                      <Palette size={10} color="#9CA3AF" />
                    </button>
                    {symbolOpen && (
                      <SymbolPicker
                        symbol={symbolOf(selectedAsm)}
                        onChange={(sym) => setSymbol(selectedAsm.id, sym)}
                        onClose={() => setSymbolOpen(false)}
                      />
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 5, lineHeight: '16px' }}>{selectedAsm.desc}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                  {selectedAsm.context.map((c) => (
                    <span key={c} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#F3F4F6', color: '#6B7280' }}>{c}</span>
                  ))}
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#F3F4F6', color: '#6B7280' }}>{selectedAsm.wiringMethod}</span>
                </div>
              </div>

              <div className="bp-lib-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '6px 14px 4px', fontSize: 10, color: '#9CA3AF' }}>
                  {bom.length} component{bom.length !== 1 ? 's' : ''} · click a row to select, then Replace
                </div>
                {bom.map((item) => {
                  const isSel = selectedBomId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedBomId(isSel ? null : item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                        borderBottom: '1px solid #F9FAFB', cursor: 'pointer',
                        background: isSel ? '#EFF6FF' : 'white',
                        borderLeft: `2px solid ${isSel ? '#2563EB' : 'transparent'}`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div title={item.calc || undefined} style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.code} · {item.group}{item.calc ? ` · ${item.calc}` : ''}
                        </div>
                      </div>
                      {/*
                        Quantities are editable in place, on new and existing
                        assemblies alike — a bracket goes 1 → 10, a wire run
                        20 ft → 10 ft. It is also the hook the AI will use later
                        to set wire lengths from fixture spacing.
                      */}
                      <input
                        type="number" min={0} step={item.unit === 'LF' ? 5 : 1} value={item.qty}
                        aria-label={`${item.name} quantity`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setBomQty(item.id, parseFloat(e.target.value) || 0)}
                        style={{
                          width: 54, height: 26, padding: '0 5px', borderRadius: 5, fontSize: 11,
                          fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none',
                          flexShrink: 0, boxSizing: 'border-box',
                          border: `1px solid ${item.manualOverride ? '#FDE68A' : '#E5E7EB'}`,
                          background: item.manualOverride ? '#FFFBEB' : 'white',
                        }}
                      />
                      <span style={{ fontSize: 10, color: '#9CA3AF', width: 20, flexShrink: 0 }}>{item.unit}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeBomItem(item.id); }} aria-label={`Remove ${item.name}`}
                        style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.5 }}>
                        <X size={11} color="#DC2626" />
                      </button>
                    </div>
                  );
                })}
                {bom.length === 0 && <EmptyColumn text="No components. Drag parts in from the Parts library below." />}
              </div>

              {/* Count + takeoff — McCormick's Count field, next to the action */}
              <div style={{ flexShrink: 0, borderTop: '1px solid #E5E7EB', padding: 14, background: '#FAFAFA' }}>
                {[
                  { label: 'Components', value: String(bom.length) },
                  { label: 'Material cost', value: '$' + matCost.toFixed(2), mono: true },
                  { label: 'Labor hours', value: labourHrs.toFixed(1) + ' hrs', mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: '#6B7280' }}>{label}</span>
                    <span style={{ fontFamily: mono ? 'IBM Plex Mono, monospace' : undefined, fontWeight: 600, color: '#111827' }}>{value}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <label style={{ fontSize: 11, color: '#6B7280', flexShrink: 0 }} title="Leave at 0 and count on the plan — a starting count is optional">Count</label>
                  <input
                    type="number"
                    min={0}
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    style={{ width: 56, height: 32, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none' }}
                  />
                  <button
                    onClick={addToTakeoff}
                    style={{ flex: 1, height: 32, border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  >
                    <Play size={11} /> Add to Takeoff
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
              <Package size={32} color="#E5E7EB" />
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 12, color: '#6B7280' }}>No assembly selected</div>
              <div style={{ fontSize: 12, marginTop: 4, color: '#9CA3AF' }}>Drill down through the columns to pick one.</div>
            </div>
          )}
        </div>
      </div>

      {showSaveAssembly && (
        <SaveAssemblyModal
          seedCat={duplicating ? catOf(selectedAsm!) : cat}
          seedSubcat={duplicating ? selectedAsm?.subcat ?? subcat : subcat}
          seedType={duplicating ? selectedAsm?.type ?? type : type}
          /*
           * A copy opens pre-named so the estimator renames rather than types
           * from nothing; a draft has no name to offer yet.
           */
          seedName={duplicating ? `Copy of ${selectedAsm?.name ?? ''}` : isDraft ? '' : selectedAsm?.name ?? ''}
          seedBom={bom}
          libraries={libraries ?? [activeLib]}
          existing={assemblies.map((x) => ({ name: x.name, cat: catOf(x) }))}
          duplicateOf={duplicating ? selectedAsm?.name ?? null : null}
          onClose={() => { setShowSaveAssembly(false); setDuplicating(false); }}
          onSave={(a, catCode, libraryId) => saveAssembly(a, catCode, libraryId)}
        />
      )}
      {showQueue && <TakeoffQueueModal onClose={() => setShowQueue(false)} />}
    </div>
  );
}
