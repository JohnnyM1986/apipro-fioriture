-- ApiPRO – Migrazione 0005 (release 0.4.2, 21/11/2026)
-- Il comune degli apiari non si chiede più nella richiesta di partecipazione: un apicoltore può avere apiari
-- in comuni diversi e la posizione dell'apiario si registra già a ogni stima (mappa o luogo salvato).
-- Il campo resta, facoltativo, per non perdere quanto già inserito; esce dall'esportazione della forza.

alter table public.strength_requests alter column municipality drop not null;
alter table public.strength_requests drop constraint if exists strength_requests_municipality_check;
alter table public.strength_requests add constraint strength_requests_municipality_check
  check (municipality is null or char_length(municipality) <= 120);

drop view if exists public.export_strength;
create view public.export_strength
with (security_invoker = true) as
select
  v.id                         as id_stima,
  v.visited_on                 as data_visita,
  b.full_name                  as apicoltore,
  b.farm                       as azienda,
  v.site_name                  as apiario,
  round(v.lat::numeric, 6)     as latitudine,
  round(v.lon::numeric, 6)     as longitudine,
  v.hive_label                 as arnia,
  (c ->> 'n')::int             as favo,
  upper(s.side)                as lato,
  (c -> s.side ->> 0)::int     as sesto_1,
  (c -> s.side ->> 1)::int     as sesto_2,
  (c -> s.side ->> 2)::int     as sesto_3,
  (c -> s.side ->> 3)::int     as sesto_4,
  (c -> s.side ->> 4)::int     as sesto_5,
  (c -> s.side ->> 5)::int     as sesto_6,
  (select sum(x::int) from jsonb_array_elements_text(c -> s.side) x) as totale_lato,
  v.note                       as note,
  v.created_at                 as data_inserimento
from public.strength_visits v
left join public.beekeepers b on b.id = v.beekeeper_id
cross join lateral jsonb_array_elements(v.combs) c
cross join lateral (values ('a'), ('b')) s(side)
where not v.deleted and coalesce(jsonb_typeof(c -> s.side), 'null') = 'array';
