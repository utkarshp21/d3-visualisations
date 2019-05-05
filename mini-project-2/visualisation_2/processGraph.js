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
            acc[key] += +obj.commitment_amount_usd_constant/1000000000;
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

    let graphOneData = [];
    let graphTwoData = [];
    let maxGraph=0, minGraph=Infinity;
    
    // d3.max(graphTwoData[0].values, function (d) { return +d.price; })
    for (let j = 0; j < final_data.length; j++) {
        if (final_data[j].name == "Air transport" || final_data[j].name == "RESCHEDULING AND REFINANCING" || final_data[j].name == "Power generation/non-renewable sources" || final_data[j].name == "Rail transport" || final_data[j].name ==  "Industrial development") {
            graphTwoData.push(final_data[j]);
            maxGraph = Math.max(maxGraph,d3.max(final_data[j].values, function (d) { return +d.price; }))
            minGraph = Math.min(minGraph,d3.min(final_data[j].values, function (d) { return +d.price; }))
        } else {
            graphOneData.push(final_data[j]);

        }
    }

    drawLineChart(graphOneData, graphTwoData, maxGraph, minGraph, "#Line1");
    drawLineChart(graphTwoData, graphOneData,maxGraph, minGraph, "#Line2");
    
}

function getLineChartConfig(svgId) {
    let margin = { top: 10, right:10, bottom: 50, left: 70 },
    width = 1700 - margin.left - margin.right,
    height = 650 - margin.top - margin.bottom;
    
    let container = d3.select(svgId)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return { width, height, container,margin }
}

function drawLineChart(mainData,backgroundData,max,min,svgId){ 

    let getConfig = getLineChartConfig(svgId);
    let container = getConfig.container;
    let width = getConfig.width;
    let height = getConfig.height;
    let margin = getConfig.margin;

    let yScale = d3.scalePow()
    .exponent(0.4)
    .range([height,0])
    .domain([min,max]);

    let yAxis = d3.axisLeft(yScale)
    
    container.append("g")
        .attr("class", "y axis")
        .style("font-size", "20px")
        .call(yAxis);

    container.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left+20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Disbursements, Billion Dollars"); 
    

    var parseDate = d3.timeParse("%Y");


    let xScale = d3.scaleTime()
        .domain([parseDate(1973), parseDate(2013)])
        .range([0,width-290])
    
    let xAxis = d3.axisBottom(xScale)

    let widthScale = d3.scaleLinear()
        .domain([8.551354228, 39.81248032899999])
        .range([5, 150])

    // text label for the x axis
    container.append("text")
        .attr("transform",
            "translate(" + ((width-305) / 2) + " ," +
            (height + margin.top + 25) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Year");

    container.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .style("font-size", "20px")
        .call(xAxis);

    var color = d3.scaleOrdinal(d3.schemeCategory10);

    let valueline = d3.line()
        .x(d => xScale(parseDate(d.date)))
        .y(d => yScale(d.price))
        .defined(d => !!d.price)
    
    
    for (let j = 0; j < backgroundData.length; j++) {
        let backgrounditem = backgroundData[j];

        container.append("path")
            .datum(backgrounditem)
            .attr("d", (d) => { return valueline(d.values) })
            .attr("class", "line")
            .style("stroke", "#d6d6d6")
            .style("opacity", 0.4)
    }
    
    for (let j = 0; j < mainData.length ; j++){
        let mainItem = mainData[j];
        
        container.append("path")
            .datum(mainItem)
            .attr("d", (d) => { return valueline(d.values) })
            .attr("class", "line")
            .style("stroke", color(j))
    }

    let lineLegend = container.selectAll(".lineLegend").data(mainData)
        .enter().append("g")
        .attr("class", "lineLegend")
        .attr("transform", function (d, i) {
            return "translate(" + (width - 425) + "," + (i * 25) + ")";
        });

    lineLegend.append("text").text(function (d) { return d.name; })
        .style("font-size", "20px")
        .attr("transform", "translate(50,12)"); //align texts with boxes

    lineLegend.append("rect")
        .attr("fill", function (d, i) { return color(i); })
        .attr("x", function (d) {
            let totalPrice = 0;
            d["values"].forEach(element => {
                totalPrice += element.price
            });
            console.log(widthScale(totalPrice));
            return 45 - widthScale(totalPrice) ;  
        })
        .attr("width", function (d, i) {
            let totalPrice = 0;
            d["values"].forEach(element => {
                totalPrice+=element.price
            });
            console.log(widthScale(totalPrice));
            return widthScale(totalPrice); 
        })
        .attr("height", 10);

}

function drawChart() {
    let data = processData(); 
}



loadData().then(drawChart);

