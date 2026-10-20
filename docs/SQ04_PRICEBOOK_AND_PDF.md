# ORBI SQ-04 — Catálogo demo, cálculo de precios y PDF

## Estado y objetivo

Primera integración de presupuestos en la pantalla de resultados. El usuario puede revisar cantidades, modificar precios y descargar un documento PDF **demostrativo**. No es una oferta comercial real ni un presupuesto SEC validado. No existen marcas, fichas técnicas, distribuidores ni precios de proveedores verificados.

## Datos demo (absolutamente ficticios)

El fichero `src/lib/quote.ts` incluye precios unitarios sintéticos y editables para:
- Módulos fotovoltaicos genéricos;
- un inversor genérico distinto para on-grid/híbrido/off-grid;
- baterías genéricas en bloques de 5 kWh nominales;
- fijaciones/montaje por módulo;
- protecciones y cableado en un paquete inicial;
- mano de obra por kWp;
- ingeniería/trámites de referencia;
- logística de referencia.

Estos valores **no deben publicarse como precios observados en Chile** y no constituyen una recomendación de producto. La cantidad de inversores se fija a uno por ahora independientemente de potencia: solo sirve para ejemplificar la mecánica. No existen verificaciones de compatibilidad, certificación SEC, potencia nominal del inversor, stringing, cortocircuito, peso, estructura o garantías.

## Cálculo económico

- `directNetClp = suma(round(q_i × precio_neto_unitario_i))`
- `marginClp = round(directNetClp × margen_pct / 100)`
- `netWithMarginClp = directNetClp + marginClp`
- `vatClp = round(netWithMarginClp × iva_pct / 100)`
- `grandTotalClp = netWithMarginClp + vatClp`
- Cantidad FV deriva del dimensionamiento inicial SQ-01.
- Capacidad de baterías: techo `ceil(capacidad_solicitada_kWh / 5)` unidades genéricas; **la capacidad presupuestada puede no coincidir con la configurada dentro del simulador horario**, ya que aún no existe una configuración de equipos unificada. El usuario debe revisar ambas.
- Por defecto: margen 10%, IVA editable 19% y precios sintéticos. Son parámetros de prueba, no compromisos tributarios ni condiciones comerciales.

## Archivo PDF

La librería `jsPDF` genera el PDF en el navegador mediante importación diferida (lazy). El PDF contiene:
- Marca ORBI y etiqueta `PRESUPUESTO DEMOSTRATIVO`;
- consumo declarado, generación estimada y fuente PVGIS/manual;
- sistema y capacidad FV/almacenamiento;
- partidas y costo unitario neto, margen, impuesto editado y total;
- exclusiones y advertencias de NO cotización/NO documento tributario.

La fecha se calcula localmente en el momento de la descarga. La comuna opcional se añade solo al PDF y puede contener datos proporcionados por el usuario; no se envía a backend por esta característica. El archivo **no se guarda** en una base de datos ORBI.

## Pruebas y verificación

Automatización:
- Casos de tres tipos de sistema, precios editables, batería redondeada, IVA/margen, cero módulos, entradas inválidas.
- Test de estructura PDF válida sin cuentas ni conexión de red.
- `npm test` y `npm run build` en GitHub Actions.
- QA manual: probar en móvil, exportación en Android, saltos de página, tablas anchas y acentos del PDF.

Limitaciones pendientes:
1. Catálogo genuino con marca/modelo/potencia/garantía, cotización de proveedores y vigencia.
2. Selección automática de inversores en función de potencia, tensiones MPPT y número de strings.
3. Unificar dimensionamiento y configuraciones de batería SQ-03 con la batería que se cotiza.
4. Regiones, transporte, mano de obra, impuestos, márgenes y exclusiones configurables por proyecto.
5. Guardar versiones aprobadas de presupuesto de modo autorizado, sin PII hasta revisión de seguridad.
6. Valorar ahorro por liquidación real de Net Billing solo tras tarifa y perfil horario validados.

Mantener PR en borrador, sin fusionar a `main` ni habilitar como cotizador comercial.

## Tasas y auditoría de seguridad

Se usa una tasa de IVA editable, inicialmente 19%, conforme a la tasa general informada por el SII:
https://www.sii.cl/preguntas_frecuentes/impuestos_mensuales/001_130_0572.htm
Esto no implica pronunciamiento tributario sobre cada producto/servicio.

La versión inicial `jspdf@^3.0.3` produjo alertas de seguridad y fue reemplazada por `jspdf@^4.2.1`, versión parcheada según advisories `GHSA-wfv2-pwc8-crg5` y `GHSA-f8cm-6447-x5h2`.
- Auditoría automática de dependencias productivas: `npm audit --omit=dev --audit-level=high` dentro de GitHub Actions; pasó en run 39511582080.
- El inventario global npm usado en el build de Vercel todavía reporta advertencias en dependencias no limitadas a producción (3: 1 moderada y 2 críticas); se requiere auditoría por paquete antes de homologar el pipeline. No afirmar auditoría global limpia.
- El generador PDF se importa dinámicamente solo al hacer clic.
