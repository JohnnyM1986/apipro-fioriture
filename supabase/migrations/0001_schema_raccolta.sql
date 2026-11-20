-- ApiPRO – WebApp fioriture
-- Migrazione 0001: raccolta osservazioni (specifica WebApp Birolo + protocollo di monitoraggio fenologico)
-- BOZZA 20/11/2026 – da applicare su un progetto Supabase dedicato [DA VERIFICARE progetto/regione EU]
-- Accesso partecipanti: Supabase Auth anonimo (nessuna registrazione). auth.uid() = identificativo partecipante.

create extension if not exists "pgcrypto";

-- =========================================================
-- Cataloghi (configurabili da amministrazione)
-- =========================================================
create table public.species (
  id            text primary key,              -- es. 'robinia'
  label         text not null,                 -- etichetta utente
  scientific    text not null,
  habitat       text,
  image_url     text,                          -- foto di riferimento per il riconoscimento
  active        boolean not null default true,
  sort_order    int not null default 0
);

create table public.phases (
  code          text primary key check (code ~ '^F[0-5]$'),
  label         text not null,
  definition    text not null,
  rank          int  not null unique,          -- 0..5, usato solo per i controlli facoltativi
  image_url     text
);

-- =========================================================
-- Amministratori (esportazione CSV, gestione catalogo)
-- =========================================================
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- =========================================================
-- Luoghi abituali del partecipante
-- La posizione è quella delle piante osservate, non dello smartphone.
-- =========================================================
create table public.sites (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  lat            double precision not null check (lat between -90 and 90),
  lon            double precision not null check (lon between -180 and 180),
  created_at     timestamptz not null default now(),
  archived       boolean not null default false
);
create index on public.sites (participant_id);

-- =========================================================
-- Osservazioni fenologiche
-- Segnalazione occasionale: site_id nullo, coordinate obbligatorie.
-- Osservazione abituale: site_id valorizzato, coordinate copiate dal luogo.
-- =========================================================
create table public.observations (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  site_id         uuid references public.sites(id) on delete set null,
  species_id      text not null references public.species(id),
  phase_code      text not null references public.phases(code),
  observed_on     date not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  lat             double precision not null check (lat between -90 and 90),
  lon             double precision not null check (lon between -180 and 180),
  location_source text check (location_source in ('gps','map','search','site')),
  photo_path      text,                         -- percorso in Storage (bucket 'observation-photos')
  note            text check (char_length(note) <= 1000),
  qc_flags        text[] not null default '{}', -- avvisi automatici (non bloccanti)
  deleted         boolean not null default false,
  -- Controllo indispensabile: nessuna data futura (tolleranza 1 giorno per i fusi orari)
  constraint observed_not_future check (observed_on <= (now() at time zone 'Europe/Rome')::date + 1)
);
create index on public.observations (participant_id, observed_on desc);
create index on public.observations (species_id, observed_on);

-- =========================================================
-- Controlli facoltativi (avvisi, non bloccano il salvataggio)
--   possibile_duplicato : stesso partecipante, luogo (o coordinate entro ~50 m), specie e data
--   fase_regressiva     : fase precedente nello stesso luogo/stagione più avanzata
-- =========================================================
create or replace function public.observations_qc() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  prev_rank int;
  cur_rank  int;
  flags     text[] := '{}';
begin
  new.updated_at := now();

  if exists (
    select 1 from public.observations o
    where o.id <> new.id and not o.deleted
      and o.participant_id = new.participant_id
      and o.species_id = new.species_id
      and o.observed_on = new.observed_on
      and (
        (new.site_id is not null and o.site_id = new.site_id)
        or (abs(o.lat - new.lat) < 0.0005 and abs(o.lon - new.lon) < 0.0007)
      )
  ) then
    flags := array_append(flags, 'possibile_duplicato');
  end if;

  select p.rank into cur_rank from public.phases p where p.code = new.phase_code;
  select p.rank into prev_rank
  from public.observations o join public.phases p on p.code = o.phase_code
  where o.id <> new.id and not o.deleted
    and o.participant_id = new.participant_id
    and o.species_id = new.species_id
    and new.site_id is not null and o.site_id = new.site_id
    and o.observed_on < new.observed_on
    and o.observed_on > new.observed_on - interval '120 days'
  order by o.observed_on desc limit 1;

  if prev_rank is not null and cur_rank < prev_rank then
    flags := array_append(flags, 'fase_regressiva');
  end if;

  new.qc_flags := flags;
  return new;
end $$;

create trigger trg_observations_qc
before insert or update on public.observations
for each row execute function public.observations_qc();

-- =========================================================
-- Sicurezza (RLS): ogni partecipante vede e corregge solo i propri dati.
-- Gli amministratori leggono tutto per l'esportazione.
-- =========================================================
alter table public.species      enable row level security;
alter table public.phases       enable row level security;
alter table public.sites        enable row level security;
alter table public.observations enable row level security;
alter table public.admins       enable row level security;

create policy "catalogo leggibile" on public.species for select using (true);
create policy "fasi leggibili"     on public.phases  for select using (true);
create policy "catalogo admin"     on public.species for all using (public.is_admin()) with check (public.is_admin());

create policy "luoghi propri" on public.sites
  for all using (participant_id = auth.uid() or public.is_admin())
  with check (participant_id = auth.uid());

create policy "osservazioni proprie lettura" on public.observations
  for select using (participant_id = auth.uid() or public.is_admin());
create policy "osservazioni proprie inserimento" on public.observations
  for insert with check (participant_id = auth.uid());
create policy "osservazioni proprie correzione" on public.observations
  for update using (participant_id = auth.uid()) with check (participant_id = auth.uid());

create policy "admin leggibili da admin" on public.admins for select using (public.is_admin());

-- =========================================================
-- Esportazione CSV per i responsabili ApiPRO
-- Una riga per osservazione, colonne fisse, nessun dato personale.
-- =========================================================
create or replace view public.export_observations
with (security_invoker = true) as
select
  o.id                       as id_osservazione,
  o.participant_id           as id_partecipante,   -- pseudonimo tecnico, nessun nome/email
  o.site_id                  as id_luogo,
  o.species_id               as specie_id,
  s.scientific               as specie_nome_scientifico,
  o.phase_code               as fase_fenologica,
  o.observed_on              as data_osservazione,
  o.created_at               as data_inserimento,
  round(o.lat::numeric, 6)   as latitudine,
  round(o.lon::numeric, 6)   as longitudine,
  (o.photo_path is not null) as foto_presente,
  o.note                     as note,
  array_to_string(o.qc_flags, ';') as avvisi_qualita,
  o.updated_at               as data_ultima_modifica
from public.observations o
join public.species s on s.id = o.species_id
where not o.deleted;

-- =========================================================
-- Dati iniziali dei cataloghi (da config/*.yaml)
-- =========================================================
insert into public.phases (code, label, definition, rank) values
 ('F0','Non ancora in fiore','Non si vedono fiori aperti',0),
 ('F1','Primi fiori aperti','Sono comparsi i primi fiori, ancora pochi',1),
 ('F2','Fioritura in aumento','I fiori aperti diventano più numerosi',2),
 ('F3','Piena fioritura','La fioritura è molto evidente, vicina al massimo',3),
 ('F4','Fioritura in diminuzione','I fiori aperti diminuiscono e molti stanno appassendo',4),
 ('F5','Fioritura terminata','La fioritura è sostanzialmente conclusa',5);

insert into public.species (id, label, scientific, habitat, sort_order) values
 ('robinia','Acacia (robinia)','Robinia pseudoacacia','Boschi e gruppi di alberi',1),
 ('castagno','Castagno','Castanea sativa','Castagneti e gruppi di alberi',2),
 ('tiglio','Tiglio','Tilia spp.','Filari e gruppi di alberi',3),
 ('colza','Colza','Brassica napus','Campi coltivati',4),
 ('girasole','Girasole','Helianthus annuus','Campi coltivati',5),
 ('tarassaco','Tarassaco','Taraxacum officinale agg.','Prati e superfici erbose',6),
 ('amorfa','Amorfa','Amorpha fruticosa','Siepi e popolamenti spontanei',7),
 ('edera','Edera','Hedera helix','Su alberi, siepi e muri',8),
 ('rododendro','Rododendro','Rhododendron spp.','Aree montane e popolamenti di quota',9),
 ('limonio','Limonio / fiorella di barena','Limonium narbonense','Barena',10),
 ('astro_marino','Astro marino','Tripolium pannonicum','Barena',11);
