# ApiPRO – WebApp fioriture: architettura proposta

**Stato:** BOZZA del 20/11/2026, preparata da Claude e da validare con Johnny Moretto e con il partner scientifico (prof. Marco Birolo).
**Riferimenti:** specifiche WebApp, protocollo di monitoraggio fenologico e documento Att. 8 (vedi `docs/RIFERIMENTI.md`), script GEE V1 in `legacy/gee/`.

## 1. Obiettivo

Una WebApp con due funzioni:

1. **Raccolta (citizen science).** Apicoltori e cittadini segnalano luogo, specie, fase F0–F5 e data, seguendo il protocollo di monitoraggio fenologico. È la parte richiesta dalle specifiche Birolo e va messa in produzione per prima.
2. **Previsione.** Per ciascuna delle 11 specie la WebApp mostra quando è attesa la fioritura (inizio, piena, fine) in un punto del Veneto. Si parte da dati di letteratura e da modelli a gradi giorno già usati in fenologia; il modello si **ricalibra da solo** man mano che arrivano le segnalazioni.

## 2. Scelte tecniche e progetti open source riutilizzati

| Componente | Scelta | Perché |
|---|---|---|
| WebApp | PWA (Vite + React + TypeScript), installabile sul telefono, funziona anche con campo scarso | Una sola app per smartphone e PC, nessuno store; si ospita gratis su GitHub Pages |
| Mappa | Leaflet + OpenStreetMap | Open source, nessuna chiave; puntatore sulla mappa e GPS come chiede la specifica |
| Ricerca località | Geocoding Open-Meteo (o Nominatim/OSM) | Gratuito, senza chiave [DA VERIFICARE limiti d'uso] |
| Database, utenti, foto | Supabase (Postgres + Auth + Storage) | Già usato per il gestionale AQN. **Accesso anonimo**: nessuna registrazione, ma il dispositivo resta riconosciuto, come chiede la specifica. In più, facoltativo, link via email per ritrovare le proprie osservazioni su un altro telefono |
| Dati meteo | Open-Meteo: archivio ERA5-Land (dal 1950, ~10 km) + previsioni a 16 giorni | Gratuito per uso non commerciale (dati CC BY 4.0), senza chiave; stessa base ERA5-Land della V1 su Earth Engine ma interrogabile direttamente dalla WebApp e dagli script [DA VERIFICARE che il progetto rientri nell'uso non commerciale] |
| Quota | DTM (Open-Meteo Elevation API, 90 m) | Covariata obbligatoria, per esempio per il castagno |
| Modelli fenologici | **pyPhenology** (Python, licenza MIT; ThermalTime e altri modelli classici con fitting) | Libreria pubblicata (JOSS 2018) e usata per le previsioni fenologiche a scala continentale di naturecast.org: evita di riscrivere modelli e ottimizzatori |
| Automazioni | GitHub Actions | Ogni notte aggiorna le previsioni con il meteo; ogni settimana ricalibra il modello con le nuove segnalazioni |
| Mappe di potenzialità mellifera | Script Earth Engine V1, conservato in `legacy/gee/` | Resta lo strumento per le analisi territoriali (NDVI, NDRE, CORINE, DTM, GDD); in una fase successiva se ne possono pubblicare i livelli come sfondo della WebApp |

## 3. Struttura del repository

```
apipro-fioriture/
├── README.md
├── docs/
│   ├── ARCHITETTURA.md          ← questo documento
│   ├── dizionario_dati.md       campi del CSV di esportazione
│   ├── modello.md               metodo di previsione e di ricalibrazione
│   ├── privacy.md               dati trattati, informativa, conservazione
│   └── RIFERIMENTI.md           dove trovare i documenti di progetto
├── config/
│   ├── species.yaml             11 specie del protocollo + finestre di letteratura con fonte
│   └── phases.yaml              scala unica F0–F5 (testi identici al protocollo)
├── supabase/migrations/         tabelle, permessi, vista di esportazione, controlli
├── app/                         WebApp PWA
│   └── public/img/              foto delle specie e delle fasi F0–F5
├── model/
│   ├── apipro_model/            meteo, gradi giorno, calibrazione, previsioni
│   └── tests/
├── .github/workflows/           pubblicazione WebApp, previsioni notturne, ricalibrazione
└── legacy/gee/WEBAPP_V1.js      script Earth Engine originale (ApiPRO MAP 1.10)
```

## 4. Percorso utente (dalla specifica Birolo)

1. **Luogo:** un'area salvata oppure "Nuovo luogo" (GPS solo dopo autorizzazione, in alternativa puntatore sulla mappa o ricerca della località). La posizione è quella delle piante, non del telefono.
2. **Specie:** 11 voci con foto e ricerca, una sola per segnalazione.
3. **Fase:** F0–F5 con immagine, testi identici al protocollo, nessuna percentuale, nessuna sequenza obbligatoria.
4. **Data:** oggi già impostato, modificabile; le date future sono rifiutate.
5. **Facoltativi:** foto e nota, con suggerimento di indicare sfalcio, raccolta o rimozione.
6. **Conferma:** riepilogo con mappa, salvataggio, correzione sempre possibile da "Le mie osservazioni".

Obiettivo: segnalazione completata in 30–60 secondi con un luogo già salvato.

## 5. Dati e controlli

- **Tabelle:** `species`, `phases`, `sites` (luoghi abituali del partecipante), `observations`, `model_params` (parametri per specie e versione), `predictions` (previsioni per punto di griglia).
- **Partecipante:** identificativo anonimo di Supabase Auth; nessun nome è richiesto.
- **Controlli indispensabili** (lato app e lato database): luogo, specie, fase e data valida, nessuna data futura.
- **Controlli facoltativi**, come avvisi che non bloccano l'invio: possibile duplicato (stesso partecipante, luogo, specie e data); fase che torna indietro rispetto all'osservazione precedente nello stesso luogo; segnalazione molto lontana dalla finestra attesa dal modello.
- **Esportazione CSV:** vista `export_observations` con una riga per osservazione e solo i campi della specifica, senza dati personali; scaricabile dagli amministratori in qualsiasi momento, archivio completo.

## 6. Modello di previsione e autocalibrazione

**Fase 0, subito utilizzabile:** il calendario di letteratura. La WebApp mostra la finestra di fioritura attesa per specie, presa da `species.yaml`, con la fonte citata.

**Fase 1, gradi giorno (modello ThermalTime):** la fioritura arriva quando la somma termica dal giorno t1 supera la soglia F, con temperatura base T. I parametri iniziali **non vengono inventati**: per T si usa la letteratura, oppure 5 °C come nella V1 [DA VERIFICARE per specie]. F si ricava per calibrazione inversa, cioè la somma termica media ERA5-Land 1991–2020, su punti di riferimento del Veneto, alla data centrale della finestra di letteratura. Per colza e girasole, che dipendono da semina e gestione, e per l'edera, che fiorisce in autunno, si resta sul calendario finché non ci sono abbastanza dati.

**Fase 2, ricalibrazione dalle segnalazioni:**
- le segnalazioni F0–F5 diventano eventi con data (inizio = prima F1–F2, piena = F3, fine = F5), gestite come intervalli quando tra due visite la fase cambia;
- ogni settimana un job aggiorna F (e, con dati sufficienti, T e t1) per specie, in modo bayesiano: la letteratura fa da riferimento iniziale e conta sempre meno via via che crescono le osservazioni locali;
- la quota entra come covariata per le specie arboree (castagno, robinia, tiglio) e per il rododendro;
- ogni nuova versione dei parametri viene salvata con data, numero di osservazioni ed errore medio in giorni, così si può dimostrare il miglioramento nel tempo, anche per la rendicontazione;
- con abbastanza dati, pyPhenology permette di confrontare modelli più complessi (es. con fabbisogno in freddo) e tenere il migliore.

**Previsioni:** ogni notte, per una griglia di punti sul Veneto e per i luoghi salvati, si calcola la somma termica a oggi più la previsione a 16 giorni, e per il resto della stagione la climatologia. Il risultato è una data attesa con un intervallo d'incertezza, mostrata nella WebApp come "attesa tra il … e il …".

## 7. Fasi di sviluppo proposte

| Fase | Contenuto | Risultato |
|---|---|---|
| 1 | Database Supabase, WebApp di raccolta completa secondo la specifica, esportazione CSV, foto delle specie e delle fasi | Pronta per i test con i partner e con gli apicoltori dei corsi |
| 2 | Calendario di letteratura e primo modello a gradi giorno con previsioni notturne | Previsioni visibili nella WebApp |
| 3 | Ricalibrazione automatica e pannello di qualità del modello | Sistema che migliora con la citizen science |
| 4 | Integrazione dei livelli Earth Engine (potenzialità mellifera) e indice millefiori | Mappe territoriali nella WebApp |

## 8. Punti da decidere

- Repository pubblico dal 20/11/2026, codice con licenza MIT; link di prova su GitHub Pages.
- [DA VERIFICARE] Nome e indirizzo della WebApp (dominio ApiPRO o sottodominio).
- [DA VERIFICARE] Chi sono gli amministratori dell'esportazione CSV.
- [DA VERIFICARE] Finestre di letteratura con fonte per colza, girasole, edera e astro marino, oggi assenti nel documento Att. 8 v2.
- [DA VERIFICARE] Scala F0–F5 della specifica e scala BBCH proposta nel documento Att. 8: si propone di salvare F0–F5 e di documentare la corrispondenza indicativa (F1 ≈ BBCH 61, F3 ≈ 65, F5 ≈ 69) da validare con Birolo.
- [DA VERIFICARE] Foto di riferimento per specie e fasi (proprie, dei partner o con licenza libera) e validazione botanica di limonio e astro marino.
- [DA VERIFICARE] Informativa privacy e titolare del trattamento.
