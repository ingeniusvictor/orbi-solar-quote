/** Standalone Vercel serverless route (no extensionless TS imports in Node ESM).
 * Values and config are intentionally fixed/allowlisted, never an arbitrary URL proxy.
 * User must click to request the PVGIS series. No coordinates are persisted by app.
 */
type Req = {method?:string;query:Record<string,string|string[]|undefined>}
type Res = {setHeader(k:string,v:string):void;status(c:number):Res;json(body:unknown):void}

export const config = { maxDuration: 30 }

const ASPECT:Record<string,number> = {N:180,NE:-135,NW:135,E:-90,W:90,S:0}
export function parseHourlyRequest(query:Req['query']) {
  const num = (name:string):number => {
    const x=query[name]
    return typeof x==='string' && x.trim() ? Number(x) : NaN
  }
  const latitude=num('latitude'),longitude=num('longitude')
  const tiltDeg=num('tiltDeg'),lossesPct=num('lossesPct')
  const orientation=query.orientation
  if(![latitude,longitude,tiltDeg,lossesPct].every(Number.isFinite) ||
    latitude < -56.5 || latitude > -17 || longitude < -76.5 || longitude > -66 ||
    tiltDeg < 0 || tiltDeg > 90 || lossesPct < 0 || lossesPct > 50 ||
    typeof orientation!=='string' || !Object.hasOwn(ASPECT,orientation)) return null
  return {latitude,longitude,tiltDeg,lossesPct,aspectDeg:ASPECT[orientation]}
}

export function hourlyProviderUrl(input:NonNullable<ReturnType<typeof parseHourlyRequest>>) {
  const url=new URL('https://re.jrc.ec.europa.eu/api/v5_3/seriescalc')
  const p:Record<string,string>={
    lat:String(input.latitude),lon:String(input.longitude),
    startyear:'2023',endyear:'2023',pvcalculation:'1',peakpower:'1',
    trackingtype:'0',pvtechchoice:'crystSi',mountingplace:'building',
    angle:String(input.tiltDeg),aspect:String(input.aspectDeg),
    loss:String(input.lossesPct),outputformat:'json',
  }
  for(const [key,value] of Object.entries(p))url.searchParams.set(key,value)
  return url.toString()
}

export function parseProviderHours(payload:unknown,input:NonNullable<ReturnType<typeof parseHourlyRequest>>) {
  if(!payload||typeof payload!=='object')throw Error('Invalid response')
  const root=payload as {outputs?:{hourly?:unknown};inputs?:{meteo_data?:{radiation_db?:unknown}}}
  const rows=root.outputs?.hourly
  if(!Array.isArray(rows)||rows.length!==8760)throw Error('Invalid number of PVGIS hours')
  const start=Date.UTC(2023,0,1)
  const values:number[]=[]
  for(let i=0;i<rows.length;i++){
    const row:unknown=rows[i]
    if(!row||typeof row!=='object')throw Error('Invalid row')
    const {time,P}=row as {time?:unknown;P?:unknown}
    if(typeof time!=='string'||!/^2023\d{4}:\d{4}$/.test(time))throw Error('Invalid date')
    const mo=Number(time.slice(4,6)),day=Number(time.slice(6,8))
    const hour=Number(time.slice(9,11)),minute=Number(time.slice(11,13))
    if(mo<1||mo>12||day<1||day>31||hour>23||minute>59||
      Date.UTC(2023,mo-1,day,hour)!==start+i*3600000||
      typeof P!=='number'||!Number.isFinite(P)||P<0||P>3000)throw Error('Corrupt PVGIS series')
    values.push(Math.round(P/1000*100000)/100000)
  }
  const db=root.inputs?.meteo_data?.radiation_db
  return {
    source:'PVGIS v5.3 / seriescalc' as const,year:2023 as const,
    ...input,radiationDatabase:typeof db==='string'?db:null,
    utcHourKwhPerKwp:values,annualKwhPerKwp:values.reduce((a,b)=>a+b,0),
  }
}

export default async function handler(req:Req,res:Res) {
  res.setHeader('Content-Type','application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options','nosniff')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Solo se permite GET.'})}
  const input=parseHourlyRequest(req.query)
  if(!input)return res.status(400).json({error:'Coordenadas, orientación, inclinación o pérdidas fuera del rango admitido.'})
  try{
    const result=await fetch(hourlyProviderUrl(input),{
      headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000),
    })
    if(!result.ok)return res.status(result.status===400?422:503)
      .json({error:'PVGIS no dispone de la serie horaria solicitada. Usa el modo sintético.'})
    const response:unknown=await result.json()
    const series=parseProviderHours(response,input)
    res.setHeader('Cache-Control','public, s-maxage=604800, stale-while-revalidate=2592000')
    return res.status(200).json({series})
  }catch{
    return res.status(503).json({error:'No se obtuvo la serie horaria. Puedes continuar con el modelo sintético.'})
  }
}
