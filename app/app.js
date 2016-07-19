 //Different modules used within angular
var app = angular.module('MyApp', ['ngRoute', 'ngFileUpload', 'ui.select', 'chart.js', 'as.sortable']);
var Datastore = require('nedb');
var path = require('path');
//Load datastore when program starts
var surveys = new Datastore({
    filename: path.join(require('nw.gui').App.dataPath, 'todo.db'),
    autoload: true
});

//Helper extensions used for Array and String class
Array.prototype.diff = function(a) {
    return this.filter(function(i) {
        return a.indexOf(i) < 0;
    });
};
String.prototype.trunc = String.prototype.trunc ||
    function(n) {
        return (this.length > n) ? this.substr(0, n - 1) + '...' : this.substr(0, this.length);
    };

(function() {
    'use strict';

    var gui = require('nw.gui');
    var win = gui.Window.get();
    var menu = new gui.Menu;

    //General copy, cut, and paste commands
    menu.append(new gui.MenuItem({
        label: "Cut",
        click: function() {
            document.execCommand("cut");
        }
    }));
    menu.append(new gui.MenuItem({
        label: "Copy",
        click: function() {
            document.execCommand("copy");
        }
    }));

    menu.append(new gui.MenuItem({
        label: "Paste",
        click: function() {
            document.execCommand("paste");
        }
    }));


    //Initializes the c,c,p context menu if valid element is right clicked
    document.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target.isContentEditable) {
            menu.popup(e.x, e.y);
        }
    });




    //Service to send data between views
    app.factory('surveyService', function() {
        var savedData = {}

        function set(data) {
            savedData = data;
        }

        function get() {
            return savedData;
        }

        return {
            set: set,
            get: get
        }

    });

    //Routing for views using ng-routes
    app.config(function($routeProvider) {
        $routeProvider
            .when('/home', {
                templateUrl: 'home/home.html',
                controller: 'homeController'
            })
            .when('/map', {
                templateUrl: 'map/map.html',
                controller: 'mapController'
            })
            .when('/map_data', {
                templateUrl: 'map_data/map_data.html',
                controller: 'mapDataController'
            })
            .when('/graph', {
                templateUrl: 'graph/graph.html',
                controller: 'graphController'
            })
            .when('/report', {
                templateUrl: 'report/report.html',
                controller: 'reportController'
            })
            .otherwise({
                redirectTo: '/home'
            });
    });

})();
