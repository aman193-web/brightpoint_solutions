import { useEffect, useState } from 'react';
import { MATERIAL_LINES } from './materials';
import { AREA_BY_DRAWING, SYSTEM_BY_GROUP } from './bidScope';

/**
 * Project Breakdown — the project's own bid classifications.
 *
 * One place to define how a project is carved up, set before or during
 * estimating and then used by Takeoff, the Master Estimate, Bid Summary scope
 * and the Proposal. It is structure only: no costs are calculated here and no
 * Bid Summaries are created here.
 *
 * **The groups are independent dimensions, never a hierarchy.** An item is
 * classified as Bid Package = Base Bid *and* Area = Floor 1 *and* System =
 * Lighting — three separate facts. Modelling it as Base Bid → Floor 1 →
 * Lighting is the mistake this shape exists to prevent: a tree forces a value
 * to be re-created under every parent, and the same Floor 1 then exists several
 * times with no way to report on it.
 *
 * Values carry **stable ids**, and every downstream assignment references the
 * id. That is what makes renaming safe — "Floor 2" becoming "Level 2" must not
 * detach 128 takeoff items.
 */

export type CategoryGroupType = 'bid-package' | 'area' | 'system' | 'custom';

export interface CategoryValue {
  id: string;
  categoryGroupId: string;
  name: string;
  sortOrder: number;
  /**
   * Inactive values stay linked to existing takeoff and history and cannot be
   * picked for new work. Deactivating is the safe alternative to deleting;
   * deleting a value that is in use would orphan the items that reference it.
   */
  active: boolean;
  /** Bid Package only: exactly one value is the project default. */
  isDefault?: boolean;
  /**
   * The estimate's own tag this value corresponds to, for the seeded values.
   *
   * Usage has to be counted through a *stable* key, not the display name —
   * otherwise renaming "Floor 2" to "Level 2" drops its 128 items to zero, which
   * is precisely the breakage this screen promises not to cause. A value the
   * estimator typed has no source tag yet and honestly reports no usage.
   */
  sourceKey?: string;
}

export interface CategoryGroup {
  id: string;
  projectId: string;
  name: string;
  type: CategoryGroupType;
  description?: string;
  sortOrder: number;
  active: boolean;
  /**
   * The three default groups cannot be deleted. Downstream screens address them
   * by `type`, so removing one would leave Bid Summary scope with nothing to
   * read. They can be renamed and their values are fully editable.
   */
  protected?: boolean;
  values: CategoryValue[];
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${(seq += 1)}`;

function group(
  projectId: string,
  name: string,
  type: CategoryGroupType,
  sortOrder: number,
  values: (string | [string, string])[],
  opts: { description?: string; protected?: boolean; defaultIndex?: number } = {},
): CategoryGroup {
  const id = nextId(type);
  return {
    id,
    projectId,
    name,
    type,
    description: opts.description,
    sortOrder,
    active: true,
    protected: opts.protected,
    values: values.map((v, i) => {
      const [name, sourceKey] = Array.isArray(v) ? v : [v, undefined];
      return {
        id: nextId('val'),
        categoryGroupId: id,
        name,
        sortOrder: i,
        active: true,
        ...(sourceKey ? { sourceKey } : {}),
        ...(opts.defaultIndex === i ? { isDefault: true } : {}),
      };
    }),
  };
}

/**
 * The three groups every project starts with, plus starting values.
 *
 * Areas deliberately do **not** assume floors — the seed offers wings and
 * buildings alongside them, because a single-storey warehouse and a campus are
 * both normal and neither should have to delete a list of floors first.
 */
export function seedGroups(projectId = 'BP-025'): CategoryGroup[] {
  return [
    group(projectId, 'Bid Package', 'bid-package', 0, [
      'Base Bid', 'Alternate 1', 'Alternate 2', 'Allowance', 'Unit Prices',
    ], { protected: true, defaultIndex: 0, description: 'Which bid this work is priced under.' }),

    // The bracketed pairs carry the estimate tag this value counts against.
    group(projectId, 'Areas', 'area', 1, [
      ['Floor 1', 'floor-1'], ['Floor 2', 'floor-2'], 'Floor 3',
      ['East Wing', 'east-wing'], 'West Wing', ['Building A', 'building-a'], 'Building B', 'Tenant 101',
    ], { protected: true, description: 'Physical breakdown of the project. Floors, wings, buildings or tenancies — whatever this job actually has.' }),

    group(projectId, 'Systems / Scope', 'system', 2, [
      ['Lighting', 'lighting'], ['Power', 'power'], ['Branch', 'branch'], ['Feeders', 'feeders'],
      ['Service / Switchgear', 'service'], ['Fire Alarm', 'fire-alarm'], ['Data', 'low-voltage'],
      'Security', 'Controls',
    ], { protected: true, description: 'Electrical systems, as a general contractor asks for them.' }),
  ];
}

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * A module store, so the breakdown is genuinely project-level.
 *
 * Takeoff, the Bid Builder and the Proposal will read these values from here
 * rather than each holding its own copy of the vocabulary — which is the whole
 * reason this screen exists.
 */
let groups: CategoryGroup[] = seedGroups();
const listeners = new Set<() => void>();

const emit = () => { for (const l of listeners) l(); };

export function getGroups(): CategoryGroup[] {
  return groups;
}

export function setGroups(next: CategoryGroup[]) {
  groups = next;
  emit();
}

export function useProjectBreakdown(): CategoryGroup[] {
  const [snap, setSnap] = useState(groups);
  useEffect(() => {
    const l = () => setSnap(groups);
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
  }, []);
  return snap;
}

export function updateGroup(id: string, patch: Partial<CategoryGroup>) {
  setGroups(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
}

export function updateValue(groupId: string, valueId: string, patch: Partial<CategoryValue>) {
  setGroups(groups.map((g) => (g.id !== groupId ? g : {
    ...g,
    values: g.values.map((v) => (v.id === valueId ? { ...v, ...patch } : v)),
  })));
}

export function addValue(groupId: string, name: string): CategoryValue | null {
  const g = groups.find((x) => x.id === groupId);
  if (!g) return null;
  const value: CategoryValue = {
    id: nextId('val'),
    categoryGroupId: groupId,
    name,
    sortOrder: g.values.length,
    active: true,
  };
  setGroups(groups.map((x) => (x.id === groupId ? { ...x, values: [...x.values, value] } : x)));
  return value;
}

export function removeValue(groupId: string, valueId: string) {
  setGroups(groups.map((g) => (g.id !== groupId ? g : {
    ...g,
    values: g.values.filter((v) => v.id !== valueId).map((v, i) => ({ ...v, sortOrder: i })),
  })));
}

/** Move a value one place up or down. Reordering is what sets pick-list order. */
export function moveValue(groupId: string, valueId: string, dir: -1 | 1) {
  setGroups(groups.map((g) => {
    if (g.id !== groupId) return g;
    const list = [...g.values].sort((a, b) => a.sortOrder - b.sortOrder);
    const i = list.findIndex((v) => v.id === valueId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return g;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...g, values: list.map((v, k) => ({ ...v, sortOrder: k })) };
  }));
}

export function moveGroup(id: string, dir: -1 | 1) {
  const list = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const i = list.findIndex((g) => g.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  setGroups(list.map((g, k) => ({ ...g, sortOrder: k })));
}

/** Exactly one default per group — setting one clears the rest. */
export function setDefaultValue(groupId: string, valueId: string) {
  setGroups(groups.map((g) => (g.id !== groupId ? g : {
    ...g,
    values: g.values.map((v) => ({ ...v, isDefault: v.id === valueId })),
  })));
}

export function duplicateValue(groupId: string, valueId: string): CategoryValue | null {
  const g = groups.find((x) => x.id === groupId);
  const src = g?.values.find((v) => v.id === valueId);
  if (!g || !src) return null;
  const copy: CategoryValue = {
    ...src,
    id: nextId('val'),
    name: `${src.name} (copy)`,
    sortOrder: g.values.length,
    // A duplicate is never the default: two defaults is not a state to allow.
    isDefault: false,
  };
  setGroups(groups.map((x) => (x.id === groupId ? { ...x, values: [...x.values, copy] } : x)));
  return copy;
}

export function addGroup(input: { name: string; description?: string; values: string[] }): CategoryGroup {
  const created = group(
    groups[0]?.projectId ?? 'BP-025',
    input.name,
    'custom',
    groups.length,
    input.values,
    { description: input.description },
  );
  setGroups([...groups, created]);
  return created;
}

export function removeGroup(id: string) {
  const g = groups.find((x) => x.id === id);
  if (!g || g.protected) return;
  setGroups(groups.filter((x) => x.id !== id).map((x, i) => ({ ...x, sortOrder: i })));
}

// ─── Usage ────────────────────────────────────────────────────────────────────

/**
 * How many takeoff items reference a value.
 *
 * Counted from the estimate that exists rather than stored on the value, so the
 * number cannot go stale. It is the figure the delete guard quotes — "Floor 2 is
 * assigned to 128 takeoff items" — and the reason deleting a used value offers
 * Archive or Reassign instead of just doing it.
 *
 * Only Areas and Systems have counts today, because those are the dimensions the
 * takeoff is actually tagged on. A custom group has no assignments yet and
 * honestly reports zero rather than inventing a number.
 */
export function usageCount(g: CategoryGroup, v: CategoryValue): number {
  if (!v.sourceKey) return 0;
  if (g.type === 'area') {
    return MATERIAL_LINES
      .filter((r) => AREA_BY_DRAWING[r.drawingPage] === v.sourceKey)
      .reduce((sum, r) => sum + Math.round(r.qty), 0);
  }
  if (g.type === 'system') {
    return MATERIAL_LINES
      .filter((r) => SYSTEM_BY_GROUP[r.system] === v.sourceKey)
      .reduce((sum, r) => sum + Math.round(r.qty), 0);
  }
  return 0;
}

/** Active values only — what a new assignment may choose from. */
export function selectableValues(g: CategoryGroup): CategoryValue[] {
  return [...g.values].filter((v) => v.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export const sortedValues = (g: CategoryGroup) =>
  [...g.values].sort((a, b) => a.sortOrder - b.sortOrder);

export const sortedGroups = (gs: CategoryGroup[]) =>
  [...gs].sort((a, b) => a.sortOrder - b.sortOrder);
