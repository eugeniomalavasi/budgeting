-- ============================================================
-- FASE 5 — Soft delete recuperabile + eliminazione gruppi + icona categorie
--
--  1. Aggiunge deleted_at a transactions/shared_expenses/categories/households:
--     gli "eliminati" NON vengono cancellati dal DB, solo nascosti.
--     Per recuperarli basta rimettere deleted_at = null nell'SQL editor.
--  2. current_household() e my_group_balances() ignorano gli household eliminati,
--     così un gruppo eliminato sparisce ovunque senza far trapelare i suoi dati.
--  3. RPC delete_group(): solo l'owner può eliminare un gruppo (soft delete).
--  4. Aggiunge la colonna icon alle categorie (id icona SVG scelta dall'utente).
-- ============================================================

begin;

-- 1. COLONNE deleted_at --------------------------------------
alter table transactions    add column if not exists deleted_at timestamptz;
alter table shared_expenses add column if not exists deleted_at timestamptz;
alter table categories      add column if not exists deleted_at timestamptz;
alter table households       add column if not exists deleted_at timestamptz;

create index if not exists idx_tx_not_deleted     on transactions(household_id)    where deleted_at is null;
create index if not exists idx_shared_not_deleted on shared_expenses(household_id) where deleted_at is null;
create index if not exists idx_cat_not_deleted    on categories(household_id)      where deleted_at is null;

-- 4. ICONA categorie -----------------------------------------
alter table categories add column if not exists icon text;

-- 2. current_household(): ignora gli household eliminati -------
create or replace function current_household()
returns uuid language sql stable security definer set search_path = public
as $$
  select p.household_id
  from profiles p
  join group_members gm on gm.household_id = p.household_id and gm.user_id = p.id
  join households h on h.id = p.household_id and h.deleted_at is null
  where p.id = auth.uid()
$$;

-- my_group_balances(): niente gruppi eliminati + niente movimenti eliminati
create or replace function my_group_balances()
returns table(household_id uuid, name text, balance numeric)
language sql stable security definer set search_path = public as $$
  select h.id, h.name,
    coalesce(sum(
      case when se.paid_by = auth.uid()
           then se.importo_totale - coalesce(my.amount, 0)
           else -coalesce(my.amount, 0)
      end
    ), 0)::numeric as balance
  from group_members gm
  join households h on h.id = gm.household_id and h.deleted_at is null
  left join shared_expenses se
    on se.household_id = gm.household_id and se.settled = false and se.deleted_at is null
  left join shared_expense_shares my on my.expense_id = se.id and my.user_id = auth.uid()
  where gm.user_id = auth.uid()
  group by h.id, h.name
$$;
revoke execute on function my_group_balances() from public, anon;
grant execute on function my_group_balances() to authenticated;

-- 3. RPC delete_group(): soft delete, solo l'owner ------------
create or replace function delete_group(p_household uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  if not exists (
    select 1 from group_members
    where household_id = p_household and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Solo il proprietario puo eliminare il gruppo';
  end if;

  -- Non lasciare l'utente senza alcun gruppo attivo.
  select count(*) into cnt
  from group_members gm
  join households h on h.id = gm.household_id and h.deleted_at is null
  where gm.user_id = auth.uid();
  if cnt <= 1 then
    raise exception 'Non puoi eliminare il tuo unico gruppo';
  end if;

  update households set deleted_at = now() where id = p_household and deleted_at is null;
end $$;
revoke execute on function delete_group(uuid) from public, anon;
grant execute on function delete_group(uuid) to authenticated;

commit;
