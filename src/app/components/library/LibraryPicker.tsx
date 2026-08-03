import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Lock, Search } from 'lucide-react';
import { Library, LibraryType, LIB_TYPE_CFG } from './libraryData';

/**
 * Library / project switcher.
 *
 * The active library used to be a static chip, which hid the fact that the
 * whole workspace is scoped to one job. It is now the control that changes that
 * scope: job libraries are listed by project, with the shared system, company
 * and customer libraries grouped separately.
 */

const GROUP_ORDER: LibraryType[] = ['job', 'customer', 'company', 'system'];
const GROUP_LABEL: Record<LibraryType, string> = {
  job: 'Project libraries',
  customer: 'Customer libraries',
  company: 'Company libraries',
  system: 'System libraries',
};

export function LibraryPicker({ libraries, activeId, onChange }: {
  libraries: Library[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);

  const active = libraries.find((l) => l.id === activeId);
  const cfg = active ? LIB_TYPE_CFG[active.type] : LIB_TYPE_CFG.job;

  // Close on outside click / Escape, so the menu never strands the toolbar.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const needle = q.trim().toLowerCase();
  const matches = needle
    ? libraries.filter((l) =>
      l.name.toLowerCase().includes(needle) || (l.project ?? '').toLowerCase().includes(needle))
    : libraries;

  const groups = GROUP_ORDER
    .map((type) => [type, matches.filter((l) => l.type === type)] as const)
    .filter(([, list]) => list.length > 0);

  return (
    <div ref={wrap} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => { setOpen((v) => !v); setQ(''); }}
        title="Switch library or project"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          height: 30, padding: '0 8px 0 10px', borderRadius: 6,
          border: `1px solid ${open ? cfg.color : 'transparent'}`,
          background: cfg.bg, color: cfg.color,
          fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {active?.readonly && <Lock size={9} />}
        {active?.name ?? 'Select library'}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
            width: 320, maxHeight: 420, overflowY: 'auto',
            background: 'white', border: '1px solid #E5E7EB', borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: 'white' }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} color="#9CA3AF" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects and libraries…"
                style={{ width: '100%', height: 28, paddingLeft: 24, paddingRight: 8, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {groups.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
              No library matches “{q}”.
            </div>
          )}

          {groups.map(([type, list]) => (
            <div key={type}>
              <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                {GROUP_LABEL[type]}
              </div>
              {list.map((l) => {
                const isActive = l.id === activeId;
                const lc = LIB_TYPE_CFG[l.type];
                return (
                  <button
                    key={l.id}
                    onClick={() => { onChange(l.id); setOpen(false); }}
                    style={{
                      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 12px', border: 'none', borderBottom: '1px solid #F9FAFB',
                      background: isActive ? '#EFF6FF' : 'white', cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: 14, flexShrink: 0, marginTop: 2 }}>
                      {isActive && <Check size={12} color="#2563EB" />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.name}
                        </span>
                        {l.readonly && <Lock size={9} color="#9CA3AF" />}
                      </span>
                      {l.project && (
                        <span style={{ display: 'block', fontSize: 10, color: '#6B7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.project}
                        </span>
                      )}
                      <span style={{ display: 'block', fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                        {l.count} assemblies · updated {l.updated}
                      </span>
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: lc.color, background: lc.bg, padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginTop: 1 }}>
                      {lc.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
