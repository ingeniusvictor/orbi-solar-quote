# SQ-03B — Validación live GitHub y Vercel (2026-10-20)

## Identidad y destino
- PR #8 (draft, apilado sobre PR #7): https://github.com/ingeniusvictor/orbi-solar-quote/pull/8
- Branch: `feat/sq-03b-pvgis-hourly-series`
- SHA: `f613b5d05cca484b3c7e6f745fb8d09dd0e35628`
- Vista previa Vercel: https://orbi-solar-quote-ac1wtclvn-orbi4.vercel.app
- No hubo merge a `main` ni despliegue de producción.

## Automatización
- GitHub Actions Quality Gate: https://github.com/ingeniusvictor/orbi-solar-quote/actions/runs/39494961532
- Resultado: **SUCCESS**.
- Tests: **4 archivos, 36 tests aprobados**.
- TypeScript/Vite: **build SUCCESS**.

## Consulta real a PVGIS `seriescalc`
Parámetros de validación:
- Latitud: -34.17; longitud: -70.74 (coordenadas de prueba de referencia para la zona de Rancagua)
- Inclinación 25°, norte (aspect=180° en convención PVGIS), pérdidas 17%
- `pvcalculation=1`; `peakpower=1`; año 2023, `mountingplace=building`; c-Si
- Base meteorológica reportada: `PVGIS-ERA5`

Resultado HTTP 200:
- `source`: `PVGIS v5.3 / seriescalc`
- `year`: 2023
- `utcHourKwhPerKwp.length`: 8.760
- `annualKwhPerKwp`: **1569.76589**
- Registros nocturnos iniciales igual a cero: verificados.

La consulta SQ-02 anterior (`PVcalc`) había retornado **1636.07 kWh/kWp/año**. La diferencia NO implica una contradicción: `PVcalc` y `seriescalc` representan ventanas meteorológicas y metodologías distintas. La app presenta ambas fuentes por separado.

Prueba de rechazo: latitud 300 → **HTTP 400**, error JSON controlado.

## Límites conocidos / próximo QA

- [x] Integración PVGIS `seriescalc` responde desde backend Vercel.
- [x] Respuesta de 8.760 horas normalizada, validada y dimensionable por kWp.
- [x] Batería/consumo sintético vs FV horaria modelada diferenciados.
- [x] Gestión de entradas inválidas.
- [x] Compilación y 36 tests en verde.
- [ ] Navegación visual con navegador móvil y escritorio: **no ejecutada**.
- [ ] Verificación independiente del motor con medidor real/dataset horario de consumo.
- [ ] Prueba de carga/rate limiting y protección antiabuso.
- [ ] Revisión de accesibilidad y de manejo de errores lentos/fallidos en distintas conexiones.
- [ ] Evaluación de normativa y tarifas chilenas por profesional habilitado.

**No presentar estos cálculos como una cotización profesional, ahorro contractual ni garantía off-grid.**
