import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
import { TakeoffRecord, effectiveQuantity, effectiveLength } from '../../lib/takeoffRecords';

/**
 * Assembly List — what this takeoff is actually made of.
 *
 * Not the library. This is the far shorter list of assemblies the estimator has
 * *used on this job*, with the running quantity beside each, which is the
 * question they ask most often while counting: "how many of these have I got so
 * far?" Reading that off the audit trail meant grouping the Takeoff List by
 * assembly and adding up manual and digital rows by eye.
 *
 * Quantities come from the same records the Takeoff List shows, so the two can
 * never disagree, and they move as the estimator counts.
 */
export function AssemblyListPanel({ records, onSelectAssembly }: {
  records: TakeoffRecord[];
  /** Selecting a row focuses that assembly's records in the Takeoff List. */
  onSelectAssembly?: (name: string) => void;
}) {
  const [search, setSearch] = React.useState('');

  /**
   * One row per assembly, counts and lengths kept apart.
   *
   * A fixture's 24 and a conduit run's 840 LF are not addable, so they are shown
   * as what they are rather than summed into a meaningless total. Manual and
   * digital records roll into the same row — the assembly is the same assembly
   * however it was taken off.
   */
  const rows = useMemo(() => {
    const byAssembly = new Map<string, {
      name: string; code: string; count: number; linear: number;
      manual: number; digital: number; unit: string;
    }>();
    for (const r of records) {
      const key = r.assemblyId ?? r.partId ?? r.name;
      const at = byAssembly.get(key) ?? {
        name: r.name, code: r.code, count: 0, linear: 0, manual: 0, digital: 0, unit: r.unit,
      };
      if (r.measurementType === 'linear') at.linear += effectiveLength(r) ?? 0;
      else at.count += effectiveQuantity(r);
      if (r.sourceType === 'manual') at.manual += 1; else at.digital += 1;
      byAssembly.set(key, at);
    }
    const q = search.trim().toLowerCase();
    return [...byAssembly.values()]
      .filter((r) => !q || `${r.name} ${r.code}`.toLowerCase().includes(q))
      .sort((a, b) => (b.count + b.linear) - (a.count + a.linear));
  }, [records, search]);

  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  const totalLinear = rows.reduce((s, r) => s + r.linear, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'white' }}>
      {/*
        No title bar. This is a tab in the inspector, and the tab is the title —
        repeating it inside, with a close button that duplicates the tab strip,
        cost a row of height the list itself needs.
      */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #F3F4F6', flexShrink: 0, position: 'relative' }}>
        <Search size={11} color="#9CA3AF" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assemblies in use…"
          style={{ width: '100%', height: 28, paddingLeft: 24, paddingRight: 8, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {rows.length === 0 && (
          <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 11.5, color: '#9CA3AF', lineHeight: '17px' }}>
            {records.length === 0
              ? 'Nothing taken off yet. Count on a drawing or add an assembly in Manual Takeoff.'
              : 'No assembly matches that search.'}
          </div>
        )}
        {rows.map((r) => (
          <button
            key={r.name + r.code}
            onClick={() => onSelectAssembly?.(r.name)}
            title={`${r.manual} manual · ${r.digital} digital record${r.manual + r.digital === 1 ? '' : 's'}`}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              border: 'none', borderBottom: '1px solid #F9FAFB', background: 'white',
              cursor: onSelectAssembly ? 'pointer' : 'default', textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <span style={{ display: 'block', fontSize: 9.5, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.code}
              </span>
            </span>
            {/* Counts and lengths side by side, never added together. */}
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
              {r.count > 0 && (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {r.count}
                </span>
              )}
              {r.linear > 0 && (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#B45309', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {Math.round(r.linear * 10) / 10} <span style={{ fontSize: 9, fontWeight: 500 }}>LF</span>
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderTop: '1px solid #E5E7EB', background: '#FAFBFC', flexShrink: 0, fontSize: 10.5, color: '#6B7280' }}>
        <span>{rows.length} in use</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{totalCount} counted</span>
        {totalLinear > 0 && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{Math.round(totalLinear * 10) / 10} LF measured</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ color: '#9CA3AF' }}>Live from the Takeoff List</span>
      </div>
    </div>
  );
}
