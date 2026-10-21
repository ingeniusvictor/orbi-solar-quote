/**
 * Supplier price snapshots: NOT quotations, reservations or installation approval.
 * Product pages are Enertik Chile listings checked 2026-10-20. All prices include IVA;
 * supplier may revise pricing, variants and availability without notice.
 * Voltages are nominal battery-bank classes; 51.2V LiFePO4 is used with 48V class.
 */
export type VoltronicTier = '3'|'5'|'6.2'|'8'
export interface SupplierPrice { grossClp:number; taxIncluded:true; observedOn:'2026-10-20'; sourceUrl:string }
export interface InverterPreset {
  id:VoltronicTier
  provider:'Enertik Chile'
  manufacturer:'Voltronic Power'
  model:string
  sku:string
  acRatedW:number
  dcBatteryClassV:24|48
  gridExport:'supplier-claims-unverified'|'not-established'
  maximumBatteryOnlyAcW:number|null
  price:SupplierPrice
}
export interface BatteryPreset {
  id:'taiyo-25.6-100'|'taiyo-51.2-100'
  provider:'Enertik Chile'
  manufacturer:'Taiyo / Enertik'
  model:string
  sku:string
  nominalV:25.6|51.2
  ah:100
  nominalKwh:number
  maxContinuousDischargeA:100
  maxParallelUnits:number
  bms:'integrated'
  protocolStatus:'vendor-claims-family-compatibility-needs-model-test'
  price:SupplierPrice
}
const listed=(grossClp:number,sourceUrl:string):SupplierPrice=>({grossClp,taxIncluded:true,observedOn:'2026-10-20',sourceUrl})

export const ENERTIK_VOLTRONIC:readonly InverterPreset[]=[
 {id:'3',provider:'Enertik Chile',manufacturer:'Voltronic Power',
 model:'Axpert VM II Premium+ Hybrid 3K 24V',sku:'Axpert VM II Premium+ 3K 24V',
 acRatedW:3000,dcBatteryClassV:24,gridExport:'supplier-claims-unverified',maximumBatteryOnlyAcW:3000,
 price:listed(371200,'https://enertik.com/cl/tienda/inversores/inversores-cargadores/con-regulador-solar-mppt/inversor-cargador-mppt-hibrido-backup-24v-220v-3000w-voltronic-axpert-vm-ii-premium-hybrid-3k-24v/')},
 {id:'5',provider:'Enertik Chile',manufacturer:'Voltronic Power',
 model:'Axpert VM II Premium 5K 48V (MPPT respaldo)',sku:'IVMDP-5K-48',
 acRatedW:5000,dcBatteryClassV:48,gridExport:'not-established',maximumBatteryOnlyAcW:null,
 price:listed(417200,'https://enertik.com/cl/tienda/inversores/inversores-cargadores/con-regulador-solar-mppt/inversor-y-cargador-de-baterias-mppt-48v-220v-5000w-premium/')},
 {id:'6.2',provider:'Enertik Chile',manufacturer:'Voltronic Power',
 model:'Axpert VM II Premium+ Hybrid 6.2K 48V',sku:'Axpert VM II Premium+ 6.2K 48V',
 acRatedW:6200,dcBatteryClassV:48,gridExport:'supplier-claims-unverified',maximumBatteryOnlyAcW:5000,
 price:listed(507100,'https://enertik.com/cl/tienda/inversores/inversores-cargadores/con-regulador-solar-mppt/inversor-cargador-mppt-hibrido-backup-48v-220v-6200w-2-salidas-voltronic-axpert-vm-ii-premium-hybrid-62k-48v/')},
 {id:'8',provider:'Enertik Chile',manufacturer:'Voltronic Power',
 model:'Axpert VM II Premium+ Hybrid 8K 48V',sku:'Axpert VM II Premium+ 8K 48V',
 acRatedW:8000,dcBatteryClassV:48,gridExport:'supplier-claims-unverified',maximumBatteryOnlyAcW:8000,
 price:listed(762400,'https://enertik.com/cl/tienda/inversores/inversores-cargadores/con-regulador-solar-mppt/inversor-cargador-mppt-hibrido-backup-48v-220v-8000w-voltronic-axpert-vm-ii-premium-hybrid-8k-48v/')},
]
export const ENERTIK_BATTERIES:readonly BatteryPreset[]=[
 {id:'taiyo-25.6-100',provider:'Enertik Chile',manufacturer:'Taiyo / Enertik',
 model:'LiFePO4 EBL25.6-100',sku:'EBL25.6-100',nominalV:25.6,ah:100,nominalKwh:2.56,
 maxContinuousDischargeA:100,maxParallelUnits:4,bms:'integrated',
 protocolStatus:'vendor-claims-family-compatibility-needs-model-test',
 price:listed(491700,'https://enertik.com/cl/tienda/baterias/litio/bateria-de-litio-taiyo-256v-100ah/')},
 {id:'taiyo-51.2-100',provider:'Enertik Chile',manufacturer:'Taiyo / Enertik',
 model:'LiFePO4 EBL-R51.2-100-L',sku:'EBL-R51.2-100',
 nominalV:51.2,ah:100,nominalKwh:5.12,maxContinuousDischargeA:100,
 maxParallelUnits:15,bms:'integrated',
 protocolStatus:'vendor-claims-family-compatibility-needs-model-test',
 price:listed(920500,'https://enertik.com/cl/tienda/baterias/litio/bateria-de-litio-taiyo-512v-100ah-5120wh/')},
]
export const RECOMMENDED_BANK_UNITS:Record<VoltronicTier,number>={'3':2,'5':2,'6.2':2,'8':3}
export interface SupplierConfiguration {
 provider:string
 inverterModel:string
 batteryModel:string
 inverterGrossClp:number
 batteryGrossClp:number
 batteryUnits:number
 batteryNominalKwh:number
 batteryNominalV:number
 batteryMaxDischargeA:number
 bankMaxParallelUnits:number
}
export function presetByTier(tier:VoltronicTier):{inverter:InverterPreset;battery:BatteryPreset;configuration:SupplierConfiguration}{
 const inverter=ENERTIK_VOLTRONIC.find(p=>p.id===tier)
 if(!inverter)throw Error('Potencia de referencia no encontrada')
 const battery=ENERTIK_BATTERIES.find(b=>inverter.dcBatteryClassV===24?b.nominalV===25.6:b.nominalV===51.2)
 if(!battery)throw Error('No existe bateria de referencia para el banco nominal')
 return {inverter,battery,configuration:{
   provider:inverter.provider,inverterModel:inverter.model,batteryModel:battery.model,
   inverterGrossClp:inverter.price.grossClp,batteryGrossClp:battery.price.grossClp,
   batteryUnits:RECOMMENDED_BANK_UNITS[tier],batteryNominalKwh:battery.nominalKwh,
   batteryNominalV:battery.nominalV,batteryMaxDischargeA:battery.maxContinuousDischargeA,
   bankMaxParallelUnits:battery.maxParallelUnits,
 }}
}
/** Gross price to net reference, rounded in whole Chilean pesos. */
export function netFromGross(gross:number,ivaPct=19):number{
 if(!Number.isFinite(gross)||gross<0||gross>1e11||!Number.isFinite(ivaPct)||ivaPct<0||ivaPct>100)
   throw RangeError('Precio o impuesto inválido')
 return Math.round(gross/(1+ivaPct/100))
}
/** Conservative illustrative DC screening; requires battery voltage-under-load and BMS validation. */
export function screenBatteryPower(config:SupplierConfiguration,inverter:InverterPreset){
 const problems:string[]=[]
 if(config.batteryNominalV!==25.6&&config.batteryNominalV!==51.2)problems.push('Tensión del banco sin validar')
 if(inverter.dcBatteryClassV===24&&config.batteryNominalV!==25.6)problems.push('Tensión de banco distinta a clase 24V')
 if(inverter.dcBatteryClassV===48&&config.batteryNominalV!==51.2)problems.push('Tensión de banco distinta a clase 48V')
 if(!Number.isInteger(config.batteryUnits)||config.batteryUnits<0||config.batteryUnits>config.bankMaxParallelUnits)
   problems.push('Cantidad fuera del límite publicado de baterías en paralelo')
 const assumedEfficiency=0.9
 const currentRequiredA=inverter.acRatedW/(config.batteryNominalV*assumedEfficiency)
 const availableA=config.batteryUnits*config.batteryMaxDischargeA
 if(!Number.isFinite(currentRequiredA)||!Number.isFinite(availableA))problems.push('Datos eléctricos insuficientes')
 else if(availableA<currentRequiredA)problems.push('Banco insuficiente para potencia CA nominal bajo supuestos de cálculo')
 if(inverter.gridExport==='not-established')problems.push('Inyección a red no acreditada para esta variante')
 return {status:problems.length?'review-required' as const:'preliminary-current-ok' as const,
   nominalBankKwh:config.batteryUnits*config.batteryNominalKwh,
   currentRequiredA,availableA,problems,
   disclaimer:'Solo cribado nominal a 90% de eficiencia supuesta; falta verificar corriente a tensión mínima, BMS, carga, protocolo, autonomía y SEC.'}
}
