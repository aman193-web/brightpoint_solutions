import { useEffect, useState } from 'react';

/**
 * Assemblies queued for takeoff.
 *
 * Held outside any one component so the Library, the queue modal and (later) the
 * Takeoff workspace all read the same list. A minimal subscribe/snapshot store
 * rather than context, because the queue is a flat list with no hierarchy.
 */

export interface TakeoffQueueEntry {
  /** Unique per queue entry, not per assembly — the same assembly can be queued twice. */
  entryId: string;
  assemblyId: string;
  name: string;
  code: string;
  category: string;
  subcat?: string;
  type?: string;
  count: number;
  componentCount: number;
  materialCost: number;
  laborHours: number;
  /** Sheet the estimator intends to place it on. */
  sheet: string;
  /**
   * How this assembly is quantified — clicked, or measured along a path.
   *
   * Carried on the queue entry so the tool the Takeoff arms is the one the
   * estimator chose in the builder, rather than each screen deciding again from
   * the category and the two eventually disagreeing. Optional so entries queued
   * before this existed still load; consumers fall back to
   * `defaultMeasureType()`.
   */
  measure?: 'count' | 'linear';
}

let queue: TakeoffQueueEntry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getQueue(): TakeoffQueueEntry[] {
  return queue;
}

export function enqueue(entry: Omit<TakeoffQueueEntry, 'entryId'>): TakeoffQueueEntry {
  seq += 1;
  const full: TakeoffQueueEntry = { ...entry, entryId: `tq-${seq}` };
  queue = [...queue, full];
  emit();
  return full;
}

export function updateEntry(entryId: string, patch: Partial<TakeoffQueueEntry>) {
  queue = queue.map((e) => (e.entryId === entryId ? { ...e, ...patch } : e));
  emit();
}

export function removeEntry(entryId: string) {
  queue = queue.filter((e) => e.entryId !== entryId);
  emit();
}

export function clearQueue() {
  queue = [];
  emit();
}

/** Subscribes a component to the queue. */
export function useTakeoffQueue(): TakeoffQueueEntry[] {
  const [snapshot, setSnapshot] = useState(queue);
  useEffect(() => {
    const listener = () => setSnapshot(queue);
    listeners.add(listener);
    listener();
    return () => { listeners.delete(listener); };
  }, []);
  return snapshot;
}

export function queueTotals(entries: TakeoffQueueEntry[]) {
  return {
    assemblies: entries.length,
    placements: entries.reduce((s, e) => s + e.count, 0),
    material: entries.reduce((s, e) => s + e.materialCost * e.count, 0),
    hours: entries.reduce((s, e) => s + e.laborHours * e.count, 0),
  };
}
