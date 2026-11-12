# Monthly budget & bill reports

Budgets and Bills in the Money Hub are viewed one month at a time. Each
month's state is saved in `finance_monthly_reports`, one row per user per
month.

- **Budget limits are frozen per month.** If you change a budget in December,
  October still shows October's limit.
- **Spending is always recomputed from transactions**, so a backdated expense
  updates that month's report too.
- **Bills** are already stored one row per occurrence: paying a recurring bill
  creates the next one. The report also keeps a copy of each month's bills, so
  deleting a bill doesn't erase it from past months.
- A past month with no recorded report shows limits taken from the current
  budgets, with a note on screen (`estimated = true`).

The app saves the current month, the previous month and whichever month is on
screen, and only once the stored reports have loaded.
Code: `src/services/financeMonthlyReports.ts`, `src/hooks/useMonthlyReports.ts`.

## Setup

Run `scripts/finance-monthly-reports.sql` once in the Supabase SQL editor.
`budgets` and `bills` are `jsonb`: pass arrays, never `JSON.stringify` them.
