export const dashboardConfig = {
  institution: {
    name: "Hospital Clínico San Borja Arriarán",
    logoUrl: "/bahmni/images/hcsba-logo.png", // Ajustar ruta según corresponda
    address: "Santa Rosa 1234, Santiago, Chile",
    phone: "+56 2 2574 9000",
    email: "contacto@hcsba.cl"
  },
  professional: {
    // Configuración de qué datos mostrar del profesional
    showName: true,
    showSpecialty: true,
    showRut: true,
    showSignature: true // Si existe firma digitalizada
  },
  visualization: {
    // Colores, temas, etc.
    headerColor: "#0f62fe", // Carbon Blue 60
    fontFamily: "'IBM Plex Sans', sans-serif"
  },
  endpoints: {
    // Endpoints para obtener las órdenes (ejemplos)
    laboratory: "/openmrs/ws/rest/v1/order?orderType=laboratory",
    medication: "/openmrs/ws/rest/v1/order?orderType=drug",
    imaging: "/openmrs/ws/rest/v1/order?orderType=radiology",
    procedure: "/openmrs/ws/rest/v1/order?orderType=procedure",
    referral: "/openmrs/ws/rest/v1/order?orderType=referral", // Ajustar orderType según corresponda
    certificates: "/openmrs/ws/rest/v1/obs", // Ajustar endpoint para certificados
    emailService: "/api/email/send" // Endpoint hipotético para envío de correos
  }
};
