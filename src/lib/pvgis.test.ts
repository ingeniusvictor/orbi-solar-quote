import { describe, expect, it } from 'vitest'
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
