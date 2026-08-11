import React, { useRef, useState } from 'react';
import { Copy, Layers, Save, X } from 'lucide-react';
import {
  CategoryCode, Assembly, AssemblyStatus, BOMItem, Library,
  CATEGORIES, ASSEMBLY_SUBCATS, typesFor, LIB_TYPE_CFG,
  STATUS_CFG, contextsForCategory,
} from './libraryData';

let saveSeq = 0;
/** Unique suffix for a newly filed assembly. */
function nextSaveSeq(): string {
  saveSeq += 1;
  return `${Date.now().toString(36)}-${saveSeq}`;
}

/**
 * Save Assembly — the one dialog that files an assembly.
 *
 * Lifted out of the Column browser so the full-screen builder saves through the
 * same flow rather than growing a second one. Behaviour is unchanged: name,
 * destination library, category, subcategory and type, with the branch on
 * screen pre-filled.
 */
export function SaveAssemblyModal({
  seedCat, seedSubcat, seedType, seedName, seedBom, libraries, onClose, onSave, existing, duplicateOf,
}: {
  seedCat: CategoryCode;
  seedSubcat: string | null;
  seedType: string | null;
  seedName: string;
  seedBom: BOMItem[];
  libraries: Library[];
  onClose: () => void;
  onSave: (a: Assembly, cat: CategoryCode, libraryId: string) => void;
  /**
   * Filing a copy rather than the assembly on the bench. Only the wording
   * changes — the fields, validation and filing are identical, because a
   * duplicate *is* a save with a head start.
   */
  duplicateOf?: string | null;
  /**
   * Assemblies already filed, so a name clash can be pointed out. Advisory
   * only — two assemblies may legitimately share a name.
   */
  existing?: { name: string; cat: CategoryCode; libraryId?: string }[];
}) {
  const [name, setName] = useState(seedName);
  const [code, setCode] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState<CategoryCode>(seedCat);
  const [subcat, setSubcat] = useState(seedSubcat ?? (ASSEMBLY_SUBCATS[seedCat]?.[0] ?? ''));
  const [type, setType] = useState(seedType ?? '');
  const [status, setStatus] = useState<AssemblyStatus>('custom');
  const [dest, setDest] = useState(libraries.filter((l) => !l.readonly)[0]?.id ?? '');
  const [error, setError] = useState('');
  /** Set when a clash was found and the estimator has not yet said carry on. */
  const [clash, setClash] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const subcats = ASSEMBLY_SUBCATS[cat] ?? [];
  const types = subcat ? typesFor(cat, subcat) : [];
  const editable = libraries.filter((l) => !l.readonly);

  // Suggest a code from the branch so estimators do not invent their own scheme.
  const suggestedCode = `BPA-${cat.replace('BPC-', '')}-${String(100 + Math.min(99, subcats.indexOf(subcat) + 1))}`;

  /** A name already used in this category and destination library. */
  const nameTaken = (existing ?? []).some((e) =>
    e.name.trim().toLowerCase() === name.trim().toLowerCase()
    && e.cat === cat
    && (e.libraryId === undefined || e.libraryId === dest));

  function save(force = false) {
    if (!name.trim()) { setError('Give the assembly a name.'); return; }
    if (!subcat) { setError('Choose a subcategory so it files correctly.'); return; }
    if (!dest) { setError('Choose a destination library.'); return; }
    // Advisory, not a block: warn once, then take the estimator at their word.
    if (nameTaken && !force) { setClash(true); return; }
    const a: Assembly = {
      /*
       * Always a fresh id. Deriving it from the name would make a duplicate
       * saved under its original name overwrite the assembly it was copied
       * from, which is the one thing duplication must never do.
       */
      id: `custom-${cat}-${nextSaveSeq()}`,
      name: name.trim(),
      code: (code.trim() || suggestedCode).toUpperCase(),
      desc: desc.trim() || `${name.trim()} — ${subcat}${type ? ` · ${type}` : ''}`,
      status,
      subcat,
      type: type || undefined,
      context: contextsForCategory(cat).slice(0, 1),
      wiringMethod: seedBom.find((i) => i.group === 'Wiring')?.name ?? '—',
      source: 'company',
      isFavorite: false,
      bom: seedBom.map((i, idx) => ({ ...i, id: `nb${idx + 1}` })),
    };
    onSave(a, cat, dest);
  }

  const field: React.CSSProperties = {
    width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB',
    borderRadius: 7, fontSize: 13, background: 'white', outline: 'none', boxSizing: 'border-box',
  };
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,24,39,0.45)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={15} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>
            {duplicateOf ? 'Duplicate assembly' : 'Save assembly'}
          </span>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Assembly name *</label>
            <input ref={nameInputRef} value={name} onChange={(e) => { setName(e.target.value); setError(''); setClash(false); }} placeholder="e.g. LED Troffer 2×4 — Wood Framing" style={field} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={label}>Category *</label>
              <select
                value={cat}
                onChange={(e) => {
                  const next = e.target.value as CategoryCode;
                  setCat(next);
                  setSubcat(ASSEMBLY_SUBCATS[next]?.[0] ?? '');
                  setType('');
                }}
                style={field}
              >
                {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Subcategory *</label>
              <select value={subcat} onChange={(e) => { setSubcat(e.target.value); setType(''); setError(''); }} style={field}>
                {subcats.length === 0 && <option value="">No subcategories</option>}
                {subcats.map((sc) => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={label}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={types.length === 0} style={{ ...field, opacity: types.length === 0 ? 0.55 : 1 }}>
                <option value="">— none —</option>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Assembly code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={suggestedCode} style={{ ...field, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional — defaults to the branch it files under" style={field} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={label}>Save to library *</label>
              <select value={dest} onChange={(e) => { setDest(e.target.value); setError(''); setClash(false); }} style={field}>
                {editable.length === 0 && <option value="">No editable library</option>}
                {editable.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as AssemblyStatus)} style={field}>
                {(['custom', 'project-standard', 'recommended', 'compatible', 'needs-review'] as AssemblyStatus[]).map((st) => (
                  <option key={st} value={st}>{STATUS_CFG[st].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 11px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, marginBottom: 12 }}>
            <Layers size={13} color="#6B7280" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: '#374151', lineHeight: '17px' }}>
              {duplicateOf
                ? <>Copies {seedBom.length} component{seedBom.length === 1 ? '' : 's'} from <strong style={{ fontWeight: 600 }}>{duplicateOf}</strong>.</>
                : seedBom.length > 0
                  ? <>Saves the {seedBom.length} component{seedBom.length === 1 ? '' : 's'} on the bench.</>
                  : <>Saving with an empty BOM.</>}
              <span style={{ display: 'block', fontSize: 11, color: '#9CA3AF' }}>
                {duplicateOf
                  ? 'The original is left exactly as it is.'
                  : seedBom.length > 0
                    ? 'Close this and keep editing if the BOM is not finished.'
                    : 'You can add components now and save again — nothing is locked.'}
              </span>
            </span>
          </div>

          <div style={{ fontSize: 11, color: '#6B7280', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 7, padding: '8px 10px', marginBottom: 14 }}>
            Files under <strong>{CATEGORIES.find((c) => c.code === cat)?.name}</strong>
            {subcat ? <> › <strong>{subcat}</strong></> : null}
            {type ? <> › <strong>{type}</strong></> : null}
          </div>

          {clash && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', marginBottom: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#92400E', flex: 1, minWidth: 180 }}>
                An assembly with this name already exists in this library.
              </span>
              <button
                onClick={() => { setClash(false); nameInputRef.current?.focus(); nameInputRef.current?.select(); }}
                style={{ height: 28, padding: '0 10px', border: '1px solid #FDE68A', borderRadius: 6, background: 'white', fontSize: 12, color: '#92400E', cursor: 'pointer' }}
              >
                Rename
              </button>
              <button
                onClick={() => save(true)}
                style={{ height: 28, padding: '0 10px', border: 'none', borderRadius: 6, background: '#D97706', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer' }}
              >
                Save anyway
              </button>
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ height: 34, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => save()} style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {duplicateOf ? <><Copy size={13} /> Duplicate</> : <><Save size={13} /> Save assembly</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
