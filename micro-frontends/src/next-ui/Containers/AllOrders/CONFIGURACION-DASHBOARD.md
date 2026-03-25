# Configuración del Dashboard: Órdenes del Paciente (`allOrdersReact`)

## ¿Qué hace este dashboard?

Muestra **todas las órdenes del paciente** agrupadas por tipo (Laboratorio, Imagenología, Medicamentos, Procedimientos, Derivaciones) en un panel con pestañas.

Incluye:
- 📋 **Tabla paginada** por cada tipo de orden con botón de detalle e imprimir
- 🖨️ **Vista de impresión** con cabecera institucional
- 📧 **Botón Compartir** → envía un resumen por correo al email registrado del paciente usando el sistema de correos nativo de Bahmni (`/openmrs/ws/rest/v1/patient/{uuid}/send/email`)

---

## Paso 1 — Añadir la sección al `standard-config`

Abre tu archivo `standard-config` (o el JSON de configuración de dashboards de tu instancia Bahmni) y añade la siguiente sección dentro del objeto `"sections"` del tab donde quieras que aparezca (por ejemplo, dentro de `"general"`):

```json
"allOrdersDashboard": {
    "title": "Órdenes del Paciente",
    "name": "allOrders",
    "type": "allOrdersReact",
    "displayOrder": 25,
    "isObservation": false,
    "hideEmptyDisplayControl": false,
    "translationKey": "DASHBOARD_TITLE_ALL_ORDERS_KEY"
}
```

### Ejemplo completo en el tab `"general"`

```json
{
    "general": {
        "translationKey": "DASHBOARD_TAB_GENERAL_KEY",
        "displayByDefault": true,
        "maxRecentlyViewedPatients": 10,
        "sections": {
            "patientInformation": { ... },
            "diagnosis": { ... },
            "treatments": { ... },

            "allOrdersDashboard": {
                "title": "Órdenes del Paciente",
                "name": "allOrders",
                "type": "allOrdersReact",
                "displayOrder": 25,
                "isObservation": false,
                "hideEmptyDisplayControl": false,
                "translationKey": "DASHBOARD_TITLE_ALL_ORDERS_KEY"
            }
        }
    }
}
```

> **Nota**: El `displayOrder` 25 lo posiciona al final de las secciones existentes (ips-react=23, ips-icvp-react=24). Ajústalo según necesites.

---

## Paso 2 — Añadir las claves de traducción

### `public/i18n/locale_es.json`

```json
"DASHBOARD_TITLE_ALL_ORDERS_KEY": "Órdenes del Paciente"
```

### `public/i18n/locale_en.json`

```json
"DASHBOARD_TITLE_ALL_ORDERS_KEY": "Patient Orders"
```

También en los archivos de i18n de la UI de Angular (`ui/app/i18n/`).

---

## Paso 3 — Compilar y desplegar

```bash
cd micro-frontends
yarn build
```

Los archivos compilados quedan en:
```
ui/app/micro-frontends-dist/
├── next-ui.min.js
└── next-ui.min.css
```

Copia estos archivos al servidor Bahmni y recarga la aplicación.

---

## Arquitectura del componente

```
AllOrdersDashboard (React)
│
├── Pestaña Laboratorio    ← ordenes tipo "Lab Order"
├── Pestaña Imagenología   ← ordenes tipo "Radiology Order"
├── Pestaña Medicamentos   ← ordenes tipo "Drug Order"
├── Pestaña Procedimientos ← ordenes tipo "Procedure Order"
├── Pestaña Derivaciones   ← ordenes tipo "Referral Order"
│
├── Modal Detalle          ← muestra detalles de una orden
├── Modal Compartir        ← envía correo via Bahmni email API
└── Vista Impresión        ← solo visible al imprimir (CSS @media print)
```

## Integración Angular → React

| Archivo Angular | Qué hace |
|---|---|
| `dashboardSection.js` | Registra `"allOrdersReact"` como `reactDisplayControl` → redirige a `nextUISection.html` |
| `nextUISection.html` | Renderiza `<mfe-next-ui-all-orders-dashboard>` cuando `section.type === 'allOrdersReact'` |
| `dashboard.js` | Prepara `$scope.allOrdersData` (patient, provider, activeVisit) y `$scope.allOrdersApi` |
| `next-ui/index.js` | Registra `AllOrdersDashboard` vía `bridge-builder` con el nombre `mfeNextUiAllOrdersDashboard` |

## Servicio de correo

El botón **"Compartir"** llama al endpoint nativo de Bahmni:

```
POST /openmrs/ws/rest/v1/patient/{patientUuid}/send/email
Content-Type: application/json

{
  "mailAttachments": [],
  "subject": "Órdenes médicas – {paciente} – {fecha}",
  "body": "... texto plano con todas las órdenes ...",
  "cc": [],
  "bcc": []
}
```

El servidor Bahmni envía el correo al email registrado del paciente en sus atributos de persona. El campo "email registrado" que se muestra en el modal se resuelve del atributo `email` / `correo` del paciente.

---

## Activar las llamadas reales a la API de órdenes

Actualmente el componente usa **datos mock**. Para conectar con la API real, descomenta el bloque `PRODUCCIÓN` en `AllOrdersDashboard.jsx`:

```javascript
// En loadAllOrders(), reemplaza el bloque MOCK por:
const [lab, img, med, proc, ref] = await Promise.all([
  fetch(`/openmrs/ws/rest/v1/order?orderType=Lab Order&patient=${patientUuid}&v=full`),
  fetch(`/openmrs/ws/rest/v1/order?orderType=Radiology Order&patient=${patientUuid}&v=full`),
  fetch(`/openmrs/ws/rest/v1/bahmnicore/drugOrders?patientUuid=${patientUuid}`),
  fetch(`/openmrs/ws/rest/v1/order?orderType=Procedure Order&patient=${patientUuid}&v=full`),
  fetch(`/openmrs/ws/rest/v1/order?orderType=Referral Order&patient=${patientUuid}&v=full`),
]);
```

Los `orderType` deben coincidir con los configurados en tu instancia OpenMRS/Bahmni.

