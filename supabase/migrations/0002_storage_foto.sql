-- ApiPRO – Migrazione 0002: foto delle segnalazioni (facoltative)
-- Bucket privato; ogni partecipante carica e legge solo le proprie foto (cartella = proprio uid).
-- Gli amministratori possono leggere tutte le foto.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('observation-photos', 'observation-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

alter table public.observations add column if not exists photo_path text;

create policy "foto proprie upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'observation-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "foto proprie aggiornamento" on storage.objects for update to authenticated
  using (bucket_id = 'observation-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "foto proprie lettura" on storage.objects for select to authenticated
  using (bucket_id = 'observation-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Funzione is_admin richiamabile dalla WebApp per mostrare l'esportazione CSV
grant execute on function public.is_admin() to authenticated;
