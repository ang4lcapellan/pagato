import "server-only";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { VerifiedIdentity } from "../../users/server/profile-repository";
import type { TransactionFilters, TransactionHistory, TransactionInput } from "../model";
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

export function historyQuery(sql: Sql, identity: VerifiedIdentity, f: TransactionFilters) {
  // One snapshot for rows and summaries. Aggregate on the server; never download the entire ledger.
  return sql`WITH owner AS (${ownerQuery(sql, identity)}), filtered AS (
    SELECT t.id, t.transaction_type AS type, t.source_account_id AS "sourceAccountId", t.destination_account_id AS "destinationAccountId",
      a.name AS "sourceName", b.name AS "destinationName", a.currency_code AS "sourceCurrency", b.currency_code AS "destinationCurrency",
      t.source_amount::text AS "sourceAmount", t.destination_amount::text AS "destinationAmount",
      t.category_id AS "categoryId", c.name AS "categoryName", c.icon AS "categoryIcon", c.color AS "categoryColor",
      to_char(t.occurred_at AT TIME ZONE owner.timezone, 'YYYY-MM-DD"T"HH24:MI') AS "occurredLocal",
      t.occurred_at, t.description, t.notes, t.payment_method AS "paymentMethod", t.version
    FROM owner JOIN pagato.transactions t ON t.user_id = owner.id
    LEFT JOIN pagato.accounts a ON a.id = t.source_account_id AND a.user_id = t.user_id
    LEFT JOIN pagato.accounts b ON b.id = t.destination_account_id AND b.user_id = t.user_id
    LEFT JOIN pagato.categories c ON c.id = t.category_id AND c.user_id = t.user_id
    WHERE t.deleted_at IS NULL AND (${f.type} = 'all' OR t.transaction_type = ${f.type})
      AND (${f.account || null}::uuid IS NULL OR t.source_account_id = ${f.account || null}::uuid OR t.destination_account_id = ${f.account || null}::uuid)
      AND (${f.category || null}::uuid IS NULL OR t.category_id = ${f.category || null}::uuid)
      AND (${f.from || null}::date IS NULL OR t.occurred_at >= ${f.from || null}::date::timestamp AT TIME ZONE owner.timezone)
      AND (${f.to || null}::date IS NULL OR t.occurred_at < (${f.to || null}::date + 1)::timestamp AT TIME ZONE owner.timezone)
      AND (${f.q} = '' OR strpos(lower(COALESCE(t.description, '')), lower(${f.q})) > 0)
  ), money AS (
    SELECT CASE WHEN type = 'income' THEN "destinationCurrency" ELSE "sourceCurrency" END AS currency,
      CASE WHEN type = 'income' THEN "destinationAmount"::numeric ELSE 0 END AS income,
      CASE WHEN type = 'expense' THEN "sourceAmount"::numeric ELSE 0 END AS expense
    FROM filtered WHERE type <> 'transfer'
  ), totals AS (SELECT currency, sum(income)::text AS income, sum(expense)::text AS expense,
    (sum(income) - sum(expense))::text AS net FROM money GROUP BY currency)
  SELECT owner.timezone, (SELECT count(*)::int FROM filtered) AS count,
    COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY r.occurred_at DESC, r.id DESC) FROM
      (SELECT * FROM filtered ORDER BY occurred_at DESC, id DESC LIMIT 20 OFFSET ${(f.page - 1) * 20}) r), '[]'::jsonb) AS transactions,
    COALESCE((SELECT jsonb_agg(row_to_json(totals) ORDER BY currency) FROM totals), '[]'::jsonb) AS totals FROM owner`;
}
export async function getHistory(sql: Sql, identity: VerifiedIdentity, filters: TransactionFilters): Promise<TransactionHistory | null> {
  const rows = await historyQuery(sql, identity, filters);
  return rows[0] ? rows[0] as TransactionHistory : null;
}

function lockReferences(sql: Sql, identity: VerifiedIdentity, input: TransactionInput) {
  return [
    // Serialize this user's ledger writes, including old accounts when editing or deleting.
    // Other users are independent. Take the mutation snapshot only after acquiring these locks.
    sql`SELECT a.id FROM pagato.accounts a WHERE a.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o)
      ORDER BY a.id FOR UPDATE`,
    sql`SELECT c.id FROM pagato.categories c WHERE c.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o)
      AND c.id = ${input.categoryId}::uuid FOR SHARE`,
  ];
}
function validInput(sql: Sql, identity: VerifiedIdentity, v: TransactionInput) {
  return sql`SELECT o.id, ${v.occurredLocal}::timestamp AT TIME ZONE o.timezone AS occurred_at FROM (${ownerQuery(sql, identity)}) o
    LEFT JOIN pagato.accounts a ON a.id = ${v.sourceAccountId}::uuid AND a.user_id = o.id AND a.status = 'active' AND a.currency_code = ${v.sourceCurrency}
    LEFT JOIN pagato.accounts b ON b.id = ${v.destinationAccountId}::uuid AND b.user_id = o.id AND b.status = 'active' AND b.currency_code = ${v.destinationCurrency}
    LEFT JOIN pagato.categories c ON c.id = ${v.categoryId}::uuid AND c.user_id = o.id AND c.is_active AND c.category_type = ${v.type}
    WHERE (${v.type} = 'income' OR a.id IS NOT NULL) AND (${v.type} = 'expense' OR b.id IS NOT NULL)
      AND (${v.type} = 'transfer' OR c.id IS NOT NULL)
      AND (${v.type} <> 'transfer' OR (a.id <> b.id AND (a.currency_code <> b.currency_code OR ${v.sourceAmount}::numeric = ${v.destinationAmount}::numeric)))
      AND ((${v.occurredLocal}::timestamp AT TIME ZONE o.timezone) AT TIME ZONE o.timezone) = ${v.occurredLocal}::timestamp`;
}
export function createTransactionQueries(sql: Sql, identity: VerifiedIdentity, v: TransactionInput) {
  return [...lockReferences(sql, identity, v),
    sql`INSERT INTO pagato.transactions (id, client_request_id, user_id, transaction_type, source_account_id, destination_account_id,
      source_amount, destination_amount, category_id, occurred_at, description, notes, payment_method)
      SELECT ${v.id}::uuid, ${v.id}::uuid, valid.id, ${v.type}, ${v.sourceAccountId}::uuid, ${v.destinationAccountId}::uuid,
        ${v.sourceAmount}::numeric, ${v.destinationAmount}::numeric, ${v.categoryId}::uuid, valid.occurred_at,
        ${v.description || null}, ${v.notes || null}, ${v.paymentMethod || null} FROM (${validInput(sql, identity, v)}) valid ON CONFLICT DO NOTHING`,
    // Replays must match the original payload. A used key cannot silently stand for another movement.
    sql`SELECT t.id FROM pagato.transactions t JOIN (${ownerQuery(sql, identity)}) o ON o.id = t.user_id
      WHERE t.id = ${v.id}::uuid AND t.client_request_id = ${v.id}::uuid AND t.deleted_at IS NULL AND t.version = 1
        AND t.transaction_type = ${v.type} AND t.source_account_id IS NOT DISTINCT FROM ${v.sourceAccountId}::uuid
        AND t.destination_account_id IS NOT DISTINCT FROM ${v.destinationAccountId}::uuid
        AND t.source_amount IS NOT DISTINCT FROM ${v.sourceAmount}::numeric AND t.destination_amount IS NOT DISTINCT FROM ${v.destinationAmount}::numeric
        AND t.category_id IS NOT DISTINCT FROM ${v.categoryId}::uuid AND t.occurred_at = ${v.occurredLocal}::timestamp AT TIME ZONE o.timezone
        AND t.description IS NOT DISTINCT FROM ${v.description || null} AND t.notes IS NOT DISTINCT FROM ${v.notes || null}
        AND t.payment_method IS NOT DISTINCT FROM ${v.paymentMethod || null}`,
  ];
}
export function updateTransactionQueries(sql: Sql, identity: VerifiedIdentity, v: TransactionInput, version: number) {
  return [...lockReferences(sql, identity, v),
    sql`UPDATE pagato.transactions t SET transaction_type = ${v.type}, source_account_id = ${v.sourceAccountId}::uuid,
      destination_account_id = ${v.destinationAccountId}::uuid, source_amount = ${v.sourceAmount}::numeric,
      destination_amount = ${v.destinationAmount}::numeric, category_id = ${v.categoryId}::uuid, occurred_at = valid.occurred_at,
      description = ${v.description || null}, notes = ${v.notes || null}, payment_method = ${v.paymentMethod || null}, version = t.version + 1
      FROM (${validInput(sql, identity, v)}) valid WHERE t.user_id = valid.id AND t.id = ${v.id}::uuid
        AND t.version = ${version} AND t.deleted_at IS NULL RETURNING t.id`,
  ];
}
export function deleteTransactionQuery(sql: Sql, identity: VerifiedIdentity, id: string, version: number) {
  return sql`UPDATE pagato.transactions t SET deleted_at = now(), version = version + 1
    WHERE t.id = ${id}::uuid AND t.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o)
      AND t.version = ${version} AND t.deleted_at IS NULL RETURNING t.id`;
}
export function lockLedgerQuery(sql: Sql, identity: VerifiedIdentity) {
  return sql`SELECT a.id FROM pagato.accounts a WHERE a.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o) ORDER BY a.id FOR UPDATE`;
}
export function checkBalancesQuery(sql: Sql, identity: VerifiedIdentity) {
  // Force evaluation before COMMIT. A numeric overflow aborts the entire write, not just the next page render.
  return sql`SELECT b.current_balance::numeric(19,4) FROM pagato.account_balances b WHERE b.user_id IN (SELECT id FROM (${ownerQuery(sql, identity)}) o)`;
}
