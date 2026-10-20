import { describe, expect, it } from 'vitest'
import { demandWeights, solarWeights, simulateHourly, type HourlyScenario } from './hourly'

const base: HourlyScenario = {
  monthlyGenerationKwh: [520,470,450,340,270,210,250,300,370,430,480,530],
  monthlyConsumptionKwh: 410,
  systemType: 'on-grid',
  demandProfile: 'balanced',
  batteryNominalKwh: 0,
  maxBatteryChargeKw: 3,
  maxBatteryDischargeKw: 3,
  retailTariffClpKwh: 220,
  exportTariffClpKwh: 75,
}
const close = (a: number,b: number) => expect(a).toBeCloseTo(b,5)

describe('SQ-03 deterministic hourly dispatch', () => {
  it('normalizes 24-hour profiles without inventing energy', () => {
    for (const mode of ['balanced','daytime','evening'] as const) {
      const weights = demandWeights(mode)
      expect(weights).toHaveLength(24)
      close(weights.reduce((sum,part)=>sum+part,0),1)
    }
    const sunlight = solarWeights()
    expect(sunlight).toHaveLength(24)
    close(sunlight.reduce((sum,part)=>sum+part,0),1)
    expect(sunlight[2]).toBe(0)
    expect(sunlight[12]).toBeGreaterThan(sunlight[9])
    expect(sunlight[20]).toBe(0)
  })
  it('uses precise 12-month totals with 365 days and conserves PV and demand', () => {
    const report = simulateHourly(base)
    expect(report.monthly).toHaveLength(12)
    close(report.annual.generationKwh,base.monthlyGenerationKwh.reduce((a,b)=>a+b))
    close(report.annual.demandKwh,base.monthlyConsumptionKwh*12)
    close(report.annual.generationKwh,
      report.annual.directSelfUseKwh + report.annual.batteryChargeInputKwh +
      report.annual.gridExportKwh + report.annual.curtailedKwh)
    close(report.annual.demandKwh,
      report.annual.directSelfUseKwh + report.annual.batteryDischargeToLoadKwh +
      report.annual.gridImportKwh + report.annual.unmetDemandKwh)
    expect(report.source).toBe('synthetic-hourly')
  })
  it('reduces solar mismatch with daytime loads relative to evening loads', () => {
    const daytime = simulateHourly({...base,demandProfile:'daytime'})
    const evening = simulateHourly({...base,demandProfile:'evening'})
    expect(daytime.annual.gridImportKwh).toBeLessThan(evening.annual.gridImportKwh)
    expect(daytime.annual.gridExportKwh).toBeLessThan(evening.annual.gridExportKwh)
    expect(daytime.annual.directSelfUseKwh).toBeGreaterThan(evening.annual.directSelfUseKwh)
  })
  it('stores PV surplus in a hybrid and respects SOC and conservation with inefficiency', () => {
    const hybrid = simulateHourly({...base,systemType:'hybrid',batteryNominalKwh:12,maxBatteryChargeKw:3,maxBatteryDischargeKw:3})
    const withoutBattery = simulateHourly({...base,systemType:'hybrid',batteryNominalKwh:0})
    expect(hybrid.annual.batteryChargeInputKwh).toBeGreaterThan(0)
    expect(hybrid.annual.batteryDischargeToLoadKwh).toBeGreaterThan(0)
    expect(hybrid.annual.gridImportKwh).toBeLessThan(withoutBattery.annual.gridImportKwh)
    expect(hybrid.annual.gridExportKwh).toBeLessThan(withoutBattery.annual.gridExportKwh)
    expect(hybrid.annual.batteryLossKwh).toBeGreaterThan(0)
    expect(hybrid.endingBatterySocKwh).toBeGreaterThanOrEqual(12*0.2-1e-9)
    expect(hybrid.endingBatterySocKwh).toBeLessThanOrEqual(12+1e-9)
    close(hybrid.annual.batteryChargeInputKwh,
      hybrid.annual.batteryLossKwh + hybrid.annual.batteryDischargeToLoadKwh +
      (hybrid.endingBatterySocKwh-hybrid.startingBatterySocKwh))
  })
  it('never assumes battery energy at the start of the simulation', () => {
    const report = simulateHourly({...base,
      monthlyGenerationKwh:Array(12).fill(0),systemType:'off-grid',batteryNominalKwh:24})
    expect(report.startingBatterySocKwh).toBeCloseTo(24*0.2)
    close(report.annual.batteryDischargeToLoadKwh,0)
    close(report.annual.unmetDemandKwh,12*base.monthlyConsumptionKwh)
    close(report.annual.gridImportKwh,0)
    close(report.annual.gridExportKwh,0)
    expect(report.indicativeEnergyValueClp).toBeNull()
  })
  it('reports curtailed energy and unmet loads for off-grid without claiming net billing', () => {
    const report = simulateHourly({...base,systemType:'off-grid',batteryNominalKwh:2,
      maxBatteryChargeKw:1,maxBatteryDischargeKw:1,demandProfile:'evening'})
    expect(report.annual.gridImportKwh).toBe(0)
    expect(report.annual.gridExportKwh).toBe(0)
    expect(report.annual.unmetDemandKwh).toBeGreaterThan(0)
    expect(report.annual.curtailedKwh).toBeGreaterThan(0)
    expect(report.loadServedPct).toBeLessThan(100)
    expect(report.estimatedGridEnergyClp).toBeNull()
  })
  it('enforces zero storage on grid-only system, regardless of provided capacity', () => {
    const withoutBattery = simulateHourly(base)
    const fakeBattery = simulateHourly({...base,batteryNominalKwh:100})
    close(fakeBattery.annual.gridImportKwh,withoutBattery.annual.gridImportKwh)
    expect(fakeBattery.annual.batteryChargeInputKwh).toBe(0)
  })
  it('separates illustrative import costs and export value without claiming invoice settlement', () => {
    const r = simulateHourly(base)
    close(r.baselineVariableEnergyClp!,base.monthlyConsumptionKwh*12*220)
    close(r.estimatedGridEnergyClp!,r.annual.gridImportKwh*220)
    close(r.indicativeEnergyValueClp!,
      (r.annual.directSelfUseKwh+r.annual.batteryDischargeToLoadKwh)*220 +
      r.annual.gridExportKwh*75)
  })
  it('never accepts malformed or negative input vectors', () => {
    expect(() => simulateHourly({...base,monthlyGenerationKwh:[10]})).toThrow(RangeError)
    expect(() => simulateHourly({...base,monthlyGenerationKwh:[...Array(11).fill(10),Number.NaN]})).toThrow(RangeError)
    expect(() => simulateHourly({...base,batteryNominalKwh:-3})).toThrow(RangeError)
    expect(() => simulateHourly({...base,monthlyConsumptionKwh:Number.POSITIVE_INFINITY})).toThrow(RangeError)
  })
  it('returns finite figures when demand and production are zero', () => {
    const r = simulateHourly({...base,monthlyGenerationKwh:Array(12).fill(0),monthlyConsumptionKwh:0})
    expect(r.annual.demandKwh).toBe(0)
    expect(r.annual.generationKwh).toBe(0)
    expect(r.directSelfConsumptionPct).toBe(0)
    expect(r.loadServedPct).toBe(100)
    expect(r.selfSupplyPct).toBe(0)
  })
})
