app.factory('itemService', function ($http, $log, $rootScope) {
    return {
        get: function () {
            return $http.get($rootScope.apiRootUrl + '/Indexes/Items?start=0&pageSize=50000&_=' + Date.now())
            .then(
             function (response) { return response.data.Results },
             function (httpError) {
                 throw httpError.status + " : " +
                       httpError.data;
             });
        }
    }
});
