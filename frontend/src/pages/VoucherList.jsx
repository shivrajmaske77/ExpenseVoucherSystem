import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { CATEGORIES, STATUS_LABEL, fmtDate, money } from '../utils.js';

const EMPTY = { q: '', status: '', department: '', category: '', from: '', to: '', minAmount: '', maxAmount: '', sort: 'created_at', order: 'desc' };

export default function VoucherList({ title, fixedStatus }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setForm(EMPTY); setApplied(EMPTY); setPage(1); }, [fixedStatus]);

  useEffect(() => {
    const params = new URLSearchParams({ page, limit: 10 });
    Object.entries(applied).forEach(([k, v]) => v && params.set(k, v));
    if (fixedStatus) params.set('status', fixedStatus);
    api('/vouchers?' + params).then((d) => { setResult(d); setError(''); }).catch((e) => setError(e.message));
  }, [applied, page, fixedStatus]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const apply = (e) => { e.preventDefault(); setPage(1); setApplied(form); };
  const reset = () => { setForm(EMPTY); setApplied(EMPTY); setPage(1); };
  const sortBy = (col) => {
    const order = applied.sort === col && applied.order === 'asc' ? 'desc' : 'asc';
    setForm({ ...form, sort: col, order }); setApplied({ ...applied, sort: col, order }); setPage(1);
  };
  const arrow = (col) => (applied.sort === col ? (applied.order === 'asc' ? ' ▲' : ' ▼') : '');
  const isEmp = user.role === 'employee';

  return (
    <>
      <div className="row between">
        <h2>{title}</h2>
        {isEmp && <Link className="btn btn-primary" to="/vouchers/new">+ New Voucher</Link>}
      </div>

      <form className="card filters" onSubmit={apply}>
        <input placeholder={isEmp ? 'Search voucher no. / title' : 'Search voucher no. / employee / title'} value={form.q} onChange={set('q')} />
        {!fixedStatus && (
          <select value={form.status} onChange={set('status')}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).filter(([k]) => isEmp || k !== 'draft').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <input placeholder="Department" value={form.department} onChange={set('department')} />
        <select value={form.category} onChange={set('category')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label>From<input type="date" value={form.from} onChange={set('from')} /></label>
        <label>To<input type="date" value={form.to} onChange={set('to')} /></label>
        <input type="number" min="0" placeholder="Min amount" value={form.minAmount} onChange={set('minAmount')} />
        <input type="number" min="0" placeholder="Max amount" value={form.maxAmount} onChange={set('maxAmount')} />
        <div className="row">
          <button className="btn btn-primary">Apply</button>
          <button type="button" className="btn" onClick={reset}>Reset</button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {!result ? <p className="center">Loading…</p> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => sortBy('voucher_number')}>Voucher #{arrow('voucher_number')}</th>
                  {!isEmp && <th className="sortable" onClick={() => sortBy('employee_name')}>Employee{arrow('employee_name')}</th>}
                  <th>Title</th><th>Department</th><th>Category</th>
                  <th className="sortable" onClick={() => sortBy('expense_date')}>Expense Date{arrow('expense_date')}</th>
                  <th className="sortable" onClick={() => sortBy('amount')}>Amount{arrow('amount')}</th>
                  <th className="sortable" onClick={() => sortBy('status')}>Status{arrow('status')}</th>
                </tr>
              </thead>
              <tbody>
                {result.data.length === 0 && <tr><td colSpan="8" className="muted center">No vouchers found.</td></tr>}
                {result.data.map((v) => (
                  <tr key={v.id}>
                    <td><Link to={`/vouchers/${v.id}`}>{v.voucher_number}</Link></td>
                    {!isEmp && <td>{v.employee_name}</td>}
                    <td>{v.title}</td><td>{v.department}</td><td>{v.category || '—'}</td>
                    <td>{fmtDate(v.expense_date)}</td><td>{money(v.amount)}</td>
                    <td><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row between pager">
            <span className="muted">{result.total} voucher(s)</span>
            <div className="row">
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span>Page {result.page} / {Math.max(1, result.pages)}</span>
              <button className="btn btn-sm" disabled={page >= result.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
