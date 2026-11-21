# Veste grafica della WebApp (release 0.3.1)

**Decisione:** proposta A «Prato» con il misuratore a tacchette della proposta B «Alveare»
(decisione di Johnny del 20/11/2026). Applicata a tutte le schermate dalla release 0.3.1.

<p align="center">
  <img src="img/grafica_A_inizio.png" width="230" alt="Inizio">
  <img src="img/grafica_A_previsioni.png" width="230" alt="Previsioni (Crocetta del Montello)">
  <img src="img/grafica_A_fase.png" width="230" alt="Segnala, passo della fase">
</p>

*Schermate a 390 px con la data simulata 12/05/2027 e il punto Crocetta del Montello (modalità DEMO).*

La grafica cambia solo l'aspetto: funzionamento, modello di previsione, dati salvati e testi del protocollo
(etichette e definizioni delle fasi F0–F5, specie, avvertenze) restano quelli di prima.

## Logo (release 0.3.5)

Il logo **non va ridisegnato né ricomposto**: si usa solo il file ufficiale del brand kit.

- Versione corretta: **petali sopra, scritta «ApiPro» sotto, lettere di spessore uniforme** (brand kit Canva
  «Api Pro»; file fornito da Johnny il 21/11/2026). Le varianti del design Canva «logo.ai», con «Api» sottile e
  «Pro» più grande, **non sono quelle corrette**.
- Nell'app: `app/public/img/brand/apipro-logo.png` = logo ufficiale intero (reso trasparente, forme e colori
  invariati), mostrato così com'è nella testata (64 px su telefono, 76 px su PC); `apipro-logo-bianco.png` = stesso
  logo con la scritta bianca per i fondi scuri; `apipro-petali.png` = solo i petali dello stesso file, usati come
  decorazione della card verde di Inizio. Icone dell'app (`icon-192.png`, `icon-512.png`) = petali su fondo verde.
- Colori del logo: scritta `#383E2E`, petali `#94806A` e `#D68B3C`.
- Fino alla 0.3.3 l'app usava una versione ricomposta e deformata; nella 0.3.4 una variante non corretta: sostituite.
- Loghi istituzionali (UE, Repubblica Italiana, Regione del Veneto, Sviluppo Rurale Veneto) in fondo a Inizio e Info:
  larghi al massimo 420 px su telefono e 380 px su tablet e PC, per non farli diventare troppo grandi.

## Colori

| Ruolo | Colore | Uso |
|---|---|---|
| Fondo carta | `#F3EEE3` | sfondo di tutte le pagine |
| Card | `#FFFDF8` | card, barra in basso, pulsanti bianchi |
| Bordo | `#E6DECE` | bordo sottile beige di card e campi |
| Tessera | `#EFE9DC` | fondo delle illustrazioni delle fasi e delle icone |
| Verde brand | `#363D2D` | card principale di Inizio, pulsante «Avanti», titoli |
| Ocra brand | `#D2893C` | tacche del misuratore, segmenti fatti, icona attiva, bordo della card scelta, decorazioni |
| Ocra pulsanti | `#C27829` | pulsanti ocra con testo bianco (più scuro per il contrasto) |
| Ocra testo | `#9A5A17` | testi ocra su fondo chiaro: «PASSO 4 DI 6», «Previsioni ›», voce attiva |
| Pillola «Ora / In piena» | fondo `#F6DFC2`, testo `#8A4F12` | specie in fioritura |
| Pillola «Tra X sett.» | fondo `#E3EAD3`, testo `#4E6131` | fioritura in arrivo |
| Pillola «In calo / Finita» | fondo `#ECE5D7`, testo `#675F50` | fioritura in diminuzione o finita |

Tutti i testi piccoli hanno contrasto almeno 4,5:1 sul loro fondo; il testo bianco sui pulsanti ocra è grande e in grassetto.

## Font

- **Bitter** (500 e 600) per i titoli, simile al lettering ApiPro.
- **Source Sans 3** (400, 600, 700) per il testo.

Sono installati come pacchetti (`@fontsource/bitter`, `@fontsource/source-sans-3`, solo i caratteri latini) e inclusi
nella cache dell'app installata: funzionano anche senza rete.

## Componenti

- **Testata** sul fondo carta (niente più barra verde): logo ApiPro a sinistra, badge DEMO/TEST piccolo, a destra
  l'etichetta arrotondata con il segnaposto e il punto delle previsioni (es. «Crocetta d. M.», tocca per aprire le Previsioni).
- **Barra in basso** bianca con icone a linea: Inizio, Previsioni, «+» ocra rialzato al centro (apre Segnala), Le mie, Info.
  La voce attiva è in ocra. Durante la segnalazione la barra lascia il posto ai pulsanti «Indietro» e «Avanti».
- **Inizio:** card verde scura con i petali del logo, «+ Segnala una fioritura»; «In fiore vicino a te» con 3 card
  (specie in fioritura ora, poi le più vicine, dal punto scelto) e il misuratore; «Il tuo contributo» con segnalazioni
  inviate e luoghi salvati; loghi istituzionali e dicitura FEASR in fondo.
- **Previsioni:** titolo, etichetta del punto con quota e menu a tendina, «Usa la mia posizione» e «Scegli sulla mappa»
  (dalla 0.3.2: mappa e luoghi salvati, riquadro con postazione usata e avviso di quota su fondo ocra chiaro), filtro
  «Tutte / Alberi / Prati e campi», card per specie con date in grassetto, pillola di stato, barra della stagione
  marzo–settembre (fascia chiara = margine, nucleo ocra = piena fioritura, trattino «oggi») e misuratore.
- **Segnala:** barra di avanzamento a segmenti, «PASSO X DI 6», domanda in Bitter, etichetta della specie scelta,
  fasi in griglia a 2 colonne con illustrazione grande, card scelta con bordo e spunta ocra; pulsanti fissi in basso.
- **Misuratore** (dalla proposta B): 5 tacchette, quelle piene in ocra indicano l'intensità della fioritura attesa oggi.

| Fase attesa oggi | F0 | F1 | F2 | F3 | F4 | F5 |
|---|---|---|---|---|---|---|
| Tacche piene | 0 | 1 | 3 | 4 | 2 | 0 |

  La fase è quella del modello (stessa regola di `phase_today` in `model/apipro_model/thermal.py`), ricalcolata
  sulla data del telefono. Il modello non separa F1 e F2 («inizio/aumento»): solo per il misuratore la prima metà
  di quel periodo vale F1 e la seconda F2. Prima dell'inizio della fioritura (e prima dell'inizio della stagione)
  le tacche sono vuote con la scritta «Attesa tra …». Per i lettori di schermo il misuratore ha un testo
  alternativo, es. «Fase attesa oggi: piena fioritura».

## Telefono, tablet e PC (release 0.3.3)

L'app si adatta alla larghezza dello schermo; su telefono resta come nelle schermate sopra.

| Larghezza | Disposizione |
|---|---|
| fino a 699 px (telefono) | una colonna, barra in basso con «+» ocra, pulsanti «Indietro/Avanti» fissi |
| 700–1023 px (tablet) | contenuto fino a 760 px, mappe alte 420 px, fasi su 3 colonne |
| da 1024 px (PC) | menu in alto (Inizio, Previsioni, Le mie, Info e pulsante «+ Segnala»), niente barra in basso; Inizio su due colonne; previsioni su 2 colonne (3 da 1500 px); luogo della segnalazione con la mappa grande a destra; scelta del punto con mappa grande; fasi su 3 colonne (6 da 1280 px); Le mie e la legenda delle fasi su 2 colonne |

Su PC l'altezza delle mappe segue quella dello schermo (fino a 640 px), così mappa e pulsanti restano visibili
anche su un portatile 1366 × 768.

<p align="center">
  <img src="img/grafica_A_pc_inizio.png" width="420" alt="Inizio su PC">
  <img src="img/grafica_A_pc_previsioni.png" width="420" alt="Previsioni su PC">
</p>

## Gruppi di specie nel filtro delle Previsioni [DA VERIFICARE con UNIPD]

- **Alberi:** robinia (acacia), castagno, tiglio, amorfa, rododendro, edera.
- **Prati e campi:** tarassaco, colza, girasole, limonio, astro marino.

Il gruppo è un campo `group` del catalogo (`app/src/data/catalog.ts`) e serve solo al filtro.

## Verifiche

- Larghezza minima 360 px senza scorrimento orizzontale (controllata da `npm run screenshots` su Inizio,
  Previsioni, Le mie, Info, passo Fase e Conferma).
- Telefono, tablet e PC: `node scripts/screenshots.mjs --sizes <cartella>` fotografa Inizio, Previsioni (anche con la
  mappa), Le mie, Info, luogo con mappa e passo Fase a 360, 390, 768, 1024, 1366 e 1920 px e segnala ogni
  scorrimento orizzontale.
- Schermate rigenerabili: dalla cartella `app`, con le previsioni in `public/data/predictions.json`
  (`python model/run.py forecast`), `npx playwright install chromium` una volta e poi `npm run screenshots`.
