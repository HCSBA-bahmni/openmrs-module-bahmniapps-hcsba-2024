# Ejemplo de Configuración para IPS Dashboard

Este archivo muestra cómo configurar el dashboard IPS en diferentes contextos de Bahmni.

## 1. Configuración en el Dashboard JSON

```json
// Archivo: app_config/clinical/dashboard.json
{
  "general": {
    "sections": [
      {
        "title": "IPS LAC Dashboard",
        "name": "ips",
        "type": "ipsReact",
        "displayOrder": 1,
        "isObservation": false,
        "hideEmptyDisplayControl": false,
        "translationKey": "DASHBOARD_TITLE_IPS_LAC_KEY",
        "config": {
          "showSections": {
            "vacunas": true,
            "alergias": true,
            "medicamentos": true,
            "diagnosticos": true,
            "procedimientos": true
          },
          "maxItemsPerSection": 5,
          "allowGeneration": true
        }
      }
    ]
  }
}
```

## 2. Controlador Angular para IPS

```javascript
// Archivo: ui/app/clinical/dashboard/controllers/ipsController.js
'use strict';

angular.module('bahmni.clinical')
    .controller('IpsController', ['$scope', '$state', '$location', 'patientService', 'visitService', 'ipsService', 'appService',
        function ($scope, $state, $location, patientService, visitService, ipsService, appService) {
            
            // Inicialización
            var init = function() {
                $scope.patient = patientService.getPatient();
                $scope.currentProvider = $scope.currentUser;
                $scope.activeVisit = visitService.getActiveVisit();
                
                setupIpsData();
                setupIpsApi();
            };

            // Configurar datos para el microfrontend
            var setupIpsData = function() {
                $scope.ipsData = {
                    patient: {
                        uuid: $scope.patient.uuid,
                        display: $scope.patient.name,
                        identifier: $scope.patient.identifier,
                        age: $scope.patient.age,
                        gender: $scope.patient.gender,
                        birthDate: $scope.patient.birthDate
                    },
                    provider: {
                        uuid: $scope.currentProvider.uuid,
                        display: $scope.currentProvider.person ? 
                               $scope.currentProvider.person.display : 
                               $scope.currentProvider.display
                    },
                    activeVisit: $scope.activeVisit ? {
                        uuid: $scope.activeVisit.uuid,
                        visitType: $scope.activeVisit.visitType,
                        startDatetime: $scope.activeVisit.startDatetime,
                        location: $scope.activeVisit.location
                    } : null
                };
            };

            // Configurar API para el microfrontend
            var setupIpsApi = function() {
                $scope.ipsApi = {
                    navigation: {
                        ipsDetails: function(section, itemId) {
                            var baseUrl = '/patient/' + $scope.patient.uuid + '/dashboard/ips';
                            switch(section) {
                                case 'vacunas':
                                    $location.path(baseUrl + '/immunizations/' + itemId);
                                    break;
                                case 'alergias':
                                    $location.path(baseUrl + '/allergies/' + itemId);
                                    break;
                                case 'medicamentos':
                                    $location.path(baseUrl + '/medications/' + itemId);
                                    break;
                                case 'diagnosticos':
                                    $location.path(baseUrl + '/diagnoses/' + itemId);
                                    break;
                                case 'procedimientos':
                                    $location.path(baseUrl + '/procedures/' + itemId);
                                    break;
                                default:
                                    console.warn('Sección no reconocida:', section);
                            }
                        }
                    },
                    ipsService: {
                        generateDocument: function(patientUuid) {
                            return ipsService.generateDocument(patientUuid)
                                .then(function(response) {
                                    if (response.data && response.data.documentUrl) {
                                        // Abrir documento en nueva ventana
                                        window.open(response.data.documentUrl, '_blank');
                                    } else if (response.data && response.data.downloadUrl) {
                                        // Descargar archivo
                                        var link = document.createElement('a');
                                        link.href = response.data.downloadUrl;
                                        link.download = 'IPS_' + $scope.patient.identifier + 
                                                      '_' + new Date().toISOString().split('T')[0] + '.pdf';
                                        link.click();
                                    }
                                    return response;
                                })
                                .catch(function(error) {
                                    console.error('Error generando documento IPS:', error);
                                    $scope.$emit('event:serverError', {
                                        message: 'Error al generar el documento IPS. Por favor, inténtelo de nuevo.'
                                    });
                                    throw error;
                                });
                        }
                    },
                    dataService: {
                        getImmunizations: function(patientUuid) {
                            return ipsService.getImmunizations(patientUuid);
                        },
                        getAllergies: function(patientUuid) {
                            return ipsService.getAllergies(patientUuid);
                        },
                        getCurrentMedications: function(patientUuid) {
                            return ipsService.getCurrentMedications(patientUuid);
                        },
                        getDiagnoses: function(patientUuid) {
                            return ipsService.getDiagnoses(patientUuid);
                        },
                        getProcedures: function(patientUuid) {
                            return ipsService.getProcedures(patientUuid);
                        }
                    }
                };
            };

            // Manejar cambios en la visita activa
            $scope.$watch('activeVisit', function(newVisit, oldVisit) {
                if (newVisit !== oldVisit) {
                    setupIpsData();
                }
            });

            // Inicializar controlador
            init();
        }
    ]);
```

## 3. Servicio IPS para Llamadas a API

```javascript
// Archivo: ui/app/clinical/dashboard/services/ipsService.js
'use strict';

angular.module('bahmni.clinical')
    .service('ipsService', ['$http', '$q', 'appService',
        function ($http, $q, appService) {
            
            var baseUrl = appService.getAppDescriptor().getConfigValue("baseUrl") || '/openmrs/ws/rest/v1';
            var ipsBaseUrl = baseUrl + '/ips';

            this.generateDocument = function(patientUuid) {
                var url = ipsBaseUrl + '/document/' + patientUuid;
                return $http.post(url, {
                    format: 'pdf',
                    language: 'es', // o extraer del locale actual
                    sections: ['allergies', 'medications', 'immunizations', 'problems', 'procedures']
                });
            };

            this.getImmunizations = function(patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/immunizations';
                return $http.get(url).then(function(response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };

            this.getAllergies = function(patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/allergies';
                return $http.get(url).then(function(response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };

            this.getCurrentMedications = function(patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/medications';
                return $http.get(url, {
                    params: {
                        status: 'active'
                    }
                }).then(function(response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };

            this.getDiagnoses = function(patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/diagnoses';
                return $http.get(url, {
                    params: {
                        status: 'active'
                    }
                }).then(function(response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };

            this.getProcedures = function(patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/procedures';
                return $http.get(url, {
                    params: {
                        limit: 10,
                        sort: 'date,desc'
                    }
                }).then(function(response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };
        }
    ]);
```

## 4. Configuración de Rutas

```javascript
// Archivo: ui/app/clinical/app.js (fragmento de configuración de rutas)
$stateProvider
    .state('patient.dashboard.ips', {
        url: '/ips',
        views: {
            'additional-header': {
                templateUrl: '../common/ui-helper/header.html'
            },
            'content': {
                templateUrl: '../clinical/dashboard/views/dashboard.html',
                controller: 'IpsController'
            }
        },
        resolve: {
            initialization: 'initialization'
        }
    })
    .state('patient.dashboard.ips.details', {
        url: '/:section/:itemId',
        views: {
            'content@patient.dashboard': {
                templateUrl: '../clinical/dashboard/views/ipsDetails.html',
                controller: 'IpsDetailsController'
            }
        }
    });
```

## 5. Template HTML para el Dashboard

```html
<!-- Archivo: ui/app/clinical/dashboard/views/ipsSection.html -->
<div class="ips-dashboard-section">
    <mfe-next-ui-ips-display-control 
        host-data="ipsData" 
        host-api="ipsApi" 
        app-service="appService">
    </mfe-next-ui-ips-display-control>
</div>
```

## 6. Configuración en el App Config

```json
// Archivo: app_config/clinical/app.json (fragmento)
{
  "id": "bahmni.clinical",
  "extensionPoints": [
    {
      "id": "org.bahmni.clinical.consultation.board",
      "description": "Bahmni Clinical Consultation Page"
    }
  ],
  "contextModel": [
    "patientUuid",
    "visitUuid"
  ],
  "config": {
    "dashboardSections": {
      "ips": {
        "type": "ipsReact",
        "displayOrder": 1,
        "title": "IPS LAC",
        "config": {
          "sections": {
            "immunizations": {
              "enabled": true,
              "maxItems": 10
            },
            "allergies": {
              "enabled": true,
              "maxItems": 10
            },
            "medications": {
              "enabled": true,
              "maxItems": 10
            },
            "diagnoses": {
              "enabled": true,
              "maxItems": 10
            },
            "procedures": {
              "enabled": true,
              "maxItems": 5
            }
          },
          "document": {
            "autoGenerate": false,
            "format": "pdf",
            "language": "es"
          }
        }
      }
    }
  }
}
```

## 7. Ejemplos de Uso en Diferentes Contextos

### A. En el dashboard principal del paciente

```json
// Agregar a: app_config/clinical/dashboard.json
{
  "general": {
    "sections": [
      {
        "title": "Resumen Internacional del Paciente",
        "name": "ips-summary",
        "type": "ipsReact",
        "displayOrder": 1,
        "config": {
          "mode": "summary",
          "maxItemsPerSection": 3
        }
      }
    ]
  }
}
```

### B. En una página dedicada de IPS

```json
// Agregar a: app_config/clinical/dashboard.json
{
  "ips": {
    "sections": [
      {
        "title": "IPS Completo",
        "name": "ips-full",
        "type": "ipsReact", 
        "displayOrder": 1,
        "config": {
          "mode": "full",
          "showAllSections": true
        }
      }
    ]
  }
}
```

### C. En el resumen de consulta

```json
// Agregar a: app_config/clinical/consultation.json
{
  "conceptSetUI": {
    "ips-section": {
      "allowAddMore": false,
      "displayOrder": 100,
      "isControllerActive": false
    }
  }
}
```

## Compilación y Uso

1. **Compilar el microfrontend**:
   ```bash
   cd micro-frontends
   yarn build
   ```

2. **Incluir en el HTML principal**:
   ```html
   <script src="micro-frontends-dist/next-ui.min.js"></script>
   <link rel="stylesheet" href="micro-frontends-dist/next-ui.min.css">
   ```

3. **Usar en el template Angular**:
   ```html
   <mfe-next-ui-ips-display-control 
       host-data="ipsData" 
       host-api="ipsApi" 
       app-service="appService">
   </mfe-next-ui-ips-display-control>
   ```
