import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, X, Star, ChevronRight, ChevronDown, Plus, RefreshCw, Play, Save,
  Package, AlertTriangle, Undo2, Sparkles,
} from 'lucide-react';
import {
  CategoryCode, Assembly, Part, Library, BOMItem, AssemblyConfig,
  CATEGORIES, ASSEMBLY_SUBCATS, typesFor, ALL_ASSEMBLIES, categoryOf,
  PART_CATEGORIES, MASTER_PARTS, PART_DRAG_TYPE, dragState,
  STATUS_CFG,
  FIXTURE_TYPES, FIXTURE_MOUNTS, FIXTURE_WIRING, DIMMING_OPTIONS, EMERGENCY_OPTIONS,
  DEVICE_TYPES, DEVICE_GRADES, DEVICE_WIRING, DEVICE_BOXES, DEVICE_COVERS,
  contextsForCategory, deriveBom, configFromAssembly, isParametricRow, wasteAdjustedLF,
} from './libraryData';

/**
 * Workbench — the unified library workspace.
 *
 * There is no browse-vs-build switch and no assemblies-vs-parts switch. Three
 * co-equal columns are mounted at all times: the assemblies index, the bench
 * (the assembly you are working on), and the parts index. Selecting is
 * browsing; touching any control on the bench is building.
 *
 * Design notes, and the reasoning behind the awkward parts:
 *  - The spec bar sits directly above the components it rewrites, so cause is
 *    30px above effect. Change Mounting and you watch the mounting row swap.
 *  - A saved assembly loads "as saved". The first spec change regenerates its
 *    parametric rows and shows a Revert strip — an explicit, reversible data
 *    transformation, not a mode you have to choose up front.
 *  - Selecting a component jumps the parts index to that part's neighbourhood,
 *    which turns Replace into one click. That is the one cross-pane link worth
 *    its rent; a part-to-assemblies reverse lookup was considered and dropped.
 *  - Drafts are pinned at the top of the assemblies index, so the thing you are
 *    building is always a row you can see and click back to.
 *  - Below 1180px the three columns reflow to two rows rather than hiding a
 *    pane behind a control — a hidden pane would be the switch we just removed.
 */

// ─── Small shared pieces ──────────────────────────────────────────────────────

function PaneHeader({ title, count, action }: { title: string; count?: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
      borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      {count && <span style={{ fontSize: 10, color: '#9CA3AF' }}>{count}</span>}
      <div style={{ flex: 1 }} />
      {action}
    </div>
  );
}

function SpecField({ label, children, width }: { label: string; children: React.ReactNode; width?: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, width, flexShrink: 0 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {children}
    </label>
  );
}

const selStyle: React.CSSProperties = {
  height: 28, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 6,
  fontSize: 11, background: 'white', outline: 'none', color: '#374151', width: '100%',
};

function Sel({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selStyle}>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function Num({ value, onChange, suffix }: { value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...selStyle, width: 56, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}
      />
      {suffix && <span style={{ fontSize: 10, color: '#9CA3AF' }}>{suffix}</span>}
    </div>
  );
}

interface Draft {
  id: string;
  name: string;
  code: string;
  cfg: AssemblyConfig;
  cat: CategoryCode;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function WorkbenchLibraryView({ activeLib, modeSwitcher, viewSwitcher, libraryPicker }: {
  /** Browse | Build. Rendered first so it sits identically in every mode. */
  modeSwitcher?: React.ReactNode;
  activeLib: Library;
  viewSwitcher: React.ReactNode;
  libraryPicker?: React.ReactNode;
}) {
  // One search across both indexes — so you never pick a library first.
  const [search, setSearch] = useState('');

  // Assemblies index
  const [openCats, setOpenCats]   = useState<Set<string>>(new Set(['BPC-01']));
  const [openSubs, setOpenSubs]   = useState<Set<string>>(new Set(['BPC-01/Troffers']));
  const [asmFavs, setAsmFavs]     = useState<Set<string>>(new Set(['fx-201', 'fx-203']));
  const [drafts, setDrafts]       = useState<Draft[]>([]);
  const [subjectId, setSubjectId] = useState<string>('fx-201');

  // Bench
  const initial = ALL_ASSEMBLIES.find((a) => a.id === 'fx-201')!;
  const [cfg, setCfg]             = useState<AssemblyConfig>(() => configFromAssembly(initial));
  const [savedBom, setSavedBom]   = useState<BOMItem[]>(initial.bom);
  const [extras, setExtras]       = useState<BOMItem[]>([]);
  const [parametric, setParametric] = useState(false);
  const [dirty, setDirty]         = useState(false);
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [count, setCount]         = useState('1');
  const [benchName, setBenchName] = useState(initial.name);

  // Parts index
  const [openPartCats, setOpenPartCats] = useState<Set<string>>(new Set(['Hangers & Supports']));
  const [partFavs, setPartFavs]         = useState<Set<string>>(new Set(['pt-38', 'pt-4']));
  const [highlightPartId, setHighlightPartId] = useState<string | null>(null);

  const draft = drafts.find((d) => d.id === subjectId) ?? null;
  const savedAsm = ALL_ASSEMBLIES.find((a) => a.id === subjectId) ?? null;

  // The bench BOM: parametric core once the spec has been touched, otherwise
  // exactly what was saved — plus anything added by hand, in both cases.
  const bom: BOMItem[] = useMemo(
    () => [...(parametric ? deriveBom(cfg) : savedBom), ...extras],
    [parametric, cfg, savedBom, extras],
  );

  const q = search.trim().toLowerCase();

  const asmHits = useMemo(() => {
    if (!q) return null;
    return ALL_ASSEMBLIES.filter((a) =>
      a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) ||
      a.desc.toLowerCase().includes(q) || (a.subcat ?? '').toLowerCase().includes(q) ||
      (a.type ?? '').toLowerCase().includes(q));
  }, [q]);

  const partHits = useMemo(() => {
    if (!q) return null;
    return MASTER_PARTS.filter((pt) =>
      pt.name.toLowerCase().includes(q) || pt.code.toLowerCase().includes(q) ||
      pt.mfr.toLowerCase().includes(q) || pt.subcat.toLowerCase().includes(q));
  }, [q]);

  const bomCodes = useMemo(() => new Set(bom.map((i) => i.code)), [bom]);

  // ── Bench actions ───────────────────────────────────────────────────────────

  function loadAssembly(a: Assembly) {
    setSubjectId(a.id);
    setBenchName(a.name);
    setCfg(configFromAssembly(a));
    setSavedBom(a.bom);
    setExtras([]);
    setParametric(false);
    setDirty(false);
    setSelectedBomId(null);
  }

  function loadDraft(d: Draft) {
    setSubjectId(d.id);
    setBenchName(d.name);
    setCfg(d.cfg);
    setSavedBom([]);
    setExtras([]);
    setParametric(true);
    setDirty(true);
    setSelectedBomId(null);
  }

  /** Any spec change regenerates the parametric rows and marks the bench dirty. */
  function updateCfg(patch: Partial<AssemblyConfig>) {
    setCfg((prev) => ({ ...prev, ...patch } as AssemblyConfig));
    setParametric(true);
    setDirty(true);
  }

  function revertToSaved() {
    if (savedAsm) {
      setCfg(configFromAssembly(savedAsm));
      setSavedBom(savedAsm.bom);
    }
    setParametric(false);
    setDirty(false);
    toast.info('Reverted to the saved assembly');
  }

  function newDraft() {
    const seedCat: CategoryCode = savedAsm ? categoryOf(savedAsm) : draft?.cat ?? 'BPC-01';
    const seedCfg: AssemblyConfig = { ...cfg } as AssemblyConfig;
    const d: Draft = {
      id: `draft-${drafts.length + 1}-${bom.length}`,
      name: 'Untitled assembly',
      code: `BPA-XX-${100 + drafts.length}`,
      cfg: seedCfg,
      cat: seedCat,
    };
    setDrafts((prev) => [d, ...prev]);
    loadDraft(d);
    toast.success('Draft started', { description: 'Seeded from the current spec — edit and save to a library.' });
  }

  function addPart(part: Part) {
    setExtras((prev) => [...prev, {
      id: `part-${part.id}-${prev.length}`, group: part.bomGroup, name: part.name,
      code: part.code, qty: 1, unit: part.unit, required: false, priceStatus: 'ok',
    }]);
    setDirty(true);
    toast.success('Part added', { description: `${part.name} · ${part.bomGroup}` });
  }

  function replaceSelected(part: Part) {
    if (!selectedBomId) {
      toast.error('Select a component first', { description: 'Click a row on the bench, then Replace.' });
      return;
    }
    const target = bom.find((i) => i.id === selectedBomId);
    const swap = (rows: BOMItem[]) => rows.map((i) => i.id === selectedBomId
      ? { ...i, name: part.name, code: part.code, unit: part.unit } : i);
    if (extras.some((i) => i.id === selectedBomId)) setExtras(swap);
    else { setSavedBom(swap(parametric ? deriveBom(cfg) : savedBom)); setParametric(false); }
    setDirty(true);
    toast.success('Component replaced', { description: `${target?.name ?? 'Component'} → ${part.name}` });
  }

  function removeRow(id: string) {
    if (extras.some((i) => i.id === id)) setExtras((prev) => prev.filter((i) => i.id !== id));
    else { setSavedBom((parametric ? deriveBom(cfg) : savedBom).filter((i) => i.id !== id)); setParametric(false); }
    if (selectedBomId === id) setSelectedBomId(null);
    setDirty(true);
  }

  /** Selecting a component jumps the parts index to that part's neighbourhood. */
  function selectBomRow(item: BOMItem) {
    const next = selectedBomId === item.id ? null : item.id;
    setSelectedBomId(next);
    if (!next) { setHighlightPartId(null); return; }
    const match = MASTER_PARTS.find((pt) => pt.code === item.code);
    if (match) {
      setOpenPartCats((prev) => new Set(prev).add(match.cat));
      setHighlightPartId(match.id);
    } else {
      setHighlightPartId(null);
    }
  }

  function addToTakeoff() {
    const qty = parseFloat(count) || 1;
    toast.success('Added to takeoff', { description: `${qty} × ${benchName} queued on the active drawing.` });
  }

  const matCost   = bom.reduce((sum, i) => sum + i.qty * 24.5, 0);
  const labourHrs = bom.length * 0.35;
  const isFixtureCfg = cfg.kind === 'fixture';

  // ── Assemblies index rendering ──────────────────────────────────────────────

  function assemblyRow(a: Assembly, indent: number) {
    const st = STATUS_CFG[a.status];
    const fav = asmFavs.has(a.id);
    const active = a.id === subjectId;
    return (
      <div
        key={a.id}
        onClick={() => loadAssembly(a)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: `6px 10px 6px ${indent}px`,
          borderBottom: '1px solid #F9FAFB', cursor: 'pointer',
          background: active ? '#EFF6FF' : 'transparent',
          borderLeft: `2px solid ${active ? '#2563EB' : 'transparent'}`,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#1D4ED8' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace' }}>{a.code}</div>
        </div>
        <span title={st.label} style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, color: st.color, background: st.bg, flexShrink: 0 }}>{st.symbol}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setAsmFavs((prev) => { const n = new Set(prev); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; }); }}
          aria-label={fav ? 'Remove favourite' : 'Add favourite'}
          style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Star size={10} fill={fav ? '#F59E0B' : 'none'} color={fav ? '#F59E0B' : '#D1D5DB'} />
        </button>
      </div>
    );
  }

  const assembliesPane = (
    <div className="bp-wb-pane" style={{ width: 300, minWidth: 300, background: 'white', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <PaneHeader
        title="Assemblies"
        count={asmHits ? `${asmHits.length} match` : `${ALL_ASSEMBLIES.length}`}
        action={
          <button onClick={newDraft} style={{ height: 22, padding: '0 8px', border: '1px solid #BFDBFE', borderRadius: 5, background: 'white', fontSize: 10, fontWeight: 600, color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Plus size={10} /> New
          </button>
        }
      />
      <div className="bp-wb-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Drafts stay pinned so the thing being built is always clickable */}
        {drafts.length > 0 && !asmHits && (
          <>
            <div style={{ padding: '5px 10px', fontSize: 9, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#FFFBEB' }}>Drafts</div>
            {drafts.map((d) => (
              <div
                key={d.id}
                onClick={() => loadDraft(d)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderBottom: '1px solid #F9FAFB', cursor: 'pointer',
                  background: d.id === subjectId ? '#EFF6FF' : 'transparent',
                  borderLeft: `2px solid ${d.id === subjectId ? '#2563EB' : 'transparent'}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.id === subjectId ? benchName : d.name}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace' }}>{d.code}</div>
                </div>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706', flexShrink: 0 }} />
              </div>
            ))}
          </>
        )}

        {asmHits ? (
          asmHits.length === 0
            ? <div style={{ padding: '16px 12px', fontSize: 11, color: '#9CA3AF' }}>No assemblies match “{search}”.</div>
            : asmHits.map((a) => assemblyRow(a, 10))
        ) : (
          CATEGORIES.map((c) => {
            const open = openCats.has(c.code);
            return (
              <div key={c.code}>
                <button
                  onClick={() => setOpenCats((prev) => { const n = new Set(prev); if (n.has(c.code)) n.delete(c.code); else n.add(c.code); return n; })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB' }}
                >
                  {open ? <ChevronDown size={11} color="#9CA3AF" /> : <ChevronRight size={11} color="#9CA3AF" />}
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#374151' }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace' }}>{c.code}</span>
                  {c.warning && <AlertTriangle size={10} color="#D97706" />}
                </button>
                {open && (ASSEMBLY_SUBCATS[c.code] ?? []).map((sc) => {
                  const key = `${c.code}/${sc}`;
                  const subOpen = openSubs.has(key);
                  const inSub = ALL_ASSEMBLIES.filter((a) => categoryOf(a) === c.code && a.subcat === sc);
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setOpenSubs((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px 5px 24px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB' }}
                      >
                        {subOpen ? <ChevronDown size={10} color="#D1D5DB" /> : <ChevronRight size={10} color="#D1D5DB" />}
                        <span style={{ flex: 1, fontSize: 11, color: '#6B7280' }}>{sc}</span>
                        <span style={{ fontSize: 10, color: '#D1D5DB' }}>{inSub.length}</span>
                      </button>
                      {subOpen && (
                        typesFor(c.code, sc).map((t) => {
                          const inType = inSub.filter((a) => a.type === t);
                          if (inType.length === 0) return null;
                          return (
                            <div key={t}>
                              <div style={{ padding: '3px 10px 3px 38px', fontSize: 10, color: '#9CA3AF', background: '#FCFCFD' }}>{t}</div>
                              {inType.map((a) => assemblyRow(a, 44))}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ── Parts index rendering ───────────────────────────────────────────────────

  function partRow(pt: Part, indent: number) {
    const fav = partFavs.has(pt.id);
    const inBom = bomCodes.has(pt.code);
    const highlighted = highlightPartId === pt.id;
    return (
      <div
        key={pt.id}
        draggable
        onDragStart={(e) => {
          dragState.part = pt;
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData(PART_DRAG_TYPE, pt.id);
          e.dataTransfer.setData('text/plain', pt.name);
        }}
        onDragEnd={() => { dragState.part = null; }}
        title="Drag onto the bench, or use Add / Replace"
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: `6px 10px 6px ${indent}px`,
          borderBottom: '1px solid #F9FAFB', cursor: 'grab',
          background: highlighted ? '#FFFBEB' : 'transparent',
          borderLeft: `2px solid ${highlighted ? '#D97706' : inBom ? '#BFDBFE' : 'transparent'}`,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pt.name}</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pt.code} · {pt.mfr} · ${pt.price.toFixed(2)}
          </div>
        </div>
        {inBom && <span title="Already on the bench" style={{ fontSize: 8, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>IN BOM</span>}
        <button onClick={() => addPart(pt)} title="Add to the bench"
          style={{ width: 20, height: 20, border: 'none', background: '#EFF6FF', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Plus size={10} color="#1D4ED8" />
        </button>
        <button onClick={() => replaceSelected(pt)} title={selectedBomId ? 'Replace the selected component' : 'Select a component on the bench first'}
          style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <RefreshCw size={10} color={selectedBomId ? '#6B7280' : '#D1D5DB'} />
        </button>
        <button onClick={() => setPartFavs((prev) => { const n = new Set(prev); if (n.has(pt.id)) n.delete(pt.id); else n.add(pt.id); return n; })}
          aria-label={fav ? 'Remove favourite' : 'Add favourite'}
          style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Star size={10} fill={fav ? '#F59E0B' : 'none'} color={fav ? '#F59E0B' : '#D1D5DB'} />
        </button>
      </div>
    );
  }

  const partsPane = (
    <div className="bp-wb-pane" style={{ width: 300, minWidth: 300, background: 'white', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <PaneHeader title="Parts" count={partHits ? `${partHits.length} match` : `${MASTER_PARTS.length}`} />
      <div className="bp-wb-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {partHits ? (
          partHits.length === 0
            ? <div style={{ padding: '16px 12px', fontSize: 11, color: '#9CA3AF' }}>No parts match “{search}”.</div>
            : partHits.map((pt) => partRow(pt, 10))
        ) : (
          PART_CATEGORIES.map((c) => {
            const open = openPartCats.has(c.name);
            const inCat = MASTER_PARTS.filter((pt) => pt.cat === c.name);
            return (
              <div key={c.name}>
                <button
                  onClick={() => setOpenPartCats((prev) => { const n = new Set(prev); if (n.has(c.name)) n.delete(c.name); else n.add(c.name); return n; })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB' }}
                >
                  {open ? <ChevronDown size={11} color="#9CA3AF" /> : <ChevronRight size={11} color="#9CA3AF" />}
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#374151' }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: '#D1D5DB' }}>{inCat.length}</span>
                </button>
                {open && c.subcats.map((sc) => {
                  const inSub = inCat.filter((pt) => pt.subcat === sc);
                  if (inSub.length === 0) return null;
                  return (
                    <div key={sc}>
                      <div style={{ padding: '3px 10px 3px 24px', fontSize: 10, color: '#9CA3AF', background: '#FCFCFD' }}>{sc}</div>
                      {inSub.map((pt) => partRow(pt, 28))}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ── Bench rendering ─────────────────────────────────────────────────────────

  const specBar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '10px 14px', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA', flexShrink: 0, alignItems: 'flex-end' }}>
      {isFixtureCfg ? (
        <>
          <SpecField label="Application" width={168}>
            <Sel value={cfg.app} onChange={(v) => updateCfg({ app: v })} opts={contextsForCategory('BPC-01')} />
          </SpecField>
          <SpecField label="Fixture" width={158}>
            <Sel value={cfg.type} onChange={(v) => updateCfg({ type: v })} opts={FIXTURE_TYPES} />
          </SpecField>
          <SpecField label="Mounting" width={168}>
            <Sel value={cfg.mount} onChange={(v) => updateCfg({ mount: v })} opts={FIXTURE_MOUNTS} />
          </SpecField>
          <SpecField label="Wiring" width={140}>
            <Sel value={cfg.wiring} onChange={(v) => updateCfg({ wiring: v })} opts={FIXTURE_WIRING} />
          </SpecField>
          <SpecField label="Run"><Num value={cfg.run} onChange={(v) => updateCfg({ run: v })} suffix="LF" /></SpecField>
          <SpecField label="Waste"><Num value={cfg.waste} onChange={(v) => updateCfg({ waste: v })} suffix="%" /></SpecField>
          <SpecField label="Dimming" width={132}>
            <Sel value={cfg.dimming} onChange={(v) => updateCfg({ dimming: v })} opts={DIMMING_OPTIONS} />
          </SpecField>
          <SpecField label="Emergency" width={150}>
            <Sel value={cfg.emergency} onChange={(v) => updateCfg({ emergency: v })} opts={EMERGENCY_OPTIONS} />
          </SpecField>
          {cfg.wiring !== 'Measure Separately' && (
            <span style={{ height: 28, display: 'flex', alignItems: 'center', padding: '0 9px', borderRadius: 6, background: '#F0FDF4', color: '#16A34A', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
              = {wasteAdjustedLF(cfg.run, cfg.waste)} LF
            </span>
          )}
        </>
      ) : (
        <>
          <SpecField label="Application" width={168}>
            <Sel value={cfg.app} onChange={(v) => updateCfg({ app: v })} opts={contextsForCategory('BPC-02')} />
          </SpecField>
          <SpecField label="Device" width={182}>
            <Sel value={cfg.type} onChange={(v) => updateCfg({ type: v })} opts={DEVICE_TYPES} />
          </SpecField>
          <SpecField label="Grade" width={150}>
            <Sel value={cfg.grade} onChange={(v) => updateCfg({ grade: v })} opts={DEVICE_GRADES} />
          </SpecField>
          <SpecField label="Wiring" width={140}>
            <Sel value={cfg.wiring} onChange={(v) => updateCfg({ wiring: v })} opts={DEVICE_WIRING} />
          </SpecField>
          <SpecField label="Run"><Num value={cfg.run} onChange={(v) => updateCfg({ run: v })} suffix="LF" /></SpecField>
          <SpecField label="Box" width={190}>
            <Sel value={cfg.box} onChange={(v) => updateCfg({ box: v })} opts={DEVICE_BOXES} />
          </SpecField>
          <SpecField label="Cover" width={168}>
            <Sel value={cfg.cover} onChange={(v) => updateCfg({ cover: v })} opts={DEVICE_COVERS} />
          </SpecField>
          {cfg.grade === 'Hospital Grade' && (
            <span style={{ height: 28, display: 'flex', alignItems: 'center', gap: 4, padding: '0 9px', borderRadius: 6, background: '#FFFBEB', color: '#92400E', fontSize: 10, whiteSpace: 'nowrap' }}>
              <AlertTriangle size={10} color="#D97706" /> HCF cable applied
            </span>
          )}
        </>
      )}
    </div>
  );

  // Group the bench BOM the same way the Live BOM does.
  const GROUP_ORDER = ['Fixture', 'Device', 'Mounting', 'Box & Cover', 'Wiring', 'Controls', 'Emergency', 'Grounding', 'Hardware', 'Raceway', 'Optional'];
  const grouped = useMemo(() => {
    const map: Record<string, BOMItem[]> = {};
    for (const item of bom) { (map[item.group] ||= []).push(item); }
    const ordered = GROUP_ORDER.filter((g) => map[g]);
    return [...ordered, ...Object.keys(map).filter((g) => !GROUP_ORDER.includes(g))].map((g) => [g, map[g]] as const);
  }, [bom]);

  const benchPane = (
    <div
      className="bp-wb-bench"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!dropActive) setDropActive(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDropActive(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDropActive(false);
        const id = e.dataTransfer.getData(PART_DRAG_TYPE) || dragState.part?.id;
        const part = MASTER_PARTS.find((pt) => pt.id === id);
        if (part) addPart(part);
      }}
      style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0,
        background: 'white', overflow: 'hidden',
        ...(dropActive ? { outline: '2px dashed #2563EB', outlineOffset: -4, background: '#F8FBFF' } : {}),
      }}
    >
      {/* Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid #E5E7EB', flexShrink: 0, flexWrap: 'wrap' }}>
        <input
          value={benchName}
          onChange={(e) => { setBenchName(e.target.value); setDirty(true); }}
          style={{ flex: 1, minWidth: 160, height: 28, padding: '0 8px', border: '1px solid transparent', borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#111827', outline: 'none', background: 'transparent' }}
          onFocus={(e) => { e.currentTarget.style.border = '1px solid #BFDBFE'; e.currentTarget.style.background = 'white'; }}
          onBlur={(e) => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; }}
        />
        <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace' }}>{draft?.code ?? savedAsm?.code ?? ''}</span>
        {dirty && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: 9999, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D97706' }} /> Edited
          </span>
        )}
        <button
          onClick={() => { toast.success('Assembly saved', { description: `${benchName} → ${activeLib.name}` }); setDirty(false); }}
          style={{ height: 28, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Save size={11} /> Save
        </button>
      </div>

      {specBar}

      {/* Regeneration notice — an explicit, reversible transformation */}
      {parametric && savedAsm && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A', flexShrink: 0 }}>
          <Sparkles size={11} color="#D97706" />
          <span style={{ fontSize: 11, color: '#92400E', flex: 1 }}>Components regenerated from the spec above.</span>
          <button onClick={revertToSaved} style={{ height: 22, padding: '0 8px', border: '1px solid #FDE68A', borderRadius: 5, background: 'white', fontSize: 10, color: '#92400E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Undo2 size={10} /> Revert to saved
          </button>
        </div>
      )}

      {/* Components */}
      <div className="bp-wb-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 10, color: '#9CA3AF' }}>
          {bom.length} component{bom.length !== 1 ? 's' : ''} · click a row to select — the Parts index jumps to it
        </div>
        {grouped.map(([group, rows]) => (
          <div key={group}>
            <div style={{ padding: '4px 14px', background: '#FAFAFA', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {group} <span style={{ color: '#D1D5DB' }}>{rows.length}</span>
            </div>
            {rows.map((item) => {
              const isSel = selectedBomId === item.id;
              const owned = parametric && isParametricRow(item);
              return (
                <div
                  key={item.id}
                  onClick={() => selectBomRow(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                    borderBottom: '1px solid #F9FAFB', cursor: 'pointer',
                    background: isSel ? '#EFF6FF' : 'white',
                    borderLeft: `2px solid ${isSel ? '#2563EB' : owned ? '#BFDBFE' : 'transparent'}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.code}{item.calc ? ` · ${item.calc}` : ''}
                    </div>
                  </div>
                  {owned && <span title="Driven by the spec above" style={{ fontSize: 8, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>SPEC</span>}
                  <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#374151', flexShrink: 0 }}>{item.qty} {item.unit}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeRow(item.id); }} aria-label={`Remove ${item.name}`}
                    style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.5 }}>
                    <X size={11} color="#DC2626" />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        {bom.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Package size={28} color="#E5E7EB" />
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>No components yet</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Set the spec above, or drag parts in from the right.</div>
          </div>
        )}
      </div>

      {/* Totals + takeoff */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #E5E7EB', padding: '10px 14px', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Components', value: String(bom.length) },
          { label: 'Material', value: '$' + matCost.toFixed(2) },
          { label: 'Labor', value: labourHrs.toFixed(1) + ' hrs' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: '#9CA3AF' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'IBM Plex Mono, monospace' }}>{value}</div>
          </div>
        ))}
        <div style={{ flex: 1, minWidth: 8 }} />
        <label style={{ fontSize: 11, color: '#6B7280' }}>Count</label>
        <input
          type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)}
          style={{ width: 56, height: 32, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none' }}
        />
        <button
          onClick={addToTakeoff}
          style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Play size={11} /> Add to Takeoff
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', background: '#F6F7F9' }}>
      {/* One toolbar, one search across both indexes */}
      <div className="bp-toolbar" style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        {modeSwitcher}

        <div className="bp-toolbar-grow" style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 380 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assemblies and parts together…"
            style={{ width: '100%', height: 34, paddingLeft: 30, paddingRight: 26, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}>
              <X size={12} color="#9CA3AF" />
            </button>
          )}
        </div>
        {q && (
          <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
            {asmHits?.length ?? 0} assembl{(asmHits?.length ?? 0) === 1 ? 'y' : 'ies'} · {partHits?.length ?? 0} part{(partHits?.length ?? 0) === 1 ? '' : 's'}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {libraryPicker}
        <div style={{ flexShrink: 0 }}>{viewSwitcher}</div>
      </div>

      {/* Three co-equal columns; reflows to two rows below 1180px */}
      <div className="bp-wb" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {assembliesPane}
        {benchPane}
        {partsPane}
      </div>
    </div>
  );
}
