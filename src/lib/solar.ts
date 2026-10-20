/**
 * ORBI Solar Quote — preliminary, transparent estimate.
 * NOT a bankable yield study, SEC-approved engineering design, or Net Billing settlement.
 * All factors are user-adjustable assumptions, not live climate/utility data.
 */
export type SystemType = 'on-grid' | 'hybrid' | 'off-grid'
export type Orientation = 'N' | 'NE' | 'NW' | 'E' | 'W' | 'S'

export interface SolarInputs {
  monthlyConsumptionKwh: number
  usableRoofAreaM2: number
  modulePowerWp: number
  moduleAreaM2: number
  referenceYieldKwhPerKwpYear: number
  lossesPct: number
  orientation: Orientation
  systemType: SystemType
  retailTariffClpKwh: number
  exportTariffClpKwh: number
}

export interface SolarResults {
  modules: number
  maximumModules: number
  targetModules: number
  systemKwp: number
  annualGenerationKwh: number
  monthlyGenerationKwh: number
  annualConsumptionKwh: number
  annualSelfConsumptionKwh: number | null
  annualExportKwh: number | null
  annualValueClp: number | null
  estimatedBatteryNominalKwh: number | null
  roofLimited: boolean
  monthlyProfileKwh: number[]
}

export const ORIENTATIONS: Record<Orientation, number> = {
  N: 1,
  NE: 0.92,
  NW: 0.92,
  E: 0.84,
  W: 0.84,
  S: 0.68,
}

const COVERAGE_TARGET: Record<SystemType, number> = {
  'on-grid': 0.9,
  hybrid: 1,
  'off-grid': 1.25,
}

// Merely illustrative seasonality for the southern hemisphere.
// Must be replaced by site-specific hourly resource data before a professional quotation.
const MONTHLY_SHAPE = [1.30, 1.20, 1.11, 0.90, 0.72, 0.62, 0.68, 0.78, 0.93, 1.10, 1.27, 1.39]

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function calculateSolar(input: SolarInputs): SolarResults {
  const monthlyConsumptionKwh = finiteNonNegative(input.monthlyConsumptionKwh)
  const annualConsumptionKwh = monthlyConsumptionKwh * 12
  const roofArea = finiteNonNegative(input.usableRoofAreaM2)
  const panelArea = finiteNonNegative(input.moduleAreaM2)
  const modulePowerWp = finiteNonNegative(input.modulePowerWp)
  const referenceYield = finiteNonNegative(input.referenceYieldKwhPerKwpYear)
  const performanceFactor = 1 - Math.min(100, finiteNonNegative(input.lossesPct)) / 100
  const orientationFactor = ORIENTATIONS[input.orientation] ?? 1
  const perPanelYear = (modulePowerWp / 1000) * referenceYield * performanceFactor * orientationFactor
  const maximumModules = panelArea > 0 ? Math.floor(roofArea / panelArea) : 0
  const targetModules = perPanelYear > 0
    ? Math.ceil(annualConsumptionKwh * COVERAGE_TARGET[input.systemType] / perPanelYear)
    : 0
  const modules = Math.min(maximumModules, targetModules)
  const systemKwp = (modules * modulePowerWp) / 1000
  const annualGenerationKwh = Math.max(0, modules * perPanelYear)
  const monthlyGenerationKwh = annualGenerationKwh / 12
  const totalShape = MONTHLY_SHAPE.reduce((a, b) => a + b, 0)
  const monthlyProfileKwh = MONTHLY_SHAPE.map(weight => annualGenerationKwh * weight / totalShape)

  // No off-grid economic claim without load profile, generator, outage and storage engineering.
  let annualSelfConsumptionKwh: number | null = null
  let annualExportKwh: number | null = null
  let annualValueClp: number | null = null
  if (input.systemType !== 'off-grid') {
    const assumedOnsiteShare = input.systemType === 'hybrid' ? 0.78 : 0.55
    annualSelfConsumptionKwh = Math.min(annualConsumptionKwh, annualGenerationKwh * assumedOnsiteShare)
    annualExportKwh = Math.max(0, annualGenerationKwh - annualSelfConsumptionKwh)
    annualValueClp = annualSelfConsumptionKwh * finiteNonNegative(input.retailTariffClpKwh)
      + annualExportKwh * finiteNonNegative(input.exportTariffClpKwh)
  }

  // Illustrative nominal storage: hybrid 60% nightly energy for 1 day, off-grid full load for 2 days.
  // Assumed usable DoD=80% and roundtrip efficiency=90%; NOT a definitive battery design.
  const estimatedBatteryNominalKwh = input.systemType === 'on-grid' ? null
    : (monthlyConsumptionKwh / 30) *
      (input.systemType === 'hybrid' ? 0.6 : 2) / (0.8 * 0.9)

  return {
    modules,
    maximumModules,
    targetModules,
    systemKwp,
    annualGenerationKwh,
    monthlyGenerationKwh,
    annualConsumptionKwh,
    annualSelfConsumptionKwh,
    annualExportKwh,
    annualValueClp,
    estimatedBatteryNominalKwh,
    roofLimited: maximumModules < targetModules,
    monthlyProfileKwh,
  }
}
