require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is not set'); process.exit(1); }

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler (multer errors, DB errors, etc.)
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || /Signature must be/.test(err.message))
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Signature must be under 2 MB' : err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
