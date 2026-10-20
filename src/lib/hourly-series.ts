/**
 * A bounded one-year PVGIS seriescalc response, normalized to kWh per UTC hour
 * for a 1 kWp fixed rooftop system. PVGIS's P is average power in W.
 */
export interface PvgisHourlySeries {
  source: 'PVGIS v5.3 / seriescalc'
  year: 2023
  radiationDatabase: string | null
  latitude: number
  longitude: number
  tiltDeg: number
  aspectDeg: number
  lossesPct: number
  utcHourKwhPerKwp: number[]
  annualKwhPerKwp: number
}

export type PvgisHourlyConfig = Pick<PvgisHourlySeries,
  'latitude' | 'longitude' | 'tiltDeg' | 'aspectDeg' | 'lossesPct'>

/** Strict calendar/shape checks to avoid silently treating missing hours as zero. */
export function parsePvgisHourly(payload: unknown, params: PvgisHourlyConfig): PvgisHourlySeries {
  if (!payload || typeof payload !== 'object') throw Error('Respuesta PVGIS no válida')
  const root = payload as { outputs?: { hourly?: unknown }; inputs?: { meteo_data?: { radiation_db?: unknown } } }
  const rows = root.outputs?.hourly
  if (!Array.isArray(rows) || rows.length !== 8760) throw Error('PVGIS no devolvió exactamente 8760 horas')
  const start = Date.UTC(2023, 0, 1)
  const values: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const row: unknown = rows[i]
    if (!row || typeof row !== 'object') throw Error('Hora PVGIS no válida')
    const { time, P } = row as { time?: unknown; P?: unknown }
    if (typeof time !== 'string' || !/^2023\d{4}:\d{4}$/.test(time)) throw Error('Fecha PVGIS no válida')
    const yr = Number(time.slice(0,4)), mo = Number(time.slice(4,6)), d = Number(time.slice(6,8))
    const h = Number(time.slice(9,11)), min = Number(time.slice(11,13))
    const millis = Date.UTC(yr,mo-1,d,h)
    if (yr !== 2023 || mo < 1 || mo > 12 || d < 1 || d > 31 ||
        h < 0 || h > 23 || min < 0 || min > 59 ||
        millis !== start + i * 3600000 ||
        typeof P !== 'number' || !Number.isFinite(P) || P < 0 || P > 3000) {
      throw Error('Serie PVGIS incompleta o alterada')
    }
    values.push(Math.round(P / 1000 * 100000) / 100000)
  }
  const db = root.inputs?.meteo_data?.radiation_db
  return {
    source:'PVGIS v5.3 / seriescalc',
    year:2023, ...params,
    radiationDatabase:typeof db === 'string' ? db : null,
    utcHourKwhPerKwp:values,
    annualKwhPerKwp:values.reduce((a,b)=>a+b,0),
  }
}

/**
 * Validate a normalized series returned from OUR own API, not arbitrary input.
 * Structural checks prevent corrupt production and clamp free-form response size.
 */
export function validPvgisHourly(value: unknown): value is PvgisHourlySeries {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<PvgisHourlySeries>
  return v.source === 'PVGIS v5.3 / seriescalc' && v.year === 2023 &&
    [v.latitude,v.longitude,v.tiltDeg,v.aspectDeg,v.lossesPct,v.annualKwhPerKwp]
      .every(x=>typeof x === 'number' && Number.isFinite(x)) &&
    Array.isArray(v.utcHourKwhPerKwp) &&
    v.utcHourKwhPerKwp.length === 8760 &&
    v.utcHourKwhPerKwp.every(x=>typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 3) &&
    Math.abs(v.utcHourKwhPerKwp.reduce((a,b)=>a+b,0)-(v.annualKwhPerKwp??0)) < 0.1
}
