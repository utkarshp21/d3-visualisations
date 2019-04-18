'use-stict';
let store = {}

function loadData() {
    return Promise.all([
        d3.csv("../data/aiddata.csv"),
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

function getLineChartConfig() {
    let margin = { top: 20, right: 110, bottom: 20, left: 110 },
    width = 1200 - margin.left - margin.right,
    height = 1000 - margin.top - margin.bottom;
    
    let container = d3.select("#Line"); 
    container.attr("width", width + margin.left + margin.right)
    container.attr("height", height + margin.top + margin.bottom)
    
    return { width, height, container }
}



function drawChart() {
    let data = processData();
    debugger;
}

loadData().then(drawChart);

