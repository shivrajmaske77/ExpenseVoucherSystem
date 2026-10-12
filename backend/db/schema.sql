-- Expense Voucher Management System: schema (PostgreSQL)
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           VARCHAR(20) NOT NULL CHECK (role IN ('employee','director','accounts')),
  employee_code  VARCHAR(30),
  signature_path TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS voucher_number_seq START 1;

CREATE TABLE IF NOT EXISTS vouchers (
  id                       SERIAL PRIMARY KEY,
  voucher_number           VARCHAR(30) NOT NULL UNIQUE,
  voucher_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_date             DATE NOT NULL,
  department               VARCHAR(100) NOT NULL,
  title                    VARCHAR(200) NOT NULL,
  category                 VARCHAR(50),
  description              TEXT,
  amount                   NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status                   VARCHAR(20) NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','pending_approval','approved','rejected')),
  employee_id              INT NOT NULL REFERENCES users(id),
  employee_signature_path  TEXT,
  director_id              INT REFERENCES users(id),
  director_signature_path  TEXT,
  approval_date            TIMESTAMPTZ,
  rejection_reason         TEXT,
  submitted_at             TIMESTAMPTZ,
  decided_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_employee ON vouchers(employee_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status   ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_expense_date ON vouchers(expense_date);
