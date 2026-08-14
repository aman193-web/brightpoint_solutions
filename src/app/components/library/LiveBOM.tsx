import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, ChevronDown, ChevronRight, MoreHorizontal, Package, Play, RefreshCw, Save } from 'lucide-react';
import { BOMItem, UNIT_OPTIONS, PART_DRAG_TYPE, dragState } from './libraryData';

/**
 * The live bill of materials.
 *
 * Exported so the full-screen builder renders the same component rather than a
 * second implementation — editable quantities and units, remove, replace by
 * drop, grouping and calculated quantities all behave identically wherever the
 * BOM appears.
 */
export function LiveBOM({ items, assemblyName, onSave, onItemsChange, selectedId, onSelectItem, onDropPart }: {
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
  const laborHrs    = items.length * 0.35;
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
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Audit trail and price history are available via the Extensions workspace.</div>
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
          { label: 'Labor hours',   value: laborHrs.toFixed(1) + ' hrs', mono: true },
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
