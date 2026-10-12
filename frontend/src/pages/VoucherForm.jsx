import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { CATEGORIES, DEPARTMENTS, isoDate } from '../utils.js';

const blank = { department: '', title: '', expense_date: '', category: '', description: '', amount: '' };

export default function VoucherForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [existingSig, setExistingSig] = useState(user.signature_path);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api('/vouchers/' + id).then((v) => {
      if (v.status !== 'draft') return navigate('/vouchers/' + id, { replace: true });
      setForm({ department: v.department, title: v.title, expense_date: isoDate(v.expense_date), category: v.category || '', description: v.description || '', amount: v.amount });
      setExistingSig(v.employee_signature_path);
    }).catch((e) => setServerError(e.message));
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = (forSubmit) => {
    const e = {};
    if (!form.department.trim()) e.department = 'Department is required';
    if (!form.title.trim()) e.title = 'Expense title is required';
    if (!form.expense_date) e.expense_date = 'Expense date is required';
    if (form.amount === '') e.amount = 'Amount is required';
    else if (Number(form.amount) <= 0) e.amount = 'Amount must be greater than zero';
    if (forSubmit && !file && !existingSig) e.signature = 'Employee signature is required before submission';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (submit) => {
    if (!validate(submit)) return;
    setBusy(true); setServerError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('signature', file);
      const saved = await api(id ? '/vouchers/' + id : '/vouchers', { method: id ? 'PUT' : 'POST', form: fd });
      if (submit) await api(`/vouchers/${saved.id}/submit`, { method: 'POST' });
      navigate('/vouchers/' + saved.id);
    } catch (err) {
      setServerError(err.message); setErrors(err.details || {});
    } finally { setBusy(false); }
  };

  const preview = file ? URL.createObjectURL(file) : existingSig;

  return (
    <>
      <h2>{id ? 'Edit Draft Voucher' : 'Create Voucher'}</h2>
      <form className="card form" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="form-grid">
          <label>Department *
            <input list="depts" value={form.department} onChange={set('department')} />
            <datalist id="depts">{DEPARTMENTS.map((d) => <option key={d} value={d} />)}</datalist>
            {errors.department && <span className="error">{errors.department}</span>}
          </label>
          <label>Expense Category
            <select value={form.category} onChange={set('category')}>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Expense Title *
            <input value={form.title} onChange={set('title')} maxLength={200} />
            {errors.title && <span className="error">{errors.title}</span>}
          </label>
          <label>Expense Date *
            <input type="date" value={form.expense_date} max={new Date().toISOString().slice(0, 10)} onChange={set('expense_date')} />
            {errors.expense_date && <span className="error">{errors.expense_date}</span>}
          </label>
          <label>Amount (₹) *
            <input type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} />
            {errors.amount && <span className="error">{errors.amount}</span>}
          </label>
          <label>Employee ID
            <input value={user.employee_code || ''} disabled />
          </label>
        </div>
        <label>Expense Description
          <textarea rows="4" value={form.description} onChange={set('description')} />
        </label>

        <div className="sig-box">
          <label>Employee Signature * (PNG/JPG/WEBP, max 2 MB)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          {errors.signature && <span className="error">{errors.signature}</span>}
          {preview && <img className="sig" src={preview} alt="Signature preview" />}
          {!file && existingSig && <small className="muted">Using your saved signature. Upload a file to replace it.</small>}
        </div>

        {serverError && <p className="error">{serverError}</p>}
        <div className="row">
          <button className="btn" disabled={busy} onClick={() => save(false)}>Save as Draft</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => save(true)}>Save &amp; Submit for Approval</button>
          <button className="btn" type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </>
  );
}
