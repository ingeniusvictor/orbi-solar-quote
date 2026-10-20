# ORBI Solar Quote

Cotizador fotovoltaico preliminar desarrollado por ORBI Ecosystem para Chile.

> **Estado:** primera versión en desarrollo. Toda estimación inicial debe mostrarse con sus supuestos; no sustituye una visita técnica ni la ingeniería de detalle.

## Objetivo

Aplicación web responsive (Vite + React + TypeScript) preparada para desplegarse en Vercel y, posteriormente, reutilizar la interfaz con Capacitor en Android.

## Flujo previsto

1. Registrar consumo eléctrico y tarifa de referencia.
2. Declarar información básica de cubierta, orientación y superficie disponible.
3. Comparar escenarios on-grid, híbrido y off-grid.
4. Presentar resultados preliminares, transparencia de supuestos y siguientes pasos.

## Desarrollo

Los cambios funcionales se trabajarán en ramas y pull requests. La rama principal permanece como punto de integración revisado.

## Aviso técnico

En esta etapa no hay cuentas, pagos, Supabase ni datos reales de clientes almacenados en una base de datos. La consulta voluntaria de coordenadas sí usa el backend de Vercel para llamar a PVGIS; no se solicita ubicación precisa del dispositivo ni se guarda una dirección en la aplicación. Antes del uso comercial hay que validar privacidad, límites de uso y resistencia ante abuso.

## SQ-02 — Datos solares por coordenadas

Se agregó una integración optativa con PVGIS v5.3 desde el backend de Vercel (`/api/solar-resource`), con entrada manual de coordenadas continentales, inclinación y orientación. El uso del API depende de conectividad y cobertura real del proveedor. En errores, el cálculo vuelve a la metodología manual identificada como tal; no se recolectan coordenadas sin acción del usuario.

Más información: [Metodología PVGIS](docs/PVGIS_INTEGRATION.md).

## SQ-03 — Balance horario y baterías (experimental)

El simulador incluye un balance energético horario de **365 días sintéticos**. Distribuye la producción mensual en un día solar representativo y permite seleccionar perfiles de demanda diurno/equilibrado/vespertino. Para sistemas híbridos o aislados configura capacidad de batería, potencia de carga y descarga. No utiliza todavía series PVGIS horarias, consumos del medidor, degradación de batería ni la liquidación real de Net Billing. Un caso off-grid puede mostrar energía no suministrada: **no es una garantía de autonomía**.

Detalle: [Método SQ-03](docs/SQ03_HOURLY_MODEL.md).

## SQ-03B — Generación horaria PVGIS (histórica)

Tras consultar PVGIS por coordenadas, el usuario puede solicitar la serie modelada de **8.760 horas de 2023** (`seriescalc`). La generación solar horaria proviene de PVGIS cuando el servicio responde; el perfil de demanda sigue siendo hipotético. Si falla la llamada, la UI permanece en modo sintético claramente señalado. Detalles: [SQ-03B](docs/SQ03B_PVGIS_HOURLY.md).

## SQ-04 — Catálogo económico editable y PDF

El MVP incorpora un presupuesto en CLP elaborado mediante un catálogo **totalmente ficticio** de módulos, inversor, batería, fijaciones, protecciones, ingeniería, mano de obra y logística. Se pueden editar precios unitarios netos, margen, IVA de referencia y capacidad nominal de batería; el cálculo se rehace de forma determinista con pruebas.

El botón **Descargar PDF de demostración** genera un archivo directamente en el navegador, sin cuenta y sin guardar datos en el servidor. El documento contiene la composición, IVA y exclusiones, y advierte de manera destacada que **NO constituye una cotización comercial real ni una factura**.

Hasta contar con fichas técnicas, modelos seleccionados y precios de proveedores, no es correcto ofrecer estos resultados como precios del mercado. Ver `docs/SQ04_PRICEBOOK_AND_PDF.md`.

## SQ-04B — Primer módulo con datos técnicos del fabricante

Se puede alternar entre una referencia genérica sin ficha y **Trina Solar TSM-450 NEG9R.28**, cuyos datos de potencia, superficie y parámetros eléctricos provienen de la ficha oficial TSM_ESP_2024_C. La selección cambia realmente el dimensionamiento energético y de techo. Se añade una holgura geométrica del 10% por módulo para el cálculo preliminar; no equivale a un diseño de posiciones sobre cubierta.

El comparador de string muestra únicamente una referencia aritmética usando el inversor GoodWe GW5000-DNS-30, **sin aprobar compatibilidad, AFCI, perfil de red ni autorización SEC chilena**. Todo equipo debe comprobarse en el registro oficial de la SEC antes de TE4 (incluida la obligación AFCI vigente desde 2026). Los costos siguen siendo **100% ficticios**, aun cuando el módulo técnico sea real.

QA de navegador y PDF: `npm run test:e2e` (Playwright, Chromium). El artefacto de GitHub Actions incluirá captura PNG del resultado y PDF descargado para inspección posterior.

## SQ-04C — Inversores y BESS con fichas reales

Se añadió un **catálogo técnico separable del presupuesto**: GoodWe GW5000-DNS-30 on-grid, GoodWe GW5000-EH híbrido y baterías BYD Battery-Box HVS 5.1 (5,12 kWh CC) / HVS 10.2 (10,24 kWh CC). Sus datos derivan de fichas de fabricante identificadas en `docs/SQ04C_INVERTER_BESS.md`.

Se examina orientativamente tensión FV máxima, corrientes MPPT, potencia PV de entrada, tipo de interfaz de batería y coincidencia de ventanas de voltaje. **NUNCA se aprueba compatibilidad por mera coincidencia de voltajes**: falta lista OEM de BMS/firmware, autorización SEC/AFCI y proyecto eléctrico. El inversor on-grid con batería y una propuesta aislada sin validación se bloquean. Las referencias técnicas se incluyen solo informativamente en el PDF, y **no reemplazan las partidas genéricas ni fijan precios**.
