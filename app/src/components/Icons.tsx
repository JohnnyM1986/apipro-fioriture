/** Icone a linea della veste «Prato» (tratto 1.8, colore del testo). */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const IconHome = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path {...P} d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>
)
export const IconForecast = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path {...P} d="M3.5 19.5h17M6 19.5 12 6l6 13.5" /><circle cx="12" cy="5" r="1.4" fill="currentColor" /></svg>
)
export const IconList = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect {...P} x="5" y="3.5" width="14" height="17" rx="2" /><path {...P} d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" /></svg>
)
export const IconInfo = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle {...P} cx="12" cy="12" r="8.5" /><path {...P} d="M12 11v5.5" /><circle cx="12" cy="7.8" r="1.1" fill="currentColor" /></svg>
)
export const IconPlus = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
)
export const IconPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.2" d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" fill="currentColor" /></svg>
)
export const IconClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><circle {...P} cx="12" cy="12" r="8.5" /><path {...P} d="M12 7.5V12l3 2" /></svg>
)
export const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path {...P} strokeWidth="2.2" d="M6 6l12 12M18 6 6 18" /></svg>
)
export const IconLocate = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle {...P} cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="2" fill="currentColor" /><path {...P} d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></svg>
)

export const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path {...P} d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z M9 4.5v13 M15 6.5v13" /></svg>
)
