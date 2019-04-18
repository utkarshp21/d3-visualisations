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

function nestData(next_by, data) {
    return d3.nest().key(function (d) {
        return d[next_by]
    })
    .rollup(function (leaves) {
        return d3.sum(leaves, function (d) {
            return d.commitment_amount_usd_constant;
        });
    })
    .entries(data);
}

function addLatLng(country_obj) {
    if (country_obj.key == "Korea") {
        country_obj.key = "North Korea";
    } else if (country_obj.key == "Slovak Republic") {
        country_obj.key = "Slovakia";
    }

    let result = store.country_capital.find((item) => {
        return item.CountryName === country_obj.key;
    })
    country_obj["lat"] = parseFloat(result.CapitalLatitude);
    country_obj["lng"] = parseFloat(result.CapitalLongitude);
}

function processData() {


    function freqs(items) {
        return items.reduce(function(prev, curr) 
        {
            if (curr.coalesced_purpose_code in prev)
            {
                prev[curr.coalesced_purpose_code]++;
            }
            else
            {
                prev[curr.coalesced_purpose_code]=1;
            }
            return prev;
        },{});

    }

    let frequency_obj = freqs(store.aidData)

    let frequency_array = [];

    for (var property in frequency_obj) {
        frequency_array.push({ purpose_id: property, count: frequency_obj[property]})
    }

    let top_five_purpose = frequency_array.sort(function (a, b) {
        return parseFloat(b.count) - parseFloat(a.count);
    }).slice(0, 5)


    let final_data = [[],[],[],[],[]];
    //Get all data for top 5 purposed

    //Store differnet top 5 reason data in differnt array 
    store["aidData"].forEach(function (country) {        
        top_five_purpose.forEach(function (item_top, index) {
            if (country['coalesced_purpose_code'] === item_top['purpose_id']){
                final_data[index].push(country)
            }
        })
    });

    let nested_data = [[],[],[],[],[]];
    
    final_data.forEach(function (items,index) {
        nested_data[index].push(nestData("recipient", items)
            .map(function (d) {
                let recieved = d.value / 1000000;
                addLatLng(d)
                return { Country: d.key, ["Recieved"]: recieved, lat:d.lat , lng:d.lng};
        }));
    })

    let data = []
    nested_data.forEach(function (purpose_array,index) {
        data.push({ purpose_name: final_data[index][0].coalesced_purpose_name, countries: purpose_array[0]}) 
    })
    
    return data;
}

function getMapConfig(index) {
    let width = 600;
    let height = 400;
    let container = d3.select("#Map"+index); //TODO: select the svg with id Map
    container.attr("width", width)
    container.attr("height", height)//TODO: set the width and height of the conatiner to be equal the width and height variables.
    return { width, height, container }
}

function getMapProjection(config) {
    let { width, height } = config;
    let projection = d3.geoMercator();//TODO: Create a projection of type Mercator.
    projection.scale(130)
        .translate([width / 2, height / 2 + 20])

    store.mapProjection = projection;
    return projection;
}

function drawBaseMap(mapInfo, medianRecieved, maxRecieved,index) {
    let config = getMapConfig(index);
    let projection = getMapProjection(config)
    let container = config.container
    let cScale = d3.scaleLinear().domain([0, medianRecieved, maxRecieved ]).range(["white","orange", "red"])
    let countries = mapInfo.features;

    let path = d3.geoPath().projection(projection); //TODO: create a geoPath generator and set its projection to be the projection passed as parameter.
    
    container.selectAll("path").data(countries)
        .enter().append("path")
        .attr("d", d => path(d))//TODO: use the path generator to draw each country )
        .attr("stroke", "#ccc")
        .attr("fill", d => d.properties.recieved?cScale(d.properties.recieved):"White")
}

function drawChoropleth(purpose_data,index) {
    
    let config = getMapConfig();
    let projection = getMapProjection(config)
    let  path  = d3.geoPath().projection(projection);
    let mapInfo = JSON.parse(JSON.stringify(store.geoJSON));
    let dataIndex = {}

    for (let c of purpose_data.countries){
        let country = c.Country;
        dataIndex[country] = c.Recieved;
    }   
    
    mapInfo.features = mapInfo.features.map(d=>{
        let country = d.properties.name;
        if(dataIndex[country]){
            let recieved = dataIndex[country];
            d.properties.recieved = recieved;
            return d
        }

        return d
    })

    medianRecieved = d3.median(mapInfo.features,d=>d.properties.recieved);
    maxRecieved = d3.max(mapInfo.features, d => d.properties.recieved);
    drawBaseMap(mapInfo, medianRecieved, maxRecieved, index);
    
}

function drawChart() {
    let data = processData();
    data.forEach(function (item,index) {
        drawChoropleth(item,index)
    })
}

loadData().then(drawChart);

