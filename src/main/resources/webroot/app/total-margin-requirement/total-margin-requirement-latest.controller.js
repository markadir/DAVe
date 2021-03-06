/**
 * Created by jakub on 20/10/2016.
 */

(function() {
    'use strict';

    angular.module('dave').controller('TotalMarginRequirementLatestController', TotalMarginRequirementLatestController);

    function TotalMarginRequirementLatestController($scope, $routeParams, $http, $interval, sortRecordsService, recordCountService, updateViewWindowService, showExtraInfoService) {
        BaseLatestController.call(this, $scope, $routeParams, $http, $interval, sortRecordsService, recordCountService, updateViewWindowService, showExtraInfoService);
        var vm = this;
        vm.route = {
            "clearer": "*",
            "pool": "*",
            "member": "*",
            "account": "*",
            "ccy": "*"
        };
        vm.defaultOrdering = ["clearer", "pool", "member", "account", "ccy"];
        vm.routingKeys = ["clearer", "pool", "member", "account", "ccy"];
        vm.ordering = vm.defaultOrdering;
        vm.getRestQueryUrl = getRestQueryUrl;
        vm.processRecord = processRecord;

        vm.processRouting();
        vm.loadData();

        function processRecord(record) {
            record.functionalKey = record.clearer + '-' + record.pool + '-' + record.member + '-' + record.account + '-' + record.ccy;
        }

        function getRestQueryUrl() {
            return '/api/v1.0/tmr/latest/' + vm.route.clearer + '/' + vm.route.pool + '/' + vm.route.member + '/' + vm.route.account + '/' + vm.route.ccy;
        }
    };
})();
