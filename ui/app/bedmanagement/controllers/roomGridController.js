'use strict';

angular.module('bahmni.ipd')
    .controller('RoomGridController', ['$scope', '$rootScope', '$state', '$translate',
        function ($scope, $rootScope, $state, $translate) {
            $scope.getColorForTheTag = function (bed) {
                setDefaultTagColor(bed);
            };
            var setDefaultTagColor = function (bed) {
                if (angular.isDefined(bed.bedTagMaps[0]) && bed.bedTagMaps[0].bedTag.color === undefined) {
                    bed.bedTagMaps[0].bedTag.color = "#D3D3D3";
                }
            };

            $scope.onSelectBed = function (bed) {
                if ($state.current.name === "bedManagement.bed" || $state.current.name === "bedManagement") {
                    if (bed.status === "AVAILABLE") {
                        $rootScope.patient = undefined;
                    }
                    $rootScope.selectedBedInfo.bed = bed;
                    var options = {bedId: bed.bedId};
                    $state.go("bedManagement.bed", options);
                }
                else if ($state.current.name === "bedManagement.patient") {
                    $rootScope.selectedBedInfo.bed = bed;
                    if (bed.patient) {
                        $scope.$emit("event:updateSelectedBedInfoForCurrentPatientVisit", bed.patient.uuid);
                    }
                }
            };
            $scope.showHover = function (cell) {
                cell.showHover = true;
            };

            $scope.hideHover = function (cell) {
                cell.showHover = false;
            };
        }]);
