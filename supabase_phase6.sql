-- ============================================================
-- FASE 6 — Spese ricorrenti (movimenti ricorsivi mensili)
--
--  Una "regola ricorrente" genera automaticamente, ogni mese nel giorno
--  scelto, un movimento reale (identico a quelli inseriti a mano: valuta,
--  eventuale divisione). La generazione avviene LATO SERVER via pg_cron,
--  così i movimenti compaiono anche se nessuno apre l'app.
--
--   1. recurring_rules        → la regola (tipo, importo/valuta, giorno del
--                               mese, durata: N rate o mese di fine, split).
--   2. recurring_rule_shares  → template quote per-membro (pesi).
--   3. transactions.recurring_id → traccia i movimenti generati (anti-doppioni).
--   4. Funzioni ensure_month / recompute_month / generate_recurring_due.
--   5. Job pg_cron giornaliero che chiama generate_recurring_due().
--
--  La conversione valuta è CONGELATA ad ogni generazione col cambio del
--  giorno (come i movimenti manuali), non fissata alla creazione.
-- ============================================================

begin;

-- 1. TABELLA recurring_rules ---------------------------------
create table if not exists recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid references auth.users(id),
  tipo text not null default 'uscita' check (tipo in ('uscita','entrata')),
  descrizione text not null,
  categoria text not null,
  importo_originale numeric not null,           -- importo digitato dall'utente
  valuta_originale text not null default 'EUR', -- valuta scelta dall'utente
  day_of_month int not null default 1 check (day_of_month between 1 and 31),
  start_month text not null,                    -- "YYYY-MM": primo mese di validità
  total_installments int,                       -- N rate totali (null = illimitato)
  end_month text,                               -- "YYYY-MM" mese di fine (null = illimitato)
  generated_count int not null default 0,       -- rate già generate
  last_generated_month text,                    -- ultimo "YYYY-MM" generato
  is_split boolean not null default false,
  split_type text not null default 'equal' check (split_type in ('equal','custom')),
  paid_by uuid references auth.users(id),
  active boolean not null default true,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create index if not exists idx_recurring_hh on recurring_rules(household_id) where deleted_at is null;

-- Trigger: riempi household_id ad ogni insert (riusa set_household_id di fase 1)
drop trigger if exists trg_hh_recurring on recurring_rules;
create trigger trg_hh_recurring before insert on recurring_rules
  for each row execute function set_household_id();

-- 2. TABELLA recurring_rule_shares (template quote) ----------
-- weight: peso della quota. 'equal' → 1 per partecipante; 'custom' → importo
-- digitato (usato come peso proporzionale sul totale convertito).
create table if not exists recurring_rule_shares (
  rule_id uuid not null references recurring_rules(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  weight numeric not null default 1,
  primary key (rule_id, user_id)
);

-- 3. transactions.recurring_id (traccia i movimenti generati) -
alter table transactions add column if not exists recurring_id uuid references recurring_rules(id);
-- Anti-doppioni: max 1 movimento per regola per mese (conta anche i soft-deleted,
-- così un movimento generato e poi cancellato NON viene rigenerato).
create unique index if not exists uniq_recurring_tx_month
  on transactions(recurring_id, month_id) where recurring_id is not null;

-- 4. RLS -----------------------------------------------------
alter table recurring_rules enable row level security;
alter table recurring_rule_shares enable row level security;

drop policy if exists hh_recurring on recurring_rules;
create policy hh_recurring on recurring_rules for all
  using (household_id = current_household())
  with check (household_id = current_household());

drop policy if exists hh_recurring_shares on recurring_rule_shares;
create policy hh_recurring_shares on recurring_rule_shares for all
  using (exists (
    select 1 from recurring_rules r
    where r.id = recurring_rule_shares.rule_id and r.household_id = current_household()
  ))
  with check (exists (
    select 1 from recurring_rules r
    where r.id = recurring_rule_shares.rule_id and r.household_id = current_household()
  ));

-- 5. HELPER: tasso EUR→code (null se mancante) ---------------
create or replace function rate_of(p_code text)
returns numeric language sql stable security definer set search_path = public as $$
  select case when p_code = 'EUR' then 1
              else (select rate from exchange_rates where base = 'EUR' and code = p_code) end
$$;

-- 6. HELPER: assicura l'esistenza del mese per l'household ----
create or replace function ensure_month(p_hh uuid, p_month text)
returns void language plpgsql security definer set search_path = public as $$
declare
  mesi text[] := array['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                       'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  yy int := split_part(p_month,'-',1)::int;
  mm int := split_part(p_month,'-',2)::int;
  prev_saldo numeric;
  prev_ep numeric; prev_up numeric;
begin
  if exists (select 1 from months where household_id = p_hh and id = p_month) then
    return;
  end if;
  -- Eredita saldo finale e budget previsti dall'ultimo mese precedente (se esiste)
  select saldo_finale, entrate_previste, uscite_previste
    into prev_saldo, prev_ep, prev_up
  from months
  where household_id = p_hh and id < p_month
  order by id desc limit 1;

  insert into months (id, household_id, label, saldo_iniziale, saldo_finale,
                      risparmiati, entrate_previste, entrate_effettive,
                      uscite_previste, uscite_effettive)
  values (p_month, p_hh, mesi[mm] || ' ' || yy,
          coalesce(prev_saldo,0), coalesce(prev_saldo,0),
          0, coalesce(prev_ep,0), 0, coalesce(prev_up,0), 0)
  on conflict (household_id, id) do nothing;
end $$;

-- 7. HELPER: ricalcola i totali di un mese (come il client) ---
create or replace function recompute_month(p_hh uuid, p_month text)
returns void language plpgsql security definer set search_path = public as $$
declare ent numeric; usc numeric; si numeric;
begin
  select coalesce(sum(case when importo > 0 then importo else 0 end),0),
         coalesce(sum(case when importo < 0 then -importo else 0 end),0)
    into ent, usc
  from transactions
  where household_id = p_hh and month_id = p_month and deleted_at is null;

  select saldo_iniziale into si from months where household_id = p_hh and id = p_month;

  update months set
    entrate_effettive = round(ent,2),
    uscite_effettive  = round(usc,2),
    risparmiati       = round(ent - usc,2),
    saldo_finale      = round(coalesce(si,0) + ent - usc,2)
  where household_id = p_hh and id = p_month;
end $$;

-- 8. MOTORE: genera i movimenti ricorrenti dovuti oggi --------
create or replace function generate_recurring_due()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_eff_day int;
  v_days_in_month int := extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'));
  v_hh_cur text;
  v_rate_from numeric; v_rate_to numeric;
  v_conv numeric; v_importo numeric; v_signed numeric;
  v_foreign boolean;
  v_tasso numeric;
  v_tx_id uuid;
  v_exp_id uuid;
  v_total_weight numeric;
  v_assigned numeric;
  v_first boolean;
  s record;
  v_count int := 0;
begin
  for r in
    select * from recurring_rules
    where deleted_at is null and active
      and v_month >= start_month
      and (total_installments is null or generated_count < total_installments)
      and (end_month is null or v_month <= end_month)
  loop
    -- Giorno effettivo (clamp all'ultimo giorno nei mesi corti)
    v_eff_day := least(r.day_of_month, v_days_in_month);
    if extract(day from current_date)::int <> v_eff_day then
      continue;
    end if;
    -- Già generato per questo mese? (l'indice unico è la garanzia forte)
    if exists (select 1 from transactions where recurring_id = r.id and month_id = v_month) then
      continue;
    end if;

    -- Valuta di famiglia e conversione col cambio del giorno
    select coalesce(currency,'EUR') into v_hh_cur from households where id = r.household_id;
    v_rate_from := rate_of(r.valuta_originale);
    v_rate_to   := rate_of(v_hh_cur);
    if v_rate_from is null or v_rate_to is null then
      continue; -- cambio mancante: salta questo mese (raro)
    end if;

    v_foreign := (r.valuta_originale <> v_hh_cur);
    v_conv := r.importo_originale * (v_rate_to / v_rate_from);
    v_importo := round(v_conv, 2);
    v_signed := case when r.tipo = 'uscita' then -v_importo else v_importo end;
    v_tasso := case when v_foreign then round(v_rate_to / v_rate_from, 8) else null end;

    perform ensure_month(r.household_id, v_month);

    insert into transactions (household_id, month_id, data, importo, descrizione,
                              categoria, created_by, valuta, importo_originale,
                              valuta_originale, tasso_usato, recurring_id)
    values (r.household_id, v_month, make_date(split_part(v_month,'-',1)::int,
            split_part(v_month,'-',2)::int, v_eff_day), v_signed, r.descrizione,
            r.categoria, r.created_by, v_hh_cur,
            case when v_foreign then r.importo_originale else null end,
            case when v_foreign then r.valuta_originale else null end,
            v_tasso, r.id)
    returning id into v_tx_id;

    -- Divisione (solo uscite condivise)
    if r.is_split and r.tipo = 'uscita' then
      select coalesce(sum(weight),0) into v_total_weight
      from recurring_rule_shares where rule_id = r.id;
      if v_total_weight > 0 then
        insert into shared_expenses (household_id, transaction_id, month_id, descrizione,
                                     importo_totale, paid_by, split_type, settled)
        values (r.household_id, v_tx_id, v_month, r.descrizione, v_importo,
                coalesce(r.paid_by, r.created_by), r.split_type, false)
        returning id into v_exp_id;

        v_assigned := 0;
        v_first := true;
        for s in
          select user_id, weight from recurring_rule_shares
          where rule_id = r.id and weight > 0 order by user_id
        loop
          declare v_share numeric;
          begin
            v_share := round(v_importo * s.weight / v_total_weight, 2);
            v_assigned := v_assigned + v_share;
            insert into shared_expense_shares (expense_id, user_id, amount)
            values (v_exp_id, s.user_id, v_share);
            if v_first then v_first := false; end if;
          end;
        end loop;
        -- Resto di arrotondamento sul primo partecipante
        if v_assigned <> v_importo then
          update shared_expense_shares
          set amount = amount + (v_importo - v_assigned)
          where expense_id = v_exp_id
            and user_id = (select user_id from recurring_rule_shares
                           where rule_id = r.id and weight > 0 order by user_id limit 1);
        end if;
      end if;
    end if;

    perform recompute_month(r.household_id, v_month);

    update recurring_rules
      set generated_count = generated_count + 1, last_generated_month = v_month
      where id = r.id;

    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke execute on function generate_recurring_due() from public, anon;

-- 9. CRON giornaliero (06:10 UTC) ----------------------------
select cron.unschedule('generate-recurring')
  where exists (select 1 from cron.job where jobname = 'generate-recurring');
select cron.schedule('generate-recurring', '10 6 * * *', $$select public.generate_recurring_due();$$);

commit;
