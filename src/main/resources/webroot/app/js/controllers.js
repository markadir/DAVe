/**
 * Created by jakub on 15.12.14.
 */

var daveControllers = angular.module('daveControllers', ['angular.morris']);

daveControllers.controller('Login', ['$scope', '$http', '$interval', '$rootScope', '$location',
    function($scope, $http, $interval, $rootScope, $location) {
        $rootScope.authStatus = false;
        $rootScope.authUsername = "";
        $scope.authError = null;
        $scope.refresh = null;
        $scope.statusUrl = '/api/v1.0/user/loginStatus';
        $scope.loginUrl = '/api/v1.0/user/login';
        $scope.logoutUrl = '/api/v1.0/user/logout';

        $http.get($scope.statusUrl).success(function(data) {
            if (data.username != null) {
                $rootScope.authStatus = true;
                $rootScope.authUsername = data.username;

                if ($rootScope.authRequestedPath) {
                    path = $rootScope.authRequestedPath;
                    $rootScope.authRequestedPath = null;
                    $location.path(path);
                }
            }
            else {
                $rootScope.authStatus = false;
                $rootScope.authUsername = "";

                if ($location.path() != "/login")
                {
                    $location.path( "/login" );
                }
            }
        })
        .error(function(data) {
            $rootScope.authStatus = false;
            $rootScope.authUsername = "";

            if ($location.path() != "/login")
            {
                $location.path( "/login" );
            }
        });

        $scope.login = function(username, password) {
            $scope.authError = null;
            loginData = { "username": username, "password": password };

            $http.post($scope.loginUrl, loginData).success(function(data) {
                $rootScope.authStatus = true;
                $rootScope.authUsername = username;

                if ($rootScope.authRequestedPath) {
                    path = $rootScope.authRequestedPath;
                    $rootScope.authRequestedPath = null;
                    $location.path(path);
                }
            }).error(function(data) {
                $scope.authError = "Authentication failed. Is the username and password correct?";
            });
        }

        $scope.logout = function(username, password) {
            $http.get($scope.logoutUrl).success(function(data) {
                $rootScope.authStatus = false;
                $rootScope.authUsername = "";
                $location.path( "/login" );
            }).error(function(data) {
                // Nothing
            });
        }

        $scope.refresh = $interval(function(){
            $http.get($scope.statusUrl).success(function(data) {
                if (data.username != null) {
                    $rootScope.authStatus = true;
                    $rootScope.authUsername = data.username;
                }
                else {
                    $rootScope.authStatus = false;
                    $rootScope.authUsername = "";

                    if ($location.path() != "/login")
                    {
                        $rootScope.authRequestedPath = $location.path();
                        $location.path( "/login" );
                    }
                }
            })
            .error(function(data) {
                $rootScope.authStatus = false;
                $rootScope.authUsername = "";

                if ($location.path() != "/login")
                {
                    $rootScope.authRequestedPath = $location.path();
                    $location.path( "/login" );
                }
            });
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });
    }]);

daveControllers.controller('PositionReportLatest', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.prPaging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.prLatest = [];
        $scope.prSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.recordQuery = "";
        $scope.ordering= ["member", "account", "symbol", "putCall", "strikePrice", "optAttribute", "maturityMonthYear"];

        if ($routeParams.clearer) { $scope.clearer = $routeParams.clearer; } else { $scope.clearer = "*" }
        if ($routeParams.member) { $scope.member = $routeParams.member; } else { $scope.member = "*" }
        if ($routeParams.account) { $scope.account = $routeParams.account; } else { $scope.account = "*" }
        if ($routeParams.class) { $scope.class = $routeParams.class; } else { $scope.class = "*" }
        if ($routeParams.symbol) { $scope.symbol = $routeParams.symbol; } else { $scope.symbol = "*" }
        if ($routeParams.putCall) { $scope.putCall = $routeParams.putCall; } else { $scope.putCall = "*" }
        if ($routeParams.strikePrice) { $scope.strikePrice = $routeParams.strikePrice; } else { $scope.strikePrice = "*" }
        if ($routeParams.optAttribute) { $scope.optAttribute = $routeParams.optAttribute; } else { $scope.optAttribute = "*" }
        if ($routeParams.maturityMonthYear) { $scope.maturityMonthYear = $routeParams.maturityMonthYear; } else { $scope.maturityMonthYear = "*" }

        $scope.url = '/api/v1.0/pr/latest/' + $scope.clearer + '/' + $scope.member + '/' + $scope.account + '/' + $scope.class + '/' + $scope.symbol + '/' + $scope.putCall + '/' + $scope.strikePrice + '/' + $scope.optAttribute + "/" + $scope.maturityMonthYear;

        $http.get($scope.url).success(function(data) {
            $scope.processPositionReports(data);
            $scope.initialLoad = false;
            $scope.error = "";
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processPositionReports = function(positionReports) {
            var index;

            for (index = 0; index < positionReports.length; ++index) {
                positionReports[index].functionalKey = positionReports[index].clearer + '-' + positionReports[index].member + '-' + positionReports[index].account + '-' + positionReports[index].clss + '-' + positionReports[index].symbol + '-' + positionReports[index].putCall + '-' + positionReports[index].maturityMonthYear + '-' + positionReports[index].strikePrice.replace("\.", "") + '-' + positionReports[index].optAttribute + '-' + positionReports[index].maturityMonthYear;
                positionReports[index].netLS = positionReports[index].crossMarginLongQty - positionReports[index].crossMarginShortQty;
                positionReports[index].netEA = (positionReports[index].optionExcerciseQty - positionReports[index].optionAssignmentQty) + (positionReports[index].allocationTradeQty - positionReports[index].deliveryNoticeQty);
            }

            $scope.prSource = positionReports;
            $scope.filter();
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering[0] == column)
            {
                $scope.ordering = ["-" + column, "member", "account", "symbol", "putCall", "strikePrice", "optAttribute", "maturityMonthYear"];
            }
            else {
                $scope.ordering = [column, "member", "account", "symbol", "putCall", "strikePrice", "optAttribute", "maturityMonthYear"];
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.prLatest = $filter('orderBy')($filter('spacedFilter')($scope.prSource, $scope.recordQuery), $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }
        
        $scope.filter = function() {
            $scope.recordCount = $filter('spacedFilter')($scope.prSource, $scope.recordQuery).length;

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
            tempPrPaging = $scope.prPaging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                tempPrPaging.first.class = "disabled";
                tempPrPaging.previous.class = "disabled";
            }
            else {
                tempPrPaging.first.class = "";
                tempPrPaging.previous.class = "";
            }

            tempPrPaging.pages = [];

            if ($scope.page > 3)
            {
                tempPrPaging.pages.push({"page": $scope.page-3, "class": ""});
            }

            if ($scope.page > 2)
            {
                tempPrPaging.pages.push({"page": $scope.page-2, "class": ""});
            }

            if ($scope.page > 1)
            {
                tempPrPaging.pages.push({"page": $scope.page-1, "class": ""});
            }

            tempPrPaging.pages.push({"page": $scope.page, "class": "active"});

            if ($scope.page < pageCount)
            {
                tempPrPaging.pages.push({"page": $scope.page+1, "class": ""});
            }

            if ($scope.page < pageCount-1)
            {
                tempPrPaging.pages.push({"page": $scope.page+2, "class": ""});
            }

            if ($scope.page < pageCount-2)
            {
                tempPrPaging.pages.push({"page": $scope.page+3, "class": ""});
            }

            if ($scope.page == pageCount) {
                tempPrPaging.next.class = "disabled";
                tempPrPaging.last.class = "disabled";
            }
            else {
                tempPrPaging.next.class = "";
                tempPrPaging.last.class = "";
            }

            $scope.prPaging = tempPrPaging;
        };

        $scope.showExtra = function(funcKey) {
            extra = $("#extra-" + funcKey);
            extraIcon = $("#extra-icon-" + funcKey);

            if (extra.hasClass("hidden"))
            {
                extra.removeClass("hidden");
                extraIcon.removeClass("fa-chevron-circle-down");
                extraIcon.addClass("fa-chevron-circle-up");
            }
            else {
                extra.addClass("hidden");
                extraIcon.removeClass("fa-chevron-circle-up");
                extraIcon.addClass("fa-chevron-circle-down");
            }
        };

        $scope.refresh = $interval(function(){
            $http.get($scope.url).success(function(data) {
                $scope.processPositionReports(data);
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
    }]);

daveControllers.controller('PositionReportHistory', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.prPaging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.prHistory = [];
        $scope.prSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.prChartData = [];
        $scope.ordering="-received";

        $scope.clearer = $routeParams.clearer;
        $scope.member = $routeParams.member;
        $scope.account = $routeParams.account;
        $scope.class = $routeParams.class;
        $scope.symbol = $routeParams.symbol;
        $scope.putCall = $routeParams.putCall;
        $scope.strikePrice = $routeParams.strikePrice;
        $scope.optAttribute = $routeParams.optAttribute;
        $scope.maturityMonthYear = $routeParams.maturityMonthYear;

        $scope.url = '/api/v1.0/pr/history/' + $scope.clearer + '/' + $scope.member + '/' + $scope.account + '/' + $scope.class + '/' + $scope.symbol + '/' + $scope.putCall + '/' + $scope.strikePrice + '/' + $scope.optAttribute + '/' + $scope.maturityMonthYear;

        $scope.processPositionReports = function(positionReports) {
            var index;

            for (index = 0; index < positionReports.length; ++index) {
                positionReports[index].netLS = positionReports[index].crossMarginLongQty - positionReports[index].crossMarginShortQty;
                positionReports[index].netEA = (positionReports[index].optionExcerciseQty - positionReports[index].optionAssignmentQty) + (positionReports[index].allocationTradeQty - positionReports[index].deliveryNoticeQty);
            }

            $scope.prSource = positionReports;
            $scope.recordCount = positionReports.length;
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $http.get($scope.url).success(function(data) {
            $scope.error = "";
            $scope.processPositionReports(data);
            $scope.prepareGraphData($scope.prHistory);
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.sortRecords = function(column) {
            if ($scope.ordering == column)
            {
                $scope.ordering = "-" + column;
            }
            else {
                $scope.ordering = column;
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.prHistory = $filter('orderBy')($scope.prSource, $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

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
            tempPrPaging = $scope.prPaging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                tempPrPaging.first.class = "disabled";
                tempPrPaging.previous.class = "disabled";
            }
            else {
                tempPrPaging.first.class = "";
                tempPrPaging.previous.class = "";
            }

            tempPrPaging.pages = [];

            if ($scope.page > 3)
            {
                tempPrPaging.pages.push({"page": $scope.page-3, "class": ""});
            }

            if ($scope.page > 2)
            {
                tempPrPaging.pages.push({"page": $scope.page-2, "class": ""});
            }

            if ($scope.page > 1)
            {
                tempPrPaging.pages.push({"page": $scope.page-1, "class": ""});
            }

            tempPrPaging.pages.push({"page": $scope.page, "class": "active"});

            if ($scope.page < pageCount)
            {
                tempPrPaging.pages.push({"page": $scope.page+1, "class": ""});
            }

            if ($scope.page < pageCount-1)
            {
                tempPrPaging.pages.push({"page": $scope.page+2, "class": ""});
            }

            if ($scope.page < pageCount-2)
            {
                tempPrPaging.pages.push({"page": $scope.page+3, "class": ""});
            }

            if ($scope.page == pageCount) {
                tempPrPaging.next.class = "disabled";
                tempPrPaging.last.class = "disabled";
            }
            else {
                tempPrPaging.next.class = "";
                tempPrPaging.last.class = "";
            }

            $scope.prPaging = tempPrPaging;
        };

        $scope.showExtra = function(funcKey) {
            extra = $("#extra-" + funcKey);
            extraIcon = $("#extra-icon-" + funcKey);

            if (extra.hasClass("hidden"))
            {
                extra.removeClass("hidden");
                extraIcon.removeClass("fa-chevron-circle-down");
                extraIcon.addClass("fa-chevron-circle-up");
            }
            else {
                extra.addClass("hidden");
                extraIcon.removeClass("fa-chevron-circle-up");
                extraIcon.addClass("fa-chevron-circle-down");
            }
        };

        $scope.refresh = $interval(function(){
            $http.get($scope.url).success(function(data) {
                $scope.error = "";
                $scope.processPositionReports(data);
                $scope.prepareGraphData($scope.prHistory);
            }).error(function(data, status, headers, config) {
                $scope.error = "Server returned status " + status;
            });
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });

        $scope.prepareGraphData = function(data) {
            $scope.prChartData = []

            var index;

            for (index = 0; index < data.length; ++index) {
                tick = {
                    period: $filter('date')(data[index].received, "yyyy-MM-dd HH:mm:ss"),
                    netLS: data[index].netLS,
                    netEA: data[index].netEA,
                    mVar: data[index].mVar,
                    compVar: data[index].compVar,
                    delta: data[index].delta,
                    compLiquidityAddOn: data[index].compLiquidityAddOn
                };

                $scope.prChartData.push(tick);
            }
        }
    }]);

daveControllers.controller('MarginComponentLatest', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.mcPaging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.mcLatest = [];
        $scope.mcSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.ordering= ["member", "account", "clss", "ccy"];

        if ($routeParams.clearer) { $scope.clearer = $routeParams.clearer } else { $scope.clearer = "*" }
        if ($routeParams.member) { $scope.member = $routeParams.member } else { $scope.member = "*" }
        if ($routeParams.account) { $scope.account = $routeParams.account } else { $scope.account = "*" }
        if ($routeParams.class) { $scope.class = $routeParams.class } else { $scope.class = "*" }
        if ($routeParams.ccy) { $scope.ccy = $routeParams.ccy } else { $scope.ccy = "*" }

        $scope.url = '/api/v1.0/mc/latest/' + $scope.clearer + '/' + $scope.member + '/' + $scope.account + '/' + $scope.class + '/' + $scope.ccy;

        $http.get($scope.url).success(function(data) {
            $scope.processMarginComponents(data);
            $scope.error = "";
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processMarginComponents = function(data) {
            var index;

            for (index = 0; index < data.length; ++index) {
                data[index].functionalKey = data[index].clearer + '-' + data[index].member + '-' + data[index].account + '-' + data[index].clss + '-' + data[index].ccy;
            }

            $scope.mcSource = data;
            $scope.filter();
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering[0] == column)
            {
                $scope.ordering = ["-" + column, "member", "account", "clss", "ccy"];
            }
            else {
                $scope.ordering = [column, "member", "account", "clss", "ccy"];
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.mcLatest = $filter('orderBy')($filter('spacedFilter')($scope.mcSource, $scope.recordQuery), $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

        $scope.filter = function() {
            $scope.recordCount = $filter('spacedFilter')($scope.mcSource, $scope.recordQuery).length;

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
            tempMcPaging = $scope.mcPaging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                tempMcPaging.first.class = "disabled";
                tempMcPaging.previous.class = "disabled";
            }
            else {
                tempMcPaging.first.class = "";
                tempMcPaging.previous.class = "";
            }

            tempMcPaging.pages = [];

            if ($scope.page > 3)
            {
                tempMcPaging.pages.push({"page": $scope.page-3, "class": ""});
            }

            if ($scope.page > 2)
            {
                tempMcPaging.pages.push({"page": $scope.page-2, "class": ""});
            }

            if ($scope.page > 1)
            {
                tempMcPaging.pages.push({"page": $scope.page-1, "class": ""});
            }

            tempMcPaging.pages.push({"page": $scope.page, "class": "active"});

            if ($scope.page < pageCount)
            {
                tempMcPaging.pages.push({"page": $scope.page+1, "class": ""});
            }

            if ($scope.page < pageCount-1)
            {
                tempMcPaging.pages.push({"page": $scope.page+2, "class": ""});
            }

            if ($scope.page < pageCount-2)
            {
                tempMcPaging.pages.push({"page": $scope.page+3, "class": ""});
            }

            if ($scope.page == pageCount) {
                tempMcPaging.next.class = "disabled";
                tempMcPaging.last.class = "disabled";
            }
            else {
                tempMcPaging.next.class = "";
                tempMcPaging.last.class = "";
            }

            $scope.mcPaging = tempMcPaging;
        };
        
        $scope.refresh = $interval(function(){
            $http.get($scope.url).success(function(data) {
                $scope.processMarginComponents(data);
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
    }]);

daveControllers.controller('MarginComponentHistory', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.mcPaging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.mcHistory = [];
        $scope.mcSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.mcChartData = [];
        $scope.ordering="-received";

        $scope.clearer = $routeParams.clearer;
        $scope.member = $routeParams.member;
        $scope.account = $routeParams.account;
        $scope.class = $routeParams.class;
        $scope.ccy = $routeParams.ccy;

        $scope.url = '/api/v1.0/mc/history/' + $scope.clearer + '/' + $scope.member + '/' + $scope.account + '/' + $scope.class + '/' + $scope.ccy;

        $http.get($scope.url).success(function(data) {
            $scope.error = "";
            $scope.processMarginComponents(data);
            $scope.prepareGraphData(data);
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processMarginComponents = function(data) {
            $scope.mcSource = data;
            $scope.recordCount = data.length;
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering == column)
            {
                $scope.ordering = "-" + column;
            }
            else {
                $scope.ordering = column;
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.mcHistory = $filter('orderBy')($scope.mcSource, $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

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
            tempMcPaging = $scope.mcPaging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                tempMcPaging.first.class = "disabled";
                tempMcPaging.previous.class = "disabled";
            }
            else {
                tempMcPaging.first.class = "";
                tempMcPaging.previous.class = "";
            }

            tempMcPaging.pages = [];

            if ($scope.page > 3)
            {
                tempMcPaging.pages.push({"page": $scope.page-3, "class": ""});
            }

            if ($scope.page > 2)
            {
                tempMcPaging.pages.push({"page": $scope.page-2, "class": ""});
            }

            if ($scope.page > 1)
            {
                tempMcPaging.pages.push({"page": $scope.page-1, "class": ""});
            }

            tempMcPaging.pages.push({"page": $scope.page, "class": "active"});

            if ($scope.page < pageCount)
            {
                tempMcPaging.pages.push({"page": $scope.page+1, "class": ""});
            }

            if ($scope.page < pageCount-1)
            {
                tempMcPaging.pages.push({"page": $scope.page+2, "class": ""});
            }

            if ($scope.page < pageCount-2)
            {
                tempMcPaging.pages.push({"page": $scope.page+3, "class": ""});
            }

            if ($scope.page == pageCount) {
                tempMcPaging.next.class = "disabled";
                tempMcPaging.last.class = "disabled";
            }
            else {
                tempMcPaging.next.class = "";
                tempMcPaging.last.class = "";
            }

            $scope.mcPaging = tempMcPaging;
        };
        
        $scope.refresh = $interval(function(){
            $http.get($scope.url).success(function(data) {
                $scope.error = "";
                $scope.processMarginComponents(data);
                $scope.prepareGraphData(data);
            }).error(function(data, status, headers, config) {
                $scope.error = "Server returned status " + status;
            });
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });

        $scope.prepareGraphData = function(data) {
            $scope.mcChartData = []

            var index;

            for (index = 0; index < data.length; ++index) {
                tick = {
                    period: $filter('date')(data[index].received, "yyyy-MM-dd HH:mm:ss"),
                    variationMargin: data[index].variationMargin,
                    premiumMargin: data[index].premiumMargin,
                    liquiMargin: data[index].liquiMargin,
                    spreadMargin: data[index].spreadMargin,
                    additionalMargin: data[index].additionalMargin
                };

                $scope.mcChartData.push(tick);
            }
        }
    }]);

daveControllers.controller('TotalMarginRequirementLatest', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.paging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.tmrLatest = [];
        $scope.tmrSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.ordering= ["pool", "member", "account", "ccy"];

        if ($routeParams.clearer) { $scope.clearer = $routeParams.clearer } else { $scope.clearer = "*" }
        if ($routeParams.pool) { $scope.pool = $routeParams.pool } else { $scope.pool = "*" }
        if ($routeParams.member) { $scope.member = $routeParams.member } else { $scope.member = "*" }
        if ($routeParams.account) { $scope.account = $routeParams.account } else { $scope.account = "*" }
        if ($routeParams.ccy) { $scope.ccy = $routeParams.ccy } else { $scope.ccy = "*" }

        $scope.url = '/api/v1.0/tmr/latest/' + $scope.clearer + '/' + $scope.pool + '/' + $scope.member + '/' + $scope.account + '/' + $scope.ccy;

        $http.get($scope.url).success(function(data) {
            $scope.processTotalMarginRequirements(data);
            $scope.error = "";
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processTotalMarginRequirements = function(totalMarginRequirements) {
            var index;

            for (index = 0; index < totalMarginRequirements.length; ++index) {
                totalMarginRequirements[index].functionalKey = totalMarginRequirements[index].clearer + '-' + totalMarginRequirements[index].pool + '-' + totalMarginRequirements[index].member + '-' + totalMarginRequirements[index].account + '-' + totalMarginRequirements[index].ccy;
            }

            $scope.tmrSource = totalMarginRequirements;
            $scope.filter();
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering[0] == column)
            {
                $scope.ordering = ["-" + column, "pool", "member", "account", "ccy"];
            }
            else {
                $scope.ordering = [column, "pool", "member", "account", "ccy"];
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.tmrLatest = $filter('orderBy')($filter('spacedFilter')($scope.tmrSource, $scope.recordQuery), $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

        $scope.filter = function() {
            $scope.recordCount = $filter('spacedFilter')($scope.tmrSource, $scope.recordQuery).length;

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
            tempPaging = $scope.paging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                $scope.processTotalMarginRequirements(data);
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
    }]);

daveControllers.controller('TotalMarginRequirementHistory', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.paging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.tmrHistory = [];
        $scope.tmrSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.tmrChartData = [];
        $scope.tmrChartOptions = { legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].lineColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>" };
        $scope.ordering="-received";

        $scope.clearer = $routeParams.clearer;
        $scope.pool = $routeParams.pool;
        $scope.member = $routeParams.member;
        $scope.account = $routeParams.account;
        $scope.ccy = $routeParams.ccy;

        $scope.url = '/api/v1.0/tmr/history/' + $scope.clearer + '/' + $scope.pool + '/' + $scope.member + '/' + $scope.account + '/' + $scope.ccy;

        $http.get($scope.url).success(function(data) {
            $scope.error = "";
            $scope.processTotalMarginRequirements(data);
            $scope.prepareGraphData(data);
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processTotalMarginRequirements = function(data) {
            $scope.tmrSource = data;
            $scope.recordCount = data.length;
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering == column)
            {
                $scope.ordering = "-" + column;
            }
            else {
                $scope.ordering = column;
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.tmrHistory = $filter('orderBy')($scope.tmrSource, $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

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
            tempPaging = $scope.paging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                $scope.error = "";
                $scope.processTotalMarginRequirements(data);
                $scope.prepareGraphData(data);
            }).error(function(data, status, headers, config) {
                $scope.error = "Server returned status " + status;
            });
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });

        $scope.prepareGraphData = function(data) {
            $scope.tmrChartData = []

            var index;

            for (index = 0; index < data.length; ++index) {
                tick = {
                    period: $filter('date')(data[index].received, "yyyy-MM-dd HH:mm:ss"),
                    adjustedMargin: data[index].adjustedMargin,
                    unadjustedMargin: data[index].unadjustedMargin
                };

                $scope.tmrChartData.push(tick);
            }
        }
    }]);

daveControllers.controller('MarginShortfallSurplusLatest', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.paging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.mssLatest = [];
        $scope.mssSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.ordering= ["pool", "member", "clearingCcy", "ccy"];

        if ($routeParams.clearer) { $scope.clearer = $routeParams.clearer } else { $scope.clearer = "*" }
        if ($routeParams.pool) { $scope.pool = $routeParams.pool } else { $scope.pool = "*" }
        if ($routeParams.member) { $scope.member = $routeParams.member } else { $scope.member = "*" }
        if ($routeParams.clearingCcy) { $scope.clearingCcy = $routeParams.clearingCcy } else { $scope.clearingCcy = "*" }

        $scope.url = '/api/v1.0/mss/latest/' + $scope.clearer + '/' + $scope.pool + '/' + $scope.member + '/' + $scope.clearingCcy;

        $http.get($scope.url).success(function(data) {
            $scope.processMarginShortfallSurplus(data);
            $scope.error = "";
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processMarginShortfallSurplus = function(marginShortfallSurplus) {
            var index;

            for (index = 0; index < marginShortfallSurplus.length; ++index) {
                marginShortfallSurplus[index].functionalKey = marginShortfallSurplus[index].clearer + '-' + marginShortfallSurplus[index].pool + '-' + marginShortfallSurplus[index].member + '-' + marginShortfallSurplus[index].clearingCcy + '-' + marginShortfallSurplus[index].ccy;
            }

            $scope.mssSource = marginShortfallSurplus;
            $scope.filter();
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering[0] == column)
            {
                $scope.ordering = ["-" + column, "pool", "member", "clearingCcy", "ccy"];
            }
            else {
                $scope.ordering = [column, "pool", "member", "clearingCcy", "ccy"];
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.mssLatest = $filter('orderBy')($filter('spacedFilter')($scope.mssSource, $scope.recordQuery), $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

        $scope.filter = function() {
            $scope.recordCount = $filter('spacedFilter')($scope.mssSource, $scope.recordQuery).length;

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
            tempPaging = $scope.paging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                $scope.processMarginShortfallSurplus(data);
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
    }]);

daveControllers.controller('MarginShortfallSurplusHistory', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.paging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.mssHistory = [];
        $scope.mssSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.mssChartData = [];
        $scope.ordering="-received";

        $scope.clearer = $routeParams.clearer;
        $scope.pool = $routeParams.pool;
        $scope.member = $routeParams.member;
        $scope.clearingCcy = $routeParams.clearingCcy;
        $scope.ccy = $routeParams.ccy;

        $scope.url = '/api/v1.0/mss/history/' + $scope.clearer + '/' + $scope.pool + '/' + $scope.member + '/' + $scope.clearingCcy + '/' + $scope.ccy;

        $http.get($scope.url).success(function(data) {
            $scope.error = "";
            $scope.processMarginShortfallSurpluss(data);
            $scope.prepareGraphData(data);
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processMarginShortfallSurpluss = function(data) {
            $scope.mssSource = data;
            $scope.recordCount = data.length;
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering == column)
            {
                $scope.ordering = "-" + column;
            }
            else {
                $scope.ordering = column;
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.mssHistory = $filter('orderBy')($scope.mssSource, $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

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
            tempPaging = $scope.paging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                $scope.error = "";
                $scope.processMarginShortfallSurpluss(data);
                $scope.prepareGraphData(data);
            }).error(function(data, status, headers, config) {
                $scope.error = "Server returned status " + status;
            });
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });

        $scope.prepareGraphData = function(data) {
            $scope.mssChartData = []

            var index;

            for (index = 0; index < data.length; ++index) {
                tick = {
                    period: $filter('date')(data[index].received, "yyyy-MM-dd HH:mm:ss"),
                    marginRequirement: data[index].marginRequirement,
                    securityCollateral: data[index].securityCollateral,
                    cashBalance: data[index].cashBalance,
                    shortfallSurplus: data[index].shortfallSurplus,
                    marginCall: data[index].marginCall
                };

                $scope.mssChartData.push(tick);
            }
        }
    }]);

daveControllers.controller('RiskLimitLatest', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
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
            tempPaging = $scope.paging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
    }]);

daveControllers.controller('RiskLimitHistory', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.refresh = null;
        $scope.initialLoad = true;
        $scope.page = 1;
        $scope.pageSize = 20;
        $scope.paging = {"first": {"class": "disabled"}, "previous": {"class": "disabled"}, "pages": [], "next": {"class": "disabled"}, "last": {"class": "disabled"}};
        $scope.recordCount = 0;

        $scope.rlHistory = [];
        $scope.rlSource = [];
        $scope.existingRecords = [];
        $scope.error = "";
        $scope.historyChart = {
            "type": "ComboChart",
            "displayed": false,
            "data": {
                "cols": [
                    {
                        "id": "time",
                        "label": "Time",
                        "type": "datetime"
                    },
                    {
                        "id": "warning",
                        "label": "Warning limit",
                        "type": "number"
                    },
                    {
                        "id": "throttle",
                        "label": "Throttle limit",
                        "type": "number"
                    },
                    {
                        "id": "reject",
                        "label": "Reject limit",
                        "type": "number"
                    },
                    {
                        "id": "util",
                        "label": "Utilization",
                        "type": "number"
                    }
                ],
                "rows": []
            },
            "options": {
                seriesType: "area",
                series: {3: {type: 'line'}},
                //"title": "Risk Limit Utilization",
                "isStacked": "false",
                "fill": 20,
                "displayExactValues": false,
                height: 200,
                "vAxis": {
                    "title": "Utilization",
                    "format": "decimal",
                    "gridlines": {
                        "count": 10
                    }
                },
                "hAxis": {
                    "format":"HH:mm:ss",
                    "title": "Time"
                },
                "legend": {"position": 'bottom'}
            }
        };
        $scope.rlChartData = [];
        $scope.ordering="-received";

        $scope.clearer = $routeParams.clearer;
        $scope.member = $routeParams.member;
        $scope.maintainer = $routeParams.maintainer;
        $scope.limitType = $routeParams.limitType;

        $scope.url = '/api/v1.0/rl/history/' + $scope.clearer + '/' + $scope.member + '/' + $scope.maintainer + '/' + $scope.limitType;

        $http.get($scope.url).success(function(data) {
            $scope.error = "";
            $scope.processRiskLimits(data);
            $scope.prepareGraphData(data);
            $scope.prepareHistoryChart(data);
            $scope.initialLoad = false;
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
            $scope.initialLoad = false;
        });

        $scope.processRiskLimits = function(data) {
            $scope.rlSource = data;
            $scope.recordCount = data.length;
            $scope.updateViewport();
            $scope.updatePaging();
        }

        $scope.sortRecords = function(column) {
            if ($scope.ordering == column)
            {
                $scope.ordering = "-" + column;
            }
            else {
                $scope.ordering = column;
            }

            $scope.updateViewport();
        };

        $scope.updateViewport = function() {
            $scope.rlHistory = $filter('orderBy')($scope.rlSource, $scope.ordering).slice($scope.page*$scope.pageSize-$scope.pageSize, $scope.page*$scope.pageSize);
        }

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
            tempPaging = $scope.paging;
            pageCount = Math.ceil($scope.recordCount/$scope.pageSize);

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
                $scope.error = "";
                $scope.processRiskLimits(data);
                $scope.prepareGraphData(data);
                $scope.prepareHistoryChart(data);
            }).error(function(data, status, headers, config) {
                $scope.error = "Server returned status " + status;
            });
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });

        $scope.prepareHistoryChart = function(data)
        {
            rows = [];

            var index;

            for (index = 0; index < data.length; ++index) {
                tick = {
                    "c": [
                            {"v": new Date(data[index].received)},
                            {"v": data[index].warningLevel + 0},
                            {"v": data[index].throttleLevel + 0},
                            {"v": data[index].rejectLevel + 0},
                            {"v": data[index].utilization + 0}
                         ]
                };

                //console.log(tick);

                rows.push(tick);
            }

            $scope.historyChart.data.rows = rows;
        };

        $scope.prepareGraphData = function(data) {
            $scope.rlChartData = []

            var index;

            for (index = 0; index < data.length; ++index) {
                tick = {
                    period: $filter('date')(data[index].received, "yyyy-MM-dd HH:mm:ss"),
                    utilization: data[index].utilization,
                    warningLevel: data[index].warningLevel,
                    throttleLevel: data[index].throttleLevel,
                    rejectLevel: data[index].rejectLevel
                };

                $scope.rlChartData.push(tick);
            }
        }
    }]);

daveControllers.controller('Dashboard', ['$scope', '$routeParams', '$http', '$interval', '$filter',
    function($scope, $routeParams, $http, $interval, $filter) {
        $scope.chartMarginRequirementData = [];
        $scope.chartMarginShortfallSurplusData = [];
        $scope.chartMarginCallData = [];

        $scope.url = '/api/v1.0/mss/latest';

        $http.get($scope.url).success(function(data) {
            $scope.error = "";
            $scope.prepareGraphData(data);
        }).error(function(data, status, headers, config) {
            $scope.error = "Server returned status " + status;
        });

        $scope.refresh = $interval(function(){
            $http.get($scope.url).success(function(data) {
                $scope.error = "";
                $scope.prepareGraphData(data);
            }).error(function(data, status, headers, config) {
                $scope.error = "Server returned status " + status;
            });
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });

        $scope.prepareGraphData = function(data) {
            $scope.chartMarginRequirementData = [];
            $scope.chartMarginShortfallSurplusData = [];
            $scope.chartMarginCallData = [];

            var index;

            for (index = 0; index < data.length; ++index) {
                marginRequirementTick = {
                    label: data[index].pool + " / " + data[index].member + " / " + data[index].clearingCcy,
                    value: data[index].marginRequirement
                };

                marginShortfallSurplusTick = {
                    label: data[index].pool + " / " + data[index].member + " / " + data[index].clearingCcy,
                    value: data[index].shortfallSurplus
                };

                marginCallTick = {
                    label: data[index].pool + " / " + data[index].member + " / " + data[index].clearingCcy,
                    value: data[index].marginCall
                };

                $scope.chartMarginRequirementData.push(marginRequirementTick);
                $scope.chartMarginShortfallSurplusData.push(marginShortfallSurplusTick);
                $scope.chartMarginCallData.push(marginCallTick);
            }
        }
    }]);

daveControllers.controller('TssCtrl', ['$scope', '$http', '$interval', '$rootScope',
    function($scope, $http, $interval, $rootScope) {
        $scope.refresh = null;
        $scope.tss = null;
        $scope.url = '/api/v1.0/tss/latest';

        if ($rootScope.authStatus == true) {
            $http.get($scope.url).success(function (data) {
                $scope.tss = data;
            });
        }

        $scope.refresh = $interval(function(){
            if ($rootScope.authStatus == true) {
                $http.get($scope.url).success(function (data) {
                    $scope.tss = data;
                })
            }
        },60000);

        $scope.$on("$destroy", function() {
            if ($scope.refresh != null) {
                $interval.cancel($scope.refresh);
            }
        });
    }]);

daveControllers.controller('MenuCtrl', ['$scope', "$location",
    function($scope, $location) {
        $scope.amIActive = function(item) {
            //console.log("Item: " + item + ", location.url: " + $location.url() + " ... result is: " + $location.url().indexOf(item));
            if ($location.url().indexOf(item) > -1) {
                return "active";
            }
        };
    }]);
