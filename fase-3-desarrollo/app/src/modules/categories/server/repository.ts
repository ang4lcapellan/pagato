import "server-only";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { VerifiedIdentity } from "../../users/server/profile-repository";
import type { Category, CategoryInput } from "../model";

type Sql = NeonQueryFunction<false, false>;

// Identity comes from the verified server session, never from browser-supplied ownership.
function ownerQuery(sql: Sql, identity: VerifiedIdentity) {
  return sql`SELECT p.id FROM pagato.app_users p
    JOIN neon_auth.user u ON u.id::text = p.auth_subject
    JOIN neon_auth.session s ON s."userId" = u.id
    WHERE u.id::text = ${identity.userId} AND s.id::text = ${identity.sessionId}
      AND s."expiresAt" > now() AND (u.banned IS NOT TRUE OR u."banExpires" <= now())
      AND p.status = 'active' AND p.deleted_at IS NULL`;
}

export function listCategoriesQuery(sql: Sql, identity: VerifiedIdentity) {
  return sql`WITH owner AS (${ownerQuery(sql, identity)})
    SELECT COALESCE((SELECT jsonb_agg(row_to_json(category) ORDER BY category.name, category.id) FROM (
      SELECT c.id, c.name, c.category_type AS "categoryType", c.icon, c.color,
        c.is_default AS "isDefault", c.is_active AS "isActive",
        to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS revision
      FROM pagato.categories c WHERE c.user_id = owner.id
    ) category), '[]'::jsonb) AS categories FROM owner`;
}

export async function listCategories(sql: Sql, identity: VerifiedIdentity): Promise<Category[] | null> {
  const rows = await listCategoriesQuery(sql, identity);
  return rows[0] ? rows[0].categories as Category[] : null;
}

export function createCategoryQueries(sql: Sql, identity: VerifiedIdentity, input: CategoryInput) {
  return [
    sql`INSERT INTO pagato.categories (id, user_id, name, category_type, icon, color, is_default)
      SELECT ${input.id}::uuid, owner.id, ${input.name}, ${input.categoryType}, ${input.icon}, ${input.color}, false
      FROM (${ownerQuery(sql, identity)}) owner ON CONFLICT (id) DO NOTHING`,
    sql`SELECT c.id FROM pagato.categories c WHERE c.id = ${input.id}::uuid
      AND c.user_id IN (${ownerQuery(sql, identity)}) AND NOT c.is_default`,
  ];
}

export function updateCategoryQuery(sql: Sql, identity: VerifiedIdentity, input: CategoryInput, revision: string) {
  // Type and seed code are immutable, including for unused categories. This also avoids
  // a race between changing a category's type and creating its first transaction.
  return sql`UPDATE pagato.categories c SET name = ${input.name}, icon = ${input.icon}, color = ${input.color}
    WHERE c.id = ${input.id}::uuid AND c.user_id IN (${ownerQuery(sql, identity)})
      AND c.category_type = ${input.categoryType} AND c.updated_at = ${revision}::timestamptz
    RETURNING c.id`;
}

export function categoryStatusQuery(sql: Sql, identity: VerifiedIdentity, id: string, revision: string, status: "active" | "inactive") {
  return sql`UPDATE pagato.categories c SET is_active = ${status === "active"}
    WHERE c.id = ${id}::uuid AND c.user_id IN (${ownerQuery(sql, identity)})
      AND c.updated_at = ${revision}::timestamptz RETURNING c.id`;
}
