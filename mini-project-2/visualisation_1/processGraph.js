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


function processData() {

    let disbursements = nestData("coalesced_purpose_name").map(function (d) {
        let total_donated = d.value / 1000000000;
        return { Country: d.key, ["amount"]: total_donated };
    });

    disbursements = disbursements.sort(function (a, b) { return b.amount - a.amount }).slice(0, 10);
    
    return disbursements;
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

function drawLineChart(data){
    debugger;
}

function drawChart() {
    let data = processData();
    drawLineChart(data);
   
}

loadData().then(drawChart);

