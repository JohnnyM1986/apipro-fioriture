-- ApiPRO – WebApp fioriture
-- Migrazione 0004 (release 0.4, 21/11/2026):
--   1. Altre segnalazioni (sciame, moria, calabrone asiatico, altro): anonime come le fioriture.
--   2. Forza degli alveari (metodo dei sesti, valutazione a vista): solo apicoltori abilitati con codice.
--      Si salvano SOLO i valori dei sesti, mai le foto.
--   3. Richieste di partecipazione, anagrafica apicoltori e codici personali.
--   4. Codice responsabili: chi lo inserisce diventa amministratore su quel dispositivo.

-- =========================================================
-- 1. Altre segnalazioni
-- =========================================================
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type      text not null check (event_type in ('sciame','moria','vespa_velutina','altro')),
  observed_on     date not null,
  lat             double precision not null check (lat between -90 and 90),
  lon             double precision not null check (lon between -180 and 180),
  location_source text check (location_source in ('gps','map','search','site')),
  note            text check (char_length(note) <= 1000),
  created_at      timestamptz not null default now(),
  deleted         boolean not null default false,
  constraint event_not_future check (observed_on <= (now() at time zone 'Europe/Rome')::date + 1),
  constraint altro_con_nota check (event_type <> 'altro' or char_length(coalesce(note, '')) > 0)
);
create index on public.events (participant_id, observed_on desc);

alter table public.events enable row level security;
create policy "eventi propri lettura" on public.events
  for select using (participant_id = auth.uid() or public.is_admin());
create policy "eventi propri inserimento" on public.events
  for insert with check (participant_id = auth.uid());
create policy "eventi propri correzione" on public.events
  for update using (participant_id = auth.uid()) with check (participant_id = auth.uid());

-- =========================================================
-- 2. Apicoltori abilitati alla stima della forza
-- =========================================================
create table public.beekeepers (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null check (char_length(full_name) between 2 and 120),
  email              text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  phone              text check (char_length(phone) <= 40),
  farm               text check (char_length(farm) <= 120),
  municipality       text check (char_length(municipality) <= 120),
  code               text not null unique,
  active             boolean not null default true,
  trained_on         date,
  protocol_delivered boolean not null default false,
  note               text check (char_length(note) <= 1000),
  code_sent_at       timestamptz,
  created_at         timestamptz not null default now()
);

create table public.strength_requests (
  id               uuid primary key default gen_random_uuid(),
  participant_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name        text not null check (char_length(full_name) between 2 and 120),
  email            text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  phone            text check (char_length(phone) <= 40),
  farm             text check (char_length(farm) <= 120),
  municipality     text not null check (char_length(municipality) between 2 and 120),
  privacy_accepted boolean not null check (privacy_accepted),
  status           text not null default 'in_attesa' check (status in ('in_attesa','approvata','rifiutata')),
  beekeeper_id     uuid references public.beekeepers(id) on delete set null,
  notified_at      timestamptz,
  created_at       timestamptz not null default now()
);
-- una sola richiesta in attesa per dispositivo
create unique index strength_requests_una_in_attesa on public.strength_requests (participant_id) where status = 'in_attesa';

-- dispositivi collegati a un apicoltore (inserendo il codice o con la richiesta approvata)
create table public.beekeeper_devices (
  participant_id uuid primary key references auth.users(id) on delete cascade,
  beekeeper_id   uuid not null references public.beekeepers(id) on delete cascade,
  linked_at      timestamptz not null default now()
);

alter table public.beekeepers        enable row level security;
alter table public.strength_requests enable row level security;
alter table public.beekeeper_devices enable row level security;

create policy "apicoltori solo admin" on public.beekeepers
  for all using (public.is_admin()) with check (public.is_admin());
create policy "richieste proprie lettura" on public.strength_requests
  for select using (participant_id = auth.uid() or public.is_admin());
create policy "richieste proprie inserimento" on public.strength_requests
  for insert with check (participant_id = auth.uid() and status = 'in_attesa' and beekeeper_id is null and notified_at is null);
create policy "richieste gestite da admin" on public.strength_requests
  for update using (public.is_admin()) with check (public.is_admin());
create policy "dispositivi propri lettura" on public.beekeeper_devices
  for select using (participant_id = auth.uid() or public.is_admin());

-- apicoltore attivo collegato al dispositivo corrente (null se nessuno)
create or replace function public.current_beekeeper_id() returns uuid
language sql stable security definer set search_path = public as $$
  select d.beekeeper_id from public.beekeeper_devices d
  join public.beekeepers b on b.id = d.beekeeper_id
  where d.participant_id = auth.uid() and b.active;
$$;

-- stato della sezione forza per il dispositivo corrente
create or replace function public.my_strength_status()
returns table (beekeeper_name text, active boolean, pending boolean)
language sql stable security definer set search_path = public as $$
  select
    (select b.full_name from public.beekeeper_devices d join public.beekeepers b on b.id = d.beekeeper_id where d.participant_id = auth.uid()),
    coalesce((select b.active from public.beekeeper_devices d join public.beekeepers b on b.id = d.beekeeper_id where d.participant_id = auth.uid()), false),
    exists (select 1 from public.strength_requests r where r.participant_id = auth.uid() and r.status = 'in_attesa');
$$;

-- codice personale: APR-XXXX-XXXX (32 simboli senza 0/O/1/I, circa 10^12 combinazioni)
create or replace function public.new_beekeeper_code() returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  c text;
begin
  loop
    bytes := gen_random_bytes(8);
    c := '';
    for i in 0..7 loop
      c := c || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    c := 'APR-' || substr(c, 1, 4) || '-' || substr(c, 5, 4);
    exit when not exists (select 1 from public.beekeepers where code = c);
  end loop;
  return c;
end $$;

-- inserimento del codice sul dispositivo
create or replace function public.redeem_beekeeper_code(p_code text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  bk public.beekeepers;
begin
  if auth.uid() is null then raise exception 'accesso_richiesto'; end if;
  select * into bk from public.beekeepers
  where replace(code, '-', '') = norm and active;
  if not found then raise exception 'codice_non_valido'; end if;
  insert into public.beekeeper_devices (participant_id, beekeeper_id) values (auth.uid(), bk.id)
  on conflict (participant_id) do update set beekeeper_id = excluded.beekeeper_id, linked_at = now();
  return bk.full_name;
end $$;

-- approvazione di una richiesta (solo amministratori): crea l'apicoltore, il codice e collega il dispositivo richiedente
create or replace function public.approve_strength_request(p_request uuid)
returns table (beekeeper_id uuid, code text)
language plpgsql volatile security definer set search_path = public as $$
declare
  r public.strength_requests;
  new_id uuid;
  new_code text;
begin
  if not public.is_admin() then raise exception 'solo_responsabili'; end if;
  select * into r from public.strength_requests where id = p_request and status = 'in_attesa';
  if not found then raise exception 'richiesta_non_trovata'; end if;
  new_code := public.new_beekeeper_code();
  insert into public.beekeepers (full_name, email, phone, farm, municipality, code)
  values (r.full_name, r.email, r.phone, r.farm, r.municipality, new_code)
  returning id into new_id;
  update public.strength_requests set status = 'approvata', beekeeper_id = new_id where id = r.id;
  insert into public.beekeeper_devices (participant_id, beekeeper_id) values (r.participant_id, new_id)
  on conflict (participant_id) do update set beekeeper_id = excluded.beekeeper_id, linked_at = now();
  return query select new_id, new_code;
end $$;

-- nuovo codice (solo amministratori): il vecchio non vale più e i dispositivi vanno ricollegati
create or replace function public.renew_beekeeper_code(p_beekeeper uuid) returns text
language plpgsql volatile security definer set search_path = public as $$
declare new_code text;
begin
  if not public.is_admin() then raise exception 'solo_responsabili'; end if;
  new_code := public.new_beekeeper_code();
  update public.beekeepers set code = new_code, code_sent_at = null where id = p_beekeeper;
  if not found then raise exception 'apicoltore_non_trovato'; end if;
  delete from public.beekeeper_devices where beekeeper_id = p_beekeeper;
  return new_code;
end $$;

-- =========================================================
-- 3. Stime di forza (metodo dei sesti, valutazione a vista)
--    combs = [{"n": 1, "a": [s1..s6] | null, "b": [s1..s6] | null}, ...]
--    sesti numerati per righe: 1 2 3 in alto, 4 5 6 in basso; valori 0–6
-- =========================================================
create or replace function public.valid_combs(c jsonb) returns boolean
language plpgsql immutable set search_path = public as $$
declare
  el jsonb;
  side text;
  v jsonb;
begin
  if jsonb_typeof(c) <> 'array' or jsonb_array_length(c) not between 1 and 40 then return false; end if;
  for el in select * from jsonb_array_elements(c) loop
    if jsonb_typeof(el) <> 'object' or jsonb_typeof(el -> 'n') <> 'number' then return false; end if;
    if coalesce(jsonb_typeof(el -> 'a'), 'null') = 'null' and coalesce(jsonb_typeof(el -> 'b'), 'null') = 'null' then return false; end if;
    foreach side in array array['a','b'] loop
      if coalesce(jsonb_typeof(el -> side), 'null') <> 'null' then
        if jsonb_typeof(el -> side) <> 'array' or jsonb_array_length(el -> side) <> 6 then return false; end if;
        for v in select * from jsonb_array_elements(el -> side) loop
          if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not in (0,1,2,3,4,5,6) then return false; end if;
        end loop;
      end if;
    end loop;
  end loop;
  return true;
end $$;

create table public.strength_visits (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  beekeeper_id   uuid references public.beekeepers(id) on delete set null,
  visited_on     date not null,
  site_id        uuid references public.sites(id) on delete set null,
  site_name      text check (char_length(site_name) <= 80),
  lat            double precision not null check (lat between -90 and 90),
  lon            double precision not null check (lon between -180 and 180),
  hive_label     text not null check (char_length(hive_label) between 1 and 40),
  combs          jsonb not null check (public.valid_combs(combs)),
  note           text check (char_length(note) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted        boolean not null default false,
  constraint visit_not_future check (visited_on <= (now() at time zone 'Europe/Rome')::date + 1)
);
create index on public.strength_visits (participant_id, visited_on desc);
create index on public.strength_visits (beekeeper_id, visited_on);

-- l'apicoltore lo decide il database (dal dispositivo), non il dispositivo
create or replace function public.strength_visits_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.beekeeper_id := public.current_beekeeper_id();
    if new.beekeeper_id is null then raise exception 'codice_richiesto'; end if;
  else
    new.beekeeper_id := old.beekeeper_id;
    new.participant_id := old.participant_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_strength_visits_stamp
before insert or update on public.strength_visits
for each row execute function public.strength_visits_stamp();

alter table public.strength_visits enable row level security;
create policy "stime proprie lettura" on public.strength_visits
  for select using (participant_id = auth.uid() or public.is_admin());
create policy "stime proprie inserimento" on public.strength_visits
  for insert with check (participant_id = auth.uid() and public.current_beekeeper_id() is not null);
create policy "stime proprie correzione" on public.strength_visits
  for update using (participant_id = auth.uid()) with check (participant_id = auth.uid());

-- =========================================================
-- 4. Codice responsabili (si imposta dalla dashboard SQL, non dall'app)
--    select public.set_admin_code('codice-scelto');
-- =========================================================
create table public.app_secrets (
  key   text primary key,
  value text not null
);
alter table public.app_secrets enable row level security; -- nessuna policy: illeggibile dall'app

create or replace function public.set_admin_code(p_code text) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if char_length(coalesce(p_code, '')) < 10 then raise exception 'codice_troppo_corto (almeno 10 caratteri)'; end if;
  insert into public.app_secrets (key, value) values ('admin_code', crypt(p_code, gen_salt('bf')))
  on conflict (key) do update set value = excluded.value;
end $$;

create or replace function public.claim_admin(p_code text) returns boolean
language plpgsql volatile security definer set search_path = public, extensions as $$
declare h text;
begin
  if auth.uid() is null then return false; end if;
  select value into h from public.app_secrets where key = 'admin_code';
  if h is null or crypt(coalesce(p_code, ''), h) <> h then
    perform pg_sleep(1); -- rallenta i tentativi
    return false;
  end if;
  insert into public.admins (user_id) values (auth.uid()) on conflict do nothing;
  return true;
end $$;

-- =========================================================
-- 5. Esportazioni per i responsabili
-- =========================================================
create or replace view public.export_strength
with (security_invoker = true) as
select
  v.id                         as id_stima,
  v.visited_on                 as data_visita,
  b.full_name                  as apicoltore,
  b.farm                       as azienda,
  b.municipality               as comune,
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

create or replace view public.export_events
with (security_invoker = true) as
select
  e.id                       as id_segnalazione,
  e.participant_id           as id_partecipante,
  e.event_type               as tipo,
  e.observed_on              as data_evento,
  e.created_at               as data_inserimento,
  round(e.lat::numeric, 6)   as latitudine,
  round(e.lon::numeric, 6)   as longitudine,
  e.note                     as note
from public.events e
where not e.deleted;

-- =========================================================
-- 6. Permessi delle funzioni
-- =========================================================
revoke execute on function public.current_beekeeper_id() from public, anon;
grant  execute on function public.current_beekeeper_id() to authenticated;
revoke execute on function public.my_strength_status() from public, anon;
grant  execute on function public.my_strength_status() to authenticated;
revoke execute on function public.redeem_beekeeper_code(text) from public, anon;
grant  execute on function public.redeem_beekeeper_code(text) to authenticated;
revoke execute on function public.approve_strength_request(uuid) from public, anon;
grant  execute on function public.approve_strength_request(uuid) to authenticated;
revoke execute on function public.renew_beekeeper_code(uuid) from public, anon;
grant  execute on function public.renew_beekeeper_code(uuid) to authenticated;
revoke execute on function public.claim_admin(text) from public, anon;
grant  execute on function public.claim_admin(text) to authenticated;
revoke execute on function public.new_beekeeper_code() from public, anon, authenticated;
revoke execute on function public.set_admin_code(text) from public, anon, authenticated;
revoke execute on function public.strength_visits_stamp() from public, anon, authenticated;
