import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { LocationSource } from '../lib/types'

const VENETO: [number, number] = [45.65, 11.9]

interface Props {
  lat: number | null
  lon: number | null
  onChange: (lat: number, lon: number, source: LocationSource) => void
  readOnly?: boolean
  height?: number
}

function ClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function Recenter({ lat, lon }: { lat: number | null; lon: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lon != null) map.setView([lat, lon], Math.max(map.getZoom(), 15))
  }, [lat, lon, map])
  return null
}

interface SearchResult {
  display_name: string
  lat: string
  lon: string
}

/** Mappa per indicare la posizione delle PIANTE osservate: tocco sulla mappa, GPS (dopo autorizzazione) o ricerca località. */
export function MapPicker({ lat, lon, onChange, readOnly, height = 300 }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [msg, setMsg] = useState('')

  const useGps = () => {
    if (!navigator.geolocation) return setMsg('Il GPS non è disponibile su questo dispositivo: tocca la mappa.')
    setMsg('Cerco la posizione…')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange(p.coords.latitude, p.coords.longitude, 'gps')
        setMsg(`Posizione trovata (precisione circa ${Math.round(p.coords.accuracy)} m). Se le piante sono più in là, sposta il punto toccando la mappa.`)
      },
      () => setMsg('Posizione non disponibile o non autorizzata: tocca la mappa o cerca la località.'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const search = async () => {
    if (q.trim().length < 3) return
    setMsg('Ricerca…')
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=it&accept-language=it&q=${encodeURIComponent(q)}`
      const r = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = (await r.json()) as SearchResult[]
      setResults(data)
      setMsg(data.length ? '' : 'Nessun risultato: prova con il nome del comune.')
    } catch {
      setMsg('Ricerca non disponibile ora: tocca la mappa.')
    }
  }

  return (
    <div className="map-picker">
      {!readOnly && (
        <div className="map-tools">
          <button type="button" className="btn secondary" onClick={useGps}>📍 Usa la mia posizione</button>
          <div className="search-row">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())} placeholder="Cerca località o comune" />
            <button type="button" className="btn secondary" onClick={search}>Cerca</button>
          </div>
          {results.length > 0 && (
            <ul className="search-results">
              {results.map((r) => (
                <li key={r.lat + r.lon}>
                  <button type="button" onClick={() => { onChange(+r.lat, +r.lon, 'search'); setResults([]); setQ('') }}>{r.display_name}</button>
                </li>
              ))}
            </ul>
          )}
          {msg && <p className="hint">{msg}</p>}
        </div>
      )}
      <MapContainer center={lat != null && lon != null ? [lat, lon] : VENETO} zoom={lat != null ? 15 : 8} style={{ height }} scrollWheelZoom={!readOnly} dragging={!readOnly || true}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {!readOnly && <ClickHandler onPick={(a, b) => onChange(a, b, 'map')} />}
        <Recenter lat={lat} lon={lon} />
        {lat != null && lon != null && <CircleMarker center={[lat, lon]} radius={10} pathOptions={{ color: '#7a4a12', fillColor: '#f2b632', fillOpacity: 0.9 }} />}
      </MapContainer>
      {!readOnly && <p className="hint">Tocca la mappa nel punto in cui si trovano le piante (non serve essere lì ora).</p>}
    </div>
  )
}
