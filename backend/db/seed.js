require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const users = [
  ['Raj', 'employee@abc.com', 'employee', 'EMP001'],
  ['Rahul Employee', 'employee2@abc.com', 'employee', 'EMP002'],
  ['Divya Director', 'director@abc.com', 'director', null],
  ['Arun Accounts', 'accounts@abc.com', 'accounts', null],
];

(async () => {
  const hash = await bcrypt.hash('Password@123', 10);
  for (const [name, email, role, code] of users) {
    await db.query(
      `INSERT INTO users (name,email,password_hash,role,employee_code)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
      [name, email, hash, role, code]
    );
  }
  console.log('Seeded demo users (password: Password@123).');
  await db.end();
})().catch((e) => { console.error(e); process.exit(1); });
