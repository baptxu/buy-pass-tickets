-- Fonction accessible à tous les clients pour voir le nombre de demandes par annonce
-- SECURITY DEFINER : contourne la RLS pour ne retourner que des comptages agrégés (pas de données perso)
create or replace function get_listing_reservation_counts()
returns table(listing_id uuid, pending_count bigint)
language sql
security definer
as $$
  select listing_id, count(*)::bigint as pending_count
  from marketplace_reservations
  where status = 'pending'
  group by listing_id;
$$;
