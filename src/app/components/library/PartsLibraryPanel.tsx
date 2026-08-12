import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus, ChevronDown, GripVertical, RefreshCw } from 'lucide-react';
import {
  Part, MASTER_PARTS, CATEGORIES, PART_DRAG_TYPE, dragState, byRecentlyAdded,
} from './libraryData';
import { ContextId, partAllowed, partInAssemblyCategory } from './libraryFilters';

type RailSort = 'catalogue' | 'recent' | 'az' | 'za';

const RAIL_SORTS: { id: RailSort; label: string }[] = [
  { id: 'catalogue', label: 'Catalogue order' },
  { id: 'recent',    label: 'Recently added' },
  { id: 'az',        label: 'Name A–Z' },
  { id: 'za',        label: 'Name Z–A' },
];

/**
 * The parts library, as a rail.
 *
 * Build Mode narrows the estimator to the parts a configuration implies, but
 * "implies" is not "covers" — a job always has the one bracket the rules did
 * not predict. This is the escape hatch: the same catalogue, the same drag
 * protocol, dropped straight onto the Live BOM.
 *
 * Browse's own parts band is a three-column cascade because it has the width
 * for one. A rail does not, so the same data is presented as a filtered list —
 * the drag contract (`PART_DRAG_TYPE` + `dragState`) is identical, which is what
 * makes the drop target on the BOM work without knowing where the drag started.
 */
export function PartsLibraryPanel({
  contexts, onAdd, onReplace, canReplace, followCategory, selectedPart, onSelect,
}: {
  /** Active building conditions — the rail respects them like everything else. */
  contexts: ContextId[];
  /** Click-to-add, for when dragging across three columns is the slower path. */
  onAdd: (part: Part) => void;
  /** Swap the selected bill-of-materials row for this part. */
  onReplace?: (part: Part) => void;
  /** Whether a row is selected — the control is shown either way, so that its
   *  absence is never mistaken for the feature not existing. */
  canReplace?: boolean;
  /**
   * The assembly category the builder is on (BPC-xx). The rail follows it, so an
   * estimator who picks Fixtures upstream is not then asked to say Fixtures again
   * here. A suggestion, not a lock: changing the select below overrides it until
   * the builder's category moves again.
   */
  followCategory?: string;
  /**
   * The component selected in the bill of materials — highlighted and scrolled to.
   *
   * Carries both identifiers because a configured BOM row has a synthetic code
   * and a real part name, while a manually added row has both for real.
   */
  selectedPart?: { code: string; name: string } | null;
  /** A row was clicked. Lets the parent select the matching BOM row. */
  onSelect?: (part: Part) => void;
}) {
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [cat, setCat] = useState<string>(followCategory ?? '');
  const [respectFilters, setRespectFilters] = useState(true);
  const [sort, setSort] = useState<RailSort>('catalogue');

  /*
   * Follow the builder's category whenever it changes.
   *
   * Keyed on the incoming value alone, so a manual change to the select sticks:
   * this only fires again when the builder actually moves to another category.
   */
  useEffect(() => {
    if (followCategory !== undefined) setCat(followCategory);
  }, [followCategory]);

  const pool = useMemo(
    () => (respectFilters ? MASTER_PARTS.filter((p) => partAllowed(p, contexts)) : MASTER_PARTS),
    [contexts, respectFilters],
  );
  const hidden = MASTER_PARTS.length - pool.length;

  const parts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = pool.filter((p) => {
      // `cat` is an assembly category code (BPC-xx), not a part category.
      if (cat && !partInAssemblyCategory(p, cat)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q)
        || p.code.toLowerCase().includes(q)
        || p.mfr.toLowerCase().includes(q);
    });
    switch (sort) {
      case 'recent': return [...rows].sort(byRecentlyAdded);
      case 'az': return [...rows].sort((a, b) => a.name.localeCompare(b.name));
      case 'za': return [...rows].sort((a, b) => b.name.localeCompare(a.name));
      default: return rows;
    }
  }, [pool, cat, search, sort]);

  /*
   * Bring the BOM's selection into view.
   *
   * The rail is a 124-row list in a 258px column, so highlighting a row that is
   * eight screens down is the same as not highlighting anything. `nearest` keeps
   * an already-visible row where it is rather than jumping the list under the
   * estimator's cursor.
   */
  const selectedRef = useRef<HTMLDivElement | null>(null);
  const matchesSelection = (p: Part) => !!selectedPart
    && (p.code === selectedPart.code || p.name === selectedPart.name);
  useEffect(() => {
    if (selectedPart && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedPart?.code, selectedPart?.name]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'white' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Parts library
          </span>
          <span style={{ fontSize: 10, color: '#9CA3AF', flex: 1 }}>{parts.length}</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 7 }}>
          <Search size={12} color="#9CA3AF" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts…"
            style={{ width: '100%', height: 30, paddingLeft: 27, paddingRight: 24, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear part search" style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}>
              <X size={11} color="#9CA3AF" />
            </button>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Part category"
            style={{ width: '100%', height: 30, padding: '0 24px 0 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 11, background: 'white', outline: 'none', color: '#374151', appearance: 'none', boxSizing: 'border-box' }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
          <ChevronDown size={12} color="#9CA3AF" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        <div style={{ position: 'relative', marginTop: 7 }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as RailSort)}
            aria-label="Sort parts"
            style={{ width: '100%', height: 28, padding: '0 24px 0 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 11, background: 'white', outline: 'none', color: sort === 'catalogue' ? '#6B7280' : '#1D4ED8', appearance: 'none', boxSizing: 'border-box' }}
          >
            {RAIL_SORTS.map((s) => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
          </select>
          <ChevronDown size={12} color="#9CA3AF" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {hidden > 0 && (
          <button
            onClick={() => setRespectFilters((v) => !v)}
            title={respectFilters
              ? `${hidden} parts hidden by the active building conditions`
              : 'Showing every part, including those the conditions rule out'}
            style={{
              marginTop: 7, width: '100%', height: 24, borderRadius: 6, cursor: 'pointer', fontSize: 10,
              border: `1px solid ${respectFilters ? '#FDE68A' : '#E5E7EB'}`,
              background: respectFilters ? '#FFFBEB' : 'white',
              color: respectFilters ? '#92400E' : '#6B7280',
            }}
          >
            {respectFilters ? `${hidden} filtered out — show all` : 'Filters off — re-apply'}
          </button>
        )}
      </div>

      <div className="bp-lib-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {parts.length === 0 && (
          <div style={{ padding: 16, fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
            No parts match.
          </div>
        )}
        {parts.map((p) => {
          const isSelected = matchesSelection(p);
          return (
          <div
            key={p.id}
            ref={isSelected ? selectedRef : undefined}
            className="bp-part-row"
            /*
             * The same payload Browse writes, so the BOM's drop target does not
             * care which surface the drag started from.
             */
            draggable
            onDragStart={(e) => {
              dragState.part = p;
              setDragging(p.id);
              e.dataTransfer.effectAllowed = 'copy';
              e.dataTransfer.setData(PART_DRAG_TYPE, p.id);
              e.dataTransfer.setData('text/plain', p.name);
            }}
            onDragEnd={() => { dragState.part = null; setDragging(null); }}
            onClick={() => onSelect?.(p)}
            title="Drag onto the bill of materials, or use the buttons to add or replace"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px 6px 4px',
              borderBottom: '1px solid #F9FAFB', cursor: 'grab',
              opacity: dragging === p.id ? 0.45 : 1,
              /* Matches the BOM row's own selected treatment, so the two panels
                 read as one selection rather than two coincidences. */
              background: isSelected ? '#EFF6FF' : undefined,
              boxShadow: isSelected ? 'inset 2px 0 0 #2563EB' : undefined,
            }}
          >
            {/*
              A grip, not a decoration: nothing else on this row says the row
              itself is the thing you pick up, and estimators were using the +
              because the drag was invisible.
            */}
            <GripVertical size={13} color="#D1D5DB" style={{ flexShrink: 0 }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.code} · ${p.price.toFixed(2)}/{p.unit}
              </div>
            </div>
            {onReplace && (
              <button
                onClick={(e) => { e.stopPropagation(); onReplace(p); }}
                aria-label={`Replace the selected component with ${p.name}`}
                title={canReplace
                  ? 'Replace the selected bill-of-materials component'
                  : 'Select a component in the bill of materials first'}
                style={{ width: 20, height: 20, border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <RefreshCw size={10} color={canReplace ? '#6B7280' : '#D1D5DB'} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(p); }}
              aria-label={`Add ${p.name}`}
              title="Add to the bill of materials"
              style={{ width: 20, height: 20, border: 'none', background: '#EFF6FF', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Plus size={10} color="#1D4ED8" />
            </button>
          </div>
          );
        })}
      </div>

      <div style={{ padding: '7px 12px', borderTop: '1px solid #E5E7EB', fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>
        Drag a row onto the bill of materials, or use + to add and ⟳ to replace.
      </div>
    </div>
  );
}
