export const STATUS_LABEL = {
  draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved', rejected: 'Rejected',
};
export const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Software', 'Training', 'Other'];
export const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'Marketing', 'Operations', 'Sales'];
export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
