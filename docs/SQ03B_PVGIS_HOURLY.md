# SQ-03B — Serie PVGIS horaria histórica (implementación experimental)

## Objetivo y fuentes

ORBI SQ-03B consulta explícitamente `PVGIS 5.3 /seriescalc`, con `pvcalculation=1`, `peakpower=1`, `startyear=endyear=2023`, `mountingplace=building`, `trackingtype=0`, `pvtechchoice=crystSi` y orientación/inclinación/pérdidas del usuario. Los datos se consultan **solo cuando el usuario pulsa «Consultar 8.760 horas»** en la pantalla de resultados después de la consulta PVGIS mensual.

Fuente oficial: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en

- `PVcalc` (SQ-02) entrega **promedio mensual representativo de su base meteorológica**.
- `seriescalc` (SQ-03B) entrega **salida FV horaria modelada del año histórico 2023**. Las dos producciones anuales no tienen por qué coincidir.
- `P` de `seriescalc` se expresa en **W de potencia FV por 1 kWp instalado**. Un promedio horario en W multiplicado por 1 h equivale a Wh; se divide entre 1000 para pasar a kWh por hora y kWp.
- Los `time` originales se expresan en **UTC**, con formato `YYYYMMDD:HHMM`. Se exige que las 8.760 horas sean cronológicas, completas y sin duplicados, lo que permite validar que el año no bisiesto esté cubierto.
- Para calcular la coincidencia entre consumo eléctrico y producción FV, cada hora UTC se convierte a hora civil **America/Santiago**, incluida la transición de horario de verano, mediante `Intl.DateTimeFormat`.
- Por diseño experimental, **la demanda mensual se normaliza por mes UTC**, para conservar 12 veces el consumo mensual declarado sin inventar demanda al cruzar fronteras de año. Por esto, el desglose mensual no constituye una facturación por calendario civil chileno.

## Arquitectura y seguridad

1. Navegador → `GET /api/solar-hourly` de Vercel con latitud, longitud, inclinación, pérdidas y orientación.
2. El handler solo consulta `https://re.jrc.ec.europa.eu/api/v5_3/seriescalc`; no acepta URLs arbitrarias ni un año arbitrario.
3. Timeout 25 s, `maxDuration: 30`, caché pública 7 días únicamente si la respuesta es exitosa. Los resultados se transmiten como 8.760 valores de kWh/kWp más metadatos.
4. El parser valida rango de coordenadas aproximado del Chile continental, formato y continuidad temporal, potencia no negativa y rangos numéricos.
5. El navegador valida integridad de respuesta y ejecuta el motor determinista local sin guardar coordenadas ni consumo en base de datos.
6. Si la API PVGIS no responde, se muestra un error; el balance continúa con distribución horaria **sintética**, explícitamente identificada. No se falsean valores horarios.

## Límites importantes

- La generación es **modelada, no medida en terreno**. No incorpora obstáculos locales, geometría real de cubierta ni aprobación eléctrica.
- El consumo horario sigue siendo una **hipótesis seleccionada por el usuario**, NO una curva histórica de medidor ni un consumo tarifario real.
- Batería mantiene supuestos SQ-03 (SOC mínimo 20%, eficiencia carga y descarga 95%, capacidad/potencia editables).
- Chile cambia horarios civiles. El modelo usa `America/Santiago` pero no reproduce necesariamente los períodos de facturación de una distribuidora ni identifica feriados reales.
- No incluye tarifa eléctrica horaria, cargos fijos, compensación de saldos, límite de inyección, liquidación real de Net Billing ni rentabilidad financiera.
- Año 2023 fue fijado deliberadamente para comparar resultados reproducibles; el modelo no representa el pronóstico meteorológico ni la climatología promedio multianual.

## Criterios de revisión

- [ ] Pruebas unitarias, compilación y pruebas de endpoint.
- [ ] Probar seriescalc real en Rancagua (2023), comprobar 8.760 muestras, conversión de W→kWh e integridad.
- [ ] Validar vista previa en Vercel y diferencia visible entre «curva sintética» y «generación horaria PVGIS».
- [ ] Comparar series solares y balance con una herramienta energética independiente.
- [ ] QA real de Android/escritorio en un navegador.
- [ ] Incorporar controles antiabuso/rate limiting antes de habilitar a escala comercial.
