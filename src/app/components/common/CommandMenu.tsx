import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, X, FileText, FolderOpen, Package, LayoutDashboard,
  Users, Settings, BarChart2, Layers, ChevronRight, Clock,
  Sparkles, ArrowUp, ArrowDown, CornerDownLeft, Hash, Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultCategory = 'navigation' | 'projects' | 'estimates' | 'assemblies' | 'actions';

interface CommandResult {
  id: string;
  category: ResultCategory;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CFG: Record<ResultCategory, { label: string; color: string }> = {
  navigation: { label: 'Navigate',   color: '#6B7280' },
  projects:   { label: 'Projects',   color: '#1D4ED8' },
  estimates:  { label: 'Estimates',  color: '#16A34A' },
  assemblies: { label: 'Assemblies', color: '#7C3AED' },
  actions:    { label: 'Actions',    color: '#D97706' },
};

// ─── Static results ───────────────────────────────────────────────────────────

function buildResults(navigate: (page: string) => void): CommandResult[] {
  return [
    // Navigation
    { id: 'n-dashboard',  category: 'navigation', label: 'Dashboard',          icon: <LayoutDashboard size={14} />, shortcut: 'G D', onSelect: () => navigate('dashboard') },
    { id: 'n-projects',   category: 'navigation', label: 'Projects',            icon: <FolderOpen size={14} />,     shortcut: 'G P', onSelect: () => navigate('projects') },
    { id: 'n-estimates',  category: 'navigation', label: 'Bid builder',    icon: <FileText size={14} />,       shortcut: 'G E', onSelect: () => navigate('bid-builder') },
    { id: 'n-pricing',    category: 'navigation', label: 'Pricing workspace',   icon: <Hash size={14} />,           onSelect: () => navigate('pricing') },
    { id: 'n-proposal',   category: 'navigation', label: 'Proposal center',     icon: <Send size={14} />,           onSelect: () => navigate('proposal-center') },
    { id: 'n-libraries',  category: 'navigation', label: 'Libraries',           icon: <Layers size={14} />,         shortcut: 'G L', onSelect: () => navigate('libraries') },
    { id: 'n-reports',    category: 'navigation', label: 'Reports',             icon: <BarChart2 size={14} />,      shortcut: 'G R', onSelect: () => navigate('reports') },
    { id: 'n-team',       category: 'navigation', label: 'Team & Access',       icon: <Users size={14} />,          onSelect: () => navigate('team') },
    { id: 'n-settings',   category: 'navigation', label: 'Company Settings',    icon: <Settings size={14} />,       shortcut: 'G S', onSelect: () => navigate('settings') },
    // Projects
    { id: 'p-dt',   category: 'projects', label: 'Dollar Tree — Store #1842', sublabel: 'Active · Estimating',    icon: <FolderOpen size={14} color="#1D4ED8" />, onSelect: () => navigate('project-detail') },
    { id: 'p-sh',   category: 'projects', label: 'Shopify HQ Phase 2',        sublabel: 'Active · Takeoff',        icon: <FolderOpen size={14} color="#1D4ED8" />, onSelect: () => navigate('project-detail') },
    { id: 'p-rbc',  category: 'projects', label: 'RBC Westmount Branch',      sublabel: 'Bidding · Quote sent',    icon: <FolderOpen size={14} color="#1D4ED8" />, onSelect: () => navigate('project-detail') },
    { id: 'p-ikea', category: 'projects', label: 'IKEA Boucherville',         sublabel: 'RFQ review',              icon: <FolderOpen size={14} color="#1D4ED8" />, onSelect: () => navigate('project-detail') },
    // Estimates
    { id: 'e-117', category: 'estimates', label: 'BID-2026-0117 — Dollar Tree #1842', sublabel: 'Draft · $13,214', icon: <FileText size={14} color="#16A34A" />, onSelect: () => navigate('bid-builder') },
    { id: 'e-116', category: 'estimates', label: 'BID-2026-0116 — Shopify HQ',        sublabel: 'Review · $84,200', icon: <FileText size={14} color="#16A34A" />, onSelect: () => navigate('bid-builder') },
    { id: 'e-115', category: 'estimates', label: 'BID-2026-0115 — RBC Westmount',     sublabel: 'Approved · $52,300', icon: <FileText size={14} color="#16A34A" />, onSelect: () => navigate('bid-builder') },
    // Assemblies
    { id: 'a-1', category: 'assemblies', label: '2×4 LED Troffer 40W — ACT Ceiling, MC', sublabel: 'System · Lighting', icon: <Package size={14} color="#7C3AED" />, onSelect: () => navigate('libraries') },
    { id: 'a-2', category: 'assemblies', label: 'Duplex Receptacle 20A — New Construction', sublabel: 'System · Power', icon: <Package size={14} color="#7C3AED" />, onSelect: () => navigate('libraries') },
    { id: 'a-3', category: 'assemblies', label: 'Fire Alarm Pull Station — Surface Mount', sublabel: 'System · Fire Alarm', icon: <Package size={14} color="#7C3AED" />, onSelect: () => navigate('libraries') },
    { id: 'a-4', category: 'assemblies', label: '3/4" EMT Conduit — Surface Run', sublabel: 'System · Conduit', icon: <Package size={14} color="#7C3AED" />, onSelect: () => navigate('libraries') },
    // Actions
    { id: 'act-new-project',  category: 'actions', label: 'New project',          icon: <FolderOpen size={14} color="#D97706" />, shortcut: 'N P', onSelect: () => navigate('create-project') },
    { id: 'act-new-estimate', category: 'actions', label: 'New bid',          icon: <FileText size={14} color="#D97706" />,  shortcut: 'N E', onSelect: () => navigate('bid-builder') },
    { id: 'act-import',       category: 'actions', label: 'Import supplier CSV',   icon: <Hash size={14} color="#D97706" />,      onSelect: () => navigate('pricing') },
  ];
}

const RECENT_PAGES = [
  { label: 'Dollar Tree #1842 — Pricing workspace', page: 'pricing' },
  { label: 'BID-2026-0117 — Bid builder', page: 'bid-builder' },
  { label: 'Libraries — Assembly browser', page: 'libraries' },
];

// ─── CommandMenu ──────────────────────────────────────────────────────────────

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export function CommandMenu({ isOpen, onClose, onNavigate }: CommandMenuProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allResults = useMemo(() => buildResults((page) => {
    onNavigate(page);
    onClose();
  }), [onNavigate, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allResults.filter((r) =>
      r.label.toLowerCase().includes(q) ||
      (r.sublabel?.toLowerCase().includes(q) ?? false)
    );
  }, [query, allResults]);

  // Group filtered results
  const grouped = useMemo(() => {
    const map = new Map<ResultCategory, CommandResult[]>();
    for (const r of filtered) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return map;
  }, [filtered]);

  // Flat list for keyboard nav
  const flatList = filtered;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, (query ? flatList.length : RECENT_PAGES.length) - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!query && RECENT_PAGES[selectedIdx]) {
          onNavigate(RECENT_PAGES[selectedIdx].page);
          onClose();
        } else if (flatList[selectedIdx]) {
          flatList[selectedIdx].onSelect();
        }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, selectedIdx, flatList, query, onClose, onNavigate]);

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        style={{ width: 560, maxHeight: 480, background: 'white', borderRadius: 12, boxShadow: '0 32px 80px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <Search size={16} color="#9CA3AF" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, estimates, assemblies, or navigate…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#111827', background: 'transparent' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
              <X size={14} color="#9CA3AF" />
            </button>
          )}
          <kbd style={{ fontSize: 10, padding: '2px 5px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 4, color: '#6B7280', fontFamily: 'IBM Plex Mono, monospace' }}>Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
          {!query ? (
            // Recent
            <div>
              <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={10} /> Recent
              </div>
              {RECENT_PAGES.map((item, i) => (
                <button
                  key={item.page + i}
                  onClick={() => { onNavigate(item.page); onClose(); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '9px 16px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: selectedIdx === i ? '#EFF6FF' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={() => setSelectedIdx(i)}
                >
                  <Clock size={13} color="#9CA3AF" />
                  <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{item.label}</span>
                  <ChevronRight size={12} color="#D1D5DB" />
                </button>
              ))}

              {/* Quick nav hints */}
              <div style={{ padding: '8px 16px 4px', marginTop: 4, fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick navigate</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '4px 12px 8px' }}>
                {[
                  { label: 'Dashboard', shortcut: 'G D', page: 'dashboard' },
                  { label: 'Projects', shortcut: 'G P', page: 'projects' },
                  { label: 'Bid builder', shortcut: 'G E', page: 'bid-builder' },
                  { label: 'Libraries', shortcut: 'G L', page: 'libraries' },
                  { label: 'Reports', shortcut: 'G R', page: 'reports' },
                  { label: 'Settings', shortcut: 'G S', page: 'settings' },
                ].map(({ label, shortcut, page }) => (
                  <button key={page} onClick={() => { onNavigate(page); onClose(); }} style={{ textAlign: 'left', padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 6 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 12, color: '#374151' }}>{label}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#9CA3AF' }}>{shortcut}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <Search size={24} color="#E5E7EB" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}>No results for "{query}"</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Try a project name, estimate number, or assembly name</div>
            </div>
          ) : (
            // Grouped results
            (() => {
              let absIdx = 0;
              return Array.from(grouped.entries()).map(([cat, results]) => (
                <div key={cat}>
                  <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: CAT_CFG[cat].color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {CAT_CFG[cat].label}
                  </div>
                  {results.map((result) => {
                    const idx = absIdx++;
                    const isSelected = selectedIdx === idx;
                    return (
                      <button
                        key={result.id}
                        onClick={result.onSelect}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 16px', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: isSelected ? '#EFF6FF' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: isSelected ? '#DBEAFE' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {result.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.label}</div>
                          {result.sublabel && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{result.sublabel}</div>}
                        </div>
                        {result.shortcut && (
                          <kbd style={{ fontSize: 10, padding: '2px 5px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 4, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                            {result.shortcut}
                          </kbd>
                        )}
                        {isSelected && <ChevronRight size={12} color="#93C5FD" />}
                      </button>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12, background: '#FAFAFA' }}>
          {[
            { icon: <ArrowUp size={10} />, label: 'Up' },
            { icon: <ArrowDown size={10} />, label: 'Down' },
            { icon: <CornerDownLeft size={10} />, label: 'Select' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ display: 'flex', alignItems: 'center', padding: '2px 5px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 10, color: '#6B7280' }}>{icon}</kbd>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{label}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9CA3AF' }}>
            <Sparkles size={10} color="#7C3AED" />
            <span style={{ color: '#7C3AED', fontWeight: 500 }}>AI search</span>
            <span>available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
