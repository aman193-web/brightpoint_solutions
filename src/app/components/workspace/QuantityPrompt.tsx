import React, { useEffect, useRef, useState } from 'react';

/**
 * Ask how many, before adding.
 *
 * Adding an assembly by hand used to mean "one", and an estimator who needed
 * fifty pressed the button fifty times or added one and went hunting for the
 * quantity cell. The prompt costs a keystroke in the common case — it opens with
 * 1 selected, so Enter is the whole interaction — and saves forty-nine in the
 * case that actually hurts.
 *
 * Deliberately not a modal dialog with a backdrop: it is one field and two
 * buttons, and darkening the screen for it would make a routine act feel like a
 * decision.
 */
export interface QuantityPromptTarget {
  name: string;
  code?: string;
  /** 'linear' asks for a length and labels the unit accordingly. */
  measurementType?: 'count' | 'linear';
  unit?: string;
}

export function QuantityPrompt({ target, onCancel, onConfirm }: {
  target: QuantityPromptTarget;
  onCancel: () => void;
  onConfirm: (qty: number) => void;
}) {
  const [value, setValue] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);
  const linear = target.measurementType === 'linear';
  const unit = target.unit ?? (linear ? 'LF' : 'EA');

  /* Focused and selected on open, so typing a number replaces the 1 without a
     click and Enter accepts it. */
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const n = parseFloat(value);
    // A blank or zero quantity is not an add; the button says what it will do.
    if (!Number.isFinite(n) || n <= 0) return;
    onConfirm(n);
  };

  return (
    <div
      role="dialog"
      aria-label={`Quantity for ${target.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(17,24,39,0.18)',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: 320, background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
          boxShadow: '0 20px 50px rgba(17,24,39,0.22)', padding: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Enter quantity</div>
        <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {target.name}
          {target.code && <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#9CA3AF' }}> · {target.code}</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input
            ref={inputRef}
            type="number"
            min={linear ? 0.1 : 1}
            step={linear ? 1 : 1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={linear ? 'Length' : 'Quantity'}
            style={{
              flex: 1, height: 38, padding: '0 10px', border: '1px solid #BFDBFE', borderRadius: 8,
              fontSize: 16, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right',
              outline: 'none', color: '#111827',
            }}
          />
          <span style={{ fontSize: 12, color: '#6B7280', width: 26 }}>{unit}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, height: 34, border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={commit}
            style={{ flex: 2, height: 34, border: 'none', borderRadius: 8, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer' }}
          >
            Add to Takeoff
          </button>
        </div>

        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
          Press Enter to add {value || '1'} · Esc to cancel
        </div>
      </div>
    </div>
  );
}
