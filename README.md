# SpendLens

SpendLens is a full-stack personal finance application for managing recurring bills, tracking paid transactions, and generating spending analytics from confirmed payments.

This README reflects the current implementation in this repository (React + Vite frontend, Express + PostgreSQL backend).

## System Overview

- Frontend: `React 19`, `Vite 7`, `react-router-dom 7`, `axios`, `recharts`
- Backend: `Node.js`, `Express 4`, `pg`, `jsonwebtoken`, `bcryptjs`, `node-cron`, `nodemailer`
- Database: PostgreSQL (designed for Supabase-hosted Postgres, but works with any PostgreSQL instance)
- Auth model: access token is kept in memory on the client, refresh token is sent as `httpOnly` cookie and stored hashed in DB.

## Repository Structure

```text
/
  src/                # Frontend (Vite React app)
  server/             # Backend (Express API + PostgreSQL access)
    migrations/       # SQL schema bootstrap
    routes/           # Express route modules
    controllers/      # HTTP handlers
    services/         # Data access/business logic
```

## Runtime Architecture

### Frontend

- Root composition in `src/App.jsx`:
- Providers: `AuthProvider -> ThemeProvider -> CurrencyProvider -> ToastProvider`
- Router:
- Public route: `/` (`AuthPage`)
- Protected routes: `/dashboard`, `/bills`, `/analytics`, `/alerts`, `/settings`
- Session bootstrap in `src/context/AuthContext.jsx`:
- On app mount: `POST /auth/refresh` using refresh cookie
- On success: store new access token in memory and fetch `GET /auth/me`
- API client in `src/services/api.js`:
- Global Axios instance with `withCredentials: true`
- Request interceptor injects `Authorization: Bearer <accessToken>`
- Response interceptor queues failed requests during token refresh (`isRefreshing` + `failedQueue`)

### Backend

- App assembly in `server/app.js`:
- Security middleware: `helmet`, CORS, auth rate limits
- Routes mounted at `/api/*`
- Health endpoint: `GET /api/health` checks DB connectivity
- Error path:
- `notFoundHandler` creates `AppError`
- `globalErrorHandler` maps operational JWT/validation errors
- Startup in `server/server.js`:
- Loads env, verifies PostgreSQL with `testConnection()`
- Starts HTTP listener
- Starts scheduled alert checker job

## Database Model (PostgreSQL)

Schema is created by `server/migrations/001_init.sql`.

Core tables:

- `users`: profile + preferences (`monthly_budget`, `currency`, `theme`, `notification_prefs` JSONB)
- `refresh_tokens`: hashed refresh token store, single-session behavior enforced in service layer
- `categories`: system categories (`is_default = true`) + user-defined categories
- `bills`: bill definitions (recurrence metadata, soft-delete flag)
- `bill_schedules`: generated occurrences with status (`pending`, `paid`, `overdue`, `skipped`)
- `transactions`: immutable payment records; analytics source of truth
- `notifications`: alert/notification feed for users

Important domain rule:

- Analytics calculations read from `transactions`, not from all scheduled bills.
- Only confirmed payments are considered spending.

## Scheduling and Recurrence Engine

Implemented in `server/services/scheduleService.js` and `server/services/transactionService.js`.

- On bill creation (`POST /api/bills`): schedules are generated upfront based on `frequency`, `tenure`, `interval_days`
- For open-ended recurrence (`tenure = null`): bounded lookahead is generated (for example monthly defaults to 24 occurrences)
- On payment confirmation (`POST /api/bills/pay`):
- schedule is row-locked (`FOR UPDATE`)
- status flips to `paid`
- transaction is inserted atomically
- next occurrence is created if needed for infinite recurring bills
- Daily cron (`server/jobs/alertChecker.js`):
- marks overdue schedules
- creates due reminders for schedules due in `0`, `1`, or `3` days
- tops up infinite recurring bills when pending future schedules drop below threshold

## API Reference

Base URL (default): `http://localhost:5000/api`

All endpoints return JSON. Current code uses two response envelopes depending on code path:

- Success (most controllers): `{ success, data, error }`
- Error middleware format: `{ status, message, ... }`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me` (protected)
- `PATCH /auth/me` (protected)
- `PATCH /auth/password` (protected)
- `DELETE /auth/me` (protected)

### Bills (protected)

- `GET /bills`
- `POST /bills`
- `GET /bills/:id`
- `PUT /bills/:id`
- `DELETE /bills/:id`
- Query mode:
- `mode=future` (default): delete future pending schedules + soft-delete bill
- `mode=single`: requires `scheduleId` in body, marks one schedule as skipped
- `POST /bills/pay` (mark schedule paid and create transaction)
- `GET /bills/dashboard` (pending/overdue + paid this month)
- `GET /bills/categories`
- `POST /bills/categories`

### Analytics (protected)

- `GET /analytics/summary`
- `GET /analytics/category?month=YYYY-MM`
- `GET /analytics/monthly?months=12`
- `GET /analytics/insights`
- `GET /analytics/subscriptions`
- `GET /analytics/transactions`

### Alerts (protected)

- `GET /alerts`
- `PATCH /alerts/read-all`
- `PATCH /alerts/:id/read`
- `DELETE /alerts/:id`

### Notifications (protected)

- `GET /notifications`
- `POST /notifications/read-all`
- `POST /notifications/:id/read`

### Health

- `GET /health`

## Local Development

### 1. Install dependencies

From repo root:

```bash
npm install
```

From backend folder:

```bash
cd server
npm install
```

### 2. Configure environment

Create `server/.env` from `server/.env.example`.

Required keys:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_ORIGIN=http://localhost:5173
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=SpendLens <noreply@spendlens.app>
ALERT_CHECK_CRON=0 8 * * *
```

### 3. Run database migration

```bash
cd server
node run-migration.js
```

### 4. Start backend

```bash
cd server
npm run dev
```

### 5. Start frontend

```bash
# in repo root
npm run dev
```

Frontend default: `http://localhost:5173`

## Build and Lint

Frontend scripts (`package.json` in repo root):

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

Backend scripts (`server/package.json`):

- `npm run start`
- `npm run dev`

## Security Characteristics

- Login/register rate limiting at `10 requests / 15 minutes / IP`
- Refresh token rotation with DB invalidation of previous token
- Refresh tokens hashed with SHA-256 before persistence
- Access token required for all protected routes (`Authorization: Bearer ...`)
- Cookies configured as `httpOnly`, `sameSite: 'Strict'`, and `secure` in production

## Known Codebase Notes

- Active backend data layer is PostgreSQL (`server/config/db.js`, services with SQL).
- `server/models/*.js`, `server/services/alertService.js`, and `server/services/emailService.js` contain legacy Mongo/Mongoose-era code and are not used in current route wiring.
- `server/validators/billValidators.js` is legacy shape and currently not mounted by bill routes.
- Frequency naming is standardized as `yearly` in active SQL/services, while some legacy files still reference `annual`.
- `src/pages/SettingsPage.jsx` "Security" form UI is present, but password update flow is not wired to collect and submit real values yet.
- Frontend label `system` theme appears in UI, but `ThemeContext` currently toggles only between `dark` and `light`.

## Suggested Next Hardening Tasks

1. Normalize all API error responses to one envelope (`{ success, data, error }` or equivalent).
2. Remove or archive unused Mongo-era files to reduce maintenance risk.
3. Add integration tests for auth refresh queueing and payment transaction atomicity.
4. Wire Settings security panel to `PATCH /api/auth/password` with validation and success/error UX.
5. Add migration version tracking strategy if schema evolves beyond `001_init.sql`.
