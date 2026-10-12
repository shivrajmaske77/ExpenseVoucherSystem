import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { fmtDateTime, money } from '../utils.js';

const CARDS = {
  employee: [['Total Vouchers', 'total'], ['Drafts', 'draft'], ['Pending Approval', 'pending'], ['Approved', 'approved'], ['Rejected', 'rejected'], ['Total Amount Claimed', 'total_claimed', true]],
  director: [['Pending Approval', 'pending'], ['Approved Today', 'approved_today'], ['Rejected Today', 'rejected_today'], ['Total Pending Amount', 'pending_amount', true]],
  accounts: [['Total Vouchers', 'total'], ['Pending Approval', 'pending'], ['Approved', 'approved'], ['Rejected', 'rejected'], ['Total Approved Amount', 'approved_amount', true]],
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/dashboard').then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="center">Loading…</p>;

  return (
    <>
      <h2>Welcome, {user.name}</h2>
      <div className="grid">
        {CARDS[user.role].map(([label, key, isMoney]) => (
          <div className="card stat" key={key}>
            <span>{label}</span>
            <strong>{isMoney ? money(data.stats[key]) : data.stats[key]}</strong>
          </div>
        ))}
      </div>

      {data.recent && (
        <section className="card">
          <h3>{user.role === 'accounts' ? 'Recent Approved Vouchers' : 'Recent Voucher Activity'}</h3>
          {data.recent.length === 0 ? <p className="muted">Nothing yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Voucher #</th><th>Employee</th><th>Title</th><th>Amount</th><th>Status</th><th>When</th></tr></thead>
                <tbody>
                  {data.recent.map((v) => (
                    <tr key={v.id}>
                      <td><Link to={`/vouchers/${v.id}`}>{v.voucher_number}</Link></td>
                      <td>{v.employee_name}</td><td>{v.title}</td><td>{money(v.amount)}</td>
                      <td><StatusBadge status={v.status} /></td><td>{fmtDateTime(v.activity_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
