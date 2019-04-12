let aidData = [];

function loadData() {
    return Promise.all([
        d3.csv("../data/aiddata.csv")
    ]).then(datasets => {
        aidData = datasets;
        return aidData;
    })
}



function showData() {   
    debugger;
}


function drawChart(airlines) {
    
}

loadData().then(showData);
