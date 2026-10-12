const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const RECENT = `SELECT v.id, v.voucher_number, v.title, v.amount, v.status, e.name AS employee_name,
  COALESCE(v.decided_at, v.submitted_at) AS activity_at
  FROM vouchers v JOIN users e ON e.id = v.employee_id`;

router.get('/', h(async (req, res) => {
  const { role, id } = req.user;

  if (role === 'employee') {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status='draft')::int AS draft,
         COUNT(*) FILTER (WHERE status='pending_approval')::int AS pending,
         COUNT(*) FILTER (WHERE status='approved')::int AS approved,
         COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
         COALESCE(SUM(amount) FILTER (WHERE status <> 'draft'),0)::float8 AS total_claimed
       FROM vouchers WHERE employee_id = $1`, [id]);
    return res.json({ role, stats: rows[0] });
  }

  if (role === 'director') {
    const { rows } = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status='pending_approval')::int AS pending,
         COUNT(*) FILTER (WHERE status='approved' AND decided_at::date = CURRENT_DATE)::int AS approved_today,
         COUNT(*) FILTER (WHERE status='rejected' AND decided_at::date = CURRENT_DATE)::int AS rejected_today,
         COALESCE(SUM(amount) FILTER (WHERE status='pending_approval'),0)::float8 AS pending_amount
       FROM vouchers`);
    const recent = await db.query(`${RECENT} WHERE v.status <> 'draft' ORDER BY activity_at DESC LIMIT 8`);
    return res.json({ role, stats: rows[0], recent: recent.rows });
  }

  // accounts
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status='pending_approval')::int AS pending,
       COUNT(*) FILTER (WHERE status='approved')::int AS approved,
       COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
       COALESCE(SUM(amount) FILTER (WHERE status='approved'),0)::float8 AS approved_amount
     FROM vouchers WHERE status <> 'draft'`);
  const recent = await db.query(`${RECENT} WHERE v.status = 'approved' ORDER BY v.decided_at DESC LIMIT 8`);
  res.json({ role, stats: rows[0], recent: recent.rows });
}));

module.exports = router;
