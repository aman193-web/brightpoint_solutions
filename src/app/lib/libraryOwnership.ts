/**
 * The global backbone, and what a company may do to it.
 *
 * BrightPoint ships one catalog of parts and assemblies. Every company sees it,
 * and **no company may change it** — a price a contractor negotiates, a labor
 * unit their crews actually hit, an assembly renamed to match their own habits:
 * all of that is theirs and must never reach another customer's catalog.
 *
 *   BrightPoint backbone   the base system record, read-only, shared
 *   Company record         this company's copy or creation, freely editable
 *
 * The mechanism is deliberately *copy-on-write* rather than "edit with
 * permission checks". A company editing a backbone part gets a company-owned
 * record derived from it; the backbone row is never mutated, so the guarantee
 * holds by construction rather than by everyone remembering to check a flag.
 *
 * Without a backend this module cannot enforce tenancy — it defines the rule,
 * names the states, and keeps the client honest about which record it is
 * touching. When the API arrives, `origin` and `derivedFrom` are the fields it
 * needs to persist; nothing above this layer changes.
 */

export type RecordOrigin = 'backbone' | 'company';

export interface OwnedRecord {
  /** Where this record came from. Absent means backbone — the shipped default. */
  origin?: RecordOrigin;
  /**
   * The backbone record this was copied from, if any.
   *
   * Kept so a company copy can show what it diverged from, and so a future
   * catalog update can tell "customized from BPA-FX-201" apart from "written
   * from scratch" — the first can be offered a merge, the second cannot.
   */
  derivedFrom?: string;
}

export const originOf = (r: OwnedRecord | undefined | null): RecordOrigin =>
  r?.origin ?? 'backbone';

export const isBackbone = (r: OwnedRecord | undefined | null): boolean =>
  originOf(r) === 'backbone';

export const isCompanyOwned = (r: OwnedRecord | undefined | null): boolean =>
  originOf(r) === 'company';

/** What the badge on a row says, and why. */
export const ORIGIN_LABEL: Record<RecordOrigin, string> = {
  backbone: 'BrightPoint',
  company: 'Company',
};

export const ORIGIN_HINT: Record<RecordOrigin, string> = {
  backbone:
    'BrightPoint global record — shared with every company and never changed by one. '
    + 'Editing it here creates your own copy; the global record is untouched.',
  company:
    "Your company's own record. Edits stay in this account and never reach the "
    + 'BrightPoint global catalog or another company.',
};

/**
 * A company-owned copy of a backbone record.
 *
 * The id is namespaced rather than reused: two records that mean different things
 * must not share an identifier, or a company's price would follow the backbone id
 * into somebody else's estimate the moment these were persisted together.
 */
export function companyCopyId(backboneId: string): string {
  return `co-${backboneId}`;
}

export function makeCompanyCopy<T extends OwnedRecord & { id: string; name: string }>(
  source: T,
  patch: Partial<T> = {},
): T {
  return {
    ...source,
    ...patch,
    id: companyCopyId(source.id),
    origin: 'company',
    derivedFrom: isBackbone(source) ? source.id : source.derivedFrom,
  };
}

/**
 * The name a duplicate opens with.
 *
 * "Copy of X" rather than "X", because two rows reading the same thing in one
 * list is how an estimator prices the wrong one.
 */
export function copyName(name: string): string {
  return /^Copy of /.test(name) ? name : `Copy of ${name}`;
}
