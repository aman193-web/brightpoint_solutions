import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, X, ShieldCheck, ArrowRight, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ValidationIssue, countBySeverity, isBlocked, CATEGORY_COLOR, IssueCategory,
} from '../../lib/validation';

/**
 * Pre-submission review drawer.
 *
 * Lists exactly what is wrong, one issue per line, named.
 *
 * Blocking issues used to be a dead end — the footer read "Blocked" and the
 * only way out was to leave, fix it elsewhere and come back. Where a defensible
 * automatic answer exists (a price book rate, a company default) the issue now
 * carries a fix the estimator can apply from here, individually or all at once.
 * What it never does is invent a number: an issue with no honest resolution
 * still blocks, and says what it needs.
 *
 * Warnings can be acknowledged; once every warning is acknowledged the action
 * reads normally, and while any remain it reads "anyway" so proceeding is a
 * deliberate choice.
 */
export function ValidationReview({
  open, title, actionLabel, issues, onClose, onConfirm, onNavigate, onAutoFix,
}: {
  open: boolean;
  title: string;
  actionLabel: string;
  issues: ValidationIssue[];
  onClose: () => void;
  onConfirm: () => void;
  onNavigate?: (page: string) => void;
  /**
   * Applies an issue's `autoFix`. Returning true means it worked, and the issue
   * list the host recomputes should no longer contain it.
   */
  onAutoFix?: (issue: ValidationIssue) => boolean;
}) {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const counts = countBySeverity(issues);
  const blocked = isBlocked(issues);
  const warnings = issues.filter((i) => i.severity === 'warning');
  const outstanding = warnings.filter((i) => !acknowledged.has(i.id)).length;

  const fixable = onAutoFix ? issues.filter((i) => i.autoFix) : [];
  const blockingFixable = fixable.filter((i) => i.severity === 'blocking');
  const blockingUnfixable = issues.filter((i) => i.severity === 'blocking' && !i.autoFix);

  /** Applies every available fix, blocking ones first so the gate clears. */
  function fixAll() {
    if (!onAutoFix) return;
    const ordered = [...blockingFixable, ...fixable.filter((i) => i.severity !== 'blocking')];
    let done = 0;
    for (const issue of ordered) if (onAutoFix(issue)) done += 1;
    if (done > 0) {
      toast.success(`${done} issue${done === 1 ? '' : 's'} resolved`, {
        description: blockingUnfixable.length > 0
          ? `${blockingUnfixable.length} still needs a decision from you.`
          : 'Nothing is blocking this any more.',
      });
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<IssueCategory, ValidationIssue[]>();
    for (const i of issues) {
      if (!map.has(i.category)) map.set(i.category, []);
      map.get(i.category)!.push(i);
    }
    return [...map.entries()];
  }, [issues]);

  if (!open) return null;

  const clean = issues.length === 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(17,24,39,0.4)' }} />
      <div style={{ width: 520, maxWidth: '100%', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 32px rgba(0,0,0,0.16)' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
          {clean
            ? <ShieldCheck size={16} color="#16A34A" />
            : <AlertTriangle size={16} color={blocked ? '#DC2626' : '#D97706'} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
              {clean
                ? 'Every check passed.'
                : `${counts.blocking} blocking · ${counts.warning} warning${counts.warning === 1 ? '' : 's'}${outstanding > 0 ? ` · ${outstanding} unacknowledged` : ''}`}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close review" style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>

        {/* Blocking banner — states the block and, where possible, clears it */}
        {blocked && (
          <div style={{ padding: '10px 18px', background: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <AlertTriangle size={13} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: '#B91C1C', lineHeight: '17px', flex: 1, minWidth: 220 }}>
              {blockingFixable.length > 0 && blockingUnfixable.length === 0
                ? `${blockingFixable.length} required input${blockingFixable.length === 1 ? ' is' : 's are'} missing, and ${blockingFixable.length === 1 ? 'it' : 'they'} can be resolved from here.`
                : blockingUnfixable.length > 0
                  ? `${blockingUnfixable.length} required input${blockingUnfixable.length === 1 ? '' : 's'} need${blockingUnfixable.length === 1 ? 's' : ''} a decision from you — there is no safe default to apply.`
                  : 'A required financial input is missing.'}
              {' '}Warnings below can be acknowledged instead.
            </span>
            {blockingFixable.length > 0 && (
              <button
                onClick={fixAll}
                style={{ height: 28, padding: '0 11px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
              >
                <Wand2 size={12} /> Fix {blockingFixable.length}
              </button>
            )}
          </div>
        )}

        {/* Issues */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {clean ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <ShieldCheck size={32} color="#BBF7D0" />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 12 }}>Nothing outstanding</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Material pricing, quotes, markup, tax and the proposal sections all check out.
              </div>
            </div>
          ) : grouped.map(([category, list]) => {
            const cfg = CATEGORY_COLOR[category];
            return (
              <div key={category}>
                <div style={{ padding: '6px 18px', background: '#FAFAFA', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '1px 7px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {category}
                  </span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{list.length}</span>
                </div>
                {list.map((issue) => {
                  const ack = acknowledged.has(issue.id);
                  const isBlockingIssue = issue.severity === 'blocking';
                  return (
                    <div
                      key={issue.id}
                      style={{
                        display: 'flex', gap: 10, padding: '10px 18px', borderBottom: '1px solid #F9FAFB',
                        background: ack ? '#F9FAFB' : 'white', opacity: ack ? 0.7 : 1,
                      }}
                    >
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                        background: isBlockingIssue ? '#DC2626' : '#D97706',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: '18px', textDecoration: ack ? 'line-through' : 'none' }}>
                          {issue.message}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                          {issue.fixLabel && issue.fixPage && (
                            <button
                              onClick={() => { onNavigate?.(issue.fixPage!); onClose(); }}
                              style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                            >
                              {issue.fixLabel} <ArrowRight size={10} />
                            </button>
                          )}
                          {!isBlockingIssue && (
                            <button
                              onClick={() => setAcknowledged((prev) => {
                                const next = new Set(prev);
                                if (next.has(issue.id)) next.delete(issue.id); else next.add(issue.id);
                                return next;
                              })}
                              style={{
                                fontSize: 11, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                color: ack ? '#16A34A' : '#6B7280', display: 'flex', alignItems: 'center', gap: 3,
                              }}
                            >
                              <Check size={10} /> {ack ? 'Acknowledged' : 'Acknowledge'}
                            </button>
                          )}
                          {isBlockingIssue && !issue.autoFix && (
                            <span title="No safe default exists — this one needs you" style={{ fontSize: 10, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: 3 }}>
                              Needs a decision
                            </span>
                          )}
                        </div>
                        {issue.autoFix && onAutoFix && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, padding: '7px 9px', background: '#F8FBFF', border: '1px solid #DBEAFE', borderRadius: 7 }}>
                            <button
                              onClick={() => onAutoFix(issue)}
                              style={{ height: 26, padding: '0 10px', border: 'none', borderRadius: 6, background: '#2563EB', fontSize: 11, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}
                            >
                              <Wand2 size={11} /> {issue.autoFix.label}
                            </button>
                            <span style={{ fontSize: 10, color: '#6B7280', lineHeight: '14px' }}>{issue.autoFix.detail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bp-toolbar" style={{ padding: '12px 18px', borderTop: '1px solid #E5E7EB' }}>
          {fixable.length > 0 && (
            <button
              onClick={fixAll}
              style={{ height: 34, padding: '0 12px', border: '1px solid #BFDBFE', borderRadius: 7, background: '#EFF6FF', fontSize: 12, fontWeight: 600, color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            >
              <Wand2 size={12} /> Fix all {fixable.length}
            </button>
          )}
          {warnings.length > 0 && (
            <button
              onClick={() => setAcknowledged(new Set(warnings.map((w) => w.id)))}
              style={{ height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Acknowledge all
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ height: 34, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>
          {/*
            When everything blocking is fixable the primary action resolves and
            continues in one press — the estimator never has to leave. It only
            reads "Blocked" when an issue genuinely needs a human decision.
          */}
          {blocked && blockingFixable.length > 0 && blockingUnfixable.length === 0 ? (
            <button
              onClick={() => { fixAll(); onConfirm(); }}
              style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              <Wand2 size={13} /> Fix &amp; {actionLabel.toLowerCase()}
            </button>
          ) : (
            <button
              onClick={onConfirm}
              disabled={blocked}
              title={blocked ? 'One issue still needs a decision from you' : undefined}
              style={{
                height: 34, padding: '0 16px', border: 'none', borderRadius: 7,
                background: blocked ? '#E5E7EB' : '#2563EB',
                fontSize: 13, fontWeight: 600, color: blocked ? '#9CA3AF' : 'white',
                cursor: blocked ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {blocked ? 'Blocked' : outstanding > 0 ? `${actionLabel} anyway` : actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
