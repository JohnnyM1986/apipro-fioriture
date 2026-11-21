import { IconAlert, IconFlower, IconHive } from '../components/Icons'

interface Props {
  onFlowering: () => void
  onEvent: () => void
  onStrength: () => void
}

/** Primo passo del «+»: che cosa vuoi segnalare. La fioritura resta la scelta principale. */
export function ChooseReport({ onFlowering, onEvent, onStrength }: Props) {
  return (
    <section className="choose">
      <h2>Cosa vuoi segnalare?</h2>
      <div className="report-cards">
        <button className="report-card main" onClick={onFlowering}>
          <span className="rc-ico"><IconFlower size={30} /></span>
          <b>Una fioritura</b>
          <span>La fase della fioritura di una pianta importante per le api.</span>
        </button>
        <button className="report-card" onClick={onEvent}>
          <span className="rc-ico"><IconAlert size={30} /></span>
          <b>Un altro evento</b>
          <span>Uno sciame, una moria di api, il calabrone asiatico o altro.</span>
        </button>
        <button className="report-card" onClick={onStrength}>
          <span className="rc-ico"><IconHive size={30} /></span>
          <b>La forza degli alveari</b>
          <span>Stima a vista con il metodo dei sesti, per gli apicoltori del progetto.</span>
        </button>
      </div>
    </section>
  )
}
