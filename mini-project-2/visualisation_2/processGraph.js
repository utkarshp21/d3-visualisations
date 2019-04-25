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

function processAmountType(groupType, type) {

    function groupBy(objectArray, property) {
        return objectArray.reduce(function (acc, obj) {
            var key = obj[property];
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(obj);
            return acc;
        }, {});
    }

    //all items grouped by countries
    let countryGrouped = groupBy(store.aidData, groupType);

    function sumByCommitmentAmount(objectArray, property) {
        return objectArray.reduce(function (acc, obj) {
            acc += +obj.commitment_amount_usd_constant;
            return acc;
        }, 0);
    }
    
    let finalData = {}; 

    for (var country in countryGrouped) {
       
        let yearGrouped = groupBy(countryGrouped[country], "year");
       
        let countryData = {};

        for(year in yearGrouped){
            let donated = sumByCommitmentAmount(yearGrouped[year]);
            countryData[year] = donated
        }

        finalData[country] = countryData;
    }
    
    return finalData
}

function processData(){

    let donatedCountries = processAmountType("donor","donated");
    let recievedCountries = processAmountType("recipient","recieved");
    
    let processedData = [];
    let countries = []

    let max = 0;
    let min = Infinity;

    function findMinMax(totalAmount){
        max = Math.max(totalAmount, max);
        min = Math.min(totalAmount, min)
    }

    function processYear(recieved,donated,country) {
        
        for(year in recieved){
            let yearData = {};
            
            if(year in donated){
                yearData = { "donated": donated[year], "recieved": recieved[year], country: country, year: +year }
            }
            else{
                yearData = { "donated": 0, "recieved": recieved[year], country: country, year: +year }
            }
            
            findMinMax(yearData.recieved+yearData.donated);
        
            processedData.push(yearData);
            
        }
        for(year in donated){
            if(!(year in recieved)){
                let yearData = { "donated": donated[year], "recieved": 0, country: country, year: +year }
                processedData.push(yearData) 
                findMinMax(yearData.recieved+yearData.donated);
            }
        }
    }

    for(country in donatedCountries){
        if (country in recievedCountries){
            processYear(recievedCountries[country], donatedCountries[country], country);
        }else{
            processYear({}, donatedCountries[country], country);
        }

        countries.push(country);
    }

    for (country in recievedCountries){
        if (!(country in donatedCountries)){
            processYear(recievedCountries[country], {}, country);
            countries.push(country);

        }
    }


    return {processedData,countries,max,min};
}

function getChartConfig() {
    let margin = { top: 10, right:150, bottom: 50, left: 90 },
    width = 2100 - margin.left - margin.right,
    height = 1300 - margin.top - margin.bottom;
    
    let container = d3.select("#Matrix")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return { width, height, container,margin }
}

function getMatrixChartScale(config, data){

    let {countries,min,max} = data;

    let {height,width} = config;
        
    let yScale = d3.scalePoint()
        .range([0, height])
        .domain(countries.map(d =>d))
        .padding(1)

    let parseDate = d3.timeParse("%Y");

    let xScale = d3.scaleTime()
        .domain([parseDate(1972), parseDate(2013)])
        .range([0,width])
        
    
    let rScale = d3.scaleLinear()
        .domain([min,max])
        .range([10, 40])
  
    let piColorScale = d3.scaleOrdinal([1, 0]).range(["#4682b4", "#ff8c00"]);

    return { yScale, xScale, rScale, piColorScale}
    
}

function drawMatrixChartAxis(config,scales) {
    
    let { yScale, xScale } = scales;

    let { container, height } = config;

    let yAxis = d3.axisLeft(yScale);

    container.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    let xAxis = d3.axisBottom(xScale);

    container.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .style("font-size", "20px")
        .call(xAxis);
}   

function drawMatrixChartPies(config, scales, data){ 
    let { yScale, xScale, rScale, piColorScale} = scales;
    let { container } = config;
    let {processedData} = data

    let parseDate = d3.timeParse("%Y");

    let arc = d3.arc()
        .innerRadius(0)
        .outerRadius((d) => rScale(d.data.donated+d.data.recieved));
        //.outerRadius(15);

    let points = container.selectAll("g")
        .data(processedData)
        .enter()
        .append("g")
        .attr("transform", function (d) { return "translate(" + [xScale(parseDate(d.year)), yScale(d.country)] + ")" })
        .attr("class", "pies")


    let pie = d3.pie()
        .value(function (d) { return d.piValue });

    let pies = points.selectAll(".pies")
        .data(function (d) {
            let newObj = {
                piValue: d.recieved
            }
            let newObj2 = {
                piValue: d.donated
            }
            let piData = [{ ...d, ...newObj }, { ...d, ...newObj2 }]
            if (d.country == "Saudi Arabia"){
                debugger;
            }
            return pie(piData) ;
        })
        .enter()
        .append('g')

    pies.append("path")
        .attr('d', arc)
        .style("opacity", 0.8)
        .attr("fill", (d, i) => piColorScale(i) )
   
}

function drawGrid(config, scales) {
    let {container, height} = config;
    let {xScale} = scales;

    var years = [];

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

function drawLegend(config) {
    let {container,width,margin} = config;

    let legend_data = [{ name: "Recieved", color: "#4682b4" }, { name: "Donated", color: "#ff8c00"}]
    
    let lineLegend = container.selectAll(".lineLegend").data(legend_data)
        .enter().append("g")
        .attr("class", "lineLegend")
        .attr("transform", function (d, i) {
            return "translate(" + (width+30 ) + "," + (i * 30) + ")";
        });

    lineLegend.append("text").text(function (d) { return d.name; })
        .style("font-size", "20px")
        .attr("transform", "translate(25,16)"); //align texts with boxes

    lineLegend.append("rect")
        .attr("fill", (d, i) => d.color)
        .attr("width", 20).attr("height", 20);
}

function drawChart() {

    let data = processData(); 
    let config = getChartConfig();
    let scales = getMatrixChartScale(config, data);
    drawGrid(config, scales);
    drawMatrixChartAxis(config,scales);
    drawMatrixChartPies(config,scales,data);
    drawLegend(config)
}

loadData().then(drawChart);

