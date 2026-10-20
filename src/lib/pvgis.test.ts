import { describe, expect, it, vi } from 'vitest'
import handler from '../../api/solar-resource'
import {
  buildPvgisUrl, parsePvgisResponse, parseSolarResourceRequest, PVGIS_ASPECT,
  type SolarResourceRequest,
} from './pvgis'

const request: SolarResourceRequest = {
  latitude: -34.17, longitude: -70.74, tiltDeg: 25,
  orientation: 'N', lossesPct: 17,
}
function fixture() {
  return {
    outputs: { monthly: { fixed: Array.from({ length: 12 }, (_, month) => ({
      month: month + 1, E_m: month + 50,
    })) } },
    inputs: { meteo_data: { radiation_db: 'PVGIS-ERA5' } },
  }
}

describe('PVGIS integration contract', () => {
  it('uses northern azimuth for a Chilean north-facing roof', () => {
    expect(PVGIS_ASPECT.N).toBe(180)
    expect(PVGIS_ASPECT.S).toBe(0)
    expect(PVGIS_ASPECT.E).toBe(-90)
    expect(PVGIS_ASPECT.W).toBe(90)
    const url = new URL(buildPvgisUrl(request))
    expect(url.host).toBe('re.jrc.ec.europa.eu')
    expect(url.searchParams.get('aspect')).toBe('180')
    expect(url.searchParams.get('peakpower')).toBe('1')
    expect(url.searchParams.get('outputformat')).toBe('json')
  })

  it('validates geographic bounds and refuses invalid/missing controls', () => {
    expect(parseSolarResourceRequest({
      latitude: '-34.17', longitude: '-70.74', tiltDeg: '25', lossesPct: '17', orientation: 'N',
    })).toEqual(request)
    expect(parseSolarResourceRequest({ ...Object.fromEntries(Object.entries(request).map(([k,v]) => [k, String(v)])), latitude: '-81' })).toBeNull()
    expect(parseSolarResourceRequest({ latitude: '0', longitude: '', tiltDeg: '25', lossesPct: '17', orientation: 'N' })).toBeNull()
    expect(parseSolarResourceRequest({ latitude: '-34', longitude: '-71', tiltDeg: '25', lossesPct: '17', orientation: 'UNSAFE' })).toBeNull()
  })

  it('parses monthly energy and sums all 12 months without synthetic seasonality', () => {
    const result = parsePvgisResponse(fixture(), request)
    expect(result.monthlyYieldKwhPerKwp).toHaveLength(12)
    expect(result.annualYieldKwhPerKwp).toBe(666)
    expect(result.radiationDatabase).toBe('PVGIS-ERA5')
    expect(result.aspectDeg).toBe(180)
  })

  it('rejects malformed provider records rather than silently using fake data', () => {
    const bad = fixture()
    bad.outputs.monthly.fixed[11].E_m = NaN
    expect(() => parsePvgisResponse(bad, request)).toThrow()
    expect(() => parsePvgisResponse({}, request)).toThrow()
    const duplicate = fixture()
    duplicate.outputs.monthly.fixed[11].month = 11
    expect(() => parsePvgisResponse(duplicate, request)).toThrow()
  })
})

describe('Vercel serverless route contract', () => {
  const validQuery = {
    latitude: '-34.17', longitude: '-70.74', tiltDeg: '25', lossesPct: '17', orientation: 'N',
  }
  function mockResponse() {
    const result: {status?: number; body?: unknown; headers: Record<string,string>} = {headers: {}}
    const res = {
      setHeader(name: string, value: string) { result.headers[name] = value },
      status(code: number) { result.status = code; return res },
      json(body: unknown) { result.body = body },
    }
    return {res, result}
  }
  it('blocks unsupported methods and invalid coordinates before accessing upstream', async () => {
    const {res: a, result: ar} = mockResponse()
    await handler({method: 'POST', query: validQuery}, a)
    expect(ar.status).toBe(405)
    const {res: b, result: br} = mockResponse()
    await handler({method: 'GET', query: {...validQuery, latitude: '-80'}}, b)
    expect(br.status).toBe(400)
  })
  it('returns 12 months of PVGIS data and a Vercel cache header', async () => {
    const original = globalThis.fetch
    globalThis.fetch = vi.fn(async () => ({ok:true,json:async () => fixture()} as Response))
    try {
      const {res, result} = mockResponse()
      await handler({method:'GET',query:validQuery}, res)
      expect(result.status).toBe(200)
      const body = result.body as { resource: { annualYieldKwhPerKwp: number }}
      expect(body.resource.annualYieldKwhPerKwp).toBe(666)
      expect(result.headers['Cache-Control']).toContain('s-maxage')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      const url = new URL((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string)
      expect(url.searchParams.get('aspect')).toBe('180')
    } finally { globalThis.fetch = original }
  })
  it('shows a controlled fallback when PVGIS is down', async () => {
    const original = globalThis.fetch
    globalThis.fetch = vi.fn(async () => { throw new Error('service unavailable') })
    try {
      const {res, result} = mockResponse()
      await handler({method:'GET',query:validQuery}, res)
      expect(result.status).toBe(503)
      expect((result.body as {error:string}).error).toContain('datos solares')
    } finally { globalThis.fetch = original }
  })
})
