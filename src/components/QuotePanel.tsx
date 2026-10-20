import {useMemo,useState} from 'react'
import {Download,FileText,Info,PackageSearch,ShieldAlert,SlidersHorizontal} from 'lucide-react'
import {calculateQuote,type PriceKey,type PriceOverrides} from '../lib/quote'
import type {SystemType} from '../lib/solar'

interface Props {
  systemType:SystemType
  moduleCount:number
  modulePowerWp:number
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
  const batteryTarget=props.systemType==='on-grid'?0:
    (batteryOverride??Math.ceil((props.estimatedBatteryKwh??0)*10)/10)
  const budget=useMemo(()=>calculateQuote({
    systemType:props.systemType,moduleCount:props.moduleCount,
    modulePowerWp:props.modulePowerWp,batteryTargetKwh:batteryTarget,
    marginPct,vatPct,overrides,
  }),[props.systemType,props.moduleCount,props.modulePowerWp,batteryTarget,marginPct,vatPct,overrides])

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
      <div><strong>SIMULACIÓN — TODOS LOS PRECIOS SON FICTICIOS</strong>
        <p>Los valores predeterminados sirven solo para probar el cotizador. No son precios investigados, ofertas de proveedores ni recomendaciones de equipamiento. Edita cada valor neto antes de usar el cálculo como referencia interna.</p>
      </div>
    </div>
    <div className="sq-quote-config">
      <div className="sq-quote-grid">
        <div><span>Potencia fotovoltaica</span><strong>{measure(budget.systemKwp)} kWp</strong><small>{props.moduleCount} módulos de {props.modulePowerWp} Wp</small></div>
        <div><span>Batería incluida</span><strong>{measure(budget.installedBatteryNominalKwh)} kWh</strong><small>{props.systemType==='on-grid'?'Sin almacenamiento':'Bloques genéricos de 5 kWh'}</small></div>
        <div><span>Configuración</span><strong>{props.systemType==='on-grid'?'On-grid':props.systemType==='hybrid'?'Híbrido':'Off-grid'}</strong><small>Inversor pendiente de selección técnica</small></div>
      </div>
      {props.systemType!=='on-grid'&&<label className="sq-quote-field">Capacidad nominal deseada de batería
        <span className="sq-quote-input">
          <input aria-label="Capacidad deseada de batería kWh" type="number" min={0} max={10000} step={0.5}
            value={batteryTarget} onChange={e=>setBatteryOverride(controlled(e.target.value,10000))}/>
          <span>kWh</span>
        </span>
        <small>Redondeamos hacia arriba en bloques de 5 kWh, sin validar compatibilidad.</small>
      </label>}
    </div>
    <div className="sq-quote-subtitle"><SlidersHorizontal size={17}/>
      <strong>Precios unitarios netos editables (CLP)</strong>
    </div>
    <div className="sq-quote-table-wrap">
      <table className="sq-quote-table">
        <thead><tr><th>Elemento genérico</th><th>Cantidad</th><th>Precio unitario neto</th><th>Subtotal neto</th></tr></thead>
        <tbody>{budget.lines.map(line=><tr key={line.id}>
          <td><strong>{line.label}</strong><small>{line.unit}</small></td>
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
        <div className="sq-quote-grand"><span>Total ficticio con IVA</span><strong>{currency(budget.grandTotalClp)}</strong></div>
        {budget.costClpPerWp!==null&&<small>Referencia ficticia: {currency(budget.costClpPerWp)} / Wp instalado.</small>}
      </div>
    </div>
    <div className="sq-quote-footer">
      <div className="sq-quote-caveats"><Info size={18}/>
        <p>Las cantidades e inversores son aproximaciones. Se requiere seleccionar modelos reales, verificar potencia, stringing, estructuras, compatibilidad de baterías, protecciones, estudio del techo, normativas SEC y costos comprobados.</p></div>
      <button type="button" className="sq-quote-pdf" onClick={download} disabled={budget.lines.length===0}>
        <Download size={18}/> Descargar PDF de demostración <FileText size={18}/>
      </button>
      {downloadError&&<p role="alert" className="sq-quote-error">{downloadError}</p>}
      <small>Archivo generado localmente en tu navegador. No se crea una cuenta ni se guardan precios o datos del usuario en nuestra base de datos.</small>
    </div>
  </section>
}
