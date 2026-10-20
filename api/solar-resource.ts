import {
  buildPvgisUrl, parsePvgisResponse, parseSolarResourceRequest,
} from '../src/lib/pvgis.ts'

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
      error: 'Ingresa coordenadas del Chile continental, inclinación 0–90°, pérdidas 0–50°/%, y orientación válida.',
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
