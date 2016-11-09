/**
 * Created by jakub on 20/10/2016.
 */

(function() {
    'use strict';

    angular.module('dave').controller('MarginComponentTreemapController', MarginComponentTreemapController);

    function MarginComponentTreemapController($scope, $http, $interval) {
        var vm = this;
        vm.initialLoad= true;
        vm.errorMessage = "";
        vm.chartObject = {};

        var refresh = $interval(loadData, 60000);
        var restQueryUrl = '/api/v1.0/mc/latest/';

        loadData();

        function loadData(){
            $http.get(restQueryUrl).success(function(data) {
                processGraphData(data);
                vm.errorMessage = "";
                vm.initialLoad = false;
            }).error(function(data, status, headers, config) {
                vm.errorMessage = "Server returned status " + status;
                vm.initialLoad = false;
            });
        }

        function processGraphData(data) {
            var chartObject = {};
            chartObject.type = "TreeMap";
            chartObject.options = {
                    backgroundColor: {
                        fill: 'transparent'
                    },
                    minColor: '#f5f50a',
                    //minColor: '#c88c5a',
//                    midColor: '#ddd',
                    maxColor: '#FA6969',
                    fontColor: 'black',
                    showScale: false,
                    highlightOnMouseOver: true,
                    headerHeight: 15,
                    maxDepth: 1,
                    maxPostDepth: 2
                };
            chartObject.data = {
                cols: [{
                    id: 'aggregation',
                    type: 'string'
                }, {
                    id: 'parent',
                    type: 'string'
                }, {
                    id: 'margin',
                    type: 'number'
                }],
                rows: [
                    {
                        c: [{
                            v:'all'
                        }, {
                            v:null
                        }, {
                            v:0
                        }]
                    }]
            };

            var index;
            var classes = {};
            var accounts = {};
            var members = {};

            for (index = 0; index < data.length; ++index) {
                if (data[index].additionalMargin === 0) continue;

                var ccy = data[index].clearer + '-' + data[index].member + '-' + data[index].account + '-' + data[index].clss + '-' + data[index].ccy;
                var clss = data[index].clearer + '-' + data[index].member + '-' + data[index].account + '-' + data[index].clss;
                var account = data[index].clearer + '-' + data[index].member + '-' + data[index].account;
                var member = data[index].clearer + '-' + data[index].member;

                chartObject.data.rows.push({c: [{
                            v: ccy
                        }, {
                            v: clss
                        }, {
                            v: data[index].additionalMargin
                        }
                    ]});

                if (!(clss in classes))
                {
                    chartObject.data.rows.push({c: [{
                        v: clss
                    }, {
                        v: account
                    }, {
                        v: 0
                    }
                    ]});

                    classes[clss] = true;
                }

                if (!(account in accounts))
                {
                    chartObject.data.rows.push({c: [{
                                v: account
                            }, {
                                v: member
                            }, {
                                v: 0
                            }
                        ]});

                    accounts[account] = true;
                }

                if (!(member in members))
                {
                    chartObject.data.rows.push({c: [{
                                v: member
                            }, {
                                v: 'all'
                            }, {
                                v: 0
                            }
                        ]});

                    members[member] = true;
                }
            }

            vm.chartObject = chartObject;
        }

        $scope.$on("$destroy", function() {
            if (refresh !== null) {
                $interval.cancel(refresh);
            }
        });
    };
})();