-- Create Finance Tables with RLS

-- Drop existing tables, policies, indexes, and triggers if they exist
DROP TRIGGER IF EXISTS update_split_groups_updated_at ON split_groups;
DROP TRIGGER IF EXISTS update_finance_debts_updated_at ON finance_debts;
DROP TRIGGER IF EXISTS update_savings_goals_updated_at ON savings_goals;
DROP TRIGGER IF EXISTS update_finance_transactions_updated_at ON finance_transactions;
DROP TRIGGER IF EXISTS update_finance_accounts_updated_at ON finance_accounts;

DROP TABLE IF EXISTS split_groups CASCADE;
DROP TABLE IF EXISTS finance_debts CASCADE;
DROP TABLE IF EXISTS bill_reminders CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS finance_budgets CASCADE;
DROP TABLE IF EXISTS recurring_transactions CASCADE;
DROP TABLE IF EXISTS finance_transactions CASCADE;
DROP TABLE IF EXISTS finance_accounts CASCADE;

-- Finance Accounts Table
CREATE TABLE finance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'wallet', 'investment')),
    balance NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    credit_limit NUMERIC,
    credit_used NUMERIC,
    is_settled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Transactions Table
CREATE TABLE finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    note TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    account_id UUID NOT NULL,
    to_account_id UUID,
    payment_method TEXT NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_id UUID,
    tags TEXT[],
    attachments TEXT[],
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring Transactions Table
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    account_id UUID NOT NULL,
    payment_method TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    next_due_date TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_processed TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Budgets Table
CREATE TABLE finance_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    spent NUMERIC NOT NULL DEFAULT 0,
    period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    alert_threshold NUMERIC NOT NULL DEFAULT 80,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings Goals Table
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC NOT NULL DEFAULT 0,
    deadline TEXT,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    is_completed BOOLEAN DEFAULT FALSE,
    contributions JSONB NOT NULL DEFAULT '[]',
    linked_account_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill Reminders Table
CREATE TABLE bill_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    due_date TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly')),
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date TEXT,
    paid_from_account_id UUID,
    reminder_days INTEGER NOT NULL DEFAULT 3,
    is_auto_deduct BOOLEAN DEFAULT FALSE,
    account_id UUID,
    notification_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Debts Table
CREATE TABLE finance_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('owe', 'lent', 'credit_card')),
    person_name TEXT NOT NULL,
    person_contact TEXT,
    original_amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    due_date TEXT,
    interest_rate NUMERIC,
    minimum_payment NUMERIC,
    payments JSONB NOT NULL DEFAULT '[]',
    is_settled BOOLEAN DEFAULT FALSE,
    linked_account_id UUID,
    linked_credit_card_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Split Groups Table
CREATE TABLE split_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('trip', 'home', 'couple', 'project', 'event', 'other')),
    currency TEXT NOT NULL DEFAULT 'INR',
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    members JSONB NOT NULL DEFAULT '[]',
    invitations JSONB NOT NULL DEFAULT '[]',
    total_expenses NUMERIC NOT NULL DEFAULT 0,
    expenses JSONB NOT NULL DEFAULT '[]',
    settlements JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX idx_finance_accounts_user_id ON finance_accounts(user_id);
CREATE INDEX idx_finance_accounts_default ON finance_accounts(user_id, is_default);
CREATE INDEX idx_finance_transactions_user_id ON finance_transactions(user_id);
CREATE INDEX idx_finance_transactions_date ON finance_transactions(date DESC);
CREATE INDEX idx_finance_transactions_account ON finance_transactions(account_id);
CREATE INDEX idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_transactions_active ON recurring_transactions(user_id, is_active);
CREATE INDEX idx_finance_budgets_user_id ON finance_budgets(user_id);
CREATE INDEX idx_finance_budgets_active ON finance_budgets(user_id, is_active);
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_bill_reminders_user_id ON bill_reminders(user_id);
CREATE INDEX idx_bill_reminders_due ON bill_reminders(user_id, due_date);
CREATE INDEX idx_finance_debts_user_id ON finance_debts(user_id);
CREATE INDEX idx_finance_debts_settled ON finance_debts(user_id, is_settled);
CREATE INDEX idx_split_groups_user_id ON split_groups(user_id);
CREATE INDEX idx_split_groups_archived ON split_groups(user_id, is_archived);

-- Enable Row Level Security
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Finance Accounts
CREATE POLICY "Users can view own finance accounts"
    ON finance_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finance accounts"
    ON finance_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finance accounts"
    ON finance_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finance accounts"
    ON finance_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for Finance Transactions
CREATE POLICY "Users can view own finance transactions"
    ON finance_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finance transactions"
    ON finance_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finance transactions"
    ON finance_transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finance transactions"
    ON finance_transactions FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for Recurring Transactions
CREATE POLICY "Users can view own recurring transactions"
    ON recurring_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring transactions"
    ON recurring_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring transactions"
    ON recurring_transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring transactions"
    ON recurring_transactions FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for Finance Budgets
CREATE POLICY "Users can view own finance budgets"
    ON finance_budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finance budgets"
    ON finance_budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finance budgets"
    ON finance_budgets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finance budgets"
    ON finance_budgets FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for Savings Goals
CREATE POLICY "Users can view own savings goals"
    ON savings_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals"
    ON savings_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
    ON savings_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
    ON savings_goals FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for Bill Reminders
CREATE POLICY "Users can view own bill reminders"
    ON bill_reminders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bill reminders"
    ON bill_reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bill reminders"
    ON bill_reminders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bill reminders"
    ON bill_reminders FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for Finance Debts
CREATE POLICY "Users can view own finance debts"
    ON finance_debts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finance debts"
    ON finance_debts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finance debts"
    ON finance_debts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finance debts"
    ON finance_debts FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for Split Groups
CREATE POLICY "Users can view own split groups"
    ON split_groups FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own split groups"
    ON split_groups FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own split groups"
    ON split_groups FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own split groups"
    ON split_groups FOR DELETE
    USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_finance_accounts_updated_at BEFORE UPDATE ON finance_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_transactions_updated_at BEFORE UPDATE ON finance_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_debts_updated_at BEFORE UPDATE ON finance_debts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_split_groups_updated_at BEFORE UPDATE ON split_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
