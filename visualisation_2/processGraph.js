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

function nestData(next_by){

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

function addLatLng(country_obj){
    
    if (country_obj.Country == "Korea") {
        country_obj.Country = "North Korea";
    } else if (country_obj.Country == "Slovak Republic"){
        country_obj.Country = "Slovakia";
    }

    let result = store.country_capital.find((item) => {        
        return item.CountryName === country_obj.Country;
    })


    country_obj["lat"] = parseFloat(result.CapitalLatitude);
    country_obj["lng"] = parseFloat(result.CapitalLongitude);
}

function processData() { 

    let data_donor = nestData("donor").map(function (d) {
        let total_donated = d.value / 1000000000
        return { Country: d.key, ["Donated"]: total_donated };
    });

    let final_data = nestData("recipient").map(function (d) {
        let total_recieved = d.value / 1000000000
        return { Country: d.key, ["Recieved"]: total_recieved };
    });


    final_data.forEach(function (recipient) {
        let result = data_donor.filter(function (donar) {
            return donar['Country'] === recipient['Country'];
        });
        recipient.Donated = (result[0] !== undefined) ? result[0].Donated : 0;
        recipient.piData = [recipient.Donated, recipient.Recieved]
        addLatLng(recipient)
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
        .attr("fill", "#eee")
}

function drawMap(geoJeon) {
    let config = getMapConfig();
    let projection = getMapProjection(config)
    drawBaseMap(config.container, geoJeon.features, projection)
}


function drawPieChart(aidData){
    let config = getMapConfig();
    let projection = getMapProjection(config)
    let container = config.container;
    
    let arc = d3.arc()
        .innerRadius(0)
        .outerRadius(function (d) {
            let radius = Math.max(Math.sqrt(d.data.Donated) , Math.sqrt(d.data.Recieved) * 1.6);
            return radius
        });

    let color = d3.schemeCategory10;

    let points = container.selectAll("g")
        .data(aidData)
        .enter()
        .append("g")
        .attr("transform", function (d) { return "translate(" + projection([d.lng, d.lat]) + ")" })
        .attr("class", "pies")

    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    let formatDecimal = d3.format(".5f")

    let pie = d3.pie()
        .value(function (d) {return d.piValue; });

    let pies = points.selectAll(".pies")
    .data(function (d) { 
        let newObj = {
            piValue:d.piData[0]
        }
        let newObj2 = {
            piValue: d.piData[1]
        }
        let piData = [{ ...d, ...newObj }, { ...d, ...newObj2 }]
        
        return pie(piData);
    })
    .enter()
    .append('g')
    .attr('class', 'arc').on("mouseover", function (d) {
        div.transition()
            .duration(200)
            .style("opacity", .9);
        div.html("<p>" + d.data.Country + "<br/>" + "Donated = $" + formatDecimal(d.data.Donated) + " Bn<br/>" + "Received = $" + formatDecimal(d.data.Recieved) + " Bn")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function (d) {
        div.transition()
            .duration(500)
            .style("opacity", 0);
    });
        
    pies.append("path")
        .attr('d', arc)
        .attr("fill", function (d, i) {
            return color[i + 1];
        });
}

function drawChart() {
    drawMap(store.geoJSON);
    
    let data = processData();

    drawCircles(data)
    
}

loadData().then(drawChart);
