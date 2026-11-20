import type { PhaseCode } from '../data/catalog'

/**
 * Illustrazione schematica delle fasi F0–F5 (supporto al riconoscimento, non sostituisce le foto
 * di riferimento che verranno fornite dal progetto). Un ramo con boccioli, fiori aperti e fiori appassiti.
 */
const LAYOUT: Record<PhaseCode, ('bud' | 'open' | 'wilt' | 'none')[]> = {
  F0: ['bud', 'bud', 'bud', 'bud', 'bud', 'bud'],
  F1: ['open', 'bud', 'bud', 'bud', 'bud', 'bud'],
  F2: ['open', 'open', 'open', 'bud', 'bud', 'bud'],
  F3: ['open', 'open', 'open', 'open', 'open', 'open'],
  F4: ['wilt', 'wilt', 'wilt', 'open', 'open', 'wilt'],
  F5: ['none', 'wilt', 'none', 'none', 'wilt', 'none']
}
const POS = [
  [20, 18], [40, 14], [60, 20], [26, 38], [48, 36], [66, 42]
]

export function PhaseIcon({ code, size = 64 }: { code: PhaseCode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 84 70" aria-hidden="true">
      <path d="M8 66 C30 58 46 46 74 30" stroke="#5b7f3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {LAYOUT[code].map((k, i) => {
        const [x, y] = POS[i]
        if (k === 'none') return <circle key={i} cx={x} cy={y + 6} r="1.6" fill="#5b7f3a" />
        if (k === 'bud') return <ellipse key={i} cx={x} cy={y + 4} rx="3.4" ry="5" fill="#8fb35a" />
        if (k === 'wilt')
          return (
            <g key={i}>
              <path d={`M${x - 6} ${y + 6} q6 -6 12 0`} stroke="#a58a5c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx={x} cy={y + 5} r="2.4" fill="#8a6a3a" />
            </g>
          )
        return (
          <g key={i}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a}
                cx={x + 5 * Math.cos((a * Math.PI) / 180)}
                cy={y + 4 + 5 * Math.sin((a * Math.PI) / 180)}
                rx="3.8"
                ry="3.8"
                fill="#f6c745"
              />
            ))}
            <circle cx={x} cy={y + 4} r="2.6" fill="#b5651d" />
          </g>
        )
      })}
    </svg>
  )
}
