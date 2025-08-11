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



