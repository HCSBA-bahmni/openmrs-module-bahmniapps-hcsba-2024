'use strict';

angular.module('bahmni.ipd')
    .controller('BedManagementController', ['$scope', '$rootScope', '$stateParams', '$state', 'spinner', 'wardService', 'bedManagementService', 'visitService', 'messagingService', 'appService', 'ngDialog', '$translate',
        function ($scope, $rootScope, $stateParams, $state, spinner, wardService, bedManagementService, visitService, messagingService, appService, ngDialog, $translate) {
            $scope.wards = null;
            $scope.ward = {};
            $scope.editTagsPrivilege = Bahmni.IPD.Constants.editTagsPrivilege;
            var links = {
                "dashboard": {
                    "name": "inpatient",
                    "translationKey": "PATIENT_ADT_PAGE_KEY",
                    "url": "../bedmanagement/#/patient/{{patientUuid}}/visit/{{visitUuid}}/dashboard"
                }
            };
            var patientForwardUrl = appService.getAppDescriptor().getConfigValue("patientForwardUrl") || links.dashboard.url;

            var isDepartmentPresent = function (department) {
                if (!department) return false;
                return _.values(department).indexOf() === -1;
            };

            var init = function () {
                $rootScope.selectedBedInfo = $rootScope.selectedBedInfo || {};
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
                return spinner.forPromise(wardService.getWardsList().success(function (wardsList) {
                    $scope.wards = wardsList.results;
                }));
            };

            var mapRoomInfo = function (roomsInfo) {
                var mappedRooms = [];
                _.forIn(roomsInfo, function (value, key) {
                    var bedsGroupedByBedStatus = _.groupBy(value, 'status');
                    var availableBeds = bedsGroupedByBedStatus["AVAILABLE"] ? bedsGroupedByBedStatus["AVAILABLE"].length : 0;
                    mappedRooms.push({name: key, beds: value, totalBeds: value.length, availableBeds: availableBeds});
                });
                return mappedRooms;
            };

            // ADD: estado inicial (máx. 3)
            $scope.visitas = [];

// ADD: helpers
            $scope.addVisita = function () {
                if ($scope.visitas.length >= 3) return;
                $scope.visitas.push({ doc: '', nombre: '', contacto: '' });
            };

            $scope.removeVisita = function (idx) {
                $scope.visitas.splice(idx, 1);
            };
            $scope.form = $scope.form || { customComment: '' };

            // ADD: función para abrir diálogo validando paciente
            $scope.openCustomDialog = function () {
                if (!$scope.patient || !$scope.patient.uuid) return;
                $scope.visitas = ($scope.visitas && $scope.visitas.length) ? $scope.visitas : [{ doc: '', nombre: '', contacto: '' }];
                $scope.form.customComment = $scope.form.customComment || ''; // init seguro
                ngDialog.open({
                    template: 'views/custom-action-dialog.html',
                    className: 'ngdialog-theme-default modern-modal-wide',
                    scope: $scope,
                    data: { patient: $scope.patient },
                    showClose: false,          // usamos el "ngdialog-close clearfix" del template
                    closeByEscape: true,
                    closeByDocument: true
                });
            };

            // MOD: ahora envía visitas + comentario
            $scope.confirmCustomAction = function () {
                // --- cama: arma algo tipo "Ward-Room-BedNumber" si está todo disponible
                var camaCode = null;
                try {
                    var s = $rootScope.selectedBedInfo || {};
                    var wardName = ($scope.ward && $scope.ward.name) || null;
                    var roomName = s.roomName || null;
                    var bedNumber = s.bed && s.bed.bedNumber != null ? String(s.bed.bedNumber) : null;

                    if (wardName && roomName && bedNumber) {
                        camaCode = wardName + '-' + roomName + '-' + bedNumber;
                    } else if (bedNumber) {
                        camaCode = bedNumber; // fallback mínimo
                    }
                } catch (e) {
                    camaCode = null;
                }

                // --- paciente
                var rutPaciente = ($scope.patient && $scope.patient.identifier) || null;
                // si aplica quitar el prefijo "RUN*"
                if (rutPaciente && rutPaciente.startsWith('RUN*')) {
                    rutPaciente = rutPaciente.substring(4);
                }
                var nombrePaciente = ($scope.patient && $scope.patient.name) || null;
                var edadPaciente = ($scope.patient && $scope.patient.age) || null;
                // si está undefined -> null; si es '' (vacío), se respeta como ''
                var observaciones = (typeof $scope.form.customComment === 'undefined')
                    ? null
                    : $scope.form.customComment;
                // --- visitas: mapea los 3 campos del modal y rellena resto en null
                var visitasPayload = [];
                if ($scope.visitas && $scope.visitas.length) {
                    for (var i = 0; i < $scope.visitas.length; i++) {
                        var v = $scope.visitas[i] || {};
                        visitasPayload.push({
                            rut: v.doc || null,            // Nº Documento Visita -> rut visitante (si aplica)
                            entregado: null,               // Bahmni no lo provee aquí
                            lanyard: null,                 // Bahmni no lo provee
                            quien_entrega: null,           // Bahmni no lo provee
                            telefono: v.contacto || null   // contacto ingresado
                        });
                    }
                }

                // --- arma payload final
                var payload = {
                    data_paciente: {
                        cama: camaCode,
                        rut: rutPaciente,
                        nombre_paciente: nombrePaciente,
                        edad: edadPaciente,
                        id_nacionalidad: null,          // no disponible en esta vista
                        observaciones: observaciones,
                        nombre_tutor: null,             // no disponible
                        rut_tutor: null,                // no disponible
                        fono_contacto: null,            // no disponible
                        pertenece_pueblo: null          // no disponible
                    },
                    visitas: visitasPayload
                };

                // --- imprime bonito para validar
                console.log('Payload a enviar (bedManagement):\n', JSON.stringify(payload, null, 2));
                // limpiamos los datos del modal
                $scope.visitas = [];
                $scope.form.customComment = '';
                // cierra modal (dejamos el POST real para el siguiente paso)
                ngDialog.closeAll();
            };

            // ADD: helper para validar el formulario del modal
            $scope.isVisitasInvalid = function () {
                if (!$scope.patient || !$scope.patient.uuid) return true;
                if (!$scope.visitas || $scope.visitas.length === 0) return true;

                for (var i = 0; i < $scope.visitas.length; i++) {
                    var v = $scope.visitas[i] || {};
                    if (!v.doc || !v.nombre || !v.contacto) {
                        return true;
                    }
                }
                return false;
            };

            // var getRoomsForWard = function (bedLayouts) {
            //     bedLayouts.forEach(function (bed) {
            //         if (!bed.bedTagMaps) {
            //             bed.bedTagMaps = [];
            //         }
            //         if (!bed.patient) {
            //             if (bed.patients && bed.patients.length > 0) {
            //                 bed.patient = bed.patients[0];
            //             }
            //         }
            //     });
            //
            //     var rooms = mapRoomInfo(_.groupBy(bedLayouts, 'location'));
            //
            //     _.each(rooms, function (room, index) {
            //         room.beds = bedManagementService.createLayoutGrid(room.beds);
            //
            //         var flattened = _.flatten(room.beds);
            //
            //         var layoutBeds = flattened.filter(function (cell) {
            //             return cell && cell.bed && cell.bed.bedId !== null;
            //         });
            //
            //         room.totalBeds = layoutBeds.length;
            //
            //         room.availableBeds = layoutBeds.filter(function (cell) {
            //             return cell && cell.bed && cell.bed.status === 'AVAILABLE';
            //         }).length;
            //
            //         console.log("[ROOM INDEX " + index + "]", {
            //             name: room.name,
            //             totalBeds: room.totalBeds,
            //             availableBeds: room.availableBeds,
            //             raw: flattened.map(function (cell, i) {
            //                 return {
            //                     i: i,
            //                     bedId: cell && cell.bed ? cell.bed.bedId : null,
            //                     status: cell && cell.bed ? cell.bed.status : null
            //                 };
            //             })
            //         });
            //     });
            //
            //     return rooms;
            // };

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

                    // 🔽 Solo contar celdas con cama válida (bedId != null)
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
                    $scope.$broadcast("event:departmentChanged");
                });
            };

            var expandAdmissionMasterForDepartment = function (department) {
                spinner.forPromise(loadBedsInfoForWard(department));
            };

            $scope.onSelectDepartment = function (department) {
                spinner.forPromise(loadBedsInfoForWard(department).then(function () {
                    resetPatientAndBedInfo();
                    resetDepartments();
                    $scope.$broadcast("event:deselectWards");
                    department.isSelected = true;
                }));
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

            $scope.$on("event:patientAssignedToBed", function (event, bed) {
                $scope.ward.occupiedBeds = $scope.ward.occupiedBeds + 1;
                _.map($scope.ward.rooms, function (room) {
                    if (room.name === $scope.roomName) {
                        room.availableBeds = room.availableBeds - 1;
                    }
                });
            });

            $scope.$on("event:updateSelectedBedInfoForCurrentPatientVisit", function (event, patientUuid) {
                getVisitInfoByPatientUuid(patientUuid).then(function (visitUuid) {
                    var options = {patientUuid: patientUuid, visitUuid: visitUuid};
                    $state.go("bedManagement.patient", options);
                });
            });

            var goToBedManagement = function () {
                if ($state.current.name === "bedManagement.bed") {
                    var options = {};
                    options['context'] = {
                        department: {
                            uuid: $scope.ward.uuid,
                            name: $scope.ward.name
                        },
                        roomName: $scope.roomName
                    };
                    options['dashboardCachebuster'] = Math.random();
                    $state.go("bedManagement", options);
                }
            };

            var getVisitInfoByPatientUuid = function (patientUuid) {
                return visitService.search({
                    patient: patientUuid, includeInactive: false, v: "custom:(uuid,location:(uuid))"
                }).then(function (response) {
                    var results = response.data.results;
                    var activeVisitForCurrentLoginLocation;
                    if (results) {
                        activeVisitForCurrentLoginLocation = _.filter(results, function (result) {
                            return result.location.uuid === $rootScope.visitLocationUuid;
                        });
                    }
                    var hasActiveVisit = activeVisitForCurrentLoginLocation.length > 0;
                    return hasActiveVisit ? activeVisitForCurrentLoginLocation[0].uuid : "";
                });
            };

            $scope.goToAdtPatientDashboard = function () {
                getVisitInfoByPatientUuid($scope.patient.uuid).then(function (visitUuid) {
                    var options = {patientUuid: $scope.patient.uuid, visitUuid: visitUuid};
                    var url = appService.getAppDescriptor().formatUrl(patientForwardUrl, options);
                    window.open(url);
                });
                if (window.scrollY > 0) {
                    window.scrollTo(0, 0);
                }
            };

            $scope.canEditTags = function () {
                return $rootScope.selectedBedInfo.bed && $state.current.name === "bedManagement.bed";
            };

            $scope.editTagsOnTheBed = function () {
                ngDialog.openConfirm({
                    template: 'views/editTags.html',
                    scope: $scope,
                    closeByEscape: true,
                    className: "ngdialog-theme-default ng-dialog-adt-popUp"
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
                console.log("Getting TagName", tag);
                if (tag === 'AVAILABLE') {
                    return $translate.instant("KEY_AVAILABLE");
                } else if (tag === 'OCCUPIED') {
                    return $translate.instant("KEY_OCCUPIED");
                } else if (tag === 'RESERVED') {
                    return $translate.instant("KEY_RESERVED");
                } else if (tag === 'BLOCKED') {
                    return $translate.instant("KEY_BLOCKED");
                }
                return tag;
            };
            init();
        }]);
