
app.directive('tag', function ($http, $rootScope, $timeout) {
    return {
        restrict: 'E',
        scope: {
            item: '=',
            entityname: '=',
            fieldname: '=',
        },
        template:
            '<div>' +
             ' <label class="control-label">{{fieldname}}</label>' +
            '<div class="tags">' +
                '<button class="tag-button repeat-item" ng-repeat="(idx, tag) in item[fieldname] track by $index" ng-click="remove(idx)">'+
        '{{tag}}' +
        '<md-icon class="md-icon tag-remove-icon" md-svg-src="images/close.svg"></md-icon>' +
'</button><form name="myForm" ng-submit="myForm.$valid && submit()"><input name="myInput" type="text" ' +
                'ng-model="new_value"' +
                'typeahead="tags.Val for tags in getData($viewValue) | filter:$viewValue" ' +
                'typeahead-loading="loading" ' +
                'typeahead-focus-first="false" ' +
                'typeahead-editable="true" ' +
                'typeahead-on-select="onSelect($item, $model, $label); asyncSelected = \'\'" ' +
                'class="input"></input></form>' +
            '</div>' +
            '</div>',
        //'<i ng-show="loading" class="glyphicon glyphicon-refresh"></i> ' +
        //'<a class="btn" ng-click="add()">Ajouter</a>'

        link: function ($scope, $element, $attrs, $modelCtrl) {
            // FIXME: this is lazy and error-prone
            //var input = angular.element($element.children()[1]);
            var input = $($element).first("input");
            var test = input.controller().$viewValue;
            // This adds the new tag to the tags array
            $scope.add = function () {
                if (!$scope.new_value)
                    return;

             

                if (!$scope.item[$scope.fieldname])
                    $scope.item[$scope.fieldname] = new Array();
                if ($scope.item[$scope.fieldname].indexOf($scope.new_value) == -1) {
                    $scope.item[$scope.fieldname].push($scope.new_value);
                    $scope.update();
                }
                $scope.new_value = "";
            };

            $scope.onSelect = function ($item, $model, $label) {
                $scope.add();
            };

            $scope.tags = [];
            $scope.loading = false;
            $scope.getData = function (value) {
                $scope.loading = true;
                
                return $http.get($rootScope.apiRootUrl + '/indexes/' + $scope.fieldname, {
                    params: {
                        sort: "Val",
                        query: "Val:" + value + "*",
                        pageSize: 10,
                        _: Date.now(),
                    }
                }).then(function (res) {
                    
                    $scope.loading = false;
                    var outputArray = [];
                    if (!value)
                        return [];
                    angular.forEach(res.data.Results, function (item) {
                        if (value && item.Val.substr(0, value.length).toLowerCase() == value.toLowerCase()) {
                            outputArray.push(item);
                        }
                    });
                    return outputArray;
                });
            };


            // This is the ng-click handler to remove an item
            $scope.remove = function (idx) {
                $scope.item[$scope.fieldname].splice(idx, 1);
                if ($scope.item[$scope.fieldname].length == 0) {
                    delete $scope.item[$scope.fieldname]
                }
                $scope.update();
            };

            $scope.update = function () {
                // put tags before to get id back  
                $http({
                    method: 'PUT',
                    headers: { 'Raven-Entity-Name': $scope.entityname },
                    url: $rootScope.apiRootUrl + '/docs/' + $scope.item.Id,
                    data: angular.toJson($scope.item)
                }).
                    success(function (data, status, headers, config) {
                    }).
                    error(function (data, status, headers, config) {

                    });
            };
            $scope.submit = function () {
                $scope.add();
                var instance = $scope.myForm.myInput;
                instance.$setViewValue('');
                instance.$render();
            }
            //input.bind('keypress', function (event) {
            //    // But we only care when Enter was pressed
            //    if (event.keyCode == 13) {
            //        // There's probably a better way to handle this...
            //        $scope.add();
            //    }
            
            //});
            input.bind('keyup', function (event) {
                // But we only care when Enter was pressed
                if (event.keyCode == 13) {
                    // There's probably a better way to handle this...
                    event.preventDefault();
                    //setTimeout(function(){
                    //    $('.input').blur();
                    //},1000)
                    
                    $scope.$apply();
                }

            });
            $scope.$watch('new_value', function (newValue) {
                if (newValue == '')
                    delete $scope.new_value;
            })
        }
    };
});


