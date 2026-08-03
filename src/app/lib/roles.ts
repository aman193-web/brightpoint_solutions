/**
 * Team roles and the permission surface each one gets.
 *
 * Owner, Admin, Estimator and Viewer are unchanged. Field User is added for
 * crews on site: they consume approved information and pull material lists, but
 * they never touch money.
 *
 * Collaboration controls (who is editing what, right now) are deliberately not
 * implemented — no single-editor lock. `PERMISSIONS` is the seam they will hang
 * off when they are.
 */

export type UserRole = 'owner' | 'admin' | 'estimator' | 'viewer' | 'field';

export const ROLE_ORDER: UserRole[] = ['owner', 'admin', 'estimator', 'viewer', 'field'];

export const ROLE_CFG: Record<UserRole, { label: string; color: string; bg: string; description: string }> = {
  owner:     { label: 'Owner',      color: '#7C3AED', bg: '#F5F3FF', description: 'Full access, billing, can delete account' },
  admin:     { label: 'Admin',      color: '#1D4ED8', bg: '#EFF6FF', description: 'Full access except billing and account deletion' },
  estimator: { label: 'Estimator',  color: '#16A34A', bg: '#F0FDF4', description: 'Create/edit estimates, quotes, and takeoffs' },
  viewer:    { label: 'Viewer',     color: '#6B7280', bg: '#F9FAFB', description: 'Read-only access to all approved content' },
  field:     { label: 'Field User', color: '#D97706', bg: '#FFFBEB', description: 'Site crews — approved info and material lists, no financials' },
};

export type PermissionKey =
  | 'viewApprovedProject' | 'viewDrawings' | 'viewApprovedAssemblies'
  | 'generateMaterialLists' | 'exportMaterialLists' | 'viewSupplierContacts'
  | 'viewEstimates' | 'editEstimates' | 'submitEstimates' | 'sendProposals'
  | 'editBidTotals' | 'editMarkup' | 'editLaborRates' | 'editProposalFinancials'
  | 'companyPricingSettings' | 'manageLibraries' | 'viewReports' | 'manageTeam' | 'billing';

export interface PermissionRow {
  key: PermissionKey;
  label: string;
  group: 'Project & drawings' | 'Material lists' | 'Estimating' | 'Financial' | 'Administration';
  access: Record<UserRole, boolean>;
}

const all = (v: boolean) => ({ owner: v, admin: v, estimator: v, viewer: v, field: v });

/** The permission matrix shown in Settings → Team & Access. */
export const PERMISSIONS: PermissionRow[] = [
  // Project & drawings
  { key: 'viewApprovedProject', label: 'View approved project information', group: 'Project & drawings', access: { ...all(true) } },
  { key: 'viewDrawings', label: 'View drawings', group: 'Project & drawings', access: { ...all(true) } },
  { key: 'viewApprovedAssemblies', label: 'View approved assemblies', group: 'Project & drawings', access: { ...all(true) } },
  { key: 'viewSupplierContacts', label: 'View supplier contacts', group: 'Project & drawings', access: { ...all(true) } },

  // Material lists — the Field User's job
  { key: 'generateMaterialLists', label: 'Generate material lists (Rough / Final / Custom)', group: 'Material lists', access: { owner: true, admin: true, estimator: true, viewer: false, field: true } },
  { key: 'exportMaterialLists', label: 'Export or send material lists to suppliers', group: 'Material lists', access: { owner: true, admin: true, estimator: true, viewer: false, field: true } },

  // Estimating
  { key: 'viewEstimates', label: 'View estimates & proposals', group: 'Estimating', access: { owner: true, admin: true, estimator: true, viewer: true, field: false } },
  { key: 'editEstimates', label: 'Create / edit estimates', group: 'Estimating', access: { owner: true, admin: true, estimator: true, viewer: false, field: false } },
  { key: 'submitEstimates', label: 'Submit / approve estimates', group: 'Estimating', access: { owner: true, admin: true, estimator: false, viewer: false, field: false } },
  { key: 'sendProposals', label: 'Send proposals', group: 'Estimating', access: { owner: true, admin: true, estimator: true, viewer: false, field: false } },
  { key: 'manageLibraries', label: 'Manage libraries', group: 'Estimating', access: { owner: true, admin: true, estimator: false, viewer: false, field: false } },

  // Financial — never the Field User
  { key: 'editBidTotals', label: 'Edit total bid values', group: 'Financial', access: { owner: true, admin: true, estimator: true, viewer: false, field: false } },
  { key: 'editMarkup', label: 'Change profit or markup', group: 'Financial', access: { owner: true, admin: true, estimator: true, viewer: false, field: false } },
  { key: 'editLaborRates', label: 'Change labor rates', group: 'Financial', access: { owner: true, admin: true, estimator: true, viewer: false, field: false } },
  { key: 'editProposalFinancials', label: 'Edit financial proposal details', group: 'Financial', access: { owner: true, admin: true, estimator: true, viewer: false, field: false } },
  { key: 'companyPricingSettings', label: 'Access company-wide pricing settings', group: 'Financial', access: { owner: true, admin: true, estimator: false, viewer: false, field: false } },

  // Administration
  { key: 'viewReports', label: 'View reports', group: 'Administration', access: { owner: true, admin: true, estimator: true, viewer: false, field: false } },
  { key: 'manageTeam', label: 'Manage team', group: 'Administration', access: { owner: true, admin: true, estimator: false, viewer: false, field: false } },
  { key: 'billing', label: 'Billing & plan', group: 'Administration', access: { owner: true, admin: false, estimator: false, viewer: false, field: false } },
];

export const PERMISSION_GROUPS = ['Project & drawings', 'Material lists', 'Estimating', 'Financial', 'Administration'] as const;

export function can(role: UserRole, key: PermissionKey): boolean {
  return PERMISSIONS.find((p) => p.key === key)?.access[role] ?? false;
}

/** What a Field User may and may not do, for the role summary card. */
export const FIELD_USER_SUMMARY = {
  can: [
    'View approved project information',
    'View drawings',
    'View approved assemblies',
    'Generate Rough, Final and custom material lists',
    'Export or send material lists to suppliers',
    'View supplier contacts',
  ],
  cannot: [
    'Edit total bid values',
    'Change profit or markup',
    'Change labor rates',
    'Edit financial proposal details',
    'Access company-wide pricing settings',
  ],
};
