import type { Species } from '../data/catalog'

/**
 * Foto di riferimento della specie: se è presente public/img/species/<id>.jpg la mostra,
 * altrimenti un segnaposto con l'iniziale. Le foto definitive vanno fornite dal progetto [DA VERIFICARE].
 */
const COLORS = ['#2f6b3a', '#7a4a12', '#3d6f8f', '#8a5a9e', '#a05a2c', '#4f7d2a']

export function SpeciesBadge({ s, size = 52 }: { s: Species; size?: number }) {
  const color = COLORS[s.id.length % COLORS.length]
  return (
    <span className="sp-badge" style={{ width: size, height: size, background: color }}>
      <img
        src={`./img/species/${s.id}.jpg`}
        alt=""
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
      />
      <b>{s.label.charAt(0)}</b>
    </span>
  )
}
