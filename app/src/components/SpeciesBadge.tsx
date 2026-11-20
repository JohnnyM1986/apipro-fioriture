import type { Species } from '../data/catalog'
import { speciesBg, speciesSvg } from './speciesArt'

/**
 * Foto di riferimento della specie: se è presente public/img/species/<id>.jpg la mostra,
 * altrimenti un'illustrazione nello stile del logo ApiPRO. Le foto definitive vanno fornite dal progetto [DA VERIFICARE].
 */
export function SpeciesBadge({ s, size = 52 }: { s: Species; size?: number }) {
  return (
    <span className="sp-badge" style={{ width: size, height: size, background: speciesBg(s.id) }}>
      <span className="sp-art" dangerouslySetInnerHTML={{ __html: speciesSvg(s.id, Math.round(size * 0.7)) }} />
      <img
        src={`./img/species/${s.id}.jpg`}
        alt=""
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
      />
    </span>
  )
}
