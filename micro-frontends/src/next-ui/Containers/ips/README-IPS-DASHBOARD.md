# IPS Display Control - Dashboard

Este documento explica cómo usar y configurar el **IPS (International Patient Summary) Display Control** en Bahmni.

## 📋 Descripción

El IPS Display Control es un dashboard completo que muestra un resumen internacional del paciente, incluyendo:

- **Inmunizaciones/Vacunas**: Historial de vacunación del paciente
- **Alergias**: Alergias conocidas con severidad y reacciones
- **Medicamentos Actuales**: Medicamentos que el paciente está tomando actualmente
- **Diagnósticos**: Diagnósticos activos e históricos
- **Procedimientos Recientes**: Procedimientos médicos realizados

## 🚀 Configuración

### 1. Configuración en el Dashboard de Bahmni

Para agregar el IPS Dashboard a una página en Bahmni, agregue la siguiente configuración en el archivo de configuración del dashboard:

```json
{
  "title": "IPS LAC",
  "name": "ips",
  "type": "ipsReact",
  "displayOrder": 1,
  "isObservation": false,
  "hideEmptyDisplayControl": false,
  "translationKey": "DASHBOARD_TITLE_IPS_LAC_KEY"
}
```

### 2. Configuración de Datos del Host

El componente espera recibir los siguientes datos a través de `hostData`:

```javascript
$scope.ipsData = {
  patient: {
    uuid: "patient-uuid",
    display: "Nombre del Paciente"
  },
  provider: {
    uuid: "provider-uuid", 
    display: "Dr. Nombre"
  },
  activeVisit: {
    uuid: "visit-uuid",
    visitType: {
      display: "Tipo de Visita"
    }
  }
};
```

### 3. Configuración de API del Host

El componente puede usar las siguientes APIs a través de `hostApi`:

```javascript
$scope.ipsApi = {
  navigation: {
    ipsDetails: function(section, itemId) {
      // Navegar a detalles específicos
      $location.path("/ips/" + section + "/" + itemId);
    }
  },
  ipsService: {
    generateDocument: function(patientUuid) {
      // Generar documento IPS
      return ipsService.generateDocument(patientUuid);
    }
  }
};
```

### 4. Configuración Completa en el Controlador

```javascript
// En tu controlador Angular
angular.module("bahmni.clinical")
  .controller("IpsController", ["$scope", "$location", "patientService", "visitService", "ipsService",
    function($scope, $location, patientService, visitService, ipsService) {
      
      // Datos del host para el microfrontend
      $scope.ipsData = {
        patient: patientService.getPatient(),
        provider: $scope.currentProvider,
        activeVisit: visitService.getActiveVisit()
      };

      // API del host para el microfrontend
      $scope.ipsApi = {
        navigation: {
          ipsDetails: function(section, itemId) {
            $location.path("/patient/" + $scope.patient.uuid + "/ips/" + section + "/" + itemId);
          }
        },
        ipsService: {
          generateDocument: function(patientUuid) {
            return ipsService.generateDocument(patientUuid).then(function(response) {
              // Manejar respuesta (descargar PDF, mostrar enlace, etc.)
              window.open(response.data.documentUrl, '_blank');
            });
          }
        }
      };
    }
  ]);
```

## 🎨 Personalización de Estilos

### Estilos CSS Personalizados

Puedes personalizar la apariencia del dashboard agregando CSS personalizado:

```css
/* Personalizar colores de estado */
.ips-display-control .bx--tag[data-type="red"] {
  background-color: #your-red-color;
  color: #your-text-color;
}

/* Personalizar layout de secciones */
.ips-display-control .ips-section {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Personalizar información del paciente */
.ips-display-control .ips-patient-info .bx--tile {
  background: linear-gradient(135deg, #f4f4f4, #e8e8e8);
}
```

### Temas Dark/Light

El componente incluye soporte automático para temas dark usando el atributo `data-carbon-theme`:

```html
<!-- Para tema dark -->
<div data-carbon-theme="g100">
  <!-- Tu dashboard aquí -->
</div>
```

## 🌐 Internacionalización

### Agregar Nuevos Idiomas

Para agregar soporte para un nuevo idioma, cree un archivo `locale_[código].json` en `public/i18n/`:

```json
{
  "DASHBOARD_TITLE_IPS_LAC_KEY": "Tableau de Bord IPS LAC",
  "IPS_VACUNAS_TITLE": "Immunisations",
  "IPS_ALERGIAS_TITLE": "Allergies",
  "IPS_MEDICAMENTOS_TITLE": "Médicaments Actuels",
  "IPS_DIAGNOSTICOS_TITLE": "Diagnostics",
  "IPS_PROCEDIMIENTOS_TITLE": "Procédures Récentes"
}
```

### Usar Traducciones Personalizadas

Puede usar la función `tx` para traducciones específicas:

```javascript
// En el componente React
const customText = tx("MY_CUSTOM_KEY") || "Default Text";
```

## 🔌 Integración con APIs

### Conectar con APIs Reales

Para conectar con APIs reales de OpenMRS, modifique la función `buildIpsData`:

```javascript
const buildIpsData = async () => {
  try {
    setIsLoading(true);
    
    // Obtener vacunas
    const vacunasResponse = await hostApi?.dataService?.getImmunizations(patient.uuid);
    
    // Obtener alergias
    const alergiasResponse = await hostApi?.dataService?.getAllergies(patient.uuid);
    
    // Obtener medicamentos
    const medicamentosResponse = await hostApi?.dataService?.getCurrentMedications(patient.uuid);
    
    // Obtener diagnósticos
    const diagnosticosResponse = await hostApi?.dataService?.getDiagnoses(patient.uuid);
    
    // Obtener procedimientos
    const procedimientosResponse = await hostApi?.dataService?.getProcedures(patient.uuid);
    
    setIpsData({
      vacunas: vacunasResponse.data,
      alergias: alergiasResponse.data,
      medicamentos: medicamentosResponse.data,
      diagnosticos: diagnosticosResponse.data,
      procedimientos: procedimientosResponse.data
    });
    
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Formato de Datos Esperado

#### Vacunas/Inmunizaciones
```javascript
{
  id: "unique-id",
  vacuna: "Nombre de la vacuna",
  fecha: "2024-01-15", // ISO date string
  dosis: "1ra dosis",
  lote: "ABC123",
  proveedor: "Hospital Central"
}
```

#### Alergias
```javascript
{
  id: "unique-id",
  alergeno: "Penicilina",
  severidad: "Severa", // "Severa", "Moderada", "Leve"
  reaccion: "Anafilaxia",
  fecha: "2023-05-20"
}
```

#### Medicamentos
```javascript
{
  id: "unique-id",
  medicamento: "Metformina 500mg",
  dosis: "2 veces al día",
  fechaInicio: "2023-01-10",
  estado: "Activo" // "Activo", "Inactivo"
}
```

#### Diagnósticos
```javascript
{
  id: "unique-id",
  diagnostico: "Diabetes Mellitus Tipo 2",
  codigo: "E11", // ICD-10 code
  fecha: "2023-01-10",
  estado: "Activo"
}
```

#### Procedimientos
```javascript
{
  id: "unique-id",
  procedimiento: "Electrocardiograma",
  fecha: "2024-01-20",
  resultado: "Normal",
  proveedor: "Dr. García"
}
```

## 📱 Responsive Design

El dashboard está optimizado para múltiples tamaños de pantalla:

- **Desktop**: Layout en grid con múltiples columnas
- **Tablet**: Layout adaptativo con 2 columnas
- **Mobile**: Layout de una sola columna con navegación optimizada

## ♿ Accesibilidad

El componente incluye características de accesibilidad:

- **Navegación por teclado**: Todos los elementos son navegables con Tab
- **ARIA labels**: Etiquetas descriptivas para lectores de pantalla
- **Contraste de colores**: Cumple con WCAG 2.1 AA
- **Texto alternativo**: Iconos tienen texto descriptivo

## 🧪 Testing

### Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
yarn test

# Ejecutar pruebas específicas del IPS
yarn test src/next-ui/Containers/ips

# Ejecutar con coverage
yarn test:ci
```

### Pruebas Incluidas

- ✅ Renderizado del componente
- ✅ Manejo de datos del paciente
- ✅ Funcionalidad de botones
- ✅ Estados de loading y error
- ✅ Integración con hostApi
- ✅ Responsive design

## 🐛 Solución de Problemas

### Problemas Comunes

**El dashboard no se muestra**
- Verificar que `"ipsReact"` esté en `reactDisplayControls` en `dashboardSection.js`
- Confirmar que el componente esté registrado en `index.js`
- Revisar la configuración en `nextUISection.html`

**Datos no cargan**
- Verificar que `hostData` contenga la información del paciente
- Revisar la implementación de `buildIpsData()`
- Confirmar que las APIs estén disponibles en `hostApi`

**Estilos no se aplican**
- Verificar que el archivo SCSS esté importado correctamente
- Confirmar que Carbon Design System esté configurado
- Revisar que no haya conflictos de CSS

**Traducciones no funcionan**
- Verificar que las claves estén en todos los archivos de idioma
- Confirmar que `I18nProvider` esté correctamente configurado
- Revisar la función `tx` en props

## 📞 Soporte

Para soporte adicional:

1. Revisar los logs de la consola del navegador
2. Verificar la configuración en Angular
3. Confirmar la estructura de datos
4. Consultar la documentación de Carbon Design System
5. Revisar ejemplos en otros display controls existentes

---

## 🎯 Próximos Pasos

1. **Conectar APIs Reales**: Reemplazar datos mock con llamadas a OpenMRS
2. **Agregar Filtros**: Implementar filtros por fecha, estado, etc.
3. **Exportar Datos**: Añadir funcionalidad de exportación a PDF/Excel
4. **Gráficos y Visualizaciones**: Integrar charts para mostrar tendencias
5. **Configuración Personalizable**: Permitir ocultar/mostrar secciones específicas
