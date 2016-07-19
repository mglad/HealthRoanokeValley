(function() {
    'use strict';

    var gui = require('nw.gui');
    var PDFDocument = require('pdfkit');
    var fs = require("fs");
    app.controller('reportController', function($scope, surveyService) {
        $scope.survey = surveyService.get();
        $scope.pdfElements = [];

        //Listener options for the ng-sortable used to sort elements (none were needed)
        $scope.dragControlListeners = {};

        //Reloads survey given an id and applies the scope due to being async
        $scope.reloadSurvey = function(id) {
            surveys.find({
                _id: id
            }, function(err, docs) {
                $scope.survey = docs[0];
                $scope.$apply();
            });
        };

        //Dispalys preview pdf in default pdf viewer
        $scope.previewSurvey = function() {
            var pathToSave = path.join(require('nw.gui').App.dataPath, "temp.pdf");
            // Open a pdf file with default viewer.
            $scope.renderReport(pathToSave);
            gui.Shell.openItem(pathToSave);
        };

        //Adds text element to report object
        $scope.addText = function() {
            $scope.pdfElements.push({
                type: "text",
                value: $scope.saveText
            });
            $scope.saveText = "";
            $('.modal').modal('hide');
        };

        //Adds header element to report object
        $scope.addHeader = function() {
            $scope.pdfElements.push({
                type: "header",
                value: $scope.saveHeader
            });
            $scope.saveHeader = "";
            $('.modal').modal('hide');
        };

        //Adds graph element to report object
        $scope.addGraph = function() {
            $scope.pdfElements.push({
                type: "picture",
                value: $scope.saveGraph
            });
            $scope.saveGraph = null;
            $('.modal').modal('hide');
        };

        //Renders a report given a path to save
        //Uses pdfElement array in scope to build pdf using pdfkit (nodejs pdf creator)
        $scope.renderReport = function(pathToSave) {
            var doc = new PDFDocument({
                bufferPages: true
            });

            //Doc is piped directly into a file system write stream
            doc.pipe(fs.createWriteStream(pathToSave));

            //Creates header
            doc.fontSize(25).fillColor('#005466')
                .text('Health Roanoke Valley Report', 80, 40);
            doc.lineWidth(3).lineCap('butt')
                .moveTo(70, 70)
                .lineTo(1000, 70)
                .stroke("#005466");
            doc.moveTo(100, 70);

            //For each pdf element specified by the user, the pdf creator adds the element to the pdf
            $.each($scope.pdfElements, function(index, element) {
                if (element.type == "text") {
                    doc.moveDown().fontSize(13).fillColor("black");
                    doc.text(element.value, {
                        width: 500,
                        align: 'justify',
                        indent: 30,
                        columns: 1
                    });
                } else if (element.type == "header") {
                    doc.moveDown().fontSize(20).fillColor("#005466");
                    doc.text(element.value);
                } else if (element.type == "picture") {
                    doc.moveDown().image(path.join(require('nw.gui').App.dataPath, element.value.fileName), {
                        width: 500
                    });
                }
            });

            //Adds blue side bar on all pages
            for (var i = 0; i < doc.bufferedPageRange().count; i++) {
                doc.switchToPage(i);
                doc.rect(0, 0, 70, 1000)
                    .lineWidth(0)
                    .fillOpacity(0.8)
                    .fillAndStroke("#005466", "#900");
            }
            doc.end();
        };

        //Saves a report
        //Renders the report, stores in %appdata%/local and adds fileName and description to DB for lookup
        $scope.processReport = function() {
            var fileName = "report_" + $scope.survey._id + $scope.survey.reports.length + ".pdf";
            $scope.renderReport(path.join(require('nw.gui').App.dataPath, fileName));
            surveys.update({
                _id: $scope.survey._id
            }, {
                $push: {
                    "reports": {
                        fileName: fileName,
                        description: $scope.saveReport
                    }
                }
            }, function(err, numReplaced, docs) {
                $scope.reloadSurvey($scope.survey._id);
            });
        };

        //Opens a user specified pdf in the default viewer
        $scope.viewReport = function() {
            gui.Shell.openItem(path.join(require('nw.gui').App.dataPath, $scope.reportToView.fileName));
        };

        //Deletes the report from the database and from the file location
        $scope.deleteReport = function() {
            fs.unlinkSync(path.join(require('nw.gui').App.dataPath, $scope.reportToView.fileName));
            surveys.update({
                _id: $scope.survey._id
            }, {
                $pull: {
                    "reports": {
                        fileName: $scope.reportToView.fileName
                    }
                }
            }, function(err, numReplaced, docs) {
                $scope.reloadSurvey($scope.survey._id);
            });

        };
        $scope.deleteElement = function() {
            $scope.pdfElements = $scope.pdfElements.filter(function(element) {
                return element.type != 'picture' || element.value.fileName != $scope.saveGraph.fileName;
            });
            fs.unlinkSync(path.join(require('nw.gui').App.dataPath, $scope.saveGraph.fileName));
            surveys.update({
                _id: $scope.survey._id
            }, {
                $pull: {
                    "report_elements": {
                        fileName: $scope.saveGraph.fileName
                    }
                }
            }, function(err, numReplaced, docs) {
                $scope.reloadSurvey($scope.survey._id);
            });
        };
        //Exports a pdf to a user specified path
        $scope.exportReport = function() {
            var filePath = $("#filePath").val();

            var read_stream = fs.createReadStream(path.join(require('nw.gui').App.dataPath, $scope.reportToView.fileName));
            var write_stream = fs.createWriteStream(filePath);
            read_stream.pipe(write_stream);
        };
    });

})();
