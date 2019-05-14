'use-stict';
let store = {}

function loadData() {
    store.files = ["Sectors not specified", "Higher education", "Strengthening civil society", "Social welfare services","Multisector aid"];
    store.colors = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854"];
    let LoadPromise = store["files"].map((file) => d3.csv(`../data/${file}.csv`))
    LoadPromise.push(d3.csv(`../data/node.csv`));
    return Promise.all(
        LoadPromise
    ).then(datasets => {
        store["files"].forEach((data,index) => {
            store[store["files"][index]] = datasets[index];
        });
        store.nodes = datasets[datasets.length-1];
        return store;
    })
}

function drawMartixChart(nodes, edges, i, text){

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

    let blockHeight = 15;
    let blockWidth = 15;

    let margin = { top: 10, right: 1, bottom: 10, left: 5 },
        width = 830 - margin.left - margin.right,
        height = 930 - margin.top - margin.bottom;

    let container = d3.select("#svg" + i)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    container
        .append("g")
        .attr("transform", "translate(120,150)")
        .attr("id", "adjacencyG"+i)
        .selectAll("rect")
        .data(matrix)
        .enter()
        .append("rect")
        .attr("width", blockWidth)
        .attr("height", blockHeight)
        .attr("x", function (d) { return d.x * blockWidth })
        .attr("y", function (d) { return d.y * blockHeight })
        .style("stroke", "grey")
        .style("stroke-width", "1px")
        .style("fill", (d) => store.colors[i])
        .style("fill-opacity", function (d) { return d.amount * 0.01; })
        .on("mouseover", gridOver)
        .append("svg:title")
        .text(function (d, i) { return d.amount + " co-occurences"; });
    
    container.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "25px")
        .text("Donors");
    
    container.append("text")
        .attr("transform",
            "translate(" + ((width) / 2) + " ," +
            (50) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "25px")
        .text("Recipients");

    var scaleSize = nodes.length * blockWidth;
    var yscaleSize = nodes.length * blockHeight;

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
        .style("font-size", "25px")
        .attr("transform", `translate(${10},30)`);

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
            .style("stroke-width", function (p) { return p.x == d.x || p.y == d.y ? "2px" : "1px" })
            .style("stroke", function (p) { return p.x == d.x || p.y == d.y ? "black" : "grey" })
    }
}


function drawChart() {
    store["files"].forEach((file,index)=>{
        drawMartixChart(store.nodes, store[file], index , file );
    })
}


loadData().then(drawChart);

