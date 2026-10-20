import { describe, expect, it } from 'vitest'
import {calculateQuote, DEMO_PRICE_BOOK, type QuoteInput} from './quote'
const base:QuoteInput = {
  systemType:'on-grid',moduleCount:8,modulePowerWp:550,
  batteryTargetKwh:0,marginPct:10,vatPct:19,
}
const get=(id:string, input:QuoteInput=base)=>calculateQuote(input).lines.find(x=>x.id===id)
describe('SQ-04 quote calculator (synthetic demonstration prices)',()=>{
  it('computes deterministic quantities and never picks a brand',()=>{
    const q=calculateQuote(base)
    expect(q.demoOnly).toBe(true)
    expect(q.systemKwp).toBeCloseTo(4.4)
    expect(get('module')?.quantity).toBe(8)
    expect(get('labourKwp')?.quantity).toBeCloseTo(4.4)
    expect(get('inverterGrid')?.quantity).toBe(1)
    expect(get('battery5kwh')).toBeUndefined()
    expect(q.lines.every(x=>!x.label.includes('Trina')&&!x.label.includes('Huawei'))).toBe(true)
  })
  it('uses distinct equipment for hybrid and off-grid including battery multiples',()=>{
    const hybrid=calculateQuote({...base,systemType:'hybrid',batteryTargetKwh:11})
    expect(hybrid.installedBatteryNominalKwh).toBe(15)
    expect(hybrid.lines.find(x=>x.id==='battery5kwh')?.quantity).toBe(3)
    expect(hybrid.lines.find(x=>x.id==='inverterHybrid')?.quantity).toBe(1)
    expect(hybrid.lines.find(x=>x.id==='inverterGrid')).toBeUndefined()
    const off=calculateQuote({...base,systemType:'off-grid',batteryTargetKwh:5})
    expect(off.lines.find(x=>x.id==='inverterOffgrid')?.quantity).toBe(1)
    expect(off.installedBatteryNominalKwh).toBe(5)
  })
  it('rounds tax and margin exactly once on net line subtotal',()=>{
    const q=calculateQuote(base)
    expect(q.directNetClp).toBe(q.lines.reduce((a,b)=>a+b.totalNetClp,0))
    expect(q.marginClp).toBe(Math.round(q.directNetClp*0.10))
    expect(q.netWithMarginClp).toBe(q.directNetClp+q.marginClp)
    expect(q.vatClp).toBe(Math.round(q.netWithMarginClp*0.19))
    expect(q.grandTotalClp).toBe(q.netWithMarginClp+q.vatClp)
  })
  it('propagates editable price overrides directly into exported rows',()=>{
    const old=calculateQuote(base)
    const updated=calculateQuote({...base,overrides:{module:155000}})
    expect(updated.lines.find(x=>x.id==='module')?.unitNetClp).toBe(155000)
    expect(updated.directNetClp-old.directNetClp).toBe(8*(155000-105000))
  })
  it('does not silently change demo pricebook constants',()=>{
    const q=calculateQuote({...base,overrides:{module:0}})
    expect(q.lines.find(x=>x.id==='module')?.unitNetClp).toBe(0)
    expect(DEMO_PRICE_BOOK.find(x=>x.id==='module')?.netUnitClp).toBe(105000)
  })
  it('allows zero installation without inventing materials or money',()=>{
    const q=calculateQuote({...base,moduleCount:0})
    expect(q.lines).toHaveLength(0)
    expect(q.grandTotalClp).toBe(0)
    expect(q.costClpPerWp).toBeNull()
    expect(q.installedBatteryNominalKwh).toBe(0)
  })
  it('does not add batteries or off-grid costs to an on-grid quote',()=>{
    const a=calculateQuote({...base,batteryTargetKwh:800})
    const b=calculateQuote(base)
    expect(a.grandTotalClp).toBe(b.grandTotalClp)
    expect(a.batteryTargetKwh).toBe(0)
  })
  it('rejects negative, not finite and unrealistic inputs instead of fabricating quotes',()=>{
    expect(()=>calculateQuote({...base,moduleCount:1.1})).toThrow(RangeError)
    expect(()=>calculateQuote({...base,moduleCount:-1})).toThrow(RangeError)
    expect(()=>calculateQuote({...base,overrides:{module:Number.NaN}})).toThrow(RangeError)
    expect(()=>calculateQuote({...base,marginPct:200})).toThrow(RangeError)
    expect(()=>calculateQuote({...base,vatPct:-1})).toThrow(RangeError)
  })
})
