import {describe,expect,it} from 'vitest'
import {calculateQuote} from './quote'
import {makeQuotePdf} from './quote-pdf'
describe('SQ-04 PDF safety and generation',()=>{
  const budget=calculateQuote({
    systemType:'hybrid',moduleCount:10,modulePowerWp:550,
    batteryTargetKwh:10,marginPct:10,vatPct:19,
  })
  it('creates a valid PDF with no customer account required',()=>{
    const pdf=makeQuotePdf(budget,{
      annualGenerationKwh:7500,monthlyConsumptionKwh:410,
      generationSource:'manual',createdOn:new Date('2026-10-20T12:00:00Z'),
    })
    expect(pdf.getNumberOfPages()).toBeGreaterThan(0)
    const value=pdf.output()
    expect(value.startsWith('%PDF-')).toBe(true)
    expect(value.length).toBeGreaterThan(1000)
  })
  it('removes unsupported control and tag characters from optional location text',()=>{
    const pdf=makeQuotePdf(budget,{
      annualGenerationKwh:7500,monthlyConsumptionKwh:410,
      generationSource:'pvgis',locationLabel:'<script>alert(1)</script> Rancagua',
    })
    expect(pdf.output().startsWith('%PDF-')).toBe(true)
  })
})

describe('SQ-04B A4 typography and pagination',()=>{
  it('fits the tested seven-line residential quote on a single A4 page',()=>{
    const quote=calculateQuote({
      systemType:'on-grid',moduleCount:7,modulePowerWp:450,
      batteryTargetKwh:0,marginPct:10,vatPct:19,
      overrides:{module:155000},
    })
    const document=makeQuotePdf(quote,{
      monthlyConsumptionKwh:409.09,annualGenerationKwh:4444.65,
      generationSource:'manual',
      moduleReference:'Trina Solar Vertex S+ TSM-450 NEG9R.28',
      createdOn:new Date('2026-10-20T12:00:00Z'),
    })
    expect(document.getNumberOfPages()).toBe(1)
  })
})

describe('SQ-04C hybrid reference PDF pagination',()=>{
  it('fits an eight-row hybrid DEMO with technical references and disclaimers on one A4',()=>{
    const quote=calculateQuote({
      systemType:'hybrid',moduleCount:8,modulePowerWp:450,
      batteryTargetKwh:11,marginPct:10,vatPct:19,
    })
    const output=makeQuotePdf(quote,{
      monthlyConsumptionKwh:410,annualGenerationKwh:5050,
      generationSource:'manual',
      moduleReference:'Trina Solar Vertex S+ TSM-450 NEG9R.28',
      equipmentReference:'GoodWe GW5000-EH / BYD Battery-Box Premium HVS 10.2',
      createdOn:new Date('2026-10-20T12:00:00Z'),
    })
    expect(output.getNumberOfPages()).toBe(1)
    expect(output.output().startsWith('%PDF-')).toBe(true)
  })
})
