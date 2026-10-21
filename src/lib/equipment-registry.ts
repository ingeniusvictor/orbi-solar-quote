/** SQ-04C: validation gates; informational, not engineering sign-off. */
export type EvidenceState='unverified'|'manufacturer-datasheet'|'sec-verified'
export type EquipmentKind='module'|'inverter'|'battery'
export interface EquipmentRecord {
 id:string; kind:EquipmentKind; manufacturer:string; model:string
 evidence:EvidenceState; sourceUrl:string|null; sourceEdition:string|null
 secStatus:'unverified'|'authorized'|'not-authorized'
 afciStatus:'unverified'|'integrated'|'external-project'|'not-applicable'
 priceClpNet:number|null; priceObservedOn:string|null
 electrical:{maxDcV?:number;mpptMinV?:number;mpptMaxV?:number;maxInputCurrentA?:number;nominalAcW?:number;capacityKwh?:number}
}
export interface ScreeningResult {status:'insufficient-data'|'review-required';checks:{code:string;passed:boolean|null;detail:string}[]}
export const EQUIPMENT_REGISTRY:readonly EquipmentRecord[]=[
 {id:'goodwe-dns30-reference',kind:'inverter',manufacturer:'GoodWe',model:'GW5000-DNS-30',
 evidence:'manufacturer-datasheet',sourceUrl:'https://us.goodwe.com/dns-g3',sourceEdition:'US product family (regional verification pending)',
 secStatus:'unverified',afciStatus:'unverified',priceClpNet:null,priceObservedOn:null,
 electrical:{maxDcV:600,maxInputCurrentA:16,nominalAcW:5000}},
 {id:'battery-unassigned',kind:'battery',manufacturer:'Sin seleccionar',model:'Batería pendiente de ficha',
 evidence:'unverified',sourceUrl:null,sourceEdition:null,secStatus:'unverified',
 afciStatus:'not-applicable',priceClpNet:null,priceObservedOn:null,electrical:{}},
]
export function screenEquipment(record:EquipmentRecord):ScreeningResult{
 const checks=[
 {code:'SOURCE',passed:record.evidence==='unverified'?null:true,detail:'Ficha del modelo exacto y versión regional'},
 {code:'SEC',passed:record.secStatus==='unverified'?null:record.secStatus==='authorized',detail:'Registro SEC y variante exacta'},
 {code:'AFCI',passed:record.kind!=='inverter'?true:record.afciStatus==='unverified'?null:record.afciStatus==='integrated'||record.afciStatus==='external-project',detail:'AFCI y condiciones TE4 aplicables'},
 {code:'PRICE',passed:record.priceClpNet===null||!record.priceObservedOn?null:true,detail:'Precio proveedor y fecha documentados'},
 {code:'ELECTRICAL',passed:null,detail:'Ingeniería de strings, MPPT, corriente y protecciones pendiente'},
 ]
 return {status:checks.some(c=>c.passed===null||c.passed===false)?'insufficient-data':'review-required',checks}
}
