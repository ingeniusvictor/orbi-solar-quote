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
