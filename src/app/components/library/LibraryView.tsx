import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Search, Plus, ChevronDown, ChevronRight, Star, X, Check,
  AlertTriangle, BookOpen, Package, Sparkles,
  MoreHorizontal, Download, Save, RefreshCw,
  Lock, Play,
} from 'lucide-react';

import {
  LibraryType, CategoryCode, WorkspaceMode, AssemblyStatus, Library, Category, BOMItem, Assembly, Part,
  LIBRARIES, CATEGORIES, FIXTURE_CONTEXTS, DEVICE_CONTEXTS, contextsForCategory,
  PART_CATEGORIES, MASTER_PARTS, ASSEMBLY_SUBCATS, PART_DRAG_TYPE, dragState, deriveBom,
  FIXTURE_ASSEMBLIES, DEVICE_ASSEMBLIES, GENERIC_ASSEMBLIES,
  STATUS_CFG, LIB_TYPE_CFG, UNIT_OPTIONS,
} from './libraryData';
import { ColumnLibraryView } from './ColumnLibraryView';
import { WorkbenchLibraryView } from './WorkbenchLibraryView';
import { LibraryPicker } from './LibraryPicker';

// ─── Guided-builder local types ───────────────────────────────────────────────

interface SuggestionItem {
  id: string;
  name: string;
  code: string;
  unit: string;
  qty: number;
  reason: string;
  bomGroup: string;
}

function suggestionsFor(app: string, type: string, mount: string, wiring: string, dimming: string, emerg: string): SuggestionItem[] {
  const all: SuggestionItem[] = [];

  if (app === 'ACT Ceiling') {
    all.push({ id: 's-1', name: 'Independent Support Wire', code: 'ISW-12GA',  unit: 'EA', qty: 2, reason: 'Required by code for ACT ceiling fixtures', bomGroup: 'Mounting' });
    all.push({ id: 's-2', name: 'T-Bar Clip Set',            code: 'TBC-STD',   unit: 'EA', qty: 2, reason: 'Secures fixture to T-bar grid', bomGroup: 'Mounting' });
  }
  if (app.includes('Wood Framing')) {
    all.push({ id: 's-3', name: 'Wood Screw #8 \xd7 1.5"',  code: 'WS-8-150',  unit: 'EA', qty: 4, reason: 'Wood framing attachment', bomGroup: 'Hardware' });
  }
  if (app.includes('Metal Framing') || app === 'ACT Ceiling') {
    all.push({ id: 's-4', name: 'MC Connector \xbd"',        code: 'MCC-50',    unit: 'EA', qty: 2, reason: 'Secure MC cable at enclosure', bomGroup: 'Wiring' });
    all.push({ id: 's-5', name: 'Wire Connector Set',         code: 'WC-MARR',   unit: 'EA', qty: 3, reason: 'Terminate conductors', bomGroup: 'Wiring' });
  }
  if (app === 'Bar Joist – Open Ceiling') {
    all.push({ id: 's-6', name: 'Beam Clamp 3/8"',            code: 'BC-375',    unit: 'EA', qty: 2, reason: 'Beam clamp for open joist structure', bomGroup: 'Mounting' });
    all.push({ id: 's-7', name: 'Suspension Rod 3/8" 24"',    code: 'SR-375-24', unit: 'EA', qty: 1, reason: 'Drop support for open ceiling', bomGroup: 'Mounting' });
  }
  if (app === 'Concrete Deck') {
    all.push({ id: 's-8', name: 'Concrete Anchor 1/4"',       code: 'CA-25',     unit: 'EA', qty: 2, reason: 'Concrete deck fastening', bomGroup: 'Hardware' });
  }
  if (wiring.includes('MC-PCS') || wiring.includes('MC 12')) {
    if (!all.find((s) => s.code === 'MCC-50')) {
      all.push({ id: 's-9', name: 'MC Connector \xbd"',       code: 'MCC-50',    unit: 'EA', qty: 2, reason: 'Required for MC terminations', bomGroup: 'Wiring' });
    }
  }
  if (dimming === '0–10V dimming') {
    all.push({ id: 's-10', name: '0-10V Control Wire 2C',      code: 'CW-010V',   unit: 'LF', qty: 8, reason: 'Dimming control wiring', bomGroup: 'Controls' });
    all.push({ id: 's-11', name: '0-10V Dimmer Driver',         code: 'DD-010V',   unit: 'EA', qty: 1, reason: 'Dimming driver module', bomGroup: 'Controls' });
  }
  if (emerg === 'Emergency battery pack') {
    all.push({ id: 's-12', name: 'Emergency Battery Pack',       code: 'EBP-GEN',   unit: 'EA', qty: 1, reason: 'Integral battery backup', bomGroup: 'Emergency' });
  }
  return all;
}

// ─── New Library Modal ────────────────────────────────────────────────────────

function NewLibraryModal({ onClose, onCreated }: { onClose: () => void; onCreated: (lib: Library) => void }) {
  const [name, setName]             = useState('');
  const [type, setType]             = useState<LibraryType>('job');
  const [desc, setDesc]             = useState('');
  const [visibility, setVisibility] = useState('Current project only');
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Library name is required';
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      const lib: Library = { id: `lib-${Date.now()}`, name: name.trim(), type, count: 0, readonly: false, updated: '2026-07-15' };
      onCreated(lib);
      toast.success('Library created', { description: `${lib.name} is now active.` });
      onClose();
    }, 1200);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ width: 480, background: 'white', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={15} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>Create new library</span>
          <button onClick={onClose} style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Library name *</label>
            <input value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
              placeholder="e.g. Shopify HQ Phase 2"
              style={{ width: '100%', height: 34, padding: '0 10px', border: `1px solid ${errors.name ? '#DC2626' : '#E5E7EB'}`, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            {errors.name && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 3 }}>{errors.name}</div>}
          </div>
          <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Library type</label>
              <select value={type} onChange={(e) => setType(e.target.value as LibraryType)}
                style={{ width: '100%', height: 34, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, background: 'white', outline: 'none' }}>
                <option value="job">Job Library</option>
                <option value="customer">Customer-Specific</option>
                <option value="company">Company-Wide</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}
                style={{ width: '100%', height: 34, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, background: 'white', outline: 'none' }}>
                <option>Current project only</option>
                <option>Customer-specific</option>
                <option>Company-wide</option>
                <option>Selected users</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Optional description or notes"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ height: 34, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: saving ? '#9CA3AF' : '#2563EB', fontSize: 13, fontWeight: 500, color: 'white', cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Creating…' : 'Create library'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Save Assembly Modal ──────────────────────────────────────────────────────

function SaveAssemblyModal({ onClose, defaultName, libraries }: { onClose: () => void; defaultName: string; libraries: Library[] }) {
  const [name, setName]               = useState(defaultName);
  const [code, setCode]               = useState('BPA-FX-' + Math.floor(Math.random() * 900 + 100));
  const [dest, setDest]               = useState(libraries.filter((l) => !l.readonly)[0]?.id ?? '');
  const [versionNote, setVersionNote] = useState('');
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const editableLibs                  = libraries.filter((l) => !l.readonly);

  function handleSave() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Assembly name is required';
    if (!code.trim()) e.code = 'Assembly code is required';
    if (!dest) e.dest = 'Select a destination library';
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      const lib = libraries.find((l) => l.id === dest);
      toast.success('Assembly saved', { description: `${name} saved to ${lib?.name}.` });
      onClose();
    }, 1300);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ width: 460, background: 'white', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Save size={14} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>Save assembly</span>
          <button onClick={onClose} style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Assembly name *</label>
              <input value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                style={{ width: '100%', height: 34, padding: '0 10px', border: `1px solid ${errors.name ? '#DC2626' : '#E5E7EB'}`, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              {errors.name && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>{errors.name}</div>}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Code</label>
              <input value={code} onChange={(e) => { setCode(e.target.value); setErrors((p) => ({ ...p, code: '' })); }}
                style={{ width: 130, height: 34, padding: '0 10px', border: `1px solid ${errors.code ? '#DC2626' : '#E5E7EB'}`, borderRadius: 7, fontSize: 12, fontFamily: 'monospace', outline: 'none' }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Destination library *</label>
            {editableLibs.length === 0 ? (
              <div style={{ fontSize: 12, color: '#DC2626' }}>No editable libraries available.</div>
            ) : (
              <select value={dest} onChange={(e) => { setDest(e.target.value); setErrors((p) => ({ ...p, dest: '' })); }}
                style={{ width: '100%', height: 34, padding: '0 8px', border: `1px solid ${errors.dest ? '#DC2626' : '#E5E7EB'}`, borderRadius: 7, fontSize: 13, background: 'white', outline: 'none' }}>
                {editableLibs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            {errors.dest && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>{errors.dest}</div>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Version note</label>
            <input value={versionNote} onChange={(e) => setVersionNote(e.target.value)} placeholder="Optional — what changed in this version"
              style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ height: 34, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || editableLibs.length === 0}
              style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: saving ? '#9CA3AF' : '#2563EB', fontSize: 13, fontWeight: 500, color: 'white', cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save assembly'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Editable Live BOM ────────────────────────────────────────────────────────

function LiveBOM({ items, assemblyName, onSave, onItemsChange, selectedId, onSelectItem, onDropPart }: {
  items: BOMItem[];
  assemblyName: string;
  onSave: () => void;
  onItemsChange: (items: BOMItem[]) => void;
  /** Selected component — the target of "Replace" from the Parts library. */
  selectedId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onDropPart?: (partId: string) => void;
}) {
  const [dropActive, setDropActive] = useState(false);
  const [highlightId, setHighlightId]   = useState<string | null>(null);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [menuId, setMenuId]             = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [bomTab, setBomTab] = useState<'bom' | 'locations'>('bom');

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => { const n = new Set(prev); if (n.has(group)) n.delete(group); else n.add(group); return n; });
  }

  // BOM group ordering by type
  const GROUP_ORDER = ['Primary Part', 'Fixture', 'Device', 'Mounting', 'Box & Cover', 'Wiring', 'Controls', 'Emergency', 'Grounding', 'Hardware', 'Raceway', 'Optional'];

  const groups = useMemo(() => {
    const map: Record<string, BOMItem[]> = {};
    for (const item of items) {
      if (!map[item.group]) map[item.group] = [];
      map[item.group].push(item);
    }
    return map;
  }, [items]);

  const orderedGroups = useMemo(() => {
    const inOrder = GROUP_ORDER.filter((g) => groups[g]);
    const remaining = Object.keys(groups).filter((g) => !GROUP_ORDER.includes(g));
    return [...inOrder, ...remaining];
  }, [groups]);

  const matCost      = items.reduce((s, i) => s + i.qty * 24.5, 0);
  const labourHrs    = items.length * 0.35;
  const missingCount = items.filter((i) => i.priceStatus === 'missing').length;

  function updateItem(id: string, patch: Partial<BOMItem>) {
    const next = items.map((i) => i.id === id ? { ...i, ...patch } : i);
    onItemsChange(next);
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 1200);
  }

  function removeItem(item: BOMItem) {
    if (item.required) {
      if (!window.confirm(`"${item.name}" is a required component. Remove anyway?`)) return;
    }
    onItemsChange(items.filter((i) => i.id !== item.id));
    toast.success('Part removed', { description: item.name });
  }

  function resetQty(item: BOMItem) {
    if (item.baseQty !== undefined) {
      updateItem(item.id, { qty: item.baseQty, manualOverride: false });
      toast.info('Quantity reset to calculated value');
    }
  }

  // Parts dragged out of the sidebar land anywhere on this panel.
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!onDropPart) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!dropActive) setDropActive(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget === e.target) setDropActive(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDropActive(false);
      const id = e.dataTransfer.getData(PART_DRAG_TYPE) || dragState.part?.id;
      if (id) onDropPart?.(id);
    },
  };
  const dropOutline = dropActive ? { outline: '2px dashed #2563EB', outlineOffset: -4, background: '#F8FBFF' } : {};

  if (items.length === 0) {
    return (
      <div {...dropHandlers} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', ...dropOutline }}>
        <Package size={32} color="#E5E7EB" />
        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 12, color: '#6B7280' }}>No assembly selected</div>
        <div style={{ fontSize: 12, marginTop: 4, color: '#9CA3AF' }}>Select an assembly in Browse or configure one in Build — or drag a part in from the Parts library.</div>
      </div>
    );
  }

  return (
    <div {...dropHandlers} style={{ display: 'flex', flexDirection: 'column', height: '100%', ...dropOutline }}>
      <div style={{ padding: '8px 14px 0', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 1 }}>{assemblyName || 'Assembly BOM'}</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>{items.length} component{items.length !== 1 ? 's' : ''}</div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['bom', 'Bill of Materials'], ['locations', 'Locations / Refs']] .map(([key, label]) => (
            <button key={key} onClick={() => setBomTab(key as 'bom' | 'locations')}
              style={{ height: 28, padding: '0 10px', border: 'none', background: 'transparent', fontSize: 11, fontWeight: bomTab === key ? 600 : 400, color: bomTab === key ? '#2563EB' : '#6B7280', borderBottom: bomTab === key ? '2px solid #2563EB' : '2px solid transparent', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Locations / References tab */}
      {bomTab === 'locations' && (
        <div className="bp-lib-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>Drawing locations, sheet references, and marker IDs associated with this assembly.</div>
          {[
            { sheet: 'E-101', markers: [1, 2, 4], count: 16 },
            { sheet: 'E-102', markers: [1], count: 4 },
          ].map((loc) => (
            <div key={loc.sheet} style={{ border: '1px solid #E5E7EB', borderRadius: 7, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#374151' }}>{loc.sheet}</span>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>·</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>×{loc.count} placed</span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {loc.markers.map((m) => (
                  <span key={m} style={{ fontSize: 10, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 3, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>#{m}</span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Audit trail and price history are available via the Pricing workspace.</div>
        </div>
      )}

      {/* BOM rows */}
      {bomTab === 'bom' && (
      <div className="bp-lib-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {orderedGroups.map((group) => {
          const groupItems = groups[group];
          const collapsed = collapsedGroups.has(group);
          return (
          <div key={group}>
            <button onClick={() => toggleGroup(group)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px 3px', border: 'none', background: '#FAFAFA', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', borderTop: '1px solid #F3F4F6' }}>
              {collapsed ? <ChevronRight size={11} color="#9CA3AF" /> : <ChevronDown size={11} color="#9CA3AF" />}
              <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group}</span>
              <span style={{ fontSize: 9, color: '#D1D5DB', marginLeft: 2 }}>{groupItems.length}</span>
            </button>
            {!collapsed && groupItems.map((item) => {
              const highlighted = item.id === highlightId;
              const editingQty  = editingQtyId === item.id;
              const isSelected  = selectedId === item.id;
              return (
                <div key={item.id}
                  onClick={() => onSelectItem?.(isSelected ? null : item.id)}
                  title="Click to select — then use Replace in the Parts library"
                  style={{
                    padding: '7px 14px', borderBottom: '1px solid #F9FAFB',
                    background: highlighted ? '#FFFBEB' : isSelected ? '#EFF6FF' : 'white',
                    borderLeft: `2px solid ${isSelected ? '#2563EB' : 'transparent'}`,
                    transition: 'background 0.4s', position: 'relative', cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Name + code — left, takes remaining space */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>{item.code}</div>
                    </div>
                    {/* Qty editable — compact, right-aligned */}
                    <div style={{ flexShrink: 0 }}>
                      {editingQty ? (
                        <input
                          autoFocus
                          type="number"
                          defaultValue={item.qty}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) {
                              updateItem(item.id, { qty: val, manualOverride: item.baseQty !== undefined && val !== item.baseQty });
                            }
                            setEditingQtyId(null);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingQtyId(null); }}
                          style={{ width: 40, height: 22, padding: '0 4px', border: '1px solid #2563EB', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', outline: 'none', textAlign: 'right' }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingQtyId(item.id)}
                          title="Click to edit quantity"
                          style={{ width: 40, height: 22, border: '1px solid #E5E7EB', borderRadius: 4, background: '#F9FAFB', fontSize: 11, fontFamily: 'monospace', cursor: 'text', textAlign: 'right', padding: '0 4px', color: item.manualOverride ? '#D97706' : '#111827' }}>
                          {item.qty}
                        </button>
                      )}
                    </div>
                    {/* Unit dropdown — compact */}
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                      style={{ height: 22, width: 42, padding: '0 2px', border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 10, background: 'white', outline: 'none', color: '#6B7280' }}>
                      {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                    {/* Overflow */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button onClick={() => setMenuId(menuId === item.id ? null : item.id)}
                        style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}>
                        <MoreHorizontal size={12} color="#6B7280" />
                      </button>
                      {menuId === item.id && (
                        <>
                          <div onClick={() => setMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 41, background: 'white', border: '1px solid #E5E7EB', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160, overflow: 'hidden' }}>
                            {[
                              { label: 'Edit quantity',   action: () => { setEditingQtyId(item.id); setMenuId(null); } },
                              ...(item.baseQty !== undefined && item.manualOverride
                                ? [{ label: 'Reset to calculated', action: () => { resetQty(item); setMenuId(null); } }]
                                : []),
                              { label: 'Replace part', action: () => { toast.info('Select this row, then use Replace in the Parts library'); setMenuId(null); } },
                              { label: item.required ? 'Mark optional' : 'Mark required', action: () => { updateItem(item.id, { required: !item.required }); setMenuId(null); } },
                              { label: 'Remove part', action: () => { removeItem(item); setMenuId(null); } },
                            ].map((mi) => (
                              <button key={mi.label} onClick={mi.action}
                                style={{ width: '100%', textAlign: 'left', padding: '7px 12px', border: 'none', background: 'white', fontSize: 12, color: mi.label === 'Remove part' ? '#DC2626' : '#374151', cursor: 'pointer' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                                {mi.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Calc / override info */}
                  {(item.calc || item.manualOverride) && (
                    <div style={{ marginTop: 3, paddingLeft: 58, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {item.calc && <span style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>{item.calc}</span>}
                      {item.manualOverride && (
                        <button onClick={() => resetQty(item)} style={{ fontSize: 10, color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, padding: 0 }}>
                          <RefreshCw size={9} /> Manual override — reset
                        </button>
                      )}
                    </div>
                  )}
                  {!item.required && (
                    <div style={{ marginTop: 2, paddingLeft: 58 }}>
                      <span style={{ fontSize: 9, color: '#9CA3AF', background: '#F3F4F6', padding: '1px 5px', borderRadius: 3 }}>Optional</span>
                    </div>
                  )}
                </div>
              );})}
          </div>
          );})}
      </div>
      )}

      {/* Summary + actions */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #E5E7EB', padding: 14, background: '#FAFAFA' }}>
        {[
          { label: 'Components',    value: String(items.length)          },
          { label: 'Material cost', value: '$' + matCost.toFixed(2),  mono: true },
          { label: 'Labor hours',   value: labourHrs.toFixed(1) + ' hrs', mono: true },
        ].map(({ label, value, mono }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: '#6B7280' }}>{label}</span>
            <span style={{ fontFamily: mono ? 'monospace' : undefined, fontWeight: 600, color: '#111827' }}>{value}</span>
          </div>
        ))}
        {missingCount > 0 && (
          <div style={{ fontSize: 11, color: '#D97706', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <AlertTriangle size={11} /> {missingCount} missing price{missingCount > 1 ? 's' : ''}
          </div>
        )}
        {selectedId && (
          <div style={{ fontSize: 11, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Check size={11} /> 1 component selected — Replace from the Parts library
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button onClick={onSave}
            style={{ flex: 1, height: 32, border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 500, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Save size={12} /> Save assembly
          </button>
          <button onClick={() => toast.success('Takeoff started', { description: 'Assembly added to takeoff workspace.' })}
            style={{ height: 32, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Play size={11} /> Takeoff
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assembly result row ──────────────────────────────────────────────────────

function AssemblyRow({ assembly, selected, onSelect, onToggleFav }: {
  assembly: Assembly; selected: boolean;
  onSelect: () => void; onToggleFav: () => void;
}) {
  const st  = STATUS_CFG[assembly.status];
  const src = LIB_TYPE_CFG[assembly.source];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onSelect}
      style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: selected ? '#EFF6FF' : 'white', borderLeft: `3px solid ${selected ? '#2563EB' : 'transparent'}`, position: 'relative' }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = '#F9FAFB'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'white'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{assembly.name}</span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9CA3AF' }}>{assembly.code}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4, color: st.color, background: st.bg }}>{st.symbol} {st.label}</span>
            {assembly.source !== 'system' && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 5px', borderRadius: 4, color: src.color, background: '#F3F4F6' }}>{src.label}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', lineHeight: '15px', marginBottom: 4 }}>{assembly.desc}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {assembly.context.map((c) => <span key={c} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#F3F4F6', color: '#6B7280' }}>{c}</span>)}
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#F3F4F6', color: '#6B7280' }}>{assembly.wiringMethod}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={13} fill={assembly.isFavorite ? '#F59E0B' : 'none'} color={assembly.isFavorite ? '#F59E0B' : '#D1D5DB'} />
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
              style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MoreHorizontal size={13} color="#9CA3AF" />
            </button>
            {showMenu && (
              <>
                <div onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 41, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 170, overflow: 'hidden' }}>
                  {[
                    { label: 'Preview BOM',         action: () => { onSelect(); toast.info('BOM preview loaded in right panel'); } },
                    { label: 'Create company copy', action: () => toast.success('Company copy created') },
                    { label: 'Duplicate',           action: () => toast.success('Assembly duplicated') },
                    { label: 'Archive',             action: () => toast.info('Assembly archived') },
                  ].map((item) => (
                    <button key={item.label} onClick={(e) => { e.stopPropagation(); item.action(); setShowMenu(false); }}
                      style={{ width: '100%', textAlign: 'left', padding: '7px 12px', border: 'none', background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Browse panel ─────────────────────────────────────────────────────────────

function BrowsePanel({ category, activeSubcat, selectedContext, onContextChange, selectedAssembly, onAssemblyChange, onToggleFav, assemblies }: {
  category: CategoryCode;
  activeSubcat: string | null;
  selectedContext: string;
  onContextChange: (c: string) => void;
  selectedAssembly: Assembly | null;
  onAssemblyChange: (a: Assembly) => void;
  onToggleFav: (id: string) => void;
  assemblies: Assembly[];
}) {
  const [search, setSearch]               = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const contexts = contextsForCategory(category);
  const FILTER_OPTIONS = ['Recommended', 'Compatible', 'Favorite', 'System', 'Company', 'Missing price'];

  function matchesFilter(a: Assembly, filter: string): boolean {
    if (filter === 'Recommended')   return a.status === 'recommended';
    if (filter === 'Compatible')    return a.status === 'compatible';
    if (filter === 'Favorite')      return a.isFavorite;
    if (filter === 'System')        return a.source === 'system';
    if (filter === 'Company')       return a.source === 'company';
    if (filter === 'Missing price') return a.status === 'missing-price' || a.bom.some((b) => b.priceStatus === 'missing');
    return true;
  }

  const filtered = assemblies.filter((a) => {
    const matchCtx    = !selectedContext || a.context.includes(selectedContext) || a.context.length === 0;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase());
    const matchChips  = activeFilters.length === 0 || activeFilters.some((f) => matchesFilter(a, f));
    const matchSub    = !activeSubcat || a.subcat === activeSubcat;
    return matchCtx && matchSearch && matchChips && matchSub;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Installation context</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {contexts.map((c) => (
            <button key={c} onClick={() => onContextChange(selectedContext === c ? '' : c)}
              style={{ height: 26, padding: '0 10px', border: `1px solid ${selectedContext === c ? '#2563EB' : '#E5E7EB'}`, borderRadius: 13, fontSize: 12, fontWeight: selectedContext === c ? 600 : 400, background: selectedContext === c ? '#EFF6FF' : 'white', color: selectedContext === c ? '#1D4ED8' : '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search compatible assemblies…"
            style={{ width: '100%', height: 38, paddingLeft: 32, paddingRight: 26, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}><X size={11} color="#9CA3AF" /></button>}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTER_OPTIONS.map((f) => {
            const active = activeFilters.includes(f);
            return (
              <button key={f} onClick={() => setActiveFilters((prev) => active ? prev.filter((x) => x !== f) : [...prev, f])}
                style={{ height: 22, padding: '0 8px', border: `1px solid ${active ? '#2563EB' : '#E5E7EB'}`, borderRadius: 11, fontSize: 11, background: active ? '#EFF6FF' : 'white', color: active ? '#1D4ED8' : '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                {active && <X size={9} />}{f}
              </button>
            );
          })}
          {activeFilters.length > 0 && <button onClick={() => setActiveFilters([])} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>}
        </div>
      </div>
      <div className="bp-lib-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedContext && (
          <div style={{ padding: '10px 14px', fontSize: 12, color: '#D97706', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} /> Select an installation context above to see compatible assemblies.
          </div>
        )}
        <div style={{ padding: '8px 16px 4px', fontSize: 11, color: '#9CA3AF' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}{activeSubcat ? ` · ${activeSubcat}` : ''}{selectedContext ? ` · ${selectedContext}` : ''}
        </div>
        {filtered.map((a) => (
          <AssemblyRow key={a.id} assembly={a} selected={selectedAssembly?.id === a.id}
            onSelect={() => onAssemblyChange(a)} onToggleFav={() => onToggleFav(a.id)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
            <Search size={24} color="#E5E7EB" style={{ display: 'block', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13, color: '#6B7280' }}>No assemblies found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try a different context or clear the search.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Context-Aware Suggestions Panel ─────────────────────────────────────────

function SuggestionsPanel({ suggestions, addedIds, onAdd, onRemove, contextLabel }: {
  suggestions: SuggestionItem[];
  addedIds: Set<string>;
  onAdd: (s: SuggestionItem) => void;
  onRemove: (id: string) => void;
  contextLabel: string;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div style={{ margin: '0 14px 10px', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: '#F8F9FF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Context-aware suggestions</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', background: '#F5F3FF', borderRadius: 4 }}>
          <Sparkles size={9} /> AI-assisted
        </span>
      </div>
      {contextLabel && (
        <div style={{ padding: '5px 12px', fontSize: 11, color: '#6B7280', background: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
          Based on <strong>{contextLabel}</strong>
        </div>
      )}
      <div style={{ padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {suggestions.map((s) => {
          const added = addedIds.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => added ? onRemove(s.id) : onAdd(s)}
              title={s.reason}
              style={{ height: 28, padding: '0 10px', border: `1px solid ${added ? '#16A34A' : '#E5E7EB'}`, borderRadius: 14, fontSize: 11, fontWeight: added ? 600 : 400, background: added ? '#F0FDF4' : 'white', color: added ? '#16A34A' : '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
              {added ? <Check size={10} /> : <Plus size={10} />}
              {s.name}
              {added && <X size={9} style={{ opacity: 0.6 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Build panel (guided configurator with suggestions + footer) ──────────────

function BuildPanel({ category, onBomChange }: { category: CategoryCode; onBomChange: (items: BOMItem[], name: string) => void }) {
  const isFixture = category === 'BPC-01';
  const isDevice  = category === 'BPC-02';

  const [fxApp, setFxApp]         = useState('ACT Ceiling');
  const [fxType, setFxType]       = useState('LED Troffer 2\xd74');
  const [fxMount, setFxMount]     = useState('T-Bar Drop-In');
  const [fxWiring, setFxWiring]   = useState('MC-PCS 12/3');
  const [fxRun, setFxRun]         = useState('8');
  const [fxWaste, setFxWaste]     = useState('5');
  const [fxDimming, setFxDimming] = useState('No dimming');
  const [fxEmerg, setFxEmerg]     = useState('None');

  const [dvApp, setDvApp]         = useState('Metal Framing');
  const [dvType, setDvType]       = useState('Duplex Receptacle 20A');
  const [dvGrade, setDvGrade]     = useState('Commercial');
  const [dvWiring, setDvWiring]   = useState('MC 12/2');
  const [dvRun, setDvRun]         = useState('6');
  const [dvBox, setDvBox]         = useState('New Work 1-Gang Metal Box');
  const [dvCover, setDvCover]     = useState('Standard Cover');

  // All collapsed by default (0 = none open)
  const [openStep, setOpenStep] = useState(0);

  // Suggestions state
  const [addedSuggIds, setAddedSuggIds] = useState<Set<string>>(new Set());
  const [extraItems, setExtraItems]     = useState<BOMItem[]>([]);
  const [showFooterMenu, setShowFooterMenu] = useState(false);
  const [saveDest, setSaveDest] = useState<'company' | 'job' | 'customer' | 'system'>('company');
  const [aiHelper, setAiHelper] = useState(false);
  const [versionNote, setVersionNote] = useState('v1');

  const SAVE_DEST_CFG: Record<string, { label: string; color: string }> = {
    system:   { label: 'System Library',   color: '#6B7280' },
    company:  { label: 'Company Library',  color: '#1D4ED8' },
    job:      { label: 'Current Job',      color: '#16A34A' },
    customer: { label: 'Customer Library', color: '#7C3AED' },
  };

  const runLF    = isFixture ? parseFloat(fxRun) || 0 : parseFloat(dvRun) || 0;
  const wastePct = isFixture ? (parseFloat(fxWaste) / 100 || 0) : 0.05;
  const calcLF   = +(runLF * (1 + wastePct)).toFixed(1);

  const suggestions = useMemo(() => {
    if (isFixture) return suggestionsFor(fxApp, fxType, fxMount, fxWiring, fxDimming, fxEmerg);
    if (isDevice)  return suggestionsFor(dvApp, dvType, '', dvWiring, 'No dimming', 'None');
    return [];
  }, [fxApp, fxType, fxMount, fxWiring, fxDimming, fxEmerg, dvApp, dvType, dvWiring, isFixture, isDevice]);

  // Reset added suggestions when context changes
  const ctxKey = isFixture ? fxApp : dvApp;
  useMemo(() => { setAddedSuggIds(new Set()); setExtraItems([]); }, [ctxKey]);

  function addSuggestion(s: SuggestionItem) {
    const item: BOMItem = { id: `sugg-${s.id}`, group: s.bomGroup, name: s.name, code: s.code, qty: s.qty, unit: s.unit, required: false, priceStatus: 'ok' };
    setExtraItems((prev) => [...prev, item]);
    setAddedSuggIds((prev) => new Set([...prev, s.id]));
    toast.success(`Added: ${s.name}`, { description: s.reason });
  }

  function removeSuggestion(id: string) {
    const sugg = suggestions.find((s) => s.id === id);
    setExtraItems((prev) => prev.filter((i) => i.id !== `sugg-${id}`));
    setAddedSuggIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (sugg) toast.info(`Removed: ${sugg.name}`);
  }

  const contextLabel = isFixture ? `${fxApp} + ${fxType}` : `${dvApp} + ${dvType}`;

  const coreBomItems: BOMItem[] = useMemo(() => {
    if (isFixture) {
      return deriveBom({
        kind: 'fixture', app: fxApp, type: fxType, mount: fxMount,
        wiring: fxWiring, run: fxRun, waste: fxWaste, dimming: fxDimming, emergency: fxEmerg,
      });
    }
    if (isDevice) {
      return deriveBom({
        kind: 'device', app: dvApp, type: dvType, grade: dvGrade,
        wiring: dvWiring, run: dvRun, box: dvBox, cover: dvCover,
      });
    }
    return [];
  }, [fxApp, fxType, fxMount, fxWiring, fxRun, fxWaste, fxDimming, fxEmerg, dvApp, dvType, dvGrade, dvWiring, dvRun, dvBox, dvCover, isFixture, isDevice]);

  useMemo(() => {
    const name = isFixture ? `${fxType} – ${fxApp}` : isDevice ? `${dvType} – ${dvGrade}` : 'Custom Assembly';
    onBomChange([...coreBomItems, ...extraItems], name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreBomItems, extraItems]);

  // Collapse summary text per step
  function stepSummary(n: number): string {
    if (isFixture) {
      if (n === 1) return `${fxType} · ${fxApp}`;
      if (n === 2) return fxMount;
      if (n === 3) return fxWiring !== 'Measure Separately' ? `${fxWiring} · ${fxRun} LF · ${fxWaste}% waste` : 'Measure Separately';
      if (n === 4) return [fxDimming !== 'No dimming' ? fxDimming : '', fxEmerg !== 'None' ? fxEmerg : ''].filter(Boolean).join(' · ') || 'No extras';
    } else {
      if (n === 1) return `${dvType} · ${dvGrade} · ${dvApp}`;
      if (n === 2) return `${dvWiring} · ${dvRun} LF`;
      if (n === 3) return `${dvBox} · ${dvCover}`;
    }
    return '';
  }

  function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    const open = openStep === n;
    return (
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
        <button
          onClick={() => setOpenStep(open ? 0 : n)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: open ? '#EFF6FF' : '#FAFAFA', cursor: 'pointer' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: open ? '#2563EB' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: open ? 'white' : '#6B7280', flexShrink: 0 }}>{n}</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: open ? '#1D4ED8' : '#374151' }}>{title}</div>
            {!open && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{stepSummary(n)}</div>}
          </div>
          {open ? <ChevronDown size={14} color="#6B7280" /> : <ChevronRight size={14} color="#9CA3AF" />}
        </button>
        {open && <div style={{ padding: '14px 16px', borderTop: '1px solid #E5E7EB' }}>{children}</div>}
      </div>
    );
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
        {children}
      </div>
    );
  }

  function Sel({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: string[] }) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: 'white', outline: 'none' }}>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  }

  const totalSteps = isFixture ? 4 : 3;

  if (!isFixture && !isDevice) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
        <Package size={24} color="#E5E7EB" style={{ display: 'block', margin: '0 auto 8px' }} />
        <div style={{ fontSize: 13, color: '#6B7280' }}>Guided configurator</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Select Fixtures (BPC-01) or Devices (BPC-02) for guided Build mode.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: 14 }}>
          {/* Expand/Collapse all */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setOpenStep(99)}
              style={{ height: 24, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer' }}>
              Expand all
            </button>
            <button onClick={() => setOpenStep(0)}
              style={{ height: 24, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer' }}>
              Collapse all
            </button>
          </div>

          {/* Fixture steps */}
          {isFixture && (
            <>
              <Step n={1} title="Selection — Fixture type & application">
                <Field label="Application type"><Sel value={fxApp} onChange={setFxApp} opts={FIXTURE_CONTEXTS} /></Field>
                <Field label="Fixture type"><Sel value={fxType} onChange={setFxType} opts={['LED Troffer 2\xd74', 'LED Troffer 2\xd72', 'LED Emergency Troffer', 'Recessed Downlight', 'Linear Pendant', 'Surface-Mounted Fixture']} /></Field>
              </Step>
              <Step n={2} title="Mounting">
                <Field label="Mounting method"><Sel value={fxMount} onChange={setFxMount} opts={['T-Bar Drop-In', 'Surface Mount to Joist Framing', 'Suspension Cable and Beam Clamp', 'Concrete Anchor Mount']} /></Field>
              </Step>
              <Step n={3} title="Wiring">
                <Field label="Wiring method"><Sel value={fxWiring} onChange={setFxWiring} opts={['MC-PCS 12/3', 'MC 12/2', 'AC 12/2', 'EMT with THHN', 'Measure Separately']} /></Field>
                {fxWiring !== 'Measure Separately' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Run length (LF)">
                      <input type="number" value={fxRun} onChange={(e) => setFxRun(e.target.value)} min={0}
                        style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                    </Field>
                    <Field label="Waste %">
                      <input type="number" value={fxWaste} onChange={(e) => setFxWaste(e.target.value)} min={0} max={50}
                        style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                    </Field>
                  </div>
                )}
                {fxWiring !== 'Measure Separately' && (
                  <div style={{ padding: '6px 10px', background: '#F0FDF4', borderRadius: 6, fontSize: 12, color: '#16A34A', fontFamily: 'monospace', marginTop: 4 }}>
                    {fxRun} LF + {fxWaste}% waste = {calcLF} LF
                  </div>
                )}
              </Step>
              <Step n={4} title="Options — Dimming, emergency, controls">
                <Field label="Dimming"><Sel value={fxDimming} onChange={setFxDimming} opts={['No dimming', '0–10V dimming', 'DALI control']} /></Field>
                <Field label="Emergency configuration"><Sel value={fxEmerg} onChange={setFxEmerg} opts={['None', 'Constant hot leg', 'Emergency battery pack']} /></Field>
              </Step>
            </>
          )}

          {/* Device steps */}
          {isDevice && (
            <>
              {dvGrade === 'Hospital Grade' && (
                <div style={{ padding: '8px 10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 12, color: '#92400E', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} color="#D97706" />
                  <span><strong>Healthcare:</strong> HCF cable required for hospital-grade devices. BOM updated automatically.</span>
                </div>
              )}
              <Step n={1} title="Selection — Device type & grade">
                <Field label="Installation application"><Sel value={dvApp} onChange={setDvApp} opts={DEVICE_CONTEXTS} /></Field>
                <Field label="Device type"><Sel value={dvType} onChange={setDvType} opts={['Duplex Receptacle 20A', 'GFCI Receptacle 20A', 'Hospital-Grade Receptacle 20A', 'Single Receptacle', 'USB Receptacle', 'Switch', 'Occupancy Sensor']} /></Field>
                <Field label="Grade"><Sel value={dvGrade} onChange={setDvGrade} opts={['Commercial', 'Hospital Grade', 'Residential', 'Weather Resistant']} /></Field>
              </Step>
              <Step n={2} title="Wiring">
                <Field label="Wiring method"><Sel value={dvWiring} onChange={setDvWiring} opts={['MC 12/2', 'HCF MC 12/2', 'EMT with THHN', 'Measure Separately']} /></Field>
                <Field label="Run length (LF)">
                  <input type="number" value={dvRun} onChange={(e) => setDvRun(e.target.value)} min={0}
                    style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                </Field>
              </Step>
              <Step n={3} title="Box & cover">
                <Field label="Box type"><Sel value={dvBox} onChange={setDvBox} opts={['New Work 1-Gang Metal Box', 'New Work 1-Gang Plastic Box', 'FS Box', '4-inch Square Box with Plaster Ring']} /></Field>
                <Field label="Cover type"><Sel value={dvCover} onChange={setDvCover} opts={['Standard Cover', 'Stainless-Steel Cover', 'Weatherproof In-Use Cover']} /></Field>
              </Step>
            </>
          )}
        </div>

        {/* Context-aware suggestions */}
        <SuggestionsPanel
          suggestions={suggestions}
          addedIds={addedSuggIds}
          onAdd={addSuggestion}
          onRemove={removeSuggestion}
          contextLabel={contextLabel}
        />
      </div>

      {/* Footer: save destination + controls */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #E5E7EB', background: 'white' }}>
        {/* Save destination row */}
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#6B7280', flexShrink: 0 }}>Save to:</span>
          <select value={saveDest} onChange={(e) => setSaveDest(e.target.value as typeof saveDest)}
            style={{ flex: 1, height: 26, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, background: 'white', outline: 'none', color: SAVE_DEST_CFG[saveDest].color, fontWeight: 500 }}>
            {(Object.keys(SAVE_DEST_CFG) as (keyof typeof SAVE_DEST_CFG)[]).filter((k) => k !== 'system').map((k) => (
              <option key={k} value={k}>{SAVE_DEST_CFG[k].label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 5, border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>Ver</span>
            <input value={versionNote} onChange={(e) => setVersionNote(e.target.value)}
              style={{ width: 32, fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: '#374151', border: 'none', background: 'transparent', outline: 'none' }} />
          </div>
          <button
            title="AI helper — get assembly recommendations"
            onClick={() => { setAiHelper((v) => !v); if (!aiHelper) toast.info('AI helper active — suggestions will appear in context suggestions.'); }}
            style={{ width: 28, height: 26, border: `1px solid ${aiHelper ? '#A855F7' : '#E5E7EB'}`, borderRadius: 5, background: aiHelper ? '#F5F3FF' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={12} color={aiHelper ? '#7C3AED' : '#9CA3AF'} />
          </button>
        </div>
        {/* Actions row */}
        <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => toast.success('Takeoff started', { description: 'Assembly added to takeoff workspace.' })}
            style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Play size={12} /> Start Takeoff
          </button>
          <button
            onClick={() => {
              const name = isFixture ? `${fxType} – ${fxApp}` : `${dvType} – ${dvGrade}`;
              toast.success(`Saved to ${SAVE_DEST_CFG[saveDest].label}`, { description: `${name} · ${versionNote}` });
            }}
            style={{ height: 32, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Save size={11} /> Save
          </button>
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button onClick={() => setShowFooterMenu((v) => !v)}
              style={{ width: 32, height: 32, border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MoreHorizontal size={14} color="#6B7280" />
            </button>
            {showFooterMenu && (
              <>
                <div onClick={() => setShowFooterMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 4, zIndex: 41, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 190, overflow: 'hidden' }}>
                  {[
                    { label: 'Duplicate assembly',    action: () => toast.success('Assembly duplicated — check for name conflicts before saving') },
                    { label: 'Manual review mode',    action: () => toast.info('Review AI-assisted fields before saving') },
                    { label: 'Preview BOM',           action: () => toast.info('BOM preview loaded in right panel') },
                  ].map((item) => (
                    <button key={item.label} onClick={() => { item.action(); setShowFooterMenu(false); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar: library scope chips ─────────────────────────────────────────────

type LibraryMode = 'assemblies' | 'parts';
type LibraryScope = 'all' | 'common' | 'recent' | 'favorites';

// Labels only — four chips plus icons overflow the 240px sidebar.
const SCOPES: { id: LibraryScope; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'common',    label: 'Common' },
  { id: 'recent',    label: 'Recent' },
  { id: 'favorites', label: 'Favorites' },
];

function ScopeChips({ scope, onChange }: { scope: LibraryScope; onChange: (s: LibraryScope) => void }) {
  return (
    <div className="bp-scroll-x" style={{ display: 'flex', gap: 3, padding: '8px 10px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
      {SCOPES.map((sc) => {
        const active = scope === sc.id;
        return (
          <button
            key={sc.id}
            onClick={() => onChange(sc.id)}
            style={{
              height: 22, padding: '0 9px', border: `1px solid ${active ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 11,
              background: active ? '#EFF6FF' : 'white', color: active ? '#1D4ED8' : '#6B7280',
              fontSize: 10, fontWeight: active ? 600 : 400, cursor: 'pointer',
              display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {sc.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sidebar: Assemblies navigation ───────────────────────────────────────────

function AssembliesNavPanel({
  scope, activeCategory, activeSubcat, onSelectCategory, onSelectSubcat,
  scopedAssemblies, selectedAssemblyId, onSelectAssembly,
}: {
  scope: LibraryScope;
  activeCategory: CategoryCode;
  activeSubcat: string | null;
  onSelectCategory: (code: CategoryCode) => void;
  onSelectSubcat: (sub: string | null) => void;
  scopedAssemblies: Assembly[];
  selectedAssemblyId?: string;
  onSelectAssembly: (a: Assembly) => void;
}) {
  const [expanded, setExpanded] = useState<Set<CategoryCode>>(new Set([activeCategory]));

  if (scope !== 'all') {
    return (
      <div className="bp-lib-scroll" style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        <div style={{ padding: '4px 12px 6px', fontSize: 10, color: '#9CA3AF' }}>
          {scopedAssemblies.length} assembl{scopedAssemblies.length === 1 ? 'y' : 'ies'}
        </div>
        {scopedAssemblies.map((a) => {
          const active = a.id === selectedAssemblyId;
          return (
            <button
              key={a.id}
              onClick={() => onSelectAssembly(a)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: 'none', background: active ? '#EFF6FF' : 'transparent', cursor: 'pointer', borderRight: `2px solid ${active ? '#2563EB' : 'transparent'}` }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#1D4ED8' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>{a.code}</div>
              </div>
              {a.isFavorite && <Star size={10} fill="#F59E0B" color="#F59E0B" style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
        {scopedAssemblies.length === 0 && (
          <div style={{ padding: '16px 12px', fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
            Nothing here yet — assemblies appear as you use them.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bp-lib-scroll" style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
      {CATEGORIES.map((cat) => {
        const active = cat.code === activeCategory;
        const open = expanded.has(cat.code);
        const subcats = ASSEMBLY_SUBCATS[cat.code] ?? [];
        return (
          <div key={cat.code}>
            <div
              style={{ display: 'flex', alignItems: 'center', background: active && !activeSubcat ? '#EFF6FF' : 'transparent', borderRight: `2px solid ${active ? '#2563EB' : 'transparent'}` }}
            >
              <button
                onClick={() => setExpanded((prev) => { const n = new Set(prev); if (n.has(cat.code)) n.delete(cat.code); else n.add(cat.code); return n; })}
                aria-label={open ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
                style={{ width: 20, height: 34, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                {open ? <ChevronDown size={11} color="#9CA3AF" /> : <ChevronRight size={11} color="#9CA3AF" />}
              </button>
              <button
                onClick={() => { onSelectCategory(cat.code); onSelectSubcat(null); setExpanded((prev) => new Set(prev).add(cat.code)); }}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', display: 'flex', alignItems: 'center', padding: '7px 12px 7px 0', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#1D4ED8' : '#374151' }}>{cat.name}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>{cat.code} · {cat.count}</div>
                </div>
                {cat.warning && <AlertTriangle size={11} color="#D97706" title={cat.warning} />}
              </button>
            </div>
            {open && subcats.map((sub) => {
              const subActive = active && activeSubcat === sub;
              return (
                <button
                  key={sub}
                  onClick={() => { onSelectCategory(cat.code); onSelectSubcat(sub); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '5px 12px 5px 32px', border: 'none',
                    background: subActive ? '#EFF6FF' : 'transparent', cursor: 'pointer',
                    fontSize: 11, color: subActive ? '#1D4ED8' : '#6B7280', fontWeight: subActive ? 600 : 400,
                    borderRight: `2px solid ${subActive ? '#2563EB' : 'transparent'}`,
                  }}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sidebar: Parts library ───────────────────────────────────────────────────

function PartsLibraryPanel({
  scope, favorites, onToggleFavorite, commonIds, recentIds,
  onAddPart, onReplacePart, hasBomSelection,
}: {
  scope: LibraryScope;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  commonIds: string[];
  recentIds: string[];
  onAddPart: (part: Part) => void;
  onReplacePart: (part: Part) => void;
  hasBomSelection: boolean;
}) {
  const [search, setSearch]         = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cat, setCat]               = useState('');
  const [subcat, setSubcat]         = useState('');
  const [mfr, setMfr]               = useState('');
  const [hoverId, setHoverId]       = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const subcatOptions = cat ? (PART_CATEGORIES.find((c) => c.name === cat)?.subcats ?? []) : [];
  const manufacturers = Array.from(new Set(MASTER_PARTS.map((pt) => pt.mfr))).sort();
  const activeFilterCount = [cat, subcat, mfr].filter(Boolean).length;

  const parts = useMemo(() => {
    let list = MASTER_PARTS;
    if (scope === 'favorites') list = list.filter((pt) => favorites.has(pt.id));
    if (scope === 'common')    list = commonIds.map((id) => MASTER_PARTS.find((pt) => pt.id === id)).filter(Boolean) as Part[];
    if (scope === 'recent')    list = recentIds.map((id) => MASTER_PARTS.find((pt) => pt.id === id)).filter(Boolean) as Part[];
    if (cat)    list = list.filter((pt) => pt.cat === cat);
    if (subcat) list = list.filter((pt) => pt.subcat === subcat);
    if (mfr)    list = list.filter((pt) => pt.mfr === mfr);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((pt) => pt.name.toLowerCase().includes(q) || pt.code.toLowerCase().includes(q) || pt.mfr.toLowerCase().includes(q) || pt.subcat.toLowerCase().includes(q));
    }
    return list;
  }, [scope, favorites, commonIds, recentIds, cat, subcat, mfr, search]);

  const selectStyle: React.CSSProperties = {
    width: '100%', height: 28, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 6,
    fontSize: 11, background: 'white', outline: 'none', color: '#374151',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      {/* Search + filters */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <Search size={12} color="#9CA3AF" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or add parts…"
            style={{ width: '100%', height: 32, paddingLeft: 28, paddingRight: 24, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: 'white' }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}>
              <X size={11} color="#9CA3AF" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, height: 24, padding: '0 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {showFilters ? <ChevronDown size={11} color="#9CA3AF" /> : <ChevronRight size={11} color="#9CA3AF" />}
          Filters
          {activeFilterCount > 0 && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '1px 5px', borderRadius: 9999 }}>{activeFilterCount}</span>
          )}
        </button>

        {showFilters && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
            <select value={cat} onChange={(e) => { setCat(e.target.value); setSubcat(''); }} style={selectStyle}>
              <option value="">All categories</option>
              {PART_CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select value={subcat} onChange={(e) => setSubcat(e.target.value)} disabled={!cat} style={{ ...selectStyle, opacity: cat ? 1 : 0.55 }}>
              <option value="">All subcategories</option>
              {subcatOptions.map((sc) => <option key={sc} value={sc}>{sc}</option>)}
            </select>
            <select value={mfr} onChange={(e) => setMfr(e.target.value)} style={selectStyle}>
              <option value="">All manufacturers</option>
              {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button onClick={() => { setCat(''); setSubcat(''); setMfr(''); }} style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', fontSize: 10, color: '#2563EB', cursor: 'pointer', padding: 0 }}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Part rows */}
      <div className="bp-lib-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '6px 12px 4px', fontSize: 10, color: '#9CA3AF' }}>
          {parts.length} part{parts.length !== 1 ? 's' : ''} · drag onto the BOM
        </div>
        {parts.map((pt) => {
          const fav = favorites.has(pt.id);
          const showActions = hoverId === pt.id;
          return (
            <div
              key={pt.id}
              draggable
              onDragStart={(e) => {
                dragState.part = pt;
                setDraggingId(pt.id);
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData(PART_DRAG_TYPE, pt.id);
                e.dataTransfer.setData('text/plain', pt.name);
              }}
              onDragEnd={() => { dragState.part = null; setDraggingId(null); }}
              onMouseEnter={() => setHoverId(pt.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                padding: '7px 12px', borderBottom: '1px solid #F9FAFB', cursor: 'grab',
                background: draggingId === pt.id ? '#EFF6FF' : showActions ? '#F9FAFB' : 'white',
                opacity: draggingId === pt.id ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pt.name}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pt.code} · {pt.mfr}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#16A34A', fontWeight: 600 }}>${pt.price.toFixed(2)}</div>
                  <div style={{ fontSize: 9, color: '#9CA3AF' }}>{pt.unit}</div>
                </div>
              </div>

              {showActions && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                  <button
                    onClick={() => onAddPart(pt)}
                    style={{ height: 22, padding: '0 8px', border: 'none', borderRadius: 5, background: '#EFF6FF', color: '#1D4ED8', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <Plus size={10} /> Add
                  </button>
                  <button
                    onClick={() => onReplacePart(pt)}
                    title={hasBomSelection ? 'Replace the selected BOM component' : 'Select a BOM component first'}
                    style={{ height: 22, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', color: hasBomSelection ? '#374151' : '#9CA3AF', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <RefreshCw size={9} /> Replace
                  </button>
                  <button
                    onClick={() => onToggleFavorite(pt.id)}
                    aria-label={fav ? 'Remove favourite' : 'Add favourite'}
                    style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}
                  >
                    <Star size={11} fill={fav ? '#F59E0B' : 'none'} color={fav ? '#F59E0B' : '#D1D5DB'} />
                  </button>
                </div>
              )}
              {!showActions && fav && (
                <div style={{ marginTop: 3 }}>
                  <Star size={10} fill="#F59E0B" color="#F59E0B" />
                </div>
              )}
            </div>
          );
        })}
        {parts.length === 0 && (
          <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>
            {scope === 'all' ? `No parts match "${search}"` : 'Nothing here yet — parts appear as you use them.'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main LibraryView ─────────────────────────────────────────────────────────

type LibraryWorkspace = 'builder' | 'columns' | 'workbench';

/**
 * Libraries page. Workspaces over the same data:
 *   Workbench — assemblies, bench and parts side by side.
 *   Columns   — McCormick-style cascading drill-down for fast picking.
 *   Builder   — guided, context-aware assembly configuration (the original).
 *
 * Builder is kept in the codebase but taken off the switcher: the guided
 * configuration it offers now lives inside the other two. Re-add its entry to
 * WORKSPACE_TABS to bring the tab back.
 */
const WORKSPACE_TABS: [LibraryWorkspace, string][] = [
  ['workbench', 'Workbench'],
  ['columns', 'Column browser'],
];
export function LibraryView() {
  const [workspace, setWorkspace] = useState<LibraryWorkspace>('columns');
  const [libraries, setLibraries] = useState<Library[]>(LIBRARIES);
  const [activeLibId, setActiveLibId] = useState('dollartree');
  const activeLib = libraries.find((l) => l.id === activeLibId)!;

  const switcher = (
    <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
      {WORKSPACE_TABS.map(([key, label]) => (
        <button
          key={key}
          onClick={() => setWorkspace(key)}
          title={key === 'workbench' ? 'Assemblies, the bench and parts side by side — browse and build together'
            : key === 'builder' ? 'Guided assembly configuration'
            : 'McCormick-style cascading drill-down'}
          style={{
            height: 34, padding: '0 12px', border: 'none',
            background: workspace === key ? '#EFF6FF' : 'white',
            color: workspace === key ? '#1D4ED8' : '#6B7280',
            fontSize: 12, fontWeight: workspace === key ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const libraryPicker = (
    <LibraryPicker libraries={libraries} activeId={activeLibId} onChange={setActiveLibId} />
  );

  if (workspace === 'workbench') {
    return <WorkbenchLibraryView activeLib={activeLib} viewSwitcher={switcher} libraryPicker={libraryPicker} />;
  }

  if (workspace === 'columns') {
    return <ColumnLibraryView activeLib={activeLib} viewSwitcher={switcher} libraryPicker={libraryPicker} />;
  }

  return (
    <BuilderLibraryView
      libraries={libraries}
      setLibraries={setLibraries}
      activeLibId={activeLibId}
      setActiveLibId={setActiveLibId}
      viewSwitcher={switcher}
    />
  );
}

function BuilderLibraryView({ libraries, setLibraries, activeLibId, setActiveLibId, viewSwitcher }: {
  libraries: Library[];
  setLibraries: React.Dispatch<React.SetStateAction<Library[]>>;
  activeLibId: string;
  setActiveLibId: React.Dispatch<React.SetStateAction<string>>;
  viewSwitcher: React.ReactNode;
}) {
  const [activeCategory, setActiveCategory] = useState<CategoryCode>('BPC-01');
  const [mode, setMode]                     = useState<WorkspaceMode>('browse');
  const [selectedContext, setSelectedContext] = useState('ACT Ceiling');
  const [showNewLib, setShowNewLib]         = useState(false);
  const [showSave, setShowSave]             = useState(false);

  // Sidebar: which library is open, and which slice of it.
  const [libMode, setLibMode]               = useState<LibraryMode>('assemblies');
  const [scope, setScope]                   = useState<LibraryScope>('all');
  const [activeSubcat, setActiveSubcat]     = useState<string | null>(null);

  // Parts usage feeds the auto-populated Common and Recent scopes. Seeded with
  // the parts that already appear across the shipped assemblies.
  const [partFavorites, setPartFavorites]   = useState<Set<string>>(new Set(['pt-38', 'pt-4']));
  const [partUsage, setPartUsage]           = useState<Record<string, number>>({
    'pt-38': 9, 'pt-4': 8, 'pt-17': 7, 'pt-18': 6, 'pt-9': 5, 'pt-25': 4, 'pt-32': 3, 'pt-41': 2,
  });
  const [recentPartIds, setRecentPartIds]   = useState<string[]>(['pt-10', 'pt-36', 'pt-37', 'pt-45', 'pt-46', 'pt-21', 'pt-13', 'pt-29']);
  const [recentAssemblyIds, setRecentAssemblyIds] = useState<string[]>(['fx-201', 'dv-101']);
  const [assemblyUsage, setAssemblyUsage]   = useState<Record<string, number>>({ 'fx-201': 6, 'dv-101': 4, 'fx-203': 2 });

  // Selected BOM component — the target of "Replace" in the Parts library.
  const [selectedBomId, setSelectedBomId]   = useState<string | null>(null);

  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(FIXTURE_ASSEMBLIES[0]);
  const [bomItems, setBomItems]             = useState<BOMItem[]>(FIXTURE_ASSEMBLIES[0].bom);
  const [bomName, setBomName]               = useState(FIXTURE_ASSEMBLIES[0].name);

  const [buildBomItems, setBuildBomItems]   = useState<BOMItem[]>([]);
  const [buildBomName, setBuildBomName]     = useState('');

  const [assemblyMap, setAssemblyMap]       = useState<Record<string, Assembly[]>>({
    'BPC-01': FIXTURE_ASSEMBLIES,
    'BPC-02': DEVICE_ASSEMBLIES,
    'BPC-03': GENERIC_ASSEMBLIES,
    'BPC-04': GENERIC_ASSEMBLIES,
  });

  const activeLib         = libraries.find((l) => l.id === activeLibId)!;
  const currentAssemblies = assemblyMap[activeCategory] ?? [];

  function toggleFav(id: string) {
    setAssemblyMap((prev) => {
      const arr = (prev[activeCategory] ?? []).map((a) => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a);
      return { ...prev, [activeCategory]: arr };
    });
  }

  function handleCategoryChange(code: CategoryCode) {
    setActiveCategory(code);
    setSelectedAssembly(null);
    setBomItems([]);
    setBomName('');
    setSelectedBomId(null);
    setSelectedContext(contextsForCategory(code)[0] || '');
  }

  function handleAssemblySelect(a: Assembly) {
    setSelectedAssembly(a);
    setBomItems(a.bom);
    setBomName(a.name);
    setSelectedBomId(null);
    setRecentAssemblyIds((prev) => [a.id, ...prev.filter((id) => id !== a.id)].slice(0, 12));
    setAssemblyUsage((prev) => ({ ...prev, [a.id]: (prev[a.id] ?? 0) + 1 }));
  }

  const displayBomItems    = mode === 'browse' ? bomItems : buildBomItems;
  const displayBomName     = mode === 'browse' ? bomName  : buildBomName;
  const displaySetBomItems = mode === 'browse'
    ? (items: BOMItem[]) => setBomItems(items)
    : (items: BOMItem[]) => setBuildBomItems(items);

  // ── Parts → assembly actions ──────────────────────────────────────────────

  function recordPartUse(id: string) {
    setPartUsage((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setRecentPartIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12));
  }

  function addPartToBom(part: Part) {
    const item: BOMItem = {
      id: `part-${part.id}-${Date.now()}`,
      group: part.bomGroup,
      name: part.name,
      code: part.code,
      qty: 1,
      unit: part.unit,
      required: false,
      priceStatus: 'ok',
    };
    displaySetBomItems([...displayBomItems, item]);
    recordPartUse(part.id);
    toast.success('Part added to assembly', { description: `${part.name} · ${part.bomGroup}` });
  }

  function replaceSelectedBomItem(part: Part) {
    if (!selectedBomId) {
      toast.error('Select a component first', { description: 'Click a row in the Live Bill of Materials, then Replace.' });
      return;
    }
    const target = displayBomItems.find((i) => i.id === selectedBomId);
    displaySetBomItems(displayBomItems.map((i) => i.id === selectedBomId
      ? { ...i, name: part.name, code: part.code, unit: part.unit }
      : i));
    recordPartUse(part.id);
    toast.success('Component replaced', { description: `${target?.name ?? 'Component'} → ${part.name}` });
  }

  function handleDropPart(partId: string) {
    const part = MASTER_PARTS.find((pt) => pt.id === partId);
    if (part) addPartToBom(part);
  }

  function togglePartFavorite(id: string) {
    setPartFavorites((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  // Scoped lists for the sidebar's Common / Recent / Favorites views.
  const commonPartIds = useMemo(
    () => Object.entries(partUsage).sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 12),
    [partUsage],
  );

  const allAssemblies = useMemo(() => {
    const seen = new Set<string>();
    const out: Assembly[] = [];
    for (const list of Object.values(assemblyMap)) {
      for (const a of list) { if (!seen.has(a.id)) { seen.add(a.id); out.push(a); } }
    }
    return out;
  }, [assemblyMap]);

  const scopedAssemblies = useMemo(() => {
    if (scope === 'favorites') return allAssemblies.filter((a) => a.isFavorite);
    if (scope === 'recent')    return recentAssemblyIds.map((id) => allAssemblies.find((a) => a.id === id)).filter(Boolean) as Assembly[];
    if (scope === 'common')    return Object.entries(assemblyUsage).sort((a, b) => b[1] - a[1]).map(([id]) => allAssemblies.find((a) => a.id === id)).filter(Boolean) as Assembly[];
    return allAssemblies;
  }, [scope, allAssemblies, recentAssemblyIds, assemblyUsage]);

  return (
    <div className="bp-lib" style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', background: '#F6F7F9' }}>

      {/* ── Left panel ── */}
      <div className="bp-lib-left" style={{ width: 240, minWidth: 240, background: 'white', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Library dropdown selector */}
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Active Library</label>
          <div style={{ position: 'relative' }}>
            <select
              value={activeLibId}
              onChange={(e) => {
                const lib = libraries.find((l) => l.id === e.target.value);
                setActiveLibId(e.target.value);
                if (lib) toast.info(`Switched to ${lib.name}`, { description: `${lib.count} assemblies · ${LIB_TYPE_CFG[lib.type].label}` });
              }}
              style={{ width: '100%', height: 36, paddingLeft: 10, paddingRight: 28, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'white', outline: 'none', appearance: 'none', cursor: 'pointer', color: '#111827' }}>
              {/* Type, count and read-only state are shown in the meta row below. */}
              {libraries.map((lib) => (
                <option key={lib.id} value={lib.id}>{lib.name}</option>
              ))}
            </select>
            <ChevronDown size={13} color="#6B7280" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          {/* Active lib meta */}
          {activeLib && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: LIB_TYPE_CFG[activeLib.type].color }}>{LIB_TYPE_CFG[activeLib.type].label.toUpperCase()}</span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{activeLib.count} assemblies</span>
              {activeLib.readonly && (
                <span style={{ fontSize: 10, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 2 }}><Lock size={8} /> Read only</span>
              )}
            </div>
          )}
          <button onClick={() => setShowNewLib(true)}
            style={{ marginTop: 8, width: '100%', height: 26, border: '1px dashed #D1D5DB', borderRadius: 6, background: 'transparent', fontSize: 11, color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Plus size={11} /> New Library
          </button>
        </div>

        {/* Assemblies / Parts — the two libraries stay separate */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          {([['assemblies', 'Assemblies'], ['parts', 'Parts']] as const).map(([key, label]) => {
            const active = libMode === key;
            return (
              <button
                key={key}
                onClick={() => { setLibMode(key); setScope('all'); }}
                style={{
                  flex: 1, height: 38, border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#2563EB' : '#6B7280',
                  borderBottom: active ? '2px solid #2563EB' : '2px solid transparent', transition: 'color 120ms',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* All / Common / Recent / Favorites — applies to the open library */}
        <ScopeChips scope={scope} onChange={setScope} />

        {libMode === 'assemblies' ? (
          <AssembliesNavPanel
            scope={scope}
            activeCategory={activeCategory}
            activeSubcat={activeSubcat}
            onSelectCategory={(code) => { if (code !== activeCategory) handleCategoryChange(code); }}
            onSelectSubcat={setActiveSubcat}
            scopedAssemblies={scopedAssemblies}
            selectedAssemblyId={selectedAssembly?.id}
            onSelectAssembly={handleAssemblySelect}
          />
        ) : (
          <PartsLibraryPanel
            scope={scope}
            favorites={partFavorites}
            onToggleFavorite={togglePartFavorite}
            commonIds={commonPartIds}
            recentIds={recentPartIds}
            onAddPart={addPartToBom}
            onReplacePart={replaceSelectedBomItem}
            hasBomSelection={!!selectedBomId}
          />
        )}
      </div>

      {/* ── Centre panel ── */}
      <div className="bp-lib-centre" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div className="bp-toolbar" style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{CATEGORIES.find((c) => c.code === activeCategory)?.name}</span>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8, fontFamily: 'IBM Plex Mono, monospace' }}>{activeCategory}</span>
            {activeSubcat && (
              <>
                <ChevronRight size={11} color="#D1D5DB" style={{ margin: '0 2px 0 6px', flexShrink: 0 }} />
                <button
                  onClick={() => setActiveSubcat(null)}
                  title="Clear subcategory"
                  style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 13, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer' }}
                >
                  {activeSubcat}
                </button>
              </>
            )}
          </div>
          {activeLib && (
            <div style={{ fontSize: 11, color: LIB_TYPE_CFG[activeLib.type].color, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: LIB_TYPE_CFG[activeLib.type].bg, display: 'flex', alignItems: 'center', gap: 4 }}>
              {activeLib.readonly && <Lock size={9} />}{activeLib.name}
            </div>
          )}
          {viewSwitcher}
          <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 7, overflow: 'hidden' }}>
            {(['browse', 'build'] as WorkspaceMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                style={{ height: 30, padding: '0 14px', border: 'none', background: mode === m ? '#EFF6FF' : 'white', color: mode === m ? '#1D4ED8' : '#6B7280', fontSize: 12, fontWeight: mode === m ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {mode === 'browse' ? (
            <BrowsePanel
              category={activeCategory}
              activeSubcat={activeSubcat}
              selectedContext={selectedContext}
              onContextChange={setSelectedContext}
              selectedAssembly={selectedAssembly}
              onAssemblyChange={handleAssemblySelect}
              onToggleFav={toggleFav}
              assemblies={currentAssemblies}
            />
          ) : (
            <BuildPanel
              category={activeCategory}
              onBomChange={(items, name) => { setBuildBomItems(items); setBuildBomName(name); }}
            />
          )}
        </div>
      </div>

      {/* ── Right panel: Live BOM ── */}
      <div className="bp-lib-right" style={{ width: 340, minWidth: 340, background: 'white', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Live Bill of Materials</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => toast.info('BOM export — CSV download')}
              style={{ width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Export BOM">
              <Download size={11} color="#6B7280" />
            </button>
            <button onClick={() => { if (!displayBomName) { toast.error('Select or build an assembly first'); return; } setShowSave(true); }}
              style={{ height: 26, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Save size={10} /> Save
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <LiveBOM
            items={displayBomItems}
            assemblyName={displayBomName}
            onSave={() => { if (!displayBomName) { toast.error('Select or build an assembly first'); return; } setShowSave(true); }}
            onItemsChange={displaySetBomItems}
            selectedId={selectedBomId}
            onSelectItem={setSelectedBomId}
            onDropPart={handleDropPart}
          />
        </div>
      </div>

      {showNewLib && (
        <NewLibraryModal
          onClose={() => setShowNewLib(false)}
          onCreated={(lib) => { setLibraries((prev) => [...prev, lib]); setActiveLibId(lib.id); }}
        />
      )}
      {showSave && (
        <SaveAssemblyModal
          onClose={() => setShowSave(false)}
          defaultName={displayBomName}
          libraries={libraries}
        />
      )}
    </div>
  );
}
