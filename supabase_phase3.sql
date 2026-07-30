-- ============================================================
-- FASE 3 — Categorie dinamiche + RPC saldi per gruppo (Home)
-- ============================================================

begin;

-- Saldo dell'utente in OGNI suo gruppo (bypassa le RLS in modo sicuro:
-- ritorna solo il saldo aggregato del chiamante, per gruppo).
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
  join households h on h.id = gm.household_id
  left join shared_expenses se on se.household_id = gm.household_id and se.settled = false
  left join shared_expense_shares my on my.expense_id = se.id and my.user_id = auth.uid()
  where gm.user_id = auth.uid()
  group by h.id, h.name
$$;
revoke execute on function my_group_balances() from public, anon;
grant execute on function my_group_balances() to authenticated;

-- Categorie per household
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  kind text not null,           -- 'uscita' | 'entrata'
  emoji text,
  color text,
  sort int default 0,
  created_at timestamptz default now()
);
alter table categories enable row level security;
create index if not exists idx_cat_household on categories(household_id);

drop policy if exists cat_all on categories;
create policy cat_all on categories for all
  using (household_id = current_household())
  with check (household_id = current_household());

-- Semina il set base (idempotente)
create or replace function seed_categories(hid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from categories where household_id = hid) then return; end if;
  insert into categories(household_id, name, kind, emoji, color, sort) values
    (hid,'Alimenti','uscita','🛒','#4ade80',1),
    (hid,'Animali domestici','uscita','🐾','#fbbf24',2),
    (hid,'Bollette','uscita','💡','#818cf8',3),
    (hid,'Casa','uscita','🏠','#a3e635',4),
    (hid,'Debiti','uscita','💸','#f87171',5),
    (hid,'Regali','uscita','🎁','#34d399',6),
    (hid,'Ristoranti','uscita','🍽️','#fdba74',7),
    (hid,'Salute/spese mediche','uscita','🏥','#f472b6',8),
    (hid,'Spese personali','uscita','👤','#64748b',9),
    (hid,'Svago','uscita','🎮','#c084fc',10),
    (hid,'Trasporti','uscita','🚗','#fb923c',11),
    (hid,'Vestiario','uscita','👗','#22d3ee',12),
    (hid,'Viaggi','uscita','✈️','#e879f9',13),
    (hid,'Altro','uscita','📦','#94a3b8',99),
    (hid,'Busta paga','entrata','💼','#4ade80',1),
    (hid,'Bonus','entrata','🎯','#facc15',2),
    (hid,'Interessi','entrata','📈','#60a5fa',3),
    (hid,'Risparmi','entrata','🏦','#34d399',4),
    (hid,'Altro','entrata','📦','#94a3b8',99);
end $$;

create or replace function trg_seed_categories()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform seed_categories(new.id);
  return new;
end $$;
drop trigger if exists on_household_created on households;
create trigger on_household_created
  after insert on households
  for each row execute function trg_seed_categories();

-- Semina gli household già esistenti
do $$
declare r record;
begin
  for r in select id from households loop perform seed_categories(r.id); end loop;
end $$;

commit;
