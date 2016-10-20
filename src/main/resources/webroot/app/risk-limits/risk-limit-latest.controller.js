/**
 * Created by jakub on 20/10/2016.
 */

(function() {
    'use strict';

    angular.module('dave').controller('RiskLimitLatestController', RiskLimitLatestController);

    function RiskLimitLatestController($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.paging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.rlLatest = [];
        $scope.rlSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.ordering= ["clearer", "member", "maintainer", "limitType"];

        if ($routeParams.clearer) { $scope.clearer = $routeParams.clearer } else { $scope.clearer = "*" }
        if ($routeParams.member) { $scope.member = $routeParams.member } else { $scope.member = "*" }
        if ($routeParams.maintainer) { $scope.maintainer = $routeParams.maintainer } else { $scope.maintainer = "*" }
        if ($routeParams.limitType) { $scope.limitType = $routeParams.limitType } else { $scope.limitType = "*" }

        $scope.url = '/api/v1.0/rl/latest/' + $scope.clearer + '/' + $scope.member + '/' + $scope.maintainer + '/' + $scope.limitType;

        $http.get($scope.url).success(function(data) {
            $scope.processRiskLimits(data);
            $scope.error = "";
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processRiskLimits = function(data) {
            var index;

            for (index = 0; index < data.length; ++index) {
                data[index].functionalKey = data[index].clearer + '-' + data[index].member + '-' + data[index].maintainer + '-' + data[index].limitType;
            }

            $scope.rlSource = data;
            $scope.filter();
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering[0] == column)
            {
                $scope.ordering = ["-" + column, "clearer", "member", "maintainer", "limitType"];
            }
            else {
                $scope.ordering = [column, "clearer", "member", "maintainer", "limitType"];
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.rlLatest = $filter('orderBy')($filter('spacedFilter')($scope.rlSource, $scope.recordQuery), $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

        $scope.filter = function() {
            $scope.recordCount = $filter('spacedFilter')($scope.rlSource, $scope.recordQuery).length;

            $scope.updatePaging();
            $scope.updateViewport();
        };

        $scope.pagingNext = function() {
            if ($scope.page < Math.ceil($scope.recordCount/$scope.pageSize))
            {
                $scope.page++;
            }

            $scope.updateViewport();
            $scope.updatePaging();
        };

        $scope.pagingPrevious = function() {
            if ($scope.page > 1)
            {
                $scope.page--;
            }

            $scope.updateViewport();
            $scope.updatePaging();
        };

        $scope.pagingFirst = function() {
            $scope.page = 1;
            $scope.updateViewport();
            $scope.updatePaging();
        };

        $scope.pagingLast = function() {
            $scope.page = Math.ceil($scope.recordCount/$scope.pageSize);
            $scope.updateViewport();
            $scope.updatePaging();
        };

        $scope.pagingGoTo = function(pageNo) {
            $scope.page = pageNo;
            $scope.updateViewport();
            $scope.updatePaging();
        };

        $scope.updatePaging = function() {
            var tempPaging = $scope.paging;
            var pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

            if ($scope.page > pageCount)
            {
                $scope.page = pageCount;
                $scope.updateViewport();
            }

            if ($scope.page < 1)
            {
                $scope.page = 1;
                $scope.updateViewport();
            }

            if ($scope.page == 1) {
                tempPaging.first.class = "disabled";
                tempPaging.previous.class = "disabled";
            }
            else {
                tempPaging.first.class = "";
                tempPaging.previous.class = "";
            }

            tempPaging.pages = [];

            if ($scope.page > 3)
            {
                tempPaging.pages.push({"page": $scope.page-3, "class": ""});
            }

            if ($scope.page > 2)
            {
                tempPaging.pages.push({"page": $scope.page-2, "class": ""});
            }

            if ($scope.page > 1)
            {
                tempPaging.pages.push({"page": $scope.page-1, "class": ""});
            }

            tempPaging.pages.push({"page": $scope.page, "class": "active"});

            if ($scope.page < pageCount)
            {
                tempPaging.pages.push({"page": $scope.page+1, "class": ""});
            }

            if ($scope.page < pageCount-1)
            {
                tempPaging.pages.push({"page": $scope.page+2, "class": ""});
            }

            if ($scope.page < pageCount-2)
            {
                tempPaging.pages.push({"page": $scope.page+3, "class": ""});
            }

            if ($scope.page == pageCount) {
                tempPaging.next.class = "disabled";
                tempPaging.last.class = "disabled";
            }
            else {
                tempPaging.next.class = "";
                tempPaging.last.class = "";
            }

            $scope.paging = tempPaging;
        };

        $scope.refresh = $interval(function(){
            $http.get($scope.url).success(function(data) {
                $scope.processRiskLimits(data);
                $scope.error = "";
            }).error(function(data, status, headers, config) {
                $scope.error = "Server returned status " + status;
            });
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });
    };
})();