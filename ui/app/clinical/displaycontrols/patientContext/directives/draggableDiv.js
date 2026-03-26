angular.module('bahmni.clinical')
    .directive("draggableDiv", ['$document', function ($document) {
        return {
            link: function (scope, element, attr) {
                var normalizePosition = function () {
                    var domElement = element[0];
                    var rect = domElement.getBoundingClientRect();

                    element.css({
                        position: 'fixed',
                        transform: 'none',
                        top: rect.top + 'px',
                        left: rect.left + 'px'
                    });
                };

                element.resizable({
                    handles: " n, e, s, w, ne, se, sw, nw",
                    containment: 'window',
                    start: normalizePosition
                });
                element.on('resizestop', function () {
                    element.css({
                        position: 'fixed'
                    });
                });
                element.draggable({
                    handle: '.tele-consultation-header',
                    containment: 'window',
                    iframeFix: true,
                    start: normalizePosition
                });
            }
        };
    }]);
