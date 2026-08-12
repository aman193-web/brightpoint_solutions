import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Search, SlidersHorizontal, Download, Upload, ChevronDown, ChevronUp, ChevronRight,
  MoreHorizontal, AlertTriangle, Lock, Check, X, ExternalLink, Sparkles,
  FileText, Info,
} from 'lucide-react';
import { ProjectHeader } from '../projects/ProjectHeader';
import {
  PricingSource, ItemStatus, Discipline, SystemGroup, DrawingLocation, PricingRow,
  SYSTEM_ORDER, MATERIAL_LINES,
} from '../../lib/materials';
import { LABOR_PROFILES, laborProfile, useLaborProfile } from '../../lib/costing';
import { AREA_BY_DRAWING, SYSTEM_BY_GROUP } from '../../lib/bidScope';
import {
  CategoryGroup, CategoryValue, useProjectBreakdown, sortedGroups, sortedValues,
} from '../../lib/projectBreakdown';

/** The job's priced material, shared with the Bid Builder. */
const ROWS = MATERIAL_LINES;

// ─── Project Breakdown, applied to priced material ────────────────────────────

/**
 * Which Project Breakdown value a material line falls under.
 *
 * Joined on `sourceKey`, never on the display name — the same rule the usage
 * counts follow — so renaming "Floor 2" to "Level 2" in Project Breakdown keeps
 * every figure on this screen attached to it.
 *
 * Area comes from the sheet the material was taken off (`AREA_BY_DRAWING`) and
 * System from the estimate's own system group (`SYSTEM_BY_GROUP`): both are real
 * joins that already existed for Bid Summary scope. **Bid Package has no source
 * on a material line** — a package is assigned to takeoff work, not to a priced
 * row — so those lines report the project's default package, and the group header
 * says so rather than implying the split has been made.
 */
function valueForRow(group: CategoryGroup, row: PricingRow): CategoryValue | null {
  const bySourceKey = (key?: string) =>
    (key ? group.values.find((v) => v.sourceKey === key) : undefined) ?? null;

  if (group.type === 'area') return bySourceKey(AREA_BY_DRAWING[row.drawingPage]);
  if (group.type === 'system') return bySourceKey(SYSTEM_BY_GROUP[row.system]);
  if (group.type === 'bid-package') {
    return group.values.find((v) => v.isDefault) ?? group.values[0] ?? null;
  }
  /* A custom group has no rule to reach a priced row yet. Reporting nothing is
     the honest answer; guessing one would put money against a value nobody
     assigned. */
  return null;
}

/** True where this dimension can actually place a priced row. */
const groupIsDerivable = (g: CategoryGroup) =>
  g.type === 'area' || g.type === 'system' || g.type === 'bid-package';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_CFG: Record<PricingSource, { label: string; color: string; bg: string; border: string }> = {
  programme: { label: 'Cost',       color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  company:   { label: 'Company',    color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  supplier:  { label: 'Supplier',   color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
  override:  { label: 'Override',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  missing:   { label: 'Missing',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  stale:     { label: 'Stale',      color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  quoted:    { label: 'Quoted',     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  locked:    { label: 'Locked',     color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

const STATUS_CFG: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  'complete':       { label: 'Complete',      color: '#16A34A', bg: '#F0FDF4' },
  'missing-price':  { label: 'Missing price', color: '#DC2626', bg: '#FEF2F2' },
  'ai-suggested':   { label: 'AI suggested',  color: '#7C3AED', bg: '#F5F3FF' },
  'pending-review': { label: 'Pending',       color: '#D97706', bg: '#FFFBEB' },
  'locked':         { label: 'Locked',        color: '#6B7280', bg: '#F9FAFB' },
  'excluded':       { label: 'Excluded',      color: '#9CA3AF', bg: '#F9FAFB' },
};

const DISC_CFG: Record<Discipline, { label: string; color: string; bg: string }> = {
  lighting:     { label: 'Lighting',    color: '#7C3AED', bg: '#F5F3FF' },
  power:        { label: 'Power',       color: '#1D4ED8', bg: '#EFF6FF' },
  'fire-alarm': { label: 'Fire Alarm',  color: '#DC2626', bg: '#FEF2F2' },
  data:         { label: 'Data',        color: '#059669', bg: '#F0FDF4' },
  safety:       { label: 'Safety',      color: '#D97706', bg: '#FFFBEB' },
};

const ROW_H = 44;

function money(v: number) { return '$' + v.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function hrs(v: number) { return v.toFixed(2) + ' h'; }

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ src, small }: { src: PricingSource; small?: boolean }) {
  const c = SOURCE_CFG[src];
  return (
    <span style={{
      fontSize: small ? 10 : 11, fontWeight: 500, padding: small ? '1px 5px' : '2px 7px',
      borderRadius: 9999, color: c.color, backgroundColor: c.bg, border: `1px solid ${c.border}`,
      display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
    }}>
      {src === 'missing' && <AlertTriangle size={small ? 8 : 9} />}
      {src === 'override' && <Lock size={small ? 8 : 9} />}
      {src === 'ai-suggested' && <Sparkles size={small ? 8 : 9} />}
      {c.label}
    </span>
  );
}

// ─── Expandable row detail ────────────────────────────────────────────────────

function RowDetail({ row, onClose, width }: { row: PricingRow; onClose: () => void; width?: number }) {
  return (
    <div style={{ position: 'sticky', left: 0, width: width ?? '100%', boxSizing: 'border-box', padding: '12px 16px 12px 56px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 12 }}>
        {/* Pricing breakdown */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Pricing sources</div>
          {[
            { label: 'Cost price', value: row.baseProgrammePrice, src: 'programme' as PricingSource },
            row.companyPrice != null && { label: 'Company price', value: row.companyPrice, src: 'company' as PricingSource },
            row.supplierPrice != null && { label: `Supplier (${row.supplierName})`, value: row.supplierPrice, src: 'supplier' as PricingSource },
          ].filter(Boolean).map((p: any) => (
            <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12, borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280' }}>{p.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: p.src === row.selectedSource ? '#111827' : '#9CA3AF', fontWeight: p.src === row.selectedSource ? 600 : 400 }}>
                  ${p.value.toFixed(2)}
                </span>
                {p.src === row.selectedSource && <Check size={10} color="#16A34A" />}
              </div>
            </div>
          ))}
          {row.quoteRef && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>
              Quote ref: <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{row.quoteRef}</span>
            </div>
          )}
          {row.overrideReason && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#D97706', display: 'flex', gap: 4 }}>
              <AlertTriangle size={10} style={{ flexShrink: 0, marginTop: 1 }} />
              {row.overrideReason}
            </div>
          )}
        </div>

        {/* Drawing locations */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Drawing locations ({row.locations.length})</div>
          {row.locations.map((loc, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#374151' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500, marginRight: 6 }}>{loc.page}</span>
                Marker #{loc.markerNum}
              </span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#2563EB' }}>
                <ExternalLink size={10} /> Open
              </button>
            </div>
          ))}
        </div>

        {/* Audit */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Audit</div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: '20px' }}>
            <div>Last updated: <span style={{ color: '#374151' }}>{row.lastUpdated}</span></div>
            {row.updatedBy && <div>Updated by: <span style={{ color: '#374151' }}>{row.updatedBy}</span></div>}
            <div>Source: <SourceBadge src={row.selectedSource} small /></div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea
              defaultValue={row.notes}
              rows={2}
              placeholder="Add notes…"
              style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 8px', fontSize: 11, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ height: 28, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
          Override price
        </button>
        <button style={{ height: 28, padding: '0 12px', border: 'none', borderRadius: 6, background: '#EFF6FF', fontSize: 11, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ExternalLink size={11} /> Open in drawing
        </button>
        <button onClick={onClose} style={{ height: 28, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, color: '#6B7280', cursor: 'pointer', marginLeft: 'auto' }}>
          Collapse
        </button>
      </div>
    </div>
  );
}

// ─── Supplier Import Drawer ───────────────────────────────────────────────────

type ImportStep = 'upload' | 'map' | 'match' | 'confirm';

function SupplierImportDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);

  const STEPS = ['Upload file', 'Map columns', 'Match items', 'Confirm'];
  const stepIdx = ['upload', 'map', 'match', 'confirm'].indexOf(step);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }} />
      <div style={{ width: 560, background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={15} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>Import supplier pricing</span>
          <button onClick={onClose} style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>

        {/* Progress steps */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                  background: i < stepIdx ? '#16A34A' : i === stepIdx ? '#2563EB' : '#F3F4F6',
                  color: i <= stepIdx ? 'white' : '#9CA3AF',
                }}>
                  {i < stepIdx ? <Check size={12} /> : i + 1}
                </div>
                <span style={{ fontSize: 10, color: i === stepIdx ? '#2563EB' : '#9CA3AF', fontWeight: i === stepIdx ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < stepIdx ? '#16A34A' : '#E5E7EB', margin: '0 4px', marginBottom: 18 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {step === 'upload' && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Supplier</label>
                <select style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, background: 'white', outline: 'none' }}>
                  <option>Select supplier…</option>
                  <option>Rexel</option>
                  <option>Home Depot Pro</option>
                  <option>Nedco</option>
                  <option>Wesco</option>
                  <option>+ Add new supplier</option>
                </select>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); setFile('Rexel_Quote_2026-0891.csv'); }}
                style={{
                  border: `2px dashed ${dragging ? '#2563EB' : '#E5E7EB'}`, borderRadius: 12,
                  padding: '40px 20px', textAlign: 'center', background: dragging ? '#EFF6FF' : '#FAFAFA',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
                onClick={() => setFile('Rexel_Quote_2026-0891.csv')}
              >
                {file ? (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{file}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>324 rows · 48 KB</div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} style={{ marginTop: 8, fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={28} color="#D1D5DB" style={{ marginBottom: 10 }} />
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Drag and drop a CSV file here</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>or click to browse · Max 50 MB · CSV only</div>
                  </>
                )}
              </div>
            </>
          )}

          {step === 'map' && (
            <>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                Brightpoint has automatically suggested column mappings. Verify and correct as needed.
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Brightpoint field', 'CSV column', 'Sample value'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #E5E7EB', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { field: 'Supplier item code', col: 'SKU', sample: 'REX-LED-40W', required: true },
                    { field: 'Description', col: 'Product Description', sample: '2×4 LED Troffer 40W', required: true },
                    { field: 'Unit price', col: 'Net Price', sample: '$41.80', required: true },
                    { field: 'Unit of measure', col: 'UOM', sample: 'EA', required: true },
                    { field: 'Part number', col: 'Mfr Part No.', sample: 'RT5 40/35K', required: false },
                    { field: 'Quote number', col: 'Quote #', sample: 'QT-2026-0891', required: false },
                    { field: 'Effective date', col: 'Price Date', sample: '2026-07-01', required: false },
                  ].map((row) => (
                    <tr key={row.field}>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #F3F4F6' }}>
                        <span style={{ color: '#374151', fontWeight: 500 }}>{row.field}</span>
                        {row.required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
                      </td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #F3F4F6' }}>
                        <select defaultValue={row.col} style={{ height: 28, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 12, background: 'white', outline: 'none' }}>
                          <option>— Not mapped —</option>
                          <option>{row.col}</option>
                        </select>
                      </td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #F3F4F6', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>{row.sample}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {step === 'match' && (
            <>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
                12 of 14 records matched. Review unmatched and low-confidence items.
              </div>
              {[
                { supplier: '2×4 LED Troffer 40W RT5', supplierCode: 'REX-001', supplierPrice: 41.80, match: 'LED Troffer 2×4 40W', matchCode: 'LIT-LED-001', confidence: 'exact', existing: 48.50, diff: -6.70 },
                { supplier: 'Emergency Exit Combo VEX-U', supplierCode: 'REX-002', supplierPrice: 62.00, match: 'Emergency Exit Combo Unit', matchCode: 'LIT-EXIT-001', confidence: 'high', existing: 68.00, diff: -6.00 },
                { supplier: '3/4" EMT 10\' stick', supplierCode: 'REX-003', supplierPrice: 1.24, match: '3/4" EMT Conduit', matchCode: 'CON-EMT-075', confidence: 'medium', existing: 3.80, diff: -2.56 },
                { supplier: '20A GFCI Tamper-Resistant', supplierCode: 'REX-004', supplierPrice: 22.50, match: null, matchCode: null, confidence: 'none', existing: null, diff: null },
              ].map((r, i) => (
                <div key={i} style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, marginBottom: 8, background: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{r.supplier}</div>
                      <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#9CA3AF' }}>{r.supplierCode} · ${r.supplierPrice.toFixed(2)}/ea</div>
                    </div>
                    <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#D1D5DB' }}>→</div>
                    <div style={{ flex: 1 }}>
                      {r.match ? (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{r.match}</div>
                          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#9CA3AF' }}>{r.matchCode}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No match found</div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 9999,
                        color: r.confidence === 'exact' ? '#16A34A' : r.confidence === 'high' ? '#1D4ED8' : r.confidence === 'medium' ? '#D97706' : '#DC2626',
                        background: r.confidence === 'exact' ? '#F0FDF4' : r.confidence === 'high' ? '#EFF6FF' : r.confidence === 'medium' ? '#FFFBEB' : '#FEF2F2',
                      }}>
                        {r.confidence === 'exact' ? 'Exact' : r.confidence === 'high' ? 'High' : r.confidence === 'medium' ? 'Medium' : 'No match'}
                      </span>
                    </div>
                  </div>
                  {r.diff !== null && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 11, color: '#6B7280' }}>
                      <span>Existing: ${r.existing?.toFixed(2)}</span>
                      <span style={{ color: r.diff < 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                        {r.diff < 0 ? '▼' : '▲'} ${Math.abs(r.diff).toFixed(2)} ({((r.diff / (r.existing ?? 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: 'flex', gap: 5 }}>
                    <button style={{ height: 25, padding: '0 10px', border: 'none', background: '#F0FDF4', borderRadius: 5, fontSize: 11, fontWeight: 500, color: '#16A34A', cursor: 'pointer' }}>
                      Accept
                    </button>
                    {!r.match && (
                      <button style={{ height: 25, padding: '0 10px', border: '1px solid #E5E7EB', background: 'white', borderRadius: 5, fontSize: 11, color: '#374151', cursor: 'pointer' }}>
                        Create company item
                      </button>
                    )}
                    <button style={{ height: 25, padding: '0 10px', border: '1px solid #E5E7EB', background: 'white', borderRadius: 5, fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {step === 'confirm' && (
            <div>
              <div style={{ padding: 16, background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#16A34A', marginBottom: 8 }}>Ready to import</div>
                {[
                  ['Records to import', '12'],
                  ['Records to skip', '2'],
                  ['New company items', '0'],
                  ['Price changes', '9'],
                  ['Total material price change', '−$186.40 (−9.3%)'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: '#6B7280' }}>{label}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500, color: '#111827' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Apply pricing to:</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', marginBottom: 6, cursor: 'pointer' }}>
                  <input type="radio" name="scope" defaultChecked style={{ accentColor: '#2563EB' }} /> This estimate only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                  <input type="radio" name="scope" style={{ accentColor: '#2563EB' }} /> Company price book (requires confirmation)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {step !== 'upload' && (
            <button onClick={() => setStep(['upload', 'map', 'match', 'confirm'][stepIdx - 1] as ImportStep)} style={{ height: 34, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step === 'confirm') { onClose(); return; }
              if (step === 'upload' && !file) { setFile('Rexel_Quote_2026-0891.csv'); return; }
              setStep(['upload', 'map', 'match', 'confirm'][stepIdx + 1] as ImportStep);
            }}
            style={{ height: 34, padding: '0 20px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer' }}
          >
            {step === 'confirm' ? 'Import pricing' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible cost section ─────────────────────────────────────────────────

/**
 * Every pricing bucket is a collapsible section with its total in the header, so
 * the screen reads as an organised recap rather than one flat list of lines.
 */
function CostSection({ title, total, meta, accent, bg, border, defaultOpen = false, children }: {
  title: string; total: string; meta?: string;
  accent: string; bg: string; border: string;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', background: 'white', marginBottom: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: 'none', cursor: 'pointer', background: bg, borderBottom: open ? `1px solid ${border}` : 'none', textAlign: 'left', flexWrap: 'wrap' }}
      >
        {open ? <ChevronDown size={14} color={accent} /> : <ChevronRight size={14} color={accent} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', flex: 1 }}>{title}</span>
        {meta && <span style={{ fontSize: 11, color: '#6B7280' }}>{meta}</span>}
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: accent }}>{total}</span>
      </button>
      {open && children}
    </div>
  );
}

function SectionFootNote({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#FAFAFA', borderTop: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 11, color: '#6B7280', flex: 1 }}>{text}</span>
      {action && (
        <button onClick={onAction} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, whiteSpace: 'nowrap' }}>
          {action}
        </button>
      )}
    </div>
  );
}

// ─── Main PricingWorkspace ────────────────────────────────────────────────────

interface PricingWorkspaceProps {
  onNavigateTo?: (page: string) => void;
  onBack?: () => void;
  projectStatus?: string;
  onStatusChange?: (status: string) => void;
}

export function PricingWorkspace({ onNavigateTo, onBack, projectStatus, onStatusChange }: PricingWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [sortCol, setSortCol] = useState<string>('description');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewportW, setViewportW] = useState<number | undefined>(undefined);
  const [collapsedSystems, setCollapsedSystems] = useState<Set<string>>(new Set());
  const [showLabor, setShowLabor] = useState(false);
  /* Shared with the Bid Builder's Labor section — one profile per estimate, so the
     two screens cannot state different rate bases for the same job. */
  const [globalLaborProfile, setGlobalLaborProfile] = useLaborProfile();
  const [discLaborOverrides, setDiscLaborOverrides] = useState<Record<string, string>>({});
  const [asmLaborOverride, setAsmLaborOverride] = useState<{ assembly: string; rate: string }>({ assembly: '', rate: '' });
  const containerRef = useRef<HTMLDivElement>(null);

  const rowH = ROW_H;

  // The expanded row detail sizes itself to the visible width.
  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      setViewportW(containerRef.current.clientWidth || undefined);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const filtered = useMemo(() => {
    let list = ROWS;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.description.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.assembly.toLowerCase().includes(q));
    }
    if (filterDiscipline) list = list.filter((r) => r.discipline === filterDiscipline);
    if (filterStatus) list = list.filter((r) => r.status === filterStatus);
    if (filterSource) list = list.filter((r) => r.selectedSource === filterSource);
    return [...list].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortCol];
      const bv = (b as Record<string, unknown>)[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [search, filterDiscipline, filterStatus, filterSource, sortCol, sortDir]);

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  function clearFilters() {
    setSearch(''); setFilterDiscipline(''); setFilterStatus(''); setFilterSource('');
  }

  // Totals. Material only — every other bucket is the Bid Builder's.
  const totalMaterial = ROWS.reduce((s, r) => s + r.extMaterialCost, 0);
  /** NECA Column 1 hours implied by the takeoff quantities on this screen. */
  const totalNeca1Hrs = ROWS.reduce((s, r) => s + r.neca1 * r.qty, 0);
  const missingCount = ROWS.filter((r) => r.status === 'missing-price').length;
  const pendingCount = ROWS.filter((r) => r.status === 'pending-review' || r.status === 'ai-suggested').length;

  const filteredMaterial = filtered.reduce((s, r) => s + r.extMaterialCost, 0);
  const filteredNeca1 = filtered.reduce((s, r) => s + r.neca1 * r.qty, 0);

  /**
   * How the Materials table is grouped.
   *
   * `'system'` is the electrical-system grouping this screen has always had and
   * stays the default; anything else is a Project Breakdown group id, so the
   * estimator can read material by Bid Package or by Area without leaving the
   * screen or re-deriving the numbers somewhere else.
   */
  const breakdownGroups = useProjectBreakdown();
  const [groupByDim, setGroupByDim] = useState<string>('system');
  const activeDim = breakdownGroups.find((g) => g.id === groupByDim) ?? null;

  // Materials grouped by electrical system, in a fixed reading order (req 5).
  const systemGroups = useMemo(() => SYSTEM_ORDER
    .map((system) => ({ key: system as string, label: system as string, rows: filtered.filter((r) => r.system === system), note: '' }))
    .filter((g) => g.rows.length > 0), [filtered]);

  /**
   * The same rows grouped by a Project Breakdown dimension.
   *
   * Values in the group's own order, so the table reads the way Project
   * Breakdown is arranged. A value with no material is dropped; rows the
   * dimension cannot place collect under "Unassigned" rather than vanishing —
   * a total that silently omits lines is worse than one that names the gap.
   */
  const dimensionGroups = useMemo(() => {
    if (!activeDim) return [];
    const out: { key: string; label: string; rows: PricingRow[]; note: string }[] = [];
    const placed = new Set<string>();
    const note = activeDim.type === 'bid-package'
      ? 'Project default — a package is assigned in Takeoff, not on a priced line'
      : '';

    for (const v of sortedValues(activeDim)) {
      const rows = filtered.filter((r) => valueForRow(activeDim, r)?.id === v.id);
      rows.forEach((r) => placed.add(r.id));
      if (rows.length) out.push({ key: v.id, label: v.name, rows, note });
    }
    const rest = filtered.filter((r) => !placed.has(r.id));
    if (rest.length) {
      out.push({
        key: '__unassigned__',
        label: 'Unassigned',
        rows: rest,
        note: `No ${activeDim.name.toLowerCase()} recorded against these lines`,
      });
    }
    return out;
  }, [activeDim, filtered]);

  const shownGroups = activeDim ? dimensionGroups : systemGroups;

  const COL_DEFS = [
    { key: 'description', label: 'Description', width: 250, frozen: true },
    { key: 'code', label: 'Code', width: 100 },
    { key: 'discipline', label: 'Discipline', width: 100 },
    { key: 'drawingPage', label: 'Sheet', width: 70 },
    { key: 'qty', label: 'Qty', width: 70 },
    { key: 'uom', label: 'UoM', width: 50 },
    { key: 'baseProgrammePrice', label: 'Cost', width: 90 },
    { key: 'supplierPrice', label: 'Supplier', width: 100 },
    { key: 'extMaterialCost', label: 'Ext. material', width: 110 },
    { key: 'neca1', label: 'NECA 1', width: 80 },
    { key: 'status', label: 'Status', width: 110 },
    { key: 'actions', label: '', width: 36 },
  ] as const;

  const GUTTER_W = 36 + 24;
  const totalTableW = GUTTER_W + COL_DEFS.reduce((s, c) => s + c.width, 0);

  function colValue(row: PricingRow, key: string): React.ReactNode {
    if (key === 'description') return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        {row.status === 'ai-suggested' && <Sparkles size={11} color="#7C3AED" style={{ flexShrink: 0 }} />}
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</span>
      </span>
    );
    if (key === 'code') return <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', wordBreak: 'break-word' }}>{row.code}</span>;
    if (key === 'discipline') {
      const d = DISC_CFG[row.discipline];
      return <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 9999, color: d.color, backgroundColor: d.bg, whiteSpace: 'nowrap' }}>{d.label}</span>;
    }
    if (key === 'drawingPage') return <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{row.drawingPage}</span>;
    if (key === 'qty') return <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{row.qty}</span>;
    if (key === 'uom') return <span style={{ color: '#6B7280', fontSize: 11 }}>{row.uom}</span>;
    if (key === 'baseProgrammePrice') return <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>${row.baseProgrammePrice.toFixed(2)}</span>;
    if (key === 'supplierPrice') return row.supplierPrice != null
      ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>${row.supplierPrice.toFixed(2)}</span>
      : <span style={{ color: '#D1D5DB' }}>—</span>;
    if (key === 'extMaterialCost') return row.selectedSource === 'missing'
      ? <span style={{ color: '#DC2626', fontSize: 12, fontWeight: 600 }}>—</span>
      : <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, fontSize: 12, color: '#111827' }}>{money(row.extMaterialCost)}</span>;
    if (key === 'neca1') return (
      <span title={`NECA Column 1 — ${row.neca1} hrs per ${row.uom}`} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#374151' }}>
        {row.neca1.toFixed(3)}
      </span>
    );
    if (key === 'status') {
      const st = STATUS_CFG[row.status];
      return <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 9999, color: st.color, backgroundColor: st.bg, whiteSpace: 'nowrap' }}>{st.label}</span>;
    }
    if (key === 'actions') return (
      <button
        onClick={() => toast.info('Row actions', { description: row.description })}
        aria-label="Row actions"
        style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
      >
        <MoreHorizontal size={13} color="#9CA3AF" />
      </button>
    );
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', background: '#F6F7F9' }}>
      <ProjectHeader
        activeTab="Pricing"
        onNavigateTab={onNavigateTo}
        onBack={onBack}
        projectStatus={projectStatus}
        onStatusChange={onStatusChange}
      />

      {/* Toolbar */}
      <div className="bp-toolbar" style={{ padding: '10px 16px', borderBottom: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
        <div className="bp-toolbar-grow" style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 360 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, codes, assemblies…"
            style={{ width: '100%', height: 34, paddingLeft: 30, paddingRight: 8, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{ height: 34, padding: '0 12px', border: `1px solid ${showFilters ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 8, background: showFilters ? '#EFF6FF' : 'white', fontSize: 12, color: showFilters ? '#1D4ED8' : '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
        >
          <SlidersHorizontal size={12} /> Filters{(filterDiscipline || filterStatus || filterSource) ? ' ·' : ''}
        </button>
        {selectedRows.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 10px', background: '#EFF6FF', borderRadius: 8, fontSize: 12, color: '#1D4ED8', fontWeight: 500 }}>
            {selectedRows.size} selected
            <button onClick={() => setSelectedRows(new Set())} aria-label="Clear selection" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={11} color="#1D4ED8" />
            </button>
          </div>
        )}
        <div style={{ flex: 1 }} />
        {missingCount > 0 && (
          <button
            onClick={() => { setShowFilters(true); setFilterStatus('missing-price'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626', fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
          >
            <AlertTriangle size={12} /> {missingCount} missing price{missingCount > 1 ? 's' : ''}
          </button>
        )}
        <button
          onClick={() => setShowImport(true)}
          style={{ height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
        >
          <Download size={12} /> Supplier import
        </button>
        <button
          onClick={() => toast.success('Export started', { description: 'Pricing sheet will download as CSV.' })}
          style={{ height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
        >
          <Upload size={12} /> Export
        </button>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="bp-toolbar" style={{ padding: '8px 16px', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA', flexShrink: 0 }}>
          <select value={filterDiscipline} onChange={(e) => setFilterDiscipline(e.target.value)} style={{ height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: 'white', outline: 'none' }}>
            <option value="">All disciplines</option>
            {(['lighting', 'power', 'fire-alarm', 'data', 'safety'] as Discipline[]).map((d) => <option key={d} value={d}>{DISC_CFG[d].label}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: 'white', outline: 'none' }}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={{ height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: 'white', outline: 'none' }}>
            <option value="">All pricing sources</option>
            {Object.entries(SOURCE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={clearFilters} style={{ height: 28, padding: '0 10px', border: 'none', background: 'transparent', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* Summary bar */}
      <div className="bp-metrics" style={{ padding: '10px 16px', borderBottom: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
        {[
          { label: 'Total material', value: money(totalMaterial), accent: '#111827' },
          { label: 'NECA 1 hours', value: hrs(totalNeca1Hrs), accent: '#374151' },
          { label: 'Items', value: String(ROWS.length), accent: '#374151' },
          { label: 'Missing prices', value: String(missingCount), accent: missingCount > 0 ? '#DC2626' : '#9CA3AF' },
          { label: 'Pending review', value: String(pendingCount), accent: pendingCount > 0 ? '#D97706' : '#9CA3AF' },
        ].map(({ label, value, accent }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600, color: accent }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Labor profiles accordion */}
      <div style={{ borderBottom: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
        <button
          onClick={() => setShowLabor((v) => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'left' }}
        >
          {showLabor ? <ChevronUp size={13} color="#6B7280" /> : <ChevronDown size={13} color="#6B7280" />}
          Labor Profiles
          <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>
            {laborProfile(globalLaborProfile).label} · Global
          </span>
        </button>
        {showLabor && (
          <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Global profile selector */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Global Labor Profile</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {/* One list, defined in costing.ts beside the factor each carries. */}
                {LABOR_PROFILES.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => setGlobalLaborProfile(prof.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '7px 12px', border: `1px solid ${globalLaborProfile === prof.id ? '#BFDBFE' : '#E5E7EB'}`,
                      borderRadius: 7, background: globalLaborProfile === prof.id ? '#EFF6FF' : 'white',
                      cursor: 'pointer', minWidth: 120,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: globalLaborProfile === prof.id ? '#1D4ED8' : '#374151' }}>{prof.label}</span>
                    <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{prof.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Discipline overrides */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Discipline Override ($/hr)</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['lighting', 'power', 'fire-alarm', 'data', 'safety'] as Discipline[]).map((d) => {
                  const cfg = DISC_CFG[d];
                  return (
                    <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 500, color: cfg.color, backgroundColor: cfg.bg, padding: '1px 6px', borderRadius: 9999, alignSelf: 'flex-start' }}>{cfg.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>$</span>
                        <input
                          type="number"
                          placeholder="Default"
                          value={discLaborOverrides[d] ?? ''}
                          onChange={(e) => setDiscLaborOverrides((prev) => ({ ...prev, [d]: e.target.value }))}
                          style={{ width: 64, height: 26, border: '1px solid #E5E7EB', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#374151', outline: 'none', textAlign: 'right' }}
                        />
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>/hr</span>
                        {discLaborOverrides[d] && (
                          <button onClick={() => setDiscLaborOverrides((prev) => { const n = { ...prev }; delete n[d]; return n; })} aria-label="Clear override" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, lineHeight: 1 }}>
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Assembly override */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Assembly Override</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={asmLaborOverride.assembly}
                  onChange={(e) => setAsmLaborOverride((prev) => ({ ...prev, assembly: e.target.value }))}
                  style={{ height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, background: 'white', outline: 'none', minWidth: 200 }}
                >
                  <option value="">Select assembly…</option>
                  {Array.from(new Set(ROWS.map((r) => r.assembly))).map((asm) => (
                    <option key={asm} value={asm}>{asm.length > 45 ? asm.slice(0, 44) + '…' : asm}</option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>$</span>
                <input
                  type="number"
                  placeholder="$/hr"
                  value={asmLaborOverride.rate}
                  onChange={(e) => setAsmLaborOverride((prev) => ({ ...prev, rate: e.target.value }))}
                  style={{ width: 72, height: 28, border: '1px solid #E5E7EB', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#374151', outline: 'none', textAlign: 'right' }}
                />
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>/hr</span>
                <button
                  onClick={() => { if (asmLaborOverride.assembly && asmLaborOverride.rate) { toast.success(`Override applied: ${asmLaborOverride.assembly.slice(0, 30)}… at $${asmLaborOverride.rate}/hr`); setAsmLaborOverride({ assembly: '', rate: '' }); } }}
                  style={{ height: 28, padding: '0 12px', border: 'none', background: '#2563EB', color: 'white', borderRadius: 5, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cost sections — Materials keeps the existing table, the rest roll up */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}
        ref={containerRef}
      >
        <CostSection
          title="Materials"
          total={money(filteredMaterial)}
          meta={`${filtered.length} item${filtered.length !== 1 ? 's' : ''} · ${shownGroups.length} ${activeDim ? activeDim.name.toLowerCase() : `system${shownGroups.length !== 1 ? 's' : ''}`}`}
          accent="#2563EB" bg="#EFF6FF" border="#BFDBFE"
          defaultOpen
        >
          {/*
            Group by a Project Breakdown dimension.
            ---------------------------------------
            The same vocabulary the project defines and Bid Summary scope filters
            on, applied to priced material — so "what is the material for Floor 2"
            and "what does Lighting cost" are answered here rather than exported
            and pivoted somewhere else. Grouping, not a second table: the money is
            already on every group header, so regrouping *is* the report.
          */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #E5E7EB', background: '#FCFCFD', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>Group by</span>
            <select
              value={groupByDim}
              onChange={(e) => { setGroupByDim(e.target.value); setCollapsedSystems(new Set()); }}
              aria-label="Group materials by"
              style={{
                height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11,
                background: activeDim ? '#EFF6FF' : 'white',
                color: activeDim ? '#1D4ED8' : '#374151',
                fontWeight: activeDim ? 600 : 400, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="system">Electrical system</option>
              {sortedGroups(breakdownGroups).filter(groupIsDerivable).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            {activeDim && (
              <span style={{ fontSize: 10.5, color: '#6B7280' }}>
                {shownGroups.length} of {sortedValues(activeDim).length} {activeDim.name.toLowerCase()} values carry material
              </span>
            )}

            <div style={{ flex: 1, minWidth: 8 }} />
            <span style={{ fontSize: 10.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
              Totals per group are material only — labor, quotes and expenses stay in the Bid Builder.
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: totalTableW }}>
              {/* Column header */}
              <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', display: 'flex', alignItems: 'center', height: 34 }}>
                <div style={{ width: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', left: 0, background: '#F9FAFB', zIndex: 4, height: '100%' }}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={selectedRows.size === filtered.length && filtered.length > 0}
                    onChange={() => setSelectedRows(selectedRows.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id)))}
                    style={{ accentColor: '#2563EB' }}
                  />
                </div>
                <div style={{ width: 24, minWidth: 24, position: 'sticky', left: 36, background: '#F9FAFB', zIndex: 4, height: '100%' }} />
                {COL_DEFS.map((col) => (
                  <div
                    key={col.key}
                    onClick={() => col.key !== 'actions' && toggleSort(col.key)}
                    style={{
                      width: col.width, minWidth: col.width, padding: '0 10px', height: 34, display: 'flex', alignItems: 'center',
                      fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em',
                      cursor: col.key !== 'actions' ? 'pointer' : 'default', userSelect: 'none', gap: 4,
                      position: (col as { frozen?: boolean }).frozen ? 'sticky' : undefined,
                      left: (col as { frozen?: boolean }).frozen ? GUTTER_W : undefined,
                      background: (col as { frozen?: boolean }).frozen ? '#F9FAFB' : undefined,
                      zIndex: (col as { frozen?: boolean }).frozen ? 4 : undefined,
                      boxShadow: (col as { frozen?: boolean }).frozen ? '2px 0 4px rgba(0,0,0,0.04)' : undefined,
                    }}
                  >
                    {col.label}
                    {sortCol === col.key && col.key !== 'actions' && <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                ))}
              </div>

          {/* Rows grouped by electrical system — never one flat list */}
          {shownGroups.map(({ key: system, label, rows, note }) => {
            const groupCollapsed = collapsedSystems.has(system);
            const groupMaterial = rows.reduce((sum, r) => sum + r.extMaterialCost, 0);
            const groupNeca1 = rows.reduce((sum, r) => sum + r.neca1 * r.qty, 0);
            return (
              <div key={system}>
                {/* Group header — electrical system, or the chosen breakdown value */}
                <div
                  title={note || undefined}
                  onClick={() => setCollapsedSystems((prev) => { const n = new Set(prev); if (n.has(system)) n.delete(system); else n.add(system); return n; })}
                  style={{ display: 'flex', alignItems: 'center', height: 30, background: '#F3F4F6', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', cursor: 'pointer', position: 'sticky', left: 0 }}
                >
                  <div style={{ width: GUTTER_W, minWidth: GUTTER_W, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, position: 'sticky', left: 0, background: '#F3F4F6', height: '100%', zIndex: 3 }}>
                    {groupCollapsed ? <ChevronRight size={12} color="#6B7280" /> : <ChevronDown size={12} color="#6B7280" />}
                  </div>
                  <div style={{ width: COL_DEFS[0].width, minWidth: COL_DEFS[0].width, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6, position: 'sticky', left: GUTTER_W, background: '#F3F4F6', height: '100%', zIndex: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{rows.length}</span>
                    {/* Why a value reads the way it does, where it is not obvious. */}
                    {note && <Info size={10} color="#9CA3AF" style={{ flexShrink: 0 }} />}
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', gap: 18, paddingRight: 46 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#374151' }}>{money(groupMaterial)}</span>
                    <span title="NECA 1 hours for this system" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>{hrs(groupNeca1)}</span>
                  </div>
                </div>

                {!groupCollapsed && rows.map((row, idx) => {
                  const isSel = selectedRows.has(row.id);
                  const isExp = expandedId === row.id;
                  const bg = isSel ? '#EFF6FF' : idx % 2 === 0 ? 'white' : '#FAFAFA';
                  return (
                    <div key={row.id}>
                      <div style={{ display: 'flex', alignItems: 'center', height: rowH, background: bg, borderBottom: isExp ? 'none' : '1px solid #F3F4F6' }}>
                        <div style={{ width: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', left: 0, background: bg, zIndex: 3, height: '100%' }}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.description}`}
                            checked={isSel}
                            onChange={() => setSelectedRows((prev) => { const n = new Set(prev); if (isSel) n.delete(row.id); else n.add(row.id); return n; })}
                            style={{ accentColor: '#2563EB' }}
                          />
                        </div>
                        <div style={{ width: 24, minWidth: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', left: 36, background: bg, zIndex: 3, height: '100%' }}>
                          <button
                            onClick={() => setExpandedId(isExp ? null : row.id)}
                            aria-label={isExp ? 'Collapse row' : 'Expand row'}
                            style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}
                          >
                            {isExp ? <ChevronDown size={12} color="#6B7280" /> : <ChevronRight size={12} color="#9CA3AF" />}
                          </button>
                        </div>
                        {COL_DEFS.map((col) => (
                          <div
                            key={col.key}
                            style={{
                              width: col.width, minWidth: col.width, padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center', fontSize: 12, color: '#374151',
                              overflow: 'hidden',
                              position: (col as { frozen?: boolean }).frozen ? 'sticky' : undefined,
                              left: (col as { frozen?: boolean }).frozen ? GUTTER_W : undefined,
                              background: (col as { frozen?: boolean }).frozen ? bg : undefined,
                              zIndex: (col as { frozen?: boolean }).frozen ? 3 : undefined,
                              boxShadow: (col as { frozen?: boolean }).frozen ? '2px 0 4px rgba(0,0,0,0.04)' : undefined,
                            }}
                          >
                            {colValue(row, col.key)}
                          </div>
                        ))}
                      </div>
                      {isExp && <RowDetail row={row} onClose={() => setExpandedId(null)} width={viewportW} />}
                    </div>
                  );
                })}
              </div>
            );
          })}

              {/* Materials total */}
              <div style={{ display: 'flex', alignItems: 'center', height: 38, background: '#F3F4F6', borderTop: '2px solid #E5E7EB' }}>
                <div style={{ width: GUTTER_W, minWidth: GUTTER_W, position: 'sticky', left: 0, background: '#F3F4F6', zIndex: 4, height: '100%' }} />
                {COL_DEFS.map((col) => (
                  <div
                    key={col.key}
                    style={{
                      width: col.width, minWidth: col.width, padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center',
                      position: (col as { frozen?: boolean }).frozen ? 'sticky' : undefined,
                      left: (col as { frozen?: boolean }).frozen ? GUTTER_W : undefined,
                      background: (col as { frozen?: boolean }).frozen ? '#F3F4F6' : undefined,
                      zIndex: (col as { frozen?: boolean }).frozen ? 4 : undefined,
                    }}
                  >
                    {col.key === 'description' && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        Materials total ({filtered.length})
                      </span>
                    )}
                    {col.key === 'extMaterialCost' && (
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 12, color: '#111827' }}>{money(filteredMaterial)}</span>
                    )}
                    {col.key === 'neca1' && (
                      <span title="NECA 1 hours across the listed items" style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 12, color: '#111827' }}>{hrs(filteredNeca1)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {pendingCount > 0 && (
            <SectionFootNote
              text={`${pendingCount} item${pendingCount === 1 ? '' : 's'} awaiting review. AI-suggested material stays out of the bid until approved.`}
              action="Review in Bid Builder"
              onAction={() => onNavigateTo?.('bid-builder')}
            />
          )}

          {filtered.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 10 }}>
              <FileText size={28} color="#D1D5DB" />
              <div style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}>No items match your filters</div>
              <button onClick={clearFilters} style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Clear all filters
              </button>
            </div>
          )}
        </CostSection>

        {/*
          Labor, quotes, subcontractors, direct job expenses, tax and the markup
          tiers used to roll up here as read-only recaps. They are all owned by
          the Bid Builder, and duplicating them made this screen look like a
          second bid sheet. Pricing is now material only; the bar below is the
          hand-off.
        */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: '#111827', borderRadius: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total material</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, fontWeight: 700, color: 'white' }}>{money(totalMaterial)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priced items</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600, color: '#C4B5FD' }}>
              {ROWS.length - missingCount} / {ROWS.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NECA 1 hours</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600, color: '#C4B5FD' }}>{hrs(totalNeca1Hrs)}</div>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#9CA3AF', maxWidth: 300 }}>
            Labor, quotes, subcontractors and markup are priced in the Bid Builder.
          </span>
          <button
            onClick={() => onNavigateTo?.('bid-builder')}
            style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer' }}
          >
            Open Bid Builder →
          </button>
        </div>
      </div>

      {showImport && <SupplierImportDrawer onClose={() => setShowImport(false)} />}
    </div>
  );
}
