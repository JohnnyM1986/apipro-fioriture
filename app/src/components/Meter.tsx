import { METER_LEVEL, PHASE_NOW_LABEL, type PhaseNow } from '../lib/forecast'

/**
 * Misuratore della fioritura (dalla proposta grafica B «Alveare»): 5 tacche, quelle piene in ocra
 * indicano l'intensità attesa oggi. Prima dell'inizio: tacche vuote e «Attesa tra …».
 */
export function Meter({ phase, wait, compact, inline }: { phase: PhaseNow | null; wait?: string; compact?: boolean; inline?: boolean }) {
  const on = phase ? METER_LEVEL[phase] : 0
  const label = phase && phase !== 'F0' ? `Fase attesa oggi: ${PHASE_NOW_LABEL[phase]}` : wait ? `Fioritura attesa tra ${wait}` : 'Fase attesa oggi: non ancora in fiore'
  return (
    <div className={'meter' + (compact ? ' compact' : '') + (inline ? ' inline' : '')}>
      <div className="meter-ticks" role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < on ? 'on' : ''} />)}
      </div>
      {on === 0 && wait ? (
        <small className="meter-wait" aria-hidden="true">Attesa tra {wait}</small>
      ) : (
        inline && phase && <small className="meter-wait" aria-hidden="true">Oggi: {PHASE_NOW_LABEL[phase]}</small>
      )}
    </div>
  )
}
