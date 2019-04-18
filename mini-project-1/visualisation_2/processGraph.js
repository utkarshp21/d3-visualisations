'use-stict';
let store = {}

function loadData() {
    return Promise.all([
        d3.csv("../data/aiddata.csv"),
        d3.csv("./country-capitals.csv"),
        d3.json("../assi/countries.geo.json")
    ]).then(datasets => {
        store.aidData = datasets[0];
        store.country_capital = datasets[1];
        store.geoJSON = datasets[2];
        return store;
    })
}

function nestData(next_by) {

    return d3.nest().key(function (d) {
        return d[next_by]
    })
        .rollup(function (leaves) {
            return d3.sum(leaves, function (d) {
                return d.commitment_amount_usd_constant;
            });
        })
        .entries(store.aidData);
}

function addLatLng(country_obj) {

    if (country_obj.Country == "Korea") {
        country_obj.Country = "North Korea";
    } else if (country_obj.Country == "Slovak Republic") {
        country_obj.Country = "Slovakia";
    }

    let result = store.country_capital.find((item) => {
        return item.CountryName === country_obj.Country;
    })


    country_obj["lat"] = parseFloat(result.CapitalLatitude);
    country_obj["lng"] = parseFloat(result.CapitalLongitude);
}

function processData() {
    let config = getMapConfig();
    let projection = getMapProjection(config)

    let data_donor = nestData("donor").map(function (d) {
        let total_donated = d.value / 1000000000
        return { Country: d.key, ["Donated"]: total_donated };
    });

    let final_data = nestData("recipient").map(function (d) {
        let total_recieved = d.value / 1000000000
        return { Country: d.key, ["Recieved"]: total_recieved };
    });

    let topCountries = data_donor.sort(function (a, b) {
        return parseFloat(b.Donated) - parseFloat(a.Donated);
    }).slice(0, 5).concat(final_data.sort(function (a, b) {
        return parseFloat(b.Recieved) - parseFloat(a.Recieved);
    }).slice(0, 5)).slice();


    final_data.forEach(function (recipient) {
        let result = data_donor.filter(function (donar) {
            return donar['Country'] === recipient['Country'];
        });
        recipient.Donated = (result[0] !== undefined) ? result[0].Donated : 0;
        recipient.piData = [recipient.Donated, recipient.Recieved]
        recipient.topCountry = false;
        addLatLng(recipient)
        // let xy  = projection([recipient.lng, recipient.lat]);
        // recipient.x = xy[0]
        // recipient.y = xy[1]
        topCountries.forEach(function (item) {
            if (item.Country == recipient.Country){
                recipient.topCountry = true
            }
        });
    });

    return final_data;
}

function getMapConfig() {
    let width = 1200;
    let height = 700;
    let container = d3.select("#Map"); //TODO: select the svg with id Map
    container.attr("width", width)
    container.attr("height", height)//TODO: set the width and height of the conatiner to be equal the width and height variables.
    return { width, height, container }
}

function getMapProjection(config) {
    let { width, height } = config;
    let projection = d3.geoMercator();//TODO: Create a projection of type Mercator.
    projection.scale(150)
        .translate([width / 2, height / 2 + 20])

    store.mapProjection = projection;
    return projection;
}

function drawBaseMap(container, countries, projection) {
    let path = d3.geoPath().projection(projection); //TODO: create a geoPath generator and set its projection to be the projection passed as parameter.
    container.selectAll("path").data(countries)
        .enter().append("path")
        .attr("d", d => path(d))//TODO: use the path generator to draw each country )
        .attr("stroke", "#ccc")
        .attr("fill", "#fff")
}

function drawMap(geoJeon) {
    let config = getMapConfig();
    let projection = getMapProjection(config)
    drawBaseMap(config.container, geoJeon.features, projection)
}


function drawCircles(countries) {

    let config = getMapConfig();
    let projection = getMapProjection(config)
    let container = config.container;

    let decimal = d3.format(".5f")

    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    function findColorMax(arr) {
        if (parseFloat(arr.Donated) > parseFloat(arr.Recieved))
            return "#4682b4"
        else
            return "#ff8c00"
            
    }

    function findColorMin(arr) {

        if (parseFloat(arr.Donated) < parseFloat(arr.Recieved))
            return "#4682b4"
        else
            return "#ff8c00"
           
    }

    let circles = container.selectAll("g")
        .data(countries)
        .enter()
        .append("g");

    circles.append("circle")
        .attr("cx", d => projection([+d.lng, +d.lat])[0])
        .attr("cy", d => projection([+d.lng, +d.lat])[1])
        .attr("r", function (d) { return Math.max(Math.sqrt(d.Donated), Math.sqrt(d.Recieved)) * 1.6 })
        .style("opacity", function (d) {
            if (d.topCountry) {
                return 1.0
            } else {
                return 0.8
            }
        })
        .style("fill", function (d) { return findColorMax(d) })
        .attr("stroke", function (d) {
            if (d.topCountry) {
                return "Black"
            } else {
                return ""
            }
        })
        .style("stroke-width", "0.5px")
       

    circles.append("circle")
        .attr("cx", d => projection([+d.lng, +d.lat])[0])
        .attr("cy", d => projection([+d.lng, +d.lat])[1])
        .attr("r", function (d) { return Math.min(Math.sqrt(d.Donated), Math.sqrt(d.Recieved) * 1.6) })
        .style("opacity", function (d) {
            if (d.topCountry) {
                return 1.0
            } else {
                return 0.8
            }
        })
        .style("fill", function (d) { return findColorMin(d) })
        
}

function drawPieChart(aidData) {
    let config = getMapConfig();
    let projection = getMapProjection(config)
    let container = config.container;

    let arc = d3.arc()
        .innerRadius(0)
        .outerRadius(function (d) {
            let radius = Math.max(Math.sqrt(d.data.Donated) * 1.6, Math.sqrt(d.data.Recieved) * 1.6);
            return radius
    });

    var colorScale = d3.scaleOrdinal([1, 0]).range(["#4682b4", "#ff8c00"]);
    
    let points = container.selectAll("g")
        .data(aidData)
        .enter()
        .append("g")
        .attr("transform", function (d) { return "translate(" + projection([d.lng, d.lat]) + ")" })
        .attr("class", "pies")

    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    let pie = d3.pie()
        .value(function (d) { return d.piValue; });

    let pies = points.selectAll(".pies")
        .data(function (d) {
            let newObj = {
                piValue: d.piData[0]
            }
            let newObj2 = {
                piValue: d.piData[1]
            }
            let piData = [{ ...d, ...newObj }, { ...d, ...newObj2 }]

            return pie(piData);
        })
        .enter()
        .append('g')
        
    
    function setOpacity() {
        if (d.data.topCountry){
            return 1.0
        }else{
            return 0.7
        }

    }    

    pies.append("path")
        .attr('d', arc)
        
        .attr("fill", function (d, i) {
            return colorScale(i);
        }).style("opacity", function(d) {
            if (d.data.topCountry) {
                return 1.0
            } else {
                return 0.8
            }
        })
        .attr("stroke", function (d) {
            if (d.data.topCountry) {
                return "Black"
            } else {
                return ""
            }
        })
        .style("stroke-width", "0.2px");
}


function clearChart() {
   
    const container = d3.select("#Map");
    container.remove();
    d3.select("#svgContainer")
        .append("svg")
        .attr("id", "Map")
}

function drawChartPie() {
    let data = processData();
    clearChart();
    drawMap(store.geoJSON);
    drawPieChart(data);
}

function drawChartCircle() {
    let data = processData();
    clearChart();
    drawMap(store.geoJSON);
    drawCircles(data);
}

function drawPiSumulation() {
    let data = processData();
    drawMap(store.geoJSON);
    piSimulation(data)
}

loadData().then(validate);

function validate() {
    var myCheck = document.getElementById("myCheck");
    if (myCheck.checked) {
        drawChartCircle()
    } else {
        drawChartPie()
    }
}
