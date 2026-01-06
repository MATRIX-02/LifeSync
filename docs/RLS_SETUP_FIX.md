# Row-Level Security (RLS) Setup Fix

## The Problem

You're encountering this error when syncing habits:
```
ERROR  Habits sync error: {"code": "42501", "details": null, "hint": null, "message": "new row violates row-level security policy (USING expression) for table \"user_habits\""}
```

This means the Row-Level Security (RLS) policies on your `user_habits` table are preventing data insertion.

## Root Cause

The error occurs when:
1. RLS is enabled on the table but no INSERT policy exists
2. The INSERT policy exists but its conditions don't match your data
3. The authenticated user's ID doesn't match the `user_id` in the data being inserted

## Solution

You need to create proper RLS policies in your Supabase database. Run these SQL commands in your Supabase SQL Editor:

### Step 1: Enable RLS (if not already enabled)

```sql
-- Enable RLS on user_habits table
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create INSERT Policy

```sql
-- Allow users to insert their own habit records
CREATE POLICY "Users can insert their own habits"
ON user_habits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### Step 3: Create SELECT Policy

```sql
-- Allow users to read their own habit records
CREATE POLICY "Users can read their own habits"
ON user_habits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### Step 4: Create UPDATE Policy

```sql
-- Allow users to update their own habit records
CREATE POLICY "Users can update their own habits"
ON user_habits
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Step 5: Create DELETE Policy

```sql
-- Allow users to delete their own habit records
CREATE POLICY "Users can delete their own habits"
ON user_habits
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## Apply to All Related Tables

You'll need similar policies for ALL your tables that store user data. Here's a template:

```sql
-- For habit_logs table
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own habit logs"
ON habit_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- For workout_sessions table
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workout sessions"
ON workout_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- For finance_transactions table
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transactions"
ON finance_transactions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- For finance_accounts table
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own accounts"
ON finance_accounts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## Complete RLS Setup Script

For your convenience, here's a complete script for all likely tables:

```sql
-- ====================================
-- COMPLETE RLS SETUP FOR LIFESYNC
-- ====================================

-- User Habits
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own habits" ON user_habits;
CREATE POLICY "Users can manage their own habits"
ON user_habits FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Habit Logs
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own habit logs" ON habit_logs;
CREATE POLICY "Users can manage their own habit logs"
ON habit_logs FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Workout Plans
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own workout plans" ON workout_plans;
CREATE POLICY "Users can manage their own workout plans"
ON workout_plans FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Workout Sessions
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own workout sessions" ON workout_sessions;
CREATE POLICY "Users can manage their own workout sessions"
ON workout_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Personal Records
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own personal records" ON personal_records;
CREATE POLICY "Users can manage their own personal records"
ON personal_records FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Body Measurements
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own body measurements" ON body_measurements;
CREATE POLICY "Users can manage their own body measurements"
ON body_measurements FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Body Weights
ALTER TABLE body_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own body weights" ON body_weights;
CREATE POLICY "Users can manage their own body weights"
ON body_weights FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Custom Exercises
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own custom exercises" ON custom_exercises;
CREATE POLICY "Users can manage their own custom exercises"
ON custom_exercises FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fitness Profiles
ALTER TABLE fitness_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own fitness profile" ON fitness_profiles;
CREATE POLICY "Users can manage their own fitness profile"
ON fitness_profiles FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Finance Accounts
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own finance accounts" ON finance_accounts;
CREATE POLICY "Users can manage their own finance accounts"
ON finance_accounts FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Finance Transactions
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON finance_transactions;
CREATE POLICY "Users can manage their own transactions"
ON finance_transactions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recurring Transactions
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can manage their own recurring transactions"
ON recurring_transactions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
CREATE POLICY "Users can manage their own budgets"
ON budgets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Savings Goals
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own savings goals" ON savings_goals;
CREATE POLICY "Users can manage their own savings goals"
ON savings_goals FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Bill Reminders
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own bill reminders" ON bill_reminders;
CREATE POLICY "Users can manage their own bill reminders"
ON bill_reminders FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own debts" ON debts;
CREATE POLICY "Users can manage their own debts"
ON debts FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Split Groups
ALTER TABLE split_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own split groups" ON split_groups;
CREATE POLICY "Users can manage their own split groups"
ON split_groups FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- User Sync Status
ALTER TABLE user_sync_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sync status" ON user_sync_status;
CREATE POLICY "Users can manage their own sync status"
ON user_sync_status FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## How to Apply

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Paste the complete script above
5. Click **Run**
6. Verify no errors appear

## Verification

After applying the policies, test by:

1. Restart your app
2. Try syncing data
3. Check Supabase **Logs** for any RLS errors
4. Verify data appears in the **Table Editor**

## Admin Access

If you need admin users to access all data (for admin panel), add these policies:

```sql
-- Allow admins to read all user data
CREATE POLICY "Admins can read all habits"
ON user_habits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Repeat for other tables as needed
```

## Troubleshooting

### Still getting RLS errors?

1. **Check if user is authenticated:**
   - The app verifies this now with enhanced logging
   - Check console for "User not authenticated" errors

2. **Verify table names match:**
   - Run `\dt` in SQL Editor to see all table names
   - Ensure they match the ones in the script

3. **Check for typos in column names:**
   - RLS policies reference `user_id` column
   - Ensure all tables have a `user_id` column

4. **View existing policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'user_habits';
   ```

5. **Disable RLS temporarily for testing:**
   ```sql
   ALTER TABLE user_habits DISABLE ROW LEVEL SECURITY;
   ```
   ⚠️ **WARNING**: Only do this in development! Never in production!

## Related Files Changed

The following files were updated to fix the filesystem deprecation and improve RLS error handling:

1. **src/services/syncService.ts**
   - Migrated from deprecated `readAsStringAsync` to legacy import
   - Added authentication verification before syncing
   - Enhanced error logging for RLS issues

2. **app/(tabs)/two.tsx**
   - Already using legacy filesystem import (no changes needed)

## Next Steps

After fixing RLS policies:
1. Test all sync operations (habits, workouts, finance)
2. Verify admin panel access if applicable
3. Test on multiple user accounts
4. Monitor Supabase logs for any remaining issues
