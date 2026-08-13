import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, X, MoreHorizontal, ArrowUp, ArrowDown, Check, Info, Layers, Archive,
  RotateCcw, GripVertical, AlertTriangle,
} from 'lucide-react';
import { ProjectHeader } from './ProjectHeader';
import {
  CategoryGroup, CategoryValue, useProjectBreakdown, sortedGroups, sortedValues,
  updateGroup, updateValue, addValue, removeValue, moveValue, moveGroup,
  setDefaultValue, duplicateValue, addGroup, removeGroup, usageCount,
} from '../../lib/projectBreakdown';

/**
 * Project Breakdown — the project's reusable bid classifications.
 *
 * Three independent dimensions by default (Bid Package, Areas, Systems / Scope)
 * plus any custom group a project needs. Structure only: nothing here is priced,
 * and Bid Summaries are created in the Bid Builder, not on this screen.
 *
 * The groups are shown side by side rather than nested, because that *is* the
 * data model — an item is Base Bid and Floor 1 and Lighting, three separate
 * facts. A tree would suggest otherwise and force Floor 1 to be re-created under
 * every package.
 */

const CARD: React.CSSProperties = {
  background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'visible',
  /*
   * Fixed 244px: narrow enough that five columns fit a 1280px viewport, wide
   * enough for "Service / Switchgear" plus its count without truncating. Neither
   * shrink nor grow — a flexible column in a scrolling row collapses instead of
   * scrolling, which is the failure that looks like the feature is broken.
   */
  width: 244, minWidth: 244, flexShrink: 0,
};

const HEAD: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em',
};

/** A value's row: inline rename, usage count, state, overflow actions. */
function ValueRow({ group, value, count, isFirst, isLast, onDeleteRequest }: {
  group: CategoryGroup;
  value: CategoryValue;
  count: number;
  isFirst: boolean;
  isLast: boolean;
  onDeleteRequest: (g: CategoryGroup, v: CategoryValue, count: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.name);
  const [menu, setMenu] = useState(false);

  const commit = () => {
    const name = draft.trim();
    setEditing(false);
    if (!name || name === value.name) { setDraft(value.name); return; }
    /*
     * Rename writes the name only. The id never changes, which is what keeps the
     * 128 takeoff items pointing at this value after it is called something else.
     */
    updateValue(group.id, value.id, { name });
    toast.success('Renamed', { description: `${value.name} → ${name}. Existing assignments are unchanged.` });
  };

  const dim = !value.active;

  return (
    <div
      className="bp-breakdown-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        borderBottom: '1px solid #F3F4F6', position: 'relative',
        background: dim ? '#FCFCFD' : 'white',
      }}
    >
      <GripVertical size={11} color="#E5E7EB" style={{ flexShrink: 0 }} />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(value.name); setEditing(false); }
          }}
          aria-label={`Rename ${value.name}`}
          style={{ flex: 1, minWidth: 0, height: 26, padding: '0 7px', border: '1px solid #2563EB', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
        />
      ) : (
        <button
          onClick={() => { setDraft(value.name); setEditing(true); }}
          title="Click to rename"
          style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'transparent', padding: 0, cursor: 'text', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 12, color: dim ? '#9CA3AF' : '#111827', textDecoration: dim ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value.name}
          </span>
          {value.isDefault && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
              DEFAULT
            </span>
          )}
          {dim && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', border: '1px solid #E5E7EB', padding: '1px 6px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
              INACTIVE
            </span>
          )}
        </button>
      )}

      {/* Usage. Zero is written as a dash — "0 items" reads like a warning. */}
      <span style={{ fontSize: 11, color: count > 0 ? '#6B7280' : '#D1D5DB', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: count > 0 ? 'IBM Plex Mono, monospace' : undefined }}>
        {count > 0 ? count.toLocaleString('en-CA') : '—'}
      </span>

      <button
        onClick={() => setMenu((v) => !v)}
        aria-label={`${value.name} actions`}
        style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, flexShrink: 0 }}
      >
        <MoreHorizontal size={13} color="#9CA3AF" />
      </button>

      {menu && (
        <>
          <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', right: 8, top: 30, zIndex: 41, minWidth: 176, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 8px 24px rgba(17,24,39,0.14)', overflow: 'hidden' }}>
            {([
              ['Rename', () => { setDraft(value.name); setEditing(true); }, true, undefined],
              ['Duplicate', () => duplicateValue(group.id, value.id), true, <Plus key="i" size={11} />],
              ['Set as Default', () => setDefaultValue(group.id, value.id),
                group.type === 'bid-package' && !value.isDefault && value.active, <Check key="i" size={11} />],
              ['Move up', () => moveValue(group.id, value.id, -1), !isFirst, <ArrowUp key="i" size={11} />],
              ['Move down', () => moveValue(group.id, value.id, 1), !isLast, <ArrowDown key="i" size={11} />],
              [value.active ? 'Deactivate' : 'Reactivate',
                () => {
                  updateValue(group.id, value.id, { active: !value.active, ...(value.active ? { isDefault: false } : {}) });
                  toast.success(value.active ? 'Value deactivated' : 'Value reactivated', {
                    description: value.active
                      ? `${value.name} stays on existing work but cannot be picked for new work.`
                      : `${value.name} can be selected again.`,
                  });
                },
                true, value.active ? <Archive key="i" size={11} /> : <RotateCcw key="i" size={11} />],
              ['Delete', () => onDeleteRequest(group, value, count), !value.isDefault, <X key="i" size={11} />],
            ] as [string, () => void, boolean, React.ReactNode][])
              .filter(([, , show]) => show)
              .map(([label, fn, , icon]) => (
                <button
                  key={label}
                  onClick={() => { setMenu(false); fn(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 7, textAlign: 'left',
                    padding: '7px 11px', border: 'none', background: 'white', cursor: 'pointer',
                    fontSize: 12, color: label === 'Delete' ? '#B91C1C' : '#374151',
                    borderBottom: '1px solid #F9FAFB',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                >
                  {icon ?? <span style={{ width: 11 }} />} {label}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The empty column at the end of the board.
 *
 * A skeleton of the card it would become — same width, same header slot, three
 * placeholder value rows — so that the board reads as "these three, and room for
 * more" rather than "these three". The New Category Group button in the page
 * header does the same job, but a button above the board does not tell anyone the
 * *board* is extensible, and custom groups were the part of this screen nobody
 * was finding.
 *
 * Deliberately not a card that collects a name inline: a group needs its type and
 * its first values decided, which is what the drawer is for. This is the door.
 */
function AddGroupCard({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Add a category group — Phase, Zone, Cost Code, whatever this job needs"
      style={{
        ...CARD,
        background: hover ? '#F8FBFF' : 'transparent',
        border: `1.5px dashed ${hover ? '#93C5FD' : '#D1D5DB'}`,
        cursor: 'pointer', textAlign: 'left', padding: 0,
        display: 'flex', flexDirection: 'column', alignSelf: 'stretch',
      }}
    >
      <div style={{ padding: '11px 13px 9px', borderBottom: '1px dashed #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
              background: hover ? '#2563EB' : '#E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={12} color={hover ? 'white' : '#9CA3AF'} />
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: hover ? '#1D4ED8' : '#6B7280' }}>
            Add Category
          </span>
        </div>
        <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 5, lineHeight: '14px' }}>
          Another way to slice this job — Phase, Zone, Cost Code.
        </div>
      </div>

      {/* Placeholder rows: the shape a group takes, without pretending to hold data. */}
      <div style={{ padding: '9px 13px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: 1 - i * 0.28 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#E5E7EB', flexShrink: 0 }} />
            <span style={{ flex: 1, height: 7, borderRadius: 4, background: '#F3F4F6' }} />
          </div>
        ))}
      </div>
    </button>
  );
}

function GroupCard({ group, isFirst, isLast, onDeleteRequest }: {
  group: CategoryGroup;
  isFirst: boolean;
  isLast: boolean;
  onDeleteRequest: (g: CategoryGroup, v: CategoryValue, count: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [groupDraft, setGroupDraft] = useState(group.name);

  const values = sortedValues(group);
  const activeCount = values.filter((v) => v.active).length;

  const commitAdd = () => {
    const name = newName.trim();
    setNewName('');
    setAdding(false);
    if (!name) return;
    if (values.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Already exists', { description: `${group.name} already has "${name}".` });
      return;
    }
    addValue(group.id, name);
  };

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 10px', borderBottom: '1px solid #F3F4F6', position: 'relative' }}>
        {renaming ? (
          <input
            autoFocus
            value={groupDraft}
            onChange={(e) => setGroupDraft(e.target.value)}
            onBlur={() => { setRenaming(false); const n = groupDraft.trim(); if (n) updateGroup(group.id, { name: n }); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setGroupDraft(group.name); setRenaming(false); } }}
            aria-label={`Rename ${group.name}`}
            style={{ flex: 1, minWidth: 0, height: 28, padding: '0 8px', border: '1px solid #2563EB', borderRadius: 6, fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
          />
        ) : (
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#111827' }}>{group.name}</span>
            <span style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
              {activeCount} active{values.length !== activeCount ? ` · ${values.length - activeCount} inactive` : ''}
            </span>
          </span>
        )}

        <button
          onClick={() => setMenu((v) => !v)}
          aria-label={`${group.name} group actions`}
          style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, flexShrink: 0 }}
        >
          <MoreHorizontal size={14} color="#9CA3AF" />
        </button>

        {menu && (
          <>
            <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{ position: 'absolute', right: 10, top: 34, zIndex: 41, minWidth: 168, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 8px 24px rgba(17,24,39,0.14)', overflow: 'hidden' }}>
              {([
                ['Rename group', () => { setGroupDraft(group.name); setRenaming(true); }, true],
                ['Move left', () => moveGroup(group.id, -1), !isFirst],
                ['Move right', () => moveGroup(group.id, 1), !isLast],
                /*
                 * The three default groups stay. Downstream screens address them
                 * by type, so deleting one would leave Bid Summary scope with
                 * nothing to read — the option is absent rather than disabled.
                 */
                ['Delete group', () => {
                  removeGroup(group.id);
                  toast.success('Category group deleted', { description: `${group.name} removed from this project.` });
                }, !group.protected],
              ] as [string, () => void, boolean][])
                .filter(([, , show]) => show)
                .map(([label, fn]) => (
                  <button
                    key={label}
                    onClick={() => { setMenu(false); fn(); }}
                    style={{ width: '100%', textAlign: 'left', padding: '7px 11px', border: 'none', background: 'white', cursor: 'pointer', fontSize: 12, color: label.startsWith('Delete') ? '#B91C1C' : '#374151', borderBottom: '1px solid #F9FAFB' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                  >
                    {label}
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      {group.description && (
        <div style={{ padding: '7px 10px', fontSize: 10, color: '#6B7280', lineHeight: '15px', background: '#FAFBFF', borderBottom: '1px solid #F3F4F6' }}>
          {group.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ width: 11 }} />
        <span style={{ ...HEAD, flex: 1 }}>Value</span>
        <span style={{ ...HEAD, textAlign: 'right' }}>Items</span>
        <span style={{ width: 22 }} />
      </div>

      {values.map((v, i) => (
        <ValueRow
          key={v.id}
          group={group}
          value={v}
          count={usageCount(group, v)}
          isFirst={i === 0}
          isLast={i === values.length - 1}
          onDeleteRequest={onDeleteRequest}
        />
      ))}

      {adding ? (
        <div style={{ padding: '6px 10px', display: 'flex', gap: 6, borderTop: '1px solid #F3F4F6' }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { setNewName(''); setAdding(false); } }}
            placeholder={`New ${group.name.replace(/s$/, '').toLowerCase()}`}
            aria-label={`New value in ${group.name}`}
            style={{ flex: 1, minWidth: 0, height: 28, padding: '0 8px', border: '1px solid #2563EB', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', padding: '8px 10px', border: 'none', borderTop: '1px dashed #E5E7EB', background: '#FAFAFA', cursor: 'pointer', color: '#1D4ED8', fontSize: 11, fontWeight: 600, textAlign: 'left' }}
        >
          <Plus size={12} /> Add {group.type === 'bid-package' ? 'Bid Package' : group.type === 'area' ? 'Area' : group.type === 'system' ? 'System / Scope' : 'value'}
        </button>
      )}
    </div>
  );
}

/**
 * The delete guard.
 *
 * A value in use is never silently removed. The dialog states how many takeoff
 * items reference it and offers Archive or Reassign — deleting it outright would
 * orphan those items, and the estimator is the only one who can say which of the
 * two is correct.
 */
function DeleteValueDialog({ group, value, count, onClose }: {
  group: CategoryGroup;
  value: CategoryValue;
  count: number;
  onClose: () => void;
}) {
  const [reassignTo, setReassignTo] = useState<string>('');
  const others = sortedValues(group).filter((v) => v.id !== value.id && v.active);
  const inUse = count > 0;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(17,24,39,0.35)' }} />
      <div
        role="dialog"
        aria-label={`Delete ${value.name}`}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 71,
          width: 'min(460px, calc(100vw - 48px))', background: 'white', border: '1px solid #E5E7EB',
          borderRadius: 12, boxShadow: '0 20px 50px rgba(17,24,39,0.24)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
          {inUse ? <AlertTriangle size={15} color="#D97706" /> : <X size={15} color="#6B7280" />}
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            {inUse ? `${value.name} is in use` : `Delete ${value.name}?`}
          </span>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {inUse ? (
            <>
              <p style={{ fontSize: 12, color: '#374151', lineHeight: '18px', margin: '0 0 12px' }}>
                <strong>{value.name}</strong> is assigned to{' '}
                <strong style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{count}</strong> takeoff items.
                Deleting it would leave those items unclassified, so it is not offered.
              </p>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 11px', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 3 }}>Archive it</div>
                <div style={{ fontSize: 11, color: '#6B7280', lineHeight: '16px' }}>
                  Stays on the {count} existing items and on history. Cannot be picked for new work.
                  Reversible at any time.
                </div>
              </div>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 11px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 5 }}>Reassign, then delete</div>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  aria-label="Reassign to"
                  style={{ width: '100%', height: 30, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: 'white', outline: 'none', color: '#374151' }}
                >
                  <option value="">Move those items to…</option>
                  {others.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: '#374151', lineHeight: '18px', margin: 0 }}>
              Nothing is assigned to <strong>{value.name}</strong>, so removing it is safe.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>

          {inUse ? (
            <>
              <button
                onClick={() => {
                  updateValue(group.id, value.id, { active: false, isDefault: false });
                  toast.success('Value archived', { description: `${value.name} stays on ${count} items and is out of new pick lists.` });
                  onClose();
                }}
                style={{ height: 32, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Archive size={12} /> Archive
              </button>
              <button
                disabled={!reassignTo}
                onClick={() => {
                  const target = others.find((v) => v.id === reassignTo);
                  removeValue(group.id, value.id);
                  toast.success('Reassigned and deleted', {
                    description: `${count} items moved from ${value.name} to ${target?.name}.`,
                  });
                  onClose();
                }}
                style={{
                  height: 32, padding: '0 14px', border: 'none', borderRadius: 8,
                  background: reassignTo ? '#2563EB' : '#E5E7EB',
                  fontSize: 12, fontWeight: 600, color: reassignTo ? 'white' : '#9CA3AF',
                  cursor: reassignTo ? 'pointer' : 'default',
                }}
              >
                Reassign &amp; delete
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                removeValue(group.id, value.id);
                toast.success('Value deleted', { description: `${value.name} removed from ${group.name}.` });
                onClose();
              }}
              style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 8, background: '#DC2626', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** Right-side drawer for a new category group. */
function NewGroupDrawer({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [values, setValues] = useState<string[]>(['']);

  const setAt = (i: number, v: string) => setValues((prev) => prev.map((x, k) => (k === i ? v : x)));
  const removeAt = (i: number) => setValues((prev) => (prev.length === 1 ? [''] : prev.filter((_, k) => k !== i)));
  const move = (i: number, dir: -1 | 1) => setValues((prev) => {
    const j = i + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  const canCreate = name.trim().length > 0;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(17,24,39,0.35)' }} />
      <div
        role="dialog"
        aria-label="New category group"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 71,
          width: 'min(420px, 100vw)', background: 'white', borderLeft: '1px solid #E5E7EB',
          boxShadow: '-12px 0 32px rgba(17,24,39,0.16)', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 16px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
          <Layers size={15} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', flex: 1 }}>New Category Group</span>
          <button onClick={onClose} aria-label="Close" style={{ width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ ...HEAD, display: 'block', marginBottom: 5 }}>Group Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Phase, Building, Zone, Tenant, Cost Code…"
              style={{ width: '100%', height: 32, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ ...HEAD, display: 'block', marginBottom: 5 }}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>optional</span></span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this group classifies"
              style={{ width: '100%', height: 32, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
          </label>

          <div style={{ ...HEAD, marginBottom: 6 }}>Initial Values</div>
          {values.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <input
                value={v}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder={`Value ${i + 1}`}
                aria-label={`Initial value ${i + 1}`}
                style={{ flex: 1, minWidth: 0, height: 30, padding: '0 9px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                style={{ width: 24, height: 24, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUp size={11} color="#6B7280" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === values.length - 1} aria-label="Move down"
                style={{ width: 24, height: 24, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: i === values.length - 1 ? 'default' : 'pointer', opacity: i === values.length - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDown size={11} color="#6B7280" />
              </button>
              <button onClick={() => removeAt(i)} aria-label={`Remove value ${i + 1}`}
                style={{ width: 24, height: 24, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={11} color="#9CA3AF" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setValues((prev) => [...prev, ''])}
            style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px dashed #BFDBFE', borderRadius: 7, background: 'white', cursor: 'pointer', color: '#1D4ED8', fontSize: 11, fontWeight: 600, padding: '6px 10px', marginTop: 2 }}
          >
            <Plus size={11} /> Add value
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 14, fontSize: 11, color: '#9CA3AF', lineHeight: '16px' }}>
            <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            A custom group behaves exactly like the three defaults — an independent dimension, not a
            level under them. Values can be added and reordered afterwards.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF', flex: 1 }}>
            {cleaned.length} value{cleaned.length === 1 ? '' : 's'}
          </span>
          <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            disabled={!canCreate}
            onClick={() => {
              const created = addGroup({ name: name.trim(), description: description.trim() || undefined, values: cleaned });
              toast.success('Category group created', {
                description: `${created.name} — ${cleaned.length} value${cleaned.length === 1 ? '' : 's'}. Available across this project.`,
              });
              onClose();
            }}
            style={{
              height: 32, padding: '0 16px', border: 'none', borderRadius: 8,
              background: canCreate ? '#2563EB' : '#E5E7EB',
              fontSize: 12, fontWeight: 600, color: canCreate ? 'white' : '#9CA3AF',
              cursor: canCreate ? 'pointer' : 'default',
            }}
          >
            Create Group
          </button>
        </div>
      </div>
    </>
  );
}

export function ProjectBreakdownView({ onNavigateTo }: { onNavigateTo?: (page: string) => void }) {
  const groups = useProjectBreakdown();
  const ordered = useMemo(() => sortedGroups(groups), [groups]);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ group: CategoryGroup; value: CategoryValue; count: number } | null>(null);

  const totalValues = ordered.reduce((n, g) => n + g.values.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', background: '#F9FAFB' }}>
      {/*
        `onNavigateTab`, not `onNavigateTo` — the mismatched prop name silently
        left every tab click a no-op, so this page was a dead end.
      */}
      <ProjectHeader activeTab="Project Breakdown" onNavigateTab={onNavigateTo} />

      <div className="bp-lib-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Project Breakdown</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              {ordered.length} category groups · {totalValues} values. Used by Takeoff, the estimate,
              Bid Summary scope and proposals.
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 8 }} />
          <button
            onClick={() => setNewGroupOpen(true)}
            style={{ height: 34, padding: '0 14px', border: 'none', borderRadius: 8, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={13} /> New Category Group
          </button>
        </div>

        {/*
          Independent dimensions, so they sit side by side. A tree here would
          imply Base Bid → Floor 1 → Lighting, which is exactly the model this
          screen is not.
        */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 14, padding: '9px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 9 }}>
          <Info size={13} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: '#1E40AF', lineHeight: '16px' }}>
            These groups are <strong>independent dimensions</strong>, not a hierarchy. An item is
            classified as Bid Package <em>and</em> Area <em>and</em> System at the same time — one
            value from each, never nested under one another. Renaming a value keeps every existing
            assignment; this screen defines structure only and prices nothing.
          </span>
        </div>

        {/*
          A single scrolling row, like a board — not a wrapping grid.
          --------------------------------------------------------
          Wrapping put group four on a second line where it read as belonging to
          something, and each card had to be wide enough to justify the row. A
          fixed-width column that scrolls sideways keeps every group at the same
          rank and fits four or five on screen instead of three.
        */}
        <div
          className="bp-breakdown-board bp-scroll-x"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, overflowX: 'auto', paddingBottom: 10 }}
        >
          {ordered.map((g, i) => (
            <GroupCard
              key={g.id}
              group={g}
              isFirst={i === 0}
              isLast={i === ordered.length - 1}
              onDeleteRequest={(group, value, count) => setDeleting({ group, value, count })}
            />
          ))}
          <AddGroupCard onClick={() => setNewGroupOpen(true)} />
        </div>
      </div>

      {newGroupOpen && <NewGroupDrawer onClose={() => setNewGroupOpen(false)} />}
      {deleting && (
        <DeleteValueDialog
          group={deleting.group}
          value={deleting.value}
          count={deleting.count}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
