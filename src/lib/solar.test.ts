import { describe, expect, it } from 'vitest'
import { calculateSolar, type SolarInputs } from './solar'

const base: SolarInputs = {
  monthlyConsumptionKwh: 400,
  usableRoofAreaM2: 50,
  modulePowerWp: 550,
  moduleAreaM2: 2.6,
  referenceYieldKwhPerKwpYear: 1700,
  lossesPct: 17,
  orientation: 'N',
  systemType: 'on-grid',
  retailTariffClpKwh: 220,
  exportTariffClpKwh: 75,
}

describe('calculateSolar', () => {
  it('returns a power-limited positive estimate with coherent annual profile', () => {
    const result = calculateSolar(base)
    expect(result.modules).toBeGreaterThan(0)
    expect(result.systemKwp).toBeCloseTo(result.modules * 0.55)
    expect(result.monthlyProfileKwh.reduce((sum, month) => sum + month, 0))
      .toBeCloseTo(result.annualGenerationKwh)
    expect(result.annualValueClp).toBeGreaterThan(0)
  })

  it('never installs more modules than the usable area allows', () => {
    const result = calculateSolar({ ...base, usableRoofAreaM2: 5 })
    expect(result.modules).toBe(1)
    expect(result.roofLimited).toBe(true)
  })

  it('does not claim savings for an off-grid design', () => {
    const result = calculateSolar({ ...base, systemType: 'off-grid' })
    expect(result.annualValueClp).toBeNull()
    expect(result.annualExportKwh).toBeNull()
    expect(result.estimatedBatteryNominalKwh).toBeGreaterThan(0)
  })

  it('does not produce NaN on empty or invalid inputs', () => {
    const result = calculateSolar({ ...base, monthlyConsumptionKwh: NaN, moduleAreaM2: 0 })
    expect(result.modules).toBe(0)
    expect(result.annualGenerationKwh).toBe(0)
    expect(Number.isFinite(result.monthlyGenerationKwh)).toBe(true)
  })

  it('shows lower yield when the roof faces south', () => {
    const north = calculateSolar({ ...base, usableRoofAreaM2: 10 }).annualGenerationKwh
    const south = calculateSolar({ ...base, usableRoofAreaM2: 10, orientation: 'S' }).annualGenerationKwh
    expect(south).toBeLessThan(north)
  })

  it('values self-consumption and exported energy separately', () => {
    const result = calculateSolar(base)
    expect(result.annualValueClp).toBeCloseTo(
      result.annualSelfConsumptionKwh! * base.retailTariffClpKwh +
      result.annualExportKwh! * base.exportTariffClpKwh
    )
  })
})
