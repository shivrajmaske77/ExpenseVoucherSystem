import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VoucherList from './pages/VoucherList.jsx';
import VoucherForm from './pages/VoucherForm.jsx';
import VoucherDetail from './pages/VoucherDetail.jsx';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  const listTitle = user?.role === 'employee' ? 'My Vouchers' : 'All Vouchers';
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/vouchers" element={<Protected><VoucherList title={listTitle} /></Protected>} />
      <Route path="/pending" element={<Protected roles={['director']}><VoucherList title="Pending Approvals" fixedStatus="pending_approval" /></Protected>} />
      <Route path="/vouchers/new" element={<Protected roles={['employee']}><VoucherForm /></Protected>} />
      <Route path="/vouchers/:id/edit" element={<Protected roles={['employee']}><VoucherForm /></Protected>} />
      <Route path="/vouchers/:id" element={<Protected><VoucherDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
