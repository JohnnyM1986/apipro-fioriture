// Catalogo specie e scala fenologica – allineati a config/species.yaml e config/phases.yaml
// Testi identici al protocollo utenti e alla specifica WebApp (prof. Birolo).

export type PhaseCode = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5'

export interface Species {
  id: string
  label: string
  scientific: string
  habitat: string
  /** Gruppo per il filtro delle Previsioni [DA VERIFICARE con UNIPD] */
  group: SpeciesGroup
  hint?: string
}

export type SpeciesGroup = 'alberi' | 'prati'
export const GROUPS: { id: SpeciesGroup; label: string }[] = [
  { id: 'alberi', label: 'Alberi' },
  { id: 'prati', label: 'Prati e campi' }
]

export interface Phase {
  code: PhaseCode
  label: string
  definition: string
  rank: number
}

export const SPECIES: Species[] = [
  { id: 'robinia', label: 'Acacia (robinia)', scientific: 'Robinia pseudoacacia', habitat: 'Boschi e gruppi di alberi', group: 'alberi' },
  { id: 'castagno', label: 'Castagno', scientific: 'Castanea sativa', habitat: 'Castagneti e gruppi di alberi', group: 'alberi' },
  { id: 'tiglio', label: 'Tiglio', scientific: 'Tilia spp.', habitat: 'Filari e gruppi di alberi', group: 'alberi' },
  { id: 'colza', label: 'Colza', scientific: 'Brassica napus', habitat: 'Campi coltivati', group: 'prati', hint: 'Considera il campo nel suo insieme' },
  { id: 'girasole', label: 'Girasole', scientific: 'Helianthus annuus', habitat: 'Campi coltivati', group: 'prati', hint: 'Considera il campo nel suo insieme' },
  { id: 'tarassaco', label: 'Tarassaco', scientific: 'Taraxacum officinale agg.', habitat: 'Prati e superfici erbose', group: 'prati', hint: 'Considera il prato nel suo insieme' },
  { id: 'amorfa', label: 'Amorfa', scientific: 'Amorpha fruticosa', habitat: 'Siepi e popolamenti spontanei', group: 'alberi' },
  { id: 'edera', label: 'Edera', scientific: 'Hedera helix', habitat: 'Su alberi, siepi e muri', group: 'alberi' },
  { id: 'rododendro', label: 'Rododendro', scientific: 'Rhododendron spp.', habitat: 'Aree montane e popolamenti di quota', group: 'alberi' },
  { id: 'limonio', label: 'Limonio (fiorella di barena)', scientific: 'Limonium narbonense', habitat: 'Barena', group: 'prati' },
  { id: 'astro_marino', label: 'Astro marino', scientific: 'Tripolium pannonicum', habitat: 'Barena', group: 'prati' }
]

export const PHASES: Phase[] = [
  { code: 'F0', label: 'Non ancora in fiore', definition: 'Non si vedono fiori aperti', rank: 0 },
  { code: 'F1', label: 'Primi fiori aperti', definition: 'Sono comparsi i primi fiori, ancora pochi', rank: 1 },
  { code: 'F2', label: 'Fioritura in aumento', definition: 'I fiori aperti diventano più numerosi', rank: 2 },
  { code: 'F3', label: 'Piena fioritura', definition: 'La fioritura è molto evidente, vicina al massimo', rank: 3 },
  { code: 'F4', label: 'Fioritura in diminuzione', definition: 'I fiori aperti diminuiscono e molti stanno appassendo', rank: 4 },
  { code: 'F5', label: 'Fioritura terminata', definition: 'La fioritura è sostanzialmente conclusa', rank: 5 }
]

export const speciesById = (id: string) => SPECIES.find((s) => s.id === id)
export const phaseByCode = (c: string) => PHASES.find((p) => p.code === c)
