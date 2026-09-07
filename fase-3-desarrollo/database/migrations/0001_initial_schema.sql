BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS pagato;

CREATE OR REPLACE FUNCTION pagato.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('pagato.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION pagato.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS pagato.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  email citext NOT NULL UNIQUE,
  display_name varchar(120) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT app_users_display_name_not_blank
    CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
  CONSTRAINT app_users_status_valid
    CHECK (status IN ('active', 'suspended', 'deleted')),
  CONSTRAINT app_users_deleted_state_valid
    CHECK (
      (status = 'deleted' AND deleted_at IS NOT NULL)
      OR (status <> 'deleted' AND deleted_at IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS pagato.user_preferences (
  user_id uuid PRIMARY KEY
    REFERENCES pagato.app_users(id) ON DELETE CASCADE,
  theme varchar(10) NOT NULL DEFAULT 'system',
  locale varchar(10) NOT NULL DEFAULT 'es',
  base_currency varchar(3) NOT NULL DEFAULT 'DOP',
  timezone varchar(64) NOT NULL DEFAULT 'America/Santo_Domingo',
  date_format varchar(20) NOT NULL DEFAULT 'DD/MM/YYYY',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_theme_valid
    CHECK (theme IN ('light', 'dark', 'system')),
  CONSTRAINT user_preferences_locale_valid
    CHECK (locale IN ('es', 'en')),
  CONSTRAINT user_preferences_currency_valid
    CHECK (base_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT user_preferences_timezone_not_blank
    CHECK (length(btrim(timezone)) BETWEEN 1 AND 64)
);

CREATE TABLE IF NOT EXISTS pagato.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES pagato.app_users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  account_type varchar(24) NOT NULL,
  currency_code varchar(3) NOT NULL,
  opening_balance numeric(19,4) NOT NULL DEFAULT 0,
  credit_limit numeric(19,4),
  institution varchar(120),
  description varchar(500),
  color varchar(7),
  icon varchar(50),
  status varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_id_user_unique UNIQUE (id, user_id),
  CONSTRAINT accounts_name_not_blank
    CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  CONSTRAINT accounts_type_valid
    CHECK (account_type IN (
      'cash', 'bank', 'savings', 'credit_card',
      'digital_wallet', 'investment', 'other'
    )),
  CONSTRAINT accounts_currency_valid
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT accounts_credit_limit_valid
    CHECK (credit_limit IS NULL OR credit_limit >= 0),
  CONSTRAINT accounts_color_valid
    CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT accounts_status_valid
    CHECK (status IN ('active', 'archived'))
);

CREATE TABLE IF NOT EXISTS pagato.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES pagato.app_users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  category_type varchar(10) NOT NULL,
  code varchar(60),
  icon varchar(50),
  color varchar(7),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_id_user_unique UNIQUE (id, user_id),
  CONSTRAINT categories_name_not_blank
    CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT categories_type_valid
    CHECK (category_type IN ('income', 'expense')),
  CONSTRAINT categories_code_valid
    CHECK (code IS NULL OR code ~ '^[a-z0-9_]{2,60}$'),
  CONSTRAINT categories_color_valid
    CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT categories_default_code_required
    CHECK (NOT is_default OR code IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS pagato.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES pagato.app_users(id) ON DELETE CASCADE,
  transaction_type varchar(10) NOT NULL,
  source_account_id uuid,
  destination_account_id uuid,
  source_amount numeric(19,4),
  destination_amount numeric(19,4),
  category_id uuid,
  occurred_at timestamptz NOT NULL,
  description varchar(240),
  payment_method varchar(50),
  notes varchar(1000),
  client_request_id uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT transactions_id_user_unique UNIQUE (id, user_id),
  CONSTRAINT transactions_source_account_owner_fk
    FOREIGN KEY (source_account_id, user_id)
    REFERENCES pagato.accounts(id, user_id) ON DELETE RESTRICT,
  CONSTRAINT transactions_destination_account_owner_fk
    FOREIGN KEY (destination_account_id, user_id)
    REFERENCES pagato.accounts(id, user_id) ON DELETE RESTRICT,
  CONSTRAINT transactions_category_owner_fk
    FOREIGN KEY (category_id, user_id)
    REFERENCES pagato.categories(id, user_id) ON DELETE RESTRICT,
  CONSTRAINT transactions_type_valid
    CHECK (transaction_type IN ('income', 'expense', 'transfer')),
  CONSTRAINT transactions_version_valid
    CHECK (version > 0),
  CONSTRAINT transactions_description_valid
    CHECK (description IS NULL OR length(btrim(description)) BETWEEN 1 AND 240),
  CONSTRAINT transactions_shape_valid
    CHECK (
      (
        transaction_type = 'expense'
        AND source_account_id IS NOT NULL
        AND destination_account_id IS NULL
        AND source_amount > 0
        AND destination_amount IS NULL
        AND category_id IS NOT NULL
      )
      OR
      (
        transaction_type = 'income'
        AND source_account_id IS NULL
        AND destination_account_id IS NOT NULL
        AND source_amount IS NULL
        AND destination_amount > 0
        AND category_id IS NOT NULL
      )
      OR
      (
        transaction_type = 'transfer'
        AND source_account_id IS NOT NULL
        AND destination_account_id IS NOT NULL
        AND source_account_id <> destination_account_id
        AND source_amount > 0
        AND destination_amount > 0
        AND category_id IS NULL
      )
    )
);

CREATE TABLE IF NOT EXISTS pagato.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES pagato.app_users(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  color varchar(7),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_id_user_unique UNIQUE (id, user_id),
  CONSTRAINT tags_name_not_blank
    CHECK (length(btrim(name)) BETWEEN 1 AND 50),
  CONSTRAINT tags_color_valid
    CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE IF NOT EXISTS pagato.transaction_tags (
  transaction_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (transaction_id, tag_id),
  CONSTRAINT transaction_tags_transaction_owner_fk
    FOREIGN KEY (transaction_id, user_id)
    REFERENCES pagato.transactions(id, user_id) ON DELETE CASCADE,
  CONSTRAINT transaction_tags_tag_owner_fk
    FOREIGN KEY (tag_id, user_id)
    REFERENCES pagato.tags(id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pagato.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES pagato.app_users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL,
  name varchar(100) NOT NULL,
  amount numeric(19,4) NOT NULL,
  currency_code varchar(3) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budgets_id_user_unique UNIQUE (id, user_id),
  CONSTRAINT budgets_category_owner_fk
    FOREIGN KEY (category_id, user_id)
    REFERENCES pagato.categories(id, user_id) ON DELETE RESTRICT,
  CONSTRAINT budgets_name_not_blank
    CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  CONSTRAINT budgets_amount_valid
    CHECK (amount > 0),
  CONSTRAINT budgets_currency_valid
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT budgets_period_valid
    CHECK (period_end >= period_start),
  CONSTRAINT budgets_status_valid
    CHECK (status IN ('active', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_type_name_uq
  ON pagato.categories (user_id, category_type, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS categories_default_code_uq
  ON pagato.categories (user_id, category_type, code)
  WHERE code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_uq
  ON pagato.tags (user_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS transactions_client_request_uq
  ON pagato.transactions (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS budgets_active_period_uq
  ON pagato.budgets (
    user_id, category_id, currency_code, period_start, period_end
  )
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS accounts_user_status_idx
  ON pagato.accounts (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS categories_user_type_active_idx
  ON pagato.categories (user_id, category_type, is_active, name);

CREATE INDEX IF NOT EXISTS transactions_user_occurred_idx
  ON pagato.transactions (user_id, occurred_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS transactions_source_account_idx
  ON pagato.transactions (user_id, source_account_id, occurred_at DESC)
  WHERE deleted_at IS NULL AND source_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_destination_account_idx
  ON pagato.transactions (user_id, destination_account_id, occurred_at DESC)
  WHERE deleted_at IS NULL AND destination_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_category_idx
  ON pagato.transactions (user_id, category_id, occurred_at DESC)
  WHERE deleted_at IS NULL AND category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS budgets_user_period_idx
  ON pagato.budgets (user_id, period_start, period_end, status);

CREATE OR REPLACE FUNCTION pagato.validate_transaction_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_type varchar(10);
BEGIN
  IF NEW.transaction_type = 'transfer' THEN
    RETURN NEW;
  END IF;

  expected_type := NEW.transaction_type;

  IF NOT EXISTS (
    SELECT 1
    FROM pagato.categories c
    WHERE c.id = NEW.category_id
      AND c.user_id = NEW.user_id
      AND c.category_type = expected_type
      AND c.is_active
  ) THEN
    RAISE EXCEPTION 'The category is not valid for this transaction type'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION pagato.validate_budget_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pagato.categories c
    WHERE c.id = NEW.category_id
      AND c.user_id = NEW.user_id
      AND c.category_type = 'expense'
      AND c.is_active
  ) THEN
    RAISE EXCEPTION 'A budget requires an active expense category'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_users_set_updated_at ON pagato.app_users;
CREATE TRIGGER app_users_set_updated_at
BEFORE UPDATE ON pagato.app_users
FOR EACH ROW EXECUTE FUNCTION pagato.set_updated_at();

DROP TRIGGER IF EXISTS user_preferences_set_updated_at ON pagato.user_preferences;
CREATE TRIGGER user_preferences_set_updated_at
BEFORE UPDATE ON pagato.user_preferences
FOR EACH ROW EXECUTE FUNCTION pagato.set_updated_at();

DROP TRIGGER IF EXISTS accounts_set_updated_at ON pagato.accounts;
CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON pagato.accounts
FOR EACH ROW EXECUTE FUNCTION pagato.set_updated_at();

DROP TRIGGER IF EXISTS categories_set_updated_at ON pagato.categories;
CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON pagato.categories
FOR EACH ROW EXECUTE FUNCTION pagato.set_updated_at();

DROP TRIGGER IF EXISTS transactions_set_updated_at ON pagato.transactions;
CREATE TRIGGER transactions_set_updated_at
BEFORE UPDATE ON pagato.transactions
FOR EACH ROW EXECUTE FUNCTION pagato.set_updated_at();

DROP TRIGGER IF EXISTS transactions_validate_category ON pagato.transactions;
CREATE TRIGGER transactions_validate_category
BEFORE INSERT OR UPDATE OF transaction_type, category_id, user_id
ON pagato.transactions
FOR EACH ROW EXECUTE FUNCTION pagato.validate_transaction_category();

DROP TRIGGER IF EXISTS tags_set_updated_at ON pagato.tags;
CREATE TRIGGER tags_set_updated_at
BEFORE UPDATE ON pagato.tags
FOR EACH ROW EXECUTE FUNCTION pagato.set_updated_at();

DROP TRIGGER IF EXISTS budgets_set_updated_at ON pagato.budgets;
CREATE TRIGGER budgets_set_updated_at
BEFORE UPDATE ON pagato.budgets
FOR EACH ROW EXECUTE FUNCTION pagato.set_updated_at();

DROP TRIGGER IF EXISTS budgets_validate_category ON pagato.budgets;
CREATE TRIGGER budgets_validate_category
BEFORE INSERT OR UPDATE OF category_id, user_id
ON pagato.budgets
FOR EACH ROW EXECUTE FUNCTION pagato.validate_budget_category();

CREATE OR REPLACE FUNCTION pagato.seed_default_categories(p_user_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO pagato.categories (
    user_id, name, category_type, code, icon, color, is_default
  )
  VALUES
    (p_user_id, 'Salario', 'income', 'salary', 'wallet-cards', '#12A683', true),
    (p_user_id, 'Otros ingresos', 'income', 'other_income', 'circle-plus', '#2F80ED', true),
    (p_user_id, 'Alimentación', 'expense', 'food', 'utensils', '#F2994A', true),
    (p_user_id, 'Transporte', 'expense', 'transport', 'bus', '#2F80ED', true),
    (p_user_id, 'Vivienda', 'expense', 'housing', 'house', '#9B51E0', true),
    (p_user_id, 'Servicios', 'expense', 'utilities', 'receipt', '#56CCF2', true),
    (p_user_id, 'Salud', 'expense', 'health', 'heart-pulse', '#EB5757', true),
    (p_user_id, 'Educación', 'expense', 'education', 'graduation-cap', '#6FCF97', true),
    (p_user_id, 'Entretenimiento', 'expense', 'entertainment', 'popcorn', '#BB6BD9', true),
    (p_user_id, 'Otros gastos', 'expense', 'other_expense', 'ellipsis', '#828282', true)
  ON CONFLICT DO NOTHING;
$$;

CREATE OR REPLACE VIEW pagato.account_balances
WITH (security_invoker = true)
AS
SELECT
  a.id AS account_id,
  a.user_id,
  a.currency_code,
  a.opening_balance
    + COALESCE(SUM(
      CASE
        WHEN t.transaction_type = 'income'
          AND t.destination_account_id = a.id
          THEN t.destination_amount
        WHEN t.transaction_type = 'transfer'
          AND t.destination_account_id = a.id
          THEN t.destination_amount
        WHEN t.transaction_type = 'expense'
          AND t.source_account_id = a.id
          THEN -t.source_amount
        WHEN t.transaction_type = 'transfer'
          AND t.source_account_id = a.id
          THEN -t.source_amount
        ELSE 0
      END
    ), 0)::numeric(19,4) AS current_balance
FROM pagato.accounts a
LEFT JOIN pagato.transactions t
  ON t.user_id = a.user_id
 AND t.deleted_at IS NULL
 AND (
   t.source_account_id = a.id
   OR t.destination_account_id = a.id
 )
GROUP BY a.id, a.user_id, a.currency_code, a.opening_balance;

CREATE OR REPLACE VIEW pagato.budget_progress
WITH (security_invoker = true)
AS
SELECT
  b.id AS budget_id,
  b.user_id,
  b.category_id,
  b.currency_code,
  b.amount AS budget_amount,
  COALESCE(
    SUM(t.source_amount) FILTER (WHERE a.id IS NOT NULL),
    0
  )::numeric(19,4) AS spent_amount,
  GREATEST(
    b.amount - COALESCE(
      SUM(t.source_amount) FILTER (WHERE a.id IS NOT NULL),
      0
    ),
    0
  )::numeric(19,4)
    AS available_amount,
  LEAST(
    (
      COALESCE(
        SUM(t.source_amount) FILTER (WHERE a.id IS NOT NULL),
        0
      ) / NULLIF(b.amount, 0)
    ) * 100,
    999.99
  )::numeric(6,2) AS used_percentage
FROM pagato.budgets b
LEFT JOIN pagato.user_preferences p
  ON p.user_id = b.user_id
LEFT JOIN pagato.transactions t
  ON t.user_id = b.user_id
 AND t.category_id = b.category_id
 AND t.transaction_type = 'expense'
 AND t.deleted_at IS NULL
 AND (
   t.occurred_at AT TIME ZONE COALESCE(p.timezone, 'UTC')
 )::date BETWEEN b.period_start AND b.period_end
LEFT JOIN pagato.accounts a
  ON a.id = t.source_account_id
 AND a.user_id = t.user_id
 AND a.currency_code = b.currency_code
GROUP BY
  b.id, b.user_id, b.category_id, b.currency_code, b.amount;

ALTER TABLE pagato.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.app_users FORCE ROW LEVEL SECURITY;
ALTER TABLE pagato.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.user_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE pagato.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE pagato.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE pagato.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE pagato.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.tags FORCE ROW LEVEL SECURITY;
ALTER TABLE pagato.transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.transaction_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE pagato.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.budgets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_users_isolation ON pagato.app_users;
CREATE POLICY app_users_isolation ON pagato.app_users
FOR ALL
USING (id = pagato.current_user_id())
WITH CHECK (id = pagato.current_user_id());

DROP POLICY IF EXISTS user_preferences_isolation ON pagato.user_preferences;
CREATE POLICY user_preferences_isolation ON pagato.user_preferences
FOR ALL
USING (user_id = pagato.current_user_id())
WITH CHECK (user_id = pagato.current_user_id());

DROP POLICY IF EXISTS accounts_isolation ON pagato.accounts;
CREATE POLICY accounts_isolation ON pagato.accounts
FOR ALL
USING (user_id = pagato.current_user_id())
WITH CHECK (user_id = pagato.current_user_id());

DROP POLICY IF EXISTS categories_isolation ON pagato.categories;
CREATE POLICY categories_isolation ON pagato.categories
FOR ALL
USING (user_id = pagato.current_user_id())
WITH CHECK (user_id = pagato.current_user_id());

DROP POLICY IF EXISTS transactions_isolation ON pagato.transactions;
CREATE POLICY transactions_isolation ON pagato.transactions
FOR ALL
USING (user_id = pagato.current_user_id())
WITH CHECK (user_id = pagato.current_user_id());

DROP POLICY IF EXISTS tags_isolation ON pagato.tags;
CREATE POLICY tags_isolation ON pagato.tags
FOR ALL
USING (user_id = pagato.current_user_id())
WITH CHECK (user_id = pagato.current_user_id());

DROP POLICY IF EXISTS transaction_tags_isolation ON pagato.transaction_tags;
CREATE POLICY transaction_tags_isolation ON pagato.transaction_tags
FOR ALL
USING (user_id = pagato.current_user_id())
WITH CHECK (user_id = pagato.current_user_id());

DROP POLICY IF EXISTS budgets_isolation ON pagato.budgets;
CREATE POLICY budgets_isolation ON pagato.budgets
FOR ALL
USING (user_id = pagato.current_user_id())
WITH CHECK (user_id = pagato.current_user_id());

COMMIT;
