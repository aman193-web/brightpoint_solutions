import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, X, Star, ChevronRight, Plus, Columns3, List, Download, Upload, Trash2,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  Part, PART_CATEGORIES, MASTER_PARTS, LaborType, LABOR_TYPES,
  LaborRateSource, LABOR_RATE_SOURCES, LABOR_SOURCE_NOTE, PRICING_SOURCES,
  laborTypeOf, laborHoursOf, laborCostOf, laborRateSourceOf, pricingSourceOf, partRecency,
} from '../library/libraryData';
import { COMPANY_LABOR_RATE } from '../../lib/costing';

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

/*
 * Fixed tracks, not fractions: the header and the rows are separate grid
 * containers, and a flexible track can resolve differently between them — which
 * drags every later column out of alignment. The same reason the bid tables use
 * fixed widths.
 */
const TABLE_GRID =
  '22px 156px 92px 86px 74px 104px 84px 124px 86px 84px 72px 30px 20px';
const TABLE_GAP = 6;
/** Sum of the tracks (1034) plus the twelve gaps (72) and the row padding (28). */
const TABLE_MIN_WIDTH = 1134;

type SortKey =
  | 'recent' | 'name' | 'cat' | 'subcat' | 'mfr' | 'bom' | 'unit'
  | 'price' | 'psource' | 'hours' | 'lsource' | 'cost';

/*
 * Column order is deliberate: thirteen columns do not fit the Settings content
 * column at any honest width, so the ones that get cut off are chosen rather than
 * left to chance. Price, the two labour sources and the labour cost sit inside
 * the fold — they are what this screen is for and one of them is editable in the
 * row. Manufacturer, BOM group and Unit are identifying detail and scroll.
 */
const TABLE_COLS: { key: SortKey | 'check' | 'fav'; label: string; align?: 'left' | 'right'; sortable?: boolean }[] = [
  { key: 'check',   label: '' },
  { key: 'name',    label: 'Part',               sortable: true },
  { key: 'cat',     label: 'Category',           sortable: true },
  { key: 'subcat',  label: 'Subcategory',        sortable: true },
  { key: 'price',   label: 'Material $', align: 'right', sortable: true },
  { key: 'psource', label: 'Pricing source',     sortable: true },
  { key: 'hours',   label: 'Labour hours', align: 'right', sortable: true },
  { key: 'lsource', label: 'Labour rate source', sortable: true },
  { key: 'cost',    label: 'Labour cost',  align: 'right', sortable: true },
  { key: 'mfr',     label: 'Manufacturer',       sortable: true },
  { key: 'bom',     label: 'BOM group',          sortable: true },
  { key: 'unit',    label: 'Unit',               sortable: true },
  { key: 'fav',     label: '' },
];

/**
 * The sort menu, in the words an estimator would use.
 *
 * The column headers sort too; both drive one piece of state, so the menu always
 * reflects what the table is actually doing and reads "Custom" when a header
 * click has taken it somewhere the presets do not name.
 */
const SORT_PRESETS: { id: string; label: string; key: SortKey; dir: 'asc' | 'desc' }[] = [
  { id: 'recent',     label: 'Recently added',    key: 'recent',  dir: 'asc' },
  { id: 'az',         label: 'Part name A–Z',     key: 'name',    dir: 'asc' },
  { id: 'za',         label: 'Part name Z–A',     key: 'name',    dir: 'desc' },
  { id: 'cat',        label: 'Category A–Z',      key: 'cat',     dir: 'asc' },
  { id: 'price-desc', label: 'Material $ high–low', key: 'price', dir: 'desc' },
  { id: 'price-asc',  label: 'Material $ low–high', key: 'price', dir: 'asc' },
  { id: 'hours-desc', label: 'Labour hours high–low', key: 'hours', dir: 'desc' },
  { id: 'cost-desc',  label: 'Labour cost high–low',  key: 'cost',  dir: 'desc' },
];

const ALL = '__all__';

/** A read-only pill — pricing source and BOM group, which are facts not choices. */
function Pill({ text, tone, title }: { text: string; tone: 'blue' | 'grey' | 'amber'; title?: string }) {
  const c = tone === 'blue'
    ? { fg: '#1D4ED8', bg: '#EFF6FF', bd: '#BFDBFE' }
    : tone === 'amber'
      ? { fg: '#B45309', bg: '#FFFBEB', bd: '#FDE68A' }
      : { fg: '#6B7280', bg: '#F9FAFB', bd: '#E5E7EB' };
  return (
    <span
      title={title ?? text}
      style={{
        fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden',
        textOverflow: 'ellipsis', maxWidth: '100%', display: 'inline-block',
        padding: '2px 7px', borderRadius: 999,
        color: c.fg, background: c.bg, border: `1px solid ${c.bd}`,
      }}
    >
      {text}
    </span>
  );
}

/** One labelled filter select. */
function FilterSelect({ label, value, onChange, options, width }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; width?: number;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <span style={{ fontSize: 10.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Filter by ${label}`}
        style={{
          width, height: 28, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 6,
          fontSize: 11, background: value === ALL ? 'white' : '#EFF6FF',
          color: value === ALL ? '#374151' : '#1D4ED8',
          fontWeight: value === ALL ? 400 : 600, outline: 'none', cursor: 'pointer',
        }}
      >
        <option value={ALL}>All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

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
  // Table is the default now: the columns are the point of this screen.
  const [mode, setMode] = useState<ViewMode>('list');
  const [cat, setCat] = useState<string | null>('Wire & Cable');
  const [subcat, setSubcat] = useState<string | null>('THHN Copper');
  const [partId, setPartId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [favs, setFavs] = useState<Set<string>>(new Set(['pt-38', 'pt-4']));
  const [custom, setCustom] = useState<Part[]>([]);

  /** Per-part edits to catalogue entries, keyed by id. */
  const [overrides, setOverrides] = useState<Record<string, Partial<Part>>>({});

  const parts = useMemo(
    () => [...MASTER_PARTS.map((p) => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p)), ...custom],
    [custom, overrides],
  );
  const q = search.trim().toLowerCase();

  const matches = (p: Part) =>
    p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.mfr.toLowerCase().includes(q);

  const subcats = cat ? (PART_CATEGORIES.find((c) => c.name === cat)?.subcats ?? []) : [];

  /** The cascade's third column — filtered by the branch, or by search. */
  const branchParts = useMemo(() => {
    if (q) return parts.filter(matches);
    return parts.filter((p) => (!cat || p.cat === cat) && (!subcat || p.subcat === subcat));
  }, [parts, cat, subcat, q]);

  // ── Table filters ─────────────────────────────────────────────────────────
  const [fCat, setFCat] = useState(ALL);
  const [fSubcat, setFSubcat] = useState(ALL);
  const [fPricing, setFPricing] = useState(ALL);
  const [fLabour, setFLabour] = useState(ALL);
  const [fBom, setFBom] = useState(ALL);
  const [favsOnly, setFavsOnly] = useState(false);

  const bomGroups = useMemo(
    () => [...new Set(parts.map((p) => p.bomGroup))].sort((a, b) => a.localeCompare(b)),
    [parts],
  );
  /* Subcategories follow the chosen category — offering every subcategory in the
     catalogue would mostly offer combinations that return nothing. */
  const filterSubcats = useMemo(() => {
    const pool = fCat === ALL ? parts : parts.filter((p) => p.cat === fCat);
    return [...new Set(pool.map((p) => p.subcat))].sort((a, b) => a.localeCompare(b));
  }, [parts, fCat]);

  const filterCount =
    [fCat, fSubcat, fPricing, fLabour, fBom].filter((v) => v !== ALL).length + (favsOnly ? 1 : 0);

  function clearFilters() {
    setFCat(ALL); setFSubcat(ALL); setFPricing(ALL); setFLabour(ALL); setFBom(ALL);
    setFavsOnly(false);
  }

  const passesFilters = (p: Part) =>
    (fCat === ALL || p.cat === fCat)
    && (fSubcat === ALL || p.subcat === fSubcat)
    && (fPricing === ALL || pricingSourceOf(p) === fPricing)
    && (fLabour === ALL || laborRateSourceOf(p) === fLabour)
    && (fBom === ALL || p.bomGroup === fBom)
    && (!favsOnly || favs.has(p.id));

  /**
   * Complete list mode shows every part regardless of the cascade selection.
   * The search box and the filter row narrow it; each row carries its own path.
   */
  const allParts = useMemo(
    () => parts.filter((p) => (!q || matches(p)) && passesFilters(p)),
    [parts, q, fCat, fSubcat, fPricing, fLabour, fBom, favsOnly, favs],
  );

  const shown = mode === 'list' ? allParts : branchParts;

  /** Table sort. Name ascending is the order the catalogue reads in by default. */
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });

  const toggleSort = (key: SortKey | 'check' | 'fav') => {
    if (key === 'check' || key === 'fav') return;
    setSort((s0) => (s0.key === key ? { key, dir: s0.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const activePreset = SORT_PRESETS.find((s) => s.key === sort.key && s.dir === sort.dir)?.id ?? '';

  /**
   * Newest first: the parts this company added, then the catalogue behind them.
   *
   * Sorted ascending like every other key, so this returns a rank where *lower
   * is newer* — the shared `partRecency` counts the other way, and inverting it
   * here keeps one comparator direction for the whole table.
   */
  const recencyRank = (p: Part) => {
    const ci = custom.findIndex((c) => c.id === p.id);
    if (ci >= 0) return -1 - (custom.length - 1 - ci);   // last added, first shown
    return MASTER_PARTS.length - partRecency(p);
  };

  const sortedList = useMemo(() => {
    const val = (p: Part): string | number => {
      switch (sort.key) {
        case 'recent': return recencyRank(p);
        case 'cat': return p.cat;
        case 'subcat': return p.subcat;
        case 'mfr': return p.mfr || '';
        case 'bom': return p.bomGroup;
        case 'unit': return p.unit;
        case 'price': return p.price;
        case 'psource': return pricingSourceOf(p);
        case 'hours': return laborHoursOf(p);
        case 'lsource': return laborRateSourceOf(p);
        case 'cost': return laborCostOf(p, COMPANY_LABOR_RATE);
        default: return p.name;
      }
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...allParts].sort((a, b) => {
      const av = val(a); const bv = val(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [allParts, sort, custom]);
  const selected = partId ? parts.find((p) => p.id === partId) ?? null : null;

  // ── Row selection ─────────────────────────────────────────────────────────
  const [picked, setPicked] = useState<Set<string>>(new Set());
  /* Only what is on screen counts as picked: a filter change must not leave an
     invisible row about to receive a bulk edit. */
  const pickedShown = useMemo(
    () => sortedList.filter((p) => picked.has(p.id)),
    [sortedList, picked],
  );
  const allShownPicked = sortedList.length > 0 && pickedShown.length === sortedList.length;

  function togglePick(id: string) {
    setPicked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function togglePickAll() {
    setPicked(allShownPicked ? new Set() : new Set(sortedList.map((p) => p.id)));
  }

  function bulkLaborSource(src: LaborRateSource) {
    const ids = pickedShown.map((p) => p.id);
    ids.forEach((id) => update(id, { laborRateSource: src, laborUnit: undefined }));
    toast.success('Labour rate source set', {
      description: `${ids.length} part${ids.length === 1 ? '' : 's'} now read hours from ${src}.`,
    });
  }

  function bulkFav(on: boolean) {
    setFavs((prev) => {
      const n = new Set(prev);
      pickedShown.forEach((p) => (on ? n.add(p.id) : n.delete(p.id)));
      return n;
    });
  }

  function bulkDelete() {
    const mine = pickedShown.filter(isCustom).map((p) => p.id);
    if (!mine.length) {
      toast.info('Catalogue parts cannot be deleted', {
        description: 'Only parts this company added can be removed.',
      });
      return;
    }
    setCustom((prev) => prev.filter((c) => !mine.includes(c.id)));
    setPicked((prev) => { const n = new Set(prev); mine.forEach((id) => n.delete(id)); return n; });
    toast.success(`${mine.length} part${mine.length === 1 ? '' : 's'} removed`);
  }

  function toggleFav(id: string) {
    setFavs((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function addPart() {
    const id = `pt-custom-${custom.length + 1}`;
    /* Table view files the part where the filters are pointing; the cascade files
       it where the estimator has drilled to. Either way it lands somewhere they
       are already looking. */
    const inList = mode === 'list';
    const nextCat = (inList ? (fCat === ALL ? null : fCat) : cat) ?? PART_CATEGORIES[0].name;
    const catDef = PART_CATEGORIES.find((c) => c.name === nextCat) ?? PART_CATEGORIES[0];
    const nextSub = (inList ? (fSubcat === ALL ? null : fSubcat) : subcat) ?? catDef.subcats[0];
    const p: Part = {
      id, name: 'New part', code: `NEW-${100 + custom.length}`,
      cat: nextCat, subcat: nextSub,
      mfr: '', unit: 'EA', price: 0, bomGroup: 'Wiring',
      pricingSource: 'Manual entry',
    };
    setCustom((prev) => [...prev, p]);
    setPartId(id);
    if (inList) {
      /* Sort it to the top and drop the search, or a part named "New part" is
         added into the middle of 124 rows and looks like nothing happened. */
      setSort({ key: 'recent', dir: 'asc' });
      setSearch('');
      setFavsOnly(false);
    }
    toast.success('Part added', { description: `Filed under ${p.cat} › ${p.subcat}.` });
  }

  /**
   * Edit a part, custom or catalogue.
   *
   * Catalogue edits land in `overrides` rather than mutating `MASTER_PARTS`: the
   * company's own install hours are exactly what an estimator needs to change on
   * a catalogue part, and the alternative — a duplicate part existing only to
   * carry different hours — is how a parts library becomes unusable. The
   * catalogue itself stays pristine, so a future import can still replace it.
   */
  function update(id: string, patch: Partial<Part>) {
    if (custom.some((c) => c.id === id)) {
      setCustom((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      return;
    }
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
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

  /*
   * In-table editing, borderless until it is touched: a table of 13 columns each
   * drawn as a boxed input reads as a form, not a comparison. The border on focus
   * is what tells the estimator the cell is theirs to change.
   */
  const cellInput: React.CSSProperties = {
    width: '100%', height: 18, padding: '0 2px', border: '1px solid transparent',
    borderRadius: 4, background: 'transparent', outline: 'none', boxSizing: 'border-box',
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
          {modeBtn('list', <List size={13} />, 'Table \u2014 every part with its columns')}
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

      {/*
        Filters and sort — table view only.
        --------------------------------
        The cascade already filters by category by walking into it; duplicating
        that here would give the same screen two disagreeing category selections.
      */}
      {mode === 'list' && (
        <div
          className="bp-scroll-x"
          style={{
            padding: '7px 14px', borderBottom: '1px solid #E5E7EB', background: '#FCFCFD',
            display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto',
          }}
        >
          <FilterSelect label="Category" value={fCat} width={132}
            options={PART_CATEGORIES.map((c) => c.name)}
            onChange={(v) => { setFCat(v); setFSubcat(ALL); }} />
          <FilterSelect label="Subcategory" value={fSubcat} width={124}
            options={filterSubcats} onChange={setFSubcat} />
          <FilterSelect label="Pricing source" value={fPricing} width={140}
            options={PRICING_SOURCES} onChange={setFPricing} />
          <FilterSelect label="Labour rate source" value={fLabour} width={104}
            options={LABOR_RATE_SOURCES} onChange={setFLabour} />
          <FilterSelect label="BOM group" value={fBom} width={106}
            options={bomGroups} onChange={setFBom} />

          <button
            onClick={() => setFavsOnly((v) => !v)}
            title="Show only favourites"
            style={{
              height: 28, padding: '0 9px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${favsOnly ? '#FDE68A' : '#E5E7EB'}`,
              background: favsOnly ? '#FFFBEB' : 'white',
              color: favsOnly ? '#B45309' : '#6B7280', fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            }}
          >
            <Star size={11} fill={favsOnly ? '#F59E0B' : 'none'} color={favsOnly ? '#F59E0B' : '#9CA3AF'} />
            Favourites
          </button>

          {filterCount > 0 && (
            <button
              onClick={clearFilters}
              style={{ height: 28, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, color: '#2563EB', cursor: 'pointer', flexShrink: 0 }}
            >
              Clear {filterCount} filter{filterCount === 1 ? '' : 's'}
            </button>
          )}

          <div style={{ flex: 1, minWidth: 8 }} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: 10.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>Sort</span>
            <select
              value={activePreset}
              onChange={(e) => {
                const p = SORT_PRESETS.find((s) => s.id === e.target.value);
                if (p) setSort({ key: p.key, dir: p.dir });
              }}
              aria-label="Sort parts by"
              style={{ height: 28, width: 176, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, background: 'white', color: '#374151', outline: 'none', cursor: 'pointer' }}
            >
              {/* Only present while a column header has taken the sort off-menu. */}
              {!activePreset && <option value="">Custom (column header)</option>}
              {SORT_PRESETS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {/* Bulk bar — appears with the first tick, and only acts on visible rows. */}
      {mode === 'list' && pickedShown.length > 0 && (
        <div
          className="bp-scroll-x"
          style={{
            padding: '7px 14px', borderBottom: '1px solid #BFDBFE', background: '#EFF6FF',
            display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1D4ED8', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {pickedShown.length} part{pickedShown.length === 1 ? '' : 's'} selected
          </span>

          <label style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: 10.5, color: '#6B7280', whiteSpace: 'nowrap' }}>Labour rate source</span>
            <select
              value=""
              onChange={(e) => { if (e.target.value) bulkLaborSource(e.target.value as LaborRateSource); }}
              aria-label="Set labour rate source for selected parts"
              style={{ height: 28, width: 128, padding: '0 6px', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 11, background: 'white', color: '#374151', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">Set to…</option>
              {LABOR_RATE_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <button onClick={() => bulkFav(true)} style={{ height: 28, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Star size={11} color="#F59E0B" /> Favourite
          </button>
          <button onClick={() => bulkFav(false)} style={{ height: 28, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer', flexShrink: 0 }}>
            Unfavourite
          </button>
          <button onClick={bulkDelete} style={{ height: 28, padding: '0 9px', border: '1px solid #FECACA', borderRadius: 6, background: 'white', fontSize: 11, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Trash2 size={11} /> Remove
          </button>

          <div style={{ flex: 1, minWidth: 8 }} />
          <button onClick={() => setPicked(new Set())} style={{ height: 28, padding: '0 9px', border: 'none', background: 'transparent', fontSize: 11, color: '#6B7280', cursor: 'pointer', flexShrink: 0 }}>
            Clear selection
          </button>
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
            /*
             * Table view — every part, whatever the cascade is pointing at.
             * ------------------------------------------------------------
             * A real table, not stacked rows: the estimator is comparing parts
             * across category, labour class and price, and comparison is what
             * columns are for. Fixed track widths so the header and body cannot
             * resolve a few pixels apart, with the whole thing scrolling sideways
             * rather than each column shrinking to illegibility.
             */
            <div className="bp-parts-table" style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ minWidth: TABLE_MIN_WIDTH }}>
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: TABLE_GRID, gap: TABLE_GAP,
                    padding: '7px 14px', background: '#FAFAFA',
                    borderBottom: '2px solid #F3F4F6',
                    position: 'sticky', top: 0, zIndex: 1,
                  }}
                >
                  {TABLE_COLS.map((c) => (
                    c.key === 'check' ? (
                      <input
                        key="check"
                        type="checkbox"
                        checked={allShownPicked}
                        onChange={togglePickAll}
                        aria-label={allShownPicked ? 'Clear selection' : 'Select all shown parts'}
                        title={allShownPicked ? 'Clear selection' : 'Select all shown parts'}
                        style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                    ) : (
                      <button
                        key={c.key}
                        onClick={() => c.sortable && toggleSort(c.key)}
                        title={c.sortable ? `${c.label} — click to sort` : c.label}
                        style={{
                          ...HEAD, textAlign: c.align ?? 'left', border: 'none', background: 'transparent',
                          padding: 0, cursor: c.sortable ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', gap: 3, minWidth: 0,
                          justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                          color: sort.key === c.key ? '#2563EB' : '#9CA3AF',
                        }}
                      >
                        {/* Clipped, never spilling: a header wide enough to overrun
                            its track would otherwise print over its neighbour. */}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                          {c.label}
                        </span>
                        {c.sortable && sort.key === c.key && (
                          sort.dir === 'asc' ? <ArrowUp size={9} /> : <ArrowDown size={9} />
                        )}
                      </button>
                    )
                  ))}
                </div>

                {sortedList.length === 0 && <EmptyCol text="No parts match." />}

                {sortedList.map((p) => {
                  const mine = isCustom(p);
                  const on = picked.has(p.id);
                  const hrs = laborHoursOf(p);
                  const src = laborRateSourceOf(p);
                  const cost = laborCostOf(p, COMPANY_LABOR_RATE);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'grid', gridTemplateColumns: TABLE_GRID, gap: TABLE_GAP, alignItems: 'center',
                        padding: '7px 14px',
                        borderBottom: '1px solid #F9FAFB',
                        background: on ? '#EFF6FF' : 'white',
                        borderLeft: `2px solid ${on ? '#2563EB' : 'transparent'}`,
                      }}
                      onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#FAFAFA'; }}
                      onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'white'; }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => togglePick(p.id)}
                        aria-label={`Select ${p.name}`}
                        style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#2563EB' }}
                      />

                      {/*
                        Part — description over code, because the code is the lookup
                        key. Both are editable on a part this company added and plain
                        text on a catalogue entry, which is the same rule the detail
                        panel used before it was removed from this view.
                      */}
                      <span style={{ minWidth: 0 }}>
                        {mine ? (
                          <>
                            <input
                              value={p.name}
                              onChange={(e) => update(p.id, { name: e.target.value })}
                              aria-label={`Description of ${p.code}`}
                              className="bp-cell-input" style={{ ...cellInput, fontSize: 12, fontWeight: 500, color: '#111827' }}
                            />
                            <input
                              value={p.code}
                              onChange={(e) => update(p.id, { code: e.target.value })}
                              aria-label={`Part code of ${p.name}`}
                              className="bp-cell-input" style={{ ...cellInput, fontSize: 10, fontFamily: MONO, color: '#6B7280' }}
                            />
                          </>
                        ) : (
                          <>
                            <span title={p.name} style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.name}
                            </span>
                            <span style={{ display: 'block', fontSize: 10, color: '#9CA3AF', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.code}
                            </span>
                          </>
                        )}
                      </span>

                      <span style={{ fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.cat}>
                        {p.cat}
                      </span>
                      <span style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.subcat}>
                        {p.subcat}
                      </span>
                      {mine ? (
                        <input
                          type="number" step="0.01" min={0}
                          value={p.price}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value);
                            update(p.id, { price: Number.isFinite(n) ? n : 0 });
                          }}
                          aria-label={`Material price of ${p.name}`}
                          className="bp-cell-input" style={{ ...cellInput, fontSize: 11.5, fontFamily: MONO, fontWeight: 600, textAlign: 'right', color: '#111827' }}
                        />
                      ) : (
                        <span style={{ fontSize: 11.5, fontFamily: MONO, fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                          ${p.price.toFixed(2)}
                        </span>
                      )}

                      <Pill
                        text={pricingSourceOf(p)}
                        tone={pricingSourceOf(p) === 'Supplier quote' ? 'blue' : 'grey'}
                        title={`Price on record came from: ${pricingSourceOf(p)}`}
                      />

                      {/*
                        Hours stay editable with the detail panel gone — a company's
                        own install time is the field an estimator most needs on a
                        catalogue part, and the alternative is a duplicate part that
                        exists only to carry different hours.
                      */}
                      <input
                        type="number" step="0.01" min={0}
                        value={hrs}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value);
                          // A cleared field falls back to the standard rather than
                          // reading as a deliberate zero.
                          if (Number.isFinite(n)) update(p.id, { laborUnit: n });
                        }}
                        aria-label={`Labour hours for ${p.name}`}
                        title={p.laborUnit !== undefined
                          ? `Set on this part. The ${laborTypeOf(p)} standard at ${src} is ${(laborHoursOf({ ...p, laborUnit: undefined })).toFixed(2)}.`
                          : `${laborTypeOf(p)} standard, read at ${src}`}
                        className="bp-cell-input"
                        style={{
                          ...cellInput, fontSize: 11, fontFamily: MONO, textAlign: 'right',
                          color: p.laborUnit !== undefined ? '#B45309' : '#6B7280',
                        }}
                      />

                      {/* Editable in the row: the whole point of the column. */}
                      <select
                        value={src}
                        onChange={(e) => update(p.id, {
                          laborRateSource: e.target.value as LaborRateSource,
                          // Drop a hand-typed figure so the new column is what shows.
                          laborUnit: undefined,
                        })}
                        aria-label={`Labour rate source for ${p.name}`}
                        title={LABOR_SOURCE_NOTE[src]}
                        style={{
                          width: '100%', height: 26, padding: '0 4px', borderRadius: 6,
                          border: `1px solid ${p.laborRateSource ? '#BFDBFE' : '#E5E7EB'}`,
                          background: p.laborRateSource ? '#EFF6FF' : 'white',
                          color: p.laborRateSource ? '#1D4ED8' : '#374151',
                          fontSize: 10.5, outline: 'none', cursor: 'pointer',
                        }}
                      >
                        {LABOR_RATE_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>

                      <span
                        title={`${hrs.toFixed(2)} hrs × $${COMPANY_LABOR_RATE.toFixed(2)} blended crew rate`}
                        style={{ fontSize: 11.5, fontFamily: MONO, fontWeight: 600, color: cost > 0 ? '#111827' : '#D1D5DB', textAlign: 'right' }}
                      >
                        {cost > 0 ? `$${cost.toFixed(2)}` : '—'}
                      </span>

                      {mine ? (
                        <input
                          value={p.mfr}
                          onChange={(e) => update(p.id, { mfr: e.target.value })}
                          aria-label={`Manufacturer of ${p.name}`}
                          placeholder="—"
                          className="bp-cell-input" style={{ ...cellInput, fontSize: 11, color: '#374151' }}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.mfr || '—'}>
                          {p.mfr || '—'}
                        </span>
                      )}

                      <Pill text={p.bomGroup} tone="grey" title={`Files under ${p.bomGroup} in an assembly BOM`} />

                      {mine ? (
                        <input
                          value={p.unit}
                          onChange={(e) => update(p.id, { unit: e.target.value })}
                          aria-label={`Unit of ${p.name}`}
                          className="bp-cell-input" style={{ ...cellInput, fontSize: 10.5, color: '#6B7280' }}
                        />
                      ) : (
                        <span style={{ fontSize: 10.5, color: '#9CA3AF' }}>{p.unit}</span>
                      )}

                      <button
                        onClick={() => toggleFav(p.id)}
                        aria-label={favs.has(p.id) ? `Remove ${p.name} from favourites` : `Add ${p.name} to favourites`}
                        style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Star size={11} fill={favs.has(p.id) ? '#F59E0B' : 'none'} color={favs.has(p.id) ? '#F59E0B' : '#D1D5DB'} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/*
          Detail panel — cascade view only.
          --------------------------------
          The table carries every field the panel held, and each is editable in
          its own cell, so in table mode the panel was a second place to read and
          change the same values while costing 320px of the width the columns
          needed. The cascade still needs it: that view shows a name and a price
          and nothing else.
        */}
        {mode === 'columns' && (
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
                {/*
                  Labour is editable on every part, not only custom ones: a
                  company's own install hours are exactly the thing an estimator
                  needs to tune on a catalogue part, and the alternative is a
                  duplicate part existing only to carry different hours.
                */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 78px', gap: 8 }}>
                  <label>
                    <span style={{ ...HEAD, display: 'block', marginBottom: 4 }}>Labour type</span>
                    <select
                      value={laborTypeOf(selected)}
                      onChange={(e) => update(selected.id, { laborType: e.target.value as LaborType, laborUnit: undefined })}
                      style={{ ...field, background: 'white' }}
                    >
                      {LABOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label>
                    <span style={{ ...HEAD, display: 'block', marginBottom: 4 }}>Hrs / unit</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={laborHoursOf(selected)}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value);
                        // Only a real number is an override; a cleared field keeps
                        // the labour type's standard rather than reading as zero.
                        if (Number.isFinite(n)) update(selected.id, { laborUnit: n });
                      }}
                      style={{ ...field, fontFamily: MONO, textAlign: 'right', background: 'white' }}
                    />
                  </label>
                </div>
                {selected.laborUnit !== undefined && (
                  <button
                    onClick={() => update(selected.id, { laborUnit: undefined })}
                    style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', padding: 0, fontSize: 10.5, color: '#2563EB', cursor: 'pointer' }}
                  >
                    Back to the {laborTypeOf(selected)} standard
                  </button>
                )}

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
        )}
      </div>
    </div>
  );
}
