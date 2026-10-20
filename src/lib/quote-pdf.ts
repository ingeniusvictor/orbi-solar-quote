import { jsPDF } from 'jspdf'
import type { QuoteBudget } from './quote'

export interface QuotePdfSnapshot {
  monthlyConsumptionKwh:number
  annualGenerationKwh:number
  generationSource:'manual'|'pvgis'
  locationLabel?:string
  moduleReference?:string
  createdOn?:Date
}

const clp=(amount:number)=>'$'+Math.round(amount).toLocaleString('es-CL')
const number=(v:number)=>v.toLocaleString('es-CL',{maximumFractionDigits:2})
const normal=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^A-Za-z0-9\s.,():/+-]/g,'').slice(0,130)

/** Create a stand-alone, explicitly DEMO document. No customers or PII stored. */
export function makeQuotePdf(budget:QuoteBudget, snapshot:QuotePdfSnapshot):jsPDF {
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true})
  const W=210, pad=16
  const ink:[number,number,number]=[11,32,47]
  const muted:[number,number,number]=[77,96,105]
  const today=snapshot.createdOn??new Date()
  const date=today.toLocaleDateString('es-CL',{year:'numeric',month:'2-digit',day:'2-digit'})
  pdf.setFillColor(...ink)
  pdf.rect(0,0,W,40,'F')
  pdf.setTextColor(238,249,248)
  pdf.setFont('helvetica','bold')
  pdf.setFontSize(22)
  pdf.text('ORBI',pad,21)
  pdf.setTextColor(95,233,199)
  pdf.setFontSize(10)
  pdf.text('SOLAR QUOTE',pad,29)
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(10)
  pdf.text('PRESUPUESTO DEMOSTRATIVO',W-pad,19,{align:'right'})
  pdf.setFontSize(8)
  pdf.text('No constituye una oferta comercial',W-pad,27,{align:'right'})

  let y=52
  pdf.setTextColor(...ink)
  pdf.setFontSize(13)
  pdf.text('Simulacion fotovoltaica preliminar',pad,y)
  y+=9
  pdf.setFont('helvetica','normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...muted)
  const kind=budget.systemType==='on-grid'?'Conectado a red'
    :budget.systemType==='hybrid'?'Hibrido con baterias':'Aislado sin red'
  const meta=[
    ['Fecha del documento',date],
    ['Tipo de sistema',kind],
    ['Dimension estimada',number(budget.systemKwp)+' kWp / '+budget.moduleCount+' modulos'],
    ['Potencia nominal por modulo',number(budget.modulePowerWp)+' Wp'],
    ['Referencia de modulo (no precio)',normal(snapshot.moduleReference??'Modulo generico')],
    ['Baterias incluidas',number(budget.installedBatteryNominalKwh)+' kWh nominales'],
    ['Consumo mensual declarado',number(snapshot.monthlyConsumptionKwh)+' kWh'],
    ['Generacion anual estimada',number(snapshot.annualGenerationKwh)+' kWh'],
    ['Fuente de generacion',snapshot.generationSource==='pvgis'?'PVGIS PVcalc mensual':'Modelo manual ilustrativo'],
  ]
  if(snapshot.locationLabel?.trim())meta.push(['Ubicacion declarada',normal(snapshot.locationLabel)])
  for(const [label,value] of meta){
    pdf.setTextColor(...muted);pdf.text(label+':',pad,y)
    pdf.setTextColor(...ink);pdf.text(value,pad+64,y)
    y+=5.5
  }
  y+=5
  pdf.setDrawColor(210,222,225)
  pdf.line(pad,y,W-pad,y)
  y+=8
  pdf.setFont('helvetica','bold')
  pdf.setTextColor(...ink)
  pdf.setFontSize(11)
  pdf.text('Detalle de equipos y servicios (CLP netos)',pad,y)
  y+=8
  pdf.setFillColor(226,244,239)
  pdf.rect(pad,y-5,W-2*pad,8,'F')
  pdf.setFontSize(8)
  pdf.text('Concepto',pad+2,y)
  pdf.text('Cant.',126,y,{align:'right'})
  pdf.text('Unitario',153,y,{align:'right'})
  pdf.text('Total',W-pad-2,y,{align:'right'})
  y+=8
  pdf.setFont('helvetica','normal')
  pdf.setFontSize(7.8)
  for(const line of budget.lines){
    const name=normal(line.label)
    const clipped=name.length>42?name.slice(0,39)+'...':name
    pdf.setTextColor(...ink)
    pdf.text(clipped,pad+2,y)
    pdf.setTextColor(...muted)
    pdf.text(number(line.quantity),126,y,{align:'right'})
    pdf.text(clp(line.unitNetClp),153,y,{align:'right'})
    pdf.setTextColor(...ink)
    pdf.text(clp(line.totalNetClp),W-pad-2,y,{align:'right'})
    y+=7
  }
  y+=4
  pdf.setDrawColor(205,217,220)
  pdf.line(113,y,W-pad,y)
  const totals:[string,string][]=[
    ['Subtotal neto',clp(budget.directNetClp)],
    ['Margen referencial ('+number(budget.marginPct)+'%)',clp(budget.marginClp)],
    ['Neto con margen',clp(budget.netWithMarginClp)],
    ['IVA ilustrativo ('+number(budget.vatPct)+'%)',clp(budget.vatClp)],
  ]
  for(const [name,value] of totals){
    y+=6
    pdf.setTextColor(...muted);pdf.text(name,116,y)
    pdf.setTextColor(...ink);pdf.text(value,W-pad,y,{align:'right'})
  }
  y+=10
  pdf.setFillColor(...ink)
  pdf.roundedRect(pad,y-6,W-2*pad,17,3,3,'F')
  pdf.setFont('helvetica','bold')
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(10)
  pdf.text('TOTAL DEMOSTRATIVO (IVA INCL.)',pad+6,y+4)
  pdf.setFontSize(12)
  pdf.text(clp(budget.grandTotalClp),W-pad-5,y+4,{align:'right'})
  y+=15
  const notes=[
    'DOCUMENTO DE PRUEBA - PRECIOS FICTICIOS Y EDITABLES. NO ES COTIZACION.',
    'No se han seleccionado ni cotizado marcas, modelos, garantias o proveedores.',
    'Potencia de inversor, cantidades, protecciones y estructuras requieren ingenieria.',
    'No incluye levantamiento real, sombras, transporte validado ni factibilidad SEC.',
    'La produccion y el ahorro son orientativos, no ingresos ni rentabilidad garantizada.',
    'Un valor de IVA simulado no convierte este PDF en documento tributario.',
  ]
  // Explicitly leave enough room for one A4 page.
  // Keep complete disclaimer on the current page when it fits above footer.
  if(y + 6 + notes.length*5 > 279){pdf.addPage();y=24}
  pdf.setTextColor(...ink)
  pdf.setFont('helvetica','bold')
  pdf.setFontSize(8)
  pdf.text('Alcance y exclusiones',pad,y)
  y+=6
  pdf.setFont('helvetica','normal')
  pdf.setTextColor(...muted)
  pdf.setFontSize(7.3)
  for(const line of notes){pdf.text(line,pad,y);y+=5}
  const pages = pdf.getNumberOfPages()
  for (let page=1;page<=pages;page++) {
    pdf.setPage(page)
    pdf.setDrawColor(210,223,225)
    pdf.line(pad,282,W-pad,282)
    pdf.setFontSize(7)
    pdf.setTextColor(...muted)
    pdf.text('ORBI Ecosystem | SQ-04 | BORRADOR DE DEMOSTRACION',pad,288)
    pdf.text('Pagina '+page+' / '+pages,W-pad,288,{align:'right'})
  }
  return pdf
}

export function downloadQuotePdf(budget:QuoteBudget,snapshot:QuotePdfSnapshot):void {
  makeQuotePdf(budget,snapshot).save('ORBI-Solar-Quote-DEMO.pdf')
}
