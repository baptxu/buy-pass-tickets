create table if not exists public.chat_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  token text not null unique,
  target_email text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default timezone('utc', now()) + interval '14 days',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_group_invites_group_created_at_idx
  on public.chat_group_invites (group_id, created_at desc);

alter table public.chat_group_invites enable row level security;

drop policy if exists "Members can read invites from their groups" on public.chat_group_invites;
create policy "Members can read invites from their groups"
  on public.chat_group_invites
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_group_members
      where chat_group_members.group_id = chat_group_invites.group_id
        and chat_group_members.user_id = auth.uid()
    )
  );

create or replace function public.create_group_invite(target_group_id uuid, invite_email text default null)
returns public.chat_group_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.chat_group_invites;
  normalized_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.chat_group_members
    where group_id = target_group_id
      and user_id = auth.uid()
  ) then
    raise exception 'Only group members can create invite links';
  end if;

  normalized_email := nullif(lower(trim(coalesce(invite_email, ''))), '');

  insert into public.chat_group_invites (
    group_id,
    token,
    target_email,
    created_by
  )
  values (
    target_group_id,
    encode(gen_random_bytes(18), 'hex'),
    normalized_email,
    auth.uid()
  )
  returning * into invite_row;

  return invite_row;
end;
$$;

grant execute on function public.create_group_invite(uuid, text) to authenticated;

create or replace function public.accept_group_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.chat_group_invites;
  auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  auth_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select *
  into invite_row
  from public.chat_group_invites
  where token = invite_token
    and accepted_at is null
    and expires_at > timezone('utc', now());

  if not found then
    raise exception 'Invitation invalide ou expiree';
  end if;

  if invite_row.target_email is not null and invite_row.target_email <> auth_email then
    raise exception 'Cette invitation est reservee a une autre adresse email';
  end if;

  insert into public.chat_group_members (group_id, user_id, role)
  values (invite_row.group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  update public.chat_group_invites
  set accepted_at = timezone('utc', now()),
      accepted_by = auth.uid()
  where id = invite_row.id
    and accepted_at is null;

  return invite_row.group_id;
end;
$$;

grant execute on function public.accept_group_invite(text) to authenticated;
