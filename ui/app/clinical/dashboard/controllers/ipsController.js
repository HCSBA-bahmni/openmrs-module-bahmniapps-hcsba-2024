// Archivo: ui/app/clinical/dashboard/controllers/ipsController.js
'use strict';

angular.module('bahmni.clinical')
    .controller('IpsController', ['$scope', '$state', '$location', 'patientService', 'visitService', 'ipsService', 'appService',
        function ($scope, $state, $location, patientService, visitService, ipsService, appService) {

            // Inicialización
            var init = function () {
                $scope.patient = patientService.getPatient();
                $scope.currentProvider = $scope.currentUser;
                $scope.activeVisit = visitService.getActiveVisit();

                setupIpsData();
                setupIpsApi();
            };

            // Configurar datos para el microfrontend
            var setupIpsData = function () {
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
            var setupIpsApi = function () {
                $scope.ipsApi = {
                    navigation: {
                        ipsDetails: function (section, itemId) {
                            var baseUrl = '/patient/' + $scope.patient.uuid + '/dashboard/ips';
                            switch (section) {
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
                        generateDocument: function (patientUuid) {
                            return ipsService.generateDocument(patientUuid)
                                .then(function (response) {
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
                                .catch(function (error) {
                                    console.error('Error generando documento IPS:', error);
                                    $scope.$emit('event:serverError', {
                                        message: 'Error al generar el documento IPS. Por favor, inténtelo de nuevo.'
                                    });
                                    throw error;
                                });
                        }
                    },
                    dataService: {
                        getImmunizations: function (patientUuid) {
                            return ipsService.getImmunizations(patientUuid);
                        },
                        getAllergies: function (patientUuid) {
                            return ipsService.getAllergies(patientUuid);
                        },
                        getCurrentMedications: function (patientUuid) {
                            return ipsService.getCurrentMedications(patientUuid);
                        },
                        getDiagnoses: function (patientUuid) {
                            return ipsService.getDiagnoses(patientUuid);
                        },
                        getProcedures: function (patientUuid) {
                            return ipsService.getProcedures(patientUuid);
                        }
                    }
                };
            };

            // Manejar cambios en la visita activa
            $scope.$watch('activeVisit', function (newVisit, oldVisit) {
                if (newVisit !== oldVisit) {
                    setupIpsData();
                }
            });

            // Inicializar controlador
            init();
        }
    ]);
