import { useEffect, useState } from 'react';
import { Classification, groupByType } from './takeoffClassification';
import { CategoryGroup, getGroups } from './projectBreakdown';

/**
 * The project's takeoff — one record list, two ways of creating records.
 *
 * Manual takeoff (pick an assembly, type a quantity) and digital takeoff (place
 * it on a drawing) are two *methods*, not two estimates. They write the same
 * records, carry the same Project Breakdown classification, and feed the same
 * Pricing module. That is the whole point of this module existing: as long as the
 * two methods had their own state, "how many receptacles are on this job" had two
 * possible answers.
 *
 *   Project Breakdown → defines the classifications
 *   Manual | Digital  → create classified records          ← both write here
 *   Takeoff List      → the central record and audit trail  ← reads here
 *   Pricing           → receives quantities and classifications
 *
 * There is deliberately **no Master Estimate layer**. The record list *is* the
 * estimate's quantity source.
 */

export type SourceType = 'manual' | 'digital';
export type MeasurementType = 'count' | 'linear';

/** A marker or a path on a sheet — present only on digital records. */
export interface DrawingGeometry {
  kind: 'marker' | 'path';
  /** Marker position, or the path's vertices in drawing space. */
  points: { x: number; y: number }[];
  /** The on-sheet number the estimator sees beside a count marker. */
  number?: number;
}

export interface TakeoffRecord {
  id: string;
  projectId: string;
  sourceType: SourceType;

  /** Absent on a manual record — nothing was placed on a sheet. */
  sheetId?: string;

  /**
   * What was taken off. An assembly record references the assembly and prices
   * through its BOM; a part record is a direct material line. Exactly one is set.
   */
  assemblyId?: string;
  partId?: string;
  /** Denormalised for the list; the ids above stay the source of truth. */
  name: string;
  code: string;

  measurementType: MeasurementType;

  /**
   * What was counted or measured, and what the estimator decided to carry.
   *
   * `quantity` / `measuredLength` are what the takeoff *found*. The adjusted
   * pair is what goes forward — waste, a spare, a known site condition. Kept
   * separate rather than overwritten so an audit trail can always answer "what
   * did we actually count, and who changed it".
   */
  quantity: number;
  measuredLength?: number;
  adjustedQuantity?: number;
  adjustedLength?: number;

  unit: string;

  /**
   * Project Breakdown assignment as `{ groupId: valueId }` — **stable ids only**.
   * Renaming "Floor 1" to "Level 1" upstream must not detach a single record,
   * which is exactly what storing the name would do. Custom groups ride along in
   * the same map with no schema change.
   */
  classification: Classification;
  /** True where the estimator set the classification rather than inheriting it. */
  classificationOverridden?: boolean;

  userId: string;
  createdAt: string;
  notes?: string;

  drawingGeometry?: DrawingGeometry;
}

/** What a caller has to supply; everything else is filled in here. */
export type NewTakeoffRecord =
  Omit<TakeoffRecord, 'id' | 'projectId' | 'createdAt' | 'userId'>
  & Partial<Pick<TakeoffRecord, 'id' | 'projectId' | 'createdAt' | 'userId'>>;

/**
 * The identity of a digital record: one row per assembly, per sheet, per
 * classification, per measurement type.
 *
 * This is what makes the audit trail readable. A hundred clicks of the same
 * fixture on the same sheet under the same classification is **one** record whose
 * quantity is 100 — not a hundred rows. It is also why selecting a row highlights
 * *markers* plural: the row is the aggregate, the markers are its evidence.
 *
 * Classification is part of the key on purpose. The same fixture counted on Floor
 * 1 and Floor 2 must not merge, or the split the whole breakdown exists to
 * provide would be averaged away at the moment of capture.
 */
export function digitalRecordKey(input: {
  sheetId?: string; assemblyId?: string; partId?: string;
  classification: Classification; measurementType: MeasurementType;
}): string {
  const cls = Object.keys(input.classification).sort()
    .map((k) => `${k}=${input.classification[k]}`).join(',');
  return [
    'dg', input.sheetId ?? 'nosheet',
    input.assemblyId ?? input.partId ?? 'unassigned',
    input.measurementType, cls,
  ].join('|');
}

// ─── The store ────────────────────────────────────────────────────────────────

const PROJECT_ID = 'BP-025';
const CURRENT_USER = 'J. Mitchell';

let records: TakeoffRecord[] = [];
let seq = 0;
const listeners = new Set<() => void>();

const emit = () => { for (const l of listeners) l(); };

export function getRecords(): TakeoffRecord[] {
  return records;
}

export function onRecordsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useTakeoffRecords(): TakeoffRecord[] {
  const [snap, setSnap] = useState(records);
  useEffect(() => {
    const l = () => setSnap(records);
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
  }, []);
  return snap;
}

/**
 * A stamped timestamp, resolved at call time.
 *
 * The seeded records need a plausible history and `new Date()` is the only
 * source of one; callers that want a specific time pass `createdAt`.
 */
const now = () => new Date().toISOString();

export function addRecord(input: NewTakeoffRecord): TakeoffRecord {
  seq += 1;
  const rec: TakeoffRecord = {
    projectId: PROJECT_ID,
    userId: CURRENT_USER,
    createdAt: now(),
    id: `tk-${seq}`,
    ...input,
  };
  records = [...records, rec];
  emit();
  return rec;
}

/**
 * The record a digital placement belongs to, created on first click.
 *
 * Called every time something is placed, which is why it must be cheap and must
 * never duplicate: the estimator clicking a fixture forty times has to leave one
 * row reading 40, and each click has to know which row it joined.
 *
 * Returns the record so the caller can stamp its id on the marker — that stamp is
 * the join the drawing and the list use to point at each other.
 */
export function findOrCreateDigitalRecord(input: {
  sheetId?: string;
  assemblyId?: string;
  partId?: string;
  name: string;
  code: string;
  unit: string;
  classification: Classification;
  measurementType: MeasurementType;
}): TakeoffRecord {
  const id = digitalRecordKey(input);
  const existing = records.find((r) => r.id === id);
  if (existing) return existing;
  return addRecord({
    id,
    sourceType: 'digital',
    sheetId: input.sheetId,
    assemblyId: input.assemblyId,
    partId: input.partId,
    name: input.name,
    code: input.code,
    unit: input.unit,
    measurementType: input.measurementType,
    quantity: 0,
    measuredLength: input.measurementType === 'linear' ? 0 : undefined,
    classification: input.classification,
  });
}

/**
 * Set a digital record's measured figure from the drawing.
 *
 * The drawing is the authority for what a digital record *found*: quantity is the
 * number of markers, length is the sum of the paths. Pushed from the canvas rather
 * than typed, which is why Qty is the one cell the list shows read-only on a
 * digital row — you change it by counting, not by typing over the count.
 *
 * A record left at zero is removed: deleting the last marker of an assembly should
 * take its row with it, not leave a phantom line reading 0.
 */
export function setDigitalMeasure(
  id: string,
  next: { quantity: number; measuredLength?: number; name?: string; code?: string },
) {
  const rec = records.find((r) => r.id === id);
  if (!rec) return;
  if (next.quantity <= 0 && !(next.measuredLength && next.measuredLength > 0)) {
    records = records.filter((r) => r.id !== id);
    emit();
    return;
  }
  /* Display fields are refreshed too, not just the measure: a record created
     before a name or code lookup improved should correct itself rather than keep
     showing an internal handle where a part code belongs. */
  const same = rec.quantity === next.quantity
    && rec.measuredLength === next.measuredLength
    && (!next.name || rec.name === next.name)
    && (!next.code || rec.code === next.code);
  if (same) return;
  records = records.map((r) => (r.id === id ? {
    ...r,
    quantity: next.quantity,
    measuredLength: next.measuredLength,
    name: next.name ?? r.name,
    code: next.code ?? r.code,
  } : r));
  emit();
}

/** Add several at once — one notification, so a bulk import repaints once. */
export function addRecords(inputs: NewTakeoffRecord[]): TakeoffRecord[] {
  const made = inputs.map((input) => {
    seq += 1;
    return {
      projectId: PROJECT_ID,
      userId: CURRENT_USER,
      createdAt: now(),
      ...input,
      id: `tk-${seq}`,
    } as TakeoffRecord;
  });
  records = [...records, ...made];
  emit();
  return made;
}

export function updateRecord(id: string, patch: Partial<TakeoffRecord>) {
  records = records.map((r) => (r.id === id ? { ...r, ...patch } : r));
  emit();
}

/** Patch many records with the same change — the bulk-edit path. */
export function updateRecords(ids: string[], patch: Partial<TakeoffRecord>) {
  const set = new Set(ids);
  records = records.map((r) => (set.has(r.id) ? { ...r, ...patch } : r));
  emit();
}

/**
 * Reclassify records on one dimension, leaving the others alone.
 *
 * A merge, not a replace: "move these to Floor 2" must not blank their Bid
 * Package. `classificationOverridden` is set because a deliberate reassignment
 * is exactly the thing a later page-default change must not undo.
 */
export function reclassifyRecords(ids: string[], groupId: string, valueId: string) {
  const set = new Set(ids);
  records = records.map((r) => (set.has(r.id)
    ? {
      ...r,
      classification: { ...r.classification, [groupId]: valueId },
      classificationOverridden: true,
    }
    : r));
  emit();
}

export function removeRecords(ids: string[]) {
  const set = new Set(ids);
  records = records.filter((r) => !set.has(r.id));
  emit();
}

export function getRecord(id: string): TakeoffRecord | undefined {
  return records.find((r) => r.id === id);
}

/**
 * The record a piece of drawing geometry belongs to.
 *
 * Digital records are keyed by the marker or path id they were created from, so
 * the canvas and the list can point at each other without either owning the
 * mapping.
 */
export function recordForGeometry(geometryId: string): TakeoffRecord | undefined {
  return records.find((r) => r.id === geometryId || r.notes === geometryId);
}

// ─── Derived reads ────────────────────────────────────────────────────────────

/** What goes forward: the adjusted figure where one was entered. */
export function effectiveQuantity(r: TakeoffRecord): number {
  return r.adjustedQuantity ?? r.quantity;
}

export function effectiveLength(r: TakeoffRecord): number | undefined {
  return r.adjustedLength ?? r.measuredLength;
}

/**
 * The figure this record contributes, in its own unit.
 *
 * A count record contributes a count; a linear record contributes length. One
 * function so the list, the totals bar and (later) Pricing cannot disagree about
 * which of the two a record is measured in.
 */
export function effectiveMeasure(r: TakeoffRecord): number {
  return r.measurementType === 'linear'
    ? (effectiveLength(r) ?? 0)
    : effectiveQuantity(r);
}

/** Totals for the list footer, split by measurement type. */
export function totalsFor(rows: TakeoffRecord[]): {
  records: number; count: number; linear: number; manual: number; digital: number;
} {
  return rows.reduce((acc, r) => ({
    records: acc.records + 1,
    count: acc.count + (r.measurementType === 'count' ? effectiveQuantity(r) : 0),
    linear: acc.linear + (r.measurementType === 'linear' ? (effectiveLength(r) ?? 0) : 0),
    manual: acc.manual + (r.sourceType === 'manual' ? 1 : 0),
    digital: acc.digital + (r.sourceType === 'digital' ? 1 : 0),
  }), { records: 0, count: 0, linear: 0, manual: 0, digital: 0 });
}

/**
 * Quantity per Project Breakdown value, for the downstream consumers.
 *
 * Keyed by value id, so a rename cannot break the join. Pricing is not wired to
 * this yet — that is a separate task — but publishing it here is what makes the
 * connection a one-line read rather than a re-derivation.
 */
export function measureByValue(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    for (const valueId of Object.values(r.classification)) {
      out[valueId] = (out[valueId] ?? 0) + effectiveMeasure(r);
    }
  }
  return out;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

/**
 * A plausible starting audit trail, seeded once.
 *
 * Both methods are represented on purpose: the point the workspace has to make
 * on first open is that manual and digital records sit in one list. The manual
 * rows are the equipment an estimator counts off a schedule rather than a plan
 * (service gear, panelboards); the digital rows are what gets clicked on a sheet.
 *
 * Idempotent — `seedRecords` returns early once anything exists, so a remount or
 * a fast-refresh cannot double the job's quantities.
 */
export function seedManualRecords(groups: CategoryGroup[] = getGroups()) {
  if (records.some((r) => r.sourceType === 'manual')) return;

  const val = (type: CategoryGroup['type'], sourceKey: string) => {
    const g = groupByType(groups, type);
    return g?.values.find((v) => v.sourceKey === sourceKey)?.id;
  };
  const pkgG = groupByType(groups, 'bid-package');
  const areaG = groupByType(groups, 'area');
  const sysG = groupByType(groups, 'system');
  if (!pkgG || !areaG || !sysG) return;

  const cls = (areaKey: string, sysKey: string): Classification => {
    const out: Classification = {};
    const base = pkgG.values.find((v) => v.isDefault) ?? pkgG.values[0];
    if (base) out[pkgG.id] = base.id;
    const a = val('area', areaKey);
    const s = val('system', sysKey);
    if (a) out[areaG.id] = a;
    if (s) out[sysG.id] = s;
    return out;
  };

  /*
   * Equipment an estimator counts off a schedule rather than a plan.
   *
   * Seeded so the list proves its own point on first open: these rows sit beside
   * the ones counted on the drawings, in one table, with the same classification
   * vocabulary. Digital rows are **not** seeded here — they are built from the
   * seeded markers, so the drawing and the list cannot start out disagreeing.
   */
  addRecords([
    {
      sourceType: 'manual', assemblyId: 'asm-service-200a',
      name: '200A Service Assembly', code: 'BPA-SG-501',
      measurementType: 'count', quantity: 1, unit: 'EA',
      classification: cls('floor-1', 'service'),
      notes: 'Off the single-line — no plan placement.',
      createdAt: '2026-07-08T09:12:00.000Z',
    },
    {
      sourceType: 'manual', assemblyId: 'asm-panelboard-225',
      name: '42-Circuit Panelboard 225A', code: 'BPA-SG-502',
      measurementType: 'count', quantity: 2, unit: 'EA',
      classification: cls('floor-1', 'service'),
      createdAt: '2026-07-08T09:14:00.000Z',
    },
    {
      sourceType: 'manual', assemblyId: 'asm-xfmr-45',
      name: 'Dry-Type Transformer 45kVA', code: 'BPA-SG-503',
      measurementType: 'count', quantity: 1, unit: 'EA',
      classification: cls('floor-1', 'service'),
      createdAt: '2026-07-08T09:15:00.000Z',
    },
  ]);
}
