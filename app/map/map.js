(function() {
    'use strict';

    app.controller('mapController', function($scope, surveyService, $window, $http) {
        //Initializes sliders for page
        var threhSlider = $("#threshold").slider({
            min: 0,
            max: 1,
            step: .01,
            value: .5
        });
        var numSlider = $("#numeric").slider({
            range: true
        });
        var gui = require('nw.gui');

        //Retrieve the survey from the surveyService
        $scope.survey = surveyService.get();
        //Find if zipField option has been answered already
        $scope.zipField = $scope.survey.settings.zipCodeField ? $scope.survey.settings.zipCodeField : null;
        $scope.questions = $scope.survey.questions;
        //Takes the zip from the field and updates the options from the database with the zipField provided by the user
        $scope.selectZip = function() {
            $scope.zipField = {
                "question": $scope.selected.number,
                "workbook": $scope.selected.workbook
            };
            surveys.update({
                _id: $scope.survey._id
            }, {
                $set: {
                    "settings.zipCodeField": $scope.zipField
                }
            }, function(err, numReplaced, docs) {

            });
        };

        //Initializes and sets options for a static google map
        $window.map = new google.maps.Map(document.getElementById('map'), {
            center: {
                lat: 37.29482,
                lng: -79.9919
            },
            zoom: 11,
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false,
            draggable: true,
            scrollwheel: false,
            panControl: false,
            maxZoom: 11,
            minZoom: 11
        });

        //Zip codes that are being calculated by area and zip codes being labled for the map
        var zip_codes = ["24179", "24175", "24153", "24127", "24095", "24090", "24083", "24083", "24077", "24070", "24064", "24059", "24019", "24018", "24017", "24016", "24015", "24014", "24013", "24012"];
        var zip_labels = ["24019", "24018", "24017", "24016", "24015", "24014", "24012", "24179", "24153"];

        var layer = null;
        //Retrieving zip locationsfrom a google fusion table and displaying them
        $http.get('https://www.googleapis.com/fusiontables/v2/query', {
            params: {
                key: 'AIzaSyCmsYPLW2-K07J5Rd8QjmvcxvjQVJuXFNA',
                sql: 'SELECT ZIP, latitude, longitude FROM 1Lae-86jeUDLmA6-8APDDqazlTOy1GsTXh28DAkw where ZIP in (' + zip_labels.join(", ") + ")"
            }
        }).then(function(response) {
            var rows = response.data.rows;
            $.each(rows, function(index, row) {
                if (row[0] == "24179") {
                    row[2] -= .04;
                    row[1] += .02;
                }
                var myOptions = {
                    content: row[0],
                    boxStyle: {
                        textAlign: "center",
                        fontSize: "11pt",
                        fontWeight: "bold",
                        width: "50px",
                        color: "#FF0000"
                    },
                    disableAutoPan: true,
                    pixelOffset: new google.maps.Size(-25, 0),
                    position: new google.maps.LatLng(row[1], row[2]),
                    closeBoxURL: "",
                    isHidden: false,
                    pane: "mapPane",
                    enableEventPropagation: true,
                    zIndex: "999999999999999999999"
                };

                var ibLabel = new InfoBox(myOptions);
                ibLabel.open($window.map);
            });
        });

        //Listener created to stop click event propogation
        $window.map.data.addListener(layer, 'click', function(event) {
            event.preventDefault();
        });

        $scope.filters = [];
        var numericSlider;
        //Given a question, retrieves all possible answers received and whether the responses were numeric
        //If they were, a range option is provided for filter
        $scope.getFilters = function() {
            if (layer != null)
                layer.setMap(null);
            $scope.selectedFilter = undefined;
            var filters = [];
            $.each($scope.survey.responses, function(index, response) {
                var text = response[$scope.selectedField.workbook][$scope.selectedField.number];
                if (filters.indexOf(text) == -1)
                    filters.push(text);
            });
            $scope.filters = filters.sort();
            $scope.numeric = ($scope.filters.length && !isNaN($scope.filters[0]));
            if (numericSlider != null)
                numericSlider.slider('destroy');
            if ($scope.numeric) {
                var result = $scope.filters.filter(function(x) {
                    return !isNaN(x);
                }).map(function(x) {
                    return parseInt(x, 10)
                });
                $scope.max = Math.max.apply(Math, result);
                $scope.min = Math.min.apply(Math, result);

            }
        };

        //Sets a slider for the range if filter is numeric
        $scope.setSlider = function() {
            console.log($scope.min);
            if ($scope.threshold == 'numeric') {
                numSlider.slider({
                    min: $scope.min,
                    max: $scope.max,
                    step: 1,
                    value: [0, ($scope.max - $scope.min) / 2],
                    range: true
                });
            }
        };

        //Determines whether the responses met the given threshold with the filter provided
        //If threshold is met, the zip code is colored green, red otherwise
        $scope.setMap = function() {
            if (layer != null)
                layer.setMap(null);
            var count_zip = {};
            var count_match = {};
            $.each($scope.survey.responses, function(index, response) {
                var zip_code = response[$scope.zipField.workbook][$scope.zipField.question];
                if (zip_codes.indexOf(zip_code + '') > -1) {
                    count_zip[zip_code] = count_zip[zip_code] == null ? 0 : count_zip[zip_code] + 1;
                    var response_text = response[$scope.selectedField.workbook][$scope.selectedField.number];
                    if ($scope.threshold == "percentage")
                        if (response_text == $scope.selectedFilter)
                            count_match[zip_code] = count_match[zip_code] == null ? 0 : count_match[zip_code] + 1;
                    if ($scope.threshold == "numeric")
                        if (response_text >= numSlider.slider('getValue')[0] && response_text <= numSlider.slider('getValue')[1])
                            count_match[zip_code] = count_match[zip_code] == null ? 0 : count_match[zip_code] + 1;
                }
            });

            //Prepares data to be viewed in pop up window if clicked
            $scope.dataToView = {
                match: count_match,
                total: count_zip,
                type: $scope.threshold,
                value: $scope.threshold == "percentage" ? $scope.selectedFilter : numSlider.slider('getValue')
            };
            var threshold = threhSlider.slider('getValue');
            var zips_in_threshold = [];

            //Whether a zip code met a given threshold is determined
            $.each(zip_codes, function(index, zip_code) {
                var value = count_match[zip_code] != null && count_zip[zip_code] != null ? count_match[zip_code] / count_zip[zip_code] : 0;
                if (value > threshold)
                    zips_in_threshold.push(zip_code);

            });


            //Draws zip codes with a fusion table layer and colors green if in threshold, red otherwise
            layer = new google.maps.FusionTablesLayer({
                query: {
                    select: 'geometry',
                    from: '1Lae-86jeUDLmA6-8APDDqazlTOy1GsTXh28DAkw',
                    where: 'ZIP in (' + zip_codes.join(", ") + ")"
                },
                styles: [{
                    polygonOptions: {
                        strokeColor: '#000000',
                        strokeWeight: 1
                    }
                }, {
                    where: 'ZIP in (' + zips_in_threshold.join(", ") + ")",
                    polygonOptions: {
                        fillColor: '#00FF00',
                        fillOpacity: .2
                    }
                }, {
                    where: 'ZIP in (' + zip_codes.diff(zips_in_threshold).join(", ") + ")",
                    polygonOptions: {
                        fillColor: '#FF0000',
                        fillOpacity: .2
                    }
                }],
                suppressInfoWindows: true,
                clickable: false,
                map: $window.map
            });
        };
        var win;

        //Opens a new window and passes new data to it
        //Sets event to cause pop up to close if main window closes
        $scope.viewData = function() {
            if (win != null) {
                win.close(true);
            }
            win = gui.Window.open('index_popup.html#/map_data', {
                position: 'center',
                width: 400,
                height: 800,
                toolbar: false,
                frame: false
            });
            //emits data to new window
            win.on('loaded', function() {
                win.emit("data", $scope.dataToView);
            });
            gui.Window.get().on('close', function() {
                // Hide the window to give user the feeling of closing immediately
                this.hide();

                // If the new window is still open then close it.
                if (win != null)
                    win.close(true);

                // After closing the new window, close the main window.
                this.close(true);
            });
        };
    });


})();
