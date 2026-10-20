# SQ-02 — Integración geográfica PVGIS v5.3 (Chile continental)

## Alcance

La interfaz consulta voluntariamente un endpoint propio (`GET /api/solar-resource`) alojado en Vercel. El servidor consulta la API de PVGIS v5.3 (`PVcalc`) con potencia normalizada **1 kWp**, cubierta integrada, módulos de silicio cristalino, inclinación, orientación y pérdidas introducidas por usuario.

- Documentación: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en
- Entrada: latitud decimal, longitud decimal, inclinación [0,90], pérdidas [0,50], orientación N/NE/NW/E/W/S.
- Azimut PVGIS: sur 0°, oeste 90°, este -90°, norte 180°. Este detalle es crítico en Chile.
- Salida: `outputs.monthly.fixed[].E_m` en kWh/mes para 1 kWp. La suma determina el rendimiento anual. Se registra base meteorológica si aparece en respuesta.
- Dimensionamiento: rendimiento por módulo = potencia nominal de módulo (kWp) × rendimiento calculado PVGIS en kWh/kWp. **No aplicar otra vez la pérdida o factor de orientación:** PVGIS ya considera esos parámetros.
- Perfil mensual: se multiplica cada mes del proveedor por la potencia total instalada. No se utiliza la curva estacional sintética.
- Sistema híbrido y off-grid: PVGIS PVcalc **solo estima energía PV de un arreglo conectado a la red**. No ofrece despacho horario, autonomía, excedentes reales ni batería física para esos casos.

## Restricciones técnicas y de privacidad

- Solo Chile continental aproximado por rangos latitud/longitud; no equivale a validación cartográfica de fronteras. Islas y otras zonas fuera del rango son materia de próxima ampliación.
- PVGIS bloquea CORS/AJAX desde navegadores: la llamada la hace exclusivamente el servidor.
- URL upstream de host fijo, sin proxy arbitrario; entradas validadas; timeout 13 s; cache Vercel 1 día, sin persistir coordenadas en BD.
- La interfaz NO obtiene geolocalización del dispositivo ni envía la comuna escrita.
- Tarifa y cálculo económico siguen siendo ejemplos; sin perfil horario no se estima ahorro contractual real.
- En error de proveedor se muestra el error y se mantiene el modo manual identificado como tal.
- Los resultados dependen de bases meteorológicas históricas y no son lecturas del presente ni diseño constructivo.

## Pruebas

`npm test` cubre azimut, rangos de entrada, respuesta con 12 meses, error del proveedor y que las pérdidas/orientación no se dupliquen en el motor solar.

## QA pendiente antes de pasar a main

1. Comprobar en preview que el endpoint puede devolver datos reales en Rancagua, Antofagasta y Puerto Montt.
2. Verificar respuesta del proveedor desde Vercel (aquí no contamos con respuesta real accesible mediante la herramienta de pruebas).
3. Revisar interfaz responsive y comportamiento ante errores y cambios de orientación.
4. Comparar salidas de PVGIS con Explorador Solar de Chile para al menos tres ubicaciones.
5. Evaluar costos y límites de proveedores antes de habilitar uso comercial.
