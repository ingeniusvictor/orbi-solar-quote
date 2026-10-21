import type { SystemType } from './solar'
import {netFromGross,type SupplierConfiguration} from './enertik-presets'

/**
 * ORBI SQ-04: A fully editable DEMO pricebook, NOT vendor pricing or a
 * market quote. No equipment has been selected, verified or reserved.
 * All reference amounts are synthetic CLP net-of-tax fixtures.
 */
export type PriceKey = 'module'|'inverterGrid'|'inverterHybrid'|'inverterOffgrid'|
  'battery5kwh'|'mounting'|'bos'|'labourKwp'|'engineering'|'logistics'

export interface PriceEntry {
  id: PriceKey
  label: string
  unit: string
  netUnitClp: number
}
export const DEMO_PRICE_BOOK: readonly PriceEntry[] = [
  {id:'module',label:'Módulo fotovoltaico genérico',unit:'unidad',netUnitClp:105000},
  {id:'inverterGrid',label:'Inversor conectado a red (referencial)',unit:'unidad',netUnitClp:650000},
  {id:'inverterHybrid',label:'Inversor híbrido (referencial)',unit:'unidad',netUnitClp:1150000},
  {id:'inverterOffgrid',label:'Inversor aislado (referencial)',unit:'unidad',netUnitClp:950000},
  {id:'battery5kwh',label:'Batería genérica nominal de 5 kWh',unit:'unidad',netUnitClp:1250000},
  {id:'mounting',label:'Soportes y fijaciones (estimación por módulo)',unit:'módulo',netUnitClp:45000},
  {id:'bos',label:'Tablero, protecciones y cableado (paquete)',unit:'paquete',netUnitClp:290000},
  {id:'labourKwp',label:'Instalación y montaje (referencia por kWp)',unit:'kWp',netUnitClp:220000},
  {id:'engineering',label:'Ingeniería y trámites (no verificados)',unit:'paquete',netUnitClp:280000},
  {id:'logistics',label:'Traslado y logística (referencial)',unit:'paquete',netUnitClp:160000},
] as const

export type PriceOverrides = Partial<Record<PriceKey,number>>
export interface QuoteInput {
  systemType: SystemType
  moduleCount: number
  modulePowerWp: number
  batteryTargetKwh: number
  marginPct: number
  vatPct: number
  overrides?: PriceOverrides
  supplierEquipment?:SupplierConfiguration
  supplierSourceUnmodified?:boolean
}
export interface QuoteLine {
  id:PriceKey
  label:string
  unit:string
  quantity:number
  unitNetClp:number
  totalNetClp:number
  priceOrigin?:'synthetic'|'enertik-snapshot'|'edited'
}
export interface QuoteBudget {
  demoOnly:true
  systemType:SystemType
  moduleCount:number
  modulePowerWp:number
  systemKwp:number
  batteryTargetKwh:number
  installedBatteryNominalKwh:number
  supplierLabel:string|null
  lines:QuoteLine[]
  directNetClp:number
  marginPct:number
  marginClp:number
  netWithMarginClp:number
  vatPct:number
  vatClp:number
  grandTotalClp:number
  costClpPerWp:number|null
}

function nonNegative(name:string,value:number,limit:number) {
  if(!Number.isFinite(value)||value<0||value>limit)throw new RangeError('Dato inválido: '+name)
  return value
}
const money=(n:number)=>Math.round(n)

/** Source of truth for UI and PDF. All totals are deterministic. */
export function calculateQuote(input:QuoteInput):QuoteBudget {
  if(!['on-grid','hybrid','off-grid'].includes(input.systemType))throw new RangeError('Tipo de sistema inválido')
  const count=nonNegative('moduleCount',input.moduleCount,100000)
  if(!Number.isInteger(count))throw new RangeError('El número de módulos debe ser entero')
  const panelWp=nonNegative('modulePowerWp',input.modulePowerWp,2000)
  const targetStorage=nonNegative('batteryTargetKwh',input.batteryTargetKwh,10000)
  const marginPct=nonNegative('marginPct',input.marginPct,100)
  const vatPct=nonNegative('vatPct',input.vatPct,100)
  const systemKwp=count*panelWp/1000
  const hasArray=count>0 && systemKwp>0
  const useSupplier=hasArray && input.systemType!=='on-grid' && !!input.supplierEquipment
  const selected=input.supplierEquipment
  if(useSupplier && selected){
    if(!Number.isInteger(selected.batteryUnits)||selected.batteryUnits<0||selected.batteryUnits>100)
      throw new RangeError('Cantidad de baterias inválida')
    nonNegative('batteryNominalKwh',selected.batteryNominalKwh,1000)
    nonNegative('inverterGrossClp',selected.inverterGrossClp,1e11)
    nonNegative('batteryGrossClp',selected.batteryGrossClp,1e11)
    if(!selected.provider.trim()||!selected.inverterModel.trim()||!selected.batteryModel.trim())
      throw new RangeError('Proveedor y modelos deben identificarse')
  }
  const batteryCount=hasArray && input.systemType!=='on-grid'
    ? useSupplier && selected ? selected.batteryUnits : Math.ceil(targetStorage/5) : 0
  const inverterId:PriceKey=input.systemType==='hybrid'?'inverterHybrid'
    : input.systemType==='off-grid'?'inverterOffgrid':'inverterGrid'
  const quantities:Partial<Record<PriceKey,number>>={
    module:hasArray?count:0,
    [inverterId]:hasArray?1:0,
    battery5kwh:batteryCount,
    mounting:hasArray?count:0,
    bos:hasArray?1:0,
    labourKwp:hasArray?systemKwp:0,
    engineering:hasArray?1:0,
    logistics:hasArray?1:0,
  }
  const lines:QuoteLine[]=[]
  for(const entry of DEMO_PRICE_BOOK) {
    const quantity=quantities[entry.id]??0
    if(quantity<=0)continue
    const isSupplierInverter=useSupplier && selected && entry.id===inverterId
    const isSupplierBattery=useSupplier && selected && entry.id==='battery5kwh'
    const supplierGross=isSupplierInverter ? selected?.inverterGrossClp
      :isSupplierBattery ? selected?.batteryGrossClp : undefined
    const raw=input.overrides?.[entry.id] ??
      (supplierGross===undefined ? entry.netUnitClp : netFromGross(supplierGross))
    const unitNetClp=nonNegative(entry.id,raw,1e10)
    const label=isSupplierInverter ? 'Inversor '+selected!.inverterModel :
      isSupplierBattery ? 'Batería '+selected!.batteryModel : entry.label
    lines.push({
      id:entry.id,label,unit:entry.unit,quantity,
      unitNetClp,
      totalNetClp:money(quantity*unitNetClp),
      priceOrigin:input.overrides?.[entry.id]!==undefined || (supplierGross!==undefined && input.supplierSourceUnmodified===false) ? 'edited'
        :supplierGross!==undefined ? 'enertik-snapshot' : 'synthetic',
    })
  }
  const directNetClp=lines.reduce((sum,line)=>sum+line.totalNetClp,0)
  const marginClp=money(directNetClp*marginPct/100)
  const netWithMarginClp=directNetClp+marginClp
  const vatClp=money(netWithMarginClp*vatPct/100)
  const grandTotalClp=netWithMarginClp+vatClp
  return {
    demoOnly:true,systemType:input.systemType,moduleCount:count,modulePowerWp:panelWp,
    systemKwp,batteryTargetKwh:input.systemType==='on-grid'?0:targetStorage,
    installedBatteryNominalKwh:batteryCount*(useSupplier?selected!.batteryNominalKwh:5),
    supplierLabel:useSupplier?selected!.provider:null,
    lines,directNetClp,
    marginPct,marginClp,netWithMarginClp,vatPct,vatClp,grandTotalClp,
    costClpPerWp:systemKwp>0?grandTotalClp/(systemKwp*1000):null,
  }
}
