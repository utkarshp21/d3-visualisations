'use-stict';
let store = {}

function loadData() {
    return Promise.all([
        d3.csv("../data/aiddata.csv"),
        d3.csv("./country-capitals.csv"),
        d3.csv("./countries.geo.json")
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
    let max = 0

    let data_donor = nestData("donor").map(function (d) {
        let total_donated = Math.round(d.value / 1000000000)
        max = Math.max(max, total_donated);
        return { Country: d.key, ["Donated"]: total_donated };
    });

    let final_data = nestData("recipient").map(function (d) {
        let total_recieved = Math.round(d.value / 1000000000)
        max = Math.max(max, total_recieved);
        return { Country: d.key, ["Recieved"]: total_recieved };
    });


    // final_data.sort(function (a, b) { return b.Recieved - a.Recieved });

    final_data.forEach(function (recipient) {
        let result = data_donor.filter(function (donar) {
            return donar['Country'] === recipient['Country'];
        });
        recipient.Donated = (result[0] !== undefined) ? result[0].Donated : 0;
        addLatLng(recipient)
    });

    return [final_data, max, 0];
}


function drawChart() {
    let [data,max_value,min_value] = processData();
    debugger;
   
}

loadData().then(drawChart);
