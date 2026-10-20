import { useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BatteryCharging, Check, ChevronRight,
  CircleHelp, Compass, FileText, Home, Info, Leaf, MapPin,
  RotateCcw, ShieldCheck, SlidersHorizontal, Sun, TrendingUp,
  Zap,
} from 'lucide-react'
import { calculateSolar, type Orientation, type SystemType } from './lib/solar'

type ConsumptionMode = 'bill' | 'kwh'
type Step = 0 | 1 | 2

const money = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))
const integer = (n: number) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.round(n))
const decimal = (n: number, digits = 1) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(n)
const safeNumber = (raw: string) => Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0
const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

const options: { value: SystemType; name: string; caption: string; icon: typeof Zap }[] = [
  { value: 'on-grid', name: 'On-grid', caption: 'Conectado a la red', icon: Zap },
  { value: 'hybrid', name: 'Híbrido', caption: 'Red + baterías', icon: BatteryCharging },
  { value: 'off-grid', name: 'Off-grid', caption: 'Sin conexión a red', icon: Home },
]

const orientationLabels: { value: Orientation; label: string }[] = [
  { value: 'N', label: 'Norte' }, { value: 'NE', label: 'Noreste' },
  { value: 'NW', label: 'Noroeste' }, { value: 'E', label: 'Este' },
  { value: 'W', label: 'Oeste' }, { value: 'S', label: 'Sur' },
]
const roofTypes = ['Zinc / metálica', 'Teja asfáltica', 'Teja cerámica', 'Fibrocemento', 'Losa / plana', 'Otro / no sé']

function Logo() {
  return <div className="brand" aria-label="ORBI Solar Quote">
    <span className="brand-symbol"><Sun size={24} strokeWidth={2.2} /></span>
    <span className="brand-name">ORBI<span className="brand-dot">.</span><small>SOLAR QUOTE</small></span>
  </div>
}

function FormField({ title, tip, children }: { title: string; tip?: string; children: React.ReactNode }) {
  return <label className="field-block"><span className="field-title">{title}</span>{children}{tip && <span className="field-tip">{tip}</span>}</label>
}

export default function App() {
  const [step, setStep] = useState<Step>(0)
  const [mode, setMode] = useState<ConsumptionMode>('bill')
  const [bill, setBill] = useState(90000)
  const [consumption, setConsumption] = useState(410)
  const [retailTariff, setRetailTariff] = useState(220)
  const [exportTariff, setExportTariff] = useState(75)
  const [commune, setCommune] = useState('')
  const [area, setArea] = useState(32)
  const [roof, setRoof] = useState('Zinc / metálica')
  const [orientation, setOrientation] = useState<Orientation>('N')
  const [systemType, setSystemType] = useState<SystemType>('on-grid')
  const [yieldRef, setYieldRef] = useState(1700)
  const [losses, setLosses] = useState(17)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const monthlyKwh = mode === 'bill' ? bill / Math.max(retailTariff, 1) : consumption
  const result = useMemo(() => calculateSolar({
    monthlyConsumptionKwh: monthlyKwh,
    usableRoofAreaM2: area,
    modulePowerWp: 550,
    moduleAreaM2: 2.6,
    referenceYieldKwhPerKwpYear: yieldRef,
    lossesPct: losses,
    orientation,
    systemType,
    retailTariffClpKwh: retailTariff,
    exportTariffClpKwh: exportTariff,
  }), [monthlyKwh, area, yieldRef, losses, orientation, systemType, retailTariff, exportTariff])

  function goTo(next: Step) {
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function reset() {
    setStep(0)
    setMode('bill'); setBill(90000); setConsumption(410); setRetailTariff(220)
    setExportTariff(75); setCommune(''); setArea(32); setRoof('Zinc / metálica')
    setOrientation('N'); setSystemType('on-grid'); setYieldRef(1700); setLosses(17)
    setShowAdvanced(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const maxMonth = Math.max(...result.monthlyProfileKwh, 1)
  return <div className="app-shell">
    <header className="topbar">
      <div className="topbar-inner">
        <button type="button" className="logo-button" onClick={reset} aria-label="Volver al inicio"><Logo /></button>
        <div className="nav-right">
          <span className="prototype-pill"><span className="online-dot" /> PROTOTIPO 0.1</span>
          <button type="button" className="nav-link" onClick={() => document.getElementById('metodologia')?.scrollIntoView({ behavior: 'smooth' })}>Metodología <ChevronRight size={14}/></button>
        </div>
      </div>
    </header>

    <main>
      <div className="background-glow" />
      <div className="page-container">
        <div className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> EL FUTURO DE TU ENERGÍA EMPIEZA AQUÍ</div>
            <h1>Tu techo tiene <span>potencial.</span><br />Descubre cuánto.</h1>
            <p>Calcula tu instalación solar en minutos. Sin registro, sin letra chica y con los supuestos siempre a la vista.</p>
            <div className="hero-trust"><span><Check size={15}/> Sin costo</span><span><Check size={15}/> Para Chile</span><span><Check size={15}/> Sin datos personales</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="art-sun"><Sun size={40}/></div>
            <div className="panel-art">
              {Array.from({ length: 18 }, (_, i) => <span key={i} />)}
            </div>
            <div className="art-chip art-chip-top"><Sun size={15}/><span>ENERGÍA LIMPIA</span></div>
            <div className="art-chip art-chip-bottom"><span className="chip-signal" /> POTENCIAL SOLAR</div>
          </div>
        </div>

        <section className="workspace" aria-label="Cotizador solar">
          <div className="workspace-heading">
            <div className="workspace-title">
              <span className="section-index">01 / 03</span>
              <h2>Tu simulación solar</h2>
              <p>Te guiaremos paso a paso para crear una primera estimación.</p>
            </div>
            <span className="secure-label"><ShieldCheck size={17}/> Datos en tu navegador</span>
          </div>
          <div className="stepper" aria-label="Progreso">
            {(['Tu consumo', 'Tu vivienda', 'Tu resultado'] as const).map((label, idx) => (
              <div key={label} className={'step-item ' + (idx === step ? 'step-current' : idx < step ? 'step-done' : '')}>
                <span className="step-counter">{idx < step ? <Check size={16}/> : '0' + (idx + 1)}</span>
                <span>{label}</span>
                {idx < 2 && <span className="step-line" />}
              </div>
            ))}
          </div>

          <div className="wizard-card">
            {step === 0 && <>
              <div className="panel-heading"><div className="panel-icon"><Zap size={22}/></div><div><span className="overline">PASO 01</span><h3>Comencemos por tu consumo</h3><p>Conocer tu consumo eléctrico es el primer paso para dimensionar el sistema.</p></div></div>
              <div className="mode-toggle" role="group" aria-label="Cómo conoces tu consumo">
                <button type="button" className={mode === 'bill' ? 'active' : ''} aria-pressed={mode === 'bill'} onClick={() => setMode('bill')}>Monto de mi boleta</button>
                <button type="button" className={mode === 'kwh' ? 'active' : ''} aria-pressed={mode === 'kwh'} onClick={() => setMode('kwh')}>Consumo en kWh</button>
              </div>
              <div className="form-stack">
                {mode === 'bill' ? <FormField title="¿Cuánto pagas de luz al mes?" tip="Usa un mes representativo. La boleta puede incluir cargos fijos que aquí no se separan.">
                  <div className="large-money-input"><span>$</span><input aria-label="Monto mensual de boleta en pesos chilenos" type="number" min={0} max={10000000} step={1000} value={bill} onChange={e => setBill(safeNumber(e.target.value))}/><span className="unit">CLP / mes</span></div>
                  <input className="range-input" aria-label="Ajustar monto de boleta" type="range" min={10000} max={300000} step={5000} value={Math.min(300000, Math.max(10000, bill))} onChange={e => setBill(Number(e.target.value))}/>
                  <div className="range-ends"><span>$10.000</span><span>$300.000+</span></div>
                </FormField> : <FormField title="¿Cuánta energía consumes al mes?" tip="Encontrarás los kWh en tu boleta eléctrica.">
                  <div className="large-money-input"><input aria-label="Consumo mensual en kWh" type="number" min={0} max={100000} step={10} value={consumption} onChange={e => setConsumption(safeNumber(e.target.value))}/><span className="unit">kWh / mes</span></div>
                </FormField>}
                <div className="two-col">
                  <FormField title="Tarifa de compra de energía" tip="Referencia editable; no equivale necesariamente al precio efectivo total de la boleta.">
                    <div className="compact-input"><input type="number" aria-label="Tarifa compra CLP por kWh" min={1} max={10000} value={retailTariff} onChange={e => setRetailTariff(Math.max(1, safeNumber(e.target.value)))}/><span>CLP/kWh</span></div>
                  </FormField>
                  <FormField title="Comuna (opcional)" tip="Por ahora no modifica el cálculo: falta integrar irradiación por ubicación.">
                    <div className="compact-input"><MapPin size={17}/><input type="text" aria-label="Comuna" maxLength={80} placeholder="Ej. Rancagua" value={commune} onChange={e => setCommune(e.target.value)}/></div>
                  </FormField>
                </div>
              </div>
              <div className="inline-estimate"><span className="inline-icon"><TrendingUp size={19}/></span><div><strong>{integer(monthlyKwh)} kWh/mes</strong><small>Consumo mensual usado para la simulación</small></div><span className="assumption-tag">ESTIMADO</span></div>
              <div className="wizard-footer"><div className="footer-note"><Info size={16}/> Puedes corregir los datos en cualquier momento.</div><button type="button" className="button-primary" onClick={() => goTo(1)}>Continuar <ArrowRight size={18}/></button></div>
            </>}

            {step === 1 && <>
              <div className="panel-heading"><div className="panel-icon"><Home size={22}/></div><div><span className="overline">PASO 02</span><h3>Cuéntanos sobre tu techo</h3><p>Usaremos estos datos para estimar cuántos módulos podrían instalarse.</p></div></div>
              <div className="form-stack">
                <FormField title="Tipo de cubierta" tip="El tipo de techo deberá validarse antes de una instalación real.">
                  <div className="roof-grid">{roofTypes.map(item => <button key={item} type="button" aria-pressed={roof === item} className={'roof-option ' + (roof === item ? 'selected' : '')} onClick={() => setRoof(item)}><span className="roof-small-icon"><Home size={19}/></span><span>{item}</span>{roof === item && <Check size={16} className="option-check"/>}</button>)}</div>
                </FormField>
                {roof === 'Fibrocemento' && <div className="warning-box"><Info size={18}/> Antes de intervenir cubiertas antiguas de fibrocemento, debe verificarse si contienen asbesto y aplicar el procedimiento legal correspondiente.</div>}
                <div className="two-col">
                  <FormField title="Superficie útil del techo" tip="Área realmente disponible, descontando obstáculos y zonas no utilizables.">
                    <div className="compact-input"><input aria-label="Superficie útil m²" type="number" min={0} max={10000} value={area} onChange={e => setArea(safeNumber(e.target.value))}/><span>m²</span></div>
                  </FormField>
                  <FormField title="Orientación principal" tip="En Chile, la orientación norte suele favorecer el rendimiento anual.">
                    <div className="compact-input select-wrap"><Compass size={17}/><select aria-label="Orientación del techo" value={orientation} onChange={e => setOrientation(e.target.value as Orientation)}>{orientationLabels.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                  </FormField>
                </div>
                <FormField title="¿Qué tipo de sistema necesitas?">
                  <div className="system-grid">{options.map(o => {const Icon=o.icon; return <button type="button" key={o.value} className={'system-option ' + (systemType === o.value ? 'selected' : '')} aria-pressed={systemType === o.value} onClick={() => setSystemType(o.value)}><Icon size={23}/><strong>{o.name}</strong><small>{o.caption}</small>{systemType === o.value && <span className="system-check"><Check size={14}/></span>}</button>})}</div>
                </FormField>
                <button type="button" className="advanced-trigger" aria-expanded={showAdvanced} onClick={() => setShowAdvanced(!showAdvanced)}><SlidersHorizontal size={18}/> Ajustar supuestos técnicos <span>{showAdvanced ? '−' : '+'}</span></button>
                {showAdvanced && <div className="advanced-fields">
                  <div className="two-col">
                    <FormField title="Rendimiento solar bruto de referencia" tip="Hipótesis, NO irradiación calculada para tu comuna.">
                      <div className="compact-input"><input aria-label="Rendimiento referencia kWh por kWp año" type="number" min={0} max={3500} value={yieldRef} onChange={e => setYieldRef(safeNumber(e.target.value))}/><span>kWh/kWp/año</span></div>
                    </FormField>
                    <FormField title="Pérdidas totales estimadas" tip="Considera rendimiento eléctrico, temperatura y otras pérdidas simplificadas.">
                      <div className="compact-input"><input aria-label="Pérdidas porcentaje" type="number" min={0} max={100} value={losses} onChange={e => setLosses(Math.min(100, safeNumber(e.target.value)))}/><span>%</span></div>
                    </FormField>
                  </div>
                  <FormField title="Valor referencial de energía inyectada" tip="Solo para escenarios conectados a red. Verificar tarifa y condiciones del suministro.">
                    <div className="compact-input"><input aria-label="Tarifa inyección CLP por kWh" type="number" min={0} max={10000} value={exportTariff} onChange={e => setExportTariff(safeNumber(e.target.value))}/><span>CLP/kWh</span></div>
                  </FormField>
                </div>}
              </div>
              <div className="wizard-footer"><button type="button" className="button-back" onClick={() => goTo(0)}><ArrowLeft size={18}/> Volver</button><button type="button" className="button-primary" onClick={() => goTo(2)}>Calcular mi potencial <ArrowRight size={18}/></button></div>
            </>}

            {step === 2 && <>
              <div className="result-header">
                <div><span className="overline">PASO 03 — TU RESULTADO</span><h3>Este podría ser tu sistema solar.</h3><p>Estimación inicial con los datos y supuestos que proporcionaste.</p></div>
                <span className="result-status"><span className="online-dot"/> CÁLCULO LOCAL</span>
              </div>
              <div className="system-tabs" role="group" aria-label="Comparar tipos de sistemas">{options.map(o => <button type="button" key={o.value} onClick={() => setSystemType(o.value)} aria-pressed={systemType === o.value} className={systemType === o.value ? 'active' : ''}>{o.name}</button>)}</div>
              <div className="result-main">
                <div className="result-hero-number"><span>POTENCIA ESTIMADA</span><div><strong>{decimal(result.systemKwp, 2)}</strong> <em>kWp</em></div><small>{result.modules} módulos de 550 Wp considerados</small></div>
                <div className="result-meter"><Sun size={48}/><span>Una nueva forma de mirar tu energía.</span></div>
              </div>
              <div className="metrics-grid">
                <div className="metric"><span><Zap size={17}/> Generación al año</span><strong>{integer(result.annualGenerationKwh)}</strong><small>kWh estimados</small></div>
                <div className="metric"><span><TrendingUp size={17}/> Generación promedio</span><strong>{integer(result.monthlyGenerationKwh)}</strong><small>kWh / mes</small></div>
                <div className="metric"><span>{systemType === 'on-grid' ? <Leaf size={17}/> : <BatteryCharging size={17}/>} {systemType === 'on-grid' ? 'Valor anual ilustrativo' : 'Batería nominal ilustrativa'}</span><strong>{systemType === 'on-grid' ? money(result.annualValueClp ?? 0) : decimal(result.estimatedBatteryNominalKwh ?? 0) + ' kWh'}</strong><small>{systemType === 'on-grid' ? 'Autoconsumo + inyección (supuestos)' : 'No es un diseño definitivo'}</small></div>
              </div>
              {systemType === 'hybrid' && <div className="context-band"><BatteryCharging size={19}/><span>Valor económico anual ilustrativo: <b>{money(result.annualValueClp ?? 0)}</b>. No considera inversión ni degradación de baterías.</span></div>}
              {systemType === 'off-grid' && <div className="context-band"><CircleHelp size={19}/><span>La viabilidad off-grid requiere un perfil horario de cargas, días críticos de invierno y verificación de autonomía. No se proyecta ahorro monetario.</span></div>}
              {result.roofLimited && <div className="warning-box"><Info size={19}/> Superficie limitada: cabrían aproximadamente {result.maximumModules} módulos con esta hipótesis de área. El objetivo preliminar requeriría {result.targetModules}. No se han validado separaciones ni obstáculos.</div>}
              {result.modules === 0 && <div className="warning-box"><Info size={19}/> Con estos parámetros no resulta posible dimensionar módulos. Revisa el consumo, la superficie útil y el rendimiento de referencia.</div>}
              <div className="chart-box">
                <div className="chart-heading"><div><strong>Proyección mensual de generación</strong><p>Perfil estacional ilustrativo · no son datos climáticos reales</p></div><span className="chart-legend"><span/> kWh/mes</span></div>
                <div className="chart-plot" aria-label="Gráfico mensual de generación estimada">
                  {result.monthlyProfileKwh.map((value, index) => <div className="chart-month" key={months[index]} title={months[index] + ': ' + integer(value) + ' kWh'}><div className="chart-bar-track"><div className="chart-bar" style={{ height: (value > 0 ? Math.max(2, value / maxMonth * 100) : 0) + '%' }}/></div><span>{months[index]}</span></div>)}
                </div>
              </div>
              <div className="result-disclaimer"><ShieldCheck size={20}/><div><b>Transparencia ante todo.</b><p>Estos resultados son orientativos. Los supuestos de rendimiento, orientación, autoconsumo, perfil estacional y baterías son genéricos; no hay radiación satelital, sombras, consumo horario ni inspección estructural. No es una cotización comercial ni un proyecto de ingeniería.</p></div></div>
              <div className="wizard-footer result-actions"><button type="button" className="button-back" onClick={() => goTo(1)}><ArrowLeft size={18}/> Editar vivienda</button><div className="result-action-right"><button type="button" className="button-outline" onClick={() => window.print()}><FileText size={17}/> Imprimir resumen</button><button type="button" className="button-primary" onClick={reset}><RotateCcw size={17}/> Nueva simulación</button></div></div>
            </>}
          </div>
        </section>

        <section className="method-section" id="metodologia">
          <div className="method-heading"><span className="overline">INGENIERÍA ABIERTA</span><h2>Claridad antes de invertir.</h2><p>Sabemos que una decisión energética merece números que se puedan explicar. Por eso mostramos qué podemos calcular hoy y qué falta verificar.</p></div>
          <div className="feature-grid">
            <div className="feature-card"><span className="feature-icon"><SlidersHorizontal size={23}/></span><h4>Supuestos visibles</h4><p>Modifica el rendimiento de referencia, las pérdidas y la tarifa eléctrica desde el cuestionario.</p></div>
            <div className="feature-card"><span className="feature-icon"><BatteryCharging size={23}/></span><h4>Compara opciones</h4><p>Explora on-grid, híbrido y off-grid sin confundir una estimación rápida con una ingeniería completa.</p></div>
            <div className="feature-card"><span className="feature-icon"><ShieldCheck size={23}/></span><h4>Privacidad desde el inicio</h4><p>En esta versión los datos se procesan únicamente en tu navegador; no se envían a servidores.</p></div>
          </div>
          <div className="roadmap-line"><span><span className="roadmap-dot"/> DISPONIBLE: SIMULADOR PRELIMINAR</span><span>PRÓXIMAMENTE: IRRADIACIÓN REAL · EQUIPOS · PRECIOS · PDF</span></div>
        </section>
      </div>
    </main>
    <footer className="site-footer"><div className="page-container footer-inner"><Logo/><span>© 2026 ORBI Ecosystem · Tecnología al servicio de tu energía.</span><span className="footer-version">ORBI SOLAR QUOTE v0.1</span></div></footer>
  </div>
}
