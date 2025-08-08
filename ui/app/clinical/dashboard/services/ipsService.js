// Archivo: ui/app/clinical/dashboard/services/ipsService.js
'use strict';

// eslint-disable-next-line angular/no-service-method
angular.module('bahmni.clinical')
    .service('ipsService', ['$http', '$q', 'appService',
        function ($http, $q, appService) {
            var baseUrl = appService.getAppDescriptor().getConfigValue("baseUrl") || '/openmrs/ws/rest/v1';
            var ipsBaseUrl = baseUrl + '/ips';

            this.generateDocument = function (patientUuid) {
                var url = ipsBaseUrl + '/document/' + patientUuid;
                return $http.post(url, {
                    format: 'pdf',
                    language: 'es', // o extraer del locale actual
                    sections: ['allergies', 'medications', 'immunizations', 'problems', 'procedures']
                });
            };

            this.getImmunizations = function (patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/immunizations';
                return $http.get(url).then(function (response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };

            this.getAllergies = function (patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/allergies';
                return $http.get(url).then(function (response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };

            this.getCurrentMedications = function (patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/medications';
                return $http.get(url, {
                    params: {
                        status: 'active'
                    }
                }).then(function (response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };

            this.getDiagnoses = function (patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/diagnoses';
                return $http.get(url, {
                    params: {
                        status: 'active'
                    }
                }).then(function (response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };

            this.getProcedures = function (patientUuid) {
                var url = baseUrl + '/patient/' + patientUuid + '/procedures';
                return $http.get(url, {
                    params: {
                        limit: 10,
                        sort: 'date,desc'
                    }
                }).then(function (response) {
                    return {
                        data: response.data.results || []
                    };
                });
            };
        }
    ]);