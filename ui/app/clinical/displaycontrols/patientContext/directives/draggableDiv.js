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

                var clampResizeToViewport = function (event, ui) {
                    var viewportWidth = window.innerWidth;
                    var viewportHeight = window.innerHeight;

                    if (ui.position.top < 0) {
                        ui.size.height += ui.position.top;
                        ui.position.top = 0;
                    }

                    if (ui.position.left < 0) {
                        ui.size.width += ui.position.left;
                        ui.position.left = 0;
                    }

                    if (ui.position.top + ui.size.height > viewportHeight) {
                        ui.size.height = viewportHeight - ui.position.top;
                    }

                    if (ui.position.left + ui.size.width > viewportWidth) {
                        ui.size.width = viewportWidth - ui.position.left;
                    }

                    element.css({
                        top: ui.position.top + 'px',
                        left: ui.position.left + 'px'
                    });
                };

                element.resizable({
                    handles: " n, e, s, w, ne, se, sw, nw",
                    start: normalizePosition,
                    resize: clampResizeToViewport,
                    stop: clampResizeToViewport
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
