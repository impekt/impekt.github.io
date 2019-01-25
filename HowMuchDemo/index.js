/* Code is a bit of a mess
 * I started in Typescript but added some things later
 * Some part of JS is to create the HTML so it was easy to replace only the SVG tags in the body (HTML)
 */
var insight = /** @class */ (function () {
    function insight(name, classname, min, max, direction, offset) {
        this.classname = classname;
        this.minLiters = min;
        this.maxLiters = max;
        this.name = name;
        this.direction = direction;
        this.offset = offset;
    }
    insight.prototype.select = function (liters) {
        if (liters > this.minLiters && liters <= this.maxLiters) {
            return this;
        }
    };
    insight.prototype.percentage = function (liters) {
        return (liters / this.maxLiters);
    };
    return insight;
}());
function PrettyNumber(num) {
    var significance = 3;
    var strlen;
    var clean;
    var RNum;
    if (num == 0) {
        return '0';
    }
    if (num > 10) {
        strlen = (num.toFixed(0) + '').length;
        clean = Math.pow(10, strlen - significance);
        RNum = parseInt((num / clean).toFixed(0)) * clean;
        return RNum.toLocaleString('fr-EG');
    }
    else if (num > 1) {
        strlen = (num.toFixed(0) + '').length;
        clean = Math.pow(10, strlen - significance + 1);
        RNum = parseInt((num / clean).toFixed(1)) * clean;
        return RNum.toLocaleString('fr-EG');
    }
    else {
        num = num.toFixed(100);
        clean = Math.abs(Math.floor(Math.log10(num)));
        RNum = (num + '').substring(0, clean + 2 + 1);
        var value = RNum.substring(0, 4) + " " + RNum.substring(4).replace(/(.{2})/g, "$1");
        if (value.endsWith(" 0"))
            value = value.slice(0, -2);
        return value;
    }
}
var morpher = /** @class */ (function () {
    function morpher(selectionSVG, selectionGroup, selectionVoluma, min, max) {
        var _this = this;
        this.insights = [];
        this.percentage = 0.5;
        this.morphing = false;
        this.svg = document.querySelector(selectionSVG);
        this.mainGroup = this.svg.querySelector(selectionGroup);
        this.volumaPath = this.mainGroup.querySelector(selectionVoluma);
        this.clipPathElement = this.svg.querySelector('clipPath path');
        document.querySelector('.controls input').addEventListener('input', function (d) {
            var el = d.target;
            function logslider(position) {
                var minp = 0;
                var maxp = 100;
                var minv = Math.log(min);
                var maxv = Math.log(max);
                var scale = (maxv - minv) / (maxp - minp);
                return Math.exp(minv + scale * (position - minp));
            }
            var value = logslider(el.value); // from 0 to 100  --> 0.01 to 20 000
            // Pick right object to show
            var insight = _this.insights.filter(function (insight) { return insight.select(value); })[0];
            _this.percentage = insight.percentage(value);
            if (_this.active == insight) { // Old object, just update
                _this.updatePercentage(false);
            }
            else { // New Object
                _this.active = insight;
                _this.morph(_this.active);
            }
            // create slider balloon
            var newPlace;
            var width = el.getBoundingClientRect().width;
            var newPoint = (el.value - el.getAttribute("min")) / (el.getAttribute("max") - el.getAttribute("min"));
            var offset = -1;
            // Prevent bubble from going beyond left or right (unsupported browsers)
            if (newPoint < 0) {
                newPlace = 0;
            }
            else if (newPoint > 1) {
                newPlace = width;
            }
            else {
                newPlace = width * newPoint + offset;
                offset -= newPoint;
            }
            console.log(newPlace, offset);
            // Move bubble
            var outputTag = el.parentElement.querySelector('output');
            outputTag.style.left = (newPlace - 70) + "px";
            outputTag.style.marginLeft = offset + "%";
            outputTag.innerHTML = PrettyNumber(value) + ' liter <br>' + insight.name + ' ' + parseInt('' + _this.percentage * 100) + '%';
            // Change title
            document.querySelector('#liters').innerHTML = PrettyNumber(value);
        });
    }
    morpher.prototype.updatePercentage = function (reset) {
        if (!this.morphing) { // Not during morphing
            var bbox = this.volumaPath.getBBox();
            var x = bbox.x;
            var y = bbox.y;
            var width = bbox.width;
            var height = bbox.height;
            var duration = 1200;
            console.log('Morph to: ' + Math.round(this.percentage * 100) + '%', this.active.classname, reset);
            if (reset) {
                var d = this.svg.querySelector('#' + this.active.classname + ' #clip').getAttribute('d');
                this.clipPathElement.style.transition = 'none';
                this.clipPathElement.style.transform = 'translate(0px,0px)';
                this.clipPathElement.setAttribute('d', d);
                this.moveClip(duration, width, height);
            }
            else {
                this.moveClip(duration, width, height);
            }
            /* let clipEvent = this.whichTransitionEvent();
             clipEvent && this.clipPathElement.addEventListener(clipEvent, () => {
                 this.moveClip(duration, width, height)
             });*/
        }
    };
    morpher.prototype.moveClip = function (duration, width, height) {
        if (this.active.direction == morpher.direction.horizontal) {
            this.clipPathElement.style.transition = duration + 'ms';
            this.clipPathElement.style.transform = 'translate(' + (width * this.percentage / this.active.offset) + 'px,' + 0 + 'px)';
        }
        if (this.active.direction == morpher.direction.vertical) {
            this.clipPathElement.style.transition = duration + 'ms';
            this.clipPathElement.style.transform = 'translate(' + 0 + 'px,' + -(height * this.percentage / this.active.offset) + 'px)';
        }
    };
    morpher.prototype.stopClip = function (duration) {
        if (this.clipPathElement) {
            this.clipPathElement.style.transition = duration + 's';
            this.clipPathElement.style.transform = 'translate(0px,0px)';
            this.clipPathElement.style.transform = 'translate(-5000px,5000px)';
            this.clipPathElement.style.transition = 'none';
        }
    };
    morpher.prototype.morph = function (insight) {
        var _this = this;
        //console.clear()
        this.stopClip(1.5);
        var promises = [];
        this.morphing = true;
        this.mainGroup.querySelectorAll('path').forEach(function (d) {
            var pathID = d.getAttribute('id');
            var animate = true;
            if (pathID == 'volumaDark' || pathID == 'voluma' || pathID == 'clip') {
                animate = false;
            }
            promises.push(_this.morphPath(insight, pathID, animate));
        });
        console.log('promises', promises);
        Promise.all(promises).then(function () {
            _this.morphing = false;
            _this.updatePercentage(true);
        })["catch"](function (e) {
            console.error(e);
        });
    };
    morpher.prototype.morphPath = function (insight, pathID, animate) {
        var _this = this;
        var duration = animate ? 1.2 : 0;
        return new Promise(function (resolve) {
            // Selecters
            var pathSelection = '#' + pathID;
            var targetSelection = '#' + insight.classname + ' #' + pathID;
            var path = _this.mainGroup.querySelector(pathSelection);
            var d = _this.svg.querySelector(targetSelection).getAttribute('d').split('  ').join();
            // If old path is the same resolve promise
            if (path.getAttribute('d') == d) {
                return resolve(pathID);
            }
            // Animated or not
            if (duration == 0) {
                path.style.transition = 'none';
                // console.log(pathID)
                path.setAttribute('d', d);
                return resolve(pathID);
            }
            else {
                path.style.transition = duration + 's';
                path.setAttribute('d', d);
                // Classic way to check if  css transition has passed
                var transitionEvent = _this.whichTransitionEvent();
                transitionEvent && path.addEventListener(transitionEvent, function () {
                    return resolve(pathID);
                });
            }
        });
    };
    morpher.prototype.whichTransitionEvent = function () {
        var t;
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        var el = document.createElement('fakeelement' + text);
        var transitions = {
            'transition': 'transitionend',
            'OTransition': 'oTransitionEnd',
            'MozTransition': 'transitionend',
            'WebkitTransition': 'webkitTransitionEnd'
        };
        for (t in transitions) {
            if (el.style[t] !== undefined) {
                return transitions[t];
            }
        }
    };
    return morpher;
}());
(function (morpher) {
    var direction;
    (function (direction) {
        direction[direction["horizontal"] = 0] = "horizontal";
        direction[direction["vertical"] = 1] = "vertical";
        direction[direction["diagonal"] = 2] = "diagonal";
    })(direction = morpher.direction || (morpher.direction = {}));
})(morpher || (morpher = {}));
document.addEventListener("DOMContentLoaded", function () {
    var visual = new morpher('svg#insight', 'g#Main', '#voluma', 0.01, 20000);
    visual.insights.push(new insight('Can', 'Cannetje', 0, 0.33, morpher.direction.vertical, 1.3));
    visual.insights.push(new insight('Bottle', 'Bottle', 0.33, 1.5, morpher.direction.vertical, 1));
    visual.insights.push(new insight('Bucket', 'Bucket', 1.5, 10, morpher.direction.vertical, 1));
    visual.insights.push(new insight('Barrol', 'Barrol', 10, 160, morpher.direction.vertical, 1.1));
    visual.insights.push(new insight('Trailer', 'Trailer', 160, 2500, morpher.direction.horizontal, 1));
    visual.insights.push(new insight('Tanker truck', 'Tank', 2500, 20000, morpher.direction.horizontal, 1));
});
