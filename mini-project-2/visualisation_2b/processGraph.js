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

function nestData(next_by, amount, data) {

    return d3.nest().key(function (d) {
        return d[next_by]
    })
    .rollup(function (leaves) {
        return d3.sum(leaves, function (d) {
            return d[amount];
        });
    })
    .entries(data);
}

function processData() {

    let disbursements = nestData("coalesced_purpose_name", "commitment_amount_usd_constant", store.aidData).map(function (d) {
        let total_donated = d.value;
        return { purpose: d.key, ["amount"]: total_donated };
    });

    //Top 10 purpose of disbursements
    disbursements = disbursements.sort(function (a, b) { return b.amount - a.amount }).slice(0, 10);
    
    disbursements = disbursements.map(element => {
        return element.purpose;
    });

    //Get all disbursements of top 10 type of disbursements
    function groupByPurpose(objectArray, property) {
        return objectArray.reduce(function (acc, obj) {
            let key = obj[property];
            
            if (disbursements.includes(key)){
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(obj);
                return acc;
            }
            return acc;
        
        }, {});
    }

    let groupedPurpose = groupByPurpose(store.aidData, 'coalesced_purpose_name');

    //Group with year for each top 10 purpose
    let max = 0;
    let min = Infinity;
    
    function groupByYear(objectArray, property) {
        return objectArray.reduce(function (acc, obj) {
            let key = obj[property];
            if (!acc[key]) {
                acc[key] = 0;
            }
            acc[key] += +obj.commitment_amount_usd_constant;
            max = Math.max(acc[key],max);
            min = Math.min(acc[key], min);
            return acc;
        
        }, {});
    }

    let final_data = [];
    
    for(let i=0;i<disbursements.length;i++){
        let groupedYear = groupByYear(groupedPurpose[disbursements[i]], 'year');
        final_data.push({ name: disbursements[i], values: groupedYear})
    }

    //Convert key value pair to array of objects 
    final_data = final_data.map(function (item) {

        let years = Object.keys(item.values).map(data => { return { date: data, price: item.values[data] } })

        return { name: item.name, values: years}
    })

    let graphData = [];
    let maxGraph=0, minGraph=Infinity;
    
    // d3.max(graphTwoData[0].values, function (d) { return +d.price; })
    for (let j = 0; j < final_data.length; j++) {
       final_data[j]["values"].forEach(function (item) {
           graphData.push({ name: final_data[j].name, year:item.date, amount:item.price })
           maxGraph = Math.max(maxGraph, item.price)
           minGraph = Math.min(minGraph, item.price)
       })
    }

    let purposes = nestData("name", "amount", graphData)
                .sort(function (a, b) { return b.value - a.value })
                .map(d=>d.key);

    return { graphData, purposes, minGraph, maxGraph}
    
}

function getChartConfig() {
    let margin = { top: 10, right: 200, bottom: 50, left: 340 },
        width = 1700 - margin.left - margin.right,
        height = 1000 - margin.top - margin.bottom;

    let container = d3.select("#Matrix")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return { width, height, container, margin }
}

function getMatrixChartScale(config, data) {

    let { purposes, maxGraph, minGraph } = data;
    debugger;
    let { height, width } = config;

    let yScale = d3.scalePoint()
        .range([0, height])
        .domain(purposes.map(d => d))
        .padding(1)

    let parseDate = d3.timeParse("%Y");

    let xScale = d3.scaleTime()
        .domain([parseDate(1972), parseDate(2013)])
        .range([0, width])


    let rScale = d3.scalePow().exponent(0.5)
        .domain([minGraph, maxGraph])
        .range([8, 50])


    return { yScale, xScale, rScale}

}

function drawMatrixChartAxis(config, scales) {
    let { yScale, xScale } = scales;

    let { container, height, width, margin } = config;

    let yAxis = d3.axisLeft(yScale);
    container.append("g")
        .attr("class", "y axis")
        .style("font-size", "15px")
        .call(yAxis);

    container.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .text("Top 10 purposes of Disbursements ");


    let xAxis = d3.axisBottom(xScale)
    container.append("g")
        .attr("class", "x axis")
        .style("font-size", "15px")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // text label for the x axis
    container.append("text")
        .attr("transform",
            "translate(" + ((width) / 2) + " ," +
            (height + margin.top + 30) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Year");

}   

function drawGrid(config, scales) {
    let { container, height } = config;
    let { xScale } = scales;

    let years = [];

    for (let i = 1972; i <= 2013; i++) {
        years.push(i);
    }

    let parseDate = d3.timeParse("%Y");

    years.forEach(year => {
        container
            .append("line")
            .style("stroke", "#e4e4e4")
            .style("stroke-dasharray", ("3, 3"))
            .attr("y1", height)
            .attr("y2", 0)
            .attr("x1", xScale(parseDate(year)))
            .attr("x2", xScale(parseDate(year)))
    })

}

function drawMatrixChartCicles(config, scales, data) {
    let { yScale, xScale, rScale } = scales;
    let { container } = config;
    let { graphData } = data

    let parseDate = d3.timeParse("%Y");

    let circle = container.selectAll("circle")

    circle.data(graphData)
        .enter()
        .append("circle")
        .attr("cx", (d) => xScale(parseDate(d.year)))
        .attr("cy", (d) => yScale(d.name))
        .attr("r", (d) => rScale(d.amount))
        .attr("fill", "#C3BBF4")
        .style("opacity", 0.8)
    
}

function drawLegend(config, data, scales) {
    let { container, width, height, margin } = config;
    let { maxGraph, minGraph } = data;
    let { rScale } = scales;

    // Bubble legend
    let bubbleData = [minGraph + maxGraph / 20, minGraph + maxGraph / 5, minGraph + maxGraph / 2, maxGraph]

    let bubbleLegend = container.selectAll(".bubbleLegend")
        .data(bubbleData)
        .enter().append("g")
        .attr("class", "bubbleLegend")
        .attr("transform", "translate(" + (width + margin.right / 2) + "," + (height * 0.12) + ")")

    bubbleLegend.append("circle")
        .attr("cy", function (d) { return -rScale(d); })
        .attr("r", rScale);

    bubbleLegend.append("text")
        .attr("y", function (d) { return -2 * rScale(d); })
        .attr("dy", "1.3em")
        .text(function (d) { return (d / 1000000000).toFixed(2) + " B" })
        .attr("font-size", "10px")

}

function drawChart() {
    let data = processData();
    let config = getChartConfig();
    let scales = getMatrixChartScale(config, data);
    drawGrid(config, scales);
    drawMatrixChartAxis(config, scales);
    drawMatrixChartCicles(config, scales, data)
    drawLegend(config, data, scales)
}



loadData().then(drawChart);

