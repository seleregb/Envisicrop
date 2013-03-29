var map, ctrlDragFeature;
var maxZOOM = 21;

var polygons = new Array();

var theGraphicUrl, XPos, YPos, theWidth, theHeight, theXOffset, theYOffset, theRotation, theOpa
var anArray = [];
theOpa = 0.95;

var polygonLayer = null;

var geolocate;

function randomFromTo(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
}

function saveFile() {
    var proj = new Object();
    proj.projectName = $("#name")
        .val();
    proj.projectCode = $("#code")
        .val();
    proj.cropName = $("[name=cropname] option:selected")
        .val();
    proj.cropType = $("[name=croptype] option:selected")
        .val();
    proj.timePeriod = $("#tperiod")
        .val();
    proj.soilTypes = $("[name=soiltypes] option:selected")
        .val();
    proj.polygons = JSON.decycle(polygons);
    proj.globalGrid = $("#exampleGrid")
        .handsontable("getData");
    proj.unitGrids = new Array();
    proj.gridHeaders = headers;
    for (var i in polygons) {
        var t = $("#unit" + i)
            .handsontable("getData");
        proj.unitGrids.push(t);
    }
    var blob = new Blob([JSON.stringify(proj)], {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, "project.ecp");
}

function added(event) {
    polygons.push(event.feature.geometry);
    $(document)
        .ready(function () {
        $("#totalarea")
            .val(calcArea() + "m");
        // $("#area").append("<div>Unit " + polygons.length + " Area: "+event.feature.geometry.getArea()+"</div>");
        // $("#vars").append("<div id=unit" + polygons.length + ">" + $("#unit").html() + "</div>");
        // $("#unit"+polygons.length).show();
        // $("#unit"+polygons.length).prepend("Unit "+polygons.length);
        // if ($("#soiltypechk").is(":checked"))
        // {
        // $(".soiltype").each(function(){
        // $(this).val($("#soiltypem option:selected").val());
        // });
        // }
    });
    console.log(event.feature.geometry);
}

$(document)
    .ready(function () {

    map = new OpenLayers.Map('map', { //maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
        //numZoomLevels: maxZOOM+1,
        //maxResolution: 156543.0399,
        //units: 'm',
        //projection: new OpenLayers.Projection("EPSG:900913")
        //displayProjection: new OpenLayers.Projection("EPSG:4326")
    });

    map.addControl(new OpenLayers.Control.LayerSwitcher());

    var ol = new OpenLayers.Layer.OSM();
    polygonLayer = new OpenLayers.Layer.Vector("Polygon Layer");
    geoLocLayer = new OpenLayers.Layer.Vector("Geo Location Layer");

    map.addLayers([ol, geoLocLayer]);
    polyControl = new OpenLayers.Control.DrawFeature(polygonLayer,
        OpenLayers.Handler.Polygon);
    polyControl.events.on({
        "featureadded": added
    });
    map.addControl(polyControl);
    polyControl.activate();

    theZoom = 6;

    map.setCenter(new OpenLayers.LonLat(0, 0, theZoom));
    map.zoomToMaxExtent();

    theGraphicUrl = "http://i199.photobucket.com/albums/aa21/CastShadow-Source/CFFRCMap.jpg";
    XPos = 0;
    YPos = 0;
    theWidth = 300;
    theHeight = 300;
    theXOffset = -150;
    theYOffset = -150;
    theRotation = 0;
    theResolution = map.getResolution();
    console.log(map.getResolution());

    var context = {
        getUrl: function () {
            return theGraphicUrl;
        },
        getXO: function () {
            return theXOffset * theResolution / map.getResolution();
        },
        getYO: function () {
            return theYOffset * theResolution / map.getResolution();
        },
        getW: function () {
            return theWidth * theResolution / map.getResolution();
        },
        getH: function () {
            return theHeight * theResolution / map.getResolution();
        },
        getR: function () {
            return theRotation;
        }
    };
    var template = {
        externalGraphic: "${getUrl}",
        graphicXOffset: "${getXO}",
        graphicYOffset: "${getYO}",
        graphicWidth: "${getW}",
        graphicHeight: "${getH}",
        rotation: "${getR}",
        strokeWidth: 2,
        strokeColor: 'blue',
        pointRadius: 0
    };
    var oStyleMap = new OpenLayers.Style(template, {
        context: context
    });

    vectorLayer = new OpenLayers.Layer.Vector("externalGraphic Overlay");
    vectorLayer.styleMap = oStyleMap;

    map.addLayers([vectorLayer, polygonLayer]);
    var newPoint = new OpenLayers.Geometry.Point(0, 0);
    var pointFeature = new OpenLayers.Feature.Vector(newPoint);
    pointFeature.attributes.render = "drawAlways";
    vectorLayer.addFeatures([pointFeature]);
    vectorLayer.setOpacity(theOpa);

    init_applyValue();

    map.setCenter(new OpenLayers.LonLat(0, 0, theZoom));

    ctrlDragFeature = new OpenLayers.Control.DragFeature(vectorLayer);
    ctrlDragFeature.onComplete = ctrlDragFeature_onComplete;
    map.addControl(ctrlDragFeature);
    ctrlDragFeature.activate();

    var style = {
        fillColor: '#000',
        fillOpacity: 0.1,
        strokeWidth: 0
    };

    var pulsate = function (feature) {
        var point = feature.geometry.getCentroid(),
            bounds = feature.geometry.getBounds(),
            radius = Math.abs((bounds.right - bounds.left) / 2),
            count = 0,
            grow = 'up';

        var resize = function () {
            if (count > 16) {
                clearInterval(window.resizeInterval);
            }
            var interval = radius * 0.03;
            var ratio = interval / radius;
            switch (count) {
                case 4:
                case 12:
                    grow = 'down';
                    break;
                case 8:
                    grow = 'up';
                    break;
            }
            if (grow !== 'up') {
                ratio = -Math.abs(ratio);
            }
            feature.geometry.resize(1 + ratio, point);
            geoLocLayer.drawFeature(feature);
            count++;
        };
        window.resizeInterval = window.setInterval(resize, 50, point, radius);
    };

    var geolocate = new OpenLayers.Control.Geolocate({
        bind: false,
        geolocationOptions: {
            enableHighAccuracy: false,
            maximumAge: 0,
            timeout: 7000
        }
    });
    map.addControl(geolocate);
    var firstGeolocation = true;
    geolocate.events.register("locationupdated", geolocate, function (e) {
        geoLocLayer.removeAllFeatures();
        var circle = new OpenLayers.Feature.Vector(
            OpenLayers.Geometry.Polygon.createRegularPolygon(
            new OpenLayers.Geometry.Point(e.point.x, e.point.y),
            e.position.coords.accuracy / 2,
            40,
            0), {},
            style);
        geoLocLayer.addFeatures([
         new OpenLayers.Feature.Vector(
                e.point, {}, {
                graphicName: 'cross',
                strokeColor: '#f00',
                strokeWidth: 2,
                fillOpacity: 0,
                pointRadius: 10
            }),
         circle
        ]);
        if (firstGeolocation) {
            map.zoomToExtent(geoLocLayer.getDataExtent());
            pulsate(circle);
            firstGeolocation = false;
            this.bind = true;
        }
    });
    geolocate.events.register("locationfailed", this, function () {
        OpenLayers.Console.log('Location detection failed');
    });

    document.getElementById("locate")
        .onclick = function locateMe() {
        geoLocLayer.removeAllFeatures();
        geolocate.deactivate();
        //document.getElementById('track').checked = false;
        geolocate.watch = false;
        firstGeolocation = true;
        geolocate.activate();
        return false;
    };
});

$(document)
    .ready(function () {
    $("#soiltypem")
        .change(function () {
        if ($("#soiltypechk")
            .is(":checked")) {
            $(".soiltype")
                .each(function () {
                $(this)
                    .val($("#soiltypem option:selected")
                    .val());
            });
        }
    });
});

function calcArea() {
    var total = 0;
    for (var i in polygons) {
        total += polygons[i].getArea();
    }
    console.log(total);
    return total;
}

function handleMeasurements(event) {
    var geometry = event.geometry;
    var units = event.units;
    var order = event.order;
    var measure = event.measure;
    var element = document.getElementById('output');
    var out = "";
    if (order == 1) {
        out += "measure: " + measure.toFixed(3) + " " + units;
    } else {
        out += "measure: " + measure.toFixed(3) + " " + units + "<sup>2</" + "sup>";
    }
    //element.innerHTML = out;
    console.log(event);
    polygonLayer.addFeatures(new OpenLayers.Geometry.Polygon(event.geometry.components));
}

function ctrlDragFeature_onComplete() {
    document.getElementById("iXPos")
        .value = vectorLayer.features[0].geometry.x;
    document.getElementById("iYPos")
        .value = vectorLayer.features[0].geometry.y;
}

function addVal(dt, ID) {
    if (ID != "iXPos" && ID != "iYPos" && ID != "iOpa") {
        var Wert = parseInt(document.getElementById(ID)
            .value);
        document.getElementById(ID)
            .value = Wert + dt;
    } else if (ID == "iOpa") {
        var Wert = parseFloat(document.getElementById(ID)
            .value);
        document.getElementById(ID)
            .value = Wert + dt / 10;
    } else {
        var Wert = parseFloat(document.getElementById(ID)
            .value);
        document.getElementById(ID)
            .value = Wert + dt * map.getResolution();
    }
    applyValue();
}

function applyValue() {
    theGraphicUrl = document.getElementById("iUrl")
        .value;
    XPos = parseFloat(document.getElementById("iXPos")
        .value);
    YPos = parseFloat(document.getElementById("iYPos")
        .value);
    theWidth = parseFloat(document.getElementById("iWidth")
        .value);
    theHeight = parseFloat(document.getElementById("iHeight")
        .value);
    // theXOffset    = parseInt(document.getElementById("iXOff"  ).value);
    // theYOffset    = parseInt(document.getElementById("iYOff"  ).value);
    theXOffset = theWidth / -2;
    theYOffset = theHeight / -2;
    theRotation = parseInt(document.getElementById("iRota")
        .value);
    theOpa = parseFloat(document.getElementById("iOpa")
        .value);
    theResolution = parseFloat(document.getElementById("iRes")
        .value);

    if (theOpa >= 1) {
        theOpa = 1;
        vectorLayer.setOpacity(theOpa);
        document.getElementById("iOpa")
            .value = 1;
    } else if (theOpa <= 0) {
        theOpa = 0;
        vectorLayer.setOpacity(theOpa);
        document.getElementById("iOpa")
            .value = 0;
    } else
        vectorLayer.setOpacity(theOpa);

    vectorLayer.features[0].geometry.x = XPos;
    vectorLayer.features[0].geometry.y = YPos;

    vectorLayer.drawFeature(vectorLayer.features[0]);
}

function init_applyValue() {
    document.getElementById("iUrl")
        .value = theGraphicUrl;
    document.getElementById("iXPos")
        .value = XPos;
    document.getElementById("iYPos")
        .value = YPos;
    document.getElementById("iWidth")
        .value = theWidth;
    document.getElementById("iHeight")
        .value = theHeight;
    document.getElementById("iRota")
        .value = theRotation;
    document.getElementById("iOpa")
        .value = theOpa;
    document.getElementById("iRes")
        .value = theResolution;
}

function drawpoint(index) {
    console.log(polygons[index].getBounds());
    var bounds = polygons[index].getBounds();

    while (true) {
        var newPoint = new OpenLayers.Geometry.Point(
            randomFromTo(
            bounds.left,
            bounds.right),
            randomFromTo(
            bounds.bottom,
            bounds.top));

        if (polygons[index].containsPoint(newPoint)) {
            break;
        }
    }
    var pointFeature = new OpenLayers.Feature.Vector(newPoint);
    polygonLayer.addFeatures([pointFeature]);
}

function loadPolygon(poly) {
    var points = new Array();
    for (var i in poly.components[0].components) {
        points.push(new OpenLayers.Geometry.Point(poly.components[0].components[i].x, poly.components[0].components[i].y));
    }
    points[points.length - 1] = points[0];
    polygonLayer.addFeatures(
        new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.Polygon(
        new OpenLayers.Geometry.LinearRing(points))));
}

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            return function (e) {
                proj = JSON.parse(e.target.result);
                $("#name")
                    .val(proj.projectName);
                $("#code")
                    .val(proj.projectCode);
                $("[name=cropname]")
                    .val(proj.cropName);
                $("[name=croptype]")
                    .val(proj.cropType);
                $("#tperiod")
                    .val(proj.timePeriod);
                $("[name=soiltypes]")
                    .val(proj.soilTypes);
                $("#exampleGrid")
                    .handsontable("destroy");
                $("#exampleGrid")
                    .handsontable({
                    data: proj.globalGrid,
                    colHeaders: proj.gridHeaders
                });
                headers = proj.gridHeaders;
                polygons = proj.polygons;

                for (var i in proj.polygons)
                    loadPolygon(proj.polygons[i]);

                for (var i in proj.unitGrids) {
                    $("#units")
                        .empty();
                    var s = "";
                    for (var n in polygons) {
                        s = s + "<p>" + polygons[n].id + "</p>";
                        s = s + "<div style=margin-left:100px " + "id=\"unit" + n + "\"></div>";
                    }
                    $("#units")
                        .append(s);
                    for (var k in proj.unitGrids) {
                        $("#unit" + k)
                            .handsontable({
                            data: proj.unitGrids[k],
                            colHeaders: headers,
                            minSpareRows: 1,
                        });
                    }
                }
            };
        })(f);
        reader.readAsText(f);
    }
}

document.getElementById('files')
    .addEventListener('change', handleFileSelect, false);

var tooltipObj = new DHTMLgoodies_formTooltip();
tooltipObj.setTooltipPosition('right');
tooltipObj.setPageBgColor('#FFFFFF');
tooltipObj.setTooltipCornerSize(15);
tooltipObj.initFormFieldTooltip();

var headers = ["Date", "Yield"];
$(document)
    .ready(function () {
    $("#exampleGrid")
        .handsontable({
        data: [["2012-11-11", 34], ["2012-11-12", 43], ["2012-11-13", 36], ["2012-11-14", 4]],
        minSpareRows: 1,
        minCols: 2,
        colHeaders: headers,
        // columns: [
        // {},
        // {},
        // ],
        contextMenu: true
    });

    $("#soil")
        .hide();
    $("#pgro")
        .hide();
    $("#opmgmt")
        .hide();
    $("p.vary")
        .hide();

    $("#weathr")
        .children()
        .hide();
    $(".nohide")
        .show();
    $("#weathr")
        .children("label:not(.nohide)")
        .each(function () {
        $("#addweathr")
            .append("<option value=" + $(this)
            .attr("for") + ">" + $(this)
            .html() + "</option>");
    });

    $("#soil")
        .children()
        .hide();
    $(".nohide")
        .show();
    $("#soil")
        .children("label:not(.nohide)")
        .each(function () {
        $("#addsoil")
            .append("<option value=" + $(this)
            .attr("for") + ">" + $(this)
            .html() + "</option>");
    });

    $("#pgro")
        .children()
        .hide();
    $(".nohide")
        .show();
    $("#pgro")
        .children("label:not(.nohide)")
        .each(function () {
        $("#addpgro")
            .append("<option value=" + $(this)
            .attr("for") + ">" + $(this)
            .html() + "</option>");
    });

    $("#opmgmt")
        .children()
        .hide();
    $(".nohide")
        .show();
    $("#opmgmt")
        .children("label:not(.nohide)")
        .each(function () {
        $("#addopmgmt")
            .append("<option value=" + $(this)
            .attr("for") + ">" + $(this)
            .html() + "</option>");
    });
});

$("#customvarbtn")
    .click(function () {
    var add = $("#customvar")
        .val();
    if (add != "") {
        $("#exampleGrid")
            .handsontable('alter', 'insert_col', 1);
        headers.push(add);
        $("#exampleGrid")
            .handsontable('updateSettings', {
            colHeaders: headers
        });
    }
    return false;
});

$("#save")
    .click(function () {
    saveFile();
    return false;
});

function addVarToGroup(group) {
    // $("[name=\""+$("#"+group+" option:selected").val()+"\"]").show("fast");
    // $("[for=\""+$("#"+group+" option:selected").val()+"\"]").show("fast");
    $("#exampleGrid")
        .handsontable('alter', 'insert_col', 1);
    headers.push($("#" + group + " option:selected")
        .html());
    $("#exampleGrid")
        .handsontable('updateSettings', {
        colHeaders: headers
    });
}

function addGraph() {
    if ($("#graphs option:selected")
        .val() == "bar") {
        $("#visuals")
            .append("<p class='graphlist' id='bar'>" + $("#barvar")
            .html() + "</p>");
    } else if ($("#graphs option:selected")
        .val() == "difference") {
        $("#visuals")
            .append("<p class='graphlist' id='diff'>" + $("#diffvar")
            .html() + "</p>");
    } else if ($("#graphs option:selected")
        .val() == "line") {
        $("#visuals")
            .append("<p class='graphlist' id='multi'>" + $("#multivar")
            .html() + "</p>");
    } else if ($("#graphs option:selected")
        .val() == "pie") {
        $("#visuals")
            .append("<p class='graphlist' id='pie'>" + $("#pievar")
            .html() + "</p>");
    } else if ($("#graphs option:selected")
        .val() == "scatter") {
        $("#visuals")
            .append("<p class='graphlist' id='scatter'>" + $("#scattervar")
            .html() + "</p>");
    } else if ($("#graphs option:selected")
        .val() == "area") {
        $("#visuals")
            .append("<p class='graphlist' id='area'>" + $("#areavar")
            .html() + "</p>");
    }
}

function deleteGraph(btn) {
    $(btn)
        .parent()
        .remove();
}

function addvar() {
    $(document)
        .ready(function () {
        $("#" + $("#vargroup option:selected")
            .val())
            .show("fast");
    });
}

$("#unitimport")
    .click(function () {
    $("#units")
        .empty();
    var s = "";
    for (var i in polygons) {
        s = s + "<p>" + polygons[i].id + "</p>";
        // $("#globalfield p:visible").each(function(){
        // if ($(this).attr("id") != "addmore")
        // {
        // s = s + "<p " + "id=\" " + $(this).attr("id") + "copy \">" + $(this).html() + "</p>";
        // }
        // });
        s = s + "<div style=margin-left:100px " + "id=\"unit" + i + "\"></div>";
    }
    $("#units")
        .append(s);
    arr = $("#exampleGrid")
        .handsontable("getData");
    for (var i in polygons) {
        var arr2 = new Array();
        for (var j in arr) {
            arr2[j] = new Array();
            for (var n in arr[j]) {
                arr2[j][n] = arr[j][n];
            }
        }
        $("#unit" + i)
            .handsontable({
            data: arr2,
            colHeaders: headers,
            minSpareRows: 1,
        });
    }
    return false;
    // $('#globalfield p:visible input').each(function() {
    // $('[name=' + $(this).attr('name') +']').val($(this).val());
    // })
    // $('#globalfield p:visible option:selected').each(function() {
    // $('[name=' + $(this).attr('name') +']').val($(this).val());
    // })
});

$("#showreelbtn")
    .click(function () {
    showreel();
    return false;
});

function slide(vars) {
    if ($("#links li.selected")
        .attr("id") == "unitlink") {

    } else if ($("#links li.selected")
        .attr("id") == "simslink") {
        for (var i in headers) {
            $("#linevar #x")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#linevar #y")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
        }
    } else if ($("#links li.selected")
        .attr("id") == "vislink") {
        $("#barvar #x")
            .empty();
        $("#barvar #y")
            .empty();
        $("#diffvar #x")
            .empty();
        $("#diffvar #y")
            .empty();
        $("#multivar #x")
            .empty();
        $("#multivar #y")
            .empty();
        $("#diffvar #d1")
            .empty();
        $("#diffvar #d2")
            .empty();
        $("#pievar #u")
            .empty();
        $("#pievar #u")
            .empty();
        $("#scattervar #w")
            .empty();
        $("#scattervar #z")
            .empty();
        $("#areavar #a")
            .empty();
        $("#areavar #b")
            .empty();
        for (var i in headers) {
            $("#barvar #x")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#barvar #y")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#diffvar #x")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#diffvar #y")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#multivar #x")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#multivar #y")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#pievar #u")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#pievar #v")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#scattervar #w")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#scattervar #z")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#areavar #a")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
            $("#areavar #b")
                .append("<option value=" + i + ">" + headers[i] + "</option>");
        };
        for (var i in polygons) {
            $("#diffvar #d1")
                .append("<option value=" + i + ">" + polygons[i].id + "</option>");
            $("#diffvar #d2")
                .append("<option value=" + i + ">" + polygons[i].id + "</option>");
        }
        // $('#globalfield p:visible label').each(function() {
        // $("#x").append("<option id=\""+$(this).attr("id")+"\">"+$(this).html()+"</option>");
        // $("#y1").append("<option id=\""+$(this).attr("id")+"\">"+$(this).html()+"</option>");
        // $("#y2").append("<option id=\""+$(this).attr("id")+"\">"+$(this).html()+"</option>");
        // $("#y3").append("<option id=\""+$(this).attr("id")+"\">"+$(this).html()+"</option>");
        // })
    } else if ($("#links li.selected")
        .attr("id") == "reportlink") {
        $("#report")
            .empty();
        $("#visuals")
            .children(".graphlist")
            .each(function () {
            if ($(this)
                .attr('id') == 'bar') {
                drawBarChart(this);
            } else if ($(this)
                .attr('id') == 'diff') {
                drawDiffChart(this);
            } else if ($(this)
                .attr('id') == 'multi') {
                drawMultiSeries(this);
            } else if ($(this)
                .attr('id') == 'pie') {
                var id = makeid();
                $("#report")
                    .append("<div id='piegraph" + id + "'></div>")

                var width = 960,
                    height = 500,
                    radius = Math.min(width, height) / 2;

                var color = d3.scale.ordinal()
                    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

                var arc = d3.svg.arc()
                    .outerRadius(radius - 10)
                    .innerRadius(0);

                var svg = d3.select("#piegraph" + id)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

                d = $("#exampleGrid")
                    .handsontable("getData");
                var data = new Array();
                for (var i in d) {
                    data[i] = new Array();
                    for (var n in d[i]) {
                        data[i][n] = d[i][n];
                    }
                }
                data.pop();

                xI = $("#u option:selected", this)
                    .val();
                yI = $("#v option:selected", this)
                    .val();

                console.log(xI);
                console.log(data.map(function (value, index) {
                    return value[xI]
                }));

                var pie = d3.layout.pie()
                    .sort(null)
                    .value(function (d) {
                    return d[yI];
                });

                var g = svg.selectAll(".arc")
                    .data(pie(data))
                    .enter()
                    .append("g")
                    .attr("class", "arc");

                g.append("path")
                    .attr("d", arc)
                    .style("fill", function (d) {
                    return color(d.data[xI]);
                });

                g.append("text")
                    .attr("transform", function (d) {
                    return "translate(" + arc.centroid(d) + ")";
                })
                    .attr("dy", ".35em")
                    .style("text-anchor", "middle")
                    .text(function (d) {
                    return d.data[xI];
                });
            } else if ($(this)
                .attr('id') == 'scatter') {
                var id = makeid()
                $("#report")
                    .append("<div id='scattergraph" + id + "'></div>")

                var margin = {
                    top: 40,
                    right: 20,
                    bottom: 30,
                    left: 40
                },
                    width = 960 - margin.left - margin.right,
                    height = 500 - margin.top - margin.bottom;

                var x = d3.scale.linear()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                var svg = d3.select("#scattergraph" + id)
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                d = $("#exampleGrid")
                    .handsontable("getData");
                var data = new Array();
                for (var i in d) {
                    data[i] = new Array();
                    for (var n in d[i]) {
                        data[i][n] = d[i][n];
                    }
                }
                data.pop();

                xI = $("#w option:selected", this)
                    .val();
                yI = $("#z option:selected", this)
                    .val();

                console.log(xI);
                console.log(yI);

                console.log(data.map(function (value, index) {
                    return value[xI]
                }));
                console.log(data.map(function (value, index) {
                    return value[yI]
                }));

                x.domain(d3.extent(data, function (d) {
                    return d[xI];
                }))
                    .nice();
                y.domain(d3.extent(data, function (d) {
                    return d[yI];
                }))
                    .nice();

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("x", width)
                    .attr("y", -6)
                    .style("text-anchor", "end")

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")

                svg.selectAll(".dot")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("class", "dot")
                    .attr("r", 3.5)
                    .attr("cx", function (d) {
                    return x(d[xI]);
                })
                    .attr("cy", function (d) {
                    return y(d[yI]);
                })
            } else if ($(this)
                .attr('id') == 'area') {
                var id = makeid();
                $("#report")
                    .append("<div id='areagraph" + id + "'></div>")

                var margin = {
                    top: 20,
                    right: 20,
                    bottom: 30,
                    left: 50
                },
                    width = 960 - margin.left - margin.right,
                    height = 500 - margin.top - margin.bottom;

                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                d = $("#exampleGrid")
                    .handsontable("getData");
                var data = new Array();
                for (var i in d) {
                    data[i] = new Array();
                    for (var n in d[i]) {
                        data[i][n] = d[i][n];
                    }
                }
                data.pop();

                xI = $("#a option:selected", this)
                    .val();
                yI = $("#b option:selected", this)
                    .val();

                console.log(xI);
                console.log(yI);

                console.log(data.map(function (value, index) {
                    return value[xI]
                }));
                console.log(data.map(function (value, index) {
                    return value[yI]
                }));

                var area = d3.svg.area()
                    .x(function (d) {
                    return x(d[xI]);
                })
                    .y0(height)
                    .y1(function (d) {
                    return y(d[yI]);
                });

                var svg = d3.select("#areagraph" + id)
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                x.domain(d3.extent(data, function (d) {
                    return d[xI];
                }));
                y.domain([0, d3.max(data, function (d) {
                        return d[yI];
                    })]);

                svg.append("path")
                    .datum(data)
                    .attr("class", "area")
                    .attr("d", area);

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("Y-Axis");
            }
        });
    }
}

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function drawMultiSeries(current) {
    xI = $("#x option:selected", current)
        .val();
    yI = $("#y option:selected", current)
        .val();
    var id = makeid()
    $("#report")
        .append("<div id='line" + id + "'></div>")
    this.lineChart("#line" + id, xI, yI);
}

function drawDiffChart(current) {
    xI = $("#x option:selected", current)
        .val();
    yI = $("#y option:selected", current)
        .val();
    d1 = $("#d1 option:selected", current)
        .val();
    d2 = $("#d2 option:selected", current)
        .val();

    var csv = "date,Unit " + d1 + ",Unit " + d2 + "\n";
    var t = $("#unit" + d1)
        .handsontable("getData");
    var h = $("#unit" + d2)
        .handsontable("getData");
    for (var n in t) {
        if (n != t.length - 1)
            csv = csv + t[n][0] + "," + t[n][yI] + "," + h[n][yI] + "\n";
    }

    var id = makeid();
    $("#report")
        .append("<div id='diffchart" + id + "'></div>")
    var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
    },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var parseDate = d3.time.format($("#dateformat")
        .val())
        .parse;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var line = d3.svg.area()
        .interpolate("basis")
        .x(function (d) {
        return x(d.date);
    })
        .y(function (d) {
        return y(d["Unit " + d1]);
    });

    var area = d3.svg.area()
        .interpolate("basis")
        .x(function (d) {
        return x(d.date);
    })
        .y1(function (d) {
        return y(d["Unit " + d1]);
    });

    var svg = d3.select("#diffchart" + id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var data = d3.csv.parse(csv);

    data.forEach(function (d) {
        d.date = parseDate(d.date);
        d["Unit " + d1] = +d["Unit " + d1];
        d["Unit " + d2] = +d["Unit " + d2];
    });

    x.domain(d3.extent(data, function (d) {
        return d.date;
    }));

    y.domain([
   d3.min(data, function (d) {
            return Math.min(d["Unit " + d1], d["Unit " + d2]);
        }),
   d3.max(data, function (d) {
            return Math.max(d["Unit " + d1], d["Unit " + d2]);
        })
    ]);

    svg.datum(data);

    svg.append("clipPath")
        .attr("id", "clip-below")
        .append("path")
        .attr("d", area.y0(height));

    svg.append("clipPath")
        .attr("id", "clip-above")
        .append("path")
        .attr("d", area.y0(0));

    svg.append("path")
        .attr("class", "area above")
        .attr("clip-path", "url(#clip-above)")
        .attr("d", area.y0(function (d) {
        return y(d["Unit " + d2]);
    }));

    svg.append("path")
        .attr("class", "area below")
        .attr("clip-path", "url(#clip-below)")
        .attr("d", area);

    svg.append("path")
        .attr("class", "line")
        .attr("d", line);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(headers[yI]);
}

function drawBarChart(current) {
    var id = makeid();
    $("#report")
        .append("<div id='bargraph" + id + "'></div>")
    var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 40
    },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var formatPercent = d3.format(".0%");

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")

    var svg = d3.select("#bargraph" + id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    d = $("#exampleGrid")
        .handsontable("getData");
    var data = new Array();
    for (var i in d) {
        data[i] = new Array();
        for (var n in d[i]) {
            data[i][n] = d[i][n];
        }
    }
    data.pop();

    xI = $("#x option:selected", current)
        .val();
    yI = $("#y option:selected", current)
        .val();

    x.domain(data.map(function (value, index) {
        return value[xI]
    }));
    y.domain([0, d3.max(data, function (value, index) {
            return value[yI]
        })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(headers[yI]);

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", function (d) {
        return x(d[xI])
    })
        .attr("width", x.rangeBand())
        .attr("y", function (d) {
        return y(d[yI])
    })
        .attr("height", function (d) {
        return height - y(d[yI]);
    });
}

function lineChart(id, x, y) {
    $(id)
        .empty();

    var csv = "date,price\n";
    var t = $("#exampleGrid")
        .handsontable("getData");
    for (var n in t) {
        if (n != t.length - 1)
            csv = csv + t[n][x] + "," + t[n][y] + "\n";
    }

    var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
    },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var parseDate = d3.time.format($("#dateformat")
        .val())
        .parse;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var line = d3.svg.line()
        .x(function (d) {
        return x(d.date);
    })
        .y(function (d) {
        return y(d.price);
    });

    var end = d3.svg.line()
        .x(function (d) {
        return x(parseDate(t[0][0]));
    })
        .y(function (d) {
        return y(t[0][1]);
    })

    var svg = d3.select(id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var data = d3.csv.parse(csv);
    console.log(data);

    data.forEach(function (d) {
        d.date = parseDate(d.date);
        d.price = +d.price;
    });

    x.domain(d3.extent(data, function (d) {
        return d.date;
    }));
    y.domain(d3.extent(data, function (d) {
        return d.price;
    }));

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(headers[1]);

    var path = svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);

    if (id == "#line") {
        var totalLength = path.node()
            .getTotalLength();

        path
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(50000)
            .ease("linear")
            .attr("stroke-dashoffset", 0);
    }
}

$("#linebtn")
    .click(function () {
    lineChart(
        "#line",
        $("#linevar #x")
        .val(),
        $("#linevar #y")
        .val());
    return false;
});