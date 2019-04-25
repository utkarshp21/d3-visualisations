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

function processData() {
    
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
    
    let commitmentAmountUsdConstant = []
    
    function groupByRecipient(objectArray,property) {
        return objectArray.reduce(function (acc, obj) {
            if (obj.donor == "United States" ){
                let key = obj[property];
                if (!acc[key]) {
                    acc[key] = [];
                }
                commitmentAmountUsdConstant.push(+obj.commitment_amount_usd_constant)
                acc[key].push(obj);
            }
            return acc;
        }, {});
    }


    let countryGrouped = groupByRecipient(store.aidData, "recipient");

    let median = d3.median(commitmentAmountUsdConstant);
    let max = d3.max(commitmentAmountUsdConstant);
    let min = d3.min(commitmentAmountUsdConstant);
   
    let countries = []
    
    function sumByCommitmentAmount(objectArray, property) {
        return objectArray.reduce(function (acc, obj) {
            acc+=+obj.commitment_amount_usd_constant;
            return acc;
        }, 0);
    }

    for (let key in countryGrouped) {
        let yearGrouped = sumByCommitmentAmount(countryGrouped[key]);
        countries.push({ country: key, total_recieved: yearGrouped});
    }

    countries = countries.sort(function (a, b) { return b.total_recieved - a.total_recieved })
                .slice(0, (countries.length / 4) * 2);

    
    for (let key in countryGrouped) {
       
        if (countries.some((x => x.country == key))){
            countryGrouped[key] = nestData("year", countryGrouped[key]);
        }
   
    }

    return { countryGrouped, countries, max, median, min}
}

function getChartConfig() {
    let margin = { top: 10, right:50, bottom: 50, left: 110 },
    width = 1500 - margin.left - margin.right,
    height = 1200 - margin.top - margin.bottom;
    
    let container = d3.select("#Matrix")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return { width, height, container,margin }
}

function getMatrixChartScale(config, data){

    let { countries, max, median, min} = data;
    let {height,width} = config;
        
    let yScale = d3.scalePoint()
        .range([0, height])
        .domain(countries.map(d => d.country))
        .padding(1)

    let parseDate = d3.timeParse("%Y");

    let xScale = d3.scaleTime()
        .domain([parseDate(1972), parseDate(2013)])
        .range([0,width])
    
    let rScale = d3.scaleLinear()
        .domain([min, max])
        .range([7, 40])
  
    let cScale = d3.scaleLinear().domain([min, median, max]).range(["white", "orange", "red"])
    
    return { yScale, xScale, rScale, cScale}
    
}

function drawMatrixChartAxis(config,scales) {
    let {yScale,xScale} = scales;
    
    let {container,height, width, margin}= config; 
    
    let yAxis = d3.axisLeft(yScale);
    container.append("g")
        .attr("class", "y axis")
        .call(yAxis);
    
    container.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Top 75% countries that recieved from US"); 


    let xAxis = d3.axisBottom(xScale)
    container.append("g")
        .attr("class", "x axis")
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

function drawMatrixChartCicles(config, scales, data){ 
    let { yScale, xScale, rScale, cScale } = scales;
    let { container } = config;
    let { countryGrouped} = data


    let parseDate = d3.timeParse("%Y");

    let circle = container.selectAll("circle")
   
    for (country in countryGrouped){
        
        circle.data(countryGrouped[country])
            .enter()
            .append("circle")
            .attr("cx", (d) => xScale(parseDate(d.key)))
            .attr("cy", (d) => yScale(country))
            .attr("r", (d) => rScale(d.value))
            .attr("fill", (d) => cScale(d.value))
            .style("opacity", 0.8)
    }
}

function drawGrid(config, scales, data) {
    let {container, height} = config;
    let {xScale} = scales;

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

function drawChart() {
    let data = processData(); 
    let config = getChartConfig();
    let scales = getMatrixChartScale(config, data)
    drawGrid(config, scales, data)
    drawMatrixChartAxis(config,scales)
    drawMatrixChartCicles(config,scales,data)
}



loadData().then(drawChart);

