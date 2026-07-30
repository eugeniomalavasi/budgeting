-- ============================================================
-- FASE 2a — Gruppi N-persone + utenti in più gruppi
-- Trasforma il modello a 2 persone (share_eu/share_ma) in un
-- modello generico a N membri.
--
--  1. group_members: appartenenza (un utente può stare in più gruppi)
--  2. shared_expense_shares: una riga per membro con la sua quota
--     (sostituisce share_eu / share_ma)
--  3. current_household() richiede l'appartenenza al gruppo attivo
--  4. handle_new_user() iscrive il nuovo utente al proprio gruppo
-- ============================================================

begin;

-- 1. APPARTENENZA --------------------------------------------
create table if not exists group_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',        -- 'owner' | 'member'
  joined_at timestamptz default now(),
  primary key (household_id, user_id)
);
alter table group_members enable row level security;
create index if not exists idx_gm_user on group_members(user_id);

-- Backfill: ogni profilo esistente diventa membro (owner) del suo household
insert into group_members(household_id, user_id, role)
select household_id, id, 'owner' from profiles
on conflict (household_id, user_id) do nothing;

-- 2. QUOTE PER-MEMBRO ----------------------------------------
create table if not exists shared_expense_shares (
  expense_id uuid references shared_expenses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric not null,
  primary key (expense_id, user_id)
);
alter table shared_expense_shares enable row level security;
create index if not exists idx_ses_user on shared_expense_shares(user_id);

-- Migra share_eu/share_ma -> due righe (Eugenio, Margherita)
do $$
declare eu uuid; ma uuid;
begin
  select id into eu from profiles where name = 'Eugenio'    limit 1;
  select id into ma from profiles where name = 'Margherita' limit 1;
  if eu is not null then
    insert into shared_expense_shares(expense_id, user_id, amount)
    select id, eu, share_eu from shared_expenses
    on conflict do nothing;
  end if;
  if ma is not null then
    insert into shared_expense_shares(expense_id, user_id, amount)
    select id, ma, share_ma from shared_expenses
    on conflict do nothing;
  end if;
end $$;

-- 3. Rimuovi le colonne a 2 persone --------------------------
alter table shared_expenses drop column if exists share_eu;
alter table shared_expenses drop column if exists share_ma;

-- 4. Helper appartenenza -------------------------------------
create or replace function is_group_member(hid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from group_members where household_id = hid and user_id = auth.uid()) $$;
revoke execute on function is_group_member(uuid) from public, anon;

-- current_household(): gruppo attivo SOLO se ne sei membro.
-- Così, anche se profiles.household_id venisse forzato a un gruppo
-- altrui, il join fallisce e non vedi nulla.
create or replace function current_household()
returns uuid language sql stable security definer set search_path = public
as $$
  select p.household_id
  from profiles p
  join group_members gm on gm.household_id = p.household_id and gm.user_id = p.id
  where p.id = auth.uid()
$$;

-- 5. Registrazione: crea household + profilo + membership -----
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  h uuid;
  display text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
begin
  insert into households(name) values (display) returning id into h;
  insert into profiles(id, name, household_id) values (new.id, display, h)
    on conflict (id) do nothing;
  insert into group_members(household_id, user_id, role) values (h, new.id, 'owner')
    on conflict (household_id, user_id) do nothing;
  return new;
end $$;

-- 6. RLS nuove tabelle ---------------------------------------
-- group_members: vedi i membri dei gruppi di cui fai parte;
-- puoi iscrivere/rimuovere solo te stesso (gli inviti = Fase 4).
drop policy if exists gm_select on group_members;
drop policy if exists gm_insert_self on group_members;
drop policy if exists gm_delete_self on group_members;
create policy gm_select      on group_members for select using (is_group_member(household_id));
create policy gm_insert_self on group_members for insert with check (user_id = auth.uid());
create policy gm_delete_self on group_members for delete using (user_id = auth.uid());

-- shared_expense_shares: legata all'household della spesa padre
drop policy if exists ses_all on shared_expense_shares;
create policy ses_all on shared_expense_shares for all
  using (exists (select 1 from shared_expenses e where e.id = expense_id and e.household_id = current_household()))
  with check (exists (select 1 from shared_expenses e where e.id = expense_id and e.household_id = current_household()));

commit;
