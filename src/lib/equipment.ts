/**
 * SQ-04B — traceable technical module references. The reference list is not
 * inventory, pricing, compatibility approval or Chilean SEC authorization.
 */
export type ModuleId = 'generic-550'|'trina-neg9r28-450'
export interface ModuleReference {
  id:ModuleId
  manufacturer:string
  model:string
  powerWp:number
  /** Area used for simplified module packing; includes heuristic allowance. */
  budgetAreaM2:number
  dimensionsMm:{length:number;width:number}|null
  vocStcV:number|null
  vmppStcV:number|null
  iscStcA:number|null
  imppStcA:number|null
  vocTempPctPerC:number|null
  datasheetUrl:string|null
  sourceEdition:string|null
  secApproval:'unverified'
  priceStatus:'not-verified'
}

export const MODULE_REFERENCES:readonly ModuleReference[]=[
  {
    id:'generic-550',manufacturer:'Genérico',model:'Referencia 550 Wp (sin ficha)',
    powerWp:550,budgetAreaM2:2.6,dimensionsMm:null,
    vocStcV:null,vmppStcV:null,iscStcA:null,imppStcA:null,
    vocTempPctPerC:null,datasheetUrl:null,sourceEdition:null,
    secApproval:'unverified',priceStatus:'not-verified',
  },
  {
    id:'trina-neg9r28-450',manufacturer:'Trina Solar',model:'Vertex S+ TSM-450 NEG9R.28',
    powerWp:450,
    // Measured outline 1.762m x 1.134m; 10% allowance only a packing heuristic.
    budgetAreaM2:1.762*1.134*1.10,
    dimensionsMm:{length:1762,width:1134},
    vocStcV:52.9,vmppStcV:44.6,iscStcA:10.74,imppStcA:10.09,
    vocTempPctPerC:-0.24,
    datasheetUrl:'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S%2B_NEG9R.28_ESP_2024_C_web.pdf',
    sourceEdition:'TSM_ESP_2024_C',
    secApproval:'unverified',priceStatus:'not-verified',
  },
]
export const defaultModule=MODULE_REFERENCES[0]
export function moduleById(id:ModuleId):ModuleReference {
  return MODULE_REFERENCES.find(x=>x.id===id)??defaultModule
}

/** Manufacturer example, NOT certified for a Chilean grid connection here. */
export const INVERTER_REFERENCE={
  manufacturer:'GoodWe',
  model:'GW5000-DNS-30',
  nominalAcWatts:5000,
  maxDcVolts:600,
  maxInputCurrentPerMpptA:16,
  mpptCount:2,
  sourceUrl:'https://us.goodwe.com/dns-g3',
  secApproval:'unverified' as const,
  afciChile:'unverified' as const,
}

/**
 * One-string STC/cold voltage screening, for explanation only.
 * Cannot verify MPPT voltage min/max, system derating, max Isc, AFCI, SEC,
 * current manufacturer variant, roof setbacks, equipment matching, or approval.
 */
export function preliminaryDcScreen(module:ModuleReference,quantity:number,coldCellDegC=-10) {
  if(!Number.isInteger(quantity)||quantity<0||quantity>100000||!Number.isFinite(coldCellDegC)||
     coldCellDegC < -40 || coldCellDegC > 25)throw RangeError('Parámetros eléctricos inválidos')
  if(module.vocStcV===null||module.vocTempPctPerC===null||module.iscStcA===null)
    return {status:'insufficient-data' as const,maxSeriesModules:null,
      estimatedColdVocV:null,currentFlag:null,stringsNeeded:null}
  const coldVoc=module.vocStcV*(1+(module.vocTempPctPerC/100)*(coldCellDegC-25))
  const maxSeriesModules=Math.max(0,Math.floor(INVERTER_REFERENCE.maxDcVolts/coldVoc))
  const currentFlag=module.iscStcA>INVERTER_REFERENCE.maxInputCurrentPerMpptA
  // Planning suggestion only, NOT completed string sizing.
  const stringsNeeded=maxSeriesModules>0?Math.ceil(quantity/maxSeriesModules):null
  return {status:'review-required' as const,maxSeriesModules,
    estimatedColdVocV:coldVoc,currentFlag,stringsNeeded}
}
