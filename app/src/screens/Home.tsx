import type { ReactNode } from 'react'
import { SpeciesBadge } from '../components/SpeciesBadge'
import { Meter } from '../components/Meter'
import { IconHive, IconPlus } from '../components/Icons'
import { Istituzionale } from '../components/Istituzionale'
import { shortSpecies } from '../lib/forecast'
import type { ForecastState } from '../lib/useForecast'

interface Props {
  fc: ForecastState
  nObs: number
  nSites: number
  onNew: () => void
  onForecast: () => void
  onMine: () => void
  onSites: () => void
  onStrength: () => void
  footer?: ReactNode
}

export function Home({ fc, nObs, nSites, onNew, onForecast, onMine, onSites, onStrength, footer }: Props) {
  // in fiore ora, poi le più vicine (le fioriture già finite o non previste non compaiono)
  const near = fc.cards.filter((c) => c.st.key === 'now' || c.st.key === 'before').slice(0, 3)
  return (
    <section className="home">
      <div className="hero">
        <img className="hero-petals" src="./img/brand/apipro-petali.png" alt="" aria-hidden="true" />
        <h1>Cosa fiorisce intorno a te?</h1>
        <p>Una segnalazione in meno di un minuto aiuta a prevedere le fioriture in Veneto.</p>
        <button className="btn ocra big" onClick={onNew}><IconPlus size={22} /> Segnala una fioritura</button>
      </div>

      <div className="home-side">
      {near.length > 0 && (
        <>
          <div className="sec-head">
            <h2>In fiore vicino a te</h2>
            <button className="link-more" onClick={onForecast}>Previsioni ›</button>
          </div>
          <div className="near">
            {near.map(({ s, st, phase }) => (
              <button key={s.id} className="near-card" onClick={onForecast}>
                <SpeciesBadge s={s} size={50} />
                <b>{shortSpecies(s.label)}</b>
                <span className={`pill ${st.tone}`}>{st.label}</span>
                <Meter phase={phase} wait={st.key === 'before' ? st.wait : undefined} compact />
              </button>
            ))}
          </div>
        </>
      )}

      <h2 className="sec-title">Il tuo contributo</h2>
      <div className="contrib">
        <button className="stat" onClick={onMine}><b>{nObs}</b><span>{nObs === 1 ? 'segnalazione inviata' : 'segnalazioni inviate'}</span></button>
        <button className="stat" onClick={onSites}><b>{nSites}</b><span>{nSites === 1 ? 'luogo salvato' : 'luoghi salvati'}</span></button>
      </div>
      <button className="strength-card" onClick={onStrength}>
        <span className="ico-tile"><IconHive size={26} /></span>
        <span><b>Forza degli alveari</b><small>Stima a vista con il metodo dei sesti, per gli apicoltori del progetto</small></span>
        <span className="chev" aria-hidden="true">›</span>
      </button>
      </div>

      {footer}
      <Istituzionale />
    </section>
  )
}
