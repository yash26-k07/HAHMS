# Meridian Health — Hospital & Healthcare Management System

A full-stack hospital management system built from the project synopsis: a centralized
platform unifying patient registration, appointments, medical records, billing, inventory,
and bed admissions behind role-based access control.

## Architecture

Three-layer web architecture:

- **Presentation** — React SPA (`/frontend`): login/register, role-specific dashboards,
  appointment booking, medical records, billing, inventory, admissions.
- **Application** — Node.js + Express REST API (`/backend`): authentication (JWT),
  authorization (role-based middleware), business rules (no double-booked doctor slots,
  server-computed invoice totals, stock validation).
- **Data** — PostgreSQL relational database (`/database/schema.sql`): normalized schema with
  foreign keys enforcing referential integrity across patients, doctors, appointments,
  medical records, billing, and inventory.

## Roles

| Role | Can do |
|---|---|
| **admin** | Everything: manage departments/doctors, view reports, full CRUD |
| **receptionist** | Register patients, book/manage appointments, billing, inventory, admissions |
| **doctor** | View their own appointments, write medical records & prescriptions, admissions |
| **patient** | Register/login, book their own appointments, view their own records & bills |

## Database schema

See `database/schema.sql` for full DDL. Core entities: `users`, `patients`, `doctors`,
`departments`, `appointments` (unique constraint on doctor+date+time prevents double-booking),
`admissions`, `medical_records`, `prescriptions`, `invoices` + `invoice_items`, `payments`,
`inventory`.

## Setup

### 1. Database

```bash
# Create the database and connect to it
psql -U postgres -f database/schema.sql
psql -U postgres -d meridian_health -f database/schema.sql
```

> **Note:** The first command creates the database. The second runs the table/seed DDL
> against the `meridian_health` database. Alternatively, connect with `\c meridian_health`
> from within psql and paste the DDL after the `CREATE DATABASE` statement.

This creates the `meridian_health` database with tables and seed data (departments, a demo
admin/doctor/receptionist/patient login, and a few inventory items). The seeded password
hashes are placeholders — replace them by registering fresh accounts through the API, or
generate real bcrypt hashes for the seed rows before running the script.

### 2. Backend

```bash
cd backend
cp .env.example .env      # then fill in your PostgreSQL credentials + a real JWT_SECRET
npm install
npm run dev                # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173, proxies /api to the backend
```

Open `http://localhost:5173`, register a patient account, or log in as staff using an
account created directly in the database (staff/doctor accounts are created by an admin
through the app, not via public self-registration).

## Creating your first admin

The public `/register` endpoint always creates a `patient` account. To get an admin login,
insert one directly after hashing a password, e.g. in a Node REPL:

```js
const bcrypt = require('bcrypt');
bcrypt.hash('your-password', 10).then(console.log);
```

Then:

```sql
INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin', 'admin@meridian.health', '<paste hash>', 'admin');
```

Once logged in as admin, use the Doctors page to create doctor accounts (this creates both
the login and the doctor profile in one step). Receptionist accounts can be created the same
way directly in the database, following the same pattern.

## API overview

All endpoints are prefixed `/api` and (except `/auth/register`, `/auth/login`, `/health`)
require `Authorization: Bearer <token>`.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET/POST/PUT/DELETE /patients`, `GET /patients/:id/history`
- `GET/POST/PUT/DELETE /departments`
- `GET/POST/PUT/DELETE /doctors`
- `GET/POST/PUT /appointments`, `PATCH /appointments/:id/status`, `DELETE /appointments/:id`
- `GET/POST /medical-records`, `GET /medical-records/:id`
- `GET/POST /invoices`, `POST /invoices/:id/payments`
- `GET/POST/PUT/DELETE /inventory`, `PATCH /inventory/:id/adjust`
- `GET/POST /admissions`, `PATCH /admissions/:id/discharge`
- `GET /reports/summary` (admin dashboard)

## What's in scope vs. out of scope

Matches the synopsis: this is a realistic academic-scope prototype covering the core hospital
workflow (registration → appointment → consultation → billing). It intentionally excludes
advanced diagnosis support, biometric auth, real-time ambulance routing, insurance
adjudication, and full national health-record interoperability — flagged as future scope in
the original synopsis (telemedicine, lab integration, payment gateways, SMS/email alerts,
mobile apps, audit logs, analytics).
