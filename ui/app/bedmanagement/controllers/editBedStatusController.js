'use strict';

angular.module('bahmni.ipd')
    .controller('EditBedStatusController', [
        '$scope', '$rootScope', '$state', 'bedManagementService', 'messagingService', 'wardService', 'ngDialog',
        function (
            $scope,
            $rootScope,
            $state,
            bedManagementService,
            messagingService,
            wardService,
            ngDialog
        ) {
            // Estados disponibles para seleccionar
            $scope.availableStatuses = ['MAINTENANCE', 'CLEANING'];
            $scope.newBedStatus = $rootScope.selectedBedInfo.bed.status;

            $scope.updateBedStatus = function () {
                if (!$scope.newBedStatus) {
                    messagingService.showMessage("error", "Debe seleccionar un estado válido.");
                    return;
                }
                console.log("Actualizando estado de la cama a:", $scope.newBedStatus);
                console.log("Información de la cama seleccionada:", $rootScope.selectedBedInfo.bed);
                var bedUuid = $rootScope.selectedBedInfo.bed.uuid;

                bedManagementService.updateBedStatus(bedUuid, {status: $scope.newBedStatus})
                    .then(function () {
                        messagingService.showMessage("info", "Estado actualizado correctamente.");
                        console.log("Estado de la cama actualizado a:", $scope.newBedStatus);
                        return wardService.bedsForWard($scope.ward.uuid);
                    })
                    .then(function (response) {
                        console.log("Respuesta de la actualización de camas:", response);
                        var updatedRooms = bedManagementService.getRoomsForWard(response.data.bedLayouts);
                        $scope.ward.rooms = updatedRooms;

                        var updatedBed = _.find(response.data.bedLayouts, function (bed) {
                            return bed.uuid === bedUuid;
                        });

                        if (updatedBed) {
                            $rootScope.selectedBedInfo.bed = updatedBed;
                        }

                        $state.go($state.current, {}, {reload: true});
                        ngDialog.close();
                    })
                    .catch(function (err) {
                        console.error("Error al actualizar cama:", err);
                        messagingService.showMessage("error", "No se pudo actualizar el estado de la cama.");
                    });
            };

            $scope.closeDialog = function () {
                ngDialog.close();
            };
        }
    ]);
