/** Standalone API: Vercel Node ESM requires no extensionless TS cross-directory imports.
 * Shared contract is covered by integration tests; keep in sync with src/lib/pvgis.ts.
 */
type Orientation = 'N' | 'NE' | 'NW' | 'E' | 'W' | 'S'

/** PVGIS v5.3 fixed-plane output for a 1 kWp crystalline silicon array. */
export interface SolarResource {
  source: 'PVGIS v5.3 / PVcalc'
  latitude: number
  longitude: number
  tiltDeg: number
  aspectDeg: number
  lossesPct: number
  monthlyYieldKwhPerKwp: number[]
  annualYieldKwhPerKwp: number
  radiationDatabase: string | null
}

export interface SolarResourceRequest {
  latitude: number
  longitude: number
  tiltDeg: number
  lossesPct: number
  orientation: Orientation
}

/**
 * PVGIS azimuth: 0 = south, +90 = west, -90 = east, +/-180 = north.
 * NEVER interpret 0 as north: this would invert Chilean roof orientation.
 */
export const PVGIS_ASPECT: Record<Orientation, number> = {
  N: 180, NE: -135, NW: 135, E: -90, W: 90, S: 0,
}

export function parseSolarResourceRequest(query: Record<string, unknown>): SolarResourceRequest | null {
  const numeric = (name: string) => {
    const raw = query[name]
    if (typeof raw !== 'string' || !raw.trim()) return NaN
    return Number(raw)
  }
  const latitude = numeric('latitude')
  const longitude = numeric('longitude')
  const tiltDeg = numeric('tiltDeg')
  const lossesPct = numeric('lossesPct')
  const orientation = query.orientation
  if (
    ![latitude, longitude, tiltDeg, lossesPct].every(Number.isFinite) ||
    // Mainland Chile broad approximation only, not a geofence of national borders.
    latitude < -56.5 || latitude > -17.0 ||
    longitude < -76.5 || longitude > -66.0 ||
    tiltDeg < 0 || tiltDeg > 90 ||
    lossesPct < 0 || lossesPct > 50 ||
    typeof orientation !== 'string' ||
    !Object.prototype.hasOwnProperty.call(PVGIS_ASPECT, orientation)
  ) return null
  return {
    latitude, longitude, tiltDeg, lossesPct,
    orientation: orientation as Orientation,
  }
}

export function buildPvgisUrl(input: SolarResourceRequest): string {
  const url = new URL('https://re.jrc.ec.europa.eu/api/v5_3/PVcalc')
  const params: Record<string, string> = {
    lat: String(input.latitude),
    lon: String(input.longitude),
    peakpower: '1',
    loss: String(input.lossesPct),
    angle: String(input.tiltDeg),
    aspect: String(PVGIS_ASPECT[input.orientation]),
    mountingplace: 'building',
    pvtechchoice: 'crystSi',
    outputformat: 'json',
  }
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

export function parsePvgisResponse(payload: unknown, input: SolarResourceRequest): SolarResource {
  if (typeof payload !== 'object' || payload === null) throw new Error('Respuesta inválida de PVGIS')
  const root = payload as Record<string, any>
  const records: unknown = root.outputs?.monthly?.fixed
  if (!Array.isArray(records) || records.length !== 12) throw new Error('PVGIS no devolvió los 12 meses')
  const monthlyYieldKwhPerKwp = Array<number>(12).fill(NaN)
  for (const record of records) {
    if (!record || typeof record !== 'object') throw new Error('Mes PVGIS inválido')
    const month = record.month
    const value = record.E_m
    if (!Number.isInteger(month) || month < 1 || month > 12 ||
      typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
      Number.isFinite(monthlyYieldKwhPerKwp[month - 1])) {
      throw new Error('Datos mensuales PVGIS inválidos')
    }
    monthlyYieldKwhPerKwp[month - 1] = value
  }
  if (!monthlyYieldKwhPerKwp.every(Number.isFinite)) throw new Error('Faltan meses PVGIS')
  const annualYieldKwhPerKwp = monthlyYieldKwhPerKwp.reduce((sum, value) => sum + value, 0)
  if (!(annualYieldKwhPerKwp > 0)) throw new Error('PVGIS devolvió producción nula')
  const db: unknown = root.inputs?.meteo_data?.radiation_db
  return {
    source: 'PVGIS v5.3 / PVcalc',
    latitude: input.latitude,
    longitude: input.longitude,
    tiltDeg: input.tiltDeg,
    aspectDeg: PVGIS_ASPECT[input.orientation],
    lossesPct: input.lossesPct,
    monthlyYieldKwhPerKwp,
    annualYieldKwhPerKwp,
    radiationDatabase: typeof db === 'string' ? db : null,
  }
}


type Request = {
  method?: string
  query: Record<string, string | string[] | undefined>
}
type Response = {
  setHeader(name: string, value: string): void
  status(code: number): Response
  json(payload: unknown): void
}

/**
 * Same-origin serverless proxy. PVGIS disallows browser AJAX; the fixed upstream
 * URL prevents arbitrary proxying. The caller must explicitly supply coordinates.
 */
export default async function handler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Solo se permite GET.' })
  }
  const input = parseSolarResourceRequest(req.query)
  if (!input) {
    return res.status(400).json({
      error: 'Ingresa coordenadas del Chile continental, inclinación 0–90°, pérdidas 0–50 %, y orientación válida.',
    })
  }
  try {
    const upstream = await fetch(buildPvgisUrl(input), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(13000),
    })
    if (!upstream.ok) {
      return res.status(upstream.status === 400 ? 422 : 503).json({
        error: upstream.status === 400
          ? 'PVGIS no puede calcular el recurso para esta ubicación y configuración.'
          : 'El servicio de radiación solar no está disponible en este momento. Puedes continuar con el cálculo manual.',
      })
    }
    const payload: unknown = await upstream.json()
    const resource = parsePvgisResponse(payload, input)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ resource })
  } catch {
    return res.status(503).json({
      error: 'No se pudieron consultar los datos solares. Puedes continuar con los supuestos manuales.',
    })
  }
}
