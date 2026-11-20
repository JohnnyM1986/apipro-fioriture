# Previsioni di fioritura – fase 2 (release 0.2, versione sperimentale)

Questo documento descrive il modello che calcola, ogni notte, quando sono attese le fioriture delle specie
di interesse apistico nei punti di riferimento del Veneto. È la base della schermata **Previsioni** della WebApp.

## Schema in breve

| | Cosa | Da dove | Ogni quanto |
|---|---|---|---|
| **Quando** | data attesa di inizio (F1), piena (F3) e fine (F5) fioritura | gradi giorno da temperature Open-Meteo (ERA5-Land + previsioni a 16 giorni) | ogni notte, GitHub Actions |
| **Dove** (fase 4) | superfici delle specie (carta forestale, colture, NDVI) | mappe statiche preparate a parte (anche con Google Earth Engine) | una volta l'anno |

L'app **non** interroga Google Earth Engine: le previsioni sono un file statico (`data/predictions.json`)
pubblicato insieme alla WebApp.

## Il modello a gradi giorno

1. **Temperatura media giornaliera**: `Tmedia = (Tmax + Tmin) / 2` per ogni punto, dati ERA5-Land tramite Open-Meteo.
   La quota è già considerata: Open-Meteo riporta la temperatura alla quota del punto con un modello del terreno a 90 m.
2. **Gradi giorno**: `GDD = max(Tmedia − Tbase, 0)`, con `Tbase = 5 °C` (come lo script GEE V1), accumulati dal 1° gennaio.
3. **Calibrazione inversa** (dalla letteratura): per ogni specie si prendono le date indicate dalla letteratura
   (F1 = inizio della finestra, F5 = fine, F3 = metà; oppure le date medie fornite dal partner scientifico, campo
   `reference_dates` in `config/species.yaml`) e si calcolano i gradi giorno accumulati a quelle date in ogni anno
   1991–2020 e in ogni punto della zona di calibrazione. La **soglia** di ogni fase è la mediana di questi valori.
4. **Previsione**: si accumulano i gradi giorno osservati e previsti (16 giorni) e si prosegue con il meteo di ciascuno
   degli anni 1991–2020 ("anni analoghi"). Si ottengono 30 date possibili: la **mediana** è la data attesa, il
   **10°–90° percentile** il margine mostrato nella barra.
5. **Specie "solo calendario"** (colza, girasole, edera, astro marino): dipendono da semina, gestione o hanno fioritura
   autunnale; per ora si mostra la finestra di letteratura senza margine statistico.

## Punti di riferimento

26 punti in `config/points.yaml`: capoluoghi, fascia pedemontana, colli, montagna, laguna e delta, più le postazioni di
campionamento ApiPRO note. Ogni specie è calibrata nelle zone in cui la finestra di letteratura è valida
(`calibration_zones`: di norma pianura e collina; rododendro in montagna; limonio e astro marino in laguna).
Nell'app l'utente sceglie il punto o usa "Vicino a me" (punto più vicino). [DA VERIFICARE] infittire la rete dopo la validazione.

## Verifica a ritroso

`python model/run.py hindcast` calcola, per il 2024 e il 2025, la data che il modello avrebbe previsto il 15/01,
il 01/03, il 01/04 e il 01/05 e la confronta con la data ottenuta a fine stagione con il meteo reale.
Misura quindi **quanto la previsione si avvicina alla data finale man mano che la stagione avanza**, non l'errore
rispetto alle fioriture osservate, che si potrà calcolare solo con le segnalazioni (fase 3).
Risultati in `model/output/hindcast.md`. Controllo aggiuntivo: ritardo dell'inizio fioritura del castagno con la quota,
confrontato con il valore di letteratura (+1 giorno ogni 40 m, Att. 8 v2 [7]).

## Esecuzione

| Workflow | Quando | Cosa fa |
|---|---|---|
| `model-history.yml` | ogni 3 ore finché lo storico non è completo, e a ogni modifica di modello o configurazione | scarica lo storico 1991–2025 (riprende da dove si era fermato, per il limite giornaliero del piano gratuito), calcola soglie e verifica, salva in `model/data` e `model/output` |
| `deploy-pages.yml` | ogni notte alle 03:30 e a ogni modifica | scarica il meteo dell'anno in corso e le previsioni, calcola `predictions.json`, ricompila e pubblica la WebApp |

In locale: `pip install -r model/requirements.txt`, poi `python model/run.py fetch-history | calibrate | hindcast | forecast`.
Test: `python -m pytest model/tests`.

## Limiti noti e punti da validare con UNIPD

- Le finestre di letteratura sono ampie e riferite in parte all'Italia intera: le soglie vanno affinate con le
  **date medie F1/F3/F5 per il Veneto** fornite dal partner scientifico [DA VERIFICARE].
- Tarassaco: la finestra parte a febbraio, la soglia F1 risulta quasi nulla; serve un criterio diverso (fioritura
  quasi continua, influenzata dagli sfalci) [DA VERIFICARE].
- Temperatura base unica a 5 °C per tutte le specie [DA VERIFICARE per specie].
- Nessun effetto del freddo invernale (vernalizzazione) né del fotoperiodo: possibile estensione con i modelli di pyPhenology.
- Dati meteo Open-Meteo: piano gratuito per uso non commerciale, attribuzione CC BY 4.0 [DA VERIFICARE formalmente].
- Fase 3: ricalibrazione con le segnalazioni F1/F3/F5 (aggiornamento delle soglie per specie e zona, registro delle versioni con errore medio in giorni).
