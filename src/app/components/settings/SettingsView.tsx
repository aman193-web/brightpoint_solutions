import React, { useState } from 'react';
import {
  Building2, Users, Bell, CreditCard, Lock, Zap,
  Plus, Trash2, Edit3, Check, X, ChevronDown, MoreHorizontal,
  Mail, Shield, Upload, Save, AlertTriangle, Search,
  Briefcase, ShoppingCart, Wrench, UserCheck, User2, Info, Contact, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  MarkupSet, MARKUP_FIELDS, COMPANY_DEFAULTS, setCompanyDefault, CREW_TEMPLATES,
} from '../../lib/costing';
import {
  UserRole, ROLE_CFG, ROLE_ORDER, PERMISSIONS, PERMISSION_GROUPS, FIELD_USER_SUMMARY,
} from '../../lib/roles';
import { PartsLibraryTab } from './PartsLibraryTab';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsTab =
  | 'company' | 'team' | 'contacts' | 'parts'
  | 'labor' | 'markup' | 'notifications' | 'billing';

/** Sub-tabs inside Contacts. Each contact kind is a tab, not a sidebar entry. */
type ContactTab = 'general-contractors' | 'suppliers' | 'vendors' | 'subcontractors' | 'customers';


interface TeamMember {
  id: string; name: string; email: string; role: UserRole;
  status: 'active' | 'pending' | 'suspended'; lastSeen: string; avatar: string;
}

interface Contact {
  id: string; name: string; company: string; email: string; phone: string;
  address?: string; notes?: string; active: boolean;
}

interface GeneralContractor extends Contact {
  licenseNum?: string; bond?: string; proposalRecipient: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const TEAM_MEMBERS: TeamMember[] = [
  { id: 'u1', name: 'Jorge Martinez', email: 'j.martinez@brightpoint.com', role: 'owner', status: 'active', lastSeen: 'Now', avatar: 'JM' },
  { id: 'u2', name: 'Sarah Thompson', email: 's.thompson@brightpoint.com', role: 'admin', status: 'active', lastSeen: '2h ago', avatar: 'ST' },
  { id: 'u3', name: 'David Kim', email: 'd.kim@brightpoint.com', role: 'estimator', status: 'active', lastSeen: 'Yesterday', avatar: 'DK' },
  { id: 'u4', name: 'Marie Leblanc', email: 'm.leblanc@brightpoint.com', role: 'estimator', status: 'active', lastSeen: '3d ago', avatar: 'ML' },
  { id: 'u5', name: 'Alex Chen', email: 'a.chen@brightpoint.com', role: 'viewer', status: 'pending', lastSeen: 'Never', avatar: 'AC' },
  { id: 'u6', name: 'Rick Alvarez', email: 'r.alvarez@brightpoint.com', role: 'field', status: 'active', lastSeen: '20m ago', avatar: 'RA' },
  { id: 'u7', name: 'Tanya Boyd', email: 't.boyd@brightpoint.com', role: 'field', status: 'active', lastSeen: 'Yesterday', avatar: 'TB' },
];

const INITIAL_GCS: GeneralContractor[] = [
  { id: 'gc1', name: 'Mike Patterson', company: 'Summit Commercial Builders', email: 'm.patterson@summitcb.com', phone: '(214) 555-0182', address: '400 Commerce St, Dallas TX', licenseNum: 'TX-GC-88441', bond: '$5M', proposalRecipient: true, active: true },
  { id: 'gc2', name: 'Rachel Torres', company: 'Mirvac Construction', email: 'r.torres@mirvac.com', phone: '(469) 555-0294', address: '1800 Bering Dr, Houston TX', licenseNum: 'TX-GC-77230', bond: '$10M', proposalRecipient: false, active: true },
  { id: 'gc3', name: 'James Liu', company: 'John Holland Group', email: 'j.liu@johnholland.com', phone: '(972) 555-0371', address: '5000 Legacy Dr, Plano TX', licenseNum: 'TX-GC-92110', bond: '$20M', proposalRecipient: true, active: true },
];

const INITIAL_SUPPLIERS: Contact[] = [
  { id: 's1', name: 'Account Manager', company: 'Rexel USA', email: 'sales@rexel.com', phone: '(800) 555-7393', address: '3201 Industrial Blvd, Dallas TX', active: true },
  { id: 's2', name: 'Inside Sales', company: 'Graybar Electric', email: 'dallas@graybar.com', phone: '(214) 555-0490', address: '1600 Stemmons Fwy, Dallas TX', active: true },
  { id: 's3', name: 'Counter Sales', company: 'Anixter', email: 'anixter.dallas@anixter.com', phone: '(972) 555-0581', active: false },
];

const INITIAL_VENDORS: Contact[] = [
  { id: 'v1', name: 'Tom Bradley', company: 'Caterpillar Rental', email: 't.bradley@catrental.com', phone: '(214) 555-0623', active: true },
  { id: 'v2', name: 'Jenny Hall', company: 'Home Depot Pro', email: 'j.hall@hdpro.com', phone: '(214) 555-0744', active: true },
];

const INITIAL_SUBS: Contact[] = [
  { id: 'sb1', name: 'Carlos Vega', company: 'V&G Fire Protection', email: 'carlos@vgfire.com', phone: '(214) 555-0812', active: true, notes: 'Fire alarm & sprinkler' },
  { id: 'sb2', name: 'Dana Park', company: 'Park Data Cabling', email: 'dana@parkdata.com', phone: '(972) 555-0933', active: true, notes: 'Low-voltage, AV, data' },
];

const INITIAL_CUSTOMERS: Contact[] = [
  { id: 'cu1', name: 'Brad Simmons', company: 'Dollar Tree Stores Inc.', email: 'b.simmons@dollartree.com', phone: '(757) 321-5000', active: true },
  { id: 'cu2', name: 'Elena Watts', company: 'RMC Holdings', email: 'e.watts@rmcholdings.com', phone: '(214) 555-1001', active: true },
];


const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#16A34A', bg: '#F0FDF4' },
  pending:   { label: 'Pending',   color: '#D97706', bg: '#FFFBEB' },
  suspended: { label: 'Suspended', color: '#DC2626', bg: '#FEF2F2' },
};

// ─── Sidebar nav ─────────────────────────────────────────────────────────────

/**
 * One flat sidebar. The five contact kinds used to sit here as five separate
 * entries, which made the list long and hid the fact that they are one address
 * book — they are sub-tabs of Contacts now.
 */
const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'company',       label: 'Company',          icon: <Building2 size={14} /> },
  { id: 'team',          label: 'Team & Access',    icon: <Users size={14} /> },
  { id: 'contacts',      label: 'Contacts',         icon: <Contact size={14} /> },
  { id: 'parts',         label: 'Parts Library',    icon: <Package size={14} /> },
  { id: 'labor',         label: 'Labor defaults',   icon: <Zap size={14} /> },
  { id: 'markup',        label: 'Markup & pricing', icon: <CreditCard size={14} /> },
  { id: 'notifications', label: 'Notifications',    icon: <Bell size={14} /> },
  { id: 'billing',       label: 'Billing',          icon: <CreditCard size={14} /> },
];

const CONTACT_TABS: { id: ContactTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general-contractors', label: 'General Contractors', icon: <Briefcase size={14} /> },
  { id: 'suppliers',           label: 'Suppliers',           icon: <ShoppingCart size={14} /> },
  { id: 'vendors',             label: 'Vendors',             icon: <Wrench size={14} /> },
  { id: 'subcontractors',      label: 'Subcontractors',      icon: <UserCheck size={14} /> },
  { id: 'customers',           label: 'Customers',           icon: <User2 size={14} /> },
];

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: on ? '#2563EB' : '#E5E7EB', cursor: 'pointer', position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}
    >
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: on ? 19 : 3, transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827' }}>{title}</div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, lineHeight: '16px' }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Shared contact table ─────────────────────────────────────────────────────

interface ContactRow {
  id: string; name: string; company: string; email: string; phone: string; active: boolean; [key: string]: any;
}

function ContactTable<T extends ContactRow>({
  title,
  contacts,
  onAdd,
  onToggleActive,
  onDelete,
  extraColumns,
  extraCells,
  addLabel = 'Add contact',
}: {
  title: string;
  contacts: T[];
  onAdd: () => void;
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
  extraColumns?: { label: string; key: string }[];
  extraCells?: (row: T) => React.ReactNode;
  addLabel?: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={13} color="#9CA3AF" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1 }} />
        <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 12px', border: 'none', borderRadius: 6, background: '#2563EB', fontSize: 11, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
          <Plus size={11} /> {addLabel}
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {['Name / Company', 'Email', 'Phone', ...(extraColumns?.map(c => c.label) ?? []), 'Status', ''].map(h => (
              <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={10} style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>No records found.</td></tr>
          )}
          {filtered.map(row => (
            <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
              <td style={{ padding: '9px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{row.name}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{row.company}</div>
              </td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: '#374151' }}>{row.email}</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{row.phone}</td>
              {extraCells && extraCells(row)}
              <td style={{ padding: '9px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 9999, color: row.active ? '#16A34A' : '#6B7280', background: row.active ? '#F0FDF4' : '#F3F4F6' }}>
                  {row.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={{ padding: '9px 12px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onToggleActive(row.id)} title={row.active ? 'Deactivate' : 'Activate'} style={{ width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {row.active ? <X size={11} color="#6B7280" /> : <Check size={11} color="#16A34A" />}
                  </button>
                  <button onClick={() => onDelete(row.id)} title="Delete" style={{ width: 26, height: 26, border: '1px solid #FECACA', borderRadius: 5, background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={11} color="#DC2626" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Add-contact modal ────────────────────────────────────────────────────────

function AddContactModal({ title, onClose, onSave, extraFields }: {
  title: string;
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  extraFields?: { id: string; label: string; placeholder?: string }[];
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  function field(id: string, label: string, placeholder?: string) {
    return (
      <div key={id} style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
        <input
          value={form[id] ?? ''}
          onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
          placeholder={placeholder}
          style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
    );
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 420, background: 'white', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>Add {title}</span>
          <button onClick={onClose} style={{ width: 24, height: 24, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} color="#6B7280" /></button>
        </div>
        <div style={{ padding: 16 }}>
          {field('name', 'Contact name', 'Full name')}
          {field('company', 'Company', 'Company name')}
          {field('email', 'Email', 'email@example.com')}
          {field('phone', 'Phone', '(555) 000-0000')}
          {extraFields?.map(f => field(f.id, f.label, f.placeholder))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{ height: 30, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onSave(form)} style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 6, background: '#2563EB', fontSize: 12, fontWeight: 500, color: 'white', cursor: 'pointer' }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── General Contractors tab ──────────────────────────────────────────────────

function GeneralContractorsTab() {
  const [gcs, setGcs] = useState<GeneralContractor[]>(INITIAL_GCS);
  const [showAdd, setShowAdd] = useState(false);

  function toggleActive(id: string) { setGcs(p => p.map(c => c.id === id ? { ...c, active: !c.active } : c)); }
  function del(id: string) { setGcs(p => p.filter(c => c.id !== id)); toast.success('General contractor removed.'); }
  function toggleProposal(id: string) { setGcs(p => p.map(c => c.id === id ? { ...c, proposalRecipient: !c.proposalRecipient } : c)); }

  function handleSave(data: Record<string, string>) {
    const newGC: GeneralContractor = {
      id: `gc-${Date.now()}`, name: data.name || '', company: data.company || '',
      email: data.email || '', phone: data.phone || '', licenseNum: data.licenseNum,
      bond: data.bond, proposalRecipient: false, active: true,
    };
    setGcs(p => [...p, newGC]);
    setShowAdd(false);
    toast.success(`${newGC.company || newGC.name} added.`);
  }

  return (
    <>
      <div style={{ marginBottom: 12, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1D4ED8', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Shield size={13} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>Multiple general contractors can be added per project. When sending a proposal, you will select specific recipients — proposals are not automatically sent to all contacts.</span>
      </div>
      <ContactTable
        title="General Contractors"
        contacts={gcs}
        onAdd={() => setShowAdd(true)}
        onToggleActive={toggleActive}
        onDelete={del}
        addLabel="Add GC"
        extraColumns={[{ label: 'License', key: 'licenseNum' }, { label: 'Proposal recipient', key: 'proposalRecipient' }]}
        extraCells={row => (
          <>
            <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', color: '#6B7280' }}>{(row as GeneralContractor).licenseNum ?? '—'}</td>
            <td style={{ padding: '9px 12px' }}>
              <button
                onClick={() => toggleProposal(row.id)}
                title={`${(row as GeneralContractor).proposalRecipient ? 'Remove from' : 'Add to'} proposal recipients`}
                style={{ display: 'flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', border: `1px solid ${(row as GeneralContractor).proposalRecipient ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 4, background: (row as GeneralContractor).proposalRecipient ? '#EFF6FF' : 'white', cursor: 'pointer', fontSize: 10, color: (row as GeneralContractor).proposalRecipient ? '#1D4ED8' : '#9CA3AF', fontWeight: 500 }}
              >
                {(row as GeneralContractor).proposalRecipient ? <><Check size={9} /> Included</> : 'Not included'}
              </button>
            </td>
          </>
        )}
      />
      {showAdd && (
        <AddContactModal
          title="General Contractor"
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
          extraFields={[
            { id: 'licenseNum', label: 'License number', placeholder: 'TX-GC-00000' },
            { id: 'bond', label: 'Bond amount', placeholder: '$5M' },
          ]}
        />
      )}
    </>
  );
}

// ─── Suppliers tab ────────────────────────────────────────────────────────────

function SuppliersTab() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_SUPPLIERS);
  const [showAdd, setShowAdd] = useState(false);
  function toggleActive(id: string) { setContacts(p => p.map(c => c.id === id ? { ...c, active: !c.active } : c)); }
  function del(id: string) { setContacts(p => p.filter(c => c.id !== id)); toast.success('Supplier removed.'); }
  function handleSave(data: Record<string, string>) {
    setContacts(p => [...p, { id: `s-${Date.now()}`, name: data.name || '', company: data.company || '', email: data.email || '', phone: data.phone || '', active: true }]);
    setShowAdd(false); toast.success('Supplier added.');
  }
  return (
    <>
      <ContactTable title="Suppliers" contacts={contacts} onAdd={() => setShowAdd(true)} onToggleActive={toggleActive} onDelete={del} />
      {showAdd && <AddContactModal title="Supplier" onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </>
  );
}

// ─── Vendors tab ──────────────────────────────────────────────────────────────

function VendorsTab() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_VENDORS);
  const [showAdd, setShowAdd] = useState(false);
  function toggleActive(id: string) { setContacts(p => p.map(c => c.id === id ? { ...c, active: !c.active } : c)); }
  function del(id: string) { setContacts(p => p.filter(c => c.id !== id)); toast.success('Vendor removed.'); }
  function handleSave(data: Record<string, string>) {
    setContacts(p => [...p, { id: `v-${Date.now()}`, name: data.name || '', company: data.company || '', email: data.email || '', phone: data.phone || '', active: true }]);
    setShowAdd(false); toast.success('Vendor added.');
  }
  return (
    <>
      <ContactTable title="Vendors" contacts={contacts} onAdd={() => setShowAdd(true)} onToggleActive={toggleActive} onDelete={del} />
      {showAdd && <AddContactModal title="Vendor" onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </>
  );
}

// ─── Subcontractors tab ───────────────────────────────────────────────────────

function SubcontractorsTab() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_SUBS);
  const [showAdd, setShowAdd] = useState(false);
  function toggleActive(id: string) { setContacts(p => p.map(c => c.id === id ? { ...c, active: !c.active } : c)); }
  function del(id: string) { setContacts(p => p.filter(c => c.id !== id)); toast.success('Subcontractor removed.'); }
  function handleSave(data: Record<string, string>) {
    setContacts(p => [...p, { id: `sb-${Date.now()}`, name: data.name || '', company: data.company || '', email: data.email || '', phone: data.phone || '', active: true, notes: data.scope }]);
    setShowAdd(false); toast.success('Subcontractor added.');
  }
  return (
    <>
      <ContactTable
        title="Subcontractors"
        contacts={contacts}
        onAdd={() => setShowAdd(true)}
        onToggleActive={toggleActive}
        onDelete={del}
        extraColumns={[{ label: 'Scope', key: 'notes' }]}
        extraCells={row => (
          <td style={{ padding: '9px 12px', fontSize: 11, color: '#6B7280' }}>{row.notes ?? '—'}</td>
        )}
      />
      {showAdd && (
        <AddContactModal
          title="Subcontractor"
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
          extraFields={[{ id: 'scope', label: 'Scope of work', placeholder: 'e.g. Fire alarm, AV, plumbing…' }]}
        />
      )}
    </>
  );
}

// ─── Customers tab ────────────────────────────────────────────────────────────

function CustomersTab() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CUSTOMERS);
  const [showAdd, setShowAdd] = useState(false);
  function toggleActive(id: string) { setContacts(p => p.map(c => c.id === id ? { ...c, active: !c.active } : c)); }
  function del(id: string) { setContacts(p => p.filter(c => c.id !== id)); toast.success('Customer removed.'); }
  function handleSave(data: Record<string, string>) {
    setContacts(p => [...p, { id: `cu-${Date.now()}`, name: data.name || '', company: data.company || '', email: data.email || '', phone: data.phone || '', active: true }]);
    setShowAdd(false); toast.success('Customer added.');
  }
  return (
    <>
      <ContactTable title="Customers" contacts={contacts} onAdd={() => setShowAdd(true)} onToggleActive={toggleActive} onDelete={del} />
      {showAdd && <AddContactModal title="Customer" onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </>
  );
}

// ─── Company tab ──────────────────────────────────────────────────────────────

function CompanyTab() {
  return (
    <>
      <SectionCard title="Company profile">
        <FieldRow label="Company name">
          <input defaultValue="Brightpoint Electrical" style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </FieldRow>
        <FieldRow label="Legal name">
          <input defaultValue="Brightpoint Electrical Inc." style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </FieldRow>
        <FieldRow label="License #">
          <input defaultValue="TX-EC-82027" style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
        </FieldRow>
        <FieldRow label="Address">
          <input defaultValue="456 Industrial Pkwy, Suite 200, Dallas, TX 75201" style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </FieldRow>
        <FieldRow label="Phone">
          <input defaultValue="+1 (214) 555-0188" style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </FieldRow>
        <FieldRow label="Tax numbers" hint="Displayed on quotes and invoices">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input defaultValue="EIN 82-0012345" placeholder="EIN" style={{ height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }} />
            <input defaultValue="TX Sales Tax 1-22-3456789" placeholder="State tax ID" style={{ height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }} />
          </div>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Branding">
        <FieldRow label="Company logo" hint="Appears on quotes, proposals, and reports. PNG or SVG, min 200×200px.">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 10, background: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>BE</div>
            <div>
              <button style={{ height: 32, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Upload size={12} /> Upload logo
              </button>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Max 2MB</div>
            </div>
          </div>
        </FieldRow>
        <FieldRow label="Brand color" hint="Used as accent on quotes and proposals">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: 6, background: '#2563EB', border: '1px solid #E5E7EB', cursor: 'pointer' }} />
            <input defaultValue="#2563EB" style={{ width: 100, height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }} />
          </div>
        </FieldRow>
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button style={{ height: 34, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>Discard changes</button>
        <button style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Save size={13} /> Save changes
        </button>
      </div>
    </>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

function TeamTab() {
  const [members, setMembers] = useState(TEAM_MEMBERS);
  const [searchQ, setSearchQ] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('estimator');

  const filtered = members.filter((m) => m.name.toLowerCase().includes(searchQ.toLowerCase()) || m.email.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <>
      <div style={{ marginBottom: 16, padding: 14, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Invite team member</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Mail size={13} color="#9CA3AF" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" style={{ width: '100%', height: 34, paddingLeft: 30, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} style={{ height: 34, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, background: 'white', outline: 'none' }}>
            {(['admin', 'estimator', 'viewer'] as UserRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_CFG[r].label}</option>
            ))}
          </select>
          <button style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 12, fontWeight: 500, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={13} /> Send invite
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#6B7280' }}>
          They will receive an email invitation to join your Brightpoint workspace.
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={13} color="#9CA3AF" />
          <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search members…" style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1 }} />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{filtered.length} member{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Member', 'Role', 'Status', 'Last active', ''].map((h) => (
                <th key={h} style={{ padding: '7px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const role = ROLE_CFG[member.role];
              const status = STATUS_CFG[member.status];
              return (
                <tr key={member.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: role.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: role.color, flexShrink: 0 }}>
                        {member.avatar}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{member.name}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select defaultValue={member.role} style={{ height: 26, padding: '0 6px', border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 11, background: role.bg, color: role.color, fontWeight: 500, outline: 'none', cursor: member.role === 'owner' ? 'not-allowed' : 'pointer' }} disabled={member.role === 'owner'}>
                      {Object.entries(ROLE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 9999, color: status.color, background: status.bg }}>{status.label}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{member.lastSeen}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {member.role !== 'owner' && (
                      <button style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MoreHorizontal size={13} color="#6B7280" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Field User summary — the role most likely to be misconfigured */}
      <div style={{ marginTop: 16, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_CFG.field.color, background: ROLE_CFG.field.bg, padding: '2px 8px', borderRadius: 9999 }}>
            {ROLE_CFG.field.label}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', flex: 1 }}>Restricted site access</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{ROLE_CFG.field.description}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 0 }}>
          <div style={{ padding: 14, borderRight: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Can</div>
            {FIELD_USER_SUMMARY.can.map((c) => (
              <div key={c} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 6 }}>
                <Check size={12} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: '#374151', lineHeight: '17px' }}>{c}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Cannot</div>
            {FIELD_USER_SUMMARY.cannot.map((c) => (
              <div key={c} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 6 }}>
                <X size={12} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: '#374151', lineHeight: '17px' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions matrix — grouped, all five roles */}
      <div style={{ marginTop: 16, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', flex: 1 }}>Permissions matrix</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Collaboration controls are not enabled — no single-editor lock</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', minWidth: 260 }}>Permission</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: ROLE_CFG[r].color, width: 92 }}>{ROLE_CFG[r].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <React.Fragment key={group}>
                  <tr>
                    <td colSpan={ROLE_ORDER.length + 1} style={{ padding: '6px 14px', background: '#FAFAFA', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #F3F4F6' }}>
                      {group}
                    </td>
                  </tr>
                  {PERMISSIONS.filter((p) => p.group === group).map((p) => (
                    <tr key={p.key} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '7px 14px', fontSize: 12, color: '#374151' }}>{p.label}</td>
                      {ROLE_ORDER.map((r) => (
                        <td key={r} style={{ padding: '7px 10px', textAlign: 'center' }}>
                          {p.access[r]
                            ? <Check size={14} color="#16A34A" style={{ display: 'inline' }} />
                            : <X size={14} color="#E5E7EB" style={{ display: 'inline' }} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Labor defaults tab ───────────────────────────────────────────────────────

function LaborTab() {
  return (
    <>
      <SectionCard title="Labor rates">
        <FieldRow label="Default state" hint="Determines default labor rates and burden factors">
          <select defaultValue="TX" style={{ height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, background: 'white', outline: 'none' }}>
            <option value="TX">TX — Texas</option>
            <option value="CA">CA — California</option>
            <option value="FL">FL — Florida</option>
            <option value="NY">NY — New York</option>
            <option value="IL">IL — Illinois</option>
          </select>
        </FieldRow>
        {[
          { label: 'Journeyman (L2)', rate: '85.00' },
          { label: 'Apprentice (L3)', rate: '52.00' },
          { label: 'Foreman', rate: '98.00' },
          { label: 'General foreman', rate: '108.00' },
        ].map(({ label, rate }) => (
          <FieldRow key={label} label={label}>
            <div style={{ position: 'relative', width: 140 }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6B7280' }}>$</span>
              <input defaultValue={rate} style={{ width: '100%', height: 34, paddingLeft: 18, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF' }}>/hr</span>
            </div>
          </FieldRow>
        ))}
      </SectionCard>

      <SectionCard title="Labor burden & overheads">
        {[
          { label: 'Foreman allowance', hint: '% of labor hours added for site supervision', value: '10' },
          { label: 'Small tools allowance', hint: '% of labor cost for tools & consumables', value: '3' },
          { label: 'PPE allowance', hint: 'Per-person daily allowance (USD)', value: '12' },
        ].map(({ label, hint, value }) => (
          <FieldRow key={label} label={label} hint={hint}>
            <div style={{ position: 'relative', width: 120 }}>
              <input defaultValue={value} style={{ width: '100%', height: 34, padding: '0 24px 0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF' }}>%</span>
            </div>
          </FieldRow>
        ))}
      </SectionCard>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: '#2563EB', fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Save size={13} /> Save changes
        </button>
      </div>
    </>
  );
}

// ─── Markup tab ───────────────────────────────────────────────────────────────

function MarkupTab() {
  // Local mirror of the company defaults so the inputs are editable, then
  // pushed into the shared module on save — that is what new bids inherit.
  const [draft, setDraft] = useState<MarkupSet>({ ...COMPANY_DEFAULTS });
  const dirty = MARKUP_FIELDS.some((f) => draft[f.key] !== COMPANY_DEFAULTS[f.key]);

  function save() {
    MARKUP_FIELDS.forEach((f) => setCompanyDefault(f.key, draft[f.key]));
    toast.success('Company defaults saved', { description: 'New bids will inherit these values.' });
  }

  return (
    <>
      <SectionCard title="Default markup">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, marginBottom: 16 }}>
          <Info size={13} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#1D4ED8', lineHeight: '17px' }}>
            These values auto-populate every new bid. Estimators can override them per project, and the
            Bid Builder shows which values are still inherited from here.
          </span>
        </div>

        {MARKUP_FIELDS.map((f) => (
          <FieldRow key={f.key} label={f.label} hint={f.hint}>
            <div style={{ position: 'relative', width: 120 }}>
              <input
                type="number"
                step="0.01"
                value={draft[f.key]}
                onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                style={{ width: '100%', height: 34, padding: '0 24px 0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF' }}>%</span>
            </div>
          </FieldRow>
        ))}

        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12, fontSize: 11, color: '#9CA3AF', lineHeight: '17px' }}>
          Material and labor markup apply to their own bucket before overhead. Overhead and contingency
          apply to raw cost including tax; profit applies after overhead. Section-level markup beyond
          material and labor is not required — the layout leaves room for it later.
        </div>
      </SectionCard>

      <SectionCard title="Tax defaults">
        <FieldRow label="Default tax region" hint="Sets the sales tax rate above when changed">
          <select
            defaultValue="QC"
            onChange={(e) => {
              const rates: Record<string, number> = { QC: 14.975, TX: 8.25, CA: 7.25, FL: 6, NY: 4 };
              const rate = rates[e.target.value];
              if (rate != null) setDraft((prev) => ({ ...prev, taxRate: rate }));
            }}
            style={{ height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, background: 'white', outline: 'none' }}
          >
            <option value="QC">QC — GST + QST 14.975%</option>
            <option value="TX">TX — Sales tax 8.25%</option>
            <option value="CA">CA — Sales tax 7.25%</option>
            <option value="FL">FL — Sales tax 6.0%</option>
            <option value="NY">NY — Sales tax 4.0% + local</option>
          </select>
        </FieldRow>
        <FieldRow label="Taxable buckets">
          <div style={{ fontSize: 13, color: '#374151', lineHeight: '20px' }}>
            Material and supplier quotes. Labor and subcontracted work are not taxed.
          </div>
        </FieldRow>
        <FieldRow label="Tax-exempt by default">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="taxExempt" style={{ accentColor: '#2563EB' }} />
            <label htmlFor="taxExempt" style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>Mark new projects as tax-exempt unless overridden</label>
          </div>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Crew templates">
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
          Crew mixes an estimator can apply in the Bid Builder's Labor section. Allocation must total 100%.
        </div>
        {CREW_TEMPLATES.map((t) => {
          const total = t.rows.reduce((sum, r) => sum + r.allocation, 0);
          return (
            <div key={t.id} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>{t.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: total === 100 ? '#16A34A' : '#DC2626', background: total === 100 ? '#F0FDF4' : '#FEF2F2', padding: '2px 7px', borderRadius: 9999 }}>
                  {total}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {t.rows.map((r) => (
                  <span key={r.role} style={{ fontSize: 11, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '2px 8px', borderRadius: 9999 }}>
                    {r.role} {r.allocation}% · ${r.hourlyCost}/hr
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        {dirty && <span style={{ fontSize: 12, color: '#D97706' }}>Unsaved changes</span>}
        <button
          onClick={save}
          disabled={!dirty}
          style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: dirty ? '#2563EB' : '#9CA3AF', fontSize: 13, fontWeight: 500, color: 'white', cursor: dirty ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Save size={13} /> Save changes
        </button>
      </div>
    </>
  );
}

// ─── Notifications tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    estimateApproval: true, quoteViewed: true, quoteAccepted: true,
    aiSuggestions: false, pricingStale: true, teamMention: true,
    weeklyDigest: true, mobileApp: false,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <SectionCard title="Notification preferences">
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 14 }}>Notifications are sent to <strong>j.martinez@brightpoint.com</strong></div>
      {[
        { key: 'estimateApproval', label: 'Estimate approvals', hint: 'When an estimate is approved or returned' },
        { key: 'quoteViewed', label: 'Quote viewed', hint: 'When a client opens a quote link' },
        { key: 'quoteAccepted', label: 'Quote accepted / declined', hint: 'When a client responds to a quote' },
        { key: 'aiSuggestions', label: 'AI suggestions', hint: 'When AI finds items to add or review in your estimate' },
        { key: 'pricingStale', label: 'Stale pricing alerts', hint: 'When material prices are older than 90 days' },
        { key: 'teamMention', label: 'Team @mentions', hint: 'When someone mentions you in a comment' },
        { key: 'weeklyDigest', label: 'Weekly digest', hint: 'Summary of project activity every Monday' },
        { key: 'mobileApp', label: 'Mobile push notifications', hint: 'Push alerts to the Brightpoint mobile app' },
      ].map(({ key, label, hint }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{hint}</div>
          </div>
          <Toggle on={prefs[key as keyof typeof prefs]} onChange={() => toggle(key as keyof typeof prefs)} />
        </div>
      ))}
    </SectionCard>
  );
}

// ─── Billing tab ──────────────────────────────────────────────────────────────

function BillingTab() {
  return (
    <>
      <SectionCard title="Current plan">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Professional</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>Active</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: '18px' }}>5 users · Unlimited projects · AI features included · Priority support</div>
            <div style={{ marginTop: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 700, color: '#111827' }}>$199 <span style={{ fontSize: 14, fontWeight: 400, color: '#9CA3AF' }}>/mo USD</span></div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Next billing: 2026-08-01</div>
          </div>
          <button style={{ height: 32, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 7, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            Change plan
          </button>
        </div>
      </SectionCard>
      <SectionCard title="Payment method">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 48, height: 28, borderRadius: 4, background: '#1A1F71', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>VISA</div>
          <div>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>•••• •••• •••• 4242</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>Expires 09/28</div>
          </div>
          <button style={{ marginLeft: 'auto', height: 28, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer' }}>Update</button>
        </div>
      </SectionCard>
    </>
  );
}

// ─── Integrations tab ─────────────────────────────────────────────────────────

function ContactsTab() {
  const [sub, setSub] = useState<ContactTab>('general-contractors');

  function body() {
    switch (sub) {
      case 'general-contractors': return <GeneralContractorsTab />;
      case 'suppliers':           return <SuppliersTab />;
      case 'vendors':             return <VendorsTab />;
      case 'subcontractors':      return <SubcontractorsTab />;
      case 'customers':           return <CustomersTab />;
    }
  }

  return (
    <>
      <div className="bp-scroll-x" style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #E5E7EB', marginBottom: 18 }}>
        {CONTACT_TABS.map((t) => {
          const active = t.id === sub;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
                height: 40, padding: '0 16px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#2563EB' : '#6B7280',
                borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
              }}
            >
              <span style={{ color: active ? '#2563EB' : '#9CA3AF', display: 'flex' }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
      {body()}
    </>
  );
}

export function SettingsView({ initialTab }: { initialTab?: SettingsTab }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? 'company');

  function renderTab() {
    switch (activeTab) {
      case 'company':       return <CompanyTab />;
      case 'team':          return <TeamTab />;
      case 'contacts':      return <ContactsTab />;
      case 'parts':         return <PartsLibraryTab />;
      case 'labor':         return <LaborTab />;
      case 'markup':        return <MarkupTab />;
      case 'notifications': return <NotificationsTab />;
      case 'billing':       return <BillingTab />;
    }
  }

  const TAB_TITLES: Record<SettingsTab, string> = {
    company: 'Company', team: 'Team & Access', contacts: 'Contacts',
    parts: 'Parts Library', labor: 'Labor defaults', markup: 'Markup & pricing',
    notifications: 'Notifications', billing: 'Billing',
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', background: '#F6F7F9' }}>
      {/* Sidebar */}
      <div style={{ width: 220, minWidth: 220, background: 'white', borderRight: '1px solid #E5E7EB', overflowY: 'auto', paddingTop: 8 }}>
        <div style={{ padding: '10px 14px 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Settings</div>
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 9,
              background: activeTab === t.id ? '#EFF6FF' : 'transparent',
              color: activeTab === t.id ? '#1D4ED8' : '#374151',
              borderRight: activeTab === t.id ? '2px solid #2563EB' : '2px solid transparent',
            }}
          >
            <span style={{ color: activeTab === t.id ? '#2563EB' : '#9CA3AF', display: 'flex' }}>{t.icon}</span>
            <span style={{ fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 18 }}>{TAB_TITLES[activeTab]}</div>
        {renderTab()}
      </div>
    </div>
  );
}
