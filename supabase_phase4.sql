-- ============================================================
-- FASE 4 — Inviti ai gruppi (senza invio email)
--  - group_invitations: richieste di partecipazione per email
--  - il destinatario accetta/rifiuta dall'app (RPC respond_invitation)
--  - membership solo via RPC (create_group / respond_invitation)
-- ============================================================

begin;

create table if not exists group_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id),
  status text not null default 'pending',   -- pending | accepted | declined
  created_at timestamptz default now()
);
alter table group_invitations enable row level security;
create index if not exists idx_inv_email on group_invitations(lower(email));
create index if not exists idx_inv_household on group_invitations(household_id);

drop policy if exists inv_select on group_invitations;
create policy inv_select on group_invitations for select
  using (is_group_member(household_id) or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists inv_insert on group_invitations;
create policy inv_insert on group_invitations for insert
  with check (is_group_member(household_id) and invited_by = auth.uid());

drop policy if exists inv_delete on group_invitations;
create policy inv_delete on group_invitations for delete
  using (is_group_member(household_id));

drop policy if exists hh_select on households;
create policy hh_select on households for select
  using (
    is_group_member(id)
    or exists (
      select 1 from group_invitations gi
      where gi.household_id = households.id
        and gi.status = 'pending'
        and lower(gi.email) = lower(auth.jwt() ->> 'email')
    )
  );

create or replace function respond_invitation(p_invite uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  select * into inv from group_invitations where id = p_invite;
  if inv is null then raise exception 'Invito non trovato'; end if;
  if inv.status <> 'pending' then raise exception 'Invito gia gestito'; end if;
  if lower(inv.email) <> lower(auth.jwt() ->> 'email') then raise exception 'Non autorizzato'; end if;
  if p_accept then
    insert into group_members(household_id, user_id, role)
      values (inv.household_id, auth.uid(), 'member')
      on conflict (household_id, user_id) do nothing;
    update group_invitations set status = 'accepted' where id = p_invite;
    return inv.household_id;
  else
    update group_invitations set status = 'declined' where id = p_invite;
    return null;
  end if;
end $$;
revoke execute on function respond_invitation(uuid, boolean) from public, anon;
grant execute on function respond_invitation(uuid, boolean) to authenticated;

drop policy if exists gm_insert_self on group_members;

commit;
