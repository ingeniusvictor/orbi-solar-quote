# ORBI SQ-04D — Referencias Enertik / Voltronic para cotización (20-10-2026)

## Fuente, alcance y clasificación

Este catálogo usa **precios publicados en Enertik Chile**, consultados el 20 de octubre de 2026, **IVA incluido**, para el inversor y baterías. No afirma que los precios tengan vigencia contractual, disponibilidad, promoción permanente, despacho, garantía comercial particular ni instalación certificada. Los importes para módulos FV, estructuras, BOS, mano de obra, ingeniería y transporte continúan siendo **supuestos ficticios**.

Se utiliza `src/lib/enertik-presets.ts` como fixture de entrada (sin lectura en vivo durante la cotización). Los perfiles se eligen desde una interfaz editable. Toda sustitución de marca, modelo o proveedor debe conservar su nueva fuente documental; las URLs originales dejan de respaldar los campos cambiados.

### 1. Inversores

| Perfil | Producto | Batería CC nominal | Precio observado c/IVA | Nota |
| --- | --- | --- | ---: | --- |
| 3 kW | Voltronic Axpert VM II Premium+ Hybrid 3K 24V | 24 V | $371.200 | Enertik anuncia modo red/inyección; SEC aún sin verificar |
| 5 kW | Enertik IVMDP-5K-48 / Voltronic Axpert VM II Premium 5K | 48 V | $417.200 | **Inversor-cargador de respaldo MPPT, inyección NO acreditada** |
| 6,2 kW | Voltronic Axpert VM II Premium+ Hybrid 6.2K 48V | 48 V | $507.100 | **6200 W con solar+batería; 5000 W con batería sola**, según proveedor |
| 8 kW | Voltronic Axpert VM II Premium+ Hybrid 8K 48V | 48 V | $762.400 | Enertik anuncia modo red/inyección; SEC aún sin verificar |

Páginas originales:
- 3 kW: https://enertik.com/cl/tienda/inversores/inversores-cargadores/con-regulador-solar-mppt/inversor-cargador-mppt-hibrido-backup-24v-220v-3000w-voltronic-axpert-vm-ii-premium-hybrid-3k-24v/
- 5 kW: https://enertik.com/cl/tienda/inversores/inversores-cargadores/con-regulador-solar-mppt/inversor-y-cargador-de-baterias-mppt-48v-220v-5000w-premium/
- 6,2 kW: https://enertik.com/cl/tienda/inversores/inversores-cargadores/con-regulador-solar-mppt/inversor-cargador-mppt-hibrido-backup-48v-220v-6200w-2-salidas-voltronic-axpert-vm-ii-premium-hybrid-62k-48v/
- 8 kW: https://enertik.com/cl/tienda/inversores/inversores-cargadores/con-regulador-solar-mppt/inversor-cargador-mppt-hibrido-backup-48v-220v-8000w-voltronic-axpert-vm-ii-premium-hybrid-8k-48v/

### 2. Bancos de baterías LiFePO₄

| Perfil | Referencia | Unidades | Capacidad nominal total | Precio unitario observado c/IVA |
| --- | --- | ---: | ---: | ---: |
| 3 kW | Enertik/Taiyo EBL25.6-100, 25,6 V × 100 Ah, BMS 100 A | 2 | 5,12 kWh | $491.700 |
| 5 kW | Enertik/Taiyo EBL-R51.2-100-L, 51,2 V × 100 Ah, BMS 100 A | 2 | 10,24 kWh | $920.500 |
| 6,2 kW | Mismo banco rack 51,2 V | 2 | 10,24 kWh | $920.500 |
| 8 kW | Mismo banco rack 51,2 V | 3 | 15,36 kWh | $920.500 |

Páginas originales:
- 25,6 V: https://enertik.com/cl/tienda/baterias/litio/bateria-de-litio-taiyo-256v-100ah/
- 51,2 V: https://enertik.com/cl/tienda/baterias/litio/bateria-de-litio-taiyo-512v-100ah-5120wh/

Las cantidades son **semillas propuestas de diseño** para simulación económica y filtro de corriente, no recomendaciones finales certificadas. Banco y tensión nominal de batería deben coordinarse con corriente BMS admisible, operación en paralelo, configuración de comunicación RS485/CAN, perfil de carga y umbral mínimo por celda. Enertik informa compatibilidad de la batería rack 51,2 V con la familia Voltronic mediante protocolo RS485 Pylontech; **esto no confirma cada par de firmware/modelo**. La batería EBL25.6-100 admite hasta 4 unidades en serie o paralelo según ficha; usar aquí solo paralelo de 24 V.

### 3. Valores equipo + banco (incluyen IVA) de referencia

- 3 kW: inversor $371.200 + 2×$491.700 = **$1.354.600**.
- 5 kW: inversor $417.200 + 2×$920.500 = **$2.258.200**.
- 6,2 kW: inversor $507.100 + 2×$920.500 = **$2.348.100**.
- 8 kW: inversor $762.400 + 3×$920.500 = **$3.523.900**.

NO son precios llave en mano. Faltan módulos solares, estructuras, protecciones, mano de obra, transporte, impuesto/margen según factura/cotización, diseño y otras condiciones. Si se cambia margen o IVA dentro de la app, el total del cotizador puede diferir de la suma observada arriba.

### 4. Impuestos y precios editados

- Los **precios observados** incluyen IVA 19%; `netFromGross(gross,19) = round(gross/1.19)`. Ese valor neto alimenta `calculateQuote`, que calcula margen y luego el IVA editable de la propuesta. Por eso no se duplica IVA del proveedor.
- Por redondeo de pesos chilenos pueden existir diferencias de ± unos pocos pesos al reconstruir totales.
- Los campos `provider`, `inverterModel`, `batteryModel`, `inverterGrossClp`, `batteryGrossClp`, `batteryUnits`, `batteryNominalKwh`, `batteryNominalV`, `batteryMaxDischargeA`, `bankMaxParallelUnits` son editables en el formulario; no es necesario modificar código para usar otro proveedor.
- Al editar proveedor/modelo/precio se marca el valor como **editado**, no «precio publicado Enertik». La selección de nuevo perfil restablece los valores originales y limpia overrides de precios de inversor y batería.
- El presupuesto y PDF siguen siendo **DEMO / no cotización comercial** hasta verificar ofertas, SEC, ingeniería y vigencia.

### 5. Reglas de ingeniería y límites

El filtro de corriente estima `I_banco = P_AC / (V_nominal × 0.9)`. El 90% es eficiencia **supuesta** solo para cribado, no rendimiento certificado de equipos. Se compara con `unidades × corriente_continua_BMS`; no modela mínima tensión bajo carga, estado de carga, temperatura, reparto de corriente entre baterías ni cableado. No sustituye verificación de autonomía real, sistema de protección ni parametrización BMS.

**Diferenciar kW CA de inversor, kWp de módulos FV y kWh de batería** en la UI. El inversor 6,2 kW cae a 5 kW cuando opera solo con baterías, según la ficha Enertik. El 5 kW VM II Premium es inversor-cargador de respaldo y no se valida para Net Billing con inyección. Incluso las variantes Premium+ listadas con inyección no tienen autorización SEC validada para un proyecto específico.

El siguiente desarrollo puede incorporar APIs de otros proveedores, sincronización de stock y cotizaciones fechadas, pero ninguna API debe alterar el estado de «SEC no verificado» sin evidencia independiente.
