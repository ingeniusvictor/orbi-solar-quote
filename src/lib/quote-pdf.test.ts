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
