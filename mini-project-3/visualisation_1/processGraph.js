'use-stict';
let store = {}

function loadData() {
    return Promise.all([
        d3.csv("../data/recipients.csv"),
        d3.csv("../data/donors.csv"),
        d3.csv("../data/filteredData.csv")
    ]).then(datasets => {
        store.recipients = datasets[0];
        store.donors = datasets[1];
        store.filteredData = datasets[2];
        return store;
    })
}

function getChartConfig() {
    let margin = { top: 10, right: 200, bottom: 200, left: 200 },
        width = 1900 - margin.left - margin.right,
        height = 1200 - margin.top - margin.bottom;

    let container = d3.select("#Matrix")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return { width, height, container, margin }
}

function getMatrixChartScale(config) {

    let { recipients, donors, } = store;
    let { height, width } = config;

    let yScale = d3.scalePoint()
        .range([0, height])
        .domain(donors.map(d => d.donor))
        .padding(1)


    let xScale = d3.scalePoint()
        .range([0, width])
        .domain(recipients.map(d => d.recipient))
        .padding(1)

    let max = d3.max(store.filteredData, (d) => +d.commitment_amount_usd_constant)
    let min = d3.min(store.filteredData, (d) => +d.commitment_amount_usd_constant)


    let rScale = d3.scalePow().exponent(0.5)
        .domain([min, max])
        .range([5, 20])

    let cScale = d3.scaleLinear().domain([min, max]).range(["#C3BBF4", "#06265C"]).interpolate(d3.interpolateHcl)

    let legendScale = d3.scalePow().exponent(0.8).domain([min, max]).range([300, 0])

    return { yScale, xScale, rScale, cScale, max, min, legendScale}

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
        .style("font-size", "25px")
        .text("Donors");


    let xAxis = d3.axisBottom(xScale)
    container.append("g")
        .attr("class", "x axis")
        .style("font-size", "15px")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");;

    container.append("text")
        .attr("transform",
            "translate(" + ((width) / 2) + " ," +
            (height + 150) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "25px")
        .text("Recipients");

}

function drawMatrixChartCicles(config, scales) {
    let { yScale, xScale, rScale, cScale } = scales;
    let { container } = config;
    let { filteredData } = store;

    let circle = container.selectAll("circle")

    circle.data(filteredData)
        .enter()
        .append("circle")
        .attr("cx", (d) => xScale(d.recipient))
        .attr("cy", (d) => yScale(d.donor))
        .attr("r", (d) => { return  rScale(d.commitment_amount_usd_constant)})
        .attr("fill", (d) => cScale(d.commitment_amount_usd_constant))
        .style("opacity", 0.8)
}

function drawGrid(config, scales) {
    let { container, height } = config;
    let { xScale } = scales;
    let {recipients} = store;

    recipients.forEach(item => {
        container
            .append("line")
            .style("stroke", "#e4e4e4")
            .style("stroke-dasharray", ("3, 3"))
            .attr("y1", height)
            .attr("y2", 0)
            .attr("x1", xScale(item.recipient))
            .attr("x2", xScale(item.recipient))
    })

}

function drawLegend(config, scales) {
    let { container, width, height, margin } = config;
    let { rScale,cScale, legendScale, min,max } = scales;

    var svg = d3.select("svg");

    svg.append("g")
        .attr("class", "legendSize")
        .attr("transform", "translate(" + (width + margin.right ) + "," + (height * 0.01) + ")")

    var legendSize = d3.legendSize()
        .scale(rScale)
        .shape('circle')
        .ascending(true)
        .shapePadding(15)
        .labelOffset(20)
        .labels(["$0.000000108B", "$12.2075B", "$24.415B", "$36.622B", "$48.830B"])
        .orient('vertical');


    svg.select(".legendSize")
        .call(legendSize);


    let w = 140, h = 400;

    // let key = container.append("svg").attr("width", w).attr("height", h);

    let key = container.append("g").attr("transform", `translate(${width + margin.right / 20},270)`)

    let legend = key.append("defs")
        .append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "100%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad")

    legend.append("stop").attr("offset", "0%")
        .attr("stop-color", "#06265C")
        .attr("stop-opacity", 1)

    legend.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#C3BBF4")
        .attr("stop-opacity", 1);

    key.append("rect")
        .attr("width", w - 100)
        .attr("height", h - 100)
        .style("fill", "url(#gradient)")
        .attr("transform", `translate(0,10)`);

    let yAxis = d3.axisRight(legendScale)

    yAxis.tickFormat(function (d, i) { return "$" + d/1000000000+ " B" });

    key.append("g").attr("class", "y axis")
        .attr("transform", "translate(41,10)")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", 30)
        .attr("dx", ".71em")
        .style("text-anchor", "end")
        .text("axis title");


    // Bubble legend
    // let bubbleData = [min + max / 20, min + max / 5, min + max / 2, 130000000000]

    // let bubbleLegend = container.selectAll(".bubbleLegend")
    //     .data(bubbleData)
    //     .enter().append("g")
    //     .attr("class", "bubbleLegend")
    //     .attr("transform", "translate(" + (width + margin.right / 2) + "," + (height * 0.12) + ")")

    // bubbleLegend.append("circle")
    //     .attr("cy", function (d) { return -rScale(d); })
    //     .attr("r", rScale);

    // bubbleLegend.append("text")
    //     .attr("y", function (d) { return -2 * rScale(d); })
    //     .attr("dy", "1.3em")
    //     .text(function (d) { return (d / 1000000000).toFixed(2) + " B" })
    //     .attr("font-size", "10px")
}

function drawChart() {
    let config = getChartConfig();
    let scales = getMatrixChartScale(config);
    drawGrid(config, scales);
    drawMatrixChartAxis(config, scales);
    drawMatrixChartCicles(config, scales);
    drawLegend(config, scales);
}

loadData().then(drawChart);

