# ApiPRO – Fioriture del Veneto

WebApp di **citizen science** per segnalare le fasi di fioritura (F0–F5) delle piante di interesse apistico in Veneto e per **prevederne** inizio, piena fioritura e fine, con un modello che si ricalibra sulle segnalazioni.

Progetto ApiPRO – PEI-AGRI, CSR Veneto 2023–2027 – WP3, Att. 8 (modellizzazione) e Att. 9 (sviluppo WebApp).
Coordinamento tecnico: Dott. For. Johnny Moretto, Ph.D. (ATEA Group / Moretto Farm).

> Stato: **release 0.1 – raccolta segnalazioni, in prova** (20/11/2026). Versione di prova: https://johnnym1986.github.io/apipro-fioriture/ (database di TEST, i dati possono essere azzerati).
> Architettura e fasi: [`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md).

## Sviluppo locale

```bash
cd app
npm install
npm run dev      # senza variabili VITE_SUPABASE_* parte in modalità DEMO (dati solo nel browser)
npm test
```

## Licenza

Codice: licenza MIT (vedi `LICENSE`). Contenuti e dati del progetto ApiPRO: secondo le regole del Gruppo Operativo.

## Contenuto

| Cartella | Cosa contiene |
|---|---|
| `docs/` | Architettura e indicazioni sui documenti di riferimento del progetto |
| `config/` | Catalogo delle 11 specie e scala F0–F5 |
| `supabase/` | Schema del database, permessi, controlli, vista di esportazione CSV |
| `app/` | WebApp PWA (in sviluppo) |
| `model/` | Modello fenologico a gradi giorno e ricalibrazione (in sviluppo) |
| `legacy/gee/` | Script Google Earth Engine "ApiPRO MAP" 1.10 (mappe di potenzialità mellifera) |

## Fonti e software di terzi

- Dati meteo: [Open-Meteo](https://open-meteo.com), ERA5-Land, dati CC BY 4.0.
- Modelli fenologici: [pyPhenology](https://github.com/sdtaylor/pyPhenology) (MIT) – Taylor S.D. (2018), JOSS 3(28):827.
- Mappe: Leaflet, © OpenStreetMap contributors.
- Fonti bibliografiche delle finestre di fioritura: indicate per specie in `config/species.yaml`.
