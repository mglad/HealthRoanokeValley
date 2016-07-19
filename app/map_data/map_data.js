(function() {
    'use strict';

    app.controller('mapDataController', function($scope) {

        var gui = require('nw.gui');
        var win = gui.Window.get();

        //Retrieves data sent from main window
        win.on("data", function(data) {
            $scope.processData(data);

        });

        //Processes data and displays it in the table in view
        $scope.processData = function(data) {
            var dataToView = {};
            for (var key in data.match) {
                if (data.match.hasOwnProperty(key)) {
                    dataToView[key] = {};
                    dataToView[key].match = data.match[key];
                    dataToView[key].total = data.total[key];
                }
            }

            $scope.dataToView = dataToView;
            $scope.isRange = data.type != "percentage";
            $scope.value = data.value;

            //Must reapply scope due to async nature of function
            $scope.$apply();
        };
    });

})();
