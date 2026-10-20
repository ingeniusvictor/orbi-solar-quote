import {describe, expect, it, vi} from 'vitest'
import handler, {hourlyProviderUrl, parseHourlyRequest, parseProviderHours} from '../../api/solar-hourly'
import {parsePvgisHourly,validPvgisHourly, type PvgisHourlySeries} from './hourly-series'
import {simulatePvgisHourly, simulateHourly, type HourlyScenario} from './hourly'
const q={latitude:'-34.17',longitude:'-70.74',tiltDeg:'25',lossesPct:'17',orientation:'N'}
const params={latitude:-34.17,longitude:-70.74,tiltDeg:25,lossesPct:17,aspectDeg:180}
const format=(i:number)=>{
  const d=new Date(Date.UTC(2023,0,1)+i*3600000)
  return d.getUTCFullYear().toString()+String(d.getUTCMonth()+1).padStart(2,'0')+
    String(d.getUTCDate()).padStart(2,'0')+':'+String(d.getUTCHours()).padStart(2,'0')+'10'
}
const fixture=()=>({inputs:{meteo_data:{radiation_db:'PVGIS-ERA5'}},
  outputs:{hourly:Array.from({length:8760},(_,i)=>({time:format(i),P:1000*((i%24>=14&&i%24<=19)?0.5:0)}))}})
const scenario:HourlyScenario={
  monthlyGenerationKwh:Array(12).fill(120),monthlyConsumptionKwh:240,
  systemType:'on-grid',demandProfile:'balanced',batteryNominalKwh:0,
  maxBatteryChargeKw:3,maxBatteryDischargeKw:3,
  retailTariffClpKwh:220,exportTariffClpKwh:75,
}
const approx=(a:number,b:number)=>expect(a).toBeCloseTo(b,5)
describe('PVGIS hourly API security and parser',()=>{
  it('uses fixed official seriescalc endpoint and correct Chile azimuth',()=>{
    const input=parseHourlyRequest(q)
    expect(input).toEqual(params)
    const url=new URL(hourlyProviderUrl(input!))
    expect(url.host).toBe('re.jrc.ec.europa.eu')
    expect(url.pathname).toBe('/api/v5_3/seriescalc')
    expect(url.searchParams.get('pvcalculation')).toBe('1')
    expect(url.searchParams.get('peakpower')).toBe('1')
    expect(url.searchParams.get('aspect')).toBe('180')
    expect(url.searchParams.get('startyear')).toBe('2023')
    expect(url.searchParams.get('endyear')).toBe('2023')
  })
  it('rejects invalid or injected parameters',()=>{
    expect(parseHourlyRequest({...q,orientation:'north;drop'})).toBeNull()
    expect(parseHourlyRequest({...q,latitude:'NaN'})).toBeNull()
    expect(parseHourlyRequest({...q,lossesPct:'75'})).toBeNull()
    expect(parseHourlyRequest({...q,longitude:''})).toBeNull()
  })
  it('strictly rejects missing and duplicate UTC hours',()=>{
    const data=fixture()
    expect(parseProviderHours(data,params).utcHourKwhPerKwp).toHaveLength(8760)
    data.outputs.hourly[1].time=data.outputs.hourly[0].time
    expect(()=>parseProviderHours(data,params)).toThrow()
    expect(()=>parsePvgisHourly(data,params)).toThrow()
    const noHour=fixture()
    noHour.outputs.hourly.pop()
    expect(()=>parseProviderHours(noHour,params)).toThrow()
  })
  it('returns a normalized 8760 series with correct units',()=>{
    const series=parseProviderHours(fixture(),params)
    expect(series.source).toBe('PVGIS v5.3 / seriescalc')
    expect(series.radiationDatabase).toBe('PVGIS-ERA5')
    approx(series.annualKwhPerKwp,365*6*0.5)
    expect(validPvgisHourly(series)).toBe(true)
    expect(parsePvgisHourly(fixture(),params)).toEqual(series)
  })
  it('rejects bad method/query before any upstream request',async()=>{
    function mock(){const state:{status:number;body:unknown}={status:0,body:null}
      const res={setHeader:(_k:string,_v:string)=>{},status:(n:number)=>{state.status=n;return res},json:(v:unknown)=>{state.body=v}}
      return {res,state}
    }
    let t=mock()
    await handler({method:'POST',query:q},t.res)
    expect(t.state.status).toBe(405)
    t=mock()
    await handler({method:'GET',query:{...q,latitude:'999'}},t.res)
    expect(t.state.status).toBe(400)
  })
  it('serves compact actual year series and returns controlled failures',async()=>{
    const original=globalThis.fetch
    function mock(){const state:{status:number;body:unknown;headers:Record<string,string>}={status:0,body:null,headers:{}}
      const res={setHeader:(k:string,v:string)=>{state.headers[k]=v},
        status:(n:number)=>{state.status=n;return res},json:(v:unknown)=>{state.body=v}}
      return {res,state}
    }
    try{
      globalThis.fetch=vi.fn(async()=>({ok:true,json:async()=>fixture()} as Response))
      let t=mock()
      await handler({method:'GET',query:q},t.res)
      expect(t.state.status).toBe(200)
      expect(((t.state.body as {series:PvgisHourlySeries}).series.utcHourKwhPerKwp)).toHaveLength(8760)
      expect(t.state.headers['Cache-Control']).toContain('s-maxage')
      globalThis.fetch=vi.fn(async()=>{throw new Error('offline')})
      t=mock()
      await handler({method:'GET',query:q},t.res)
      expect(t.state.status).toBe(503)
    }finally{globalThis.fetch=original}
  })
})
describe('Real hourly dispatch and invariants',()=>{
  const series=parsePvgisHourly(fixture(),params)
  it('honors genuine PV hourly power and 12 months of local-hour demand',()=>{
    const r=simulatePvgisHourly(scenario,series,3)
    expect(r.source).toBe('pvgis-hourly')
    approx(r.annual.generationKwh,series.annualKwhPerKwp*3)
    approx(r.annual.demandKwh,12*scenario.monthlyConsumptionKwh)
    r.monthly.forEach(m=>approx(m.demandKwh,scenario.monthlyConsumptionKwh))
    approx(r.annual.generationKwh,r.annual.directSelfUseKwh+r.annual.batteryChargeInputKwh+
      r.annual.gridExportKwh+r.annual.curtailedKwh)
    approx(r.annual.demandKwh,r.annual.directSelfUseKwh+r.annual.batteryDischargeToLoadKwh+
      r.annual.gridImportKwh+r.annual.unmetDemandKwh)
  })
  it('does not create electricity from a PVGIS series when array is all-zero',()=>{
    const zero:PvgisHourlySeries={...series,utcHourKwhPerKwp:Array(8760).fill(0),annualKwhPerKwp:0}
    const r=simulatePvgisHourly(scenario,zero,5)
    expect(r.annual.generationKwh).toBe(0)
    approx(r.annual.gridImportKwh,r.annual.demandKwh)
  })
  it('hybrid storage reduces imports and conserves energy',()=>{
    const without=simulatePvgisHourly({...scenario,systemType:'hybrid'},series,3)
    const withBattery=simulatePvgisHourly({...scenario,systemType:'hybrid',batteryNominalKwh:8},series,3)
    expect(withBattery.annual.gridImportKwh).toBeLessThan(without.annual.gridImportKwh)
    expect(withBattery.annual.batteryLossKwh).toBeGreaterThan(0)
    approx(withBattery.annual.batteryChargeInputKwh,
      withBattery.annual.batteryLossKwh+withBattery.annual.batteryDischargeToLoadKwh+
      withBattery.endingBatterySocKwh-withBattery.startingBatterySocKwh)
  })
  it('off-grid reports unmet demand but no money or energy exchange',()=>{
    const r=simulatePvgisHourly({...scenario,systemType:'off-grid',batteryNominalKwh:0},series,0.5)
    expect(r.annual.unmetDemandKwh).toBeGreaterThan(0)
    expect(r.annual.gridImportKwh).toBe(0)
    expect(r.annual.gridExportKwh).toBe(0)
    expect(r.indicativeEnergyValueClp).toBeNull()
  })
  it('never accepts malformed or mismatched production data',()=>{
    expect(()=>simulatePvgisHourly(scenario,{...series,utcHourKwhPerKwp:[1]},3)).toThrow()
    expect(()=>simulatePvgisHourly(scenario,series,Number.NaN)).toThrow()
    expect(simulateHourly(scenario).source).toBe('synthetic-hourly')
  })
})
