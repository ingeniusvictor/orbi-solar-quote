# ORBI Solar Quote — metodología provisional v0.3

**Estado:** prototipo orientativo. Consulta voluntaria a PVGIS v5.3 si se ingresan coordenadas; sin análisis de sombras de cubierta, perfil horario ni ingeniería aprobada. La consulta real no se ha validado aún contra producción en vivo.

## Cálculo energético

- Consumo anual = consumo mensual declarado × 12.
- Rendimiento anual por módulo = potencia módulo (kWp) × rendimiento solar anual editable (kWh/kWp/año) × (1 − pérdidas %) × factor de orientación.
- Orientación declarada: N=1, NE/NW=0.92, E/W=0.84, S=0.68. **Todos estos factores son aproximaciones provisionales**, no resultados de una simulación.
- Objetivo de dimensionamiento: 90% de la demanda anual on-grid, 100% híbrido, 125% off-grid. El 125% no garantiza autonomía en invierno.
- Paneles máximos = piso(superficie útil / m² por módulo), sin validar separaciones, cargas estructurales, pasillos ni distancias a bordes.
- Paneles mostrados = mínimo(paneles objetivo, paneles máximos).
- Curva mensual manual: perfil ilustrativo normalizado del hemisferio sur. Con PVGIS: 12 meses reales del modelo climático PVGIS para orientación, inclinación y pérdidas declaradas; no se duplican esos factores al dimensionar.
- Ver `docs/PVGIS_INTEGRATION.md` para supuestos y límites de los datos geográficos.

## Estimación comercial preliminar

Solo para on-grid/híbrido:

- Fracción hipotética de producción consumida en el sitio: 55% on-grid, 78% híbrido. Se limita al consumo anual.
- Excedente estimado = producción anual − autoconsumo estimado.
- Valor anual ilustrativo = autoconsumo × tarifa de compra editable + excedentes × tarifa de inyección editable.
- **No es una simulación horaria ni una liquidación contractual de Net Billing**. No considera cargos fijos, restricciones de compensación, saldos, IVA ni cambio futuro de tarifas.
- No se calcula payback ni costo de instalación antes de contar con un catálogo de precios validado.

## Baterías

- Híbrido: 60% del consumo diario × 1 día / (0.8 DoD × 0.9 eficiencia).
- Off-grid: 100% del consumo diario × 2 días / (0.8 DoD × 0.9 eficiencia).
- Se trata de un **estimado ilustrativo nominal**, no diseño de respaldo. Falta potencia pico, química, C-rate, climatología crítica, inversor/cargador y energía de invierno.

## Antes de una cotización profesional

1. Integrar radiación horaria por coordenadas y validar cobertura del proveedor.
2. Calcular orientación, inclinación, sombras y geometría real de cubierta.
3. Simular consumo horario y despacho de baterías.
4. Incorporar tarifas reales de distribuidora y normativa chilena vigente.
5. Configurar inventario de equipos, costos, mano de obra, impuestos y márgenes.
6. Agregar validaciones de factibilidad eléctrica, estructural y visita a terreno.

Los usuarios deben ver estas advertencias en la interfaz del MVP.

## SQ-03 — Simulación horaria sintética

Se añadió un despacho determinista a resolución de una hora para 365 días de un año no bisiesto. Cada mes se representa mediante días idénticos con una curva solar genérica, normalizada para respetar la energía mensual disponible (sea PVGIS PVcalc o manual). El usuario elige distribución horaria de consumo. El almacenamiento se rige por SOC mínimo del 20%, eficiencia de carga 95%, eficiencia de descarga 95% y límites de potencia declarados. No hay energía inicial gratuita: el SOC parte desde su reserva mínima.

El módulo informa energía fotovoltaica directa, carga/descarga, importación, inyección, excedente desaprovechado, demanda no suministrada y pérdidas. Su desglose económico es una **valorización ilustrativa de kWh**, no factura Net Billing, y solo se muestra para redes on-grid/híbridas. Ver `docs/SQ03_HOURLY_MODEL.md`.

Los antiguos cálculos heurísticos de ahorro en `calculateSolar` se mantienen como legado interno de SQ-01, pero **no se muestran como ahorro principal en pantalla**. El resumen principal ahora enlaza al análisis horario explícito. Se retirarán cuando se estabilice el nuevo contrato de resultados.
