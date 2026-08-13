import React, { useRef, useState } from 'react';
import { Move, PanelBottom, X } from 'lucide-react';

/**
 * A panel lifted out of the layout.
 *
 * Docked or floating, every major workspace panel is the *same component with the
 * same state* — floating only changes where it is drawn. That is the whole reason
 * this wrapper exists rather than each panel growing its own float mode: a second
 * implementation of a panel is a second thing to keep in step.
 *
 * **Closing docks it.** There is no "gone" state: a workspace panel the estimator
 * cannot get back is a workspace panel they have lost, so the × returns it to its
 * default docked position exactly as the dock button does. Multi-monitor pop-out is
 * deliberately not here — an in-browser float is not a second monitor and should
 * not pretend to be one.
 */
export type DockState = 'docked' | 'floating';

export interface FloatRect { x: number; y: number; w: number; h: number }

export function FloatingFrame({
  title, onDock, rect, onRectChange, minW = 320, minH = 200, children, accent,
}: {
  title: string;
  /** Dock and close both land here — see the note above. */
  onDock: () => void;
  rect: FloatRect;
  onRectChange: (r: FloatRect) => void;
  minW?: number;
  minH?: number;
  children: React.ReactNode;
  accent?: string;
}) {
  const dragRef = useRef<{ mx: number; my: number; x: number; y: number } | null>(null);
  const sizeRef = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);

  function startDrag(e: React.MouseEvent) {
    // Ignore drags that begin on the title bar's own buttons.
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { mx: e.clientX, my: e.clientY, x: rect.x, y: rect.y };
    const move = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      onRectChange({
        ...rect,
        /* Clamped so a panel can never be dragged somewhere it cannot be dragged
           back from — the title bar stays reachable on every edge. */
        x: Math.max(-rect.w + 160, Math.min(window.innerWidth - 120, d.x + ev.clientX - d.mx)),
        y: Math.max(4, Math.min(window.innerHeight - 60, d.y + ev.clientY - d.my)),
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

  function startResize(e: React.MouseEvent) {
    e.stopPropagation();
    sizeRef.current = { mx: e.clientX, my: e.clientY, w: rect.w, h: rect.h };
    const move = (ev: MouseEvent) => {
      const d = sizeRef.current;
      if (!d) return;
      onRectChange({
        ...rect,
        w: Math.max(minW, d.w + ev.clientX - d.mx),
        h: Math.max(minH, d.h + ev.clientY - d.my),
      });
    };
    const up = () => {
      sizeRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  return (
    <div
      style={{
        position: 'fixed', left: rect.x, top: rect.y, width: rect.w, height: rect.h,
        zIndex: 70, background: 'white', border: '1px solid #D1D5DB', borderRadius: 10,
        boxShadow: '0 18px 50px rgba(17,24,39,0.24)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{
          height: 28, flexShrink: 0, cursor: 'move', display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 8px 0 10px', borderBottom: '1px solid #E5E7EB',
          background: accent ?? '#F3F4F6',
        }}
      >
        <Move size={11} color="#9CA3AF" />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6B7280', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title} — floating
        </span>
        <button
          onClick={onDock}
          title="Dock back to its normal position"
          aria-label={`Dock ${title}`}
          style={{ height: 20, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#374151' }}
        >
          <PanelBottom size={10} /> Dock
        </button>
        <button
          onClick={onDock}
          title="Close — returns the panel to its docked position"
          aria-label={`Close ${title}`}
          style={{ width: 20, height: 20, border: 'none', borderRadius: 5, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={11} color="#6B7280" />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>

      <div
        onMouseDown={startResize}
        title="Resize"
        style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, #D1D5DB 50%)' }}
      />
    </div>
  );
}

/**
 * The small control that sends a docked panel out to float.
 *
 * Deliberately quiet: docked is the normal state and this is a power-user escape,
 * so it reads as a handle rather than a call to action.
 */
export function UndockButton({ onUndock, label }: { onUndock: () => void; label: string }) {
  return (
    <button
      onClick={onUndock}
      title={`Undock ${label} — float it as a movable, resizable panel`}
      aria-label={`Undock ${label}`}
      style={{
        width: 20, height: 20, border: 'none', background: 'transparent', borderRadius: 4,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <Move size={11} color="#9CA3AF" />
    </button>
  );
}

/**
 * The rail a collapsed sidebar leaves behind.
 *
 * A zero-width panel with a 20px chevron hanging off it was the previous reopen
 * affordance, and it was easy to miss entirely. This keeps a labelled strip on
 * screen so the panel is always visibly *there and closed*, rather than gone.
 */
export function CollapsedRail({ label, side, onExpand, icon }: {
  label: string;
  side: 'left' | 'right';
  onExpand: () => void;
  icon: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onExpand}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Show ${label}`}
      aria-label={`Show ${label}`}
      style={{
        width: 30, minWidth: 30, flexShrink: 0, height: '100%',
        border: 'none',
        [side === 'left' ? 'borderRight' : 'borderLeft']: '1px solid #E5E7EB',
        background: hover ? '#EFF6FF' : '#FAFBFC',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, padding: '10px 0', color: hover ? '#1D4ED8' : '#9CA3AF',
      } as React.CSSProperties}
    >
      {icon}
      <span
        style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap',
          writingMode: 'vertical-rl',
          transform: side === 'left' ? 'none' : 'rotate(180deg)',
        }}
      >
        {label}
      </span>
    </button>
  );
}
