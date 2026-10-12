import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { fmtDate, fmtDateTime, money } from '../utils.js';

const Field = ({ label, children }) => (<div className="field"><span>{label}</span><div>{children || '—'}</div></div>);

export default function VoucherDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [sigFile, setSigFile] = useState(null);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => api('/vouchers/' + id).then(setV).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  const run = async (fn) => {
    setBusy(true); setActionError('');
    try { await fn(); await load(); } catch (e) { setActionError(Object.values(e.details || {})[0] || e.message); } finally { setBusy(false); }
  };

  const submit = () => run(() => api(`/vouchers/${id}/submit`, { method: 'POST' }));
  const remove = async () => {
    if (!confirm('Delete this draft voucher?')) return;
    setBusy(true);
    try { await api('/vouchers/' + id, { method: 'DELETE' }); navigate('/vouchers'); } catch (e) { setActionError(e.message); setBusy(false); }
  };
  const approve = () => run(async () => {
    const fd = new FormData();
    if (sigFile) fd.append('signature', sigFile);
    await api(`/vouchers/${id}/approve`, { method: 'POST', form: fd });
    setSigFile(null);
  });
  const reject = () => {
    if (!reason.trim()) return setActionError('Rejection reason is required');
    run(async () => { await api(`/vouchers/${id}/reject`, { method: 'POST', body: { reason } }); setRejecting(false); });
  };

  if (error) return <p className="error">{error}</p>;
  if (!v) return <p className="center">Loading…</p>;

  const isOwnerDraft = user.role === 'employee' && v.status === 'draft';
  const canDecide = user.role === 'director' && v.status === 'pending_approval';

  return (
    <>
      <div className="row between no-print">
        <Link to="/vouchers">← Back</Link>
        <button className="btn" onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      <article className="card voucher">
        <div className="row between">
          <h2>Voucher {v.voucher_number}</h2>
          <StatusBadge status={v.status} />
        </div>

        {v.status === 'rejected' && (
          <div className="alert"><strong>Rejected by {v.director_name}:</strong> {v.rejection_reason}</div>
        )}

        <h3>Basic Information</h3>
        <div className="form-grid">
          <Field label="Voucher Number">{v.voucher_number}</Field>
          <Field label="Voucher Date">{fmtDate(v.voucher_date)}</Field>
          <Field label="Expense Date">{fmtDate(v.expense_date)}</Field>
          <Field label="Department">{v.department}</Field>
          <Field label="Expense Title">{v.title}</Field>
          <Field label="Category">{v.category}</Field>
          <Field label="Amount"><strong>{money(v.amount)}</strong></Field>
        </div>
        <Field label="Description">{v.description}</Field>

        <h3>Employee</h3>
        <div className="form-grid">
          <Field label="Name">{v.employee_name}</Field>
          <Field label="Employee ID">{v.employee_code}</Field>
          <Field label="Signature">{v.employee_signature_path && <img className="sig" src={v.employee_signature_path} alt="Employee signature" />}</Field>
        </div>

        <h3>Approval</h3>
        <div className="form-grid">
          <Field label="Status"><StatusBadge status={v.status} /></Field>
          <Field label="Director">{v.director_name}</Field>
          <Field label="Approval Date">{fmtDateTime(v.approval_date)}</Field>
          <Field label="Director Signature">{v.director_signature_path && <img className="sig" src={v.director_signature_path} alt="Director signature" />}</Field>
        </div>

        <h3>Audit</h3>
        <div className="form-grid">
          <Field label="Created">{fmtDateTime(v.created_at)}</Field>
          <Field label="Last Updated">{fmtDateTime(v.updated_at)}</Field>
          <Field label="Submitted">{fmtDateTime(v.submitted_at)}</Field>
        </div>
      </article>

      {actionError && <p className="error">{actionError}</p>}

      {isOwnerDraft && (
        <div className="row no-print">
          <Link className="btn" to={`/vouchers/${id}/edit`}>Edit</Link>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>Submit for Approval</button>
          <button className="btn btn-danger" disabled={busy} onClick={remove}>Delete</button>
        </div>
      )}

      {canDecide && (
        <section className="card no-print">
          <h3>Director Decision</h3>
          <label>Your signature * (upload, or leave empty to use your saved signature)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setSigFile(e.target.files[0] || null)} />
          </label>
          {sigFile && <img className="sig" src={URL.createObjectURL(sigFile)} alt="Signature preview" />}
          {rejecting && (
            <label>Rejection reason *
              <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          )}
          <div className="row">
            <button className="btn btn-primary" disabled={busy} onClick={approve}>Approve</button>
            {!rejecting
              ? <button className="btn btn-danger" onClick={() => setRejecting(true)}>Reject…</button>
              : <><button className="btn btn-danger" disabled={busy} onClick={reject}>Confirm Reject</button>
                  <button className="btn" onClick={() => { setRejecting(false); setReason(''); }}>Cancel</button></>}
          </div>
        </section>
      )}
    </>
  );
}
