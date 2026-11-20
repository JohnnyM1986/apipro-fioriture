import { speciesById } from '../data/catalog'
import type { Observation } from './types'

/** Colonne di esportazione: una riga per osservazione, nessun dato personale (specifica Birolo). */
export const CSV_COLUMNS = [
  'id_osservazione',
  'id_partecipante',
  'id_luogo',
  'specie_id',
  'specie_nome_scientifico',
  'fase_fenologica',
  'data_osservazione',
  'data_inserimento',
  'latitudine',
  'longitudine',
  'foto_presente',
  'note',
  'avvisi_qualita',
  'data_ultima_modifica'
] as const

function esc(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function observationToRow(o: Observation): Record<(typeof CSV_COLUMNS)[number], unknown> {
  return {
    id_osservazione: o.id,
    id_partecipante: o.participant_id,
    id_luogo: o.site_id,
    specie_id: o.species_id,
    specie_nome_scientifico: speciesById(o.species_id)?.scientific ?? '',
    fase_fenologica: o.phase_code,
    data_osservazione: o.observed_on,
    data_inserimento: o.created_at,
    latitudine: o.lat.toFixed(6),
    longitudine: o.lon.toFixed(6),
    foto_presente: o.photo_url ? 'si' : 'no',
    note: o.note,
    avvisi_qualita: o.qc_flags.join(';'),
    data_ultima_modifica: o.updated_at
  }
}

/** CSV con separatore ';' (apertura diretta in Excel italiano) e BOM UTF-8. */
export function toCsv(rows: Record<string, unknown>[]): string {
  const head = CSV_COLUMNS.join(';')
  const body = rows.map((r) => CSV_COLUMNS.map((c) => esc(r[c])).join(';'))
  return '﻿' + [head, ...body].join('\r\n')
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
