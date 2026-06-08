-- Migración Fase 5: O(1) sk_ lookup + datos del pagador para SRI
-- Ejecutar contra la base de datos local (SQLite/Supabase) antes de arrancar.

-- Bug #2: columna indexada para lookup rápido de clave secreta
-- Evita escanear toda la tabla con bcrypt O(N).
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS api_key_secret_prefix text;
CREATE INDEX IF NOT EXISTS idx_merchants_sk_prefix ON merchants(api_key_secret_prefix);

-- Datos del pagador para registro contable / SRI
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_ruc_cedula text;

-- Nota: customer_name y customer_email ya existen en transactions.
