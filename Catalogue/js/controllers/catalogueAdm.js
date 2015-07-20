
var Item = function () {
    this.Auteurs = [];
    this.Tags = [];
    this.Image = "";
};

var Update = function () {
    this.Type = "";
    this.Name = "";
};

app.controller("catalogueAdm", function ($scope, $rootScope, $http, $timeout, $q, itemService, $filter, $mdDialog, $upload) {
    //$rootScope.apiRootUrl = "http://62.23.104.30/databases/catalogueIllustration";
    $rootScope.apiRootUrl = "http://localhost:8088/databases/catalogueIllustration";

    $scope.entityName = "Item"
    $scope.items = [];
    $scope.tags = [];
    $scope.searchPattern = "*";
    $scope.searchedText = {};
    $scope.searchedText.Val = "";
    $scope.itemModalController = "";

    $scope.init = function () {
        itemAdded = 0;


        itemService.get()
          .then(function (items) {

              var $container = $('#Container');
              if ($container.mixItUp('isLoaded')) {
                  $container.mixItUp('destroy')
              }
              delayLoop(items, 0, 0, function (item) {
                  item.filter = "";
                  item.Id = item['@metadata']['@id'];

                  if (item.Auteurs) {
                      item.filter += item.Auteurs.map(function (val) {
                          return tokenizeString(val);
                      }).join(' ');
                  }
                  
                  if (item.Tags) {
                      item.filter += " " + item.Tags.map(function (val) {
                          return tokenizeString(val);
                      }).join(' ');
                  }

                  
                  $scope.items.push(item);
                  if ($scope.items.length == 23) {
                      $scope.$apply();
                      if (!$container.mixItUp('isLoaded')) {
                          $container.mixItUp({ animation: { enable: enableAnimation } });
                      }
                  }

                  if ($scope.items.length % 30 == 0) {
                      $scope.$apply();
                      if ($container.mixItUp('isLoaded')) {
                          $container.mixItUp('filter', $scope.searchPattern);
                      }
                  }


                  if ($scope.items.length == items.length) {

                      $scope.$apply();
                      $scope.dataReady = true;
                      if (!$container.mixItUp('isLoaded')) {
                          $container.mixItUp({ animation: { enable: enableAnimation } });
                      } else {
                          $container.mixItUp('filter', $scope.searchPattern);
                      }
                  }
              });
          })
    };


    $scope.delete = function (item, $event) {
        if ($event) {
            $event.stopPropagation();
            $event.stopImmediatePropagation();
        }

        $scope.removeAttachment(item, 'Image');

        $http({
            method: 'DELETE',
            headers: { 'Raven-Entity-Name': $scope.entityName },
            url: $rootScope.apiRootUrl + '/docs/' + item.Id,
        }).
          success(function (data, status, headers, config) {
              $scope.items.splice($scope.items.indexOf(item), 1);
          }).
          error(function (data, status, headers, config) {
              console.log(data);
          });
    };

    $scope.removeAttachment = function (item, field) {
        if (item[field]) {
            $http({
                method: 'DELETE',
                url: $rootScope.apiRootUrl + '/' + item[field]
            }).
              //success(function (data, status, headers, config) {
              //}).
              error(function (data, status, headers, config) {
                  console.log(data);
              });
        }
    }

    $scope.select = function (item, $event) {
        $scope.selectedItem = item;
        $mdDialog.show({
            targetEvent: $event,
            templateUrl: 'itemModal.tmpl.html',
            controller: 'itemModalController',
            //onComplete: afterShowItemDialog,
            locals: {
                selectedItem: $scope.selectedItem,
                parentScope: $scope
            }
        }).then(function () {
            $scope.itemModalController.onCloseDialog()
        }, function () {
            $scope.itemModalController.onCloseDialog()
        });
    }

    $scope.addByDragAndDrop = function ($files, $event, $rejectedFiles) {
        var prom = [];
        angular .forEach($files, function (file, key) {
           
            var item = new Item;
            //livre.datePublication = moment().format();
            var defer = $q.defer();
            prom.push(defer.promise);
            $scope.addItem(item).success(function (data, status, headers, config) {
                item.Id = data.Key;
                $timeout(function () {
                    $scope.items.unshift(item);
                    $scope.$apply();
                    $("#Container").mixItUp('filter', $scope.searchPattern);
                })

               
                    
                    resizeImage(file, $q.defer()).then(function (fileBlob) {
                        $upload.http({
                            url: $rootScope.apiRootUrl + '/static/' + item.Id + '/' + fileBlob.name,
                            method: "PUT",
                            headers: { 'Content-Type': fileBlob.blob.type },
                            data: fileBlob.blob
                        }).progress(function (evt) {
                            // Math.min is to fix IE which reports 200% sometimes
                            //   $scope.progress[index] = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                            console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
                        }).success(function (data, status, headers, config) {
                            // mise à jour du livre avec l'URI de l'image
                            $scope.setAttachment(fileBlob.name, item, 'Image');

                            var fileReader = new FileReader();
                            fileReader.onload = function (e) {
                            // upload hi resolution
                            $upload.http({
                                url: $rootScope.apiRootUrl + '/static/' + item.Id + '/HI_' + file.name,
                                method: "PUT",
                                headers: { 'Content-Type': file.type },
                                data: e.target.result
                            }).progress(function (evt) {
                                // Math.min is to fix IE which reports 200% sometimes
                                //   $scope.progress[index] = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                                console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
                            }).success(function (data, status, headers, config) {
                                // mise à jour du livre avec l'URI de l'image
                               // $scope.setAttachment('HI_' + file.name, item, 'ImageHi');

                            }).error(function (err) {
                                alert('Error occured during upload');
                            });
                            }
                            fileReader.readAsArrayBuffer(file);



                        }).error(function (err) {
                            alert('Error occured during upload');
                        });
                    }

                    ), function (errorPayload) {
                        alert('Error occured during resize');
                    };


                defer.resolve();
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        });
        $q.all(prom).finally(function () {
            $scope.sort();
        });

    };
    $scope.setAttachment = function (fileName, item, fieldName) {
        var attachmentUrl = 'static/' + item.Id + '/' + fileName;
        var update = new Update();
        update.Type = 'Set';
        update.Name = fieldName;
        update.Value = fileName;
        $http({
            method: 'PATCH',
            headers: { 'Raven-Entity-Name': $scope.entityName },
            url: $rootScope.apiRootUrl + '/docs/' + item.Id,
            data: angular.toJson(new Array(update))
        }).
            success(function (data, status, headers, config) {
                item[fieldName] = fileName;
                console.log(fieldName)
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
    };

    $scope.addItem = function (item) {
        return $http({
            method: 'PUT',
            headers: { 'Raven-Entity-Name': $scope.entityName },
            url: $rootScope.apiRootUrl + '/docs/' + $scope.entityName + '%2F',
            data: angular.toJson(item)
        })
    }
    $scope.add = function ($event) {
        var item = new Item;
        $scope.selectedItem = item;
        $scope.addItem(item).success(function (data, status, headers, config) {
            item.Id = data.Key;
            $mdDialog.show({
                targetEvent: $event,
                templateUrl: 'itemModal.tmpl.html',
                controller: 'itemModalController',
                //onComplete: afterShowItemDialog,
                locals: {
                    selectedItem: $scope.selectedItem,
                    parentScope: $scope
                }
            })
            //    .finally(function () {
            //    alert("close");
            //});

            $timeout(function () {
                $scope.items.unshift($scope.selectedItem);
                $scope.$apply();
                $("#Container").mixItUp('filter', $scope.searchPattern);
            })

            //$("#Container").mixItUp('append', $('.tile'));

        }).
        error(function (data, status, headers, config) {
            console.log(data);
        });



    }

    $scope.validateSearch = function (keyEvent) {
        if ($scope.searchTimeout) {
            clearTimeout($scope.searchTimeout);
        }

        $scope.searchTimeout = setTimeout(function () {
            var searchPattern;

            if ($scope.searchedText.Val) {
                $scope.searchPatternRecherche = $scope.searchedText.Val.split(" ").map(function (val) {
                    return '[class*=\'f-' + cleanString(val) + '\']';
                }).join('');
                console.log($scope.searchPatternRecherche);
            }
            else {
                $scope.searchPatternRecherche = "";
            }

            $scope.validateFilter();
        }, 300);
    }


    $scope.validateFilter = function () {
        var searchPattern = ($scope.searchPatternRecherche ? $scope.searchPatternRecherche : '')
        if (searchPattern.length == 0)
            $scope.searchPattern = "*"
        else {
            $scope.searchPattern = searchPattern;
        }
        filter();
    }

    function filter() {
        if (!$('#Container').mixItUp('isLoaded')) {
            return;
        }
        if ($('#Container').mixItUp('isMixing')) {
            setTimeout(function () {
                filter();
            }, 200);
        } else {
            var state = $('#Container').mixItUp('getState');
            if (state.activeFilter != $scope.searchPattern) {
                $('#Container').mixItUp('filter', $scope.searchPattern);
            } else {
                // skip filter
            }
        }
    }


    $scope.searchSuggestionsValue;
    $scope.searchSuggestions = function (value) {
        $scope.searchSuggestionsValue = value;
        $scope.loadingSearchSuggestions = true;
        return $http({
            method: 'GET',
            url: $rootScope.apiRootUrl + '/indexes/SearchSuggestions',
            params: {
                query: "Val:" + value + "*",
                pageSize: 10,
                _: Date.now(),
            }
        }).then(function (res) {
            $scope.loadingSearchSuggestions = false;
            res.data.Results.forEach(function (item) {
                item.imageUrl = $scope.apiRootUrl + "/" + item.Couverture;
            });
            return res.data.Results;
        });
    }
    $scope.validateSearchFromLivre = function ($item, $model, $label) {
        if ($item.Auteur && $item.Auteur.Nom.toLowerCase().indexOf($scope.searchSuggestionsValue.toLowerCase()) > -1 || $item.Auteur.Prenom.toLowerCase().indexOf($scope.searchSuggestionsValue.toLowerCase()) > -1) {
            $scope.searchedText.Val = $item.Auteur.Prenom + " " + $item.Auteur.Nom;
        }
    }

    $scope.searchFocused = false;
    // Prevent default browser behavior if back key pressed
    $(".search").focusout(function ($event) {
        $scope.searchFocused = false;
    });


    $scope.keyDown = function ($event) {
        console.log($event.keyCode)
        if ($event.keyCode == 33 || $event.keyCode == 34 || $event.keyCode == 9 || $event.key == 17)
            return;

        // prevent search when dialog control is open
        if ($('.md-dialog-container') && $('.md-dialog-container').length != 0) {
            return;
        }
        if (searchToggled && $scope.searchFocused)
            return;

        $("#search2").focus();
        $scope.searchFocused = true;
        if ($event.keyCode != 8 && $event.keyCode != 27) {
            $scope.toggleSearch();

        }
        

        

    }

    var searchToggled = false;
    $scope.keyUp = function ($event) {
        // prevent search when dialog control is open
        if ($('.md-dialog-container') && $('.md-dialog-container').length != 0) {
            $event.preventDefault();
            return;
        }
        if ($event.keyCode == 27) {
            $timeout(function () {
                
                $scope.searchedText.Val = "";
                $("#search2").val('');
                $scope.validateSearch("");
                $scope.closeSearch();
            })
           
            return;
        }
            if ($("#search2").val().length == 0) {

                $scope.validateSearch("");
                $scope.closeSearch();
                return;
            }
        

       
    }

    $scope.toggleSearch = function () {
        if (searchToggled)
            return;
        searchToggled = true;

        $("#search2").addClass("toggled");
    }


    $scope.closeSearch = function () {
        $("#search2").removeClass("toggled");
        $("#search2").blur();
        searchToggled = false;
    }
});
