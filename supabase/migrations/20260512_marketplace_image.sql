-- Ajouter la colonne image aux annonces marketplace
alter table marketplace_listings add column if not exists image_url text;

-- Bucket public pour les photos d'événements
insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict (id) do nothing;

-- Lecture publique des images
create policy "marketplace_images_select" on storage.objects
  for select using (bucket_id = 'marketplace');

-- Upload réservé à l'admin
create policy "marketplace_images_insert" on storage.objects
  for insert with check (
    bucket_id = 'marketplace' and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Suppression réservée à l'admin
create policy "marketplace_images_delete" on storage.objects
  for delete using (
    bucket_id = 'marketplace' and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
