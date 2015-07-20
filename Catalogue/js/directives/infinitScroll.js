app.directive('whenScrolled', function () {
    return function (scope, elm, attr) {
        var raw = elm[0];
        var preventReload = false;
        elm.bind('scroll', function () {
            if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight - 500 && !preventReload) {
                scope.$apply(attr.whenScrolled);
                preventReload = true
            } else if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight - 500 && preventReload) {
                return;
            }
            else {
                preventReload = false
            }
        });
    };
});

