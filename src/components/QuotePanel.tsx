import {useMemo,useState} from 'react'
import {Download,FileText,Info,PackageSearch,ShieldAlert,SlidersHorizontal} from 'lucide-react'
import {calculateQuote,type PriceKey,type PriceOverrides} from '../lib/quote'
import type {SystemType} from '../lib/solar'
import {EnertikPresetPanel} from './EnertikPresetPanel'
import {presetByTier,type SupplierConfiguration,type VoltronicTier} from '../lib/enertik-presets'

interface Props {
  systemType:SystemType
  moduleCount:number
  modulePowerWp:number
  moduleReference:string
  estimatedBatteryKwh:number|null
  monthlyConsumptionKwh:number
  annualGenerationKwh:number
  generationSource:'manual'|'pvgis'
  locationLabel?:string
}
const currency=(n:number)=>new Intl.NumberFormat('es-CL',{
  style:'currency',currency:'CLP',maximumFractionDigits:0,
}).format(n)
const measure=(n:number)=>new Intl.NumberFormat('es-CL',{
  maximumFractionDigits:2,
}).format(n)
const controlled=(v:string,max:number)=>Math.min(max,Math.max(0,Number(v)||0))

export function QuotePanel(props:Props){
  const [overrides,setOverrides]=useState<PriceOverrides>({})
  const [marginPct,setMarginPct]=useState(10)
  const [vatPct,setVatPct]=useState(19)
  const [batteryOverride,setBatteryOverride]=useState<number|null>(null)
  const [downloadError,setDownloadError]=useState('')
  const [supplierEnabled,setSupplierEnabled]=useState(true)
  const [tier,setTier]=useState<VoltronicTier>(()=> {
    const kwp=props.moduleCount*props.modulePowerWp/1000
    return kwp<=3?'3':kwp<=5?'5':kwp<=6.2?'6.2':'8'
  })
  const [equipment,setEquipment]=useState<SupplierConfiguration>(()=>presetByTier(tier).configuration)
  const usingSupplier=supplierEnabled&&props.systemType!=='on-grid'
  function selectTier(next:VoltronicTier) {
    setTier(next)
    setEquipment(presetByTier(next).configuration)
    setOverrides(previous=>{
      const updated={...previous}
      delete updated.inverterHybrid
      delete updated.inverterOffgrid
      delete updated.battery5kwh
      return updated
    })
  }
  function editEquipment(updated:SupplierConfiguration) {
    if(equipment.inverterGrossClp!==updated.inverterGrossClp||equipment.inverterModel!==updated.inverterModel||
      equipment.batteryGrossClp!==updated.batteryGrossClp||equipment.batteryModel!==updated.batteryModel){
      setOverrides(previous=>{
        const next={...previous};delete next.inverterHybrid;delete next.inverterOffgrid;delete next.battery5kwh;return next
      })
    }
    setEquipment(updated)
  }
  const batteryTarget=props.systemType==='on-grid'?0:
    (batteryOverride??Math.ceil((props.estimatedBatteryKwh??0)*10)/10)
  const budget=useMemo(()=>calculateQuote({
    systemType:props.systemType,moduleCount:props.moduleCount,
    modulePowerWp:props.modulePowerWp,batteryTargetKwh:batteryTarget,
    marginPct,vatPct,overrides,supplierEquipment:usingSupplier?equipment:undefined,
    supplierSourceUnmodified:usingSupplier && equipment.provider===presetByTier(tier).configuration.provider &&
      equipment.inverterModel===presetByTier(tier).configuration.inverterModel &&
      equipment.batteryModel===presetByTier(tier).configuration.batteryModel &&
      equipment.inverterGrossClp===presetByTier(tier).configuration.inverterGrossClp &&
      equipment.batteryGrossClp===presetByTier(tier).configuration.batteryGrossClp,
  }),[props.systemType,props.moduleCount,props.modulePowerWp,batteryTarget,marginPct,vatPct,overrides,usingSupplier,equipment,tier])

  async function download() {
    setDownloadError('')
    try {
      // Import only after the user requests a PDF, keeping the initial JS lightweight.
      const module=await import('../lib/quote-pdf')
      module.downloadQuotePdf(budget,{
        monthlyConsumptionKwh:props.monthlyConsumptionKwh,
        annualGenerationKwh:props.annualGenerationKwh,
        generationSource:props.generationSource,
        locationLabel:props.locationLabel,
        moduleReference:props.moduleReference,
        supplierReference:usingSupplier?equipment.provider+' · referencia 20/10/2026':undefined,
      })
    } catch {
      setDownloadError('No se pudo generar el archivo PDF. Revisa el navegador y vuelve a intentarlo.')
    }
  }
  // Fully client-side and non-persistent; prices are purposefully invented fixtures.
  function changePrice(key:PriceKey,raw:string) {
    setOverrides(before=>({...before,[key]:controlled(raw,10000000000)}))
  }

  return <section className="sq-quote-panel" aria-label="Presupuesto demostrativo de sistema solar">
    <div className="sq-quote-head">
      <div><span className="overline">ORBI SQ-04 · CATÁLOGO Y PRESUPUESTO</span>
        <h4>¿Qué incluiría tu instalación?</h4>
        <p>Personaliza materiales, montaje y servicios para obtener un presupuesto preliminar descargable.</p>
      </div>
      <div className="sq-quote-icon"><PackageSearch size={26}/></div>
    </div>
    <div className="sq-quote-warning" role="note">
      <ShieldAlert size={22}/>
      <div><strong>SIMULACIÓN — NO CONSTITUYE OFERTA COMERCIAL</strong>
        <p>{usingSupplier?'Inversores y baterías parten de valores publicados en Enertik el 20/10/2026 (con IVA) convertidos a netos editables. Los paneles, materiales y servicios siguen usando precios FICTICIOS.':'Todos los importes son ficticios mientras no actives el catálogo inicial Enertik.'} No confirma stock, compatibilidad BMS, AFCI ni autorización SEC. El módulo {props.moduleReference} aún no tiene precio de proveedor validado.</p>
      </div>
    </div>
    {props.systemType==='on-grid'
      ? <p className="enertik-on-grid-note">Los equipos Voltronic con baterías se ofrecen para los escenarios híbrido y aislado. No se incorporan automáticamente en on-grid sin baterías.</p>
      : <>
        <label className="enertik-switch"><input type="checkbox" checked={supplierEnabled} onChange={e=>setSupplierEnabled(e.target.checked)}/>
          Usar precios Enertik como referencia editable para inversor y batería
        </label>
        {supplierEnabled&&<EnertikPresetPanel tier={tier} configuration={equipment}
          onTierChange={selectTier} onChange={editEquipment}/>}
      </>}
    <div className="sq-quote-config">
      <div className="sq-quote-grid">
        <div><span>Potencia fotovoltaica</span><strong>{measure(budget.systemKwp)} kWp</strong><small>{props.moduleCount} módulos de {props.modulePowerWp} Wp</small></div>
        <div><span>Batería incluida</span><strong>{measure(budget.installedBatteryNominalKwh)} kWh</strong><small>{props.systemType==='on-grid'?'Sin almacenamiento':usingSupplier?'Banco de baterías del perfil escogido':'Bloques genéricos de 5 kWh'}</small></div>
        <div><span>Configuración</span><strong>{props.systemType==='on-grid'?'On-grid':props.systemType==='hybrid'?'Híbrido':'Off-grid'}</strong><small>Inversor pendiente de selección técnica</small></div>
      </div>
      {props.systemType!=='on-grid'&&!usingSupplier&&<label className="sq-quote-field">Capacidad nominal deseada de batería
        <span className="sq-quote-input">
          <input aria-label="Capacidad deseada de batería kWh" type="number" min={0} max={10000} step={0.5}
            value={batteryTarget} onChange={e=>setBatteryOverride(controlled(e.target.value,10000))}/>
          <span>kWh</span>
        </span>
        <small>Redondeamos hacia arriba en bloques de 5 kWh, sin validar compatibilidad.</small>
      </label>}
    </div>
    <div className="sq-quote-subtitle"><SlidersHorizontal size={17}/>
      <strong>Precios unitarios netos editables (CLP) · {usingSupplier?'Enertik para inversor/batería, resto demo':'todo demo'}</strong>
    </div>
    <div className="sq-quote-table-wrap">
      <table className="sq-quote-table">
        <thead><tr><th>Elemento genérico</th><th>Cantidad</th><th>Precio unitario neto</th><th>Subtotal neto</th></tr></thead>
        <tbody>{budget.lines.map(line=><tr key={line.id}>
          <td><strong>{line.label}</strong><small>{line.unit} · {line.priceOrigin==='enertik-snapshot'?'valor publicado Enertik 20/10/2026':line.priceOrigin==='edited'?'precio editado':'precio ficticio'}</small></td>
          <td>{measure(line.quantity)}</td>
          <td><label className="sq-quote-price"><span>$</span>
            <input aria-label={'Precio unitario neto '+line.label} type="number" min={0} max={10000000000} step={1000}
              value={line.unitNetClp} onChange={e=>changePrice(line.id,e.target.value)}/>
          </label></td>
          <td>{currency(line.totalNetClp)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {budget.lines.length===0&&<p className="sq-quote-empty">No se han calculado módulos. Modifica el área o los parámetros FV antes de presupuestar.</p>}
    <div className="sq-quote-financial">
      <div className="sq-quote-parameters">
        <label className="sq-quote-field">Margen comercial de demostración
          <span className="sq-quote-input"><input type="number" aria-label="Margen porcentaje" value={marginPct}
            min={0} max={100} step={1} onChange={e=>setMarginPct(controlled(e.target.value,100))}/><span>%</span></span>
        </label>
        <label className="sq-quote-field">IVA de referencia (editable)
          <span className="sq-quote-input"><input type="number" aria-label="IVA porcentaje" value={vatPct}
            min={0} max={100} step={1} onChange={e=>setVatPct(controlled(e.target.value,100))}/><span>%</span></span>
        </label>
      </div>
      <div className="sq-quote-totals">
        <div><span>Subtotal neto</span><strong>{currency(budget.directNetClp)}</strong></div>
        <div><span>Margen ({measure(budget.marginPct)}%)</span><strong>{currency(budget.marginClp)}</strong></div>
        <div><span>Neto con margen</span><strong>{currency(budget.netWithMarginClp)}</strong></div>
        <div><span>IVA ({measure(budget.vatPct)}%)</span><strong>{currency(budget.vatClp)}</strong></div>
        <div className="sq-quote-grand"><span>Total preliminar con IVA</span><strong>{currency(budget.grandTotalClp)}</strong></div>
        {budget.costClpPerWp!==null&&<small>Referencia ficticia: {currency(budget.costClpPerWp)} / Wp instalado.</small>}
      </div>
    </div>
    <div className="sq-quote-footer">
      <div className="sq-quote-caveats"><Info size={18}/>
        <p>El kWp de módulos no es la potencia del inversor (kW). Falta dimensionar strings, circuitos, protecciones, compatibilidad BMS, corriente mínima de batería, autonomía, SEC y AFCI. Los precios publicados pueden variar y no constituyen una cotización del proveedor.</p></div>
      <button type="button" className="sq-quote-pdf" onClick={download} disabled={budget.lines.length===0}>
        <Download size={18}/> Descargar PDF de demostración <FileText size={18}/>
      </button>
      {downloadError&&<p role="alert" className="sq-quote-error">{downloadError}</p>}
      <small>Archivo generado localmente en tu navegador. No se crea una cuenta ni se guardan precios o datos del usuario en nuestra base de datos.</small>
    </div>
  </section>
}
