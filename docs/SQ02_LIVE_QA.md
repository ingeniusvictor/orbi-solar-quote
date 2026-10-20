# ORBI-SQ-02 — Evidencia de pruebas en Vercel (20 de octubre de 2026)

## Alcance de validación

- PR de desarrollo: https://github.com/ingeniusvictor/orbi-solar-quote/pull/6
- Rama: `feat/sq-02-pvgis-resource`
- SHA comprobado en preview: `e30811565f19764b4e5d81c7caecff3524ad7c3a`
- Preview: https://orbi-solar-quote-po0zc7lez-orbi4.vercel.app
- Ruta API: `GET /api/solar-resource`
- Proveedor: `PVGIS v5.3 / PVcalc`
- Base informada: `PVGIS-ERA5`
- Normalización: 1 kWp, pérdidas 17 %, silicio cristalino y montaje edificio.
- Datos consultados **desde servidor**. No se solicitaron permisos de geolocalización.

## Respuestas HTTP observadas

| Sitio | Latitud | Longitud | Orientación / inclinación | HTTP | kWh/kWp/año |
|---|---:|---:|---|---:|---:|
| Antofagasta | -23.65 | -70.40 | N / 20° | 200 | 1834.63 |
| Rancagua | -34.17 | -70.74 | N / 25° | 200 | 1636.07 |
| Puerto Montt | -41.47 | -72.94 | N / 35° | 200 | 1228.20 |
| Rancagua | -34.17 | -70.74 | S / 25° | 200 | 1062.85 |
| Coordenadas inválidas | -200 | -70.74 | N / 25° | 400 | Rechazada |

Un primer intento de orientación sur devolvió 503 transitorio; el reintento posterior respondió 200. Esto **no** se disimula en la interfaz: el usuario ve un error controlado y puede continuar con valores manuales.

- El HTML del preview respondió HTTP 200.
- El primer despliegue de SQ-02 compiló y pasó tests pero falló en runtime por importación ESM sin extensión; está registrado y fue corregido reemplazando el enlace TS externo por un handler autónomo.
- En SHA `e308115...`, las pruebas del servidor se ejecutaron en el CI y el endpoint produjo 200/400 como corresponde.
- El flujo completo de navegador y aspecto móvil todavía no cuentan con inspección visual automatizada. Antes de fusionar a `main`, realizar QA en escritorio y Android.
- Tampoco existe aún comparación cuantitativa contra Explorador Solar Chile; no cerrar issue #2 hasta completar la comparación.

## Próximas verificaciones

1. Revisar accesibilidad, responsive y estados loading/error con navegador real.
2. Comparar PVGIS versus Explorador Solar Chile para al menos tres zonas.
3. Probar coordenadas limítrofes, proveedor no disponible, cobertura de islas, caching y límites de uso.
4. Definir protección contra abuso/rate limiting antes de abrir esta API a usuarios comerciales.
5. Documentar versión de base meteorológica y fecha en las cotizaciones finales.
