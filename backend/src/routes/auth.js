const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  employee_code: u.employee_code, signature_path: u.signature_path,
});

router.post('/login', h(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  res.json({ token, user: publicUser(user) });
}));

router.get('/me', authenticate, h(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) return res.status(401).json({ error: 'User no longer exists' });
  res.json({ user: publicUser(rows[0]) });
}));

// Save a reusable signature on the user's profile
router.post('/signature', authenticate, upload.single('signature'), h(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Signature image is required' });
  const { rows } = await db.query(
    'UPDATE users SET signature_path = $1 WHERE id = $2 RETURNING *',
    ['/uploads/' + req.file.filename, req.user.id]
  );
  res.json({ user: publicUser(rows[0]) });
}));

module.exports = router;
