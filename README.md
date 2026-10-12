# Expense Voucher Management System

Web app that digitises expense-voucher creation, Director approval and Accounts monitoring.

**Stack:** React (Vite) · Node.js + Express · PostgreSQL · JWT auth · Multer (signature uploads)

## Project structure
```
backend/   Express REST API, SQL schema, seed script, uploads/
frontend/  React SPA (Vite, react-router, plain CSS)
```

## Setup

### Prerequisites
Node.js 18+, PostgreSQL 13+.

### 1. Database
```bash
createdb expense_vouchers
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # edit DATABASE_URL and JWT_SECRET
npm install
npm run migrate             # applies db/schema.sql
npm run seed                # creates demo users
npm run dev                 # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api and /uploads to :5000)
```

### Demo accounts (password `Password@123`)
| Role | Email |
|---|---|
| Employee | employee@abc.com, employee2@abc.com |
| Director | director@abc.com |
| Accounts | accounts@abc.com |

## Database schema (`backend/db/schema.sql`)

**users** – `id`, `name`, `email` (unique), `password_hash` (bcrypt), `role` (`employee|director|accounts`), `employee_code` (optional), `signature_path` (optional saved signature), `created_at`.

**vouchers** – `id`, `voucher_number` (unique, auto-generated `VCH-YYYY-000001` from a DB sequence), `voucher_date`, `expense_date`, `department`, `title`, `category`, `description`, `amount` (`NUMERIC(12,2)`, CHECK > 0), `status` (`draft|pending_approval|approved|rejected`), `employee_id` → users, `employee_signature_path`, `director_id` → users, `director_signature_path`, `approval_date`, `rejection_reason`, `submitted_at`, `decided_at`, `created_at`, `updated_at`.

Indexes on `employee_id`, `status`, `expense_date`.

## Workflow
`Draft → (submit) Pending Approval → Approved | Rejected`.
"Submitted" and "Pending Approval" happen in one step, so a submitted voucher is stored as `pending_approval` (with `submitted_at` recorded). Approved/Rejected vouchers are read-only.

## API documentation
Base URL `http://localhost:5000/api`. All routes except login need `Authorization: Bearer <token>`.
Errors: `{ "error": "message", "details": { field: "message" } }` with 400 (validation), 401 (no/invalid token), 403 (wrong role), 404, 409 (invalid state transition).

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | public | `{email,password}` → `{token,user}` |
| GET | `/auth/me` | any | Current user |
| POST | `/auth/signature` | any | multipart `signature` – save reusable signature on profile |
| GET | `/dashboard` | any | Role-specific stats (+ recent activity for director/accounts) |
| GET | `/vouchers` | any | List (scoped by role). Query: `q` (voucher no./employee/title), `status`, `department`, `category`, `from`, `to` (expense date), `minAmount`, `maxAmount`, `sort` (`created_at, amount, expense_date, voucher_number, status, employee_name`), `order` (`asc|desc`), `page`, `limit` |
| GET | `/vouchers/:id` | any | Voucher details (employee: own only) |
| POST | `/vouchers` | employee | multipart: `department,title,expense_date,amount,category,description,signature(file)` → created as Draft |
| PUT | `/vouchers/:id` | employee | Edit own Draft (same fields) |
| DELETE | `/vouchers/:id` | employee | Delete own Draft |
| POST | `/vouchers/:id/submit` | employee | Draft → Pending Approval (signature mandatory) |
| POST | `/vouchers/:id/approve` | director | multipart `signature` (or saved profile signature) – mandatory |
| POST | `/vouchers/:id/reject` | director | `{reason}` – mandatory |

## Validation & business rules enforced (server-side, mirrored in the UI)
Department, title, expense date, amount mandatory; amount > 0; employee signature before submit; director signature before approve; rejection reason on reject; employees only see/modify their own vouchers and only while Draft; only the Director can decide; Accounts is read-only; approved/rejected are immutable; voucher numbers are unique and auto-generated.

## Assumptions
- Drafts are private to the employee; Director and Accounts lists/dashboards cover all **non-draft** vouchers.
- "Total Amount Claimed" (employee) = sum of non-draft vouchers.
- A rejected voucher is final (employee sees the reason and can create a new voucher); resubmission was not in the spec.
- Draft saving still requires department, title, expense date and amount (the mandatory fields).
- Signatures are PNG/JPG/WEBP ≤ 2 MB, stored on local disk (`backend/uploads`) under random filenames and served statically; use object storage and signed URLs in production.
- Users are seeded (no registration/user-management screens in the spec).
- Currency is INR (₹).
- Accounts "download/print" is implemented via the browser print dialog (Print / Save as PDF).
