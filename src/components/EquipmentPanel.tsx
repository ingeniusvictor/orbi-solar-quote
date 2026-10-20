import {FileCheck2,Info,ShieldAlert,ExternalLink,AlertTriangle} from 'lucide-react'
import {MODULE_REFERENCES,moduleById,preliminaryDcScreen,INVERTER_REFERENCE,type ModuleId} from '../lib/equipment'
import type {SystemType} from '../lib/solar'

interface Props {
  moduleId:ModuleId
  onModuleChange:(id:ModuleId)=>void
  moduleCount:number
  systemType:SystemType
}
const fmt=(n:number,digits=1)=>n.toLocaleString('es-CL',{maximumFractionDigits:digits})

/** Data sheets are sources, not proof of Chilean electrical approval. */
export function EquipmentPanel({moduleId,onModuleChange,moduleCount,systemType}:Props) {
  const selected=moduleById(moduleId)
  const dc=preliminaryDcScreen(selected,moduleCount)
  return <section className="sq-equipment-panel" aria-label="Selección de referencia de módulo">
    <div className="sq-equipment-head">
      <FileCheck2 size={21}/>
      <div><strong>Referencia técnica del módulo FV</strong>
        <span>Catálogo de fichas, separado de los precios DEMO</span></div>
    </div>
    <div className="sq-equipment-options">
      {MODULE_REFERENCES.map(m=><label key={m.id} className={'sq-equipment-option '+(moduleId===m.id?'active':'')}>
        <input type="radio" name="module-ref" aria-label={m.model}
          checked={moduleId===m.id} onChange={()=>onModuleChange(m.id)}/>
        <span><strong>{m.model}</strong>
          <small>{m.powerWp} Wp · {m.datasheetUrl?'Datos de fabricante':'Referencia sin ficha validada'}</small></span>
      </label>)}
    </div>
    <div className="sq-equipment-facts">
      <div><span>Potencia por panel</span><b>{fmt(selected.powerWp,0)} Wp</b></div>
      <div><span>Superficie de cálculo</span><b>{fmt(selected.budgetAreaM2,2)} m²</b></div>
      <div><span>Voc STC</span><b>{selected.vocStcV===null?'Sin datos':fmt(selected.vocStcV)+' V'}</b></div>
      <div><span>Isc STC</span><b>{selected.iscStcA===null?'Sin datos':fmt(selected.iscStcA,2)+' A'}</b></div>
    </div>
    {selected.datasheetUrl&&<p className="sq-equipment-source"><ExternalLink size={15}/>
      <a href={selected.datasheetUrl} target="_blank" rel="noreferrer">Ficha oficial del fabricante · {selected.sourceEdition}</a>
    </p>}
    {systemType==='on-grid' && selected.vocStcV!==null && <div className="sq-equipment-screen">
      <strong>Comparación eléctrica preliminar (NO certificación)</strong>
      <p>Referencia de inversor: {INVERTER_REFERENCE.manufacturer} {INVERTER_REFERENCE.model} ·
      tensión CC máxima {INVERTER_REFERENCE.maxDcVolts} V ·
      corriente por MPPT {INVERTER_REFERENCE.maxInputCurrentPerMpptA} A. <a href={INVERTER_REFERENCE.sourceUrl} target="_blank" rel="noreferrer">Ficha oficial <ExternalLink size={12}/></a></p>
      <p>Voc del módulo estimada a −10 °C de temperatura de célula: {fmt(dc.estimatedColdVocV??0,2)} V;
      límite aritmético de módulos en serie antes de 600 V: <b>{dc.maxSeriesModules}</b>.
      {dc.currentFlag ? ' ALERTA: corriente de cortocircuito superior al dato indicado.' : ''}
      </p>
      <p><AlertTriangle size={15}/> FALTAN rango MPPT, Isc admisible, strings, potencia máxima PV, coeficientes de diseño, temperatura local, función AFCI, perfil de red y autorización SEC. No asumir compatibilidad ni selección del inversor.</p>
    </div>}
    <div className="sq-equipment-warning"><ShieldAlert size={18}/><p>
      <b>SEC: autorización NO verificada.</b> Debes consultar el registro oficial del modelo exacto.
      Para TE4 nuevas desde el 01-01-2026 aplican requisitos AFCI o la vía de proyecto especial con protección externa autorizada.
      Consulta <a href="https://www.sec.cl/gda/equipamiento-autorizado/" target="_blank" rel="noreferrer">equipos SEC <ExternalLink size={12}/></a>
      {' '}y <a href="https://www.sec.cl/gda/marco-regulatorio/" target="_blank" rel="noreferrer">normativa AFCI <ExternalLink size={12}/></a>.
    </p></div>
    <p className="sq-equipment-tip"><Info size={15}/> Seleccionar un módulo con ficha cambia potencia y área del dimensionamiento, pero no confirma existencias ni costo comercial. Se añade 10% de holgura geométrica orientativa sobre el módulo real; no reemplaza un plano de cubierta.</p>
  </section>
}
