-- ApiPRO – Migrazione 0003: le funzioni interne non sono richiamabili dall'esterno (avvisi Supabase advisor)
revoke execute on function public.observations_qc() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
