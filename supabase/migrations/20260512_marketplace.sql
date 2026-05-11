-- Billets proposés par l'admin dans la marketplace
create table if not exists marketplace_listings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  event_name text not null,
  event_date text,
  city text,
  category text,
  quantity int default 1,
  price numeric not null,
  description text,
  status text default 'active' check (status in ('active', 'paused'))
);

-- Réservations temporaires des clients
create table if not exists marketplace_reservations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  listing_id uuid references marketplace_listings(id) on delete cascade,
  client_id uuid references profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  notes text,
  expires_at timestamptz default (now() + interval '24 hours')
);

alter table marketplace_listings enable row level security;
alter table marketplace_reservations enable row level security;

-- Listings : lecture par tous les utilisateurs authentifiés
create policy "marketplace_listings_read" on marketplace_listings
  for select to authenticated using (true);

-- Listings : création/modification/suppression réservée à l'admin
create policy "marketplace_listings_insert" on marketplace_listings
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "marketplace_listings_update" on marketplace_listings
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "marketplace_listings_delete" on marketplace_listings
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Réservations : un client voit les siennes, l'admin voit tout
create policy "marketplace_reservations_select" on marketplace_reservations
  for select using (
    client_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Réservations : un client peut créer une réservation pour lui-même
create policy "marketplace_reservations_insert" on marketplace_reservations
  for insert with check (client_id = auth.uid());

-- Réservations : l'admin peut accepter ou annuler
create policy "marketplace_reservations_admin_update" on marketplace_reservations
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Réservations : le client peut annuler sa propre réservation en attente
create policy "marketplace_reservations_client_cancel" on marketplace_reservations
  for update using (
    client_id = auth.uid() and status = 'pending'
  ) with check (status = 'cancelled');
