import { useRef, useState } from 'react'
import { CheckCircle2, Globe2, Info, MapPin, RefreshCcw } from 'lucide-react'
import type { Orientation } from '../lib/solar'
import type { SolarResource } from '../lib/pvgis'

interface Props {
  resource: SolarResource | null
  onResourceChange: (next: SolarResource | null) => void
  orientation: Orientation
  lossesPct: number
}

export function SolarResourcePanel({ resource, onResourceChange, orientation, lossesPct }: Props) {
  const [latitude, setLatitude] = useState(resource ? String(resource.latitude) : '')
  const [longitude, setLongitude] = useState(resource ? String(resource.longitude) : '')
  const [tiltDeg, setTiltDeg] = useState(resource?.tiltDeg ?? 25)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const sequence = useRef(0)

  const valid = latitude.trim() !== '' && longitude.trim() !== '' &&
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -56.5 && Number(latitude) <= -17 &&
    Number(longitude) >= -76.5 && Number(longitude) <= -66 &&
    Number.isFinite(tiltDeg) && tiltDeg >= 0 && tiltDeg <= 90

  function updateCoordinate(kind: 'lat' | 'lon', value: string) {
    sequence.current += 1
    setPending(false)
    setError('')
    onResourceChange(null)
    if (kind === 'lat') setLatitude(value)
    else setLongitude(value)
  }
  function updateTilt(value: number) {
    sequence.current += 1
    setPending(false)
    setError('')
    onResourceChange(null)
    setTiltDeg(value)
  }

  async function load() {
    if (!valid || pending) return
    const currentSequence = ++sequence.current
    onResourceChange(null)
    setPending(true)
    setError('')
    const query = new URLSearchParams({
      latitude, longitude, tiltDeg: String(tiltDeg), lossesPct: String(lossesPct), orientation,
    })
    try {
      const response = await fetch('/api/solar-resource?' + query.toString(), { method: 'GET' })
      const body: { resource?: SolarResource; error?: string } = await response.json()
      if (currentSequence !== sequence.current) return
      if (!response.ok || !body.resource) throw new Error(body.error ?? 'Error consultando PVGIS')
      if (body.resource.monthlyYieldKwhPerKwp.length !== 12 ||
          body.resource.source !== 'PVGIS v5.3 / PVcalc') throw new Error('Respuesta solar inválida')
      onResourceChange(body.resource)
    } catch (caught) {
      if (currentSequence !== sequence.current) return
      setError(caught instanceof Error ? caught.message : 'No se pudo conectar al proveedor.')
    } finally {
      if (currentSequence === sequence.current) setPending(false)
    }
  }
  return <div className="resource-panel">
    <div className="resource-title"><div><Globe2 size={21}/><strong>Datos solares según ubicación</strong></div><span>OPCIONAL · PVGIS</span></div>
    <p>Ingresa coordenadas del Chile continental y solicita datos de generación de la Comisión Europea. Sin activar tu GPS ni guardar una dirección.</p>
    <div className="resource-fields">
      <label>Latitud (° sur)
        <input type="number" step="any" aria-label="Latitud decimal" placeholder="-34.17" value={latitude} onChange={e => updateCoordinate('lat', e.target.value)}/>
      </label>
      <label>Longitud (° oeste)
        <input type="number" step="any" aria-label="Longitud decimal" placeholder="-70.74" value={longitude} onChange={e => updateCoordinate('lon', e.target.value)}/>
      </label>
      <label>Inclinación (°)
        <input type="number" min={0} max={90} step={1} aria-label="Inclinación del techo" value={tiltDeg} onChange={e => updateTilt(Number(e.target.value))}/>
      </label>
    </div>
    <div className="resource-actions">
      <button type="button" onClick={load} disabled={!valid || pending} className="resource-load"><MapPin size={16}/>{pending ? 'Consultando PVGIS…' : resource ? 'Actualizar consulta' : 'Consultar recurso solar'}<RefreshCcw size={14}/></button>
      {resource && <span className="resource-ready"><CheckCircle2 size={16}/> Recurso obtenido: {Math.round(resource.annualYieldKwhPerKwp).toLocaleString('es-CL')} kWh/kWp/año</span>}
    </div>
    {error && <div className="resource-error" role="alert"><Info size={16}/>{error}</div>}
    <small>Coordenadas enviadas a PVGIS únicamente al pulsar el botón; su servicio puede registrar solicitudes conforme a sus políticas. Sin disponibilidad, se conserva el cálculo ilustrativo.</small>
  </div>
}
