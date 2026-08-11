import React, { useMemo, useState } from 'react';
import { Search, X, Plus, ChevronDown, GripVertical, RefreshCw } from 'lucide-react';
import { Part, MASTER_PARTS, CATEGORIES, PART_DRAG_TYPE, dragState } from './libraryData';
import { ContextId, partAllowed, partInAssemblyCategory } from './libraryFilters';

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
export function PartsLibraryPanel({ contexts, onAdd, onReplace, canReplace }: {
  /** Active building conditions — the rail respects them like everything else. */
  contexts: ContextId[];
  /** Click-to-add, for when dragging across three columns is the slower path. */
  onAdd: (part: Part) => void;
  /** Swap the selected bill-of-materials row for this part. */
  onReplace?: (part: Part) => void;
  /** Whether a row is selected — the control is shown either way, so that its
   *  absence is never mistaken for the feature not existing. */
  canReplace?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [cat, setCat] = useState<string>('');
  const [respectFilters, setRespectFilters] = useState(true);

  const pool = useMemo(
    () => (respectFilters ? MASTER_PARTS.filter((p) => partAllowed(p, contexts)) : MASTER_PARTS),
    [contexts, respectFilters],
  );
  const hidden = MASTER_PARTS.length - pool.length;

  const parts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool.filter((p) => {
      // `cat` is an assembly category code (BPC-xx), not a part category.
      if (cat && !partInAssemblyCategory(p, cat)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q)
        || p.code.toLowerCase().includes(q)
        || p.mfr.toLowerCase().includes(q);
    });
  }, [pool, cat, search]);


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
        {parts.map((p) => (
          <div
            key={p.id}
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
            title="Drag onto the bill of materials, or use the buttons to add or replace"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px 6px 4px',
              borderBottom: '1px solid #F9FAFB', cursor: 'grab',
              opacity: dragging === p.id ? 0.45 : 1,
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
                onClick={() => onReplace(p)}
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
              onClick={() => onAdd(p)}
              aria-label={`Add ${p.name}`}
              title="Add to the bill of materials"
              style={{ width: 20, height: 20, border: 'none', background: '#EFF6FF', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Plus size={10} color="#1D4ED8" />
            </button>
          </div>
        ))}
      </div>

      <div style={{ padding: '7px 12px', borderTop: '1px solid #E5E7EB', fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>
        Drag a row onto the bill of materials, or use + to add and ⟳ to replace.
      </div>
    </div>
  );
}
