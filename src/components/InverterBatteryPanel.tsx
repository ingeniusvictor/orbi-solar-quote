import {AlertTriangle,ExternalLink,ShieldAlert,BatteryCharging,Cpu,Info} from 'lucide-react'
import {
  INVERTERS,BATTERIES,inverterById,batteryById,reviewEquipment,
  type InverterId,type BatteryId,
} from '../lib/equipment-catalog'
import {moduleById,type ModuleId} from '../lib/equipment'
import type {SystemType} from '../lib/solar'

interface Props {
  inverterId:InverterId
  batteryId:BatteryId
  moduleId:ModuleId
  moduleCount:number
  systemType:SystemType
  onInverterChange:(id:InverterId)=>void
  onBatteryChange:(id:BatteryId)=>void
}
const fmt=(x:number)=>x.toLocaleString('es-CL',{maximumFractionDigits:2})

export function InverterBatteryPanel(props:Props) {
  const inv=inverterById(props.inverterId)
  const batt=batteryById(props.batteryId)
  const findings=reviewEquipment(
    moduleById(props.moduleId),props.moduleCount,props.systemType,inv,batt,
  )
  const status=findings.status==='blocked'?'REVISIÓN CRÍTICA / NO APTO EN ESTA CONFIGURACIÓN'
    :findings.status==='insufficient-data'?'INFORMACIÓN INSUFICIENTE':'REQUIERE REVISIÓN TÉCNICA'
  return <section className="sq-catalog-panel" aria-label="Catálogo de inversores y baterías">
    <div className="sq-equipment-head"><Cpu size={21}/>
      <div><strong>Inversores y baterías · fichas de fabricante</strong>
      <span>Referencias técnicas, no equipos presupuestados ni autorizaciones SEC</span></div>
    </div>
    <div className="sq-catalog-inputs">
      <label>Inversor para comparación
        <select aria-label="Inversor para comparación" value={props.inverterId}
          onChange={e=>props.onInverterChange(e.target.value as InverterId)}>
          {INVERTERS.map(x=><option key={x.id} value={x.id}>{x.id==='none'?'Sin seleccionar':x.manufacturer+' '+x.model}</option>)}
        </select>
      </label>
      <label>Batería para comparación
        <select aria-label="Batería para comparación" value={props.batteryId}
          onChange={e=>props.onBatteryChange(e.target.value as BatteryId)}>
          {BATTERIES.map(x=><option key={x.id} value={x.id}>{x.id==='none'?'Sin seleccionar':x.manufacturer+' '+x.model}</option>)}
        </select>
      </label>
    </div>
    <div className="sq-catalog-facts">
      <div><Cpu size={16}/><strong>{inv.id==='none'?'Inversor no seleccionado':inv.model}</strong>
        <span>{inv.nominalAcW===null?'Sin potencia nominal':fmt(inv.nominalAcW/1000)+' kW CA'}
          {' · '}PV máx. {inv.maxPvVoltageV??'–'} V
          {' · '}MPPT {inv.mpptCount??'–'}</span>
        {inv.datasheetUrl&&<a href={inv.datasheetUrl} target="_blank" rel="noreferrer">Ficha del fabricante <ExternalLink size={12}/></a>}
        <small>SEC: sin verificar · AFCI para Chile: sin verificar</small>
      </div>
      <div><BatteryCharging size={16}/><strong>{batt.id==='none'?'Batería no seleccionada':batt.model}</strong>
        <span>{batt.usableDcKwh===null?'Sin capacidad de batería':fmt(batt.usableDcKwh)+' kWh útiles CC'}
          {' · '}rango {batt.voltageMinV??'–'}–{batt.voltageMaxV??'–'} V</span>
        {batt.datasheetUrl&&<a href={batt.datasheetUrl} target="_blank" rel="noreferrer">Ficha del fabricante <ExternalLink size={12}/></a>}
        <small>BMS y lista de inversores compatibles: sin verificar</small>
      </div>
    </div>
    <div className={'sq-catalog-status '+(findings.status==='blocked'?'is-blocked':'')}>
      <AlertTriangle size={18}/><div><strong>{status}</strong>
        {findings.coldVocPerModuleV!==null&&
          <p>Voc a −10 °C de célula: {fmt(findings.coldVocPerModuleV)} V por módulo.
          Límite matemático por máxima tensión CC (NO string recomendado): {findings.maxSeriesByColdVoc} módulos.</p>}
        {findings.voltageFinding==='voltage-overlap-only'&&
          <p>Los rangos de tensión de batería e inversor coinciden, pero eso NO acredita compatibilidad.</p>}
        {findings.voltageFinding==='partial-voltage-range'&&
          <p>Advertencia: parte del rango operativo de la batería queda fuera del rango del inversor.</p>}
        {findings.voltageFinding==='no-battery-port'&&
          <p>El inversor seleccionado no cuenta con interfaz de batería en esta referencia.</p>}
        {findings.notices.map((n,i)=><p key={i}>{n}</p>)}
      </div>
    </div>
    <div className="sq-catalog-disclaimer"><ShieldAlert size={17}/>
      <p><strong>No usar esta pantalla para autorizar instalaciones.</strong> Antes de seleccionar equipos,
      verificar modelo y firmware exactos en listas OEM, BMS, protecciones, strings y documentación SEC.
      Para TE4 nuevas desde 2026 aplican requisitos AFCI conforme a la normativa vigente.
      Consulta <a href="https://www.sec.cl/gda/equipamiento-autorizado/" target="_blank" rel="noreferrer">registro SEC <ExternalLink size={12}/></a> y
      {' '}<a href="https://www.sec.cl/almacenamiento-de-energia-a-traves-de-baterias-bess/" target="_blank" rel="noreferrer">RGR 06/2024 BESS <ExternalLink size={12}/></a>.
      </p></div>
    <p className="sq-catalog-tip"><Info size={15}/> Este selector no modifica todavía los costos genéricos ni la capacidad de batería del simulador. Toda referencia seleccionada permanece NO COTIZADA.</p>
  </section>
}
