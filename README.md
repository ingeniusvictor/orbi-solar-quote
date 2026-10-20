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

No se utilizarán datos reales de clientes en la etapa inicial. No hay conexión a sistemas de pago, geolocalización, Supabase ni APIs fotovoltaicas todavía.

## SQ-02 — Datos solares por coordenadas

Se agregó una integración optativa con PVGIS v5.3 desde el backend de Vercel (`/api/solar-resource`), con entrada manual de coordenadas continentales, inclinación y orientación. El uso del API depende de conectividad y cobertura real del proveedor. En errores, el cálculo vuelve a la metodología manual identificada como tal; no se recolectan coordenadas sin acción del usuario.

Más información: [Metodología PVGIS](docs/PVGIS_INTEGRATION.md).
