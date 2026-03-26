// ─── Valores de respaldo ──────────────────────────────────────────────────────
// Estos valores se usan SOLO si la API de OpenMRS no devuelve datos de la
// institución (systemsetting clinic.* o sessionLocation).
// En producción la institución se carga dinámicamente en AllOrdersDashboard.
export const dashboardConfig = {
  institution: {
    name: "Establecimiento de Salud",   // fallback genérico
    address: "",
    phone: "",
    email: ""
  },

  // ── Formularios de Bahmni FormBuilder ──────────────────────────────────────
  // Añadir aquí cada formulario que se quiera mostrar como una nueva pestaña.
  //
  // Cómo obtener los UUIDs:
  //   encounterTypeUuid → Admin > Manage Encounter Types (OpenMRS)
  //                       o GET /openmrs/ws/rest/v1/encountertype?q=<nombre>
  //   conceptDisplay    → el nombre exacto del concepto en OpenMRS (campo "display")
  //                       o GET /openmrs/ws/rest/v1/concept?q=<nombre>&v=custom:(display)
  //
  formSections: [
    // ── Ejemplo: Licencia Médica ─────────────────────────────────────────────
    // Descomentar y rellenar los UUIDs/nombres reales del sistema.
    // {
    //   key:              "sick_leave",           // id único, sin espacios
    //   label:            "Licencias Médicas",    // nombre del tab
    //   filePrefix:       "Licencia",             // prefijo del nombre del PDF
    //   tagColor:         "cyan",                 // color del Tag de Carbon
    //   encounterTypeUuid: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    //   fields: [
    //     // source: "encounterDate" → usa la fecha del encuentro (no concept)
    //     { label: "Fecha",           source: "encounterDate" },
    //     // conceptDisplay: nombre EXACTO del concepto en OpenMRS
    //     { label: "Diagnóstico",     conceptDisplay: "Diagnóstico" },
    //     { label: "Días de reposo",  conceptDisplay: "Días de reposo" },
    //     { label: "Médico",          conceptDisplay: "Nombre del médico" },
    //   ],
    // },
    //
    // ── Ejemplo: Certificado Médico ──────────────────────────────────────────
    // {
    //   key:              "medical_cert",
    //   label:            "Certificados Médicos",
    //   filePrefix:       "Certificado",
    //   tagColor:         "teal",
    //   encounterTypeUuid: "YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY",
    //   fields: [
    //     { label: "Fecha",           source: "encounterDate" },
    //     { label: "Motivo",          conceptDisplay: "Motivo del certificado" },
    //     { label: "Diagnóstico",     conceptDisplay: "Diagnóstico" },
    //     { label: "Observaciones",   conceptDisplay: "Observaciones" },
    //   ],
    // },
  ],

  professional: {
    showName: true,
    showSpecialty: true,
    showRut: true,
    showSignature: true
  },
  visualization: {
    headerColor: "#0f62fe",
    fontFamily: "'IBM Plex Sans', sans-serif"
  },
  endpoints: {
    laboratory: "/openmrs/ws/rest/v1/order?orderType=laboratory",
    medication: "/openmrs/ws/rest/v1/order?orderType=drug",
    imaging: "/openmrs/ws/rest/v1/order?orderType=radiology",
    procedure: "/openmrs/ws/rest/v1/order?orderType=procedure",
    referral: "/openmrs/ws/rest/v1/order?orderType=referral",
    certificates: "/openmrs/ws/rest/v1/obs",
    emailService: "/api/email/send"
  }
};
