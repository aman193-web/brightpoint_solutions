import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Send, Download, Plus, Trash2, ChevronDown, ChevronRight, GripVertical,
  X, FileText, FileSpreadsheet, Pencil, Mail, Phone, Building2, Info,
  ClipboardList, CheckCircle2, MinusCircle, Lightbulb, HelpCircle, Snowflake,
  ArrowUp, ArrowDown, Copy, Sparkles, PanelRight, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { ProjectHeader } from '../projects/ProjectHeader';
import { ValidationReview } from '../common/ValidationReview';
import { validate, ValidationIssue, isBlocked, countBySeverity } from '../../lib/validation';
import { COMPANY_DEFAULTS, money as fmtMoney } from '../../lib/costing';
import { useBidSnapshot, getBidSnapshot, BidBucket } from '../../lib/bidSnapshot';
import {
  missingPriceLines, priceBookRate, applyPriceBook, excludeLine, useMaterialsRevision,
} from '../../lib/materials';
import { setCompanyDefault, MARKUP_FIELDS, MarkupKey } from '../../lib/costing';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'superseded';

interface Recipient {
  id: string;
  company: string;
  email: string;
  selected: boolean;
  primary?: boolean;
  accent: string;
  bg: string;
}

interface NarrativeSection {
  id: string;
  index: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  body: string;
}

interface BreakdownSection {
  id: string;
  index: string;
  title: string;
  description: string;
  amount: number;
  collapsed: boolean;
  included: boolean;
  /** Free-form label — the breakdown structure is never hard-coded. */
  kind: string;
}

/**
 * Starting points for a new breakdown row. These are suggestions, not a fixed
 * structure — the estimator can rename any row or add a blank one.
 */
const BREAKDOWN_PRESETS: { kind: string; title: string; description: string }[] = [
  { kind: 'Scope',     title: 'New scope section',   description: 'Describe the work covered by this section.' },
  { kind: 'Gear',      title: 'Switchgear & panels', description: 'Distribution equipment, panels and terminations.' },
  { kind: 'Lighting',  title: 'Lighting package',    description: 'Fixtures, controls and lamping for the lighting package.' },
  { kind: 'Controls',  title: 'Controls package',    description: 'Dimming, occupancy sensing and control wiring.' },
  { kind: 'Milestone', title: 'Milestone billing',   description: 'Amount billed at this project milestone.' },
  { kind: 'Descope',   title: 'Descoped work',       description: 'Work removed from the base scope — shown as a credit.' },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ProposalStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:      { label: 'Draft',      color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  sent:       { label: 'Sent',       color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  viewed:     { label: 'Viewed',     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  accepted:   { label: 'Accepted',   color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  declined:   { label: 'Declined',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  expired:    { label: 'Expired',    color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
  superseded: { label: 'Superseded', color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

const INIT_RECIPIENTS: Recipient[] = [
  { id: 'r1', company: 'BuildRight Construction', email: 'estimating@buildright.com', selected: true, primary: true, accent: '#16A34A', bg: '#F0FDF4' },
  { id: 'r2', company: 'Summit Builders, Inc.',   email: 'bids@summitbuilders.com',   selected: true, accent: '#D97706', bg: '#FFFBEB' },
  { id: 'r3', company: 'Pinnacle Contracting',    email: 'estimating@pinnacle.com',   selected: true, accent: '#1D4ED8', bg: '#EFF6FF' },
];

const INIT_NARRATIVE: NarrativeSection[] = [
  {
    id: 'scope', index: '2', title: 'Scope of Work',
    blurb: 'The work to be performed under this proposal.',
    icon: <ClipboardList size={16} color="#2563EB" />,
    body: 'Supply and install all electrical works for the Dollar Tree Store #1842 tenant fit-out as shown on drawings E-101 through E-301 Rev A, including lighting, power distribution, devices, data rough-in and fire alarm devices. All work to be carried out in accordance with the CEC, local amendments and the Division 26 specification.',
  },
  {
    id: 'includes', index: '3', title: 'Includes',
    blurb: 'Materials, labor, equipment, and services included in our scope.',
    icon: <CheckCircle2 size={16} color="#16A34A" />,
    body: '• All material, labor, tools and equipment for the scope described above\n• Electrical permit and inspection fees\n• As-built markups and O&M documentation\n• 12-month workmanship warranty from substantial completion\n• Temporary lighting during construction hours',
  },
  {
    id: 'excludes', index: '4', title: 'Excludes',
    blurb: 'Items not included in our scope or pricing.',
    icon: <MinusCircle size={16} color="#DC2626" />,
    body: '• Fire alarm control panel and monitoring (by others)\n• Structured cabling termination and testing beyond patch panel\n• Cutting, patching and painting of finished surfaces\n• Overtime, shift or weekend premium labor\n• Utility company fees and service upgrades',
  },
  {
    id: 've', index: '5', title: 'Value Engineering (VE) Options',
    blurb: 'Alternate products or methods to reduce cost or improve value.',
    icon: <Lightbulb size={16} color="#D97706" />,
    body: '• Substitute 0-10V dimming for the specified DALI controls — credit $1,850\n• Central inverter in place of integral emergency battery packs — credit $890\n• MC cable in lieu of EMT for branch circuits above ACT — credit $1,240',
  },
  {
    id: 'terms', index: '6', title: 'Terms & Conditions',
    blurb: 'Terms, payment schedule, warranties, and other commercial conditions.',
    icon: <FileText size={16} color="#6B7280" />,
    body: 'This proposal is valid for 30 days from the date of issue. Payment terms are Net 30 from invoice date. Progress billing: 30% on acceptance, 40% at rough-in completion, 30% on final inspection. Prices exclude GST and QST. Client to provide safe, unobstructed access to the work areas during regular business hours.',
  },
];

/**
 * The breakdown starts as the bid's own cost buckets, so the proposal opens
 * quoting the bid. It stays fully editable from there — a proposal is a
 * commercial document and the estimator may well restructure or round it — but
 * any divergence from the bid is called out rather than left to be discovered.
 */
function breakdownFromBid(buckets: BidBucket[]): BreakdownSection[] {
  return buckets.map((b, i) => ({
    id: `b-${b.id}`,
    index: `7.${i + 1}`,
    title: b.label,
    description: b.description,
    amount: b.amount,
    collapsed: true,
    included: true,
    kind: 'Scope',
  }));
}

const PROPOSAL_SETTINGS = [
  { label: 'Valid for', value: '30 days' },
  { label: 'Tax region', value: 'QC (GST + QST)' },
  { label: 'Currency', value: 'CAD' },
  { label: 'Payment terms', value: 'Net 30' },
  { label: 'Labor basis', value: 'Open Shop (Non-Union)' },
];

function money(v: number) {
  return '$' + v.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Send dialog ──────────────────────────────────────────────────────────────

function SendDialog({ recipients, total, onClose, onSend }: {
  recipients: Recipient[]; total: number; onClose: () => void; onSend: () => void;
}) {
  const [step, setStep] = useState<'compose' | 'confirm'>('compose');
  const to = recipients.map((r) => r.email).join(', ');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send size={15} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>Send proposal</span>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#6B7280" />
          </button>
        </div>

        {step === 'compose' ? (
          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                To ({recipients.length} recipient{recipients.length !== 1 ? 's' : ''})
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={13} color="#9CA3AF" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
                <input defaultValue={to} style={{ width: '100%', height: 34, paddingLeft: 30, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>A separate proposal is sent to each recipient.</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Subject</label>
              <input defaultValue="Proposal PR-2026-0034 — Dollar Tree Store #1842 Electrical" style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Message</label>
              <textarea
                rows={4}
                defaultValue={'Hi,\n\nPlease find attached our proposal for the electrical works at Dollar Tree Store #1842. The proposal is valid for 30 days.\n\nBest regards,\nJorge Martinez'}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: '18px' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 8 }}>Attachments</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { name: 'Brightpoint_Proposal_PR-2026-0034.pdf', size: '284 KB' },
                  { name: 'Scope_of_Works_DollarTree_1842.pdf', size: '128 KB' },
                ].map(({ name, size }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB' }}>
                    <FileText size={12} color="#6B7280" />
                    <span style={{ fontSize: 12, color: '#374151', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{size}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ height: 34, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => setStep('confirm')} style={{ height: 34, padding: '0 20px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer' }}>Review &amp; send</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ padding: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A', marginBottom: 8 }}>Ready to send</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: '18px' }}>
                Proposal <strong>PR-2026-0034</strong> ({money(total)} excl. tax) will be sent to <strong>{recipients.length}</strong> general contractor{recipients.length !== 1 ? 's' : ''} and marked as <strong>Sent</strong>. A frozen snapshot is created for each recipient.
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>Valid until: <strong style={{ color: '#374151' }}>2026-08-30</strong> (30 days)</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setStep('compose')} style={{ height: 34, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>Back</button>
              <button onClick={onSend} style={{ height: 34, padding: '0 20px', border: 'none', borderRadius: 7, background: '#16A34A', fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={13} /> Confirm &amp; send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PDF preview overlay ──────────────────────────────────────────────────────

function PdfPreview({ sections, status, onClose, docked }: {
  sections: BreakdownSection[]; status: ProposalStatus; onClose: () => void; docked?: boolean;
}) {
  const included = sections.filter((s) => s.included);
  const total = included.reduce((sum, sec) => sum + sec.amount, 0);
  const gst = total * 0.05;
  const qst = total * 0.09975;
  const cfg = STATUS_CFG[status];

  return (
    <div style={
      docked
        ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#4B5563' }
        : { position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(17,24,39,0.75)', display: 'flex', flexDirection: 'column' }
    }>
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, background: '#111827', flexShrink: 0 }}>
        <FileText size={14} color="#93C5FD" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'white', flex: 1, minWidth: 0 }}>
          {docked ? 'Live preview' : 'Proposal preview — PR-2026-0034'}
        </span>
        <button
          onClick={() => toast.success('Export started', { description: 'A frozen PDF snapshot is being generated.' })}
          style={{ height: 30, padding: '0 12px', border: '1px solid #374151', borderRadius: 6, background: '#1F2937', fontSize: 12, color: '#E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Download size={12} /> Download PDF
        </button>
        <button onClick={onClose} aria-label={docked ? 'Hide preview' : 'Close preview'} style={{ width: 30, height: 30, border: '1px solid #374151', borderRadius: 6, background: '#1F2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={14} color="#E5E7EB" />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: docked ? 14 : 24, display: 'flex', justifyContent: 'center', minHeight: 0 }}>
        <div style={{ width: '100%', maxWidth: 620, background: 'white', boxShadow: '0 8px 40px rgba(0,0,0,0.3)', borderRadius: 2, padding: '40px 48px', fontSize: 12, color: '#374151', lineHeight: '18px', alignSelf: 'flex-start' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid #2563EB', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', marginBottom: 4 }}>Brightpoint Electrical</div>
              <div style={{ fontSize: 11, color: '#6B7280', lineHeight: '17px' }}>
                456 Industrial Pkwy, Suite 200<br />Montréal, QC H2X 1Z4<br />+1 (514) 555-0188 · info@brightpoint.ca<br />RBQ #8202-7891-01
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB', letterSpacing: '-0.02em' }}>PROPOSAL</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#374151', marginBottom: 2 }}>PR-2026-0034</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>Date: 2026-07-31</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>Valid until: 2026-08-30</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  {cfg.label.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Client + project */}
          <div style={{ marginBottom: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Prepared for</div>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>Dollar Tree Stores, Inc.</div>
              <div style={{ fontSize: 11, color: '#6B7280', lineHeight: '17px' }}>
                Attn: David Chen<br />500 Volvo Pkwy, Chesapeake VA 23320<br />david.chen@dollartree.com
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Project</div>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>Dollar Tree Store #1842</div>
              <div style={{ fontSize: 11, color: '#6B7280', lineHeight: '17px' }}>
                Electrical works — tenant fit-out<br />1200 Ste-Catherine O., Montréal<br />Drawings: E-101 to E-301 Rev A
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                {['Description', 'Amount'].map((h) => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {included.map((sec, i) => (
                <tr key={sec.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '9px 10px' }}>
                    <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{sec.title}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', lineHeight: '16px' }}>{sec.description}</div>
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    {money(sec.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <div style={{ width: 240 }}>
              {[
                { label: 'Subtotal', value: total },
                { label: 'GST (5%)', value: gst },
                { label: 'QST (9.975%)', value: qst },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280', fontSize: 12 }}>{label}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{money(value)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #111827', marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Total</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 15, color: '#111827' }}>{money(total + gst + qst)}</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: '15px', borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
            <strong style={{ color: '#6B7280' }}>Terms &amp; Conditions:</strong> This proposal is valid for 30 days from the date of issue. Payment terms Net 30. Progress billing 30% on acceptance, 40% at rough-in completion, 30% on final inspection. Prices exclude GST and QST.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Numbered section card ────────────────────────────────────────────────────

function SectionCard({
  index, title, blurb, icon, editing, body, onBodyChange, onAiPrefill,
}: {
  index: string; title: string; blurb: string; icon: React.ReactNode;
  editing: boolean; body: string; onBodyChange: (v: string) => void;
  onAiPrefill?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const expanded = open || editing;

  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: 'none', background: 'white', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{index}. {title}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{blurb}</div>
        </div>
        {body.trim().length === 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: 9999 }}>Empty</span>
        )}
        {expanded ? <ChevronDown size={15} color="#9CA3AF" /> : <ChevronRight size={15} color="#9CA3AF" />}
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 14px 64px', borderTop: '1px solid #F3F4F6' }}>
          {editing && onAiPrefill && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <button
                onClick={onAiPrefill}
                style={{ height: 26, padding: '0 9px', border: '1px solid #DDD6FE', borderRadius: 6, background: '#F5F3FF', fontSize: 11, fontWeight: 600, color: '#7C3AED', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Sparkles size={11} /> Draft with AI
              </button>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>Optional — this section can be written entirely by hand.</span>
            </div>
          )}
          {editing ? (
            <textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={Math.min(12, body.split('\n').length + 2)}
              style={{ width: '100%', marginTop: 12, padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, lineHeight: '19px', color: '#374151', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          ) : (
            <div style={{ marginTop: 12, fontSize: 12, lineHeight: '19px', color: '#374151', whiteSpace: 'pre-wrap' }}>{body}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ProposalCenter ──────────────────────────────────────────────────────

interface ProposalCenterProps {
  onNavigateTo?: (page: string) => void;
  onBack?: () => void;
  projectStatus?: string;
  onStatusChange?: (status: string) => void;
}

export function ProposalCenter({ onNavigateTo, onBack, projectStatus, onStatusChange }: ProposalCenterProps) {
  const [status, setStatus] = useState<ProposalStatus>('draft');
  const [editing, setEditing] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>(INIT_RECIPIENTS);
  const [narrative, setNarrative] = useState<NarrativeSection[]>(INIT_NARRATIVE);
  /** The live bid. The proposal quotes it unless the estimator says otherwise. */
  const bid = useBidSnapshot();
  const [breakdown, setBreakdown] = useState<BreakdownSection[]>(() => breakdownFromBid(bid.buckets));
  const [version, setVersion] = useState('Same for all recipients');
  const [showSend, setShowSend] = useState(false);
  // Persistent preview docked beside the editor, so the proposal can be
  // reviewed while it is being written rather than only at export time.
  const [previewOpen, setPreviewOpen] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [review, setReview] = useState<null | { intent: 'send' | 'export-pdf' | 'export-excel' }>(null);

  const selectedRecipients = recipients.filter((r) => r.selected);
  const includedSections = breakdown.filter((s) => s.included);
  const total = includedSections.reduce((sum, s) => sum + s.amount, 0);

  /**
   * The bid is the authority on price. A breakdown that no longer adds up to it
   * is legitimate — sections get excluded, figures get rounded — but it must be
   * visible, with one action to put it back.
   */
  const bidTotal = bid.totals.sellPrice;
  const variance = total - bidTotal;
  const matchesBid = Math.abs(variance) < 0.01;

  function resyncWithBid() {
    setBreakdown(breakdownFromBid(bid.buckets));
    toast.success('Breakdown matched to the bid', {
      description: `${bid.buckets.length} sections · ${fmtMoney(bidTotal)}.`,
    });
  }
  const cfg = STATUS_CFG[status];
  const allExpanded = breakdown.every((s) => !s.collapsed);

  function toggleRecipient(id: string) {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  }

  function addRecipient() {
    const n = recipients.length + 1;
    setRecipients((prev) => [
      ...prev,
      { id: `r-${Date.now()}`, company: `New contractor ${n}`, email: 'estimating@example.com', selected: false, accent: '#6B7280', bg: '#F9FAFB' },
    ]);
    toast.success('Recipient added', { description: 'Update the company name and email before sending.' });
  }

  function toggleBreakdown(id: string) {
    setBreakdown((prev) => prev.map((s) => (s.id === id ? { ...s, collapsed: !s.collapsed } : s)));
  }

  function setAllBreakdown(collapsed: boolean) {
    setBreakdown((prev) => prev.map((s) => ({ ...s, collapsed })));
  }

  function addBreakdownSection() {
    setBreakdown((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`, index: `7.${prev.length + 1}`, title: 'New section',
        description: 'Describe the work covered by this section.', amount: 0, collapsed: false, included: true,
      },
    ]);
  }

  function updateBreakdown(id: string, changes: Partial<BreakdownSection>) {
    setBreakdown((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }

  function removeBreakdown(id: string) {
    setBreakdown((prev) => reindex(prev.filter((s) => s.id !== id)));
  }

  /** Renumbers 7.1, 7.2 … after any structural change. */
  function reindex(rows: BreakdownSection[]): BreakdownSection[] {
    return rows.map((r, i) => ({ ...r, index: `7.${i + 1}` }));
  }

  function moveBreakdown(id: string, dir: -1 | 1) {
    setBreakdown((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return reindex(next);
    });
  }

  function duplicateBreakdown(id: string) {
    setBreakdown((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      if (i < 0) return prev;
      const src = prev[i];
      const copy: BreakdownSection = {
        ...src,
        id: `${src.id}-copy-${prev.length}`,
        title: `${src.title} (copy)`,
        collapsed: false,
      };
      return reindex([...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)]);
    });
    toast.success('Section duplicated');
  }

  function addPreset(preset: typeof BREAKDOWN_PRESETS[number]) {
    setBreakdown((prev) => reindex([...prev, {
      id: `b-${preset.kind}-${prev.length}`,
      index: `7.${prev.length + 1}`,
      title: preset.title,
      description: preset.description,
      amount: 0,
      collapsed: false,
      included: true,
      kind: preset.kind,
    }]));
    setShowPresets(false);
    toast.success('Section added', { description: `${preset.title} — set its amount to include it in the total.` });
  }

  /** AI prefill is offered, never required — the proposal works fully by hand. */
  function aiPrefill(sectionId: string) {
    toast.info('AI prefill is not enabled yet', {
      description: 'This will draft the section from the takeoff and spec. Write it manually in the meantime.',
    });
  }

  // ── Guardrails before anything leaves the building ────────────────────────
  /**
   * Read from the real material lines rather than a fixed list. The old
   * hard-coded entry could never be cleared, so the review was a dead end no
   * matter what the estimator did about it.
   */
  const materialsRev = useMaterialsRevision();
  const issues: ValidationIssue[] = useMemo(() => validate({
    itemsMissingPrice: missingPriceLines().map((r) => ({
      id: r.id,
      description: r.description,
      code: r.code,
      priceBookRate: priceBookRate(r),
    })),
    requiredQuotes: [
      { system: 'Switchgear', hasQuote: false },
      { system: 'Fire alarm', hasQuote: true },
      { system: 'Lighting', hasQuote: true },
    ],
    includedExpensesWithoutValue: [],
    markup: [
      { label: 'Overhead', value: COMPANY_DEFAULTS.overhead, required: true },
      { label: 'Profit', value: COMPANY_DEFAULTS.profit, required: true },
      { label: 'Contingency', value: COMPANY_DEFAULTS.contingency, required: false },
    ],
    taxRate: COMPANY_DEFAULTS.taxRate,
    taxRegion: 'QC (GST + QST)',
    proposalSections: narrative.map((n) => ({
      title: n.title,
      filled: n.body.trim().length > 0,
      required: n.id !== 've',
    })),
    proposalBreakdownRows: breakdown.filter((b) => b.included).length,
  }), [narrative, breakdown, materialsRev]);

  /**
   * Applies an issue's automatic resolution. Each branch is a real, defensible
   * action — a price book rate, a company baseline — never an invented figure.
   */
  function applyAutoFix(issue: ValidationIssue): boolean {
    const fix = issue.autoFix;
    if (!fix) return false;

    if (fix.kind === 'price-from-book') {
      const ok = applyPriceBook(fix.target);
      if (ok) {
        // Read the snapshot fresh — the price change republished it inside this
        // same handler, so the closed-over value is one revision behind.
        setBreakdown(breakdownFromBid(getBidSnapshot().buckets));
        toast.success('Priced from the price book', { description: issue.message.split(' has no')[0] });
      }
      return ok;
    }

    if (fix.kind === 'exclude-line') {
      const ok = excludeLine(fix.target);
      if (ok) {
        setBreakdown(breakdownFromBid(getBidSnapshot().buckets));
        toast.info('Line excluded from the bid', { description: 'It stays on the takeoff for reference.' });
      }
      return ok;
    }

    if (fix.kind === 'restore-markup-default') {
      const field = MARKUP_FIELDS.find((f) => f.label === fix.target);
      if (!field) return false;
      setCompanyDefault(field.key as MarkupKey, COMPANY_DEFAULTS[field.key]);
      toast.success(`${field.label} restored`, { description: `Back to the company baseline.` });
      return true;
    }

    if (fix.kind === 'restore-tax-default') {
      setCompanyDefault('taxRate', COMPANY_DEFAULTS.taxRate);
      toast.success('Sales tax restored', { description: `${COMPANY_DEFAULTS.taxRate}% company baseline.` });
      return true;
    }

    return false;
  }

  const issueCounts = countBySeverity(issues);
  const guardBlocked = isBlocked(issues);

  function runGuardrails(intent: 'send' | 'export-pdf' | 'export-excel') {
    if (intent === 'send' && selectedRecipients.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }
    setReview({ intent });
  }

  function completeIntent() {
    const intent = review?.intent;
    setReview(null);
    if (intent === 'send') { setShowSend(true); return; }
    if (intent === 'export-pdf') { setPreviewOpen(true); toast.success('Export started', { description: 'A frozen PDF snapshot is being generated.' }); return; }
    if (intent === 'export-excel') { toast.success('Excel export started', { description: 'Proposal breakdown will download as .xlsx.' }); }
  }

  function handleSend() {
    if (selectedRecipients.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }
    setShowSend(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', background: '#F6F7F9' }}>
      <ProjectHeader
        activeTab="Proposal Center"
        onNavigateTab={onNavigateTo}
        onBack={onBack}
        projectStatus={projectStatus}
        onStatusChange={onStatusChange}
      />

      {/* Proposal action bar */}
      <div className="bp-toolbar" style={{ padding: '10px 20px', background: 'white', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: '#6B7280' }}>
          Proposal ID: <strong style={{ color: '#111827', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>PR-2026-0034</strong>
        </span>
        <span className="bp-hide-sm" style={{ width: 1, height: 18, background: '#E5E7EB' }} />
        <span style={{ fontSize: 13, color: '#6B7280' }}>
          Total (Excl. Tax): <strong style={{ color: '#2563EB', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 14 }}>{money(total)}</strong>
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
        <button
          onClick={() => setReview({ intent: 'send' })}
          title="Review the bid guardrails"
          style={{
            height: 24, padding: '0 8px', borderRadius: 9999, cursor: 'pointer',
            border: `1px solid ${guardBlocked ? '#FECACA' : issueCounts.warning > 0 ? '#FDE68A' : '#BBF7D0'}`,
            background: guardBlocked ? '#FEF2F2' : issueCounts.warning > 0 ? '#FFFBEB' : '#F0FDF4',
            color: guardBlocked ? '#B91C1C' : issueCounts.warning > 0 ? '#92400E' : '#16A34A',
            fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {guardBlocked || issueCounts.warning > 0 ? <AlertTriangle size={11} /> : <ShieldCheck size={11} />}
          {guardBlocked
            ? `${issueCounts.blocking} must fix`
            : issueCounts.warning > 0 ? `${issueCounts.warning} to review` : 'Checks passed'}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setEditing((v) => !v); toast.info(editing ? 'Editing finished' : 'Editing enabled', { description: editing ? 'Section content locked.' : 'Section content is now editable.' }); }}
          style={{ height: 34, padding: '0 14px', border: `1px solid ${editing ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 8, background: editing ? '#EFF6FF' : 'white', fontSize: 13, color: editing ? '#1D4ED8' : '#374151', fontWeight: editing ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Pencil size={13} /> {editing ? 'Done' : 'Edit'}
        </button>
        <button
          onClick={() => setPreviewOpen((v) => !v)}
          title="Show the live proposal preview beside the editor"
          style={{ height: 34, padding: '0 12px', border: `1px solid ${previewOpen ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 8, background: previewOpen ? '#EFF6FF' : 'white', fontSize: 13, fontWeight: previewOpen ? 600 : 400, color: previewOpen ? '#1D4ED8' : '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <PanelRight size={13} /> Preview
        </button>
        <button
          onClick={() => runGuardrails('export-pdf')}
          style={{ height: 34, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={13} /> Export PDF
        </button>
        <button
          onClick={() => runGuardrails('export-excel')}
          style={{ height: 34, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FileSpreadsheet size={13} color="#16A34A" /> Export Excel
        </button>
        <button
          onClick={() => runGuardrails('send')}
          style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 8, background: '#2563EB', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Send size={13} /> Send Proposal
        </button>
      </div>

      {/* Body — editor and live preview side by side */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <div className="bp-workspace" style={{ padding: 20 }}>
          {/* Main column */}
          <div className="bp-main">
            {/* 1 — Recipients */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <ChevronDown size={15} color="#9CA3AF" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>1. Proposal Recipients</span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>(Select specific General Contractors)</span>
                <HelpCircle size={13} color="#9CA3AF" />
                <div style={{ flex: 1 }} />
                <button
                  onClick={addRecipient}
                  style={{ height: 32, padding: '0 12px', border: '1px solid #BFDBFE', borderRadius: 8, background: 'white', fontSize: 12, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Plus size={12} /> Add recipient
                </button>
              </div>

              <div className="bp-card-grid">
                {recipients.map((r) => (
                  <label
                    key={r.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: `1px solid ${r.selected ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 10, background: r.selected ? '#FBFDFF' : 'white', cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={() => toggleRecipient(r.id)}
                      style={{ accentColor: '#2563EB', width: 15, height: 15, flexShrink: 0 }}
                    />
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={14} color={r.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.company}</span>
                        {r.primary && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', padding: '1px 6px', borderRadius: 4 }}>Primary</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280', flex: 1, minWidth: 240 }}>
                  <Info size={13} color="#9CA3AF" />
                  A separate proposal will be sent to each selected recipient.
                </div>
                <span style={{ fontSize: 12, color: '#6B7280' }}>Proposal version:</span>
                <select
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  style={{ height: 32, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, background: 'white', outline: 'none', color: '#374151' }}
                >
                  <option>Same for all recipients</option>
                  <option>Separate version per recipient</option>
                  <option>Primary recipient only</option>
                </select>
                <HelpCircle size={13} color="#9CA3AF" />
              </div>
            </div>

            {/* 2–6 — Narrative sections */}
            {narrative.map((sec) => (
              <SectionCard
                key={sec.id}
                index={sec.index}
                title={sec.title}
                blurb={sec.blurb}
                icon={sec.icon}
                editing={editing}
                body={sec.body}
                onBodyChange={(v) => setNarrative((prev) => prev.map((s) => (s.id === sec.id ? { ...s, body: v } : s)))}
                onAiPrefill={() => aiPrefill(sec.id)}
              />
            ))}

            {/* 7 — Proposal breakdown */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>7. Proposal Breakdown</span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>Seeded from the bid · editable</span>
                {matchesBid ? (
                  <span title="This breakdown adds up to the bid" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 9999, whiteSpace: 'nowrap' }}>
                    <ShieldCheck size={11} /> Matches bid
                  </span>
                ) : (
                  <button
                    onClick={resyncWithBid}
                    title={`The bid is ${money(bidTotal)} — click to match it`}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 9999, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <AlertTriangle size={11} color="#D97706" />
                    {variance > 0 ? '+' : '−'}{money(Math.abs(variance))} vs bid · match
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowPresets((v) => !v)}
                    style={{ height: 32, padding: '0 12px', border: '1px solid #BFDBFE', borderRadius: 8, background: 'white', fontSize: 12, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Plus size={12} /> Add Section <ChevronDown size={11} />
                  </button>
                  {showPresets && (
                    <>
                      <div onClick={() => setShowPresets(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                      <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 41, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 230, overflow: 'hidden' }}>
                        <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                          Start from
                        </div>
                        {BREAKDOWN_PRESETS.map((preset) => (
                          <button
                            key={preset.kind}
                            onClick={() => addPreset(preset)}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'white', cursor: 'pointer', borderBottom: '1px solid #F9FAFB' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                          >
                            <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{preset.title}</div>
                            <div style={{ fontSize: 10, color: '#9CA3AF' }}>{preset.kind}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setAllBreakdown(allExpanded)}
                  style={{ height: 32, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}
                >
                  {allExpanded ? 'Collapse all' : 'Expand all'}
                </button>
              </div>

              {breakdown.map((sec, i) => (
                <div key={sec.id} style={{ borderBottom: i < breakdown.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
                    <GripVertical size={14} color="#D1D5DB" style={{ cursor: 'grab', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{sec.index}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', minWidth: 0 }}>{sec.title}</span>
                    {sec.kind && sec.kind !== 'Scope' && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sec.kind}</span>
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{money(sec.amount)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <button onClick={() => moveBreakdown(sec.id, -1)} disabled={i === 0} title="Move up"
                        style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: i === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? 0.25 : 0.6 }}>
                        <ArrowUp size={11} color="#6B7280" />
                      </button>
                      <button onClick={() => moveBreakdown(sec.id, 1)} disabled={i === breakdown.length - 1} title="Move down"
                        style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: i === breakdown.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === breakdown.length - 1 ? 0.25 : 0.6 }}>
                        <ArrowDown size={11} color="#6B7280" />
                      </button>
                      <button onClick={() => duplicateBreakdown(sec.id)} title="Duplicate section"
                        style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                        <Copy size={11} color="#6B7280" />
                      </button>
                      <button onClick={() => removeBreakdown(sec.id)} title="Remove section"
                        style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                        <Trash2 size={11} color="#DC2626" />
                      </button>
                    </div>
                    <button
                      onClick={() => toggleBreakdown(sec.id)}
                      aria-label={sec.collapsed ? `Expand ${sec.title}` : `Collapse ${sec.title}`}
                      style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      {sec.collapsed ? <ChevronDown size={15} color="#9CA3AF" /> : <ChevronDown size={15} color="#6B7280" style={{ transform: 'rotate(180deg)' }} />}
                    </button>
                  </div>
                  {!sec.collapsed && (
                    <div style={{ padding: '0 16px 14px 50px' }}>
                      {editing ? (
                        <>
                          <input
                            value={sec.title}
                            onChange={(e) => updateBreakdown(sec.id, { title: e.target.value })}
                            style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                          />
                          <textarea
                            value={sec.description}
                            onChange={(e) => updateBreakdown(sec.id, { description: e.target.value })}
                            rows={2}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, lineHeight: '18px', color: '#374151', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                          />
                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <label style={{ fontSize: 12, color: '#374151' }}>Amount</label>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6B7280' }}>$</span>
                              <input
                                type="number"
                                value={sec.amount}
                                onChange={(e) => updateBreakdown(sec.id, { amount: parseFloat(e.target.value) || 0 })}
                                style={{ width: 130, height: 30, paddingLeft: 18, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }}
                              />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                              <input type="checkbox" checked={sec.included} onChange={() => updateBreakdown(sec.id, { included: !sec.included })} style={{ accentColor: '#2563EB' }} />
                              Include in total
                            </label>
                            <button
                              onClick={() => removeBreakdown(sec.id)}
                              style={{ height: 28, padding: '0 10px', border: '1px solid #FECACA', borderRadius: 6, background: '#FEF2F2', fontSize: 11, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
                            >
                              <Trash2 size={11} /> Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: '19px' }}>
                          {sec.description}
                          {!sec.included && (
                            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: '#9CA3AF', background: '#F3F4F6', padding: '1px 6px', borderRadius: 4 }}>Excluded from total</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 4px 0', fontSize: 11, color: '#9CA3AF' }}>
              Last updated: May 21, 2026&nbsp;&nbsp;10:42 AM&nbsp;&nbsp;by Sarah Johnson
            </div>
          </div>

          {/* Right rail */}
          <div className="bp-rail" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Client */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Client</div>
              {[
                { icon: <Building2 size={13} color="#9CA3AF" />, value: 'Dollar Tree Stores, Inc.', bold: true },
                { icon: <Mail size={13} color="#9CA3AF" />, value: 'david.chen@dollartree.com' },
                { icon: <Phone size={13} color="#9CA3AF" />, value: '+1 (757) 555-0128' },
              ].map(({ icon, value, bold }) => (
                <div key={value} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 12, color: '#374151', fontWeight: bold ? 600 : 400 }}>
                  <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Proposal settings */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <FileText size={12} color="#9CA3AF" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposal settings</span>
              </div>
              {PROPOSAL_SETTINGS.map(({ label, value }, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', borderBottom: i < PROPOSAL_SETTINGS.length - 1 ? '1px solid #F3F4F6' : 'none', fontSize: 12 }}>
                  <span style={{ color: '#6B7280', flexShrink: 0 }}>{label}</span>
                  <span style={{ color: '#374151', fontWeight: 500, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Export note */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Snowflake size={12} color="#9CA3AF" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposal export</span>
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: '18px' }}>
                A <button onClick={() => toast.info('Frozen snapshot', { description: 'Line items, prices and markups are locked at export so sent proposals never change.' })} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: '#2563EB', cursor: 'pointer' }}>frozen snapshot</button> will be created when this proposal is exported.
              </div>
            </div>

            {/* Total */}
            <div style={{ background: '#111827', borderRadius: 10, padding: 16, color: 'white' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposal total (excl. tax)</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{money(total)}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                {includedSections.length} section{includedSections.length !== 1 ? 's' : ''} included
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Persistent preview drawer */}
        {previewOpen && (
          <div className="bp-preview-dock" style={{ width: 420, minWidth: 420, borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <PdfPreview docked sections={breakdown} status={status} onClose={() => setPreviewOpen(false)} />
          </div>
        )}
      </div>

      <ValidationReview
        open={review !== null}
        title={review?.intent === 'send' ? 'Review before sending' : 'Review before export'}
        actionLabel={review?.intent === 'send' ? 'Send proposal' : review?.intent === 'export-excel' ? 'Export Excel' : 'Export PDF'}
        issues={issues}
        onClose={() => setReview(null)}
        onConfirm={completeIntent}
        onNavigate={onNavigateTo}
        onAutoFix={applyAutoFix}
      />

      {showSend && (
        <SendDialog
          recipients={selectedRecipients}
          total={total}
          onClose={() => setShowSend(false)}
          onSend={() => {
            setStatus('sent');
            setShowSend(false);
            toast.success('Proposal sent', { description: `Sent to ${selectedRecipients.length} recipient${selectedRecipients.length !== 1 ? 's' : ''}.` });
          }}
        />
      )}
    </div>
  );
}
