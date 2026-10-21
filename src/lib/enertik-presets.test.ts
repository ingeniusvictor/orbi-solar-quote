import {describe,it,expect} from 'vitest'
import {calculateQuote} from './quote'
import {makeQuotePdf} from './quote-pdf'
import {ENERTIK_VOLTRONIC,ENERTIK_BATTERIES,presetByTier,screenBatteryPower,netFromGross,
 type VoltronicTier} from './enertik-presets'
const tiers:VoltronicTier[]=['3','5','6.2','8']
describe('SQ-04D Enertik editable supplier references',()=>{
 it('has four distinct exact-model inverter choices with traceable VAT-inclusive snapshots',()=>{
  expect(ENERTIK_VOLTRONIC.map(x=>x.acRatedW)).toEqual([3000,5000,6200,8000])
  for(const row of ENERTIK_VOLTRONIC) {
   expect(row.provider).toBe('Enertik Chile')
   expect(row.price.observedOn).toBe('2026-10-20')
   expect(row.price.taxIncluded).toBe(true)
   expect(row.price.sourceUrl).toMatch(/^https:\/\/enertik\.com\/cl\/tienda\//)
   expect(row.price.grossClp).toBeGreaterThan(300000)
  }
  expect(presetByTier('5').inverter.gridExport).toBe('not-established')
  expect(presetByTier('6.2').inverter.maximumBatteryOnlyAcW).toBe(5000)
 })
 it('models separate 24 V and 48 V battery bank families and distinct quantities',()=>{
  expect(ENERTIK_BATTERIES.map(x=>x.nominalKwh)).toEqual([2.56,5.12])
  const required={3:5.12,5:10.24,'6.2':10.24,8:15.36}
  for(const tier of tiers){
    const {inverter,battery,configuration}=presetByTier(tier)
    expect(configuration.batteryUnits*configuration.batteryNominalKwh).toBeCloseTo(required[tier])
    expect(inverter.dcBatteryClassV===24 ? battery.nominalV===25.6 : battery.nominalV===51.2).toBe(true)
    expect(configuration.batteryUnits).toBeGreaterThan(0)
    expect(screenBatteryPower(configuration,inverter).availableA).toBe(configuration.batteryUnits*100)
  }
 })
 it('warns for incompatible voltage, undersized banks, parallel exceedance and unverified grid injection',()=>{
  const {inverter,configuration}=presetByTier('5')
  const checked=screenBatteryPower(configuration,inverter)
  expect(checked.problems.some(x=>x.includes('Inyección a red no acreditada'))).toBe(true)
  const low=screenBatteryPower({...configuration,batteryUnits:1,batteryNominalV:25.6},inverter)
  expect(low.problems.some(x=>x.includes('Tensión'))).toBe(true)
  expect(low.problems.some(x=>x.includes('insuficiente'))).toBe(true)
  const over=screenBatteryPower({...configuration,batteryUnits:100},inverter)
  expect(over.problems.some(x=>x.includes('límite'))).toBe(true)
 })
 it('starts exactly at published VAT-inclusive amounts and converts to NET only once',()=>{
  expect(netFromGross(119000)).toBe(100000)
  expect(netFromGross(371200)).toBe(Math.round(371200/1.19))
  for(const tier of tiers){
    const {inverter,battery,configuration}=presetByTier(tier)
    const quote=calculateQuote({systemType:'hybrid',moduleCount:10,modulePowerWp:450,
      batteryTargetKwh:100,marginPct:0,vatPct:19,supplierEquipment:configuration})
    const i=quote.lines.find(x=>x.id==='inverterHybrid')
    const b=quote.lines.find(x=>x.id==='battery5kwh')
    expect(i?.label).toContain(inverter.model)
    expect(b?.label).toContain(battery.model)
    expect(i?.unitNetClp).toBe(netFromGross(inverter.price.grossClp))
    expect(b?.unitNetClp).toBe(netFromGross(battery.price.grossClp))
    expect(b?.quantity).toBe(configuration.batteryUnits)
    expect(quote.installedBatteryNominalKwh).toBeCloseTo(configuration.batteryUnits*battery.nominalKwh)
    expect(i?.priceOrigin).toBe('enertik-snapshot')
    expect(quote.lines.find(x=>x.id==='module')?.priceOrigin).toBe('synthetic')
    expect(quote.supplierLabel).toBe('Enertik Chile')
    expect(Math.abs(quote.vatClp+quote.netWithMarginClp-
      (quote.lines.filter(x=>x.id==='inverterHybrid'||x.id==='battery5kwh')
        .reduce((sum,line)=>sum+line.totalNetClp*1.19,0)
      +quote.lines.filter(x=>x.id!=='inverterHybrid'&&x.id!=='battery5kwh')
        .reduce((sum,line)=>sum+line.totalNetClp*1.19,0)))) .toBeLessThan(5)
  }
 })
 it('custom supplier and prices replace references but never mutate original Enertik fixture',()=>{
  const preset=presetByTier('8')
  const supplierEquipment={...preset.configuration,provider:'Mi Proveedor SPA',
    inverterModel:'INV-8K-CUSTOM',batteryModel:'LFP-5.1-CUSTOM',
    inverterGrossClp:1000000,batteryGrossClp:700000,batteryUnits:2}
  const result=calculateQuote({systemType:'off-grid',moduleCount:9,modulePowerWp:450,
    batteryTargetKwh:0,marginPct:10,vatPct:19,supplierEquipment})
  expect(result.supplierLabel).toBe('Mi Proveedor SPA')
  expect(result.installedBatteryNominalKwh).toBeCloseTo(10.24)
  expect(result.lines.find(x=>x.id==='inverterOffgrid')?.label).toContain('INV-8K-CUSTOM')
  expect(result.lines.find(x=>x.id==='battery5kwh')?.quantity).toBe(2)
  expect(presetByTier('8').configuration.batteryUnits).toBe(3)
 })
 it('preserves independent on-grid without inverter or battery supplier substitution',()=>{
  const p=presetByTier('3').configuration
  const quote=calculateQuote({systemType:'on-grid',moduleCount:8,modulePowerWp:450,
    batteryTargetKwh:8,marginPct:10,vatPct:19,supplierEquipment:p})
  expect(quote.supplierLabel).toBeNull()
  expect(quote.lines.find(x=>x.id==='inverterGrid')?.label).toContain('referencial')
  expect(quote.installedBatteryNominalKwh).toBe(0)
 })
 it('refuses invalid battery counts, negative price or missing named provider',()=>{
  const config=presetByTier('3').configuration
  const input={systemType:'hybrid' as const,moduleCount:7,modulePowerWp:450,
    batteryTargetKwh:0,marginPct:10,vatPct:19}
  expect(()=>calculateQuote({...input,supplierEquipment:{...config,batteryUnits:-1}})).toThrow()
  expect(()=>calculateQuote({...input,supplierEquipment:{...config,batteryUnits:1.5}})).toThrow()
  expect(()=>calculateQuote({...input,supplierEquipment:{...config,provider:' '}})).toThrow()
  expect(()=>calculateQuote({...input,supplierEquipment:{...config,inverterGrossClp:-100}})).toThrow()
 })
 it('creates a labeled demo PDF with source and exclusions (not an order)',()=>{
  const config=presetByTier('3').configuration
  const quote=calculateQuote({systemType:'hybrid',moduleCount:7,modulePowerWp:450,
    batteryTargetKwh:0,marginPct:0,vatPct:19,supplierEquipment:config})
  const pdf=makeQuotePdf(quote,{monthlyConsumptionKwh:300,annualGenerationKwh:4500,
    generationSource:'manual',moduleReference:'Trina Solar TSM-450',
    supplierReference:'Enertik Chile - observacion 20/10/2026',
    createdOn:new Date('2026-10-20T00:00:00Z')})
  expect(pdf.output().startsWith('%PDF-')).toBe(true)
  expect(pdf.getNumberOfPages()).toBeGreaterThan(0)
 })
})
