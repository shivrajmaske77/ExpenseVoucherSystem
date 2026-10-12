import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = [{ to: '/', label: 'Dashboard', end: true }];
  if (user.role === 'employee') links.push({ to: '/vouchers', label: 'My Vouchers' }, { to: '/vouchers/new', label: 'Create Voucher' });
  if (user.role === 'director') links.push({ to: '/pending', label: 'Pending Approvals' }, { to: '/vouchers', label: 'All Vouchers' });
  if (user.role === 'accounts') links.push({ to: '/vouchers', label: 'All Vouchers' });

  return (
    <>
      <header className="topbar no-print">
        <strong className="brand">Expense Vouchers</strong>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end || l.to === '/vouchers'}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="user">
          <span>{user.name} <small>({user.role})</small></span>
          <button className="btn btn-sm" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
