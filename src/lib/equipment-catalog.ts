import type {ModuleReference} from './equipment'
import type {SystemType} from './solar'

/** Technical references only. NEVER treat as a live inventory, offer or SEC permit. */
export type InverterId='none'|'goodwe-dns-30'|'goodwe-eh-5000'
export type BatteryId='none'|'byd-hvs-5-1'|'byd-hvs-10-2'
export type InverterReference={
  id:InverterId;manufacturer:string;model:string;family:'grid'|'hybrid'|'none'
  nominalAcW:number|null;maxPvVoltageV:number|null
  maxPvInputW:number|null;mpptVoltageMinV:number|null;mpptVoltageMaxV:number|null
  mpptCurrentA:number|null;mpptShortCircuitA:number|null;mpptCount:number|null
  batteryVoltageMinV:number|null;batteryVoltageMaxV:number|null
  datasheetUrl:string|null;sourceEdition:string|null;secApproval:'unverified'
  afciApprovalChile:'unverified';priceVerified:false
}
export type BatteryReference={
  id:BatteryId;manufacturer:string;model:string;chemistry:string|null
  usableDcKwh:number|null;nominalVoltageV:number|null
  voltageMinV:number|null;voltageMaxV:number|null
  datasheetUrl:string|null;sourceEdition:string|null
  inverterCompatibility:'unverified';secApproval:'unverified';priceVerified:false
}

export const INVERTERS:readonly InverterReference[]=[
  {id:'none',manufacturer:'Sin seleccionar',model:'Sin referencia de inversor',
    family:'none',nominalAcW:null,maxPvVoltageV:null,maxPvInputW:null,
    mpptVoltageMinV:null,mpptVoltageMaxV:null,mpptCurrentA:null,
    mpptShortCircuitA:null,mpptCount:null,batteryVoltageMinV:null,batteryVoltageMaxV:null,
    datasheetUrl:null,sourceEdition:null,secApproval:'unverified',
    afciApprovalChile:'unverified',priceVerified:false},
  {id:'goodwe-dns-30',manufacturer:'GoodWe',model:'GW5000-DNS-30',
    family:'grid',nominalAcW:5000,maxPvVoltageV:600,maxPvInputW:null,
    mpptVoltageMinV:null,mpptVoltageMaxV:null,mpptCurrentA:16,
    mpptShortCircuitA:null,mpptCount:2,batteryVoltageMinV:null,batteryVoltageMaxV:null,
    datasheetUrl:'https://us.goodwe.com/dns-g3',sourceEdition:'GoodWe DNS G3 (web US)',
    secApproval:'unverified',afciApprovalChile:'unverified',priceVerified:false},
  {id:'goodwe-eh-5000',manufacturer:'GoodWe',model:'GW5000-EH',
    family:'hybrid',nominalAcW:5000,maxPvVoltageV:580,maxPvInputW:6650,
    mpptVoltageMinV:100,mpptVoltageMaxV:550,mpptCurrentA:12.5,
    mpptShortCircuitA:15.2,mpptCount:2,batteryVoltageMinV:85,batteryVoltageMaxV:460,
    datasheetUrl:'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_EH_Datasheet-EN.pdf',
    sourceEdition:'GoodWe EH Series 20230726 EN V2.1',
    secApproval:'unverified',afciApprovalChile:'unverified',priceVerified:false},
] as const

export const BATTERIES:readonly BatteryReference[]=[
  {id:'none',manufacturer:'Sin seleccionar',model:'Sin referencia de batería',
    chemistry:null,usableDcKwh:null,nominalVoltageV:null,voltageMinV:null,voltageMaxV:null,
    datasheetUrl:null,sourceEdition:null,inverterCompatibility:'unverified',
    secApproval:'unverified',priceVerified:false},
  {id:'byd-hvs-5-1',manufacturer:'BYD',model:'Battery-Box Premium HVS 5.1',
    chemistry:'LFP',usableDcKwh:5.12,nominalVoltageV:204.8,voltageMinV:160,
    voltageMaxV:240,datasheetUrl:'https://bydbatterybox.com/uploads/downloads/241212_Datasheet_Battery-Box%20HVS_V1.4_EN-675a34b4e7bfb.pdf',
    sourceEdition:'BYD HVS V1.4 2024-12-12',
    inverterCompatibility:'unverified',secApproval:'unverified',priceVerified:false},
  {id:'byd-hvs-10-2',manufacturer:'BYD',model:'Battery-Box Premium HVS 10.2',
    chemistry:'LFP',usableDcKwh:10.24,nominalVoltageV:409.6,voltageMinV:320,
    voltageMaxV:480,datasheetUrl:'https://bydbatterybox.com/uploads/downloads/241212_Datasheet_Battery-Box%20HVS_V1.4_EN-675a34b4e7bfb.pdf',
    sourceEdition:'BYD HVS V1.4 2024-12-12',
    inverterCompatibility:'unverified',secApproval:'unverified',priceVerified:false},
] as const

export function inverterById(id:InverterId):InverterReference {
  return INVERTERS.find(x=>x.id===id)??INVERTERS[0]
}
export function batteryById(id:BatteryId):BatteryReference {
  return BATTERIES.find(x=>x.id===id)??BATTERIES[0]
}

export type VoltageFinding =
  'not-requested'|'no-inverter'|'no-battery-port'|'no-voltage-overlap'|
  'partial-voltage-range'|'voltage-overlap-only'

/**
 * Preliminary numerical EXCLUSION/REVIEW only; never a compatible/approved state.
 * Datasheet voltage range overlap alone does not establish BMS/firmware support.
 */
export function checkBatteryVoltage(inv:InverterReference,batt:BatteryReference):VoltageFinding{
  if(batt.id==='none')return 'not-requested'
  if(inv.id==='none')return 'no-inverter'
  const min=inv.batteryVoltageMinV,max=inv.batteryVoltageMaxV
  if(min===null||max===null)return 'no-battery-port'
  if(batt.voltageMinV===null||batt.voltageMaxV===null)return 'no-voltage-overlap'
  if(batt.voltageMaxV<min||batt.voltageMinV>max)return 'no-voltage-overlap'
  if(batt.voltageMinV<min||batt.voltageMaxV>max)return 'partial-voltage-range'
  return 'voltage-overlap-only'
}
export interface PreliminaryReview {
  source:'manufacturer-datasheets'
  status:'blocked'|'review-required'|'insufficient-data'
  voltageFinding:VoltageFinding
  coldVocPerModuleV:number|null
  maxSeriesByColdVoc:number|null
  mpptCurrentFlag:boolean|null
  iscFlag:boolean|null
  nominalPvPowerExceedsInput:boolean|null
  notices:string[]
  sec:'unverified'
  afciChile:'unverified'
  bms:'unverified'
}

export function reviewEquipment(
  module:ModuleReference,moduleCount:number,systemType:SystemType,
  inverter:InverterReference,battery:BatteryReference,coldCellC=-10
):PreliminaryReview {
  if(!Number.isInteger(moduleCount)||moduleCount<0||moduleCount>100000||
    !Number.isFinite(coldCellC)||coldCellC< -40||coldCellC>25)
    throw RangeError('Parámetros eléctricos inválidos')
  const notices:string[]=[]
  let blocked=false
  const voltageFinding=checkBatteryVoltage(inverter,battery)
  if(inverter.id==='none')notices.push('Sin inversor elegido: no hay ingeniería ni presupuesto de un equipo seleccionado.')
  if(systemType==='off-grid'&&inverter.id!=='none'){
    blocked=true
    notices.push('No declarar este inversor como apto para operación aislada continua.')
  }
  if(systemType==='hybrid'&&inverter.family==='grid'){
    blocked=true
    notices.push('El inversor conectado a red no incluye interfaz de batería: no se puede usar como híbrido.')
  }
  if(battery.id!=='none'&&systemType==='on-grid'){
    blocked=true
    notices.push('Se seleccionó batería para el escenario on-grid sin solución híbrida validada.')
  }
  if(voltageFinding==='no-battery-port'||voltageFinding==='no-voltage-overlap'||
     voltageFinding==='no-inverter'){
    blocked=true
    notices.push('La conexión de batería no tiene interfaz o rango de tensión admisible.')
  }else if(voltageFinding==='partial-voltage-range'){
    notices.push('El rango operativo de batería se extiende fuera del rango del inversor.')
  }else if(voltageFinding==='voltage-overlap-only'){
    notices.push('Coincide el rango de tensión, pero NO están comprobados BMS, firmware ni lista OEM.')
  }
  if(systemType==='hybrid'&&battery.id==='none')
    notices.push('La selección híbrida no tiene todavía referencia de batería.')
  const pvPowerW=module.powerWp*moduleCount
  const nominalPvPowerExceedsInput=inverter.maxPvInputW===null?null:pvPowerW>inverter.maxPvInputW
  if(nominalPvPowerExceedsInput)notices.push('La potencia FV supera la entrada de referencia: revisar sobredimensionamiento permitido.')
  const known=module.vocStcV!==null&&module.vocTempPctPerC!==null&&inverter.maxPvVoltageV!==null
  const coldVocPerModuleV=known
    ?module.vocStcV!*(1+(module.vocTempPctPerC!/100)*(coldCellC-25)):null
  const maxSeriesByColdVoc=coldVocPerModuleV&&inverter.maxPvVoltageV!==null
    ?Math.floor(inverter.maxPvVoltageV/coldVocPerModuleV):null
  const mpptCurrentFlag=module.imppStcA!==null&&inverter.mpptCurrentA!==null
    ?module.imppStcA>inverter.mpptCurrentA:null
  const iscFlag=module.iscStcA!==null&&inverter.mpptShortCircuitA!==null
    ?module.iscStcA>inverter.mpptShortCircuitA:null
  if(mpptCurrentFlag===true||iscFlag===true){
    blocked=true
    notices.push('Corriente del módulo excede un límite documentado del inversor para una entrada.')
  }
  if(maxSeriesByColdVoc!==null&&maxSeriesByColdVoc<1&&moduleCount>0){
    blocked=true
    notices.push('El Voc frío de un solo módulo superaría la tensión FV máxima del inversor.')
  }
  notices.push('NO es una recomendación de strings; faltan tensión MPPT operativa por string, temperatura de diseño, compatibilidad de batería y autorizaciones SEC/AFCI.')
  return {
    source:'manufacturer-datasheets',
    status:blocked?'blocked':known?'review-required':'insufficient-data',
    voltageFinding,coldVocPerModuleV,maxSeriesByColdVoc,mpptCurrentFlag,
    iscFlag,nominalPvPowerExceedsInput,notices,
    sec:'unverified',afciChile:'unverified',bms:'unverified',
  }
}
