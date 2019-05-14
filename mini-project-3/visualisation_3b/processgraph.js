'use-stict';
let store = {}

function loadData() {
    return Promise.all([
        d3.csv("../data/node.csv"),
        d3.csv("../data/Sectors not specified.csv"),
        d3.csv("../data/Higher education.csv"),
        d3.csv("../data/Strengthening civil society.csv"),
        d3.csv("../data/Social welfare services.csv"),
        d3.csv("../data/Multisector aid.csv"),
    ]).then(datasets => {
        store.nodes = datasets[0];
        store.sectorsNotSpecified = datasets[1];
        store.higherEducation = datasets[2];
        store.strengtheningCivilSociety = datasets[3];
        store.socialWelfareServices = datasets[4];
        store.multisectorAid = datasets[5];
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

function drawMartixChart(config, nodes, edges, i,color, text){

    var edgeHash = {};
 
    edges.forEach(edge => {
        var id = edge.source + "-" + edge.target
       
        edge.amount = +edge.amount;
        edgeHash[id] = edge
    })
    
    var matrix = []

    nodes.forEach((source, a) => {
        nodes.forEach((target, b) => {
            
            var grid = { id: source.node + "-" + target.node, x: b, y: a, amount: 0 };
            if (edgeHash[grid.id]) {
                grid.amount = edgeHash[grid.id].amount;
            }
           
            matrix.push(grid)
        })
    })

    let blockSize = 10
    d3.select("#svg"+i)
        .append("g")
        .attr("transform", "translate(120,150)")
        .attr("id", "adjacencyG"+i)
        .selectAll("rect")
        .data(matrix)
        .enter()
        .append("rect")
        .attr("width", 15)
        .attr("height", blockSize)
        .attr("x", function (d) { return d.x * 15 })
        .attr("y", function (d) { return d.y * blockSize })
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("fill", (d) => color)
        .style("fill-opacity", function (d) { return d.amount * 0.9; })
        .on("mouseover", gridOver)
        .append("svg:title")
        .text(function (d, i) { return d.amount + " co-occurences"; });

    var scaleSize = nodes.length * 15;
    var yscaleSize = nodes.length * 10;

    var allNodes = nodes.map(function (el) { return el.node })

    var nameScale = d3.scalePoint()
        .domain(allNodes)
        .range([0, scaleSize]).padding(.5);
   
    var ynameScale = d3.scalePoint()
        .domain(allNodes)
        .range([0, yscaleSize]).padding(.5);
    
    xAxis = d3.axisTop()
        .scale(nameScale)
        .tickSize(4);

    yAxis = d3.axisLeft().scale(ynameScale).tickSize(4);

    d3.select("#svg" + i).append("text")
        .text(text)
        .style("font-size", "20px")
        .attr("transform", "translate(300,40)");

    d3.select("#adjacencyG"+i).append("g")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .style("font-size", "13px")
        .attr("transform", "translate(-10,-10) rotate(65)");

    d3.select("#adjacencyG"+i).append("g")
        .call(yAxis);

    function gridOver(d, i) {
        d3.selectAll("rect")
            .style("stroke-width", function (p) { return p.x == d.x || p.y == d.y ? "3px" : "1px" })
    }
}


function drawChart() {
    let config = getChartConfig();
    drawMartixChart(config, store.nodes, store.sectorsNotSpecified, 1, "#66c2a5", "Sectors Not Specified" );
    drawMartixChart(config, store.nodes, store.higherEducation, 2, "#fc8d62","Higher education");
    drawMartixChart(config, store.nodes, store.strengtheningCivilSociety, 3, "#8da0cb","Strengthening civil society");
    drawMartixChart(config, store.nodes, store.socialWelfareServices, 4, "#e78ac3","Social welfare services");
    drawMartixChart(config, store.nodes, store.multisectorAid, 5, "#a6d854","Multisector aid");

}


loadData().then(drawChart);

