alter table public.profiles
  add column if not exists avatar_url text;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  event_name text,
  event_date text,
  visible boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.reviews enable row level security;

drop policy if exists "Public reviews are visible to authenticated users" on public.reviews;
create policy "Public reviews are visible to authenticated users"
  on public.reviews
  for select
  to authenticated
  using (visible = true);

drop policy if exists "Clients can publish their own sent-order review" on public.reviews;
create policy "Clients can publish their own sent-order review"
  on public.reviews
  for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from public.orders
      where orders.id = order_id
        and orders.client_id = auth.uid()
        and orders.status = 'sent'
    )
  );

drop policy if exists "Clients can edit their own review" on public.reviews;
create policy "Clients can edit their own review"
  on public.reviews
  for update
  to authenticated
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  event_key text unique,
  event_name text,
  is_global boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists chat_groups_single_global_idx
  on public.chat_groups (is_global)
  where is_global = true;

create table if not exists public.chat_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default timezone('utc', now()),
  unique (group_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_messages_group_created_at_idx
  on public.chat_messages (group_id, created_at);

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Members can read their groups" on public.chat_groups;
create policy "Members can read their groups"
  on public.chat_groups
  for select
  to authenticated
  using (
    is_global = true
    or exists (
      select 1
      from public.chat_group_members
      where chat_group_members.group_id = chat_groups.id
        and chat_group_members.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can create groups" on public.chat_groups;
create policy "Authenticated users can create groups"
  on public.chat_groups
  for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "Members can read memberships from their groups" on public.chat_group_members;
create policy "Members can read memberships from their groups"
  on public.chat_group_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.chat_group_members as own_membership
      where own_membership.group_id = chat_group_members.group_id
        and own_membership.user_id = auth.uid()
    )
  );

drop policy if exists "Users can join themselves to a group" on public.chat_group_members;
create policy "Users can join themselves to a group"
  on public.chat_group_members
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Members can read group messages" on public.chat_messages;
create policy "Members can read group messages"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_group_members
      where chat_group_members.group_id = chat_messages.group_id
        and chat_group_members.user_id = auth.uid()
    )
  );

drop policy if exists "Members can post messages in their groups" on public.chat_messages;
create policy "Members can post messages in their groups"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.chat_group_members
      where chat_group_members.group_id = chat_messages.group_id
        and chat_group_members.user_id = auth.uid()
    )
  );

create or replace function public.create_event_chat_group(target_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_order public.orders%rowtype;
  normalized_event_key text;
  created_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into source_order
  from public.orders
  where id = target_order_id
    and client_id = auth.uid()
    and status in ('confirmed', 'sent');

  if not found then
    raise exception 'Order not eligible for event chat';
  end if;

  normalized_event_key :=
    lower(trim(coalesce(source_order.event_name, '')))
    || '::' || coalesce(source_order.event_date, '')
    || '::' || lower(trim(coalesce(source_order.city, '')));

  insert into public.chat_groups (name, event_key, event_name, created_by)
  values ('Groupe ' || source_order.event_name, normalized_event_key, source_order.event_name, auth.uid())
  on conflict (event_key) do update
    set event_name = excluded.event_name
  returning id into created_group_id;

  insert into public.chat_group_members (group_id, user_id, role)
  select
    created_group_id,
    orders.client_id,
    case when orders.client_id = auth.uid() then 'owner' else 'member' end
  from public.orders
  where lower(trim(coalesce(orders.event_name, ''))) = lower(trim(coalesce(source_order.event_name, '')))
    and coalesce(orders.event_date, '') = coalesce(source_order.event_date, '')
    and lower(trim(coalesce(orders.city, ''))) = lower(trim(coalesce(source_order.city, '')))
    and orders.status in ('confirmed', 'sent')
  group by orders.client_id
  on conflict (group_id, user_id) do nothing;

  return created_group_id;
end;
$$;

grant execute on function public.create_event_chat_group(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
  set public = true;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
