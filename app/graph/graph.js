(function() {
    'use strict';
    var fs = require('fs');
    var path = require('path');
    var kmeans = require('node-kmeans');
    app.controller('graphController', function($scope, surveyService) {

        //slider for k of k means cluster
        var kSlider = $("#k").slider({
            min: 1,
            max: 5,
            step: 1,
            value: 3
        });
        $scope.survey = surveyService.get();
        $scope.active = 'graph';
        $scope.questions = $scope.survey.questions;
        $scope.labels = [];
        $scope.data = [
            []
        ];
        $scope.selectedFilters = [];

        //function to reload survey given id
        $scope.reloadSurvey = function(id) {
            surveys.find({
                _id: id
            }, function(err, docs) {
                $scope.survey = docs[0];
                $scope.$apply();
            });
        };

        //when user selects x axis for bar chart, labels for graph are updated
        $scope.selectXAxis = function() {
            $scope.data = [
                []
            ];
            var labels = [];
            $.each($scope.survey.responses, function(index, response) {
                var text = response[$scope.selected.workbook][$scope.selected.number];
                if (labels.indexOf(text) == -1)
                    labels.push(text);
            });
            $scope.labels = labels.sort();
            for (var i = 0; i < $scope.labels.length; i++) {
                $scope.data[0].push(0);
            }
            $scope.updateGraph();
        };

        //takes a filter and finds all responses that match filter
        $scope.selectFilter = function(item) {
            var question = $scope.selectedFilters[$scope.selectedFilters.length - 1];
            var options = [];
            $.each($scope.survey.responses, function(index, response) {
                var text = response[question.workbook][question.number];
                if (options.indexOf(text) == -1)
                    options.push(text);
            });
            $scope.selectedFilters[$scope.selectedFilters.length - 1].options = options;
            $scope.updateGraph();
        };

        //updates graph with current data in $scope.data
        $scope.updateGraph = function() {
            for (var i = 0; i < $scope.labels.length; i++) {
                $scope.data[0][i] = 0;
            }
            $.each($scope.survey.responses, function(index, response) {
                var text = response[$scope.selected.workbook][$scope.selected.number];
                if ($scope.selectedFilters.length) {
                    if ($scope.checkFilters(response))
                        $scope.data[0][$scope.labels.indexOf(text)] += 1;
                } else {
                    $scope.data[0][$scope.labels.indexOf(text)] += 1;
                }

            });
        };

        //checks a response for each filter in $scope.selectedFilters
        $scope.checkFilters = function(response) {
            return $scope.selectedFilters.every(function(filter) {
                return filter.selected == response[filter.workbook][filter.number];
            });
        };
        $scope.saveReportElement = function() {
            var path = require('path');
            var ctx = $scope.active == 'graph' ? document.getElementById("graph") : document.getElementById("scatter");
            var base64Img = ctx.toDataURL();
            var data = base64Img.replace(/^data:image\/\w+;base64,/, "");
            var fileName = "graph_" + $scope.survey._id + $scope.survey.report_elements.length + ".png";
            var pathToSave = path.join(require('nw.gui').App.dataPath, fileName);
            var buf = new Buffer(data, 'base64');
            fs.writeFile(pathToSave, buf);
            surveys.update({
                _id: $scope.survey._id
            }, {
                $push: {
                    "report_elements": {
                        fileName: fileName,
                        description: $scope.saveText
                    }
                }
            }, function(err, numReplaced, docs) {
                $scope.reloadSurvey($scope.survey._id);
            });
        };

        //performs k-means clustering on user specified data using the library "node-kmeans"
        //Given the response, the program graphs the data using an extension to charts js called Charts.Scatter.js
        $scope.kMeans = function() {
            var data = [];
            $.each($scope.survey.responses, function(index, response) {
                var data1 = parseInt(response[$scope.selectedMine1.workbook][$scope.selectedMine1.number]);
                var data2 = parseInt(response[$scope.selectedMine2.workbook][$scope.selectedMine2.number]);
                if ($.isNumeric(data1) && $.isNumeric(data2))
                    data.push([data1, data2]);
            });
            var k = kSlider.slider('getValue');
            kmeans.clusterize(data, {
                k: k
            }, function(err, res) {
                if (err) console.error(err);
                else {
                    var ctx = document.getElementById("scatter").getContext("2d");
                    $scope.elementExists = true;
                    $scope.$apply();
                    var graph_data = [];
                    var colors = ["#F16220", "#007ACC", "#01DF3A", "#FF4000", "#D7DF01", "#FE2EF7"]
                    $.each(res, function(index, obj) {
                        var cluster_data = [];
                        for (var i = 0; i < obj.cluster.length; i++) {
                            var point = {
                                x: obj.cluster[i][0],
                                y: obj.cluster[i][1]
                            };
                            cluster_data.push(point);
                        }
                        graph_data.push({
                            label: 'Cluster ' + index,
                            strokeColor: colors[index],
                            pointColor: colors[index],
                            pointStrokeColor: '#fff',
                            data: cluster_data
                        });
                    });

                    ctx = new Chart(ctx).Scatter(graph_data, {
                        datasetStroke: false
                    });
                }
            });
        };
    });

})();
