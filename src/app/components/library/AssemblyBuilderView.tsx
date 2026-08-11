import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Check, ChevronDown, X, Info, Wrench, Sparkles, Plus, AlertTriangle, Palette,
} from 'lucide-react';
import {
  CategoryCode, Assembly, AssemblyStatus, BOMItem, Library, Part,
  CATEGORIES, ASSEMBLY_SUBCATS, typesFor,
  AssemblyConfig, FixtureConfig, DeviceConfig, RacewayConfig, deriveBom, configName, mountHasDrop,
  FIXTURE_TYPES, DEVICE_TYPES, DEVICE_GRADES,
  DIMMING_OPTIONS, EMERGENCY_OPTIONS,
  RACEWAY_TYPES, RACEWAY_SIZES, CONDUCTOR_COUNTS, CONDUCTOR_TYPES, RACEWAY_SUPPORTS,
  BuildKind, kindForCategory, MASTER_PARTS,
} from './libraryData';
import {
  ContextId, PROJECT_CONTEXTS, contextLabel, constraintNote,
  allowedWiring, allowedMounts, allowedBoxes, allowedCovers, allowedRaceways, allowedSupports,
  choicesFor, RoleChoice, PartRole, addOnsFor, AddOn, partToBomItem,
  aiSuggestionsFor, AiSuggestion,
} from './libraryFilters';
import { FilterBar } from './FilterBar';
import { SymbolMark, SymbolPicker } from './SymbolControl';
import { symbolFor, setSymbolFor, adoptSymbol } from './libraryBuild';
import { SaveAssemblyModal } from './SaveAssemblyModal';
import { LiveBOM } from './LiveBOM';
import { PartsLibraryPanel } from './PartsLibraryPanel';

/**
 * Build Mode — a full-screen guided configurator.
 *
 * The estimator states the conditions, picks the item, and answers a short form
 * about how it is installed. Every answer narrows what comes next: the filters
 * decide which wiring methods exist, the wiring method decides whether raceway
 * is even a question, and the parts offered at each step are only those the
 * conditions permit. Nobody browses the catalogue to build an assembly.
 *
 * The bill of material is derived by `deriveBom()` — the same engine the
 * Workbench and the old guided builder use — plus whatever parts and add-ons
 * the estimator picked here. There is no second BOM engine.
 */

// ─── Shared surfaces, matching the rest of the product ────────────────────────

const CARD: React.CSSProperties = {
  border: '1px solid #E5E7EB', borderRadius: 10, background: 'white', overflow: 'hidden',
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5,
};

const FIELD: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 9px', border: '1px solid #E5E7EB',
  borderRadius: 7, fontSize: 12, background: 'white', outline: 'none', boxSizing: 'border-box',
  color: '#374151',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 168 }}>
      <span style={LABEL}>{label}</span>
      {children}
      {hint && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/**
 * A configuration step.
 *
 * Open one at a time, collapsed to a readable summary once answered, and
 * reopenable at any point — no Next/Back gate, because an estimator who
 * realises the wiring was wrong should not have to walk forward to fix it.
 */
function Step({ n, title, summary, done, open, onToggle, children }: {
  n: number; title: string; summary: string; done: boolean;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ ...CARD, marginBottom: 10 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          background: open ? '#F8FBFF' : 'white',
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: 999, flexShrink: 0, fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? '#16A34A' : open ? '#2563EB' : '#F3F4F6',
          color: done || open ? 'white' : '#6B7280',
        }}>
          {done && !open ? <Check size={12} /> : n}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827' }}>{title}</span>
          {!open && summary && (
            <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {summary}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          color="#9CA3AF"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        />
      </button>
      {open && <div style={{ padding: '4px 14px 14px', borderTop: '1px solid #F3F4F6' }}>{children}</div>}
    </div>
  );
}

const REC_TAG: Record<AiSuggestion['severity'] | 'optional', { label: string; color: string; bg: string; border: string }> = {
  code:     { label: 'Code',     color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
  gap:      { label: 'Gap',      color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  advice:   { label: 'Advice',   color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
  optional: { label: 'Optional', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
};

/** Weakest claim first is the wrong way round — code violations lead. */
const REC_ORDER: (AiSuggestion['severity'] | 'optional')[] = ['code', 'gap', 'advice', 'optional'];

export interface RecRow {
  key: string;
  tag: AiSuggestion['severity'] | 'optional';
  name: string;
  reason: string;
  /** "2 EA", where the recommendation knows its own quantity. */
  qty?: string;
  checked: boolean;
  onToggle: () => void;
  /** Only the AI rows can be sent away; a standing optional extra stays offered. */
  onDismiss?: () => void;
}

/**
 * Everything the configuration suggests you add, in one list.
 *
 * This was two panels — "AI suggestions" and "Recommended add-ons" — which put
 * the same kind of decision (should this part be in the assembly?) in two places
 * with two different controls. They are one list now, and every row is a
 * checkbox: tick it and it is in the bill of materials, untick it and it is not.
 * What differs between rows is the *claim*, and that is what the tag carries —
 * Code is a violation, Gap is something missing, Advice is a preference,
 * Optional is a standing extra.
 *
 * The claims still are not the configurator's. The steps are deterministic;
 * this list is inference, so nothing here applies itself.
 */
function RecommendedPanel({ rows }: { rows: RecRow[] }) {
  const ordered = [...rows].sort((a, b) => REC_ORDER.indexOf(a.tag) - REC_ORDER.indexOf(b.tag));
  const outstanding = ordered.filter((r) => !r.checked).length;

  return (
    <div style={{ ...CARD, marginBottom: 10, borderColor: '#DDD6FE' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FAF9FF', borderBottom: '1px solid #EDE9FE' }}>
        <Sparkles size={13} color="#7C3AED" />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1 }}>Recommended add-ons</span>
        {outstanding > 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '1px 7px', borderRadius: 999 }}>
            {outstanding}
          </span>
        )}
      </div>

      {ordered.length === 0 ? (
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={12} color="#16A34A" />
          <span style={{ fontSize: 11, color: '#6B7280' }}>
            Nothing to add — the configuration looks complete for these conditions.
          </span>
        </div>
      ) : (
        <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ordered.map((r) => {
            const tag = REC_TAG[r.tag];
            return (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}>
                <input
                  type="checkbox"
                  checked={r.checked}
                  onChange={r.onToggle}
                  aria-label={`Add ${r.name}`}
                  style={{ accentColor: '#7C3AED', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
                  color: tag.color, background: tag.bg, border: `1px solid ${tag.border}`,
                }}>
                  {tag.label}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#111827' }}>{r.name}</span>
                  <span style={{ display: 'block', fontSize: 10, color: '#9CA3AF', lineHeight: '14px' }}>{r.reason}</span>
                </span>
                {r.qty && (
                  <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', flexShrink: 0 }}>
                    {r.qty}
                  </span>
                )}
                {r.onDismiss && (
                  <button
                    onClick={r.onDismiss}
                    aria-label={`Dismiss: ${r.name}`}
                    title="Not relevant here"
                    style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <X size={11} color="#D1D5DB" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '0 14px 11px', fontSize: 10, color: '#9CA3AF', lineHeight: '14px' }}>
        <Info size={10} style={{ flexShrink: 0, marginTop: 1 }} />
        Suggested from the configuration and its conditions. Nothing reaches the bill of
        materials until you tick it.
      </div>
    </div>
  );
}

function RolePicker({ choice, selectedId, onSelect, search }: {
  choice: RoleChoice;
  selectedId: string | undefined;
  onSelect: (role: PartRole, part: Part | null) => void;
  search: string;
}) {
  const q = search.trim().toLowerCase();
  const parts = q
    ? choice.parts.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    : choice.parts;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={LABEL}>{choice.label}</span>
        <span style={{ fontSize: 10, color: '#9CA3AF', flex: 1 }}>
          {parts.length} compatible {parts.length === 1 ? 'part' : 'parts'}
        </span>
      </div>
      {parts.length === 0 ? (
        <div style={{ fontSize: 11, color: '#9CA3AF', padding: '8px 10px', border: '1px dashed #E5E7EB', borderRadius: 7 }}>
          Nothing in the catalogue matches this role under the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {parts.map((p) => {
            const on = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(choice.role, on ? null : p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 7,
                  cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${on ? '#2563EB' : '#E5E7EB'}`,
                  background: on ? '#F8FBFF' : 'white',
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
                  <span style={{ display: 'block', fontSize: 12, color: '#111827', fontWeight: on ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {p.code} · {p.mfr} · ${p.price.toFixed(2)}/{p.unit}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Build Mode ───────────────────────────────────────────────────────────────

export function AssemblyBuilderView({
  activeLib, libraries, viewSwitcher, libraryPicker, onSaved, existing,
}: {
  activeLib: Library;
  libraries: Library[];
  /** The Browse | Build toggle, rendered here so the mode never leaves the workspace. */
  viewSwitcher: React.ReactNode;
  libraryPicker?: React.ReactNode;
  onSaved: (a: Assembly, cat: CategoryCode, libraryId: string) => void;
  existing?: { name: string; cat: CategoryCode; libraryId?: string }[];
}) {

  /** Conditions start from the project and can be overridden here. */
  const [active, setActive] = useState<ContextId[]>(PROJECT_CONTEXTS);
  /**
   * The branch being built. Category is the first decision because it decides
   * which form the rest of the configuration takes, and where the assembly
   * files when it is saved.
   */
  const [cat, setCat] = useState<CategoryCode>('BPC-01');
  const [subcat, setSubcat] = useState<string>(ASSEMBLY_SUBCATS['BPC-01']?.[0] ?? '');
  const [type, setType] = useState<string>('');
  const kind: BuildKind = kindForCategory(cat);
  const [openStep, setOpenStep] = useState(1);
  const [showSave, setShowSave] = useState(false);
  const [touched, setTouched] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);

  // Fixture configuration.
  const [fxApp, setFxApp] = useState('ACT Ceiling');
  const [fxType, setFxType] = useState(FIXTURE_TYPES[0]);
  const [fxMount, setFxMount] = useState('T-Bar Drop-In');
  const [fxDrop, setFxDrop] = useState('2');
  const [fxWiring, setFxWiring] = useState('MC-PCS 12/3');
  const [fxRun, setFxRun] = useState('8');
  const [fxWaste, setFxWaste] = useState('5');
  const [fxDimming, setFxDimming] = useState(DIMMING_OPTIONS[0]);
  const [fxEmerg, setFxEmerg] = useState(EMERGENCY_OPTIONS[0]);

  // Device configuration.
  const [dvType, setDvType] = useState(DEVICE_TYPES[0]);
  const [dvGrade, setDvGrade] = useState(DEVICE_GRADES[0]);
  const [dvWiring, setDvWiring] = useState('MC 12/2');
  const [dvRun, setDvRun] = useState('6');
  const [dvBox, setDvBox] = useState('New Work 1-Gang Metal Box');
  const [dvCover, setDvCover] = useState('Standard Cover');

  /** Parts chosen per role, and add-ons ticked in the secondary area. */
  const [rolePicks, setRolePicks] = useState<Partial<Record<PartRole, Part>>>({});
  const [addOnIds, setAddOnIds] = useState<Set<string>>(new Set());
  /**
   * Parts the estimator added by hand — from the rail, a drop, or an accepted
   * suggestion.
   *
   * Kept separate from `bomEdits` because the two mean different things. An
   * edited quantity is a tweak to a derived row and is rightly discarded when
   * the spec regenerates; an added part is a decision, and losing it because a
   * filter moved is how an estimator stops trusting the panel.
   */
  const [manualItems, setManualItems] = useState<BOMItem[]>([]);

  /** Rows the estimator edited or removed directly on the BOM. */
  const [bomEdits, setBomEdits] = useState<BOMItem[] | null>(
    null,
  );
  // ── Raceway / cable run ──────────────────────────────────────────────────
  const [rwType, setRwType] = useState(RACEWAY_TYPES[0]);
  const [rwSize, setRwSize] = useState(RACEWAY_SIZES[1]);
  const [rwConductors, setRwConductors] = useState(CONDUCTOR_COUNTS[1]);
  const [rwConductor, setRwConductor] = useState(CONDUCTOR_TYPES[1]);
  const [rwSupport, setRwSupport] = useState(RACEWAY_SUPPORTS[0]);
  const [rwRun, setRwRun] = useState('100');
  const [rwWaste, setRwWaste] = useState('5');

  /**
   * The takeoff symbol for the assembly being built.
   *
   * Held against a stable draft key, because there is no assembly id until the
   * save completes — `adoptSymbol` re-keys it onto the real id at that point.
   * Same store and same picker Browse uses, so the mark chosen here is the mark
   * that shows up on the plan.
   */
  const draftSymbolKey = useRef(`build-draft-${Math.round(performance.now())}`).current;
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [, bumpSymbol] = useState(0);

  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  /** Keeps hand-added rows unique even when the same part is added twice. */
  const manualSeq = useRef(0);

  const mark = () => setTouched(true);

  // ── What the conditions permit ─────────────────────────────────────────────
  const wiringOpts = useMemo(() => allowedWiring(active), [active]);
  const mountOpts = useMemo(() => allowedMounts(active), [active]);
  const boxOpts = useMemo(() => allowedBoxes(active), [active]);
  const racewayOpts = useMemo(() => allowedRaceways(active), [active]);
  const supportOpts = useMemo(() => allowedSupports(active), [active]);
  const coverOpts = useMemo(() => allowedCovers(active), [active]);
  const note = constraintNote(active);

  /*
   * A filter change can outlaw the option already selected. Fall back to the
   * first permitted one rather than leaving a value on screen that the rules
   * say cannot be used — a stale selection is how a forbidden part reaches a bid.
   */
  const fxWiringSafe = wiringOpts.some((o) => o.label === fxWiring) ? fxWiring : (wiringOpts[0]?.label ?? 'Measure Separately');
  const dvWiringSafe = wiringOpts.some((o) => o.label === dvWiring) ? dvWiring : (wiringOpts[0]?.label ?? 'Measure Separately');
  const fxMountSafe = mountOpts.some((o) => o.label === fxMount) ? fxMount : (mountOpts[0]?.label ?? '');
  const dvBoxSafe = boxOpts.some((o) => o.label === dvBox) ? dvBox : (boxOpts[0]?.label ?? '');
  const dvCoverSafe = coverOpts.some((o) => o.label === dvCover) ? dvCover : (coverOpts[0]?.label ?? '');
  // A filter change can outlaw the raceway or support already chosen; fall back
  // rather than leaving a forbidden selection on screen for someone to save.
  const rwTypeSafe = racewayOpts.includes(rwType) ? rwType : (racewayOpts[0] ?? '');
  const rwSupportSafe = supportOpts.includes(rwSupport) ? rwSupport : (supportOpts[0] ?? '');

  // ── The configuration, and the BOM the shared engine derives from it ───────
  /** Parts chosen for a generic category, which has no parametric core. */
  const genericCore: BOMItem[] = useMemo(() => (kind !== 'generic' ? [] : [{
    id: 'g1',
    group: 'Primary Item',
    name: type || subcat || CATEGORIES.find((c) => c.code === cat)?.name || 'Assembly',
    code: 'ITEM-CFG',
    qty: 1,
    baseQty: 1,
    unit: 'EA',
    required: true,
    priceStatus: 'ok',
  }]), [kind, type, subcat, cat]);

  const cfg: AssemblyConfig = kind === 'raceway'
    ? {
      kind: 'raceway', app: active[0] ? contextLabel(active[0]) : 'Metal Framing',
      raceway: rwTypeSafe, size: rwSize, conductors: rwConductors, conductor: rwConductor,
      support: rwSupportSafe, run: rwRun, waste: rwWaste,
    } as RacewayConfig
    : kind === 'fixture'
    ? {
      kind: 'fixture', app: fxApp, type: fxType, mount: fxMountSafe, drop: fxDrop,
      wiring: fxWiringSafe, run: fxRun, waste: fxWaste, dimming: fxDimming, emergency: fxEmerg,
    } as FixtureConfig
    : {
      kind: 'device', app: active[0] ? contextLabel(active[0]) : 'Metal Framing', type: dvType,
      grade: dvGrade, wiring: dvWiringSafe, run: dvRun, box: dvBoxSafe, cover: dvCoverSafe,
    } as DeviceConfig;

  const choices = useMemo(() => choicesFor({
    kind,
    wiring: kind === 'fixture' ? fxWiringSafe : dvWiringSafe,
    mount: fxMountSafe,
    dimming: fxDimming,
    active,
  }), [kind, fxWiringSafe, dvWiringSafe, fxMountSafe, fxDimming, active]);

  const addOns = useMemo(() => addOnsFor(active, fxMountSafe, kind), [active, fxMountSafe, kind]);

  const derived: BOMItem[] = useMemo(() => {
    // The shared engine where it applies; the primary item alone where it does not.
    const core = kind === 'generic' ? genericCore : deriveBom(cfg);
    const picked = (Object.entries(rolePicks) as [PartRole, Part][])
      .filter(([, p]) => !!p)
      .map(([role, p]) => partToBomItem(p, role, 1));
    const extras = addOns
      .filter((a) => addOnIds.has(a.id))
      .map<BOMItem>((a) => ({
        id: `ao-${a.id}`, group: a.bomGroup, name: a.name, code: a.code,
        qty: a.qty, unit: a.unit, required: false, priceStatus: 'ok',
      }));
    return [...core, ...picked, ...extras, ...manualItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cfg), kind, genericCore, rolePicks, addOnIds, addOns, manualItems]);

  /*
   * Direct BOM edits win until the configuration moves again — the estimator
   * can retype a quantity or delete a row, and a later spec change regenerates
   * from the engine rather than preserving a stale hand edit forever.
   */
  const bom = bomEdits ?? derived;
  const derivedKey = useMemo(() => derived.map((i) => `${i.id}:${i.qty}`).join('|'), [derived]);
  const lastKey = useRef(derivedKey);
  if (lastKey.current !== derivedKey) {
    lastKey.current = derivedKey;
    if (bomEdits) setBomEdits(null);
  }

  /*
   * The name follows the configuration until the estimator types one, then it
   * is theirs. A duplicate opens with "Copy of …" already filled in and
   * editable — nobody should have to retype the name to make a variant.
   */
  const derivedName = kind === 'generic'
    ? [type || subcat, CATEGORIES.find((c) => c.code === cat)?.name].filter(Boolean).join(' – ')
    : configName(cfg);
  const name = nameOverride ?? derivedName;

  const [dismissedAi, setDismissedAi] = useState<Set<string>>(new Set());

  /**
   * Recomputed from what is actually on the bench, so accepting one suggestion
   * clears it and any it satisfied — the panel reflects the assembly rather
   * than a list frozen when the step was opened.
   */
  const aiSuggestions = useMemo(() => aiSuggestionsFor({
    kind,
    active,
    /*
     * A raceway build answers with its own raceway type and run length. Feeding
     * the fixture fields here made the conduit rules read a wiring method the
     * estimator never chose — and the pull-box advice measure the wrong run.
     */
    wiring: kind === 'raceway' ? rwTypeSafe : kind === 'device' ? dvWiringSafe : fxWiringSafe,
    mount: kind === 'raceway' ? rwSupportSafe : fxMountSafe,
    runLF: parseFloat(kind === 'raceway' ? rwRun : kind === 'device' ? dvRun : fxRun) || 0,
    dropFt: kind !== 'raceway' && mountHasDrop(fxMountSafe) ? parseFloat(fxDrop) || 0 : 0,
    dimming: kind === 'raceway' ? 'None' : fxDimming,
    emergency: kind === 'raceway' ? 'None' : fxEmerg,
    presentCodes: bom.map((i) => i.code),
    bomGroups: [...new Set(bom.map((i) => i.group))],
  }).filter((sg) => !dismissedAi.has(sg.id)),
  [kind, active, dvWiringSafe, fxWiringSafe, fxMountSafe, dvRun, fxRun, fxDrop, fxDimming, fxEmerg,
    rwTypeSafe, rwSupportSafe, rwRun, bom, dismissedAi]);

  /**
   * Accepting a suggestion is an ordinary hand-added row.
   *
   * The accepted suggestion is kept here as well, because `aiSuggestionsFor`
   * recomputes from what is on the bench and would drop it the moment it is
   * satisfied. In a list of checkboxes a row that disappears when ticked reads
   * as a bug, so the row stays, ticked, and unticking takes the part back out.
   */
  const [appliedAi, setAppliedAi] = useState<Record<string, AiSuggestion>>({});

  function toggleAiSuggestion(sg: AiSuggestion) {
    mark();
    if (appliedAi[sg.id]) {
      setManualItems((prev) => prev.filter((i) => !i.id.startsWith(`ai-${sg.id}-`)));
      setAppliedAi(({ [sg.id]: _gone, ...rest }) => rest);
      return;
    }
    if (!sg.add) { setDismissedAi((prev) => new Set(prev).add(sg.id)); return; }
    setManualItems((prev) => [...prev, {
      id: `ai-${sg.id}-${manualSeq.current++}`,
      group: sg.add!.bomGroup,
      name: sg.add!.name,
      code: sg.add!.code,
      qty: sg.add!.qty,
      unit: sg.add!.unit,
      required: false,
      priceStatus: 'ok',
    }]);
    setAppliedAi((prev) => ({ ...prev, [sg.id]: sg }));
    toast.success('Added to the bill of materials', { description: sg.add.name });
  }

  /**
   * The one list the estimator reads: inferred suggestions and standing optional
   * extras, each a checkbox, ordered by how strong the claim is.
   */
  const aiCodes = useMemo(
    () => new Set([...Object.values(appliedAi), ...aiSuggestions].map((sg) => sg.add?.code).filter(Boolean) as string[]),
    [appliedAi, aiSuggestions],
  );

  const recommendations = useMemo<RecRow[]>(() => [
    ...Object.values(appliedAi).map((sg) => ({
      key: `ai-${sg.id}`,
      tag: sg.severity,
      name: sg.add?.name ?? sg.title,
      reason: sg.reason,
      qty: sg.add ? `${sg.add.qty} ${sg.add.unit}` : undefined,
      checked: true,
      onToggle: () => toggleAiSuggestion(sg),
    })),
    ...aiSuggestions.filter((sg) => !appliedAi[sg.id]).map((sg) => ({
      key: `ai-${sg.id}`,
      tag: sg.severity,
      name: sg.add?.name ?? sg.title,
      reason: sg.reason,
      qty: sg.add ? `${sg.add.qty} ${sg.add.unit}` : undefined,
      checked: false,
      onToggle: () => toggleAiSuggestion(sg),
      onDismiss: () => setDismissedAi((prev) => new Set(prev).add(sg.id)),
    })),
    /*
     * A standing optional extra and an inferred suggestion can name the same
     * part — an independent support wire is both "offered for suspended grid"
     * and "required by code here". Two cards hid that; one list makes it a
     * visible duplicate, and ticking both would put the part in twice. The
     * stronger claim wins, and the optional twin drops out.
     */
    ...addOns
      .filter((a) => !aiCodes.has(a.code))
      .map((a) => ({
        key: `ao-${a.id}`,
        tag: 'optional' as const,
        name: a.name,
        reason: a.reason,
        qty: `${a.qty} ${a.unit}`,
        checked: addOnIds.has(a.id),
        onToggle: () => toggleAddOn(a),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [appliedAi, aiSuggestions, addOns, addOnIds, aiCodes]);

  /** Engine rows, then the estimator's picks, then the ticked add-ons. */

  const seedCat: CategoryCode = cat;

  function pickRole(role: PartRole, part: Part | null) {
    mark();
    setRolePicks((prev) => {
      const next = { ...prev };
      if (part) next[role] = part; else delete next[role];
      return next;
    });
  }

  /**
   * A part added by hand, from the rail or a drop.
   *
   * It becomes a BOM edit rather than part of the derived core, so it survives
   * as the estimator's own line — and a later spec change regenerates the
   * derived rows around it rather than silently discarding it.
   */
  /**
   * Swap the selected row for another part.
   *
   * A BOM edit rather than a role pick, because the target may be any row —
   * engine-derived, hand-added or an accepted recommendation — and `bomEdits` is
   * the one override that covers all three. Like every other direct edit it
   * gives way when the configuration itself changes.
   */
  function replaceSelected(part: Part) {
    if (!selectedBomId) {
      toast.error('Select a component first', {
        description: 'Click a row in the bill of materials, then Replace.',
      });
      return;
    }
    const target = bom.find((i) => i.id === selectedBomId);
    mark();
    setBomEdits(bom.map((i) => (i.id === selectedBomId
      ? { ...i, name: part.name, code: part.code, unit: part.unit, priceStatus: 'ok' as const }
      : i)));
    toast.success('Component replaced', { description: `${target?.name ?? 'Component'} → ${part.name}` });
  }

  function addPartToBom(part: Part) {
    mark();
    setManualItems((prev) => [...prev, {
      id: `manual-${part.id}-${manualSeq.current++}`,
      group: part.bomGroup,
      name: part.name,
      code: part.code,
      qty: 1,
      unit: part.unit,
      required: false,
      priceStatus: 'ok',
    }]);
    toast.success('Added to the bill of materials', { description: part.name });
  }

  function toggleAddOn(a: AddOn) {
    mark();
    setAddOnIds((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
      return next;
    });
  }

  /**
   * The per-role part pickers — mounting, supports, wiring, raceway, fittings,
   * grounding, controls, boxes — are parked.
   *
   * The steps are configuration only for now: the estimator answers the form,
   * and anything the derived BOM does not cover comes from the parts rail. The
   * selection engine (`choicesFor`) and `RolePicker` are left intact behind this
   * flag so restoring them is one line, not a rebuild.
   */
  const SHOW_ROLE_PICKERS = false;

  const rolesIn = (roles: PartRole[]) => choices.filter((c) => roles.includes(c.role));

  const stepBlock = (roles: PartRole[]) => (SHOW_ROLE_PICKERS
    ? rolesIn(roles).map((c) => (
      <RolePicker
        key={c.role}
        choice={c}
        selectedId={rolePicks[c.role]?.id ?? c.defaultPartId}
        onSelect={pickRole}
        search=""
      />
    ))
    : null);

  // ── Steps ─────────────────────────────────────────────────────────────────
  const subcats = ASSEMBLY_SUBCATS[cat] ?? [];
  const types = subcat ? typesFor(cat, subcat) : [];

  /**
   * Category → Subcategory → Type, then the options that branch implies.
   *
   * The dropdowns narrow before anything is offered: picking a branch first
   * turns "every fixture we sell" into the handful that belong under it, which
   * is the difference between choosing and searching.
   */
  const branchFields = (
    <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
      <Field label="Category">
        <select
          value={cat}
          onChange={(e) => {
            const next = e.target.value as CategoryCode;
            setCat(next);
            setSubcat(ASSEMBLY_SUBCATS[next]?.[0] ?? '');
            setType('');
            setRolePicks({});
            mark();
          }}
          style={FIELD}
        >
          {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
        </select>
      </Field>
      {subcats.length > 0 && (
        <Field label="Subcategory">
          <select value={subcat} onChange={(e) => { setSubcat(e.target.value); setType(''); mark(); }} style={FIELD}>
            {subcats.map((sc) => <option key={sc}>{sc}</option>)}
          </select>
        </Field>
      )}
      {types.length > 0 && (
        <Field label="Type">
          <select value={type} onChange={(e) => { setType(e.target.value); mark(); }} style={FIELD}>
            <option value="">All types</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      )}
    </div>
  );

  /**
   * Application values on offer. The active building conditions where they are
   * set, so the field agrees with the filters; otherwise the standard contexts.
   */
  const applicationOptions = useMemo(() => {
    const fromFilters = active.map(contextLabel);
    return fromFilters.length ? fromFilters : ['ACT Ceiling', 'Metal Framing', 'Wood Framing', 'Concrete'];
  }, [active]);

  /** Item types the chosen branch implies, rather than the whole family. */
  const narrowedFixtureTypes = useMemo(() => {
    const pool = FIXTURE_TYPES;
    const key = `${subcat} ${type}`.toLowerCase();
    const hit = pool.filter((t) => {
      const n = t.toLowerCase();
      if (/troffer/.test(key)) return /troffer/.test(n);
      if (/downlight/.test(key)) return /downlight/.test(n);
      if (/emergency|exit/.test(key)) return /emergency/.test(n);
      if (/linear|pendant/.test(key)) return /linear|pendant/.test(n);
      if (/surface|high bay/.test(key)) return /surface/.test(n);
      return true;
    });
    return hit.length ? hit : pool;
  }, [subcat, type]);

  const narrowedDeviceTypes = useMemo(() => {
    const key = `${subcat} ${type}`.toLowerCase();
    const hit = DEVICE_TYPES.filter((t) => {
      const n = t.toLowerCase();
      if (/gfci/.test(key)) return /gfci/.test(n);
      if (/hospital/.test(key)) return /hospital/.test(n);
      if (/switch/.test(key)) return /switch|sensor/.test(n);
      if (/data/.test(key)) return /usb|data/.test(n);
      if (/receptacle|duplex/.test(key)) return /receptacle/.test(n);
      return true;
    });
    return hit.length ? hit : DEVICE_TYPES;
  }, [subcat, type]);

  const genericSteps = [
    {
      n: 1, title: 'Selection', done: !!subcat,
      summary: [CATEGORIES.find((c) => c.code === cat)?.name, subcat, type].filter(Boolean).join(' · '),
      body: (
        <>
          {branchFields}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 12, fontSize: 11, color: '#6B7280', lineHeight: '16px' }}>
            <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            This category is assembled from parts rather than derived from a parametric
            template. Set the configuration below, then add its components from the parts library.
          </div>
        </>
      ),
    },
    {
      n: 2, title: 'Wiring & raceway', done: true,
      summary: fxWiringSafe === 'Measure Separately' ? 'Measure separately' : `${fxWiringSafe} · ${fxRun} LF`,
      body: (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="Wiring method" hint={note ?? undefined}>
              <select value={fxWiringSafe} onChange={(e) => { setFxWiring(e.target.value); mark(); }} style={FIELD}>
                {wiringOpts.map((o) => <option key={o.id}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Run length (LF)">
              <input type="number" min={0} value={fxRun} onChange={(e) => { setFxRun(e.target.value); mark(); }}
                style={{ ...FIELD, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }} />
            </Field>
          </div>
          {stepBlock(['wiring', 'raceway', 'fittings', 'grounding'])}
        </>
      ),
    },
    {
      n: 3, title: 'Mounting & supports', done: true,
      summary: fxMountSafe || 'Not set',
      body: (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="Mount method">
              <select value={fxMountSafe} onChange={(e) => { setFxMount(e.target.value); mark(); }} style={FIELD}>
                {mountOpts.map((o) => <option key={o.id}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          {stepBlock(['mounting', 'supports', 'boxes'])}
        </>
      ),
    },
  ];

  /*
   * Raceway / cable runs.
   *
   * A conduit run answers a different set of questions from a fixture, and the
   * standard form asked none of them — so BPC-03 gets its own guided steps
   * rather than the generic "pick a primary item" shell.
   *
   * Everything the run needs is on screen at once: what raceway, what size,
   * what is pulled through it, how it is attached and how long it is. The
   * couplings, connectors, straps and anchors that follow are derived into the
   * Live BOM as the answers change — the estimator never reads a parts list to
   * find them. The parts rail stays for whatever the rules did not predict.
   */
  const racewaySteps = [
    {
      n: 1, title: 'Raceway', done: !!rwTypeSafe,
      summary: `${rwSize} ${rwTypeSafe}`,
      body: (
        <>
          {branchFields}
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field
              label="Raceway / conduit type"
              hint={racewayOpts.length < RACEWAY_TYPES.length ? note ?? 'Narrowed by the active conditions.' : undefined}
            >
              <select value={rwTypeSafe} onChange={(e) => { setRwType(e.target.value); mark(); }} style={FIELD}>
                {racewayOpts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Conduit size">
              <select value={rwSize} onChange={(e) => { setRwSize(e.target.value); mark(); }} style={FIELD}>
                {RACEWAY_SIZES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        </>
      ),
    },
    {
      n: 2, title: 'Conductors', done: true,
      summary: (parseInt(rwConductors, 10) || 0) > 0
        ? `${rwConductors} × ${rwConductor}`
        : 'No conductors',
      body: (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="Number of conductors">
              <select value={rwConductors} onChange={(e) => { setRwConductors(e.target.value); mark(); }} style={FIELD}>
                {CONDUCTOR_COUNTS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Conductor type / size">
              <select value={rwConductor} onChange={(e) => { setRwConductor(e.target.value); mark(); }} style={FIELD}>
                {CONDUCTOR_TYPES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          {/*
            Said plainly rather than implied: this count is the estimator's, and
            nothing here checks it against the trade size. Conduit fill is a code
            calculation and guessing at one would be worse than not having it.
          */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10, fontSize: 11, color: '#6B7280', lineHeight: '16px' }}>
            <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            Conductor count is taken as entered — conduit fill is not calculated here.
          </div>
        </>
      ),
    },
    {
      n: 3, title: 'Structure & attachment', done: !!rwSupportSafe,
      summary: rwSupportSafe || 'Not set',
      body: (
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <Field
            label="Attachment type"
            hint={supportOpts.length < RACEWAY_SUPPORTS.length ? 'Only the methods the structure allows.' : undefined}
          >
            <select value={rwSupportSafe} onChange={(e) => { setRwSupport(e.target.value); mark(); }} style={FIELD}>
              {supportOpts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>
      ),
    },
    {
      n: 4, title: 'Run', done: (parseFloat(rwRun) || 0) > 0,
      summary: `${rwRun} LF · ${rwWaste}% waste`,
      body: (
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <Field label="Run length (LF)">
            <input type="number" min={0} value={rwRun} onChange={(e) => { setRwRun(e.target.value); mark(); }}
              style={{ ...FIELD, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }} />
          </Field>
          <Field label="Waste %">
            <input type="number" min={0} value={rwWaste} onChange={(e) => { setRwWaste(e.target.value); mark(); }}
              style={{ ...FIELD, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }} />
          </Field>
        </div>
      ),
    },
  ];

  const fixtureSteps = [
    {
      n: 1, title: 'Selection', done: !!fxType,
      summary: `${fxType} · ${fxApp}`,
      body: (
        <>
          {branchFields}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <Field label="Application (C2)">
              <select value={fxApp} onChange={(e) => { setFxApp(e.target.value); mark(); }} style={FIELD}>
                {applicationOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Fixture type">
              <select value={fxType} onChange={(e) => { setFxType(e.target.value); mark(); }} style={FIELD}>
                {narrowedFixtureTypes.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        </>
      ),
    },
    {
      n: 2, title: 'Mounting', done: !!fxMountSafe,
      summary: [fxMountSafe, mountHasDrop(fxMountSafe) && fxDrop ? `${fxDrop} ft drop` : ''].filter(Boolean).join(' · '),
      body: (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="Mount method" hint={mountOpts.length < 3 ? 'Narrowed by the active filters.' : undefined}>
              <select value={fxMountSafe} onChange={(e) => { setFxMount(e.target.value); mark(); }} style={FIELD}>
                {mountOpts.map((o) => <option key={o.id}>{o.label}</option>)}
              </select>
            </Field>
            {/*
              Always shown, as specified. It only puts hardware on the bill when
              the mount actually hangs the fixture, so the hint says when it is
              being recorded but not counted rather than leaving a dead field.
            */}
            <Field
              label="Drop length (LF)"
              hint={mountHasDrop(fxMountSafe) ? undefined : 'Not counted with this mount method.'}
            >
              <input
                type="number" min={0} step={0.5} value={fxDrop}
                onChange={(e) => { setFxDrop(e.target.value); mark(); }}
                style={{ ...FIELD, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}
              />
            </Field>
          </div>
          {stepBlock(['mounting', 'supports'])}
        </>
      ),
    },
    {
      n: 3, title: 'Wiring', done: !!fxWiringSafe,
      summary: fxWiringSafe === 'Measure Separately'
        ? 'Measure separately'
        : `${fxWiringSafe} · ${fxRun} LF · ${fxWaste}% waste`,
      body: (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="Wiring method" hint={note ?? undefined}>
              <select value={fxWiringSafe} onChange={(e) => { setFxWiring(e.target.value); mark(); }} style={FIELD}>
                {wiringOpts.map((o) => <option key={o.id}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Run length (LF)">
              <input type="number" min={0} value={fxRun} onChange={(e) => { setFxRun(e.target.value); mark(); }}
                style={{ ...FIELD, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }} />
            </Field>
            <Field label="Waste %">
              <input type="number" min={0} value={fxWaste} onChange={(e) => { setFxWaste(e.target.value); mark(); }}
                style={{ ...FIELD, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }} />
            </Field>
          </div>
          {stepBlock(['wiring', 'raceway', 'fittings', 'grounding'])}
        </>
      ),
    },
    {
      n: 4, title: 'Options', done: true,
      summary: [fxDimming !== 'None' ? fxDimming : '', fxEmerg !== 'None' ? fxEmerg : 'No emergency']
        .filter(Boolean).join(' · '),
      body: (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="Dimming">
              <select value={fxDimming} onChange={(e) => { setFxDimming(e.target.value); mark(); }} style={FIELD}>
                {DIMMING_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Emergency">
              <select value={fxEmerg} onChange={(e) => { setFxEmerg(e.target.value); mark(); }} style={FIELD}>
                {EMERGENCY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          {stepBlock(['controls'])}
        </>
      ),
    },
  ];

  const deviceSteps = [
    {
      n: 1, title: 'Selection', done: !!dvType,
      summary: `${dvType} · ${dvGrade}`,
      body: (
        <>
          {branchFields}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <Field label="Device type">
              <select value={dvType} onChange={(e) => { setDvType(e.target.value); mark(); }} style={FIELD}>
                {narrowedDeviceTypes.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Rating / grade">
              <select value={dvGrade} onChange={(e) => { setDvGrade(e.target.value); mark(); }} style={FIELD}>
                {DEVICE_GRADES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        </>
      ),
    },
    {
      n: 2, title: 'Wiring', done: !!dvWiringSafe,
      summary: `${dvWiringSafe} · ${dvRun} LF`,
      body: (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="Wiring method" hint={note ?? undefined}>
              <select value={dvWiringSafe} onChange={(e) => { setDvWiring(e.target.value); mark(); }} style={FIELD}>
                {wiringOpts.map((o) => <option key={o.id}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Run length (LF)">
              <input type="number" min={0} value={dvRun} onChange={(e) => { setDvRun(e.target.value); mark(); }}
                style={{ ...FIELD, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }} />
            </Field>
          </div>
          {stepBlock(['wiring', 'raceway', 'fittings', 'grounding'])}
        </>
      ),
    },
    {
      n: 3, title: 'Box & Cover', done: !!dvBoxSafe,
      summary: `${dvBoxSafe} · ${dvCoverSafe}`,
      body: (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="Box type" hint={boxOpts.length < 3 ? 'Narrowed by the active filters.' : undefined}>
              <select value={dvBoxSafe} onChange={(e) => { setDvBox(e.target.value); mark(); }} style={FIELD}>
                {boxOpts.map((o) => <option key={o.id}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Cover / plate">
              <select value={dvCoverSafe} onChange={(e) => { setDvCover(e.target.value); mark(); }} style={FIELD}>
                {coverOpts.map((o) => <option key={o.id}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          {stepBlock(['boxes', 'mounting', 'supports'])}
        </>
      ),
    },
  ];

  const steps = kind === 'fixture' ? fixtureSteps
    : kind === 'device' ? deviceSteps
    : kind === 'raceway' ? racewaySteps
    : genericSteps;

  return (
    /*
     * A cooler canvas and an indigo top rule mark Build as its own workspace.
     * The surfaces, type, spacing and blue accent are the product's own — only
     * the room changes, not the language.
     */
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', background: '#F4F5FB' }}>
      {/* ── Header ── */}
      {/*
        Byte-identical padding to Browse's toolbar, and the same controls in the
        same order — identity block, filters, flexible gap, right-hand cluster —
        so every shared control, the Browse | Build toggle included, lands on the
        same pixel in both modes. Change one and re-measure the other.
      */}
      <div className="bp-toolbar" style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        {/* The Build mark: same design language, unmistakably a different room. */}
        <span style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: '#EEF2FF', border: '1px solid #C7D2FE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Wrench size={14} color="#4F46E5" />
        </span>

        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Build Assembly
        </div>

        {/* Editable before saving, so the derived name is a starting point. */}
        <input
          value={name}
          onChange={(e) => { setNameOverride(e.target.value); mark(); }}
          aria-label="Assembly name"
          placeholder="Assembly name"
          style={{
            height: 34, width: 200, minWidth: 130, padding: '0 10px', borderRadius: 8, fontSize: 12,
            border: '1px solid #E5E7EB', background: 'white',
            color: '#111827', outline: 'none', boxSizing: 'border-box', flexShrink: 1,
          }}
        />

        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
          color: touched ? '#B45309' : '#6B7280',
          background: touched ? '#FFFBEB' : '#F3F4F6',
          border: `1px solid ${touched ? '#FDE68A' : '#E5E7EB'}`,
        }}>
          {touched ? 'UNSAVED' : 'DRAFT'}
        </span>

        {/*
          Filters are not decoration here — they remove options from the
          configuration dropdowns — so they sit in the toolbar beside what they
          constrain, not on a row of their own. `compact` is what Browse passes:
          chips stay on the row and clip when it is tight — wrapping them would
          deepen the toolbar, which is the thing this layout is avoiding. The
          note is off because the Wiring step already prints it on the field it
          actually constrains.
        */}
        <div style={{ flex: 1, minWidth: 8, display: 'flex' }}>
          <FilterBar
            active={active}
            onChange={(next) => { setActive(next); mark(); }}
            inherited={PROJECT_CONTEXTS}
            showNote={false}
            scrollChips
          />
        </div>

        {libraryPicker}

        {/*
          Last in the toolbar, exactly as in Browse. Both share the same padding
          and the control is the same width either way, so right-aligning it
          puts the toggle on the same pixel in both modes.
        */}
        {viewSwitcher}
      </div>

      {/* ── Body: parts library | guided configuration | live BOM ── */}
      <div className="bp-lib" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/*
          Left rail. The guided steps offer what the configuration implies; this
          is where the estimator reaches for what it did not.
        */}
        <div style={{ width: 258, minWidth: 220, flexShrink: 0, borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PartsLibraryPanel
            contexts={active}
            onAdd={addPartToBom}
            onReplace={replaceSelected}
            canReplace={!!selectedBomId}
          />
        </div>

        {/*
          The three columns are Parts library | Configure | Live Bill of
          Materials. The outer two named themselves; this one did not, which left
          the middle of the screen as the only unlabelled thing on it.
        */}
        <div className="bp-lib-centre" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1 }}>Configure</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {steps.filter((st) => st.done).length} of {steps.length} steps set
            </span>
          </div>

          <div className="bp-lib-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
          {steps.map((s) => (
            <Step
              key={s.n}
              n={s.n}
              title={s.title}
              summary={s.summary}
              done={s.done}
              open={openStep === s.n}
              onToggle={() => setOpenStep(openStep === s.n ? 0 : s.n)}
            >
              {s.body}
            </Step>
          ))}

          <RecommendedPanel rows={recommendations} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 12, fontSize: 10, color: '#9CA3AF', lineHeight: '15px' }}>
            <Info size={10} style={{ flexShrink: 0, marginTop: 1 }} />
            Every option above is filtered by the active building conditions. Change a filter and the
            choices — and the bill of material — follow.
          </div>
          </div>
        </div>

        {/* Live BOM — the same component the rest of Libraries uses. */}
        <div className="bp-lib-right" style={{ width: 360, minWidth: 320, flexShrink: 0, background: 'white', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1 }}>Live Bill of Materials</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{bom.length} components</span>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setSymbolOpen((v) => !v)}
                title="Takeoff symbol \u2014 the mark this assembly leaves on the plan"
                aria-label="Choose the takeoff symbol and colour"
                style={{ height: 26, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <SymbolMark symbol={symbolFor(draftSymbolKey, name)} size={14} />
                <Palette size={10} color="#9CA3AF" />
              </button>
              {symbolOpen && (
                <SymbolPicker
                  symbol={symbolFor(draftSymbolKey, name)}
                  onChange={(sym) => { setSymbolFor(draftSymbolKey, sym); bumpSymbol((n) => n + 1); mark(); }}
                  onClose={() => setSymbolOpen(false)}
                />
              )}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <LiveBOM
              items={bom}
              assemblyName={name}
              onSave={() => setShowSave(true)}
              onItemsChange={(items) => { setBomEdits(items); mark(); }}
              selectedId={selectedBomId}
              onSelectItem={setSelectedBomId}
              onDropPart={(partId) => {
                const part = MASTER_PARTS.find((p) => p.id === partId);
                if (part) addPartToBom(part);
              }}
            />
          </div>
        </div>
      </div>

      {showSave && (
        <SaveAssemblyModal
          seedCat={seedCat}
          seedSubcat={subcat || ASSEMBLY_SUBCATS[seedCat]?.[0] || null}
          seedType={type || null}
          seedName={name}
          seedBom={bom}
          libraries={libraries}
          existing={existing}
          onClose={() => setShowSave(false)}
          onSave={(a, cat, libraryId) => {
            setShowSave(false);
            setTouched(false);
            // Re-key the symbol onto the assembly that now exists.
            adoptSymbol(draftSymbolKey, a.id);
            onSaved(a, cat, libraryId);
          }}
        />
      )}
    </div>
  );
}
