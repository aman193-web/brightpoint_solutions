import React from 'react';
import { TakeoffSymbol, SYMBOL_SHAPES, SYMBOL_COLORS } from './libraryBuild';

/*
 * The takeoff symbol control, shared.
 *
 * Extracted from Browse so Build Mode can offer the same picker over the same
 * store — one implementation, so the mark an estimator sets while building is
 * the mark Browse and the plan show afterwards.
 */

export function SymbolMark({ symbol, size = 16 }: { symbol: TakeoffSymbol; size?: number }) {
  const c = symbol.color;
  const half = size / 2;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, display: 'block' }} aria-hidden>
      {symbol.shape === 'circle'   && <circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="2.5" />}
      {symbol.shape === 'square'   && <rect x="3.5" y="3.5" width="17" height="17" fill="none" stroke={c} strokeWidth="2.5" />}
      {symbol.shape === 'triangle' && <path d="M12 3 L21 20 L3 20 Z" fill="none" stroke={c} strokeWidth="2.5" strokeLinejoin="round" />}
      {symbol.shape === 'diamond'  && <path d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z" fill="none" stroke={c} strokeWidth="2.5" strokeLinejoin="round" />}
      {symbol.shape === 'hexagon'  && <path d="M7 3.5 L17 3.5 L22 12 L17 20.5 L7 20.5 L2 12 Z" fill="none" stroke={c} strokeWidth="2.5" strokeLinejoin="round" />}
      {symbol.shape === 'letter'   && (
        <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="700" fill={c} fontFamily="IBM Plex Mono, monospace">
          {(symbol.letter ?? 'A').slice(0, 2)}
        </text>
      )}
    </svg>
  );
}

/** Shape and colour picker, opened from the assembly panel and the takeoff queue. */
export function SymbolPicker({ symbol, onChange, onClose }: {
  symbol: TakeoffSymbol; onChange: (s: TakeoffSymbol) => void; onClose: () => void;
}) {
  return (
    <div
      style={{ position: 'absolute', top: '100%', right: 0, marginTop: 5, zIndex: 60, width: 218, background: 'white', border: '1px solid #E5E7EB', borderRadius: 9, boxShadow: '0 8px 24px rgba(17,24,39,0.14)', padding: 10 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Shape</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {SYMBOL_SHAPES.map((sh) => (
          <button
            key={sh.id}
            onClick={() => onChange({ ...symbol, shape: sh.id })}
            title={sh.label}
            style={{
              width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${symbol.shape === sh.id ? '#2563EB' : '#E5E7EB'}`,
              background: symbol.shape === sh.id ? '#EFF6FF' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SymbolMark symbol={{ ...symbol, shape: sh.id }} size={17} />
          </button>
        ))}
      </div>

      {symbol.shape === 'letter' && (
        <input
          value={symbol.letter ?? ''}
          maxLength={2}
          onChange={(e) => onChange({ ...symbol, letter: e.target.value.toUpperCase() })}
          aria-label="Symbol letter"
          style={{ width: '100%', height: 28, marginTop: 7, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
        />
      )}

      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '10px 0 6px' }}>Colour</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {SYMBOL_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange({ ...symbol, color: c })}
            aria-label={`Colour ${c}`}
            style={{
              width: 24, height: 24, borderRadius: 5, background: c, cursor: 'pointer',
              border: symbol.color === c ? '2px solid #111827' : '1px solid rgba(0,0,0,0.1)',
            }}
          />
        ))}
      </div>

      <button
        onClick={onClose}
        style={{ width: '100%', height: 27, marginTop: 10, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer' }}
      >
        Done
      </button>
    </div>
  );
}
