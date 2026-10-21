import {ENERTIK_VOLTRONIC,presetByTier,screenBatteryPower,type VoltronicTier,type SupplierConfiguration} from '../lib/enertik-presets'

interface Props {
 tier:VoltronicTier
 configuration:SupplierConfiguration
 onTierChange:(tier:VoltronicTier)=>void
 onChange:(data:SupplierConfiguration)=>void
}
const format=(value:number)=>new Intl.NumberFormat('es-CL',{maximumFractionDigits:2}).format(value)
const numeric=(raw:string,max:number)=>Math.max(0,Math.min(max,Number(raw)||0))

export function EnertikPresetPanel({tier,configuration,onTierChange,onChange}:Props){
 const {inverter,battery}=presetByTier(tier)
 const screen=screenBatteryPower(configuration,inverter)
 function update(field:keyof SupplierConfiguration,value:string) {
   const numbers=['inverterGrossClp','batteryGrossClp','batteryUnits','batteryNominalKwh',
      'batteryNominalV','batteryMaxDischargeA','bankMaxParallelUnits']
   onChange({...configuration,[field]:numbers.includes(field)?numeric(value,
     field.includes('Gross')?1e10:10000):value})
 }
 return <section className="enertik-panel" aria-label="Configuración editable Enertik Voltronic">
    <h5>Enertik · Referencias Voltronic y bancos LiFePO₄</h5>
    <p>Los importes originales incluyen IVA y fueron observados en fichas Enertik el 20/10/2026. Son referencias de proveedor, no ofertas vigentes ni configuraciones aprobadas.</p>
    <div className="enertik-tiers" role="group" aria-label="Elegir potencia nominal del inversor">
      {ENERTIK_VOLTRONIC.map(p=><button key={p.id} type="button" aria-pressed={tier===p.id}
        className={tier===p.id?'active':''} onClick={()=>onTierChange(p.id)}>
        {p.id} kW <small>{p.dcBatteryClassV} V</small>
      </button>)}
    </div>
    <div className="enertik-fields">
      <label>Proveedor editable<input aria-label="Proveedor de equipos" value={configuration.provider}
        maxLength={90} onChange={e=>update('provider',e.target.value)}/></label>
      <label>Modelo inversor editable<input aria-label="Modelo de inversor del proveedor" value={configuration.inverterModel}
        maxLength={110} onChange={e=>update('inverterModel',e.target.value)}/></label>
      <label>Precio inversor con IVA (CLP)<input aria-label="Precio publicado inversor con IVA" type="number" min="0"
        value={configuration.inverterGrossClp} onChange={e=>update('inverterGrossClp',e.target.value)}/></label>
      <label>Modelo batería editable<input aria-label="Modelo de batería del proveedor" value={configuration.batteryModel}
        maxLength={110} onChange={e=>update('batteryModel',e.target.value)}/></label>
      <label>Precio batería con IVA (CLP)<input aria-label="Precio publicado batería con IVA" type="number" min="0"
        value={configuration.batteryGrossClp} onChange={e=>update('batteryGrossClp',e.target.value)}/></label>
      <label>Unidades de batería<input aria-label="Unidades de baterías" type="number" min="0" max={configuration.bankMaxParallelUnits}
        step="1" value={configuration.batteryUnits} onChange={e=>update('batteryUnits',e.target.value)}/></label>
      <label>Capacidad por batería (kWh)<input aria-label="kWh nominal por batería" type="number" min="0" step=".01"
        value={configuration.batteryNominalKwh} onChange={e=>update('batteryNominalKwh',e.target.value)}/></label>
      <label>Tensión nominal batería (V)<input aria-label="Tensión batería" type="number" min="0" step=".1"
        value={configuration.batteryNominalV} onChange={e=>update('batteryNominalV',e.target.value)}/></label>
      <label>Descarga continua BMS unitaria (A)<input aria-label="Corriente BMS unitaria" type="number" min="0"
        value={configuration.batteryMaxDischargeA} onChange={e=>update('batteryMaxDischargeA',e.target.value)}/></label>
      <label>Máximo paralelo según fabricante<input aria-label="Máximo de baterías en paralelo" type="number" min="1"
        value={configuration.bankMaxParallelUnits} onChange={e=>update('bankMaxParallelUnits',e.target.value)}/></label>
    </div>
    <div className="enertik-check">
      <strong>Banco inicial: {format(screen.nominalBankKwh)} kWh nominales · {format(screen.availableA)} A máximos nominales</strong>
      <p>Demanda nominal aproximada a batería: {format(screen.currentRequiredA)} A (eficiencia supuesta de 90%). {screen.disclaimer}</p>
      {inverter.maximumBatteryOnlyAcW!==null&&inverter.maximumBatteryOnlyAcW<inverter.acRatedW&&
        <p role="alert"><b>Atención al respaldo:</b> {inverter.acRatedW} W con solar+batería, pero solo {inverter.maximumBatteryOnlyAcW} W cuando opera exclusivamente con baterías según Enertik.</p>}
      {screen.problems.map((problem,i)=><p role="alert" key={i}>⚠ {problem}</p>)}
      <p>El mismo voltaje nominal y una corriente calculada suficiente NO validan comunicación BMS, paralelismo, tensión mínima bajo carga ni autonomía nocturna.</p>
    </div>
    <div className="enertik-sources">
      <a href={inverter.price.sourceUrl} target="_blank" rel="noreferrer">Ficha/precio original del inversor · Enertik</a>
      <a href={battery.price.sourceUrl} target="_blank" rel="noreferrer">Ficha/precio original de batería · Enertik</a>
      <small>Si sustituyes proveedor, modelo o datos, estas fuentes ya no respaldan esos valores. Requieren una nueva ficha y cotización fechada.</small>
    </div>
 </section>
}
