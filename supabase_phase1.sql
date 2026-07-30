-- ============================================================
-- FASE 1 — Auth completa + isolamento per household
-- Esegui TUTTO in una volta nell'SQL Editor di Supabase.
-- È avvolto in una transazione: se qualcosa fallisce, non lascia
-- il database a metà.
--
-- Cosa fa:
--  1. Crea la tabella households
--  2. Aggiunge household_id a profiles/months/transactions/shared_expenses
--  3. Migra TUTTI i dati esistenti nell'household "Famiglia Mido"
--     e ci mette dentro tutti gli utenti già registrati
--  4. Cambia la PK di months da (id) a (household_id, id) così due
--     household possono avere lo stesso "2026-06"
--  5. Trigger che riempie household_id ad ogni insert
--  6. Trigger che, ad ogni nuova registrazione, crea un household
--     dedicato + il profilo (il nuovo utente parte VUOTO e non vede
--     i vostri dati)
--  7. Riscrive le RLS: ognuno vede solo il proprio household
-- ============================================================

begin;

-- 1. HOUSEHOLDS ------------------------------------------------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);
alter table households enable row level security;

-- 2. COLONNE household_id -------------------------------------
alter table profiles        add column if not exists household_id uuid references households(id);
alter table months          add column if not exists household_id uuid references households(id);
alter table transactions    add column if not exists household_id uuid references households(id);
alter table shared_expenses add column if not exists household_id uuid references households(id);

-- 3. MIGRAZIONE dati esistenti --------------------------------
do $$
declare h uuid;
begin
  -- household condiviso per i dati attuali
  insert into households(name) values ('Famiglia Mido') returning id into h;

  -- assegna tutti i dati orfani a quell'household
  update months          set household_id = h where household_id is null;
  update transactions    set household_id = h where household_id is null;
  update shared_expenses set household_id = h where household_id is null;
  update profiles        set household_id = h where household_id is null;

  -- assicura un profilo per OGNI utente già registrato, dentro Mido
  insert into profiles(id, name, household_id)
  select u.id, split_part(u.email, '@', 1), h
  from auth.users u
  where not exists (select 1 from profiles p where p.id = u.id);
end $$;

-- 4. PK di months per household -------------------------------
-- Sgancia le FK che puntano a months(id)
alter table transactions    drop constraint if exists transactions_month_id_fkey;
alter table shared_expenses drop constraint if exists shared_expenses_month_id_fkey;

-- Nuova PK composta
alter table months drop constraint if exists months_pkey;
alter table months add primary key (household_id, id);
alter table months alter column household_id set not null;

-- Ricrea le FK come composte (household_id, month_id)
alter table transactions
  add constraint transactions_month_fk
  foreign key (household_id, month_id)
  references months(household_id, id) on delete cascade;

alter table shared_expenses
  add constraint shared_expenses_month_fk
  foreign key (household_id, month_id)
  references months(household_id, id) on delete cascade;

-- household_id obbligatorio ovunque
alter table transactions    alter column household_id set not null;
alter table shared_expenses  alter column household_id set not null;
alter table profiles         alter column household_id set not null;

create index if not exists idx_months_hh          on months(household_id);
create index if not exists idx_transactions_hh    on transactions(household_id);
create index if not exists idx_shared_hh          on shared_expenses(household_id);

-- 5. Helper: household dell'utente corrente -------------------
-- SECURITY DEFINER così legge profiles bypassando le RLS
-- (evita ricorsione infinita nelle policy).
create or replace function current_household()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from profiles where id = auth.uid()
$$;

-- 6a. Trigger: riempi household_id ad ogni insert -------------
create or replace function set_household_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.household_id is null then
    new.household_id := current_household();
  end if;
  return new;
end $$;

drop trigger if exists trg_hh_months on months;
drop trigger if exists trg_hh_transactions on transactions;
drop trigger if exists trg_hh_shared on shared_expenses;
create trigger trg_hh_months        before insert on months        for each row execute function set_household_id();
create trigger trg_hh_transactions  before insert on transactions  for each row execute function set_household_id();
create trigger trg_hh_shared        before insert on shared_expenses for each row execute function set_household_id();

-- 6b. Trigger: nuova registrazione → nuovo household + profilo
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h uuid;
  display text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
begin
  insert into households(name) values (display) returning id into h;
  insert into profiles(id, name, household_id) values (new.id, display, h)
    on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 7. RLS: ognuno vede solo il proprio household ---------------
-- households
drop policy if exists hh_select on households;
create policy hh_select on households for select
  using (id = current_household());

-- profiles
drop policy if exists auth_read_profiles  on profiles;
drop policy if exists auth_write_profiles on profiles;
drop policy if exists hh_profiles_read    on profiles;
drop policy if exists profiles_write_self on profiles;
create policy hh_profiles_read on profiles for select
  using (household_id = current_household());
create policy profiles_write_self on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- months
drop policy if exists auth_read_months  on months;
drop policy if exists auth_write_months on months;
drop policy if exists hh_months on months;
create policy hh_months on months for all
  using (household_id = current_household())
  with check (household_id = current_household());

-- transactions
drop policy if exists auth_read_transactions   on transactions;
drop policy if exists auth_insert_transactions on transactions;
drop policy if exists auth_delete_transactions on transactions;
drop policy if exists hh_transactions on transactions;
create policy hh_transactions on transactions for all
  using (household_id = current_household())
  with check (household_id = current_household());

-- shared_expenses
drop policy if exists auth_read_shared  on shared_expenses;
drop policy if exists auth_write_shared on shared_expenses;
drop policy if exists hh_shared on shared_expenses;
create policy hh_shared on shared_expenses for all
  using (household_id = current_household())
  with check (household_id = current_household());

commit;

-- ============================================================
-- VERIFICA (esegui dopo, opzionale):
--   select name, id from households;
--   select id, name, household_id from profiles;
--   select id, household_id from months order by id;
-- Tutti i profili e i mesi esistenti devono avere lo stesso
-- household_id (quello di "Famiglia Mido").
-- ============================================================
