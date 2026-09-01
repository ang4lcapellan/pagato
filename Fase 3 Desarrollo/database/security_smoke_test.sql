-- Transactional security smoke test for the Neon development branch.
-- The final ROLLBACK guarantees that no test data remains.

BEGIN;

-- Neon migration roles can bypass RLS. This ephemeral role reproduces the
-- permissions required by the application runtime and is rolled back later.
CREATE ROLE pagato_smoke_runtime NOLOGIN NOBYPASSRLS;
GRANT pagato_smoke_runtime TO CURRENT_USER;
GRANT USAGE ON SCHEMA pagato TO pagato_smoke_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA pagato
  TO pagato_smoke_runtime;

SELECT set_config('pagato.user_id', '11111111-1111-4111-8111-111111111111', true);

INSERT INTO pagato.app_users (id, auth_subject, email, display_name)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'smoke-test-user-a',
  'smoke-a@example.invalid',
  'Smoke Test A'
);

INSERT INTO pagato.accounts (
  id, user_id, name, account_type, currency_code, opening_balance
)
VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'Account A',
  'bank',
  'DOP',
  1000.0000
);

SELECT set_config('pagato.user_id', '22222222-2222-4222-8222-222222222222', true);

INSERT INTO pagato.app_users (id, auth_subject, email, display_name)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'smoke-test-user-b',
  'smoke-b@example.invalid',
  'Smoke Test B'
);

INSERT INTO pagato.accounts (
  id, user_id, name, account_type, currency_code, opening_balance
)
VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  'Account B',
  'bank',
  'DOP',
  2000.0000
);

SET LOCAL ROLE pagato_smoke_runtime;
SELECT set_config('pagato.user_id', '11111111-1111-4111-8111-111111111111', true);

DO $$
DECLARE
  visible_accounts integer;
  affected_rows integer;
  cross_owner_reference_blocked boolean := false;
BEGIN
  SELECT count(*) INTO visible_accounts
  FROM pagato.accounts;

  IF visible_accounts <> 1 THEN
    RAISE EXCEPTION 'RLS visibility test failed: expected 1 account, found %', visible_accounts;
  END IF;

  UPDATE pagato.accounts
  SET name = 'Must not be changed'
  WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'RLS update test failed: modified % foreign rows', affected_rows;
  END IF;

  BEGIN
    INSERT INTO pagato.transactions (
      user_id,
      transaction_type,
      source_account_id,
      destination_account_id,
      source_amount,
      destination_amount,
      occurred_at
    )
    VALUES (
      '11111111-1111-4111-8111-111111111111',
      'transfer',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      100.0000,
      100.0000,
      now()
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      cross_owner_reference_blocked := true;
  END;

  IF NOT cross_owner_reference_blocked THEN
    RAISE EXCEPTION 'Ownership test failed: cross-user transfer was accepted';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
