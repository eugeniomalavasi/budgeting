-- ============================================================
-- AGGIORNAMENTO SCHEMA - esegui nell'SQL Editor di Supabase
-- ============================================================

-- 1. Rimuovi la query profiles dalla query transactions
--    (non serve una tabella profiles separata, usiamo auth.users)

-- 2. Tabella spese condivise
CREATE TABLE IF NOT EXISTS shared_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  month_id TEXT REFERENCES months(id),
  descrizione TEXT NOT NULL,
  importo_totale NUMERIC NOT NULL,
  paid_by UUID REFERENCES auth.users(id),      -- chi ha pagato
  split_type TEXT NOT NULL DEFAULT 'equal',     -- 'equal' | 'percent' | 'amount'
  -- Quote dei due utenti
  share_eu NUMERIC NOT NULL,   -- quota Eugenio (importo €)
  share_ma NUMERIC NOT NULL,   -- quota Margherita (importo €)
  -- Chi deve a chi (calcolato)
  -- se paid_by = Eugenio → Margherita deve share_ma a Eugenio
  -- se paid_by = Margherita → Eugenio deve share_eu a Margherita
  settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_shared" ON shared_expenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_write_shared" ON shared_expenses
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. Tabella utenti (mappa auth.users → nome display)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write_profiles" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Inserisci i profili dopo aver creato gli utenti
-- (sostituisci gli UUID con quelli reali da Authentication → Users)
-- INSERT INTO profiles (id, name) VALUES
--   ('uuid-eugenio-qui', 'Eugenio'),
--   ('uuid-margherita-qui', 'Margherita');

-- 4. Funzione per rollover automatico del saldo
CREATE OR REPLACE FUNCTION rollover_month(new_month_id TEXT, new_label TEXT, prev_month_id TEXT, entrate_prev NUMERIC, uscite_prev NUMERIC)
RETURNS void AS $$
DECLARE
  prev_saldo NUMERIC;
BEGIN
  SELECT saldo_finale INTO prev_saldo FROM months WHERE id = prev_month_id;
  
  INSERT INTO months (id, label, saldo_iniziale, saldo_finale, risparmiati, entrate_previste, entrate_effettive, uscite_previste, uscite_effettive)
  VALUES (new_month_id, new_label, prev_saldo, prev_saldo, 0, entrate_prev, 0, uscite_prev, 0)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
