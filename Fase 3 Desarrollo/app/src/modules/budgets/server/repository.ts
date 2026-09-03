import "server-only";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { VerifiedIdentity } from "../../users/server/profile-repository";
import type { BudgetFilters, BudgetInput, BudgetList } from "../model";
type Sql = NeonQueryFunction<false, false>;

function ownerQuery(sql: Sql, identity: VerifiedIdentity) {
  return sql`SELECT p.id, COALESCE(z.name, 'UTC') AS timezone FROM pagato.app_users p
    JOIN neon_auth.user u ON u.id::text = p.auth_subject JOIN neon_auth.session s ON s."userId" = u.id
    LEFT JOIN pagato.user_preferences prefs ON prefs.user_id = p.id
    LEFT JOIN pg_timezone_names z ON z.name = prefs.timezone
    WHERE u.id::text = ${identity.userId} AND s.id::text = ${identity.sessionId}
      AND s."expiresAt" > now() AND (u.banned IS NOT TRUE OR u."banExpires" <= now())
      AND p.status = 'active' AND p.deleted_at IS NULL`;
}
export function listBudgetsQuery(sql: Sql, identity: VerifiedIdentity, f: BudgetFilters) {
  // Compute from the live ledger in one snapshot. Date bounds use the user's zone and indexable timestamps.
  // Do not cap percentages or cast sums back to numeric(19,4): valid expense totals may exceed that range.
  return sql`WITH owner AS (${ownerQuery(sql, identity)}), filtered AS (
    SELECT b.id, b.name, b.category_id AS "categoryId", b.currency_code AS currency, b.amount::text AS amount,
      b.period_start::text AS "periodStart", b.period_end::text AS "periodEnd", b.status,
      to_char(b.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS revision,
      c.name AS "categoryName", c.icon AS "categoryIcon", c.color AS "categoryColor", c.is_active AS "categoryActive",
      COALESCE(spending.spent, 0)::text AS spent
    FROM owner JOIN pagato.budgets b ON b.user_id = owner.id
    JOIN pagato.categories c ON c.id = b.category_id AND c.user_id = b.user_id
    LEFT JOIN LATERAL (
      SELECT sum(t.source_amount) AS spent FROM pagato.transactions t
      JOIN pagato.accounts a ON a.id = t.source_account_id AND a.user_id = t.user_id AND a.currency_code = b.currency_code
      WHERE t.user_id = owner.id AND t.category_id = b.category_id AND t.transaction_type = 'expense' AND t.deleted_at IS NULL
        AND t.occurred_at >= b.period_start::timestamp AT TIME ZONE owner.timezone
        AND t.occurred_at < (b.period_end + 1)::timestamp AT TIME ZONE owner.timezone
    ) spending ON true
    WHERE b.plan_id IS NULL AND (${f.status} = 'all' OR b.status = ${f.status})
      AND (${f.month} = '' OR (b.period_start < ((${f.month ? `${f.month}-01` : null}::date + interval '1 month')::date)
        AND b.period_end >= ${f.month ? `${f.month}-01` : null}::date))
  ), totals AS (
    SELECT currency, sum(amount::numeric)::text AS amount, sum(spent::numeric)::text AS spent, count(*)::int AS count
    FROM filtered GROUP BY currency
  ) SELECT owner.timezone, (SELECT count(*)::int FROM filtered) AS count,
    COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY r."periodStart" DESC, r.name, r.id)
      FROM (SELECT * FROM filtered ORDER BY "periodStart" DESC, name, id LIMIT 12 OFFSET ${(f.page - 1) * 12}) r), '[]'::jsonb) AS budgets,
    COALESCE((SELECT jsonb_agg(row_to_json(totals) ORDER BY currency) FROM totals), '[]'::jsonb) AS totals FROM owner`;
}
export async function listBudgets(sql: Sql, identity: VerifiedIdentity, filters: BudgetFilters): Promise<BudgetList | null> {
  const rows = await listBudgetsQuery(sql, identity, filters);
  return rows[0] ? rows[0] as BudgetList : null;
}
function lockOwnerQuery(sql: Sql, identity: VerifiedIdentity) {
  // Serialize budget mutations for this user; the next statement takes a fresh ReadCommitted snapshot.
  return sql`SELECT p.id FROM pagato.app_users p WHERE p.id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o) FOR UPDATE`;
}
function lockCategoryQuery(sql: Sql, identity: VerifiedIdentity, categoryId: string) {
  return sql`SELECT c.id FROM pagato.categories c WHERE c.id = ${categoryId}::uuid
    AND c.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o) FOR SHARE`;
}
function validInput(sql: Sql, identity: VerifiedIdentity, v: BudgetInput) {
  return sql`SELECT o.id FROM (${ownerQuery(sql, identity)}) o
    JOIN pagato.categories c ON c.id = ${v.categoryId}::uuid AND c.user_id = o.id AND c.category_type = 'expense' AND c.is_active
    WHERE NOT EXISTS (SELECT 1 FROM pagato.budgets b WHERE b.user_id = o.id AND b.id <> ${v.id}::uuid
      AND b.plan_id IS NULL AND b.status = 'active' AND b.category_id = c.id AND b.currency_code = ${v.currency}
      AND b.period_start <= ${v.periodEnd}::date AND b.period_end >= ${v.periodStart}::date)`;
}
export function createBudgetQueries(sql: Sql, identity: VerifiedIdentity, v: BudgetInput) {
  return [lockOwnerQuery(sql, identity), lockCategoryQuery(sql, identity, v.categoryId),
    sql`INSERT INTO pagato.budgets (id, user_id, category_id, name, amount, currency_code, period_start, period_end)
      SELECT ${v.id}::uuid, o.id, ${v.categoryId}::uuid, ${v.name}, ${v.amount}::numeric, ${v.currency}, ${v.periodStart}::date, ${v.periodEnd}::date
      FROM (${validInput(sql, identity, v)}) o ON CONFLICT DO NOTHING`,
    sql`SELECT b.id FROM pagato.budgets b WHERE b.id = ${v.id}::uuid AND b.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o)
      AND b.plan_id IS NULL AND b.status = 'active' AND b.category_id = ${v.categoryId}::uuid AND b.name = ${v.name} AND b.amount = ${v.amount}::numeric
      AND b.currency_code = ${v.currency} AND b.period_start = ${v.periodStart}::date AND b.period_end = ${v.periodEnd}::date`,
  ];
}
export function updateBudgetQueries(sql: Sql, identity: VerifiedIdentity, v: BudgetInput, revision: string) {
  return [lockOwnerQuery(sql, identity), lockCategoryQuery(sql, identity, v.categoryId),
    sql`UPDATE pagato.budgets b SET name = ${v.name}, category_id = ${v.categoryId}::uuid, amount = ${v.amount}::numeric,
      currency_code = ${v.currency}, period_start = ${v.periodStart}::date, period_end = ${v.periodEnd}::date
      FROM (${validInput(sql, identity, v)}) o WHERE b.user_id = o.id AND b.id = ${v.id}::uuid
        AND b.plan_id IS NULL AND b.updated_at = ${revision}::timestamptz AND b.status = 'active' RETURNING b.id`,
  ];
}
export function budgetStatusQueries(sql: Sql, identity: VerifiedIdentity, id: string, revision: string, status: "active" | "archived") {
  return [lockOwnerQuery(sql, identity),
    sql`SELECT c.id FROM pagato.categories c JOIN pagato.budgets b ON b.category_id = c.id AND b.user_id = c.user_id
      WHERE b.id = ${id}::uuid AND b.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o) FOR SHARE OF c`,
    sql`UPDATE pagato.budgets b SET status = ${status} WHERE b.id = ${id}::uuid
      AND b.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o) AND b.updated_at = ${revision}::timestamptz
      AND b.plan_id IS NULL AND b.status <> ${status}
      AND (${status} = 'archived' OR (
        EXISTS(SELECT 1 FROM pagato.categories c WHERE c.id = b.category_id AND c.user_id = b.user_id AND c.category_type = 'expense' AND c.is_active)
        AND NOT EXISTS(SELECT 1 FROM pagato.budgets other WHERE other.user_id = b.user_id AND other.id <> b.id
          AND other.plan_id IS NULL AND other.status = 'active' AND other.category_id = b.category_id AND other.currency_code = b.currency_code
          AND other.period_start <= b.period_end AND other.period_end >= b.period_start))) RETURNING b.id`,
  ];
}
