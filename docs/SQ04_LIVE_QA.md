# ORBI SQ-04 — QA técnico (2026-10-20)

## Identidad y despliegue
- Repositorio: `ingeniusvictor/orbi-solar-quote`
- PR: https://github.com/ingeniusvictor/orbi-solar-quote/pull/9 (draft, sobre SQ-03B #8)
- Último CI de código: GitHub Actions run 39511582080 (SHA `dbf0487c9afbe5549ef6abac71917004357c80d8`)
- 6 ficheros de pruebas, **46 tests en verde** y build TypeScript/Vite PASS
- Nuevo control `npm audit --omit=dev --audit-level=high`: PASS (sin alarmas high/critical para dependencias productivas)
- Vercel preview `orbi-solar-quote-i4g3fpgev-orbi4.vercel.app`: READY
- Página raíz HTTP 200, API PVGIS /api/solar-resource HTTP 200, Rancagua orientación norte 1636.07 kWh/kWp/año

## PDF
- Generador en `src/lib/quote-pdf.ts`, cliente, importación diferida
- Test de archivo PDF válido (`%PDF-` y bytes) y documento sin cuentas de cliente: PASS
- Contrato de costos y redondeos verificado por pruebas unitarias.
- Advertencia «PRECIOS FICTICIOS / NO COTIZACIÓN» tanto en UI como archivo.

## Riesgos / pendiente
- [ ] QA de descarga PDF interactiva en navegador Android y escritorio.
- [ ] Render/inspección visual de todas las páginas del PDF, acentos, saltos y footer.
- [ ] Comparación independiente de costos con ofertas reales y definición de catálogo OEM.
- [ ] Cálculo y selección técnica de inversores, baterías y componentes por proyecto.
- [ ] Resolver advertencias `npm audit` de dependencias totales, incluidas las de desarrollo.
- [ ] Auditoría de accesibilidad UI y pruebas de navegador E2E.

**No fusionar a `main` ni promover a producción hasta QA visual, ingeniería y catálogo validado.**
