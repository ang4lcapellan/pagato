BEGIN;

CREATE TABLE pagato.budget_plans (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES pagato.app_users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  currency_code varchar(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  amount numeric(19,4) NOT NULL CHECK (amount > 0),
  expected_income numeric(19,4) CHECK (expected_income >= 0),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  last_request_id uuid NOT NULL,
  last_request_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_plans_month_valid CHECK (
    extract(day FROM period_start) = 1
    AND period_end = (period_start + interval '1 month' - interval '1 day')::date
  ),
  CONSTRAINT budget_plans_owner_unique UNIQUE (id, user_id),
  CONSTRAINT budget_plans_scope_unique UNIQUE (id, user_id, currency_code, period_start, period_end)
);

CREATE UNIQUE INDEX budget_plans_active_month_uq ON pagato.budget_plans(user_id, currency_code, period_start) WHERE status = 'active';
CREATE INDEX budget_plans_user_month_idx ON pagato.budget_plans(user_id, period_start DESC, id);

ALTER TABLE pagato.budgets ADD COLUMN plan_id uuid;
ALTER TABLE pagato.budgets ADD CONSTRAINT budgets_plan_scope_fk
  FOREIGN KEY (plan_id, user_id, currency_code, period_start, period_end)
  REFERENCES pagato.budget_plans(id, user_id, currency_code, period_start, period_end) ON DELETE RESTRICT;

DROP INDEX pagato.budgets_active_period_uq;
CREATE UNIQUE INDEX budgets_active_period_uq ON pagato.budgets(user_id, category_id, currency_code, period_start, period_end)
  WHERE status = 'active' AND plan_id IS NULL;
CREATE UNIQUE INDEX budgets_plan_category_uq ON pagato.budgets(plan_id, category_id) WHERE plan_id IS NOT NULL;

ALTER TABLE pagato.budget_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagato.budget_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY budget_plans_isolation ON pagato.budget_plans FOR ALL
  USING (user_id = pagato.current_user_id()) WITH CHECK (user_id = pagato.current_user_id());

COMMIT;
