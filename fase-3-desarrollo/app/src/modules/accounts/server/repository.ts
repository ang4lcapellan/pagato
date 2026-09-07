import "server-only";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { AccountInput, FinancialAccount } from "../model";
import type { VerifiedIdentity } from "../../users/server/profile-repository";

type Sql = NeonQueryFunction<false, false>;
// Every query verifies the live session and financial owner, including mutations.
// The browser supplies an account ID, never a trusted user_id.
function ownerQuery(sql: Sql, identity: VerifiedIdentity) {
  return sql`SELECT p.id FROM pagato.app_users p
    JOIN neon_auth.user u ON u.id::text = p.auth_subject
    JOIN neon_auth.session s ON s."userId" = u.id
    WHERE u.id::text = ${identity.userId} AND s.id::text = ${identity.sessionId}
      AND s."expiresAt" > now() AND (u.banned IS NOT TRUE OR u."banExpires" <= now())
      AND p.status = 'active' AND p.deleted_at IS NULL`;
}
export function listAccountsQuery(sql: Sql, identity: VerifiedIdentity) {
  return sql`WITH owner AS (${ownerQuery(sql, identity)})
    SELECT COALESCE((SELECT jsonb_agg(row_to_json(account) ORDER BY account.name, account.id) FROM (
      SELECT a.id, a.name, a.account_type AS "accountType", a.currency_code AS currency,
        a.opening_balance::text AS "openingBalance", b.current_balance::text AS balance,
        a.credit_limit::text AS "creditLimit", a.institution, a.description, a.color, a.status,
        to_char(a.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS revision,
        EXISTS(SELECT 1 FROM pagato.transactions t WHERE t.user_id = a.user_id
          AND (t.source_account_id = a.id OR t.destination_account_id = a.id)) AS "hasTransactions"
      FROM pagato.accounts a JOIN pagato.account_balances b ON b.account_id = a.id AND b.user_id = a.user_id
      WHERE a.user_id = owner.id
    ) account), '[]'::jsonb) AS accounts FROM owner`;
}
export async function listAccounts(sql: Sql, identity: VerifiedIdentity): Promise<FinancialAccount[] | null> {
  const rows = await listAccountsQuery(sql, identity);
  return rows[0] ? rows[0].accounts as FinancialAccount[] : null;
}
export function createAccountQueries(sql: Sql, identity: VerifiedIdentity, input: AccountInput) {
  return [
    sql`INSERT INTO pagato.accounts (id, user_id, name, account_type, currency_code, opening_balance, credit_limit, institution, description, color)
      SELECT ${input.id}::uuid, owner.id, ${input.name}, ${input.accountType}, ${input.currency},
        ${input.openingBalance}::numeric, ${input.creditLimit}::numeric, ${input.institution || null}, ${input.description || null}, ${input.color}
      FROM (${ownerQuery(sql, identity)}) owner ON CONFLICT (id) DO NOTHING`,
    sql`SELECT a.id FROM pagato.accounts a WHERE a.id = ${input.id}::uuid AND a.user_id IN (${ownerQuery(sql, identity)})`,
  ];
}
export function updateAccountQuery(sql: Sql, identity: VerifiedIdentity, input: AccountInput, revision: string) {
  return sql`UPDATE pagato.accounts a SET name = ${input.name}, account_type = ${input.accountType},
      currency_code = ${input.currency}, opening_balance = ${input.openingBalance}::numeric,
      credit_limit = ${input.creditLimit}::numeric, institution = ${input.institution || null},
      description = ${input.description || null}, color = ${input.color}
    WHERE a.id = ${input.id}::uuid AND a.user_id IN (${ownerQuery(sql, identity)})
      AND a.updated_at = ${revision}::timestamptz
      AND ((a.currency_code = ${input.currency} AND a.account_type = ${input.accountType} AND a.opening_balance = ${input.openingBalance}::numeric)
        OR NOT EXISTS(SELECT 1 FROM pagato.transactions t WHERE t.user_id = a.user_id
          AND (t.source_account_id = a.id OR t.destination_account_id = a.id)))
    RETURNING a.id`;
}
export function lockAccountQuery(sql: Sql, identity: VerifiedIdentity, id: string) {
  return sql`SELECT a.id FROM pagato.accounts a WHERE a.id = ${id}::uuid
    AND a.user_id IN (${ownerQuery(sql, identity)}) FOR UPDATE`;
}
export function accountStatusQuery(sql: Sql, identity: VerifiedIdentity, id: string, revision: string, status: "active" | "archived") {
  return sql`UPDATE pagato.accounts a SET status = ${status}
    WHERE a.id = ${id}::uuid AND a.user_id IN (${ownerQuery(sql, identity)})
      AND a.updated_at = ${revision}::timestamptz RETURNING a.id`;
}
