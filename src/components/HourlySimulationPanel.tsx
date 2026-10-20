import { useEffect, useMemo, useRef, useState } from 'react'
import { BatteryCharging, CircleAlert, Info, TrendingDown, Zap, CloudDownload, CheckCircle2 } from 'lucide-react'
import type { SolarResource } from '../lib/pvgis'
import { validPvgisHourly, type PvgisHourlySeries } from '../lib/hourly-series'
import type { SystemType } from '../lib/solar'
import { simulateHourly, simulatePvgisHourly, type DemandProfile } from '../lib/hourly'

interface Props {
  monthlyGenerationKwh: number[]
  monthlyConsumptionKwh: number
  systemType: SystemType
  defaultBatteryNominalKwh: number | null
  retailTariffClpKwh: number
  exportTariffClpKwh: number
  productionSource: 'pvgis' | 'manual'
  systemKwp: number
  solarResource: SolarResource | null
}

const clp = (n: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',currency:'CLP',maximumFractionDigits:0,
}).format(n)
const kwh = (n: number) => new Intl.NumberFormat('es-CL', {
  maximumFractionDigits:1,
}).format(n)

const loadModes: {value:DemandProfile;label:string;hint:string}[] = [
  {value:'balanced',label:'Distribuido',hint:'Consumo durante todo el día'},
  {value:'daytime',label:'Diurno',hint:'Mayor demanda entre 8 y 18 h'},
  {value:'evening',label:'Nocturno',hint:'Mayor demanda en las tardes/noches'},
]

export function HourlySimulationPanel(props: Props) {
  const [demandProfile,setDemandProfile] = useState<DemandProfile>('balanced')
  const [storageOverride,setStorageOverride] = useState<number|null>(null)
  const [chargeLimitKw,setChargeLimitKw] = useState(3)
  const [dischargeLimitKw,setDischargeLimitKw] = useState(3)
  const [requested,setRequested] = useState<{key:string;series:PvgisHourlySeries}|null>(null)
  const [isLoading,setIsLoading] = useState(false)
  const [providerError,setProviderError] = useState('')
  const inflight = useRef<AbortController|null>(null)
  const requestKey = props.solarResource
    ? [props.solarResource.latitude,props.solarResource.longitude,props.solarResource.tiltDeg,
       props.solarResource.aspectDeg,props.solarResource.lossesPct].join('|') : 'manual'
  const live = requested?.key === requestKey ? requested.series : null

  useEffect(() => {
    inflight.current?.abort()
    inflight.current = null
    setIsLoading(false)
    setProviderError('')
    return () => { inflight.current?.abort() }
  }, [requestKey])

  async function requestHourly() {
    const current = props.solarResource
    if (!current || isLoading) return
    inflight.current?.abort()
    const controller = new AbortController()
    inflight.current = controller
    setIsLoading(true)
    setProviderError('')
    try {
      const orientations: Record<string,string> = {
        '180':'N','-135':'NE','135':'NW','-90':'E','90':'W','0':'S',
      }
      const orientation = orientations[String(current.aspectDeg)]
      if (!orientation) throw Error('Orientación PVGIS no admitida.')
      const params = new URLSearchParams({
        latitude:String(current.latitude),longitude:String(current.longitude),
        tiltDeg:String(current.tiltDeg),lossesPct:String(current.lossesPct),orientation,
      })
      const response = await fetch('/api/solar-hourly?'+params, {signal:controller.signal})
      const body: {series?:unknown;error?:string} = await response.json()
      if (!response.ok || !validPvgisHourly(body.series)) {
        throw Error(body.error ?? 'El proveedor no entregó una serie completa de 8.760 horas.')
      }
      if (controller.signal.aborted) return
      setRequested({key:requestKey,series:body.series})
    } catch (err) {
      if (controller.signal.aborted) return
      setProviderError(err instanceof Error ? err.message : 'Consulta horaria fallida.')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
      if (inflight.current === controller) inflight.current = null
    }
  }

  const storageKwh = props.systemType === 'on-grid'
    ? 0
    : (storageOverride ?? Math.round((props.defaultBatteryNominalKwh ?? 0)*10)/10)

  const report = useMemo(() => {
    const scenario = {
    monthlyGenerationKwh: props.monthlyGenerationKwh,
    monthlyConsumptionKwh: props.monthlyConsumptionKwh,
    systemType:props.systemType,
    demandProfile,
    batteryNominalKwh: storageKwh,
    maxBatteryChargeKw:chargeLimitKw,
    maxBatteryDischargeKw:dischargeLimitKw,
    retailTariffClpKwh:props.retailTariffClpKwh,
    exportTariffClpKwh:props.exportTariffClpKwh,
    }
    return live ? simulatePvgisHourly(scenario,live,props.systemKwp) : simulateHourly(scenario)
  },[
    live,props.systemKwp,
    props.monthlyGenerationKwh,props.monthlyConsumptionKwh,props.systemType,
    props.retailTariffClpKwh,props.exportTariffClpKwh,
    demandProfile,storageKwh,chargeLimitKw,dischargeLimitKw,
  ])

  const annual = report.annual
  const available = annual.directSelfUseKwh + annual.batteryDischargeToLoadKwh
  const share = annual.demandKwh > 0
    ? Math.min(100,available / annual.demandKwh * 100) : 0

  return <section className="hourly-panel" aria-label="Balance energético horario">
    <div className="hourly-heading">
      <div><span className="overline">ORBI SQ-03 · SIMULACIÓN ENERGÉTICA</span>
        <h4>¿Cuándo utilizas tu energía?</h4>
        <p>Compara consumo directo, red y baterías con un despacho por horas reproducible.</p>
      </div>
      <span className="hourly-tag">{live ? 'PVGIS HORARIO 2023' : 'SOLAR SINTÉTICO'}</span>
    </div>

    <div className="hourly-settings">
      <label>Perfil diario de consumo
        <select value={demandProfile} onChange={e => setDemandProfile(e.target.value as DemandProfile)} aria-label="Perfil de consumo horario">
          {loadModes.map(o => <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>)}
        </select>
      </label>
      {props.systemType !== 'on-grid' && <div className="hourly-battery-fields">
        <label>Batería nominal
          <span className="hourly-field"><input type="number" min={0} max={200} step={0.5} value={storageKwh}
            onChange={e=>setStorageOverride(Math.max(0,Math.min(200,Number(e.target.value)||0)))}
            aria-label="Batería nominal kWh"/><span>kWh</span></span>
        </label>
        <label>Límite carga
          <span className="hourly-field"><input type="number" min={0} max={100} step={0.5} value={chargeLimitKw}
            onChange={e=>setChargeLimitKw(Math.max(0,Math.min(100,Number(e.target.value)||0)))}
            aria-label="Potencia máxima de carga kW"/><span>kW</span></span>
        </label>
        <label>Límite descarga
          <span className="hourly-field"><input type="number" min={0} max={100} step={0.5} value={dischargeLimitKw}
            onChange={e=>setDischargeLimitKw(Math.max(0,Math.min(100,Number(e.target.value)||0)))}
            aria-label="Potencia máxima de descarga kW"/><span>kW</span></span>
        </label>
      </div>}
    </div>

    <div className="hourly-pvgis-card">
      <div className="hourly-pvgis-title">
        <CloudDownload size={19}/>
        <strong>Generación PVGIS por hora (2023)</strong>
      </div>
      {props.solarResource ? <>
        <p>Consulta voluntaria de 8.760 horas de potencia FV modelada por PVGIS para tu configuración. A diferencia de PVcalc, utiliza <b>un año meteorológico histórico concreto</b>, no el promedio mensual multianual.</p>
        <div className="hourly-pvgis-actions">
          <button type="button" className="resource-load" disabled={isLoading}
            onClick={requestHourly}>
            <CloudDownload size={16}/> {isLoading ? 'Consultando horas…' : live ? 'Actualizar 2023' : 'Consultar 8.760 horas'}
          </button>
          {live && <span className="hourly-pvgis-success"><CheckCircle2 size={16}/> Serie cargada · {kwh(live.annualKwhPerKwp)} kWh/kWp en 2023</span>}
        </div>
        {providerError && <p role="alert" className="hourly-pvgis-error">{providerError} Se mantiene el balance sintético.</p>}
      </> : <p>Para habilitar esta función, vuelve al paso 2 y consulta primero el recurso solar PVGIS por coordenadas. Mientras tanto utilizaremos la curva horaria sintética.</p>}
      <small>Sin consulta automática de ubicación. La forma de tu consumo sigue siendo hipotética incluso cuando la producción FV proviene de datos horarios PVGIS.</small>
    </div>
    <div className="hourly-summary">
      <div><span><Zap size={17}/> Autocobertura eléctrica</span><strong>{kwh(share)}%</strong><small>Demanda cubierta mediante FV y batería solar</small></div>
      <div><span><TrendingDown size={17}/> {props.systemType==='off-grid' ? 'Demanda sin suministro' : 'Importación desde la red'}</span><strong>{kwh(props.systemType==='off-grid' ? annual.unmetDemandKwh : annual.gridImportKwh)} kWh</strong><small>Estimación anual bajo perfil elegido</small></div>
      <div><span><BatteryCharging size={17}/> {props.systemType==='off-grid' ? 'Producción desperdiciada' : 'Energía inyectada'}</span><strong>{kwh(props.systemType==='off-grid' ? annual.curtailedKwh : annual.gridExportKwh)} kWh</strong><small>{props.systemType==='off-grid' ? 'Excedente sin uso o almacenamiento' : 'Excedente potencial, no liquidación contractual'}</small></div>
    </div>

    <div className="hourly-flow">
      <div className="hourly-flow-heading"><strong>Balance anual del consumo</strong><span>{kwh(annual.demandKwh)} kWh de demanda</span></div>
      <div className="hourly-stacked" role="img" aria-label={'Consumo: '+kwh(available)+' kWh cubiertos por el sistema; '+kwh(annual.gridImportKwh)+' kWh desde red; '+kwh(annual.unmetDemandKwh)+' kWh no suministrados'}>
        {annual.demandKwh > 0 && <>
          <span style={{width:available / annual.demandKwh * 100+'%',background:'#41e5bf'}}/>
          <span style={{width:annual.gridImportKwh / annual.demandKwh * 100+'%',background:'#6a8faf'}}/>
          <span style={{width:annual.unmetDemandKwh / annual.demandKwh * 100+'%',background:'#ed9b63'}}/>
        </>}
      </div>
      <div className="hourly-legend"><span><i className="legend-green"/>FV directa + batería: {kwh(available)} kWh</span>
        {props.systemType==='off-grid'
          ? <span><i className="legend-orange"/>Sin suministro: {kwh(annual.unmetDemandKwh)} kWh</span>
          : <span><i className="legend-blue"/>Importación: {kwh(annual.gridImportKwh)} kWh</span>}
      </div>
    </div>

    {props.systemType==='off-grid'
      ? <div className="hourly-alert"><CircleAlert size={20}/>
          <span>En sistemas aislados, una energía no suministrada mayor que cero indica riesgo de interrupción bajo este perfil. Incluso con valor cero, hace falta verificar días críticos, cargas de arranque y autonomía invernal.</span></div>
      : <div className="hourly-economics">
          <div><span>Valor energético anual ilustrativo</span><strong>{clp(report.indicativeEnergyValueClp ?? 0)}</strong></div>
          <p>Autoconsumo estimado × tarifa de compra + exportación estimada × tarifa de inyección. <b>No equivale a una boleta, descuento contractual ni retorno garantizado.</b> Se excluyen cargos fijos, límites de compensación, impuestos y costos del sistema.</p>
        </div>}

    {props.systemType!=='on-grid' && <p className="hourly-minor">Batería: reserva mínima 20%, eficiencia de carga 95% y descarga 95%. El estado inicial es la reserva mínima, para evitar inventar energía almacenada. No incluye envejecimiento ni degradación.</p>}
    <div className="hourly-source"><Info size={17}/><p>
      {live
        ? 'La generación FV corresponde al modelo horario histórico PVGIS 2023 (serie UTC trasladada a horas civiles de Chile para compararla con las cargas); es distinta del promedio mensual PVcalc del gráfico anterior. '
        : 'La generación solar se distribuye según una curva artificial de 24 horas repetida diariamente en cada mes. '}
      El perfil de carga diurna/nocturna sigue siendo <b>sintético</b>, no procede de un medidor real.
      Este balance no constituye liquidación de Net Billing ni ingeniería definitiva de baterías. {props.productionSource === 'pvgis' && !live ? 'Los totales mensuales utilizados provienen de PVGIS PVcalc.' : ''}
    </p></div>
  </section>
}
