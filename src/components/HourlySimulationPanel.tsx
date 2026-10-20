import { useMemo, useState } from 'react'
import { BatteryCharging, CircleAlert, Info, TrendingDown, Zap } from 'lucide-react'
import type { SystemType } from '../lib/solar'
import { simulateHourly, type DemandProfile } from '../lib/hourly'

interface Props {
  monthlyGenerationKwh: number[]
  monthlyConsumptionKwh: number
  systemType: SystemType
  defaultBatteryNominalKwh: number | null
  retailTariffClpKwh: number
  exportTariffClpKwh: number
  productionSource: 'pvgis' | 'manual'
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

  const storageKwh = props.systemType === 'on-grid'
    ? 0
    : (storageOverride ?? Math.round((props.defaultBatteryNominalKwh ?? 0)*10)/10)

  const report = useMemo(() => simulateHourly({
    monthlyGenerationKwh: props.monthlyGenerationKwh,
    monthlyConsumptionKwh: props.monthlyConsumptionKwh,
    systemType:props.systemType,
    demandProfile,
    batteryNominalKwh: storageKwh,
    maxBatteryChargeKw:chargeLimitKw,
    maxBatteryDischargeKw:dischargeLimitKw,
    retailTariffClpKwh:props.retailTariffClpKwh,
    exportTariffClpKwh:props.exportTariffClpKwh,
  }),[
    props.monthlyGenerationKwh,props.monthlyConsumptionKwh,props.systemType,
    props.retailTariffClpKwh,props.exportTariffClpKwh,
    demandProfile,storageKwh,chargeLimitKw,dischargeLimitKw,
  ])

  const annual = report.annual
  const available = annual.directSelfUseKwh + annual.batteryDischargeToLoadKwh
  const share = annual.demandKwh > 0
    ? Math.min(100,available / annual.demandKwh * 100) : 0

  return <section className="hourly-panel" aria-label="Balance energético horario sintético">
    <div className="hourly-heading">
      <div><span className="overline">ORBI SQ-03 · SIMULACIÓN ENERGÉTICA</span>
        <h4>¿Cuándo utilizas tu energía?</h4>
        <p>Compara consumo directo, red y baterías con un despacho por horas reproducible.</p>
      </div>
      <span className="hourly-tag">MODELO SINTÉTICO</span>
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
    <div className="hourly-source"><Info size={17}/><p>Distribución de carga y curva solar de 24 horas <b>sintéticas</b>, repetidas diariamente por mes durante 365 días.
      Los totales mensuales de generación provienen {props.productionSource==='pvgis'
        ? 'del modelo climático PVGIS solicitado previamente, no de datos PVGIS horarios.'
        : 'del modelo manual ilustrativo, sin recurso solar localizado.'}
      Este es un balance energético experimental; no es el Net Billing definitivo regulado ni una ingeniería de baterías.</p>
    </div>
  </section>
}
