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

        topCountries.forEach(function (item) {
            if (item.Country == recipient.Country){
                recipient.topCountry = true
            }
        });
    });

    return final_data;
}

function getMapConfig(index) {
    let width = 800;
    let height = 600;
    let container = d3.select("#Map"+index); //TODO: select the svg with id Map
    container.attr("width", width)
    container.attr("height", height)//TODO: set the width and height of the conatiner to be equal the width and height variables.
    return { width, height, container }
}

function getMapProjection(config) {
    let { width, height } = config;
    let projection = d3.geoMercator();//TODO: Create a projection of type Mercator.
    projection.scale(110)
        .translate([width / 2, height / 2 + 20])

    store.mapProjection = projection;
    return projection;
}

function drawBaseMap(mapInfo, medianRecieved, maxRecieved, index) {
    let config = getMapConfig(index);
    let projection = getMapProjection(config)
    let container = config.container
    let cScale = d3.scaleLinear().domain([0, medianRecieved, maxRecieved]).range(["white", "orange", "red"])
    let countries = mapInfo.features;

    let path = d3.geoPath().projection(projection); //TODO: create a geoPath generator and set its projection to be the projection passed as parameter.

    container.selectAll("path").data(countries)
        .enter().append("path")
        .attr("d", d => path(d))//TODO: use the path generator to draw each country )
        .attr("stroke", "#ccc")
        .attr("fill", d => d.properties.amount ? cScale(d.properties.amount) : "White")
}


function drawChoropleth(purpose_data,index) {
    
    let config = getMapConfig();
    let projection = getMapProjection(config)
    let path = d3.geoPath().projection(projection);
    let obj = {}

    let mapInfo = JSON.parse(JSON.stringify(store.geoJSON));
    
    let dataIndex = {}

    if(index ==0){
        for (let c of purpose_data) {
            let country = c.Country;
            dataIndex[country] = c.Recieved;
        }
    }else{
        for (let c of purpose_data) {
            let country = c.Country;
            dataIndex[country] = c.Donated;
        }
    }

    mapInfo.features = mapInfo.features.map(d => {
        let country = d.properties.name;
        if (dataIndex[country]) {
            let amount = dataIndex[country];
            d.properties.amount = amount;
            return d
        }
        return d
    })

    debugger;


    medianRecieved = d3.median(mapInfo.features, d => d.properties.amount);
    maxRecieved = d3.max(mapInfo.features, d => d.properties.amount);
    

    drawBaseMap(mapInfo, medianRecieved, maxRecieved, index);
}

loadData().then(drawChart);

function drawChart() {
    let data = processData();
    drawChoropleth(data,0);
    drawChoropleth(data,1);

}