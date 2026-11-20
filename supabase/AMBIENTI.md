# Ambienti Supabase

| Ambiente | Progetto | Regione | Piano | Stato |
|---|---|---|---|---|
| TEST (prova UniPD) | `apipro-fioriture-test` (ref `bxwmpnkkasukhfmqffii`) | eu-central-1 (Francoforte) | Free, organizzazione "atea" | Creato il 20/11/2026, migrazioni 0001–0003 applicate |
| PRODUZIONE | da creare al lancio | — | — | — |

URL API test: https://bxwmpnkkasukhfmqffii.supabase.co
Chiave pubblica (publishable, pensata per stare nel codice del browser): `sb_publishable_NX0mAQImAbAFz3yz5a8TzA_ORyH9d-9`

Da fare a mano nella dashboard (non disponibile via connettore):
- Authentication → Sign In / Providers → attivare **Allow anonymous sign-ins** (necessario: i partecipanti non si registrano).
- Consigliato prima del lancio pubblico: CAPTCHA (Cloudflare Turnstile) sulle registrazioni anonime, per limitare abusi.
- Inserire gli amministratori dell'esportazione: `insert into public.admins(user_id) values ('<uuid utente>');`

Nota piano Free: i progetti inattivi per una settimana vengono messi in pausa; durante la prova UniPD va tenuto attivo (basta l'uso dell'app).
