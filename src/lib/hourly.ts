import type { SystemType } from './solar'

/**
 * ORBI SQ-03 — hourly energy balance using 365 identical representative days
 * within each month. PVGIS PVcalc supplies MONTHLY TOTALS, NOT hourly records.
 * This is a synthetic dispatch model, not hourly meteorological simulation,
 * technical sizing, electrical approval, or a Net Billing invoice.
 */

export type DemandProfile = 'balanced' | 'daytime' | 'evening'

export interface HourlyScenario {
  monthlyGenerationKwh: readonly number[]
  monthlyConsumptionKwh: number
  systemType: SystemType
  demandProfile: DemandProfile
  batteryNominalKwh: number
  maxBatteryChargeKw: number
  maxBatteryDischargeKw: number
  retailTariffClpKwh: number
  exportTariffClpKwh: number
}

export interface EnergyFlows {
  generationKwh: number
  demandKwh: number
  directSelfUseKwh: number
  batteryChargeInputKwh: number
  batteryDischargeToLoadKwh: number
  batteryLossKwh: number
  gridImportKwh: number
  gridExportKwh: number
  curtailedKwh: number
  unmetDemandKwh: number
}

export interface MonthlyFlows extends EnergyFlows {
  month: number
  endBatterySocKwh: number
}

export interface HourlyReport {
  source: 'synthetic-hourly'
  monthly: MonthlyFlows[]
  annual: EnergyFlows
  startingBatterySocKwh: number
  endingBatterySocKwh: number
  directSelfConsumptionPct: number
  loadServedPct: number
  selfSupplyPct: number
  indicativeEnergyValueClp: number | null
  baselineVariableEnergyClp: number | null
  estimatedGridEnergyClp: number | null
}

/** Non-leap standard year; monthly energy is equally shared over its days. */
const DAYS = [31,28,31,30,31,30,31,31,30,31,30,31] as const
const CHARGE_EFFICIENCY = 0.95
const DISCHARGE_EFFICIENCY = 0.95
const MIN_SOC_FRACTION = 0.20

const zero = (): EnergyFlows => ({
  generationKwh: 0, demandKwh: 0, directSelfUseKwh: 0,
  batteryChargeInputKwh: 0, batteryDischargeToLoadKwh: 0,
  batteryLossKwh: 0, gridImportKwh: 0, gridExportKwh: 0,
  curtailedKwh: 0, unmetDemandKwh: 0,
})
const numericKeys = Object.keys(zero()) as (keyof EnergyFlows)[]

/** 24 normalized energy fractions, with manually selected representative timing. */
export function demandWeights(profile: DemandProfile): number[] {
  const weights = Array.from({length:24}, (_,hour) => {
    if (profile === 'daytime') return 0.4 + (hour >= 8 && hour < 18 ? 2.2 : 0)
    if (profile === 'evening') return 0.45 + (hour >= 18 && hour < 24 ? 3.0 : (hour >= 7 && hour < 9 ? 0.9 : 0))
    return 0.75 + (hour >= 7 && hour < 10 ? 0.8 : 0) + (hour >= 18 && hour < 23 ? 1.2 : 0)
  })
  const sum = weights.reduce((a,b) => a + b,0)
  return weights.map(value => value/sum)
}

/** Generic solar-day bell curve from 06:00–18:00; NOT measured irradiance. */
export function solarWeights(): number[] {
  const weights = Array.from({length:24}, (_, hour) => hour > 6 && hour < 18
    ? Math.sin(Math.PI * (hour - 6) / 12) : 0)
  const sum = weights.reduce((a,b) => a + b,0)
  return weights.map(value => value / sum)
}

function validate(input: HourlyScenario): void {
  if (!Array.isArray(input.monthlyGenerationKwh) || input.monthlyGenerationKwh.length !== 12 ||
      input.monthlyGenerationKwh.some(value => !Number.isFinite(value) || value < 0 || value > 1e8)) {
    throw new RangeError('La generación mensual debe incluir exactamente 12 valores positivos o cero.')
  }
  for (const [key,value] of Object.entries({
    monthlyConsumptionKwh: input.monthlyConsumptionKwh,
    batteryNominalKwh: input.batteryNominalKwh,
    maxBatteryChargeKw: input.maxBatteryChargeKw,
    maxBatteryDischargeKw: input.maxBatteryDischargeKw,
    retailTariffClpKwh: input.retailTariffClpKwh,
    exportTariffClpKwh: input.exportTariffClpKwh,
  })) {
    if (!Number.isFinite(value) || value < 0 || value > 1e7) throw new RangeError('Entrada inválida: ' + key)
  }
  if (!['on-grid','hybrid','off-grid'].includes(input.systemType) ||
      !['balanced','daytime','evening'].includes(input.demandProfile)) {
    throw new RangeError('Tipo de sistema o perfil no válido.')
  }
}

export function simulateHourly(input: HourlyScenario): HourlyReport {
  validate(input)
  const onGrid = input.systemType !== 'off-grid'
  const batteryCapacity = input.systemType === 'on-grid' ? 0 : input.batteryNominalKwh
  const lowerSoc = batteryCapacity * MIN_SOC_FRACTION
  let soc = lowerSoc // avoid fictitious stored solar energy at simulation start
  const startingBatterySocKwh = soc
  const demandShape = demandWeights(input.demandProfile)
  const solarShape = solarWeights()
  const annual = zero()
  const monthly: MonthlyFlows[] = []

  for (let month = 0; month < 12; month++) {
    const accumulator = zero()
    const dailyPvKwh = input.monthlyGenerationKwh[month] / DAYS[month]
    const dailyDemandKwh = input.monthlyConsumptionKwh / DAYS[month]
    for (let day = 0; day < DAYS[month]; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const generation = dailyPvKwh * solarShape[hour]
        const demand = dailyDemandKwh * demandShape[hour]
        const direct = Math.min(generation,demand)
        let surplus = Math.max(0,generation-direct)
        let deficit = Math.max(0,demand-direct)
        let chargedInput = 0
        let discharged = 0

        if (batteryCapacity > 0) {
          // input energy, limited by converter power and remaining battery headroom
          chargedInput = Math.min(surplus,input.maxBatteryChargeKw,
            Math.max(0,(batteryCapacity-soc)/CHARGE_EFFICIENCY))
          soc += chargedInput * CHARGE_EFFICIENCY
          surplus -= chargedInput
          // delivered energy, limited by converter and energy above reserve SOC
          discharged = Math.min(deficit,input.maxBatteryDischargeKw,
            Math.max(0,(soc-lowerSoc)*DISCHARGE_EFFICIENCY))
          soc -= discharged / DISCHARGE_EFFICIENCY
          deficit -= discharged
          soc = Math.max(lowerSoc,Math.min(batteryCapacity,soc))
        }

        const gridImport = onGrid ? deficit : 0
        const gridExport = onGrid ? surplus : 0
        const curtailed = onGrid ? 0 : surplus
        const unmetDemand = onGrid ? 0 : deficit
        const batteryLoss = chargedInput * (1-CHARGE_EFFICIENCY) +
          discharged * (1/DISCHARGE_EFFICIENCY - 1)
        const step: EnergyFlows = {
          generationKwh: generation, demandKwh: demand, directSelfUseKwh: direct,
          batteryChargeInputKwh: chargedInput, batteryDischargeToLoadKwh: discharged,
          batteryLossKwh: batteryLoss, gridImportKwh: gridImport,
          gridExportKwh: gridExport, curtailedKwh: curtailed,
          unmetDemandKwh: unmetDemand,
        }
        for (const key of numericKeys) accumulator[key] += step[key]
      }
    }
    monthly.push({month:month+1,...accumulator,endBatterySocKwh:soc})
    for (const key of numericKeys) annual[key] += accumulator[key]
  }

  const directlySuppliedKwh = annual.directSelfUseKwh + annual.batteryDischargeToLoadKwh
  const baselineVariableEnergyClp = onGrid ? annual.demandKwh * input.retailTariffClpKwh : null
  const estimatedGridEnergyClp = onGrid ? annual.gridImportKwh * input.retailTariffClpKwh : null
  // NOT contractual credit, settlement, real bill, or guaranteed savings.
  const indicativeEnergyValueClp = onGrid
    ? directlySuppliedKwh * input.retailTariffClpKwh + annual.gridExportKwh * input.exportTariffClpKwh
    : null
  return {
    source:'synthetic-hourly',monthly,annual,
    startingBatterySocKwh,endingBatterySocKwh:soc,
    directSelfConsumptionPct:annual.generationKwh > 0
      ? annual.directSelfUseKwh / annual.generationKwh * 100 : 0,
    loadServedPct:annual.demandKwh > 0
      ? (annual.demandKwh-annual.unmetDemandKwh)/annual.demandKwh*100 : 100,
    selfSupplyPct:annual.demandKwh > 0
      ? directlySuppliedKwh/annual.demandKwh*100 : 0,
    indicativeEnergyValueClp,baselineVariableEnergyClp,estimatedGridEnergyClp,
  }
}
