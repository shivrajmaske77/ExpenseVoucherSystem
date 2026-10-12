const router = require('express').Router();
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const fileUrl = (f) => (f ? '/uploads/' + f.filename : null);

const BASE = `SELECT v.*, e.name AS employee_name, e.employee_code, d.name AS director_name
  FROM vouchers v
  JOIN users e ON e.id = v.employee_id
  LEFT JOIN users d ON d.id = v.director_id`;

const SORTABLE = {
  created_at: 'v.created_at', amount: 'v.amount', expense_date: 'v.expense_date',
  voucher_number: 'v.voucher_number', status: 'v.status', employee_name: 'e.name',
};

function validate(b) {
  const errors = {};
  if (!b.department || !b.department.trim()) errors.department = 'Department is required';
  if (!b.title || !b.title.trim()) errors.title = 'Expense title is required';
  if (!b.expense_date || isNaN(Date.parse(b.expense_date))) errors.expense_date = 'Expense date is required';
  if (b.amount === undefined || b.amount === '' || isNaN(Number(b.amount))) errors.amount = 'Amount is required';
  else if (Number(b.amount) <= 0) errors.amount = 'Amount must be greater than zero';
  return errors;
}

router.param('id', (req, res, next, id) =>
  /^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Voucher not found' }));

// Loads a voucher the current user is allowed to see, or sends 404.
async function loadVoucher(req, res) {
  const { rows } = await db.query(BASE + ' WHERE v.id = $1', [req.params.id]);
  const v = rows[0];
  const hidden =
    !v ||
    (req.user.role === 'employee' && v.employee_id !== req.user.id) ||
    (req.user.role !== 'employee' && v.status === 'draft'); // drafts are private to the employee
  if (hidden) { res.status(404).json({ error: 'Voucher not found' }); return null; }
  return v;
}

const fetchOne = async (id) => (await db.query(BASE + ' WHERE v.id = $1', [id])).rows[0];

// ---- List with search / filter / sort / pagination ----
router.get('/', h(async (req, res) => {
  const { q, status, department, category, from, to, minAmount, maxAmount,
          sort = 'created_at', order = 'desc' } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

  const where = [], params = [];
  const add = (sql, val) => { params.push(val); where.push(sql.replace(/\?/g, '$' + params.length)); };

  if (req.user.role === 'employee') add('v.employee_id = ?', req.user.id);
  else where.push("v.status <> 'draft'");

  if (q) add('(v.voucher_number ILIKE ? OR e.name ILIKE ? OR v.title ILIKE ?)', `%${q}%`);
  if (status) add('v.status = ?', status);
  if (department) add('v.department ILIKE ?', `%${department}%`);
  if (category) add('v.category = ?', category);
  if (from) add('v.expense_date >= ?', from);
  if (to) add('v.expense_date <= ?', to);
  if (minAmount) add('v.amount >= ?', Number(minAmount));
  if (maxAmount) add('v.amount <= ?', Number(maxAmount));

  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const orderSql = ` ORDER BY ${SORTABLE[sort] || 'v.created_at'} ${order === 'asc' ? 'ASC' : 'DESC'}, v.id DESC`;

  const count = await db.query(
    `SELECT COUNT(*)::int AS n FROM vouchers v JOIN users e ON e.id = v.employee_id${whereSql}`, params);
  const { rows } = await db.query(
    BASE + whereSql + orderSql + ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);

  res.json({ data: rows, page, limit, total: count.rows[0].n, pages: Math.ceil(count.rows[0].n / limit) });
}));

router.get('/:id', h(async (req, res) => {
  const v = await loadVoucher(req, res);
  if (v) res.json(v);
}));

// ---- Employee: create (always Draft) ----
router.post('/', authorize('employee'), upload.single('signature'), h(async (req, res) => {
  const errors = validate(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });

  let sig = fileUrl(req.file);
  if (!sig) sig = (await db.query('SELECT signature_path FROM users WHERE id = $1', [req.user.id])).rows[0].signature_path;

  const b = req.body;
  const { rows } = await db.query(
    `INSERT INTO vouchers
       (voucher_number, expense_date, department, title, category, description, amount, employee_id, employee_signature_path)
     VALUES ('VCH-' || to_char(NOW(),'YYYY') || '-' || lpad(nextval('voucher_number_seq')::text, 6, '0'),
             $1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [b.expense_date, b.department.trim(), b.title.trim(), b.category || null, b.description || null,
     Number(b.amount), req.user.id, sig]);
  res.status(201).json(await fetchOne(rows[0].id));
}));

// ---- Employee: edit (Draft only) ----
router.put('/:id', authorize('employee'), upload.single('signature'), h(async (req, res) => {
  const v = await loadVoucher(req, res);
  if (!v) return;
  if (v.status !== 'draft') return res.status(409).json({ error: 'Only draft vouchers can be edited' });
  const errors = validate(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });

  const b = req.body;
  await db.query(
    `UPDATE vouchers SET expense_date=$1, department=$2, title=$3, category=$4, description=$5, amount=$6,
       employee_signature_path = COALESCE($7, employee_signature_path), updated_at = NOW()
     WHERE id = $8`,
    [b.expense_date, b.department.trim(), b.title.trim(), b.category || null, b.description || null,
     Number(b.amount), fileUrl(req.file), v.id]);
  res.json(await fetchOne(v.id));
}));

// ---- Employee: delete (Draft only) ----
router.delete('/:id', authorize('employee'), h(async (req, res) => {
  const v = await loadVoucher(req, res);
  if (!v) return;
  if (v.status !== 'draft') return res.status(409).json({ error: 'Only draft vouchers can be deleted' });
  await db.query('DELETE FROM vouchers WHERE id = $1', [v.id]);
  res.status(204).end();
}));

// ---- Employee: submit for approval ----
router.post('/:id/submit', authorize('employee'), h(async (req, res) => {
  const v = await loadVoucher(req, res);
  if (!v) return;
  if (v.status !== 'draft') return res.status(409).json({ error: 'Only draft vouchers can be submitted' });
  if (!v.employee_signature_path)
    return res.status(400).json({ error: 'Validation failed', details: { signature: 'Employee signature is required before submission' } });
  await db.query(
    `UPDATE vouchers SET status='pending_approval', submitted_at=NOW(), updated_at=NOW() WHERE id=$1`, [v.id]);
  res.json(await fetchOne(v.id));
}));

// ---- Director: approve (signature required) ----
router.post('/:id/approve', authorize('director'), upload.single('signature'), h(async (req, res) => {
  const v = await loadVoucher(req, res);
  if (!v) return;
  if (v.status !== 'pending_approval') return res.status(409).json({ error: 'Only pending vouchers can be approved' });

  let sig = fileUrl(req.file);
  if (!sig) sig = (await db.query('SELECT signature_path FROM users WHERE id = $1', [req.user.id])).rows[0].signature_path;
  if (!sig)
    return res.status(400).json({ error: 'Validation failed', details: { signature: 'Director signature is required before approval' } });

  await db.query(
    `UPDATE vouchers SET status='approved', director_id=$1, director_signature_path=$2,
       approval_date=NOW(), decided_at=NOW(), rejection_reason=NULL, updated_at=NOW() WHERE id=$3`,
    [req.user.id, sig, v.id]);
  res.json(await fetchOne(v.id));
}));

// ---- Director: reject (reason required) ----
router.post('/:id/reject', authorize('director'), h(async (req, res) => {
  const v = await loadVoucher(req, res);
  if (!v) return;
  if (v.status !== 'pending_approval') return res.status(409).json({ error: 'Only pending vouchers can be rejected' });
  const reason = (req.body.reason || '').trim();
  if (!reason)
    return res.status(400).json({ error: 'Validation failed', details: { reason: 'Rejection reason is required' } });
  await db.query(
    `UPDATE vouchers SET status='rejected', director_id=$1, rejection_reason=$2, decided_at=NOW(), updated_at=NOW() WHERE id=$3`,
    [req.user.id, reason, v.id]);
  res.json(await fetchOne(v.id));
}));

module.exports = router;
