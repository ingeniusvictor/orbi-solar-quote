import {describe,expect,it} from 'vitest'
import {
  INVERTERS,BATTERIES,inverterById,batteryById,checkBatteryVoltage,reviewEquipment,
} from './equipment-catalog'
import {moduleById} from './equipment'

const trina=moduleById('trina-neg9r28-450')
const generic=moduleById('generic-550')
const eh=inverterById('goodwe-eh-5000')
const dns=inverterById('goodwe-dns-30')
const hvs51=batteryById('byd-hvs-5-1')
const hvs102=batteryById('byd-hvs-10-2')

describe('SQ-04C inverter & BESS manufacturer technical provenance',()=>{
  it('keeps approval, AFCI, BMS compatibility and prices strictly unverified',()=>{
    expect(INVERTERS).toHaveLength(3)
    expect(BATTERIES).toHaveLength(3)
    expect(INVERTERS.every(x=>x.secApproval==='unverified'&&
      x.afciApprovalChile==='unverified'&&x.priceVerified===false)).toBe(true)
    expect(BATTERIES.every(x=>x.inverterCompatibility==='unverified'&&
      x.secApproval==='unverified'&&x.priceVerified===false)).toBe(true)
  })
  it('contains sourced inverter electrical limits and battery chemistry',()=>{
    expect(eh.model).toBe('GW5000-EH')
    expect(eh.nominalAcW).toBe(5000)
    expect(eh.batteryVoltageMinV).toBe(85)
    expect(eh.batteryVoltageMaxV).toBe(460)
    expect(eh.maxPvVoltageV).toBe(580)
    expect(eh.mpptVoltageMinV).toBe(100)
    expect(eh.mpptVoltageMaxV).toBe(550)
    expect(eh.mpptCurrentA).toBe(12.5)
    expect(eh.mpptShortCircuitA).toBe(15.2)
    expect(eh.maxPvInputW).toBe(6650)
    expect(hvs51.chemistry).toBe('LFP')
    expect(hvs51.usableDcKwh).toBeCloseTo(5.12)
    expect(hvs51.nominalVoltageV).toBeCloseTo(204.8)
    expect(hvs102.usableDcKwh).toBeCloseTo(10.24)
    expect(hvs102.voltageMaxV).toBe(480)
  })
  it('detects grid-only inverter cannot accept battery',()=>{
    expect(checkBatteryVoltage(dns,hvs51)).toBe('no-battery-port')
    const r=reviewEquipment(trina,10,'hybrid',dns,hvs51)
    expect(r.status).toBe('blocked')
    expect(r.voltageFinding).toBe('no-battery-port')
    expect(r.bms).toBe('unverified')
  })
  it('never calls a matching voltage window compatible or approved',()=>{
    expect(checkBatteryVoltage(eh,hvs51)).toBe('voltage-overlap-only')
    const r=reviewEquipment(trina,10,'hybrid',eh,hvs51)
    expect(r.status).toBe('review-required')
    expect(r.voltageFinding).toBe('voltage-overlap-only')
    expect(r.afciChile).toBe('unverified')
  })
  it('flags BYD 10.2 full operating window extending above GoodWe EH 460 V',()=>{
    expect(checkBatteryVoltage(eh,hvs102)).toBe('partial-voltage-range')
    const r=reviewEquipment(trina,10,'hybrid',eh,hvs102)
    expect(r.notices.some(s=>s.includes('fuera del rango'))).toBe(true)
  })
  it('compares actual cold Voc with selected inverter and never designs strings',()=>{
    const r=reviewEquipment(trina,10,'on-grid',eh,batteryById('none'),-10)
    expect(r.coldVocPerModuleV).toBeCloseTo(52.9*(1+0.0024*35))
    expect(r.maxSeriesByColdVoc).toBe(10)
    expect(r.mpptCurrentFlag).toBe(false)
    expect(r.iscFlag).toBe(false)
    expect(r.notices.some(s=>s.includes('NO es una recomendación de strings'))).toBe(true)
  })
  it('detects input PV power above GoodWe datasheet as review, not approval',()=>{
    const r=reviewEquipment(trina,20,'hybrid',eh,hvs51)
    expect(r.nominalPvPowerExceedsInput).toBe(true)
    expect(r.status).not.toBe('blocked')
  })
  it('does not infer electrical limits for generic modules',()=>{
    const r=reviewEquipment(generic,10,'on-grid',dns,batteryById('none'))
    expect(r.coldVocPerModuleV).toBeNull()
    expect(r.status).toBe('insufficient-data')
  })
  it('blocks battery reference in pure on-grid configuration',()=>{
    const r=reviewEquipment(trina,10,'on-grid',eh,hvs51)
    expect(r.status).toBe('blocked')
  })
  it('refuses to imply off-grid suitability for grid-interactive inverter',()=>{
    const r=reviewEquipment(trina,10,'off-grid',eh,hvs51)
    expect(r.status).toBe('blocked')
  })
  it('validates temperature and module count range',()=>{
    expect(()=>reviewEquipment(trina,-1,'hybrid',eh,hvs51)).toThrow(RangeError)
    expect(()=>reviewEquipment(trina,10,'hybrid',eh,hvs51,NaN)).toThrow(RangeError)
  })
})
