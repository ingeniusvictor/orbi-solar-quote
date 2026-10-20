# ORBI SQ-04C — Inversores y BESS con datos trazables

**Estado:** catálogo técnico experimental y cribado de riesgos, sin aprobación SEC, sin precios del fabricante y sin compatibilidad certificada.

## Fuentes primarias verificadas (20-10-2026)

### Inversores GoodWe
1. **GW5000-DNS-30**: equipo on-grid 5 kW AC, máximo 600 V CC, entrada 16 A por MPPT, 2 MPPT y 1 string por MPPT. Especificaciones web por GoodWe US: https://us.goodwe.com/dns-g3 . La ficha regional US no prueba configuración/registro chileno, ni AFCI ni homologación.
2. **GW5000-EH**: equipo híbrido monofásico 5 kW AC, PV máxima 6650 W, tensión FV máxima 580 V, rango MPPT 100-550 V, 2 MPPT, corriente de entrada por MPPT 12.5 A, corriente Isc máxima por MPPT 15.2 A, batería 85-460 V y hasta 25 A de carga/descarga. Fuente oficial PDF: https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_EH_Datasheet-EN.pdf (GoodWe EH 20230726 EN V2.1). No confirmar AFCI/SEC ni lista específica de baterías por esta ficha.

### Baterías BYD HVS, versión de ficha 2024-12-12
Fuente oficial: https://bydbatterybox.com/uploads/downloads/241212_Datasheet_Battery-Box%20HVS_V1.4_EN-675a34b4e7bfb.pdf
- **HVS 5.1:** LFP, energía útil en CC 5.12 kWh, tensión nominal 204.8 V, tensión de operación 160-240 V, 2 módulos HVS.
- **HVS 10.2:** LFP, energía útil en CC 10.24 kWh, tensión nominal 409.6 V, tensión de operación 320-480 V, 4 módulos HVS.
- La energía útil CC de ficha no equivale al almacenamiento nominal genérico del presupuesto ni a energía final útil AC.
- La ficha exige consultar la *lista de inversores compatibles* (cantidad de módulos, BMS, firmware, revisión de modelo). **No se ha contrastado esa lista con el GW5000-EH**.

### Cumplimiento en Chile
- AFCI para nuevos TE4 desde 01-01-2026 según SEC, o proyecto especial con protección externa autorizada; NO deducir cumplimiento de la ficha internacional: https://www.sec.cl/gda/marco-regulatorio/
- Registro de equipos autorizados: https://www.sec.cl/gda/equipamiento-autorizado/
- RGR 06/2024 para BESS: https://www.sec.cl/almacenamiento-de-energia-a-traves-de-baterias-bess/

## Reglas que sí implementa el motor

`src/lib/equipment-catalog.ts` contiene parámetros eléctricos conocidos y **solo** genera alertas:
- Bloquea intento de usar un inversor solo on-grid con batería.
- Bloquea usar una selección de equipo con batería en escenario on-grid puro.
- Bloquea presentar como apto para off-grid un inversor no validado para operación aislada permanente.
- Bloquea ausencia de interfaz/rango de batería, o rangos completamente disjuntos.
- Advierte si la tensión operativa de batería **no queda íntegramente** dentro del rango del inversor: HVS 10.2 (320-480 V) excede el máximo declarado de GoodWe EH (460 V), mientras HVS 5.1 (160-240 V) queda dentro.
- **Coincidencia de rangos no significa compatibilidad**. En todos los casos BMS, SEC y AFCI permanecen `unverified`.
- Con módulo Trina usa coeficiente de Voc por temperatura a −10 °C de célula para mostrar máximo MATEMÁTICO de módulos por voltaje FV. Nunca genera strings aceptados. Revisa límites MPPT y corrientes conocidos, y detecta exceso de potencia de entrada FV para revisión, sin concluir aprobación.
- Con módulo genérico sin ficha retorna `insufficient-data` siempre que faltan parámetros.

## Integración con presupuesto/PDF

La elección de inversor y batería es una **referencia de catálogo** que se muestra opcionalmente en el PDF bajo «Equipos SOLO referencia». Las líneas de inversión del presupuesto siguen siendo *genéricas, ficticias*; **no** representan el precio, cantidad, montaje ni BMS del modelo seleccionado. No se unificó todavía el dimensionamiento BESS con la batería referencial. Las cantidades reales son materia de SQ-04D y futura ingeniería.

## QA
- Tests unitarios de fuentes, ventanas de tensión, decisiones de bloqueo, PV fría, ausencia de ficha y no aprobación SEC.
- Playwright Chromium escritorio y Pixel 7 emulado: seleccionar módulo Trina, GoodWe DNS, BYD 5.1 (bloqueo); elegir híbrido + DNS (bloqueo); cambiar a EH y BYD 5.1 (solo coincidencia), después BYD 10.2 (advertencia); descargar PDF y comprobar referencias pero no llamarlas cotización.
- Queda pendiente ensayo en Android físico, inspección independiente de BOM, validación real lista OEM, SEC, precios y licencias antes de comercializar.
