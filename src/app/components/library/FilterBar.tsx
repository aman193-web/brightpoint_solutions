import React, { useState } from 'react';
import { SlidersHorizontal, X, Check, Link2 } from 'lucide-react';
import {
  ContextId, ContextOption, CONTEXT_OPTIONS, contextLabel, constraintNote,
} from './libraryFilters';

/**
 * The building-context filter, shared by Browse and Build.
 *
 * One compact control plus removable chips for what is actually on — never a
 * wall of every option, which is what a permanent chip row becomes once the
 * vocabulary grows past a handful.
 *
 * Filters inherited from Project Setup are marked and can be switched off here
 * without leaving the workspace: the project states the norm, the estimator
 * states the exception.
 */

const CHIP: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 4px 0 9px',
  border: '1px solid #BFDBFE', borderRadius: 999, background: '#EFF6FF',
  fontSize: 11, fontWeight: 600, color: '#1D4ED8', whiteSpace: 'nowrap', flexShrink: 0,
};

export function FilterBar({ active, onChange, inherited, compact, showNote = !compact, scrollChips }: {
  active: ContextId[];
  onChange: (next: ContextId[]) => void;
  /** Contexts that came from Project Setup, shown with a link marker. */
  inherited: ContextId[];
  /** Chips wrap onto a second line instead of staying on the toolbar row. */
  compact?: boolean;
  /**
   * The constraint note ("non-metallic cable is not offered"). Off wherever the
   * step or field it refers to already states it — saying it twice on one screen
   * reads as two different rules.
   */
  showNote?: boolean;
  /**
   * Scroll the chips under a fade instead of wrapping, for a toolbar that has
   * to stay one row deep. The scroll container is the chip strip only — putting
   * it around the whole bar clips the Filters popover, which is an absolutely
   * positioned child and therefore invisible the moment an ancestor scrolls.
   */
  scrollChips?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: ContextId) => {
    onChange(active.includes(id) ? active.filter((c) => c !== id) : [...active, id]);
  };

  const groups = ['Structure', 'Ceiling', 'Condition'] as ContextOption['group'][];
  const note = constraintNote(active);
  const isInherited = (id: ContextId) => inherited.includes(id);
  const matchesProject = active.length === inherited.length
    && inherited.every((c) => active.includes(c));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: compact ? 'wrap' : 'nowrap', minWidth: 0, flex: scrollChips ? 1 : undefined }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setOpen((v) => !v)}
          title="Filter by building conditions"
          style={{
            height: 34, padding: '0 11px', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap',
            border: `1px solid ${active.length ? '#BFDBFE' : '#E5E7EB'}`,
            background: active.length ? '#EFF6FF' : 'white',
            color: active.length ? '#1D4ED8' : '#374151',
            fontWeight: active.length ? 600 : 400,
          }}
        >
          <SlidersHorizontal size={13} />
          Filters
          {active.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#2563EB', borderRadius: 999, padding: '1px 6px' }}>
              {active.length}
            </span>
          )}
        </button>

        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{
              position: 'absolute', left: 0, top: 'calc(100% + 5px)', zIndex: 41, width: 274,
              background: 'white', border: '1px solid #E5E7EB', borderRadius: 9,
              boxShadow: '0 8px 24px rgba(17,24,39,0.14)', overflow: 'hidden',
            }}>
              {groups.map((g) => (
                <div key={g}>
                  <div style={{ padding: '6px 12px', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                    {g}
                  </div>
                  {CONTEXT_OPTIONS.filter((o) => o.group === g).map((o) => {
                    const on = active.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => toggle(o.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                          background: on ? '#F8FBFF' : 'white', borderBottom: '1px solid #F9FAFB',
                        }}
                      >
                        <span style={{
                          width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                          border: `1px solid ${on ? '#2563EB' : '#D1D5DB'}`,
                          background: on ? '#2563EB' : 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {on && <Check size={10} color="white" />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 12, color: '#111827', fontWeight: on ? 600 : 400 }}>{o.label}</span>
                            {isInherited(o.id) && <Link2 size={9} color="#9CA3AF" />}
                          </span>
                          <span style={{ display: 'block', fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{o.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              <div style={{ display: 'flex', gap: 6, padding: 9, borderTop: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                <button
                  onClick={() => onChange(inherited)}
                  disabled={matchesProject}
                  title="Put the project's own conditions back"
                  style={{
                    flex: 1, height: 27, borderRadius: 6, fontSize: 11,
                    border: '1px solid #E5E7EB', background: 'white',
                    color: matchesProject ? '#D1D5DB' : '#374151',
                    cursor: matchesProject ? 'default' : 'pointer',
                  }}
                >
                  Reset to project
                </button>
                <button
                  onClick={() => onChange([])}
                  disabled={active.length === 0}
                  style={{
                    flex: 1, height: 27, borderRadius: 6, fontSize: 11,
                    border: '1px solid #E5E7EB', background: 'white',
                    color: active.length === 0 ? '#D1D5DB' : '#374151',
                    cursor: active.length === 0 ? 'default' : 'pointer',
                  }}
                >
                  Clear all
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Active filters, each removable where it is read. */}
      <div
        className={scrollChips ? 'bp-filter-chips' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, minWidth: 0,
          flexWrap: compact ? 'wrap' : 'nowrap',
          ...(scrollChips
            ? { flex: 1, overflowX: 'auto', overflowY: 'hidden' } as const
            : { overflow: compact ? 'visible' : 'hidden' } as const),
        }}
      >
        {active.map((id) => (
          <span key={id} style={CHIP} title={isInherited(id) ? 'Inherited from Project Setup' : 'Set for this session'}>
            {isInherited(id) && <Link2 size={9} color="#60A5FA" />}
            {contextLabel(id)}
            <button
              onClick={() => toggle(id)}
              aria-label={`Remove ${contextLabel(id)} filter`}
              style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999 }}
            >
              <X size={10} color="#1D4ED8" />
            </button>
          </span>
        ))}
      </div>

      {note && showNote && (
        <span style={{ fontSize: 10, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {note}
        </span>
      )}
    </div>
  );
}
