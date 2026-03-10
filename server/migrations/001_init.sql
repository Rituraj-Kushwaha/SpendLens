-- SpendLens — PostgreSQL Schema Migration
-- Run once against your Supabase database (SQL Editor)

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    monthly_budget NUMERIC(12,2) DEFAULT 0,
    currency      VARCHAR(10)  DEFAULT 'INR',
    theme         VARCHAR(20)  DEFAULT 'dark',
    date_format   VARCHAR(20)  DEFAULT 'DD/MM/YYYY',
    notification_prefs JSONB   DEFAULT '{"billDueReminders":true,"overspendingAlerts":true,"reminderDaysBefore":3}',
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- REFRESH TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ─────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    category_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(user_id) ON DELETE CASCADE,  -- NULL = system default
    category_name VARCHAR(100) NOT NULL,
    is_default    BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed system categories
INSERT INTO categories (category_name, is_default) VALUES
    ('Utilities', TRUE),
    ('OTT', TRUE),
    ('Internet', TRUE),
    ('Mobile', TRUE),
    ('Rent', TRUE),
    ('Subscription', TRUE),
    ('Food', TRUE),
    ('Transport', TRUE),
    ('Health', TRUE),
    ('Clothing', TRUE),
    ('Education', TRUE),
    ('Insurance', TRUE),
    ('Entertainment', TRUE),
    ('Other', TRUE)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- BILLS (master definitions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
    bill_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id   UUID REFERENCES categories(category_id) ON DELETE SET NULL,
    title         VARCHAR(200) NOT NULL,
    amount        NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    bill_date     DATE NOT NULL,            -- first/only billing date
    due_date      DATE,                     -- optional payment deadline
    frequency     VARCHAR(20) NOT NULL CHECK (frequency IN ('one-time','weekly','monthly','quarterly','yearly','custom')),
    interval_days INTEGER,                  -- used only when frequency = 'custom'
    tenure        INTEGER,                  -- NULL = infinite recurring
    notes         TEXT,
    is_deleted    BOOLEAN DEFAULT FALSE,    -- soft delete
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_active ON bills(user_id) WHERE is_deleted = FALSE;

-- ─────────────────────────────────────────────
-- BILL SCHEDULES (every individual payment occurrence)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id     UUID NOT NULL REFERENCES bills(bill_id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    due_date    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','skipped')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON bill_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON bill_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON bill_schedules(user_id, status, due_date);

-- ─────────────────────────────────────────────
-- TRANSACTIONS (confirmed payments — analytics source of truth)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id       UUID NOT NULL REFERENCES bill_schedules(schedule_id) ON DELETE RESTRICT,
    user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount            NUMERIC(12,2) NOT NULL,
    payment_method    VARCHAR(50),          -- UPI, Card, Cash, BankTransfer, etc.
    payment_reference TEXT,                 -- optional UPI ref / transaction no
    paid_date         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_paid_date ON transactions(user_id, paid_date);
CREATE INDEX IF NOT EXISTS idx_transactions_schedule ON transactions(schedule_id);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    schedule_id     UUID REFERENCES bill_schedules(schedule_id) ON DELETE SET NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
