import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, X, Star, ChevronRight, Plus, Columns3, List, Download, Upload, Trash2,
} from 'lucide-react';
import { Part, PART_CATEGORIES, MASTER_PARTS } from '../library/libraryData';

/**
 * Parts Library — the company's master item list.
 *
 * Parts only. Assemblies are a project-facing construct and live in Libraries;
 * this is the catalogue the assemblies draw from, so mixing them here would
 * blur which list an edit actually changes.
 *
 * Carries the two view modes the Column Browser settled on: the cascade for
 * drilling a category, and a complete list for seeing everything at once. The
 * complete list ignores the cascade selection on purpose — that was the whole
 * point of adding it.
 */

type ViewMode = 'columns' | 'list';

const HEAD: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
};

const MONO = 'IBM Plex Mono, monospace';

function Column({ title, count, children, flex }: {
  title: string; count: number; children: React.ReactNode; flex?: boolean;
}) {
  return (
    <div style={{
      flex: flex ? 1 : undefined, width: flex ? undefined : 210, minWidth: flex ? 240 : 210,
      borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#FAFAFA', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <span style={HEAD}>{title}</span>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{count}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

function Row({ label, sub, active, chevron, onClick, right }: {
  label: string; sub?: string; active?: boolean; chevron?: boolean;
  onClick: () => void; right?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', cursor: 'pointer',
        borderBottom: '1px solid #F9FAFB',
        background: active ? '#EFF6FF' : 'white',
        borderLeft: `2px solid ${active ? '#2563EB' : 'transparent'}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#1D4ED8' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {right}
      {chevron && <ChevronRight size={11} color="#D1D5DB" style={{ flexShrink: 0 }} />}
    </div>
  );
}

function EmptyCol({ text }: { text: string }) {
  return <div style={{ padding: 16, fontSize: 11, color: '#9CA3AF', lineHeight: '16px' }}>{text}</div>;
}

export function PartsLibraryTab() {
  const [mode, setMode] = useState<ViewMode>('columns');
  const [cat, setCat] = useState<string | null>('Wire & Cable');
  const [subcat, setSubcat] = useState<string | null>('THHN Copper');
  const [partId, setPartId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [favs, setFavs] = useState<Set<string>>(new Set(['pt-38', 'pt-4']));
  const [custom, setCustom] = useState<Part[]>([]);

  const parts = useMemo(() => [...MASTER_PARTS, ...custom], [custom]);
  const q = search.trim().toLowerCase();

  const matches = (p: Part) =>
    p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.mfr.toLowerCase().includes(q);

  const subcats = cat ? (PART_CATEGORIES.find((c) => c.name === cat)?.subcats ?? []) : [];

  /** The cascade's third column — filtered by the branch, or by search. */
  const branchParts = useMemo(() => {
    if (q) return parts.filter(matches);
    return parts.filter((p) => (!cat || p.cat === cat) && (!subcat || p.subcat === subcat));
  }, [parts, cat, subcat, q]);

  /**
   * Complete list mode shows every part regardless of the cascade selection.
   * The search box still narrows it; each row carries its own path.
   */
  const allParts = useMemo(() => (q ? parts.filter(matches) : parts), [parts, q]);

  const shown = mode === 'list' ? allParts : branchParts;
  const selected = partId ? parts.find((p) => p.id === partId) ?? null : null;

  function toggleFav(id: string) {
    setFavs((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function addPart() {
    const id = `pt-custom-${custom.length + 1}`;
    const p: Part = {
      id, name: 'New part', code: `NEW-${100 + custom.length}`,
      cat: cat ?? PART_CATEGORIES[0].name,
      subcat: subcat ?? PART_CATEGORIES[0].subcats[0],
      mfr: '', unit: 'EA', price: 0, bomGroup: 'Wiring',
    };
    setCustom((prev) => [...prev, p]);
    setPartId(id);
    toast.success('Part added', { description: `Filed under ${p.cat} › ${p.subcat}.` });
  }

  function update(id: string, patch: Partial<Part>) {
    setCustom((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  const isCustom = (p: Part) => custom.some((c) => c.id === p.id);

  const modeBtn = (m: ViewMode, icon: React.ReactNode, title: string) => (
    <button
      onClick={() => setMode(m)}
      title={title}
      aria-label={title}
      style={{
        width: 28, height: 26, border: 'none', cursor: 'pointer',
        background: mode === m ? '#EFF6FF' : 'white',
        color: mode === m ? '#1D4ED8' : '#9CA3AF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  );

  const field: React.CSSProperties = {
    width: '100%', height: 30, padding: '0 8px', border: '1px solid #E5E7EB',
    borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: 'white',
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, background: 'white', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="bp-toolbar" style={{ padding: '10px 14px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="bp-toolbar-grow" style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts, codes, manufacturers…"
            style={{ ...field, height: 32, paddingLeft: 28, paddingRight: search ? 26 : 8 }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}>
              <X size={12} color="#9CA3AF" />
            </button>
          )}
        </div>

        <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
          {shown.length} of {parts.length} parts
          {custom.length > 0 && <span style={{ color: '#1D4ED8' }}> · {custom.length} new</span>}
        </span>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
          {modeBtn('columns', <Columns3 size={13} />, 'Category columns')}
          {modeBtn('list', <List size={13} />, 'Complete list, no drilling')}
        </div>
        <button onClick={() => toast.info('Master item export — CSV download')} style={{ height: 32, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Download size={12} /> Export
        </button>
        <button onClick={() => toast.info('Master item import — upload a supplier price file')} style={{ height: 32, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Upload size={12} /> Import
        </button>
        <button onClick={addPart} style={{ height: 32, padding: '0 12px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={13} /> New part
        </button>
      </div>

      {/* Breadcrumb — columns mode only; the list has per-row paths instead. */}
      {mode === 'columns' && (
        <div className="bp-scroll-x" style={{ padding: '7px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <button onClick={() => { setCat(null); setSubcat(null); setSearch(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 12, padding: 0 }}>Parts</button>
          {cat && <><ChevronRight size={11} color="#D1D5DB" /><button onClick={() => { setSubcat(null); setSearch(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: subcat ? '#6B7280' : '#2563EB', fontWeight: subcat ? 400 : 600, fontSize: 12, padding: 0 }}>{cat}</button></>}
          {subcat && <><ChevronRight size={11} color="#D1D5DB" /><span style={{ color: '#2563EB', fontWeight: 600 }}>{subcat}</span></>}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{branchParts.length} in this branch</span>
        </div>
      )}

      <div style={{ display: 'flex', minHeight: 420, maxHeight: 560 }}>
        {/* Browser */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {mode === 'columns' ? (
            <div className="bp-scroll-x" style={{ flex: 1, display: 'flex', minHeight: 0, overflowX: 'auto' }}>
              <Column title="Part category" count={PART_CATEGORIES.length}>
                {PART_CATEGORIES.map((c) => (
                  <Row
                    key={c.name}
                    label={c.name}
                    sub={`${parts.filter((p) => p.cat === c.name).length} parts`}
                    active={c.name === cat && !q}
                    chevron
                    onClick={() => { setCat(c.name); setSubcat(null); setSearch(''); }}
                  />
                ))}
              </Column>

              <Column title="Subcategory" count={subcats.length}>
                {!cat
                  ? <EmptyCol text="Pick a category." />
                  : subcats.map((sc) => (
                    <Row
                      key={sc}
                      label={sc}
                      sub={`${parts.filter((p) => p.cat === cat && p.subcat === sc).length} parts`}
                      active={sc === subcat && !q}
                      chevron
                      onClick={() => { setSubcat(sc); setSearch(''); }}
                    />
                  ))}
              </Column>

              <Column title={q ? 'Matching parts' : 'Part'} count={branchParts.length} flex>
                {branchParts.length === 0
                  ? <EmptyCol text="No parts in this branch yet." />
                  : branchParts.map((p) => (
                    <Row
                      key={p.id}
                      label={p.name}
                      sub={`${p.code} · ${p.mfr || '—'} · $${p.price.toFixed(2)}/${p.unit}`}
                      active={p.id === partId}
                      onClick={() => setPartId(p.id)}
                      right={
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}
                          aria-label={favs.has(p.id) ? 'Remove favourite' : 'Add favourite'}
                          style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <Star size={11} fill={favs.has(p.id) ? '#F59E0B' : 'none'} color={favs.has(p.id) ? '#F59E0B' : '#D1D5DB'} />
                        </button>
                      }
                    />
                  ))}
              </Column>
            </div>
          ) : (
            /* Complete list — every part, whatever the cascade is pointing at */
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {allParts.length === 0 && <EmptyCol text="No parts match." />}
              {allParts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPartId(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', cursor: 'pointer',
                    borderBottom: '1px solid #F9FAFB',
                    background: p.id === partId ? '#EFF6FF' : 'white',
                    borderLeft: `2px solid ${p.id === partId ? '#2563EB' : 'transparent'}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: p.id === partId ? 600 : 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: MONO }}>
                      {p.code} · {p.mfr || '—'} · ${p.price.toFixed(2)}/{p.unit}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 9999, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {p.cat} › {p.subcat}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}
                    aria-label={favs.has(p.id) ? 'Remove favourite' : 'Add favourite'}
                    style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Star size={11} fill={favs.has(p.id) ? '#F59E0B' : 'none'} color={favs.has(p.id) ? '#F59E0B' : '#D1D5DB'} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div style={{ width: 320, minWidth: 300, borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1 }}>Part detail</span>
            {selected && isCustom(selected) && (
              <button
                onClick={() => { setCustom((prev) => prev.filter((c) => c.id !== selected.id)); setPartId(null); toast.info('Part removed'); }}
                aria-label={`Remove ${selected.name}`}
                style={{ width: 24, height: 24, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={11} color="#DC2626" />
              </button>
            )}
          </div>

          {!selected ? (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <Search size={26} color="#E5E7EB" />
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 10 }}>Select a part to see its catalogue detail.</div>
            </div>
          ) : (
            <div style={{ padding: 14 }}>
              {[
                { label: 'Description', value: selected.name, key: 'name' as const },
                { label: 'Part code',   value: selected.code, key: 'code' as const, mono: true },
                { label: 'Manufacturer', value: selected.mfr, key: 'mfr' as const },
              ].map((f) => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6B7280', marginBottom: 3 }}>{f.label}</label>
                  <input
                    value={f.value}
                    readOnly={!isCustom(selected)}
                    onChange={(e) => update(selected.id, { [f.key]: e.target.value } as Partial<Part>)}
                    style={{ ...field, fontFamily: f.mono ? MONO : undefined, background: isCustom(selected) ? 'white' : '#F9FAFB', color: isCustom(selected) ? '#111827' : '#6B7280' }}
                  />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#6B7280', marginBottom: 3 }}>Unit</label>
                  <input value={selected.unit} readOnly={!isCustom(selected)} onChange={(e) => update(selected.id, { unit: e.target.value })} style={{ ...field, background: isCustom(selected) ? 'white' : '#F9FAFB' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#6B7280', marginBottom: 3 }}>Material price</label>
                  <input type="number" step="0.01" value={selected.price} readOnly={!isCustom(selected)} onChange={(e) => update(selected.id, { price: parseFloat(e.target.value) || 0 })} style={{ ...field, fontFamily: MONO, textAlign: 'right', background: isCustom(selected) ? 'white' : '#F9FAFB' }} />
                </div>
              </div>

              <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginTop: 12 }}>
                {[
                  { label: 'Category', value: selected.cat },
                  { label: 'Subcategory', value: selected.subcat },
                  { label: 'BOM group', value: selected.bomGroup },
                  { label: 'Favourite', value: favs.has(selected.id) ? 'Yes' : 'No' },
                ].map((r, i) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 11px', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 11, color: '#6B7280', flex: 1 }}>{r.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#111827' }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {!isCustom(selected) && (
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 10, lineHeight: '15px' }}>
                  Catalogue parts are read-only here. Add a new part to create a company-specific entry.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
