create or replace function public.user_is_chat_group_member(target_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_group_members
    where group_id = target_group_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.user_is_chat_group_member(uuid) to authenticated;

drop policy if exists "Members can read their groups" on public.chat_groups;
create policy "Members can read their groups"
  on public.chat_groups
  for select
  to authenticated
  using (
    is_global = true
    or public.user_is_chat_group_member(id)
  );

drop policy if exists "Members can read memberships from their groups" on public.chat_group_members;
create policy "Members can read memberships from their groups"
  on public.chat_group_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.user_is_chat_group_member(group_id)
  );

drop policy if exists "Members can read group messages" on public.chat_messages;
create policy "Members can read group messages"
  on public.chat_messages
  for select
  to authenticated
  using (public.user_is_chat_group_member(group_id));

drop policy if exists "Members can post messages in their groups" on public.chat_messages;
create policy "Members can post messages in their groups"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and public.user_is_chat_group_member(group_id)
  );

drop policy if exists "Members can read invites from their groups" on public.chat_group_invites;
create policy "Members can read invites from their groups"
  on public.chat_group_invites
  for select
  to authenticated
  using (public.user_is_chat_group_member(group_id));
