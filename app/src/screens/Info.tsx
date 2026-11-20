import { PHASES, SPECIES } from '../data/catalog'
import { PhaseIcon } from '../components/PhaseIcon'
import { Istituzionale } from '../components/Istituzionale'

/** Sintesi del protocollo di monitoraggio fenologico per i partecipanti. */
export function Info({ participantId, mode }: { participantId: string; mode: string }) {
  return (
    <section className="info">
      <h2>Come partecipare</h2>
      <p>Aiutaci a capire quando iniziano, come evolvono e quando terminano le fioriture delle piante importanti per le api nelle diverse zone del Veneto. Segnala soltanto le piante che riconosci con sicurezza e che vedi nei luoghi che frequenti: non devi spostarti apposta né impegnarti con continuità.</p>
      <h3>Che cosa osservare</h3>
      <p>Guarda lo stato dei fiori aperti nel gruppo di piante scelto (un campo, un prato, un tratto di siepe, un gruppo di alberi). Considera l'aspetto generale, non un singolo fiore. Se possibile osserva sempre lo stesso gruppo di piante; se ci torni spesso, aggiorna la fase ogni 5–7 giorni.</p>
      <h3>Le fasi della fioritura</h3>
      <ul className="phase-legend">
        {PHASES.map((p) => (
          <li key={p.code}><PhaseIcon code={p.code} size={44} /><span><b>{p.code} · {p.label}</b><small>{p.definition}</small></span></li>
        ))}
      </ul>
      <h3>Le 11 piante</h3>
      <ul className="plain">
        {SPECIES.map((s) => <li key={s.id}><b>{s.label}</b> – <i>{s.scientific}</i> – {s.habitat}</li>)}
      </ul>
      <h3>Attenzione</h3>
      <ul className="plain">
        <li>Indica la posizione delle piante, non quella in cui ti trovi mentre compili.</li>
        <li>Se la fioritura finisce per sfalcio, raccolta o rimozione, scrivilo nelle note e non indicare F5 solo per questo.</li>
        <li>Osserva solo da luoghi accessibili in sicurezza, senza entrare in proprietà private senza autorizzazione.</li>
      </ul>
      <h3>I tuoi dati</h3>
      <p>Non chiediamo nome né email. Le tue segnalazioni sono collegate a un codice anonimo di questo dispositivo: <code>{participantId.slice(0, 8)}</code>. Per le elaborazioni scientifiche vengono esportati solo specie, fase, data, posizione, note e la presenza della foto. [Informativa privacy completa: DA VERIFICARE]</p>
      <p className="hint">Gruppo Operativo ApiPRO – Apicoltura e Innovazione per la Produzione Regionale Ottimizzata. Capofila: Moretto Farm Società Agricola s.s. Versione {mode === 'demo' ? 'dimostrativa: i dati restano solo su questo dispositivo' : 'collegata all\'archivio del progetto'}.</p>
      <Istituzionale />
    </section>
  )
}
