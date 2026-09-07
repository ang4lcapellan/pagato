import "server-only";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { VerifiedIdentity } from "../../users/server/profile-repository";
import type { BudgetFilters } from "../model";
import type { PlanInput, PlanDetail, PlanList } from "./model";
type Sql = NeonQueryFunction<false, false>;
function ownerQuery(sql: Sql, identity: VerifiedIdentity) {
  return sql`SELECT p.id, COALESCE(z.name, 'UTC') AS timezone FROM pagato.app_users p
    JOIN neon_auth.user u ON u.id::text = p.auth_subject JOIN neon_auth.session s ON s."userId" = u.id
    LEFT JOIN pagato.user_preferences prefs ON prefs.user_id = p.id LEFT JOIN pg_timezone_names z ON z.name = prefs.timezone
    WHERE u.id::text = ${identity.userId} AND s.id::text = ${identity.sessionId} AND s."expiresAt" > now()
      AND (u.banned IS NOT TRUE OR u."banExpires" <= now()) AND p.status = 'active' AND p.deleted_at IS NULL`;
}
function rowsQuery(sql: Sql, identity: VerifiedIdentity, id: string | null, month: string, status: string) {
  return sql`SELECT p.id, p.name, to_char(p.period_start, 'YYYY-MM') AS month, p.currency_code AS currency,
    p.amount::text AS amount, p.expected_income::text AS "expectedIncome", p.period_start::text AS "periodStart", p.period_end::text AS "periodEnd", p.status, p.version,
    COALESCE(a.allocated, 0)::text AS allocated, COALESCE(t.spent, 0)::text AS spent,
    COALESCE(t.category_spent, 0)::text AS "categorySpent", COALESCE(a.count, 0)::int AS "categoryCount"
    FROM (${ownerQuery(sql, identity)}) o JOIN pagato.budget_plans p ON p.user_id = o.id
    LEFT JOIN LATERAL (SELECT sum(b.amount) AS allocated, count(*) AS count FROM pagato.budgets b
      WHERE b.plan_id = p.id AND b.user_id = o.id AND b.status = 'active') a ON true
    LEFT JOIN LATERAL (SELECT sum(t.source_amount) AS spent,
      sum(t.source_amount) FILTER(WHERE EXISTS(SELECT 1 FROM pagato.budgets b WHERE b.plan_id = p.id
        AND b.user_id = o.id AND b.status = 'active' AND b.category_id = t.category_id)) AS category_spent
      FROM pagato.transactions t JOIN pagato.accounts a ON a.id = t.source_account_id AND a.user_id = t.user_id AND a.currency_code = p.currency_code
      WHERE t.user_id = o.id AND t.transaction_type = 'expense' AND t.deleted_at IS NULL
        AND t.occurred_at >= p.period_start::timestamp AT TIME ZONE o.timezone
        AND t.occurred_at < (p.period_end + 1)::timestamp AT TIME ZONE o.timezone) t ON true
    WHERE (${id}::uuid IS NULL OR p.id = ${id}::uuid) AND (${status} = 'all' OR p.status = ${status})
      AND (${month} = '' OR p.period_start = ${month ? `${month}-01` : null}::date)`;
}
export function listPlansQuery(sql: Sql, identity: VerifiedIdentity, filters: BudgetFilters) {
  return sql`WITH filtered AS (${rowsQuery(sql, identity, null, filters.month, filters.status)})
    SELECT (SELECT count(*)::int FROM filtered) AS count,
      COALESCE((SELECT jsonb_agg(row_to_json(p) ORDER BY p."periodStart" DESC, p.id) FROM
        (SELECT * FROM filtered ORDER BY "periodStart" DESC, id LIMIT 12 OFFSET ${(filters.page - 1) * 12}) p), '[]'::jsonb) AS plans
    WHERE EXISTS(${ownerQuery(sql, identity)})`;
}
export async function listPlans(sql: Sql, identity: VerifiedIdentity, filters: BudgetFilters): Promise<PlanList | null> {
  const rows = await listPlansQuery(sql, identity, filters); return rows[0] ? rows[0] as PlanList : null;
}
export function planDetailQuery(sql: Sql, identity: VerifiedIdentity, id: string) {
  return sql`WITH owner AS (${ownerQuery(sql, identity)}), plan AS (${rowsQuery(sql, identity, id, '', 'all')})
    SELECT row_to_json(plan) AS plan, owner.timezone,
    COALESCE((SELECT jsonb_agg(row_to_json(item) ORDER BY item."categoryName", item.id) FROM (
      SELECT b.id, b.name, b.category_id AS "categoryId", b.currency_code AS currency, b.amount::text AS amount,
        b.period_start::text AS "periodStart", b.period_end::text AS "periodEnd", b.status,
        to_char(b.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS revision,
        c.name AS "categoryName", c.icon AS "categoryIcon", c.color AS "categoryColor", c.is_active AS "categoryActive",
        COALESCE((SELECT sum(t.source_amount) FROM pagato.transactions t JOIN pagato.accounts a
          ON a.id = t.source_account_id AND a.user_id = t.user_id AND a.currency_code = b.currency_code
          WHERE t.user_id = owner.id AND t.category_id = b.category_id AND t.transaction_type = 'expense' AND t.deleted_at IS NULL
            AND t.occurred_at >= b.period_start::timestamp AT TIME ZONE owner.timezone
            AND t.occurred_at < (b.period_end + 1)::timestamp AT TIME ZONE owner.timezone), 0)::text AS spent
      FROM pagato.budgets b JOIN pagato.categories c ON c.id = b.category_id AND c.user_id = b.user_id
      WHERE b.user_id = owner.id AND b.plan_id = plan.id AND b.status = 'active'
    ) item), '[]'::jsonb) AS budgets FROM plan CROSS JOIN owner`;
}
export async function getPlan(sql: Sql, identity: VerifiedIdentity, id: string): Promise<PlanDetail | null> {
  const rows = await planDetailQuery(sql, identity, id); return rows[0] ? rows[0] as PlanDetail : null;
}
function lockOwner(sql: Sql, identity: VerifiedIdentity) {
  return sql`SELECT p.id FROM pagato.app_users p WHERE p.id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o) FOR UPDATE`;
}
export function savePlanQueries(sql: Sql, identity: VerifiedIdentity, v: PlanInput, source?: { id: string; version: number }) {
  const items = JSON.stringify(v.allocations);
  const fingerprint = JSON.stringify({ name: v.name, month: v.month, currency: v.currency, amount: v.amount,
    expectedIncome: v.expectedIncome, allocations: v.allocations, source: source ?? null });
  return [lockOwner(sql, identity),
    sql`SELECT c.id FROM pagato.categories c WHERE c.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o)
      AND c.id IN (SELECT "categoryId" FROM jsonb_to_recordset(${items}::jsonb) AS a("categoryId" uuid, amount numeric)) ORDER BY c.id FOR SHARE`,
    sql`WITH input AS (SELECT * FROM jsonb_to_recordset(${items}::jsonb) AS a("categoryId" uuid, amount numeric)),
    valid AS (SELECT o.id FROM (${ownerQuery(sql, identity)}) o WHERE
      (SELECT count(*) FROM input) <= 100 AND (SELECT count(DISTINCT "categoryId") FROM input) = (SELECT count(*) FROM input)
      AND NOT EXISTS(SELECT 1 FROM input WHERE amount IS NULL OR amount <= 0)
      AND COALESCE((SELECT sum(amount) FROM input), 0) <= ${v.amount}::numeric
      AND NOT EXISTS(SELECT 1 FROM input i WHERE NOT EXISTS(SELECT 1 FROM pagato.categories c
        WHERE c.id = i."categoryId" AND c.user_id = o.id AND c.is_active AND c.category_type = 'expense'))
      AND (${source?.id ?? null}::uuid IS NULL OR EXISTS(SELECT 1 FROM pagato.budget_plans src
        WHERE src.id = ${source?.id ?? null}::uuid AND src.user_id = o.id AND src.version = ${source?.version ?? null}::int))
      AND (${v.mode} = 'create' OR EXISTS(SELECT 1 FROM pagato.budget_plans p WHERE p.id = ${v.id}::uuid AND p.user_id = o.id AND p.status = 'active'))
    ), saved AS (
      INSERT INTO pagato.budget_plans AS p (id, user_id, name, currency_code, amount, expected_income, period_start, period_end, last_request_id, last_request_hash)
      SELECT ${v.id}::uuid, valid.id, ${v.name}, ${v.currency}, ${v.amount}::numeric, ${v.expectedIncome || null}::numeric,
        ${`${v.month}-01`}::date, (${`${v.month}-01`}::date + interval '1 month' - interval '1 day')::date,
        ${v.requestId}::uuid, md5(${fingerprint}::jsonb::text) FROM valid
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, amount = EXCLUDED.amount, expected_income = EXCLUDED.expected_income,
        last_request_id = EXCLUDED.last_request_id, last_request_hash = EXCLUDED.last_request_hash, updated_at = clock_timestamp(),
        version = CASE WHEN p.last_request_id = EXCLUDED.last_request_id THEN p.version ELSE p.version + 1 END
      WHERE p.user_id = EXCLUDED.user_id AND p.status = 'active' AND p.currency_code = EXCLUDED.currency_code AND p.period_start = EXCLUDED.period_start
        AND ((p.last_request_id = EXCLUDED.last_request_id AND p.last_request_hash = EXCLUDED.last_request_hash)
          OR (${v.mode} = 'edit' AND p.version = ${v.version} AND p.last_request_id <> EXCLUDED.last_request_id))
      RETURNING p.id, p.user_id, p.currency_code, p.period_start, p.period_end, p.version
    ), removed AS (
      UPDATE pagato.budgets b SET status = 'archived' FROM saved p WHERE b.plan_id = p.id AND b.user_id = p.user_id
        AND b.status = 'active' AND NOT EXISTS(SELECT 1 FROM input i WHERE i."categoryId" = b.category_id) RETURNING b.id
    ), allocated AS (
      INSERT INTO pagato.budgets (id, user_id, plan_id, category_id, name, amount, currency_code, period_start, period_end)
      SELECT gen_random_uuid(), p.user_id, p.id, c.id, c.name, i.amount, p.currency_code, p.period_start, p.period_end
      FROM saved p CROSS JOIN input i JOIN pagato.categories c ON c.id = i."categoryId" AND c.user_id = p.user_id
      ON CONFLICT (plan_id, category_id) WHERE plan_id IS NOT NULL DO UPDATE SET amount = EXCLUDED.amount, name = EXCLUDED.name, status = 'active'
      RETURNING id
    ) SELECT id, version FROM saved`];
}
export function planStatusQueries(sql: Sql, identity: VerifiedIdentity, id: string, version: number, status: "active" | "archived") {
  return [lockOwner(sql, identity), sql`UPDATE pagato.budget_plans p SET status = ${status}, version = version + 1, updated_at = clock_timestamp(), last_request_id = gen_random_uuid()
    WHERE p.id = ${id}::uuid AND p.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o)
      AND p.version = ${version} AND p.status <> ${status} RETURNING p.id, p.version`];
}
