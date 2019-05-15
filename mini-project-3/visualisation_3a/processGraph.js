'use-stict';
let store = {}

function loadData() {
    return Promise.all([
        d3.csv("../data/node.csv"),
        d3.csv("../data/piData.csv")
    ]).then(datasets => {
        store.countries = datasets[0];
        store.data = datasets[1];

        // store.purpose = {
        //     21030: { name: "Rail transport", color: "#003f5c"},
        //     21050: { name: "Air transport", color: "#58508d" }, 
        //     23020: { name: "Power generation/non-renewable sources", color: "#bc5090" }, 
        //     32120: { name: "Industrial development", color: "#ff6361"}, 
        //     60040: { name: "Rescheduling and refinancing", color: "#ffa600"}
        // }
        store.purpose = {
            21030: { name: "Rail transport", color: "#1f77b4" },
            21050: { name: "Air transport", color: "green" },
            23020: { name: "Power generation/non-renewable sources", color: "red" },
            32120: { name: "Industrial development", color: "#ffa600" },
            60040: { name: "Rescheduling and refinancing", color: "brown" }
        }
        return store;
    })
}

function getChartConfig() {
    let margin = { top: 10, right:320, bottom: 150, left: 160 },
    width = 2100 - margin.left - margin.right,
    height = 1700 - margin.top - margin.bottom;
    
    let container = d3.select("#Matrix")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return { width, height, container,margin }
}

function getMatrixChartScale(config, countries){

    let {height,width} = config;
    let yScale = d3.scalePoint()
        .range([0, height])
        .domain(countries
        .map(d => d.node))
        .padding(1)

    let xScale = d3.scalePoint()
        .range([0, width])
        .domain(countries
        .map(d => d.node))
        .padding(1)
        
  
    return { yScale, xScale}
    
}

function drawMatrixChartAxis(config,scales) {
    
    let { yScale, xScale } = scales;

    let { container, height,width, margin } = config;

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
        .text("Donor Countries")
        .style("font-size", "25px"); 

    let xAxis = d3.axisBottom(xScale);

    container.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .style("font-size", "15px")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
    
    container.append("text")
        .attr("transform",
            "translate(" + ((width) / 2) + " ," +
            (height + margin.top + 120) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "25px")
        .text("Recipient Countries");
}   

function drawMatrixChartPies(config, scales, processedData){ 
    delete processedData["columns"];
    let { yScale, xScale} = scales;
    let { container,width,margin} = config;
    
    let arc = d3.arc()
        .innerRadius(0)
        .outerRadius(17);

    let points = container.selectAll("div")
        .data(processedData)
        .enter()
        .append("g")
        .attr("transform", function (d) { return "translate(" + [xScale(d.target), yScale(d.source)] + ")" })
        .attr("class", "pies")

    let pie = d3.pie()
        .value(function (d) { return d.piValue });

    let pies = points.selectAll(".pies")
        .data(function (d) {
           
            purposes = d.purpose.substring(1, d.purpose.length - 1).replace(']', '').split(',').map(Number)

            let piData = [];
            purposes.forEach((purpose)=>{
                let newObj = {
                    purpose: store.purpose[purpose],
                    piValue: 100/purposes.length
                };
                piData.push({...d,...newObj})
            })
            return pie(piData) ;
        })
        .enter()
        .append('g')

    pies.append("path")
        .attr('d', arc)
        .style("opacity", 0.8)
        .attr("fill", (d, i) => { return d.data.purpose.color} )
    
    let keys = []
    Object.keys(store.purpose).forEach((purpose) => {
        keys.push(store.purpose[purpose])
    })

    container.selectAll("mylabels")
        .data(keys)
        .enter()
        .append("circle")
        .attr("cx", 100)
        .attr("cy", function (d, i) { return 100 + i * 45 }) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("r", 15)
        .style("fill", function (d) { return d.color })
        .attr("transform", function (d, i) {
            return "translate(" + (width - margin.left+50 ) + "," + (-70) + ")";
        });
        

    // Add one dot in the legend for each name.
    container.selectAll("mylabels")
        .append('g')
        .data(keys)
        .enter()
        .append("text")
        .attr("x", 120)
        .attr("y", function (d, i) { return 100 + i * 45 }) // 100 is where the first dot appears. 25 is the distance between dots
        // .style("fill", function (d) { return d.color })
        .text(function (d) { return d.name })
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .attr("transform", function (d, i) {
            return "translate(" + (width - margin.left+50) + "," + (-70) + ")";
        });
   
}

function drawGrid(config, scales) {
    let { container, height } = config;
    let { xScale } = scales;
    let { countries } = store;

    countries.forEach(item => {
        container
            .append("line")
            .style("stroke", "#e4e4e4")
            .style("stroke-dasharray", ("3, 3"))
            .attr("y1", height)
            .attr("y2", 0)
            .attr("x1", xScale(item.node))
            .attr("x2", xScale(item.node))
    })

}

function drawLegend(config, data, scales) {
    let {container,width,height,margin} = config;
    let { max, min} = data;
    let { rScale } = scales;

    // Rectangle legend
    let legend_data = [{ name: "Recieved", color: "#4682b4" }, { name: "Donated", color: "#ff8c00"}]
    
    let lineLegend = container.selectAll(".lineLegend").data(legend_data)
        .enter().append("g")
        .attr("class", "lineLegend")
        .attr("transform", function (d, i) {
            return "translate(" + (width + margin.right / 4) + "," + (i * 30) + ")";
        });

    lineLegend.append("text").text(function (d) { return d.name; })
        .style("font-size", "20px")
        .attr("transform", "translate(25,16)"); //align texts with boxes

    lineLegend.append("rect")
        .attr("fill", (d, i) => d.color)
        .attr("width", 20).attr("height", 20);

    // Bubble legend
    let bubbleData = [min + max /20,min + max / 5, min+max/2, max] 

    let bubbleLegend = container.selectAll(".bubbleLegend")
        .data(bubbleData)
        .enter().append("g")
        .attr("class", "bubbleLegend")
        .attr("transform", "translate(" + (width + margin.right/2) + "," + (height*0.12) + ")")
    
    bubbleLegend.append("circle")
        .attr("cy", function (d) { return -rScale(d); })
        .attr("r", rScale);
    
    bubbleLegend.append("text")
        .attr("y", function (d) { return -2 * rScale(d); })
        .attr("dy", "1.3em")
        .text(function (d) { return( d/1000000000).toFixed(2)+" B" })
        .attr("font-size", "10px")

}

function drawChart() {
    //store.data[14].purpose.substring(1, store.data[14].purpose.length - 1).split(',').map(Number)
    // let data = processData(); 
    let config = getChartConfig();
    let scales = getMatrixChartScale(config, store.countries);
    drawGrid(config, scales);
    drawMatrixChartAxis(config,scales);
    drawMatrixChartPies(config,scales,store.data);
    //drawLegend(config, data, scales);
}

loadData().then(drawChart);

