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
    }).entries(aidData);
}

function processData() { 
  
    let data_donor = nestData("donor").map(function (d) {
        return { Country: d.key, ["Donated"]: d.value };
    });

    let data_recipient = nestData("recipient").map(function (d) {
        return { Country: d.key, ["Recieved"]: d.value };
    });

    data_recipient.forEach(function (article) {
        let result = data_donor.filter(function (donar) {
            return donar['Country'] === article['Country'];
        });
        article.Donated = (result[0] !== undefined) ? result[0].Donated : 0;
    });

    let max_value = Math.max.apply(Math, aidData.map(function (d) { return d.commitment_amount_usd_constant; })); 
    let min_value = Math.min.apply(Math, aidData.map(function (d) { return d.commitment_amount_usd_constant; })) 

    return [data_recipient, max_value, min_value];
}


function drawChart() {
    let [data,max_value,min_value] = processData();
    
    let margin = { top: 20, right: 30, bottom: 40, left: 30 },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    let x = d3.scaleLinear()
        .range([0, width])
        .domain([min_value, max_value]);

    let y = d3.scaleBand()
        .rangeRound([0, height])
        .padding(0.1);

    let xAxis = d3.axisBottom()
        .scale(x)
        // .orient("bottom");

    let yAxis = d3.axisLeft()
        .scale(y)
        // .orient("left")
        .tickSize(0)
        .tickPadding(6);

    let svg = d3.select("#Map")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // x.domain(d3.extent(data, function (d) {debugger; return d.Donated; })).nice();
    
    y.domain(data.map(function (d) { return d.Country; }));

    svg.selectAll(".bar")
        .data(data)
        .enter()
        
        .append("rect")
        .attr("class", function (d) { return "bar bar--donated"; })
        .attr("x", function (d) { return x(Math.min(0, d.Donated)); })
        .attr("y", function (d) { return y(d.Country); })
        .attr("width", function (d) { return Math.abs(x(d.Donated) - x(0)); })
        .attr("height", y.bandwidth())
        
        .append("rect")
        .attr("class", function (d) { return "bar bar--recieved";})
        .attr("x", function (d) { return x(Math.min(0, d.Recieved)); })
        .attr("y", function (d) { return y(d.Country); })
        .attr("width", function (d) { return Math.abs(x(d.Recieved) - x(0)); })
        .attr("height", y.bandwidth());
    
    //Add one more append
    //Fix domains 
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + x(0) + ",0)")
        .call(yAxis);

    // function type(d) {
    //     d.value = +d.value;
    //     return d;
    // }
}

loadData().then(drawChart);
