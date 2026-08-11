import { useEffect, useState } from 'react';
import { Assembly, CategoryCode } from '../components/library/libraryData';

/**
 * Assemblies saved in this session, newest first.
 *
 * An estimator who has just built something is about to use it, and making them
 * walk Library → Category → Subcategory → Type to find it is the hunt this
 * exists to remove.
 *
 * This is a *reference*, not a second home. The assembly itself is filed
 * normally in its library, category, subcategory and type; these records only
 * point at it. Nothing here owns assembly data, and removing a record never
 * removes an assembly.
 *
 * A module store rather than context because Build and Browse are never mounted
 * together — Browse has to be able to read what Build saved after Build is gone.
 */

export interface RecentAssembly {
  assembly: Assembly;
  cat: CategoryCode;
  /** Library it was filed into, for the badge. */
  libraryId: string;
  libraryName: string;
  /** Epoch ms, so "created 8 min ago" stays honest as the session runs on. */
  savedAt: number;
}

/** Enough to cover a working session without becoming a second browse list. */
export const RECENT_LIMIT = 8;

let recent: RecentAssembly[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getRecent(): RecentAssembly[] {
  return recent;
}

/**
 * Record a save. Re-saving an assembly moves it back to the front rather than
 * listing it twice.
 */
export function recordSaved(entry: Omit<RecentAssembly, 'savedAt'>): RecentAssembly {
  const record: RecentAssembly = { ...entry, savedAt: Date.now() };
  recent = [record, ...recent.filter((r) => r.assembly.id !== entry.assembly.id)].slice(0, RECENT_LIMIT);
  emit();
  return record;
}

/** Drop a record from the list. The assembly itself is untouched. */
export function dismissRecent(assemblyId: string) {
  recent = recent.filter((r) => r.assembly.id !== assemblyId);
  emit();
}

export function clearRecent() {
  recent = [];
  emit();
}

export function useRecentAssemblies(): RecentAssembly[] {
  const [snap, setSnap] = useState(recent);
  useEffect(() => {
    const listener = () => setSnap(recent);
    listeners.add(listener);
    listener();
    return () => { listeners.delete(listener); };
  }, []);
  return snap;
}

/**
 * The id of the most recent save, held briefly so Browse can flash the row it
 * just landed on. Cleared once the highlight has been shown.
 */
let justSavedId: string | null = null;

export function markJustSaved(id: string) {
  justSavedId = id;
  emit();
}

export function takeJustSaved(): string | null {
  const id = justSavedId;
  justSavedId = null;
  return id;
}

export function peekJustSaved(): string | null {
  return justSavedId;
}

/** "just now", "8 min ago", "2 hr ago" — relative, because absolute is noise here. */
export function createdAgo(savedAt: number, now = Date.now()): string {
  const mins = Math.floor((now - savedAt) / 60000);
  if (mins < 1) return 'Created just now';
  if (mins === 1) return 'Created 1 min ago';
  if (mins < 60) return `Created ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return 'Created 1 hr ago';
  if (hrs < 24) return `Created ${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Created 1 day ago' : `Created ${days} days ago`;
}
