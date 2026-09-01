-- Read-only verification for the Neon development branch.

SELECT current_database() AS database_name, current_setting('server_version') AS postgres_version;

SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'pagato'
ORDER BY table_type, table_name;

SELECT
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables
WHERE schemaname = 'pagato'
ORDER BY tablename;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'pagato'
ORDER BY tablename, policyname;

SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE connamespace = 'pagato'::regnamespace
ORDER BY conrelid::regclass::text, conname;

SELECT
  schemaname,
  viewname
FROM pg_views
WHERE schemaname = 'pagato'
ORDER BY viewname;
