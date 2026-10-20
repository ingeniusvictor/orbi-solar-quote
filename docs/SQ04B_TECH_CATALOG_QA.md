# SQ-04B — Fichas técnicas y QA de navegador

## Selección de datos técnicos (20-10-2026)

**Selección 1: genérico 550 Wp**, existente desde SQ-01, *sin ficha técnica ni datos eléctricos*. Debe mantenerse como supuesto, sin aprobación.

**Selección 2: Trina Solar Vertex S+ TSM-450 NEG9R.28, versión TSM_ESP_2024_C**.
Ficha oficial: https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S%2B_NEG9R.28_ESP_2024_C_web.pdf

Valores a condiciones STC de la ficha: potencia 450 Wp, Vmpp 44.6 V, Impp 10.09 A, Voc 52.9 V, Isc 10.74 A, dimensiones 1762 × 1134 × 30 mm, coeficiente Voc −0.24 %/°C, masa 21 kg. 
El área de cálculo es `(1.762×1.134)×1.10 = 2.1979188 m²`: el 10% adicional es **holgura ficticia para packing**, no plano de cubierta.

La selección real modifica `modulePowerWp` y `moduleAreaM2` en el motor solar y la potencia trasladada al desglose del presupuesto. Los **precios siguen siendo genéricos, ilustrativos y no correspondientes al modelo Trina**, aunque el documento PDF sí registra el nombre del módulo como referencia técnica.

## Inversor para explicación preliminar

**GoodWe GW5000-DNS-30**, datos públicos en https://us.goodwe.com/dns-g3 :
nominal CA 5 kW, máximo de entrada FV 600 V, máximo por MPPT 16 A, 2 MPPT. Fuente **US** y especificaciones regionales potencialmente diferentes. Se usa únicamente como contraejemplo/ejercicio de cribado de tensión en serie y corriente; **no se asigna automáticamente como equipo a instalar ni presupuestar**.

Se estima `Voc_frio = Voc_STC × [1+(coefVoc_pct/100)×(Tcelda−25)]` con hipótesis de −10 °C de célula. Puede sugerir una cota aritmética superior de módulos en serie respecto a 600 V, pero NO establece un número seguro ni correcto de strings: faltan tensión MPPT mínima/máxima, corriente máxima Isc, carga continua, sección de cable, conexiones, temperatura local de diseño, tensiones/transitorios, AFCI y certificación del modelo.

## SEC (obligatorio verificar por proyecto)

- Registro oficial de equipos autorizados: https://www.sec.cl/gda/equipamiento-autorizado/
- Marco regulatorio: https://www.sec.cl/gda/marco-regulatorio/

**Desde el 1 de enero de 2026**, la SEC exige AFCI integrado conforme IEC 63027 o UL 1699B en inversores de nuevas declaraciones TE4, salvo proyectos especiales con protección AFCI externa autorizada según los criterios vigentes. **No se ha verificado autorización SEC ni cumplimiento AFCI del GoodWe DNS-30, ni autorización del módulo Trina escogido**. El motor nunca devuelve estado `approved` o `certified` desde estas fichas.

## QA visual / PDF

- Tests unitarios de ficha, áreas, temperaturas y diferencia de potencias seleccionadas.
- Workflow `.github/workflows/browser-qa.yml` con Playwright Chromium desktop + viewport Android (Pixel 7 emulado; no es dispositivo físico).
- Avanza 3 etapas, cambia módulo, valida potencia, modifica costo y descarga PDF.
- `pdftotext` comprueba las advertencias, el modelo técnico y texto de NO cotización; `pdfinfo` comprueba estructura y páginas.
- Adjunta PNG de interfaz y PDF a GitHub Actions, para inspección visual posterior.

La generación PDF en Chromium **no equivale** a una prueba en Android físico. Antes de merge para entrega comercial, revisar artefactos, experiencia táctil, accesibilidad y PDF en teléfonos reales, no asumir aprobación por la compilación.
