// let aidData

function loadData() {
    return Promise.all([
        d3.csv("../data/aiddata.csv")
    ]).then(datasets => {
        aidData = datasets[0];
        return aidData;
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
    .entries(aidData);
}

function processData() { 
    let max = 0

    let data_donor = nestData("donor").map(function (d) {
        let total_donated = Math.round(d.value / 1000000000)
        max = Math.max(max, total_donated);
        return { Country: d.key, ["Donated"]: total_donated };
    });

    let data_recipient = nestData("recipient").map(function (d) {
        let total_recieved = Math.round(d.value / 1000000000)
        max = Math.max(max, total_recieved);
        return { Country: d.key, ["Recieved"]: total_recieved };
    });


    data_recipient.sort(function (a, b) { return b.Recieved - a.Recieved });

    data_recipient.forEach(function (article) {
        let result = data_donor.filter(function (donar) {
            return donar['Country'] === article['Country'];
        });
        article.Donated = (result[0] !== undefined) ? result[0].Donated : 0;
    });

    return [data_recipient, max, 0];
}


function drawChart() {
    let [data,max_value,min_value] = processData();
    
    var margin = { top: 20, right: 110, bottom: 20, left: 110 },
        width = 1200 - margin.left - margin.right,
        height = 1000 - margin.top - margin.bottom;

    let x = d3.scaleLinear()
        .range([0, width])
        .domain([min_value, max_value]);
    
    var xScaleLeft = d3.scaleLinear()
        .domain([min_value, max_value])
        .range([(width / 2) , 0]);

    var xScaleRight = d3.scaleLinear()
        .domain([min_value, max_value])
        .range([(width / 2), width]);
 
    let y = d3.scaleBand()
        .rangeRound([0, height])
        .padding(0.1);

    // let xAxis = d3.axisBottom()
    //     .scale(x)
        // .orient("bottom");
    
    let xAxisLeft = d3.axisBottom()
        .scale(xScaleLeft)
    
    let xAxisRight = d3.axisBottom()
        .scale(xScaleRight)

    let yAxis = d3.axisLeft()
        .scale(y)
        .tickSize(0)
        .tickPadding(6);
    
    let yAxisRight = d3.axisRight()
        .scale(y)
        .tickSize(0)
        .tickPadding(6);

    let svg = d3.select("#Map")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    y.domain(data.map(function (d) { return d.Country; }));

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", function (d) { return "bar bar--donated"; })
        .attr("x", function (d) { return width / 2; })
        .attr("y", function (d) { return y(d.Country); })
        .attr("width", function (d) { return Math.abs(xScaleRight(d.Donated) - xScaleRight(0)); })
        .attr("height", y.bandwidth())

    svg.selectAll("bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", function (d) { return "bar bar--recieved";})
        .attr("x", function (d) { return xScaleLeft(d.Recieved); })
        .attr("y", function (d) { return y(d.Country); })
        .attr("width", function (d) { return Math.abs(xScaleLeft(d.Recieved) - xScaleLeft(0)); })
        .attr("height", y.bandwidth());

    svg.append("text").attr("x", width / 4).attr("y", 5).attr("class", "title").text("Recieved(USD Billions)");
    
    svg.append("text").attr("x", width - width / 4).attr("y", 5).attr("class", "title").text("Donated(USD Billions)");

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxisLeft);
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxisRight);

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + x(0) + ",0)")
        .call(yAxis);
    
    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + width + ",0)")
        .call(yAxisRight);
    


    // function type(d) {
    //     d.value = +d.value;
    //     return d;
    // }
}

loadData().then(drawChart);
