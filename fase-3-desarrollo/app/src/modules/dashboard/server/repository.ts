import "server-only";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { VerifiedIdentity } from "../../users/server/profile-repository";
import type { DashboardData, DashboardFilters, DashboardRange } from "../model";
type Sql = NeonQueryFunction<false, false>;

export function dashboardQuery(sql: Sql, identity: VerifiedIdentity, filters: DashboardFilters, range: DashboardRange) {
  // All sections share a database snapshot; no full ledger is sent to the browser.
  return sql`WITH owner AS (
    SELECT p.id, COALESCE(z.name, 'UTC') AS timezone FROM pagato.app_users p
    JOIN neon_auth.user u ON u.id::text = p.auth_subject JOIN neon_auth.session s ON s."userId" = u.id
    LEFT JOIN pagato.user_preferences prefs ON prefs.user_id = p.id LEFT JOIN pg_timezone_names z ON z.name = prefs.timezone
    WHERE u.id::text = ${identity.userId} AND s.id::text = ${identity.sessionId} AND s."expiresAt" > now()
      AND (u.banned IS NOT TRUE OR u."banExpires" <= now()) AND p.status = 'active' AND p.deleted_at IS NULL
  ), accounts AS (
    SELECT a.id, a.name, a.currency_code, a.status FROM pagato.accounts a JOIN owner o ON o.id = a.user_id
  ), filtered AS (
    SELECT t.id, t.transaction_type AS type, t.source_account_id AS "sourceAccountId", t.destination_account_id AS "destinationAccountId",
      a.name AS "sourceName", b.name AS "destinationName", a.currency_code AS "sourceCurrency", b.currency_code AS "destinationCurrency",
      t.source_amount::text AS "sourceAmount", t.destination_amount::text AS "destinationAmount", t.category_id AS "categoryId",
      c.name AS "categoryName", c.icon AS "categoryIcon", c.color AS "categoryColor",
      to_char(t.occurred_at AT TIME ZONE o.timezone, 'YYYY-MM-DD"T"HH24:MI') AS "occurredLocal",
      (t.occurred_at AT TIME ZONE o.timezone)::date AS local_date, t.occurred_at,
      t.description, t.notes, t.payment_method AS "paymentMethod", t.version,
      CASE WHEN t.transaction_type = 'income' THEN t.destination_amount ELSE 0 END AS income,
      CASE WHEN t.transaction_type = 'expense' THEN t.source_amount ELSE 0 END AS expense
    FROM owner o JOIN pagato.transactions t ON t.user_id = o.id
    LEFT JOIN accounts a ON a.id = t.source_account_id LEFT JOIN accounts b ON b.id = t.destination_account_id
    LEFT JOIN pagato.categories c ON c.id = t.category_id AND c.user_id = o.id
    WHERE t.deleted_at IS NULL
      AND t.occurred_at >= ${range.from}::date::timestamp AT TIME ZONE o.timezone
      AND t.occurred_at < (${range.to}::date + 1)::timestamp AT TIME ZONE o.timezone
      AND ((t.transaction_type = 'income' AND b.currency_code = ${filters.currency})
        OR (t.transaction_type = 'expense' AND a.currency_code = ${filters.currency})
        OR (t.transaction_type = 'transfer' AND (a.currency_code = ${filters.currency} OR b.currency_code = ${filters.currency})))
  ), calendar AS (
    SELECT d::date AS day, CASE WHEN ${range.bucket} = 'month' THEN date_trunc('month', d)::date
      WHEN ${range.bucket} = 'week' THEN ${range.from}::date + ((d::date - ${range.from}::date) / 7) * 7
      ELSE d::date END AS bucket
    FROM generate_series(${range.from}::date::timestamp, ${range.to}::date::timestamp, interval '1 day') d
  ), daily AS (
    SELECT local_date, sum(income) AS income, sum(expense) AS expense FROM filtered GROUP BY local_date
  ), trend AS (
    SELECT c.bucket::text AS date, sum(COALESCE(d.income, 0))::text AS income, sum(COALESCE(d.expense, 0))::text AS expense
    FROM calendar c LEFT JOIN daily d ON d.local_date = c.day GROUP BY c.bucket
  ), category_totals AS (
    SELECT "categoryId"::text AS id, COALESCE("categoryName", 'Sin categoría') AS name, "categoryColor" AS color,
      sum(expense) AS amount, count(*)::int AS count FROM filtered WHERE type = 'expense' GROUP BY "categoryId", "categoryName", "categoryColor"
  ), ranked AS (
    SELECT *, row_number() OVER (ORDER BY amount DESC, name, id) AS position FROM category_totals
  ), distribution AS (
    SELECT id, name, color, amount::text AS amount, count, position FROM ranked WHERE position <= 5
    UNION ALL SELECT 'other', 'Otras categorías', '#647773', sum(amount)::text, sum(count)::int, 6 FROM ranked WHERE position > 5 HAVING count(*) > 0
  ), budget_defs AS (
    SELECT p.id, 'monthly' AS kind, p.name, p.amount, p.period_start, p.period_end, NULL::uuid AS category_id
    FROM pagato.budget_plans p JOIN owner o ON p.user_id = o.id WHERE p.status = 'active' AND p.currency_code = ${filters.currency}
      AND p.period_start <= ${range.to}::date AND p.period_end >= ${range.from}::date
    UNION ALL SELECT b.id, 'individual', b.name, b.amount, b.period_start, b.period_end, b.category_id
    FROM pagato.budgets b JOIN owner o ON b.user_id = o.id WHERE b.status = 'active' AND b.plan_id IS NULL AND b.currency_code = ${filters.currency}
      AND b.period_start <= ${range.to}::date AND b.period_end >= ${range.from}::date
  ), budget_rows AS (
    SELECT b.id, b.kind, b.name, b.amount::text AS amount, b.period_start::text AS "periodStart", b.period_end::text AS "periodEnd",
      COALESCE((SELECT sum(t.source_amount) FROM pagato.transactions t JOIN accounts a ON a.id = t.source_account_id
        WHERE t.user_id = o.id AND t.transaction_type = 'expense' AND t.deleted_at IS NULL AND a.currency_code = ${filters.currency}
          AND (b.category_id IS NULL OR t.category_id = b.category_id)
          AND t.occurred_at >= b.period_start::timestamp AT TIME ZONE o.timezone
          AND t.occurred_at < (b.period_end + 1)::timestamp AT TIME ZONE o.timezone), 0)::text AS spent
    FROM (SELECT * FROM budget_defs ORDER BY kind DESC, period_end DESC, id LIMIT 4) b CROSS JOIN owner o
  ) SELECT o.timezone, to_char(now() AT TIME ZONE o.timezone, 'YYYY-MM-DD"T"HH24:MI') AS "refreshedAt",
    COALESCE((SELECT sum(v.current_balance)::text FROM accounts a JOIN pagato.account_balances v ON v.account_id = a.id AND v.user_id = o.id
      WHERE a.status = 'active' AND a.currency_code = ${filters.currency}), '0') AS balance,
    (SELECT count(*)::int FROM accounts WHERE status = 'active' AND currency_code = ${filters.currency}) AS "accountCount",
    COALESCE((SELECT sum(income)::text FROM filtered), '0') AS income, COALESCE((SELECT sum(expense)::text FROM filtered), '0') AS expense,
    (SELECT count(*)::int FROM filtered) AS "movementCount",
    (SELECT jsonb_agg(currency ORDER BY currency) FROM (
      SELECT currency_code AS currency FROM accounts UNION SELECT ${filters.currency}
      UNION SELECT currency_code FROM pagato.budget_plans WHERE user_id = o.id
      UNION SELECT currency_code FROM pagato.budgets WHERE user_id = o.id
    ) available) AS currencies,
    COALESCE((SELECT jsonb_agg(row_to_json(trend) ORDER BY date) FROM trend), '[]'::jsonb) AS trend,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color, 'amount', amount, 'count', count) ORDER BY position) FROM distribution), '[]'::jsonb) AS distribution,
    COALESCE((SELECT jsonb_agg(to_jsonb(r) - 'income' - 'expense' - 'occurred_at' - 'local_date' ORDER BY r.occurred_at DESC, r.id DESC)
      FROM (SELECT * FROM filtered ORDER BY occurred_at DESC, id DESC LIMIT 5) r), '[]'::jsonb) AS recent,
    COALESCE((SELECT jsonb_agg(row_to_json(b) ORDER BY b.kind DESC, b."periodEnd" DESC, b.id) FROM budget_rows b), '[]'::jsonb) AS budgets,
    (SELECT count(*)::int FROM budget_defs) AS "budgetCount"
    FROM owner o`;
}
export async function getDashboard(sql: Sql, identity: VerifiedIdentity, filters: DashboardFilters, range: DashboardRange): Promise<DashboardData | null> {
  const rows = await dashboardQuery(sql, identity, filters, range);
  return rows[0] ? rows[0] as DashboardData : null;
}
