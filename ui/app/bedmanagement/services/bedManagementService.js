'use strict';

angular.module('bahmni.ipd')
    .service('bedManagementService', ['$http', function ($http) {
        var self = this;

        var maxX, maxY, minX, minY;

        var initialiseMinMaxRowColumnNumbers = function () {
            maxX = 1;
            maxY = 1;
            minX = 1;
            minY = 1;
        };

        this.createLayoutGrid = function (bedLayouts) {
            initialiseMinMaxRowColumnNumbers();
            self.layout = [];
            findMaxYMaxX(bedLayouts);
            var bedLayout;
            var rowLayout = [];
            for (var i = minX; i <= maxX; i++) {
                rowLayout = [];
                for (var j = minY; j <= maxY; j++) {
                    bedLayout = getBedLayoutWithCoordinates(i, j, bedLayouts);
                    console.log("Bed Layout for row: " + i + ", column: " + j, bedLayout);
                    rowLayout.push({
                        empty: isEmpty(bedLayout),
                        available: isAvailable(bedLayout),
                        bed: {
                            bedId: bedLayout !== null && bedLayout.bedId,
                            uuid: bedLayout !== null && bedLayout.bedUuid,
                            bedNumber: bedLayout !== null && bedLayout.bedNumber,
                            bedType: bedLayout !== null && bedLayout.bedType !== null && bedLayout.bedType.displayName,
                            bedTagMaps: bedLayout !== null && bedLayout.bedTagMaps,
                            status: bedLayout !== null && bedLayout.status,
                            patient: bedLayout !== null && bedLayout.patient
                        }
                    });
                }
                self.layout.push(rowLayout);
            }
            return self.layout;
        };

        var findMaxYMaxX = function (bedLayouts) {
            for (var i = 0; i < bedLayouts.length; i++) {
                var bedLayout = bedLayouts[i];
                if (bedLayout.rowNumber > maxX) {
                    maxX = bedLayout.rowNumber;
                }
                if (bedLayout.columnNumber > maxY) {
                    maxY = bedLayout.columnNumber;
                }
            }
        };

        var getBedLayoutWithCoordinates = function (rowNumber, columnNumber, bedLayouts) {
            for (var i = 0, len = bedLayouts.length; i < len; i++) {
                if (bedLayouts[i].rowNumber === rowNumber && bedLayouts[i].columnNumber === columnNumber) {
                    return bedLayouts[i];
                }
            }
            return null;
        };

        var isEmpty = function (bedLayout) {
            return bedLayout === null || bedLayout.bedId === null;
        };

        var isAvailable = function (bedLayout) {
            if (bedLayout === null) {
                return false;
            }
            return bedLayout.status === "AVAILABLE";
        };
        this.getRoomsForWard = function (bedLayouts) {
            bedLayouts.forEach(function (bed) {
                if (!bed.bedTagMaps) bed.bedTagMaps = [];
                if (!bed.patient && bed.patients && bed.patients.length > 0) {
                    bed.patient = bed.patients[0];
                }
            });

            var rooms = _.map(_.groupBy(bedLayouts, 'location'), function (value, key) {
                return {
                    name: key,
                    beds: value,
                    totalBeds: value.length,
                    availableBeds: _.filter(value, { status: 'AVAILABLE' }).length
                };
            });

            _.each(rooms, function (room, index) {
                room.beds = self.createLayoutGrid(room.beds);

                var flattened = _.flatten(room.beds);
                var layoutBeds = flattened.filter(function (cell) {
                    return cell && cell.bed && cell.bed.bedId !== null;
                });

                room.totalBeds = layoutBeds.length;
                room.availableBeds = layoutBeds.filter(function (cell) {
                    return cell && cell.bed && cell.bed.status === 'AVAILABLE';
                }).length;
            });

            return rooms;
        };
        this.updateBedStatus = function (bedUuid, newStatus) {
            var url = Bahmni.IPD.Constants.editBedStatus.replace("{{bedUuid}}", bedUuid);
            var payload = {
                status: newStatus.status
            };
            return $http.post(url, payload, {
                method: 'POST',
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        };
    }]);
