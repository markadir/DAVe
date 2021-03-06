/**
 * Created by jakub on 20/10/2016.
 */

(function() {
    'use strict';

    angular.module('dave').controller('MarginComponentLatestController', MarginComponentLatestController);

    function MarginComponentLatestController($scope, $routeParams, $http, $interval, sortRecordsService, recordCountService, updateViewWindowService) {
        BaseLatestController.call(this, $scope, $routeParams, $http, $interval, sortRecordsService, recordCountService, updateViewWindowService);
        var vm = this;
        vm.route = {
            "clearer": "*",
            "member": "*",
            "account": "*",
            "class": "*",
            "ccy": "*"
        };
        vm.defaultOrdering = ["clearer", "member", "account", "class", "ccy"];
        vm.routingKeys = ["clearer", "member", "account", "class", "ccy"];
        vm.ordering = vm.defaultOrdering;
        vm.getRestQueryUrl = getRestQueryUrl;
        vm.processRecord = processRecord;

        vm.processRouting();
        vm.loadData();

        function processRecord(record) {
            record.functionalKey = record.clearer + '-' + record.member + '-' + record.account + '-' + record.clss + '-' + record.ccy;
        }

        function getRestQueryUrl() {
            return '/api/v1.0/mc/latest/' + vm.route.clearer + '/' + vm.route.member + '/' + vm.route.account + '/' + vm.route.class + '/' + vm.route.ccy;
        }
    };
})();