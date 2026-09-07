-- PG-08: presentation only. No financial records or existing settings are changed.
ALTER TABLE pagato.user_preferences
  ADD COLUMN IF NOT EXISTS number_format varchar(20) NOT NULL DEFAULT 'comma-dot'
  CHECK (number_format IN ('comma-dot', 'dot-comma'));
