
(function() {
    'use strict';
    var xlsx = require('node-xlsx');
    app.controller('homeController', function($scope, surveyService) {
        var survey = surveyService.get();
        if (survey != {}) {
            $scope.selectedSurvey = survey._id;
        }
        //Reloads surveys from DB
        $scope.reloadSurveys = function() {

            surveys.find({}, function(err, docs) {
                $scope.surveys = docs;
                $scope.$apply();
            });
        };
        $scope.reloadSurveys();
        var gui = require('nw.gui');
        var os = require('os');
        var fs = require('fs');

        //Sends the files (xls) to process if they exist
        $scope.uploadFiles = function(files) {
            $scope.loading = true;
            $scope.files = files;
            if (files && files.length) {
                $scope.processExcel(files);
            }
        };
        //Uses excel parser and adds it to an array
        $scope.processExcel = function(files) {
            var excelData = [];
            $.each(files, function(index, file) {
                var path = file.path;
                var workbook = xlsx.parse(path);
                excelData.push(workbook);
            });
            $scope.addToDB(excelData);

        };
        //Processes workbooks to retrieve questions and adds them to an array
        $scope.getQuestions = function(workbooks) {
            var questions = [];
            $.each(workbooks, function(index, workbook) {
                var data = workbook[0].data[0];
                for (var i = 0; i < data.length; i++) {
                    questions.push({
                        question: data[i],
                        workbook: index,
                        number: i,
                        isNumeric: false
                    });

                }
            });
            return questions;
        };
        //Processes workbooks to retreive responses and adds them to an obj
        $scope.getResponses = function(workbooks, questions) {
            var responses = {};
            $.each(workbooks, function(index, workbook) {
                var data = workbook[0].data;
                for (var i = 1; i < data.length; i++) {
                    if (responses[data[i][0]] == null)
                        responses[data[i][0]] = [];
                    responses[data[i][0]].push({});
                    for (var j = 1; j < data[i].length; j++) {

                        var text = data[i][j];
                        responses[data[i][0]][index][j] = text;
                        if ($.isNumeric(text)) {

                            var q_index = $.map($scope.questions, function(question, question_index) {
                                if (question.workbook == index && question.number == j)
                                    return question_index
                            });
                            $scope.questions[q_index].isNumeric = true;
                        }

                    }
                }
            });
            return responses;
        };
        //Takes the workbooks and retrieves both the questions and the responses from them
        //Waits to reapply scope to view when finished
        $scope.addToDB = function(workbooks) {
            $scope.questions = $scope.getQuestions(workbooks);
            $scope.responses = $scope.getResponses(workbooks, $scope.questions);
            setTimeout(function() {
                $scope.loading = false;
                $scope.$apply();
            }, 1500);

        };
        //Resets import form
        $scope.resetForm = function() {
            $scope.files = null;
            $scope.surveyTitle = "";
            $scope.questions = null;
            $scope.responses = null;
        };
        //Inserts survey into the embedded data store (NeDB)
        $scope.insertDB = function(title) {
            surveys.insert({
                title: title,
                questions: $scope.questions,
                responses: $scope.responses,
                settings: {},
                report_elements: [],
                reports: []
            }, function(err, doc) {
                $scope.reloadSurveys();
            });
            $scope.files = null;
            $scope.surveyTitle = "";
            $scope.imported = true;
        };

        //Adds survey to a service that sends it between views and redirects to the maps page
        $scope.goToMap = function() {
            var survey = $scope.surveys.filter(function(survey) {
                return survey._id == $scope.selectedSurvey;
            })[0];
            surveyService.set(survey);
            window.location = "#/map";
        };
        //Adds survey to a service that sends it between views and redirects to the graph page
        $scope.goToGraph = function() {
            var survey = $scope.surveys.filter(function(survey) {
                return survey._id == $scope.selectedSurvey;
            })[0];
            surveyService.set(survey);
            window.location = "#/graph";
        };
        //Adds survey to a service that sends it between views and redirects to the report page
        $scope.goToReport = function() {
            $scope.reloadSurveys();
            var survey = $scope.surveys.filter(function(survey) {
                return survey._id == $scope.selectedSurvey;
            })[0];
            surveyService.set(survey);
            window.location = "#/report";
        };
        //deletes currently selected survey and reloads the scope
        $scope.deleteSurvey = function() {
            $scope.reloadSurveys();
            var survey = $scope.surveys.filter(function(survey) {
                return survey._id == $scope.selectedSurvey;
            })[0];

            //deletes reports from file system if they exist
            if (survey.reports.length) {
                $.each(survey.reports, function(index, report) {
                    fs.unlinkSync(path.join(require('nw.gui').App.dataPath, report.fileName));
                });
            }

            //deletes report elements from file system if they exist
            if (survey.report_elements.length) {
                $.each(survey.report_elements, function(index, report_element) {
                    fs.unlinkSync(path.join(require('nw.gui').App.dataPath, report_element.fileName));
                });
            }
            surveys.remove({
                _id: $scope.selectedSurvey
            }, {}, function(err, numRemoved) {
                $scope.reloadSurveys();
            });
            $scope.selectedSurvey = undefined;

        };
    });

})();
