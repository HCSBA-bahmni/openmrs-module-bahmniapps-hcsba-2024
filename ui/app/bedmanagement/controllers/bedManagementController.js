'use strict';

angular.module('bahmni.ipd')
    .controller('BedManagementController', [
        '$scope', '$rootScope', '$stateParams', '$state', 'spinner',
        'wardService', 'bedManagementService', 'visitService',
        'messagingService', 'appService', 'ngDialog', '$translate', '$http',
        function (
            $scope, $rootScope, $stateParams, $state, spinner,
            wardService, bedManagementService, visitService,
            messagingService, appService, ngDialog, $translate, $http
        ) {
            $scope.wards = null;
            $scope.ward = {};
            $scope.editTagsPrivilege = Bahmni.IPD.Constants.editTagsPrivilege;

            $scope.parentescos = [];      // catálogo
            $scope.visitas = [];          // visitas del formulario
            $scope.form = $scope.form || {customComment: ''};
            $scope.saving = false;

            // ← Nuevo: guardamos el id del registro cargado para saber si hacemos PATCH o POST
            $scope._oirsRecordId = null;

            var links = {
                dashboard: {
                    name: 'inpatient',
                    translationKey: 'PATIENT_ADT_PAGE_KEY',
                    url: '../bedmanagement/#/patient/{{patientUuid}}/visit/{{visitUuid}}/dashboard'
                }
            };

            var PARENTESCO_URL = 'https://api.hcsba.cl/oirs_ped/1.0/parentesco/';
            var OIRS_API_BASE = 'https://api.hcsba.cl/oirs_ped/1.0';
            var OIRS_ENDPOINT = OIRS_API_BASE + '/data_paciente_acostado/';

            var patientForwardUrl = appService.getAppDescriptor().getConfigValue('patientForwardUrl') || links.dashboard.url;

            // ----------------- utils -----------------
            function findParentescoById (id) {
                if (id == null || id === '') return null;
                var num = parseInt(id, 10);
                for (var i = 0; i < $scope.parentescos.length; i++) {
                    if (parseInt($scope.parentescos[i].id, 10) === num) return $scope.parentescos[i];
                }
                return null;
            }

            function rebindParentescosObjects () {
                if (!angular.isArray($scope.visitas) || !$scope.visitas.length || !$scope.parentescos.length) return;
                $scope.visitas.forEach(function (v) {
                    if (!v.parentesco && v._parentescoId != null) {
                        v.parentesco = findParentescoById(v._parentescoId);
                    }
                });
            }

            function formatHttpError (err) {
                if (!err) return 'No se pudo guardar';
                if (err.status === 0) return 'No se pudo contactar el servicio.';
                if (err.data) {
                    if (angular.isString(err.data)) return err.data;
                    if (err.data.message) return err.data.message;
                    if (err.data.detail) return err.data.detail;
                    if (err.data.errors && err.data.errors.join) return err.data.errors.join(', ');
                }
                return 'HTTP ' + (err.status || '?') + ' - No se pudo guardar';
            }

            // --------------- carga inicial ---------------
            var isDepartmentPresent = function (department) {
                if (!department) return false;
                return _.values(department).indexOf() === -1;
            };

            var init = function () {
                $rootScope.selectedBedInfo = $rootScope.selectedBedInfo || {};
                loadParentescos();
                loadAllWards().then(function () {
                    var context = $stateParams.context || {};
                    if (context && isDepartmentPresent(context.department)) {
                        expandAdmissionMasterForDepartment(context.department);
                    } else if ($rootScope.bedDetails) {
                        expandAdmissionMasterForDepartment({
                            uuid: $rootScope.bedDetails.wardUuid,
                            name: $rootScope.bedDetails.wardName
                        });
                    }
                    resetDepartments();
                    resetBedInfo();
                });
            };

            var loadAllWards = function () {
                return spinner.forPromise(
                    wardService.getWardsList().success(function (wardsList) {
                        $scope.wards = wardsList.results;
                    })
                );
            };

            function loadParentescos () {
                return spinner.forPromise(
                    $http.get(PARENTESCO_URL).then(function (resp) {
                        var rows = angular.isArray(resp.data) ? resp.data : [];
                        $scope.parentescos = rows
                            .filter(function (x) {
                                return x && x.estado !== false;
                            })
                            .map(function (x) {
                                return {id: parseInt(x.id, 10), description: x.description, estado: x.estado};
                            })
                            .sort(function (a, b) {
                                return (a.description || '').localeCompare((b.description || ''), 'es', {sensitivity: 'base'});
                            });
                        rebindParentescosObjects();
                    }).catch(function () {
                        $scope.parentescos = [];
                    })
                );
            }

            // --------------- prefill desde API (por estadía) ---------------
            function fetchExistingVisitas (patientUuid) {
                return getVisitInfoByPatientUuid(patientUuid).then(function (visitUuid) {
                    if (!visitUuid) return {id: null, visitas: [], observaciones: null, originalIds: []};

                    return $http.get(OIRS_ENDPOINT, {params: {uuid: patientUuid, encounter_id: visitUuid}})
                        .then(function (resp) {
                            var rows = angular.isArray(resp.data) ? resp.data : [];
                            var row = rows.length ? rows[0] : null;
                            if (!row) return {id: null, visitas: [], observaciones: null, originalIds: []};

                            var visitas = angular.isArray(row.visitas_autorizadas) ? row.visitas_autorizadas : [];
                            var mapped = visitas.slice(0, 3).map(function (it) {
                                it = it || {};
                                return {
                                    doc: it.nro_documento || '',
                                    nombre: it.nombre || '',
                                    contacto: it.contacto || '',
                                    parentesco: null,  // se resuelve luego
                                    _parentescoId: it.id_parentesco != null ? parseInt(it.id_parentesco, 10) : null,
                                    puebloOriginario: !!it.pertenece_pueblo,
                                    _idServidor: it.id
                                };
                            });

                            return {
                                id: row.id || null,
                                visitas: mapped,
                                observaciones: row.observaciones || null,
                                originalIds: mapped.filter(function (v) {
                                    return !!v._idServidor;
                                }).map(function (v) {
                                    return v._idServidor;
                                })
                            };
                        }, function () {
                            return {id: null, visitas: [], observaciones: null, originalIds: []};
                        });
                });
            }

            // --------------- abrir modal ---------------
            $scope.select2ParentescoOpts = {allowClear: true, width: 'resolve', minimumResultsForSearch: 0};

            $scope.addVisita = function () {
                if ($scope.visitas.length >= 3) return;
                $scope.visitas.push({
                    doc: '', nombre: '', contacto: '',
                    parentesco: null, puebloOriginario: false
                });
            };

            $scope.removeVisita = function (idx) {
                $scope.visitas.splice(idx, 1);
            };

            $scope.openCustomDialog = function () {
                if (!$scope.patient || !$scope.patient.uuid) return;

                // Estado base mientras carga
                $scope._oirsRecordId = null;   // ← limpiamos id previo
                $scope.visitas = [{
                    doc: '', nombre: '', contacto: '',
                    parentesco: null, puebloOriginario: false
                }];
                $scope.form.customComment = '';

                ngDialog.open({
                    template: 'views/custom-action-dialog.html',
                    className: 'ngdialog-theme-default modern-modal-wide',
                    scope: $scope,
                    data: {patient: $scope.patient},
                    showClose: false,
                    closeByEscape: true,
                    closeByDocument: true
                });

                spinner.forPromise(
                    fetchExistingVisitas($scope.patient.uuid).then(function (prefill) {
                        $scope._oirsRecordId = prefill.id || null;
                        $scope._originalVisitIds = prefill.originalIds || [];   // <-- guarda los ids originales

                        if (prefill.observaciones != null) $scope.form.customComment = prefill.observaciones;
                        $scope.visitas = (angular.isArray(prefill.visitas) && prefill.visitas.length)
                            ? prefill.visitas.slice(0, 3)
                            : [{ doc: '', nombre: '', contacto: '', parentesco: null, puebloOriginario: false }];

                        rebindParentescosObjects();
                    })
                );
            };

            // --------------- guardar (POST o PATCH) ---------------
            $scope.confirmCustomAction = function () {
                getVisitInfoByPatientUuid($scope.patient.uuid).then(function (visitUuid) {
                    // cama
                    var camaCode = null;
                    try {
                        var s = $rootScope.selectedBedInfo || {};
                        var bedNumber = s.bed && s.bed.bedNumber != null ? String(s.bed.bedNumber) : null;
                        if (bedNumber) camaCode = bedNumber;
                    } catch (e) {
                        camaCode = null;
                    }

                    // paciente
                    var rutPaciente = ($scope.patient && $scope.patient.identifier) || null;
                    if (rutPaciente && rutPaciente.indexOf('RUN*') === 0) rutPaciente = rutPaciente.substring(4);

                    var payload = {
                        data_paciente: {
                            uuid: $scope.patient.uuid || null,
                            cama: camaCode,
                            rut: rutPaciente,
                            nombre_paciente: ($scope.patient && $scope.patient.name) || null,
                            edad: ($scope.patient && $scope.patient.age != null) ? $scope.patient.age : null,
                            observaciones: (angular.isUndefined($scope.form.customComment)) ? null : $scope.form.customComment,
                            id_nacionalidad: null,
                            pertenece_pueblo: null,
                            encounter_id: visitUuid || null
                        },
                        visitas_autorizadas: []
                    };
                    var isUpdate = !!$scope._oirsRecordId;

                    if (angular.isArray($scope.visitas) && $scope.visitas.length) {
                        for (var i = 0; i < $scope.visitas.length; i++) {
                            var v = $scope.visitas[i] || {};

                            var visitaDto = {
                                documento: 'RUT',
                                nro_documento: v.doc || null,
                                contacto: v.contacto || null,
                                nombre: v.nombre || null,
                                id_parentesco: v.parentesco ? v.parentesco.id : null,
                                pertenece_pueblo: !!v.puebloOriginario
                            };

                            // <<--- CLAVE PARA PATCH
                            if (isUpdate && v._idServidor) {
                                visitaDto.id = v._idServidor;
                            }

                            payload.visitas_autorizadas.push(visitaDto);
                        }
                    }

                    var headers = {headers: {'Content-Type': 'application/json'}};
                    var req = isUpdate
                        ? $http.patch('https://api.hcsba.cl/oirs_ped/1.0/data_paciente_acostado/' + $scope._oirsRecordId, payload, headers)
                        : $http.post(OIRS_ENDPOINT, payload, headers);

                    $scope.saving = true;
                    spinner.forPromise(req).then(function (res) {
                        var status = res && res.status;
                        var ok = status >= 200 && status < 300;
                        if (ok) {
                            var backendMsg = (res.data && (res.data.message || res.data.detail)) || null;
                            var fallback = isUpdate ? 'Registro actualizado exitosamente.' : 'Registro creado exitosamente.';
                            messagingService.showMessage('info', backendMsg || ($translate.instant('GUARDADO_OK_KEY') || fallback));
                            try {
                                $scope._oirsRecordId = null;
                                $scope.visitas = [];
                                $scope.form.customComment = '';
                                ngDialog.closeAll();
                            } catch (uiErr) {
                                console.warn('Guardado OK, pero hubo un error de UI al limpiar:', uiErr);
                                messagingService.showMessage('info', 'Guardado correcto, pero hubo un detalle al refrescar la vista.');
                            }
                        } else {
                            messagingService.showMessage('error', 'Respuesta inesperada del servidor (' + status + ').');
                        }
                    }, function (err) {
                        messagingService.showMessage('error', formatHttpError(err));
                    }).finally(function () {
                        $scope.saving = false;
                    });
                }, function (err) {
                    console.error('No se pudo obtener visitUuid para el paciente:', err);
                    messagingService.showMessage('error', 'No se encontró la visita activa del paciente.');
                });
            };

            // --------------- validación ---------------
            $scope.isVisitasInvalid = function () {
                if (!$scope.patient || !$scope.patient.uuid) return true;
                if (!angular.isArray($scope.visitas) || $scope.visitas.length === 0) return true;

                for (var i = 0; i < $scope.visitas.length; i++) {
                    var v = $scope.visitas[i] || {};
                    if (!v.doc || !v.nombre || !v.contacto || !v.parentesco) {
                        return true;
                    }
                }
                return false;
            };

            // --------------- resto del controller (salas/camas) ---------------
            var mapRoomInfo = function (roomsInfo) {
                var mappedRooms = [];
                _.forIn(roomsInfo, function (value, key) {
                    var bedsGroupedByBedStatus = _.groupBy(value, 'status');
                    var availableBeds = bedsGroupedByBedStatus['AVAILABLE'] ? bedsGroupedByBedStatus['AVAILABLE'].length : 0;
                    mappedRooms.push({name: key, beds: value, totalBeds: value.length, availableBeds: availableBeds});
                });
                return mappedRooms;
            };

            var getWardDetails = function (department) {
                return _.filter($scope.wards, function (entry) {
                    return entry.ward.uuid === department.uuid;
                });
            };

            var selectCurrentDepartment = function (department) {
                _.each($scope.wards, function (wardElement) {
                    if (wardElement.ward.uuid === department.uuid) {
                        wardElement.ward.isSelected = true;
                        wardElement.ward.selected = true;
                    }
                });
            };

            var loadBedsInfoForWard = function (department) {
                return wardService.bedsForWard(department.uuid).then(function (response) {
                    var wardDetails = getWardDetails(department);
                    var rooms = bedManagementService.getRoomsForWard(response.data.bedLayouts);

                    var allFlattenedBeds = [];
                    for (var i = 0; i < rooms.length; i++) {
                        var rowBeds = _.flatten(rooms[i].beds);
                        allFlattenedBeds = allFlattenedBeds.concat(rowBeds);
                    }

                    var validBeds = allFlattenedBeds.filter(function (cell) {
                        return cell && cell.bed && cell.bed.bedId;
                    });

                    var totalBeds = validBeds.length;
                    var occupiedBeds = validBeds.filter(function (cell) {
                        return cell.bed && cell.bed.status === 'OCCUPIED';
                    }).length;
                    var reservedBeds = validBeds.filter(function (cell) {
                        return cell.bed && cell.bed.status === 'RESERVED';
                    }).length;
                    var blockedBeds = validBeds.filter(function (cell) {
                        return cell.bed && cell.bed.status === 'BLOCKED';
                    }).length;

                    $scope.ward = {
                        rooms: rooms,
                        uuid: department.uuid,
                        name: department.name,
                        totalBeds: totalBeds,
                        occupiedBeds: occupiedBeds,
                        reservedBeds: reservedBeds,
                        blockedBeds: blockedBeds
                    };

                    $scope.departmentSelected = true;
                    $rootScope.selectedBedInfo.wardName = department.name;
                    $rootScope.selectedBedInfo.wardUuid = department.uuid;
                    selectCurrentDepartment(department);
                    $scope.$broadcast('event:departmentChanged');
                });
            };

            var expandAdmissionMasterForDepartment = function (department) {
                spinner.forPromise(loadBedsInfoForWard(department));
            };

            $scope.onSelectDepartment = function (department) {
                spinner.forPromise(
                    loadBedsInfoForWard(department).then(function () {
                        resetPatientAndBedInfo();
                        resetDepartments();
                        $scope.$broadcast('event:deselectWards');
                        department.isSelected = true;
                    })
                );
            };

            var resetDepartments = function () {
                _.each($scope.wards, function (option) {
                    option.ward.isSelected = false;
                });
            };

            var resetBedInfo = function () {
                $rootScope.selectedBedInfo.roomName = undefined;
                $rootScope.selectedBedInfo.bed = undefined;
            };

            var resetPatientAndBedInfo = function () {
                resetBedInfo();
                goToBedManagement();
            };

            $scope.$on('event:patientAssignedToBed', function () {
                $scope.ward.occupiedBeds = $scope.ward.occupiedBeds + 1;
                _.map($scope.ward.rooms, function (room) {
                    if (room.name === $scope.roomName) {
                        room.availableBeds = room.availableBeds - 1;
                    }
                });
            });

            $scope.$on('event:updateSelectedBedInfoForCurrentPatientVisit', function (event, patientUuid) {
                getVisitInfoByPatientUuid(patientUuid).then(function (visitUuid) {
                    var options = {patientUuid: patientUuid, visitUuid: visitUuid};
                    $state.go('bedManagement.patient', options);
                });
            });

            var goToBedManagement = function () {
                if ($state.current.name === 'bedManagement.bed') {
                    var options = {};
                    options['context'] = {
                        department: {uuid: $scope.ward.uuid, name: $scope.ward.name},
                        roomName: $scope.roomName
                    };
                    options['dashboardCachebuster'] = Math.random();
                    $state.go('bedManagement', options);
                }
            };

            var getVisitInfoByPatientUuid = function (patientUuid) {
                return visitService.search({
                    patient: patientUuid,
                    includeInactive: false,
                    v: 'custom:(uuid,location:(uuid))'
                }).then(function (response) {
                    var results = response.data.results;
                    var activeVisitForCurrentLoginLocation;
                    if (results) {
                        activeVisitForCurrentLoginLocation = _.filter(results, function (result) {
                            return result.location.uuid === $rootScope.visitLocationUuid;
                        });
                    }
                    var hasActiveVisit = activeVisitForCurrentLoginLocation.length > 0;
                    return hasActiveVisit ? activeVisitForCurrentLoginLocation[0].uuid : '';
                });
            };

            $scope.goToAdtPatientDashboard = function () {
                getVisitInfoByPatientUuid($scope.patient.uuid).then(function (visitUuid) {
                    var options = {patientUuid: $scope.patient.uuid, visitUuid: visitUuid};
                    var url = appService.getAppDescriptor().formatUrl(patientForwardUrl, options);
                    window.open(url);
                });
                if (window.scrollY > 0) window.scrollTo(0, 0);
            };

            $scope.canEditTags = function () {
                return $rootScope.selectedBedInfo.bed && $state.current.name === 'bedManagement.bed';
            };

            $scope.editTagsOnTheBed = function () {
                ngDialog.openConfirm({
                    template: 'views/editTags.html',
                    scope: $scope,
                    closeByEscape: true,
                    className: 'ngdialog-theme-default ng-dialog-adt-popUp'
                });
            };

            $scope.editBedStatus = function () {
                ngDialog.open({
                    template: 'views/editBedStatus.html',
                    className: 'ngdialog-theme-default ng-dialog-adt-popUp',
                    scope: $scope
                });
            };

            $scope.getStatusName = function (tag) {
                if (tag === 'AVAILABLE') return $translate.instant('KEY_AVAILABLE');
                if (tag === 'OCCUPIED') return $translate.instant('KEY_OCCUPIED');
                if (tag === 'RESERVED') return $translate.instant('KEY_RESERVED');
                if (tag === 'BLOCKED') return $translate.instant('KEY_BLOCKED');
                return tag;
            };

            init();
        }
    ]);
