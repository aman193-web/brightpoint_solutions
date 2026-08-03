import React, { useState, useMemo } from 'react';
import {
  Search, Sparkles, Star, X, Package, ChevronDown, Lock, AlertTriangle, Check,
} from 'lucide-react';

// ─── Types (local subset matching LibraryView) ────────────────────────────────

type AsmDiscipline = 'lighting' | 'power' | 'fire-alarm' | 'data' | 'safety';
type AsmSource = 'system' | 'company' | 'project';

interface PanelAssembly {
  id: string;
  name: string;
  category: string;
  discipline: AsmDiscipline;
  description: string;
  source: AsmSource;
  labourHours: number;
  materialCost: number;
  isFavorite: boolean;
  isLocked: boolean;
  missingPrice: boolean;
  recentlyUpdated: boolean;
  incompatible?: boolean;
  ceilingType?: string;
  cableType?: string;
  voltage?: string;
}

export interface AssemblyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAssembly: (name: string, id: string) => void;
}

// ─── Same assembly data (compact subset) ─────────────────────────────────────

const PANEL_ASSEMBLIES: PanelAssembly[] = [
  { id: 'asm-001', name: '2×4 LED Troffer 40W — ACT Ceiling, MC', category: 'Lighting Fixtures', discipline: 'lighting', description: 'Suspended ACT ceiling troffer with MC cable homerun', source: 'system', labourHours: 0.8, materialCost: 69.60, isFavorite: true, isLocked: true, missingPrice: false, recentlyUpdated: false, ceilingType: 'ACT', cableType: 'MC', voltage: '120V' },
  { id: 'asm-010', name: '2×4 LED Troffer — Existing ACT (Retrofit)', category: 'Lighting Fixtures', discipline: 'lighting', description: 'LED troffer replacement in existing ACT ceiling, reusing existing wiring', source: 'company', labourHours: 0.4, materialCost: 50.50, isFavorite: true, isLocked: false, missingPrice: false, recentlyUpdated: true, ceilingType: 'ACT', voltage: '120V' },
  { id: 'asm-007', name: '4" Recessed Downlight LED — ACT, MC', category: 'Lighting Fixtures', discipline: 'lighting', description: 'Recessed LED downlight in suspended ACT ceiling, IC-rated', source: 'system', labourHours: 0.7, materialCost: 70.30, isFavorite: false, isLocked: true, missingPrice: false, recentlyUpdated: false, ceilingType: 'ACT', cableType: 'MC', voltage: '120V' },
  { id: 'asm-008', name: '4" Recessed Downlight — Drywall, NM-B', category: 'Lighting Fixtures', discipline: 'lighting', description: 'Recessed LED in drywall ceiling, IC-rated housing', source: 'system', labourHours: 0.6, materialCost: 57.70, isFavorite: false, isLocked: true, missingPrice: false, recentlyUpdated: false, ceilingType: 'Drywall', cableType: 'NM-B', voltage: '120V' },
  { id: 'asm-003', name: 'Emergency Exit Combo — Ceiling Mount', category: 'Safety & Emergency', discipline: 'safety', description: 'Combined emergency light and exit sign, 90-min battery backup', source: 'system', labourHours: 0.9, materialCost: 79.00, isFavorite: true, isLocked: true, missingPrice: false, recentlyUpdated: false, voltage: '120V' },
  { id: 'asm-009', name: 'LED Strip Light — Warehouse Open Ceiling', category: 'Lighting Fixtures', discipline: 'lighting', description: 'High-bay LED strip for open warehouse ceilings', source: 'system', labourHours: 1.1, materialCost: 140.00, isFavorite: false, isLocked: true, missingPrice: false, recentlyUpdated: false, ceilingType: 'Open', voltage: '120V' },
  { id: 'asm-002', name: 'Duplex Receptacle 20A — New Construction', category: 'Wiring Devices', discipline: 'power', description: 'Standard duplex receptacle, NM-B cable feed', source: 'system', labourHours: 0.5, materialCost: 21.50, isFavorite: false, isLocked: true, missingPrice: false, recentlyUpdated: false, cableType: 'NM-B', voltage: '120V' },
  { id: 'asm-006', name: 'Hospital Grade Receptacle 20A', category: 'Wiring Devices', discipline: 'power', description: 'Hospital-grade receptacle, UL 498 listed', source: 'system', labourHours: 0.65, materialCost: 28.50, isFavorite: false, isLocked: true, missingPrice: false, recentlyUpdated: false, voltage: '120V', incompatible: true },
  { id: 'asm-004', name: '3/4" EMT Conduit — Surface Run', category: 'Conduit & Fittings', discipline: 'power', description: 'EMT conduit per linear metre including fittings', source: 'system', labourHours: 0.18, materialCost: 4.50, isFavorite: false, isLocked: true, missingPrice: false, recentlyUpdated: false },
  { id: 'asm-005', name: '20A Circuit Homerun — EMT to Panel', category: 'Circuits', discipline: 'power', description: 'Complete 20A 120V circuit homerun in EMT conduit', source: 'company', labourHours: 2.4, materialCost: 128.40, isFavorite: false, isLocked: false, missingPrice: false, recentlyUpdated: true, voltage: '120V' },
  { id: 'asm-012', name: 'Fire Alarm Pull Station — Surface', category: 'Fire Alarm', discipline: 'fire-alarm', description: 'Manual pull station with 2-wire FACP connection', source: 'system', labourHours: 1.2, materialCost: 85.00, isFavorite: false, isLocked: true, missingPrice: false, recentlyUpdated: false },
  { id: 'asm-013', name: 'CAT6 Data Outlet — New Construction', category: 'Data & Communications', discipline: 'data', description: 'CAT6 data outlet with patch panel, up to 100m run', source: 'company', labourHours: 0.9, materialCost: 43.50, isFavorite: false, isLocked: false, missingPrice: false, recentlyUpdated: false },
  { id: 'asm-015', name: 'Outdoor Weatherproof GFCI 20A', category: 'Wiring Devices', discipline: 'power', description: 'GFCI receptacle in weatherproof cover, outdoor/wet locations', source: 'system', labourHours: 1.2, materialCost: 62.80, isFavorite: false, isLocked: true, missingPrice: true, recentlyUpdated: false },
];

const DISC_CFG: Record<AsmDiscipline, { color: string; bg: string; label: string }> = {
  lighting:     { color: '#7C3AED', bg: '#F5F3FF', label: 'Lighting' },
  power:        { color: '#1D4ED8', bg: '#EFF6FF', label: 'Power' },
  'fire-alarm': { color: '#DC2626', bg: '#FEF2F2', label: 'Fire Alarm' },
  data:         { color: '#059669', bg: '#F0FDF4', label: 'Data' },
  safety:       { color: '#D97706', bg: '#FFFBEB', label: 'Safety' },
};

type QuickTab = 'hot-list' | 'favorites' | 'recent' | 'all';

const QUICK_TABS: { id: QuickTab; label: string }[] = [
  { id: 'hot-list', label: 'Hot list' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'all', label: 'All' },
];

const RECENT_IDS = ['asm-001', 'asm-010', 'asm-003', 'asm-004'];
const HOT_IDS    = ['asm-001', 'asm-003', 'asm-010', 'asm-004', 'asm-002'];

const SEMANTIC_HINTS: { triggers: string[]; chips: string[] }[] = [
  { triggers: ['recessed', 'downlight', 'pot light'], chips: ['Recessed fixture', 'ACT or drywall ceiling'] },
  { triggers: ['troffer', '2x4', '2×4'], chips: ['LED Troffer 2×4', 'MC or NM-B cable'] },
  { triggers: ['act', 'suspended', 'drop ceiling'], chips: ['ACT ceiling', 'MC cable preferred'] },
  { triggers: ['gfci', 'outdoor', 'weatherproof'], chips: ['GFCI protection', 'Wet location'] },
  { triggers: ['exit', 'emergency'], chips: ['Emergency fixture', '90-min battery backup'] },
  { triggers: ['conduit', 'emt', 'imc'], chips: ['Conduit run', 'Per metre pricing'] },
];

// ─── AssemblyPanel ────────────────────────────────────────────────────────────

export function AssemblyPanel({ isOpen, onClose, onSelectAssembly }: AssemblyPanelProps) {
  const [query, setQuery] = useState('');
  const [semanticMode, setSemanticMode] = useState(true);
  const [quickTab, setQuickTab] = useState<QuickTab>('hot-list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(PANEL_ASSEMBLIES.filter((a) => a.isFavorite).map((a) => a.id)));

  const semanticChips = useMemo(() => {
    if (!semanticMode || !query.trim()) return [];
    const q = query.toLowerCase();
    for (const hint of SEMANTIC_HINTS) {
      if (hint.triggers.some((t) => q.includes(t))) return hint.chips;
    }
    return [];
  }, [query, semanticMode]);

  const baseList = useMemo(() => {
    if (quickTab === 'hot-list') return PANEL_ASSEMBLIES.filter((a) => HOT_IDS.includes(a.id));
    if (quickTab === 'favorites') return PANEL_ASSEMBLIES.filter((a) => favorites.has(a.id));
    if (quickTab === 'recent') return PANEL_ASSEMBLIES.filter((a) => RECENT_IDS.includes(a.id));
    return PANEL_ASSEMBLIES;
  }, [quickTab, favorites]);

  const displayed = useMemo(() => {
    if (!query.trim()) return baseList;
    const q = query.toLowerCase();
    return PANEL_ASSEMBLIES.filter((a) =>
      a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [query, baseList]);

  function handleApply(a: PanelAssembly) {
    setAppliedId(a.id);
    onSelectAssembly(a.name, a.id);
    setTimeout(() => setAppliedId(null), 1400);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (transparent — panel is overlay, no dim) */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, zIndex: 15 }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 400,
          background: 'white', borderLeft: '1px solid #E5E7EB',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          zIndex: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={15} color="#2563EB" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>Assembly library</span>
          <button onClick={onClose} style={{ width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px 0', borderBottom: '1px solid #E5E7EB', paddingBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: semanticChips.length > 0 ? 8 : 0 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Search assemblies…'
                style={{ width: '100%', height: 32, paddingLeft: 28, paddingRight: 8, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={() => setSemanticMode((v) => !v)}
              style={{ height: 32, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 7, background: semanticMode ? '#F5F3FF' : 'white', color: semanticMode ? '#7C3AED' : '#6B7280', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Sparkles size={11} /> AI
            </button>
          </div>

          {/* AI interpretation */}
          {semanticChips.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#F5F3FF', borderRadius: 6, border: '1px solid #DDD6FE' }}>
              <Sparkles size={11} color="#7C3AED" />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {semanticChips.map((c) => (
                  <span key={c} style={{ fontSize: 10, color: '#6D28D9', backgroundColor: '#EDE9FE', padding: '1px 6px', borderRadius: 9999, fontWeight: 500 }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick tabs */}
        {!query.trim() && (
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', padding: '0 14px' }}>
            {QUICK_TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setQuickTab(id)}
                style={{
                  height: 36, padding: '0 10px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 12, fontWeight: quickTab === id ? 600 : 400,
                  color: quickTab === id ? '#2563EB' : '#6B7280',
                  borderBottom: quickTab === id ? '2px solid #2563EB' : '2px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Results count when searching */}
        {query.trim() && (
          <div style={{ padding: '6px 14px', fontSize: 11, color: '#6B7280', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
            {displayed.length} result{displayed.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Assembly list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {displayed.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 8 }}>
              <Package size={24} color="#D1D5DB" />
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                {quickTab === 'favorites' ? 'No favorites yet' : 'No assemblies found'}
              </div>
            </div>
          )}

          {displayed.map((a) => {
            const disc = DISC_CFG[a.discipline];
            const expanded = expandedId === a.id;
            const applied = appliedId === a.id;
            const isFav = favorites.has(a.id);

            const condParts: string[] = [];
            if (a.ceilingType) condParts.push(a.ceilingType + ' ceiling');
            if (a.cableType) condParts.push(a.cableType + ' cable');
            if (a.voltage) condParts.push(a.voltage);

            return (
              <div key={a.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                {/* Row */}
                <div
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer',
                    background: expanded ? '#F9FAFB' : 'white',
                    opacity: a.incompatible ? 0.65 : 1,
                  }}
                >
                  {/* Disc dot */}
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: disc.color, flexShrink: 0 }} />

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: disc.color, backgroundColor: disc.bg, padding: '1px 5px', borderRadius: 9999 }}>{disc.label}</span>
                      {a.isLocked && <Lock size={9} color="#D1D5DB" />}
                      {a.recentlyUpdated && <span style={{ fontSize: 10, color: '#1D4ED8', backgroundColor: '#EFF6FF', padding: '1px 5px', borderRadius: 9999 }}>Updated</span>}
                      {a.missingPrice && <span style={{ fontSize: 10, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 2 }}><AlertTriangle size={9} /> No price</span>}
                      {a.incompatible && <span style={{ fontSize: 10, color: '#D97706', display: 'flex', alignItems: 'center', gap: 2 }}><AlertTriangle size={9} /> Incompatible</span>}
                    </div>
                  </div>

                  {/* Cost + hrs */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 500, color: '#374151' }}>${a.materialCost.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{a.labourHours.toFixed(2)} hrs</div>
                  </div>

                  {/* Favorite + expand */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setFavorites((prev) => { const n = new Set(prev); isFav ? n.delete(a.id) : n.add(a.id); return n; }); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                  >
                    <Star size={12} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : '#D1D5DB'} />
                  </button>

                  <ChevronDown
                    size={12}
                    color="#9CA3AF"
                    style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
                  />
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div style={{ padding: '0 14px 12px 14px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8, lineHeight: '16px', paddingTop: 8 }}>{a.description}</div>

                    {condParts.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                        {condParts.map((c) => (
                          <span key={c} style={{ fontSize: 10, color: '#6B7280', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: 4, border: '1px solid #E5E7EB' }}>{c}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleApply(a)}
                        disabled={a.incompatible}
                        style={{
                          flex: 1, height: 30, border: 'none',
                          background: applied ? '#16A34A' : a.incompatible ? '#F3F4F6' : '#2563EB',
                          color: a.incompatible ? '#9CA3AF' : 'white',
                          borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: a.incompatible ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'background 0.2s',
                        }}
                      >
                        {applied ? <><Check size={11} /> Applied!</> : 'Apply to selection'}
                      </button>
                    </div>

                    {a.incompatible && (
                      <div style={{ marginTop: 6, fontSize: 10, color: '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={9} /> Hospital grade not applicable to this project
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9CA3AF', flex: 1 }}>
            {displayed.length} assembl{displayed.length !== 1 ? 'ies' : 'y'} shown
          </span>
          <button style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', fontWeight: 500 }}>
            Open full library →
          </button>
        </div>
      </div>
    </>
  );
}
