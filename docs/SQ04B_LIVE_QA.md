# SQ-04B — QA GitHub, Chromium y PDF (20-10-2026)

## Estado de entrega

- PR apilado: https://github.com/ingeniusvictor/orbi-solar-quote/pull/11 (draft sobre PR #9).
- SHA validado: `613b3358c58af41b305871fdeb47be7362b1a6d8`.
- CI unitario + producción: https://github.com/ingeniusvictor/orbi-solar-quote/actions/runs/39514209618 — **SUCCESS**.
- **7 archivos / 52 tests**, compilación TypeScript/Vite PASS, `npm audit --omit=dev --audit-level=high` PASS.
- Browser QA + PDF: https://github.com/ingeniusvictor/orbi-solar-quote/actions/runs/39514209488 — **SUCCESS**.
- Vercel preview: https://orbi-solar-quote-72kyjipoa-orbi4.vercel.app — READY. No production target.

## Browser QA

Playwright Chromium automático, dos contextos:
1. Desktop Chrome, 1280 píxeles de ancho.
2. Pixel 7 emulado mediante Chromium (viewport móvil; **no** dispositivo físico Android).

Flujo:
- Abrir cotizador, avanzar a la selección de cubierta, elegir Trina Solar Vertex S+ TSM-450 NEG9R.28.
- Verificar potencia de módulo y aviso SEC no verificado, avanzar a resultados.
- Cambiar precio unitario ficticio a CLP 155.000.
- Descargar PDF DEMO y validar `%PDF-`, texto extraído mediante `pdftotext`, marca de documento demostrativo, módulo Trina y advertencia de no cotización.
- Verificar con `pdfinfo` que el ejemplo residencial se genera en **una página A4**.
- Capturas de la UI, PDFs y reporte Playwright adjuntos como artifact `sq-browser-pdf-qa`, disponible en el run de GitHub por 14 días.

## Inspección visual del PDF generado

Se descargó el PDF desde el artifact del propio CI, se renderizó a imagen mediante Poppler y se inspeccionó visualmente. Resultado: una página A4 legible, tabla de partidas, subtotales, margen, IVA y total incluidos; exclusiones y advertencias visibles bajo el total, sin página en blanco. El PDF anterior dividía las exclusiones en una segunda página; corregido con espaciado y prueba de regresión.

**Ejemplo estrictamente ficticio:** 7 módulos TSM-450 (3.15 kWp) y precio unitario modificado manualmente. Su valor global NO es una cotización real ni un precio de mercado.

## Pendientes antes de uso comercial

- QA táctil y descarga en dispositivo Android físico, no solo emulación.
- Comprobar en plataforma SEC autorización y AFCI de modelos concretos, versión nacional y equipo disponible.
- Obtener fichas reales de estructuras, inversores y baterías, verificar capacidad, tensión, MPPT, secciones y emplazamiento.
- Agregar precios y fechas de proveedores, trazabilidad comercial y control de acceso.
- Resolver auditoría **completa** de dependencias dev: issue #10.
- Desapilar PR #1 → #6 → #7 → #8 → #9 → #11 mediante aprobación/revisión antes de main.
