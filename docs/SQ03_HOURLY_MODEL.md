# ORBI-SQ-03 — Motor de balance energético a resolución de una hora

**Estado:** experimento local de balance de energía (v0.3). No equivale a datos horarios medidos ni a una cotización eléctrica/estructural aprobada.

## 1. Inputs y fuentes

- **Generación fotovoltaica:** exactamente 12 kWh/mes entregados por el motor SQ-02 (PVGIS PVcalc) o por estimación manual. PVGIS `PVcalc` proporciona los promedios *mensuales*, NO una serie horaria.
- **Demanda:** 12 veces el consumo mensual declarado por usuario. Perfil horario seleccionable: distribuido, diurno o vespertino/nocturno.
- **Curva solar artificial:** patrón normalizado de 24 horas con máxima producción hacia mediodía y cero fuera de 06:00–18:00. Su forma NO fue medida ni obtenida de PVGIS `seriescalc`.
- **Año calendario:** no bisiesto, con días reales por mes y 24 intervalos de 1 hora por día: 8.760 intervalos. Dentro de cada mes todos los días son idénticos; no hay clima diario, fines de semana ni variación estacional de la demanda.
- **Batería (híbrido y off-grid):** capacidad nominal kWh ajustable, potencia máxima carga/descarga kW ajustable; SOC mínimo 20%, eficiencia carga y descarga 95%, SOC inicial al mínimo. No se permite iniciar con energía ficticia.
- **Tarifas:** valores CLP/kWh introducidos por el usuario; no hay precios verificados de distribuidora ni consulta automática del contrato.

## 2. Despacho y conservación energética

En cada hora:

1. Se destina PV instantánea a alimentar la carga presente: `direct = min(PV, load)`.
2. Si sobra PV, se carga batería hasta el menor valor entre excedente PV, potencia cargador y energía disponible antes de capacidad nominal, considerando 95% de eficiencia de carga.
3. Si falta energía, se descarga batería hasta el menor valor entre déficit, potencia inversor y energía útil por encima del SOC mínimo, considerando 95% de eficiencia de descarga.
4. En sistemas conectados, el remanente se importa de red o se inyecta. En off-grid, el excedente se considera limitado/desaprovechado y la carga no atendida queda como **energía no suministrada**.

Invariantes (kWh):

- `PV = PV_directa + carga_entrada_batería + inyección + recorte`
- `Consumo = PV_directa + descarga_batería_entregada + importación + carga_no_atendida`
- `Carga_entrada = descarga_entregada + pérdidas_batería + (SOC_final - SOC_inicial)`

La batería **no exporta energía** en esta simulación (solo cubre demanda interna). No incluye despacho económico, corte de red, límite de potencia de interconexión, horarios tarifarios ni restricciones de importación.

## 3. Interpretación y Net Billing en Chile

- En **on-grid** y **híbrido** se presenta un *valor energético anual ilustrativo*: `(autoconsumo directo + energía solar entregada por batería) × tarifa de compra + energía inyectada × tarifa de excedentes`.
- La fórmula **no es liquidación de facturas**, saldo compensable, contrato de venta, impuesto, remanente remunerable ni evaluación financiera. Ninguna cifra debe presentarse como ahorro garantizado.
- En **off-grid** no se presenta ahorro económico ni ingresos por excedentes. La presencia de demanda no atendida es una alerta técnica, no una estimación de fiabilidad de servicio bajo clima extremo.
- En la interfaz se indica de forma explícita cuándo la producción mensual viene de PVGIS o de supuestos manuales, pero la distribución por hora permanece sintética **en ambos casos**.

Normas y marco oficiales:

- SEC Generación Distribuida Autoconsumo: https://www.sec.cl/GDA/
- SEC Marco Regulatorio (Leyes 20.571 y 21.118, DS 57, almacenamiento RGR 06): https://www.sec.cl/gda/marco-regulatorio/
- Ministerio de Energía Reglamento GD autoconsumo: https://energia.gob.cl/node/8760
- PVGIS hourly `seriescalc` para futura integración: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-tools/hourly-radiation_en

## 4. Pruebas y criterios de aceptación

- Verificar exactamente 12 meses, perfiles horarios normalizados y conservación energética PV/cargas.
- Comprobar que batería híbrida reduce importación si existe excedente, pero añade pérdidas.
- Confirmar que `on-grid` no activa almacenamiento incluso si recibe capacidad no nula.
- Confirmar que `off-grid` no importa ni inyecta y reporta demanda no atendida.
- Comprobar límites de SOC y potencia, inputs inválidos y escenario de generación nula.
- Cálculos reproducibles sin red, geolocalización, datos de usuario ni proveedores externos.
- El Quality Gate (`npm test`, `npm run build`) y el preview deben pasar antes de considerar el PR listo.
- La navegación y representación móvil siguen requiriendo QA visual.

## 5. Pendientes antes de Net Billing comercial y autonomía real

1. Integrar `PVGIS /seriescalc` o fuente horaria verificada, con año meteorológico, timestamps, huso horario de Chile y DST consistente.
2. Importar perfil real horario desde medidor o consumo histórico, con consentimiento y protección de información personal.
3. Simular pérdidas, clipping de inversor, potencia de arranque, profundidad admisible por fabricante, SOC inicial/cierre anual, ciclos, degradación, restricciones de respaldo y días nublados consecutivos.
4. Confirmar tarifa distribuidora/cliente, regulación vigente, valorización real de inyecciones y remanentes contractuales.
5. Añadir pruebas numéricas de referencia con escenarios independientes y cotizaciones revisadas por profesionales habilitados.
