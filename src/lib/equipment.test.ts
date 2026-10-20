import {describe,expect,it} from 'vitest'
import {defaultModule,moduleById,preliminaryDcScreen,MODULE_REFERENCES,INVERTER_REFERENCE} from './equipment'
import {calculateSolar} from './solar'
describe('SQ-04B sourced module reference and strict regulatory gates',()=>{
  it('uses a real 450 Wp manufacturer datasheet with matching source data',()=>{
    const t=moduleById('trina-neg9r28-450')
    expect(t.model).toContain('TSM-450')
    expect(t.powerWp).toBe(450)
    expect(t.vocStcV).toBe(52.9)
    expect(t.vmppStcV).toBe(44.6)
    expect(t.iscStcA).toBe(10.74)
    expect(t.imppStcA).toBe(10.09)
    expect(t.budgetAreaM2).toBeCloseTo(1.762*1.134*1.1)
    expect(t.sourceEdition).toBe('TSM_ESP_2024_C')
    expect(t.secApproval).toBe('unverified')
    expect(t.priceStatus).toBe('not-verified')
  })
  it('keeps all technical specs absent when using generic unsourced placeholder',()=>{
    expect(defaultModule.powerWp).toBe(550)
    expect(defaultModule.vocStcV).toBeNull()
    expect(preliminaryDcScreen(defaultModule,10).status).toBe('insufficient-data')
    expect(MODULE_REFERENCES.every(m=>m.secApproval==='unverified')).toBe(true)
  })
  it('flags cold-circuit maximum voltage, without pretending SEC approval',()=>{
    const t=moduleById('trina-neg9r28-450')
    const q=preliminaryDcScreen(t,20,-10)
    expect(q.status).toBe('review-required')
    expect(q.estimatedColdVocV).toBeCloseTo(52.9*(1+0.0024*35),5)
    expect(q.maxSeriesModules).toBe(10)
    expect(q.stringsNeeded).toBe(2)
    expect(q.currentFlag).toBe(false)
    expect(INVERTER_REFERENCE.secApproval).toBe('unverified')
    expect(INVERTER_REFERENCE.afciChile).toBe('unverified')
  })
  it('invalid inputs are rejected',()=>{
    expect(()=>preliminaryDcScreen(moduleById('trina-neg9r28-450'),-2)).toThrow()
    expect(()=>preliminaryDcScreen(defaultModule,1,NaN)).toThrow()
  })
  it('selected datasheet dimensions and rated power flow to the energy model',()=>{
    const m=moduleById('trina-neg9r28-450')
    const data=calculateSolar({
      monthlyConsumptionKwh:410,usableRoofAreaM2:32,modulePowerWp:m.powerWp,
      moduleAreaM2:m.budgetAreaM2,referenceYieldKwhPerKwpYear:1700,
      lossesPct:17,orientation:'N',systemType:'on-grid',
      retailTariffClpKwh:220,exportTariffClpKwh:75,
    })
    expect(data.modules).toBeGreaterThan(0)
    expect(data.systemKwp).toBeCloseTo(data.modules*0.45)
    expect(data.maximumModules).toBe(Math.floor(32/m.budgetAreaM2))
  })
})
