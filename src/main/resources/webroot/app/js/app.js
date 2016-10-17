/**
 * Created by jakub on 15.12.14.
 */

var dave = angular.module('dave', [
    'ngRoute',
    'daveControllers',
    'daveFilters',
    'daveDirectives',
    'googlechart'
]);

dave.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/login', {
                templateUrl: 'app/view/login.html',
                controller: 'Login'
            }).
            when('/dashboard', {
                templateUrl: 'app/view/dashboard.html',
                controller: 'Dashboard'
            }).
            when('/positionReportLatest', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer/:member', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer/:member/:account', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer/:member/:account/:class', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer/:member/:account/:class/:symbol', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer/:member/:account/:class/:symbol/:putCall', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer/:member/:account/:class/:symbol/:putCall/:strikePrice', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer/:member/:account/:class/:symbol/:putCall/:strikePrice/:optAttribute', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportLatest/:clearer/:member/:account/:class/:symbol/:putCall/:strikePrice/:optAttribute/:maturityMonthYear', {
                templateUrl: 'app/view/positionReportLatest.html',
                controller: 'PositionReportLatest'
            }).
            when('/positionReportHistory/:clearer/:member/:account/:class/:symbol/:putCall/:strikePrice/:optAttribute/:maturityMonthYear', {
                templateUrl: 'app/view/positionReportHistory.html',
                controller: 'PositionReportHistory'
            }).
            when('/marginComponentLatest', {
                templateUrl: 'app/view/marginComponentLatest.html',
                controller: 'MarginComponentLatest'
            }).
            when('/marginComponentLatest/:clearer', {
                templateUrl: 'app/view/marginComponentLatest.html',
                controller: 'MarginComponentLatest'
            }).
            when('/marginComponentLatest/:clearer/:member', {
                templateUrl: 'app/view/marginComponentLatest.html',
                controller: 'MarginComponentLatest'
            }).
            when('/marginComponentLatest/:clearer/:member/:account', {
                templateUrl: 'app/view/marginComponentLatest.html',
                controller: 'MarginComponentLatest'
            }).
            when('/marginComponentLatest/:clearer/:member/:account/:class', {
                templateUrl: 'app/view/marginComponentLatest.html',
                controller: 'MarginComponentLatest'
            }).
            when('/marginComponentLatest/:clearer/:member/:account/:class/:ccy', {
                templateUrl: 'app/view/marginComponentLatest.html',
                controller: 'MarginComponentLatest'
            }).
            when('/marginComponentHistory/:clearer/:member/:account/:class/:ccy', {
                templateUrl: 'app/view/marginComponentHistory.html',
                controller: 'MarginComponentHistory'
            }).
            when('/totalMarginRequirementLatest', {
                templateUrl: 'app/view/totalMarginRequirementLatest.html',
                controller: 'TotalMarginRequirementLatest'
            }).
            when('/totalMarginRequirementLatest/:clearer', {
                templateUrl: 'app/view/totalMarginRequirementLatest.html',
                controller: 'TotalMarginRequirementLatest'
            }).
            when('/totalMarginRequirementLatest/:clearer/:pool', {
                templateUrl: 'app/view/totalMarginRequirementLatest.html',
                controller: 'TotalMarginRequirementLatest'
            }).
            when('/totalMarginRequirementLatest/:clearer/:pool/:member', {
                templateUrl: 'app/view/totalMarginRequirementLatest.html',
                controller: 'TotalMarginRequirementLatest'
            }).
            when('/totalMarginRequirementLatest/:clearer/:pool/:member/:account', {
                templateUrl: 'app/view/totalMarginRequirementLatest.html',
                controller: 'TotalMarginRequirementLatest'
            }).
            when('/totalMarginRequirementLatest/:clearer/:pool/:member/:account/:ccy', {
                templateUrl: 'app/view/totalMarginRequirementLatest.html',
                controller: 'TotalMarginRequirementLatest'
            }).
            when('/totalMarginRequirementHistory/:clearer/:pool/:member/:account/:ccy', {
                templateUrl: 'app/view/totalMarginRequirementHistory.html',
                controller: 'TotalMarginRequirementHistory'
            }).
            when('/marginShortfallSurplusLatest', {
                templateUrl: 'app/view/marginShortfallSurplusLatest.html',
                controller: 'MarginShortfallSurplusLatest'
            }).
            when('/marginShortfallSurplusLatest/:clearer', {
                templateUrl: 'app/view/marginShortfallSurplusLatest.html',
                controller: 'MarginShortfallSurplusLatest'
            }).
            when('/marginShortfallSurplusLatest/:clearer/:pool', {
                templateUrl: 'app/view/marginShortfallSurplusLatest.html',
                controller: 'MarginShortfallSurplusLatest'
            }).
            when('/marginShortfallSurplusLatest/:clearer/:pool/:member', {
                templateUrl: 'app/view/marginShortfallSurplusLatest.html',
                controller: 'MarginShortfallSurplusLatest'
            }).
            when('/marginShortfallSurplusLatest/:clearer/:pool/:member/:clearingCyy', {
                templateUrl: 'app/view/marginShortfallSurplusLatest.html',
                controller: 'MarginShortfallSurplusLatest'
            }).
            when('/marginShortfallSurplusHistory/:clearer/:pool/:member/:clearingCcy/:ccy', {
                templateUrl: 'app/view/marginShortfallSurplusHistory.html',
                controller: 'MarginShortfallSurplusHistory'
            }).
            when('/riskLimitLatest', {
                templateUrl: 'app/view/riskLimitLatest.html',
                controller: 'RiskLimitLatest'
            }).
            when('/riskLimitLatest/:clearer', {
                templateUrl: 'app/view/riskLimitLatest.html',
                controller: 'RiskLimitLatest'
            }).
            when('/riskLimitLatest/:clearer/:member', {
                templateUrl: 'app/view/riskLimitLatest.html',
                controller: 'RiskLimitLatest'
            }).
            when('/riskLimitLatest/:clearer/:member/:maintainer', {
                templateUrl: 'app/view/riskLimitLatest.html',
                controller: 'RiskLimitLatest'
            }).
            when('/riskLimitLatest/:clearer/:member/:maintainer/:limitType', {
                templateUrl: 'app/view/riskLimitLatest.html',
                controller: 'RiskLimitLatest'
            }).
            when('/riskLimitHistory/:clearer/:member/:maintainer/:limitType', {
                templateUrl: 'app/view/riskLimitHistory.html',
                controller: 'RiskLimitHistory'
            }).
            otherwise({
                redirectTo: '/dashboard'
            });
    }])
    .run( function($rootScope, $location) {
        // register listener to watch route changes
        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            if ($rootScope.authStatus == false) {
                // no logged user, we should be going to #login
                if (next.templateUrl == "app/view/login.html") {
                    // already going to #login, no redirect needed
                } else {
                    // not going to #login, we should redirect now
                    if ($location.path() == "")
                    {
                        $rootScope.authRequestedPath = "/dashboard";
                    }
                    else {
                        $rootScope.authRequestedPath = $location.path();
                    }

                    $location.path("/login");
                }
            }
        });
    });

