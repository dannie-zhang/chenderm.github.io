/*
To run this app, it needs to be hosted on localhost to read any files.
Open the DV4L folder in a terminal and type:
npm install
(I'm not sure if the above command is needed but just to be safe) Then:
npm install http-server -g
And then type:
http-server -p 4200 -c-1
And open localhost:4200/index.html in a browser. You can replace 4200 with any number.
To get a public URL, open another terminal and navigate to this folder again. Then:
ngrok http 4200
There will be a public URL displayed that looks like a scramble of random letters & numbers.
This URL will tunnel to your localhost. It expires after a day unless you sign into ngrok.
The ngrok website will have instructions for that. It's free.
Once you get the ngrok URL that looks something like [jumbledMess].ngrok.io, just go to
[jumbledMess].ngrok.io/index.html
*/

var defaultDatabase = "Populations";
var defaultXAxis1 = "Year";
var defaultYAxis1 = "Rwanda";
var defaultXAxis2 = "Year";
var defaultYAxis2 = "Algeria";

var colorValues = {
    "gray": "#6f6f6f",
    "white": "#ffffff",
    "red": "#f81b02",
    "pink": "#ff388c",
    "darkBrown": "#543005",
    "brown": "#a6611a",
    "orange": "#f09415",
    "yellow": "#f2d908",
    "lightGreen": "#9acd4c",
    "green": "#549e39",
    "lightBlue": "#31b6fd",
    "blue": "#0f6fc6",
    "darkBlue": "#294171",
    "darkPurple": "#663366",
    "purple": "#ac3ec1",
    "lightPurple": "#af8dc3",
};

var colorSchemeValues = {
    "gray": "office.Mesh6",
    "white": "brewer.Greys8",
    "red": "office.Atlas6",
    "pink": "office.Verve6",
    "darkBrown": "brewer.BrBG11",
    "brown": "brewer.BrBG4",
    "orange": "office.Basis6",
    "yellow": "office.Orbit6",
    "green": "office.UrbanPop6",
    "lightGreen": "office.Circuit6",
    "green": "office.Green6",
    "blue": "office.Blue6",
    "darkBlue": "office.Folio6",
    "darkPurple": "office.Advantage6",
    "purple": "office.Celestial6",
    "lightPurple": "brewer.PRGn3",
}

// Dictionary with key value pairs {category: list of databases}
var database_dict = {"Life, Death, Populations": [
                        "Populations", 
                        "Population Female Percentage", 
                        "Population Female Percentage at Birth",
                        "Life Expectancy - Continents",
                        "Median Age",
                        "Births",
                        "Births Per Woman",
                        "Births Per 1000 People",
                        "Child Deaths",
                        "Child Mortality Rates",
                        "Survival Rate to Age 65 - Male",
                        "Survival Rate to Age 65 - Female"],
                     "Military": [
                        "Military Personnel",
                        "Military Personnel Percent of Population",
                        "Military Spending",
                        "Military Spending Percent of GDP"],
                     "Economies": [
                        "GDP",
                        "GDP Per Capita",
                        "Economic Freedom Scores"],
                     "Environment": [
                        "CO2 Emissions",
                        "CO2 Emissions Per Capita",
                        "CO2 Emissions Percentages",
                        "CO2 Emissions Cumulative",
                        "CO2 Emissions Cumulative Percentages"]
                    }

var graph1 = undefined;
var graph2 = undefined;

var savedGraphs = [];
var savedGraphColor = undefined;

window.drivingQuestion = {};
var line = "";

//When the page first loads.
$(document).ready( function() {
    console.log("Ready!");
    sessionStorage.clear();
    Chart.defaults.global.defaultFontColor = "#524636";

    for (var i = 0; i < 10; i++) {
        savedGraphs.push(undefined);
    }
    savedGraphColor = "#524636";

    //initialize date range sliders
    $("#range1").ionRangeSlider({//http://ionden.com/a/plugins/ion.rangeSlider/start.html
        type: "double",
        min: 0,
        max: 0,
        from: 0,
        to: 0,
        hide_min_max: true,
        prettify_enabled: false,
    });
    $("#range2").ionRangeSlider({
        type: "double",
        min: 0,
        max: 0,
        from: 0,
        to: 0,
        hide_min_max: true,
        prettify_enabled: false,
    });

    switchToDefault();
});

//Construct a modal element.
//This is the pop-up window when user selects 'Custom' button.
let modal = document.querySelector(".modal")

//Display Modal when user clicks 'Custom'
function displayModal(){
    let modal = document.querySelector(".modal")
    modal.style.display = "block"
}

//When the user clicks on (x), close the modal
function closeModal(){
    let modal = document.querySelector(".modal")
    modal.style.display = "none" 
}

//Close modal when user clicks anywhere outside of it.
window.onclick = function(e){
    let modal = document.querySelector(".modal")
    if(e.target == modal){
        modal.style.display = "none"
    }
}

//Use browser's FileReader to read in uploaded file
function handleDrivingQuestionFiles(files) {
    //Check for the various File API support.
    if (window.FileReader) {    //FileReader is supported.
        //only one file, the first one, is read
        var fileToRead = files[0]; 

        var reader = new FileReader();
        reader.readAsText(fileToRead);
        //handle errors load
        reader.onload = loadHandler;
        reader.onerror = errorHandler;
    } else {
        alert('FileReader is not supported on this browser.');
    }
}

//runs if file from driving question upload is successfully read
function loadHandler(event) {
    var csv = event.target.result;
    var allTextLines = csv.split(/\r\n|\n/);
    for (var i = 0; i < allTextLines.length; i++) {
        var data = allTextLines[i].split(';');
        console.log(data);
    }
}

//Is called when the submit button is clicked for
//database URL input box
//It reads the data from the URL and stores all data as
//a long string inside session storage with the key
//"external:" + URL
//Reading data from this string will take some processing
function handleDataURL() {
    // read text from URL location
    var url = document.getElementById("data_url").value;
    if (sessionStorage.getItem("external:" + url) != null) {
        alert(url + " is already uploaded.");
        return;
    }
    
    //make request to read file
    var request = new XMLHttpRequest();
    //url = "https://chenderm.github.io/csv/Life Expectancy - Continents.csv";
    request.open('GET', url, true);
    request.send(null);
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status === 200) {
            var type = request.getResponseHeader('Content-Type');
            if (type.indexOf("text") !== 1) {
                //most of code above is syntax
                //below: sets up each data set as a long string
                //e.g. if data set is:
                //Year  USA     UK
                //2020  10      15
                //It will be stored as
                //"Year,2020
                //USA,10
                //UK,15"
                var dataSetTemp = [];
                
                var allRows = request.responseText.split("\n");
                for (var i = 0; i < allRows.length; i++) {
                    var rowText = allRows[i].split(",");

                    for (var j = 0; j < rowText.length; j++) {
                        if (dataSetTemp[j] == undefined)
                            dataSetTemp[j] = [];
                        dataSetTemp[j].push(rowText[j]);
                        //sets up data like [Year, 2020], [USA, 10], [UK, 15]
                    }
                }

                var bigString = "";
                for (var i = 0; i < dataSetTemp.length; i++) {
                    for (var j = 0; j < dataSetTemp[i].length; j++) {
                        bigString += dataSetTemp[i][j] + ",";
                    }
                    while (bigString.endsWith(",")) {   //remove excess commas
                        bigString = bigString.substr(0, bigString.length - 1);
                    }
                    bigString += "\n";  //add newline between categorized data
                }
                bigString = bigString.substr(0, bigString.length - 1);
                //remove last newline of string
                
                sessionStorage.setItem("external:" + url, bigString);
                alert(url + " uploaded.");  //big string is stored now

                //close popup
                closeModal();

                //add this data set to database dropdown menus
                //if URL is too long, it will be abbreviated
                var dbMenu1 = document.getElementById("database1");
                var option = document.createElement("option");
                if (url.length > 25)
                    option.appendChild(document.createTextNode("external: ..." + url.substring(url.length - 25)));
                else
                    option.appendChild(document.createTextNode("external: " + url));
                option.value = "external:" + url;
                dbMenu1.appendChild(option);
                
                var dbMenu2 = document.getElementById("database2");
                option = document.createElement("option");
                if (url.length > 25)
                    option.appendChild(document.createTextNode("external: ..." + url.substring(url.length - 25)));
                else
                    option.appendChild(document.createTextNode("external: " + url));
                option.value = "external:" + url;
                dbMenu2.appendChild(option);
            }
        }
        else if (request.readyState == 4 && request.status == 404) {
            alert("File " + url + " was not found.");
        }
    }

    /*$.ajax({
        url: 'write.php',
        method: 'POST',
        data: { functionToCall: "func", data: "hello" },
        success: function(data) {
            alert("Success");
        },
        error: function(data) {
            alert("error");
        }
    });*/

}

//runs if file from driving question upload is unsuccessful
function errorHandler(evt) {
    if(evt.target.error.name == "NotReadableError") {
        alert("Cannot read file!");
    }
}

//Runs when the submit button at the bottom of the modal is clicked
function submitDrivingQuestions() {
    var checkboxes = document.getElementsByName("database_selection");  
    var numberOfCheckedItems = 0;  
    var dbSelected = [];

    /*// Reads the database URL user provided
    var database_url = document.getElementById("data_url");

    // Updates location of the database to URL location
    dataloc_dict[database_url.value] = database_url.value;
    dbSelected.push(database_url.value);
    drivingQuestion[database_url.value] = line;*/

    for (var i = 0; i < checkboxes.length; i++) {   
        if (checkboxes[i].checked) {
            var databaseName = checkboxes[i].value;
            dbSelected.push(databaseName);

            //update driving question associated with the database
            drivingQuestion[databaseName] = line;

            numberOfCheckedItems++;
        }
    }
    if (numberOfCheckedItems == 0) {
        alert("You have to select a database");  
        return false;
    }
    selectDatabases(dbSelected);
    verifyDB(1);
    verifyDB(2);
    alert("Submitted");
}

//only display the currently selected databases
function selectDatabases(dbSelected){
    var select = document.getElementById("database1");
    select.innerHTML = '';
    var empty_option = document.createElement("option");
    select.appendChild(empty_option);
    for (const db of dbSelected) {
        var option = document.createElement("option");
        option.val = db;
        option.text = db;
        select.appendChild(option);
    }
    select = document.getElementById("database2");
    select.innerHTML = '';
    empty_option = document.createElement("option");
    select.appendChild(empty_option);
    for (const db of dbSelected) {
        var option = document.createElement("option");
        option.val = db;
        option.text = db;
        select.appendChild(option);
    }
}

//Graphs data for the nth graph.
function graphData(database, xaxis, yaxis, n, lowDate, highDate, minDate, maxDate, gtype, color) {
    if (n == 1 && graph1 !== undefined)
        graph1.destroy();
    else if (n == 2 && graph2 !== undefined)
        graph2.destroy();

    //add labels and data to respective arrays
    d3.csv("/csv/" + database + ".csv")
    .then(function(data) {
        var labelsArr = [];
        var dataArr = [];
        for (var i = 0; i < data.length; i++) {
            if (parseInt(data[i][xaxis], 10) >= lowDate && parseInt(data[i][xaxis], 10) <= highDate) {
                labelsArr.push(data[i][xaxis]);
                dataArr.push(data[i][yaxis]);
            }
        }

        //add driving question (only use the first graph)
        if (n == 1) {
            var dq = document.getElementById("driving_question");
            var question = "";
            if (typeof drivingQuestion[database] === 'undefined')
                question = "default driving question";
            else
                question = drivingQuestion[database];
            
            dq.innerHTML = question;
        }   

        //create graph
        var ctx = document.getElementById("canvas" + n);
        ctx = ctx.getContext("2d");
        if (n == 1) {
            graph1 = new Chart(ctx, {
                type: gtype,
                data: {
                    datasets: [{
                        label: yaxis + " (" + gtype + ")",
                        data: dataArr,
                    }],
                    labels: labelsArr
                },
                options: {
                    plugins: {
                        zoom: {
                            pan: {
                                enabled: true,
                                mode: 'x',
                                speed: 3000,
                            },
                            zoom: {
                                enabled: true,
                                mode: 'x',
                                speed: 3000,
                            }
                        },
                        colorschemes: {scheme: colorSchemeValues[color]}
                    }
                }
            });

            //create descriptions & properties for graphs
            //needed for tooltip hover in saved region
            var description = {
                "DB": database,
                "Yaxis": yaxis,
                "lowDate": lowDate,
                "highDate": highDate,
                "gtype": gtype
            }
            graph1.description = JSON.stringify(description, null, 2);
            graph1.DB = database;
            graph1.X = xaxis;
            graph1.Y = yaxis;
            graph1.lowDate = lowDate;
            graph1.highDate = highDate;
            graph1.minDate = minDate;
            graph1.maxDate = maxDate;
            graph1.type = gtype;
            graph1.color = color;
            document.getElementById("save" + n).style.display = "block";
            document.getElementById("export" + n).style.display = "block";
        }
        else if (n == 2) {
            graph2 = new Chart(ctx, {
                type: gtype,
                data: {
                    datasets: [{
                        label: yaxis + " (" + gtype + ")",
                        data: dataArr,
                    }],
                    labels: labelsArr
                },
                options: {
                    plugins: {
                        zoom: {
                            pan: {
                                enabled: true,
                                mode: 'x',
                                speed: 3000,
                            },
                            zoom: {
                                enabled: true,
                                mode: 'x',
                                speed: 3000,
                            }
                        },
                        colorschemes: {scheme: colorSchemeValues[color],}
                    }
                }
            });

            //create descriptions & properties for graphs
            //needed for tooltip hover in saved region
            var description = { 
                "DB": database,
                "Yaxis": yaxis,
                "lowDate": lowDate,
                "highDate": highDate,
                "gtype": gtype
            }
            graph2.description = JSON.stringify(description, null, 2);
            graph2.DB = database;
            graph2.X = xaxis;
            graph2.Y = yaxis;
            graph2.lowDate = lowDate;
            graph2.highDate = highDate;
            graph2.minDate = minDate;
            graph2.maxDate = maxDate;
            graph2.type = gtype;
            graph2.color = color;
            document.getElementById("save" + n).style.display = "block";
            document.getElementById("export" + n).style.display = "block";
        }
    })
}

//Graphs data for the nth grade, using an external data set
function graphExternalData(database, xaxis, yaxis, n, lowDate, highDate, minDate, maxDate, gtype, color) {
    if (n == 1 && graph1 !== undefined)
        graph1.destroy();
    else if (n == 2 && graph2 !== undefined)
        graph2.destroy();

    var allText = sessionStorage.getItem(database);
    allText = allText.split("\n");
    var dataSet = {};
    for (var i = 0; i < allText.length; i++) {
        var temp = allText[i].substring(0, allText[i].length - 1);
        temp = temp.split(",");
        dataSet[temp[0]] = temp.slice(1);
    }
    var tempLabels = dataSet[xaxis];
    var tempData = dataSet[yaxis];
    var labelsArr = [];
    var dataArr = [];
    for (var i = 0; i < tempLabels.length; i++) {
        if (parseInt(tempLabels[i], 10) >= lowDate && parseInt(tempLabels[i], 10) <= highDate) {
            labelsArr.push(tempLabels[i]);
            dataArr.push(tempData[i]);
        }
    }

    document.getElementById("driving_question").innerHTML = "";

    var ctx = document.getElementById("canvas" + n);
    ctx = ctx.getContext("2d");
    if (n == 1) {
        graph1 = new Chart(ctx, {
            type: gtype,
            data: {
                datasets: [{
                    label: yaxis + " (" + gtype + ")",
                    data: dataArr,
                }],
                labels: labelsArr
            },
            options: {
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            speed: 3000,
                        },
                        zoom: {
                            enalbed: true,
                            mode: 'x',
                            speed: 3000,
                        }
                    },
                    colorschemes: {scheme: colorSchemeValues[color]}
                }
            }
        });

        //create descriptions & properties for graphs
        //needed for tooltip hover in saved region
        var description = {
            "DB": "external:" + database.substr(database.lastIndexOf("/") + 1),
            "Yaxis": yaxis,
            "lowDate": lowDate,
            "highDate": highDate,
            "gtype": gtype
        }
        graph1.description = JSON.stringify(description, null, 2);
        graph1.DB = database;
        graph1.X = xaxis;
        graph1.Y = yaxis;
        graph1.lowDate = lowDate;
        graph1.highDate = highDate;
        graph1.minDate = minDate;
        graph1.maxDate = maxDate;
        graph1.type = gtype;
        graph1.color = color;
        document.getElementById("save" + n).style.display = "block";
        document.getElementById("export" + n).style.display = "block";
    }
    else if (n == 2) {
        graph2 = new Chart(ctx, {
            type: gtype,
            data: {
                datasets: [{
                    label: yaxis + " (" + gtype + ")",
                    data: dataArr,
                }],
                labels: labelsArr
            },
            options: {
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            speed: 3000,
                        },
                        zoom: {
                            enalbed: true,
                            mode: 'x',
                            speed: 3000,
                        }
                    },
                    colorschemes: {scheme: colorSchemeValues[color]}
                }
            }
        });

        //create descriptions & properties for graphs
        //needed for tooltip hover in saved region
        var description = {
            "DB": database,
            "Yaxis": yaxis,
            "lowDate": lowDate,
            "highDate": highDate,
            "gtype": gtype
        }
        graph2.description = JSON.stringify(description, null, 2);
        graph2.DB = database;
        graph2.X = xaxis;
        graph2.Y = yaxis;
        graph2.lowDate = lowDate;
        graph2.highDate = highDate;
        graph2.minDate = minDate;
        graph2.maxDate = maxDate;
        graph2.type = gtype;
        graph2.color = color;
        document.getElementById("save" + n).style.display = "block";
        document.getElementById("export" + n).style.display = "block";
    }
}

//Runs when user clicks the submit button.
//n = 1 when the button is for the first graph
//n = 2 when the button is for the second graph
function submitGraphData(n) {
    var el = document.getElementById("database" + n);
    var dbOption = el.options[el.selectedIndex].value;

    var xOption = "Year";

    el = document.getElementById("yaxis" + n);
    var yOption = el.options[el.selectedIndex].value;

    el = document.getElementById("gtype" + n);
    var gtype = el.options[el.selectedIndex].value;

    var lowDate = $("#range" + n).data("from");
    var highDate = $("#range" + n).data("to");
    var minDate = $(".js-range-slider").data("ionRangeSlider").options.min;
    var maxDate = $(".js-range-slider").data("ionRangeSlider").options.max;

    var color = document.getElementById("colorButton" + n).value;

    if (dbOption.startsWith("external"))
        graphExternalData(dbOption, xOption, yOption, n, lowDate, highDate, minDate, maxDate, gtype, color);
    else
        graphData(dbOption, xOption, yOption, n, lowDate, highDate, minDate, maxDate, gtype, color);
}

//Runs when the user clicks the default button.
//Switches databases to default
//Switches y axes to default and enables the menu
//Resets date ranges
//Switches graph types to default and enables the menu
//Resets & enables color button
function switchToDefault() {
    //set database 1 to default
    switchToDefaultDatabases(1);

    //clear y-axis menu 1
    clearMenu("yaxis1", false);
    //read the csv file to get all keys
    d3.csv("/csv/"  + defaultDatabase + ".csv")
    .then(function(data) {
        var keys = Object.keys(data[0]);
        keys.sort();
        //add each key to y-axis menu
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] == "Year")
                continue;

            var elY = document.getElementById("yaxis1");
            var option = document.createElement("option");
            option.appendChild(document.createTextNode(keys[i]));
            option.value = keys[i];
            elY.appendChild(option);
            if (keys[i] == defaultYAxis1) {
                elY.selectedIndex = i + 1;
            }
        }

        //update date range slider values
        var years = [];
        for (var i = 0; i < data.length; i++) {
            years.push(data[i]["Year"]);
        }
        updateSlider(1, years[0], years[years.length - 1]);

        //enable the submit button
        document.getElementById("submit1").disabled = false;

        //graph data
        graphData(defaultDatabase, defaultXAxis1, defaultYAxis1, 1, years[0], years[years.length - 1], years[0], years[years.length - 1], 'bar', "orange");
    })
    .catch(function(error) {
        if (error.message === "404 Not Found") {
            alert("File not found: " + database);
        }
    })

    //reset graph type menu 1
    document.getElementById("gtype1").selectedIndex = 2;

    //reset color button 1
    changeColorButton(1, "orange");
    document.getElementById("colorButton1").disabled = false;

    //set database 2 to default
    switchToDefaultDatabases(2);

    //clear y-axis menu
    clearMenu("yaxis2", false);
    //read the csv file to get all keys
    d3.csv("/csv/" + defaultDatabase + ".csv")
    .then(function(data) {
        var keys = Object.keys(data[0]);
        keys.sort();
        //add each key to y-axis menu
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] == "Year")
                continue;

            var elY = document.getElementById("yaxis2");
            var option = document.createElement("option");
            option.appendChild(document.createTextNode(keys[i]));
            option.value = keys[i];
            elY.appendChild(option);
            if (keys[i] == defaultYAxis2) {
                elY.selectedIndex = i + 1;
            }
        }

        //update date range slider values
        var years = [];
        for (var i = 0; i < data.length; i++) {
            years.push(data[i]["Year"]);
        }
        updateSlider(2, years[0], years[years.length - 1]);

        //enable the submit button
        document.getElementById("submit2").disabled = false;

        //graph data
        graphData(defaultDatabase, defaultXAxis2, defaultYAxis2, 2, years[0], years[years.length - 1], years[0], years[years.length - 1], 'bar', "darkBrown");
    })
    .catch(function(error) {
        if (error.message === "404 Not Found") {
            alert("File not found: " + database);
        }
    })

    //reset graph type menu 2
    el = document.getElementById("gtype2");
    el.selectedIndex = 2;

    //reset color button 2
    changeColorButton(2, "darkBrown");
    document.getElementById("colorButton2").disabled = false;
}

// Runs when user clicks the default button
// Show all available databases in the drop down menu
// Select the default database
function switchToDefaultDatabases(n) {
    var el = document.getElementById("database" + n);
    el.innerHTML = '';
    var empty_option = document.createElement("option");
    el.appendChild(empty_option);
    for (var key in database_dict) {
        var value = database_dict[key];
        var optgroup = document.createElement("optgroup");
        optgroup.label = key;
        for (index = 0; index < value.length; index++) {
            var option = document.createElement("option");
            option.val = value[index];
            option.text = value[index];
            optgroup.appendChild(option);
        }
        el.appendChild(optgroup);
    }
    
    for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].text === defaultDatabase) {
            el.selectedIndex = i;
            break;
        }
    }
}

//Runs when the user clicks the clear button.
//Calls clearValues() for both graph 1 and 2.
function clearAllValues() {
    clearValues(1);
    clearValues(2);
}

//Clears database menu
//Clears and disables y axis menu
//Clears and disables date range slider
//"Clears" and disables graph type menu
//"Clears" and disables color button
//Disables submit button
//Clears graphs and driving question
//Disables save button
function clearValues(n) {
    var el = document.getElementById("database" + n);
    el.selectedIndex = 0;

    clearMenu("yaxis" + n, true);

    clearSlider(n);

    el = document.getElementById("gtype" + n);
    el.selectedIndex = 0;
    el.disabled = true;

    resetColorButton(n);
    document.getElementById("colorButton" + n).disabled = true;

    document.getElementById("submit" + n).disabled = true;

    if (n == 1) {
        graph1.destroy();
        graph1 = undefined;
    }
    else if (n == 2) {
        graph2.destroy();
        graph2 = undefined;
    }
    document.getElementById("save" + n).style.display = "none";
    document.getElementById("export" + n).style.display = "none";

    // clear driving question
    document.getElementById("driving_question").innerHTML = "";
}

//Runs when the option for database changes.
//If the empty option is selected, clear and/or disable the y-axis menu,
//date range slider, graph type menu, color button, and submit button.
//If a non-empty option is selected, clear and/or enable the the
//y-axis menu, date range slider, graph type menu, and color button,
//but the submit button will remain disabled
//until there are non-empty values for y-axis, graph type menus.
function verifyDB(n) {
    var menu = document.getElementById("database" + n);
    var dbOption = menu.options[menu.selectedIndex].value;
    if (dbOption == "") {
        //if no database selected...
        //clear and disable y axis menu...
        clearMenu("yaxis" + n, true);

        //clear and disable date range slider
        clearSlider(n);
        
        //"clear" and disable graph type menu
        var el = document.getElementById("gtype" + n);
        el.selectedIndex = 0;
        el.disabled = true;

        //"clear" and disable color button
        resetColorButton(n);
        document.getElementById("colorButton" + n).disabled = true;

        //disable submit button
        document.getElementById("submit" + n).disabled = true;
    }
    else if (dbOption.startsWith("external")) {
        //save all previous data
        var previousYAxisMenu = document.getElementById("yaxis" + n);
        var previousYAxisValue = previousYAxisMenu.options[previousYAxisMenu.selectedIndex].value;
        var previousLowDate = $("#range" + n).data("from");
        var previousHighDate = $("#range" + n).data("to");
        var previousGTypeMenu = document.getElementById("gtype" + n);
        var previousGTypeValue = previousGTypeMenu.options[previousGTypeMenu.selectedIndex].value;
        var previousColor = document.getElementById("colorButton" + n).value;
        
        //clear and enable y-axis menu
        clearMenu("yaxis" + n, false);

        //load keys into y-axis menu
        var allData = sessionStorage.getItem(dbOption);
        allData = allData.split("\n");
        var keys = [];
        for (var i = 0; i < allData.length; i++) {
            var subject = allData[i].substr(0, allData[i].indexOf(","));
            keys.push(subject);
        }
        keys.sort();

        //add each key to y-axis menu
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] == "Year")
                continue;

            var elY = document.getElementById("yaxis" + n);
            var option = document.createElement("option");
            option.appendChild(document.createTextNode(keys[i]));
            option.value = keys[i];
            elY.appendChild(option);
            if (keys[i] == previousYAxisValue)
                elY.selectedIndex = i + 1;
        }
        if (document.getElementById("yaxis" + n).selectedIndex == 0)
            document.getElementById("submit" + n).disabled = true;

        //update date range slider values
        var years = allData[0].split(",");
        years = years.slice(1);
        var min = Math.min(...years);
        var max = Math.max(...years);
        if (min > previousLowDate || max < previousHighDate)
            updateSlider(n, min, max);
        else
            updateSliderOnlyRange(n, min, max, previousLowDate, previousHighDate);
        
        //enable graph type menu
        var el = document.getElementById("gtype" + n);
        el.disabled = false;
        if (previousGTypeValue == "line")
            el.selectedIndex = 1;
        if (previousGTypeValue == "bar")
            el.selectedIndex = 2;
        
        //enable color button
        changeColorButton(n, previousColor);
        document.getElementById("colorButton" + n).disabled = false;
    }
    else {
        //save all previous data
        var previousYAxisMenu = document.getElementById("yaxis" + n);
        var previousYAxisValue = previousYAxisMenu.options[previousYAxisMenu.selectedIndex].value;
        var previousLowDate = $("#range" + n).data("from");
        var previousHighDate = $("#range" + n).data("to");
        var previousGTypeMenu = document.getElementById("gtype" + n);
        var previousGTypeValue = previousGTypeMenu.options[previousGTypeMenu.selectedIndex].value;
        var previousColor = document.getElementById("colorButton" + n).value;
        
        //clear and enable y-axis menu
        clearMenu("yaxis" + n, false);

        //load keys into y-axis menu
        d3.csv("/csv/" + dbOption + ".csv")
        .then(function(data) {
            var keys = Object.keys(data[0]);
            keys.sort();

            //add each key to y-axis menu
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] == "Year")
                    continue;
    
                var elY = document.getElementById("yaxis" + n);
                var option = document.createElement("option");
                option.appendChild(document.createTextNode(keys[i]));
                option.value = keys[i];
                elY.appendChild(option);
                if (keys[i] == previousYAxisValue)
                    elY.selectedIndex = i + 1;
            }
            if (document.getElementById("yaxis" + n).selectedIndex == 0)
                document.getElementById("submit" + n).disabled = true;

            //update date range slider values
            var years = [];
            for (var i = 0; i < data.length; i++) {
                years.push(data[i]["Year"]);
            }
            var min = Math.min(...years);
            var max = Math.max(...years);
            if (min > previousLowDate || max < previousHighDate)
                updateSlider(n, min, max);
            else
                updateSliderOnlyRange(n, min, max, previousLowDate, previousHighDate);
        })
        .catch(function(error) {
            if (error.message === "404 Not Found") {
                alert("File not found: " + database);
            }
        })
        
        //enable graph type menu
        var el = document.getElementById("gtype" + n);
        el.disabled = false;
        if (previousGTypeValue == "line")
            el.selectedIndex = 1;
        if (previousGTypeValue == "bar")
            el.selectedIndex = 2;
        
        //enable color button
        changeColorButton(n, previousColor);
        document.getElementById("colorButton" + n).disabled = false;
    }
}

//Clears all options from select menu except for the empty option.
//Can also disable menu
function clearMenu(name, disable) {
    var menu = document.getElementById(name);
    menu.selectedIndex = 0;
    var length = 1;
    while (menu.options.length != length) {
        menu.remove(menu.options.length - 1);
    }
    menu.disabled = disable;
}

//Clears all values in slider
//Also disables slider
function clearSlider(n) {
    $("#range" + n).data("ionRangeSlider").update({
        min: 0,
        max: 0,
        from: 0,
        to: 0,
        disable: true,
    });
}

//Updates min, max in slider
//Sets from = min, to = max
//Also enables slider
function updateSlider(n, minimum, maximum) {
    $("#range" + n).data("ionRangeSlider").update({
        min: minimum,
        max: maximum,
        from: minimum,
        to: maximum,
        disable: false,
    });
}

//Updates min, max in slider
//Sets from = lowDate, to = highDate
//Also enables slider
function updateSliderOnlyRange(n, minimum, maximum, lowDate, highDate) {
    $("#range" + n).data("ionRangeSlider").update({
        min: minimum,
        max: maximum,
        from: lowDate,
        to: highDate,
        disable: false,
    });
}

//Runs when the option for y-axis menu or graph type menu option changes.
//If either are empty, the submit button is disabled.
//Once both are non-empty, the submit button is enabled.
function verifyOptions(n) {
    var el = document.getElementById("yaxis" + n);
    var yOption = el.options[el.selectedIndex].value;

    el = document.getElementById("gtype" + n);
    var gtype = el.options[el.selectedIndex].value;

    //enable submit button if both y-axis and graph type menus are non-empty
    if (yOption == "" || gtype == "") {
        document.getElementById("submit" + n).disabled = true;
    }
    else {
        document.getElementById("submit" + n).disabled = false;
    }
}

//Runs when the user clicks SAVE GRAPH
function saveGraph(saveNum, graphNum, swap) {
    if (graphNum == 1 && graph1 == undefined)
        return;
    else if (graphNum == 2 && graph2 == undefined)
        return;

    var labelsArr = undefined;
    var dataArr = undefined;
    var hoverText = undefined;
    var db = undefined;
    var x = undefined;
    var y = undefined;
    var lowDate = undefined;
    var highDate = undefined;
    var minDate = undefined;
    var maxDate = undefined;
    var graph_type = undefined;
    var color = undefined;

    var destination = saveNum;
    var g = savedGraphs[saveNum - 1];
    if (g != null)
        g.destroy();
    savedGraphs[saveNum - 1] = undefined;
    var tip = document.getElementById("tip" + saveNum);
    tip.style.display = "none";
    tip.style.backgroundColor = "transparent";
    tip.innerHTML = "";

    if (graphNum == 1) {
        labelsArr = graph1.config.data.labels;
        dataArr = graph1.config.data.datasets[0].data;
        hoverText = graph1.description;
        db = graph1.DB;
        x = graph1.X;
        y = graph1.Y;
        lowDate = graph1.lowDate;
        highDate = graph1.highDate;
        minDate = graph1.minDate;
        maxDate = graph1.maxDate;
        graph_type = graph1.type;
        color = graph1.color;
    }
    else if (graphNum == 2) {
        labelsArr = graph2.config.data.labels;
        dataArr = graph2.config.data.datasets[0].data;
        hoverText = graph2.description;
        db = graph2.DB;
        x = graph2.X;
        y = graph2.Y;
        lowDate = graph2.lowDate;
        highDate = graph2.highDate;
        minDate = graph2.minDate;
        maxDate = graph2.maxDate;
        graph_type = graph2.type;
        color = graph2.color;
    }

    //check if current graph is already saved
    for (var i = 0; i < savedGraphs.length; i++) {
        if (savedGraphs[i] != undefined && hoverText == savedGraphs[i].description) {
            if (!swap) {
                alert("Graph " + graphNum + " is already saved at box #" + (i + 1));
            }
            var exit = document.getElementById("exit" + saveNum);
            exit.style.visibility = "hidden";
            var swap = document.getElementById("swap" + saveNum);
            swap.style.visibility = "hidden";
            return;
        }
    }

    var canvas = document.getElementById("saved" + destination);
    canvas = canvas.getContext("2d");
    var g = new Chart(canvas, {
        type: graph_type,
        options: {
            scales: {
                xAxes: [{
                    display: false
                }],
                yAxes: [{
                    display: false
                }],
            },
            legend: {
                display: false
            },
            responsive: true,
            maintainAspectRatio: false,
            tooltips: false,
            animation: {
                duration: 0
            }
        },
        data: {
            labels: labelsArr,
            datasets: [{
                data: dataArr,
                backgroundColor: savedGraphColor,
                pointRadius: 0,
                pointHoverRadius: 0
            }]
        }
    });
    g.description = hoverText;
    g.DB = db;
    g.X = x;
    g.Y = y;
    g.lowDate = lowDate;
    g.highDate = highDate;
    g.minDate = minDate;
    g.maxDate = maxDate;
    g.type = graph_type;
    g.color = color;
    savedGraphs[destination - 1] = g;

    var tip = document.getElementById("tip" + destination);
    tip.style.display = "block";
    tip.style.backgroundColor = "#0000005c";
    hoverText = hoverText.replace(/\n( *)/g, function (match, p1) {
        return '<br>' + '&nbsp;'.repeat(p1.length);
    });
    tip.innerHTML = hoverText;
    tip.style.visibility = "hidden";

    var exit = document.getElementById("exit" + destination);
    exit.style.visibility = "visible";

    var swap = document.getElementById("swap" + destination);
    swap.style.visibility = "visible";
}

//Transfers a saved graph to one of the main graphs,
//Saves the main graph in the saved spot
function swap(savedNum, graphNum) {
    var savedGraph = savedGraphs[savedNum - 1];
    var savedDB = savedGraph.DB;
    var savedX = savedGraph.X;
    var savedY = savedGraph.Y;
    var savedLowDate = savedGraph.lowDate;
    var savedHighDate = savedGraph.highDate;
    var savedMinDate = savedGraph.minDate;
    var savedMaxDate = savedGraph.maxDate;
    var savedType = savedGraph.type;
    var savedColor = savedGraph.color;

    saveGraph(savedNum, graphNum, false);
    if (savedDB.startsWith("external"))
        graphExternalData(savedDB, savedX, savedY, graphNum, savedLowDate, savedHighDate, savedMinDate, savedMaxDate, savedType, savedColor);
    else
        graphData(savedDB, savedX, savedY, graphNum, savedLowDate, savedHighDate, savedMinDate, savedMaxDate, savedType, savedColor);
    
    //updating the controls on the left side
    //set database to savedDB
    var el = document.getElementById("database" + graphNum);
    for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].value === savedDB) {
            el.selectedIndex = i;
            break;
        }
    }

    var el = document.getElementById("gtype" + graphNum);
    for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].text === savedType) {
            el.selectedIndex = i;
            break;
        }
    }

    //update slider range
    sessionStorage.setItem("dataSet" + graphNum + "Min", savedMinDate);
    sessionStorage.setItem("dataSet" + graphNum + "Max", savedMaxDate);
    updateSliderOnlyRange(graphNum, savedMinDate, savedMaxDate, savedLowDate, savedHighDate);

    changeColorButton(graphNum, savedColor);

    clearMenu("yaxis" + graphNum, false);

    if (savedDB.startsWith("external")) {
        //load keys into y-axis menu
        var allData = sessionStorage.getItem(savedDB);
        allData = allData.split("\n");
        var keys = [];
        for (var i = 0; i < allData.length; i++) {
            var subject = allData[i].substr(0, allData[i].indexOf(","));
            keys.push(subject);
        }
        keys.sort();

        //add each key to y-axis menu
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] == "Year")
                continue;

            var elY = document.getElementById("yaxis" + graphNum);
            var option = document.createElement("option");
            option.appendChild(document.createTextNode(keys[i]));
            option.value = keys[i];
            elY.appendChild(option);
            if (keys[i] == savedY)
                elY.selectedIndex = i + 1;
        }

        document.getElementById("submit" + graphNum).disabled = false;
    }
    else {
        d3.csv("/csv/" + savedDB + ".csv")
        .then(function(data) {
            var keys = Object.keys(data[0]);
            keys.sort();
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] == "Year")
                    continue;

                var elY = document.getElementById("yaxis" + graphNum);
                var option = document.createElement("option");
                option.appendChild(document.createTextNode(keys[i]));
                option.value = keys[i];
                elY.appendChild(option);
                if (keys[i] == savedY) {
                    elY.selectedIndex = i + 1;
                }
            }

            document.getElementById("submit" + graphNum).disabled = false;
        });
    }
}

//Relocates a saved graph to another spot
//Swaps if both saved spots have graphs
function relocate(prevSave, nextSave) {
    if (prevSave == nextSave) return;
    if (savedGraphs[nextSave - 1] == undefined || savedGraphs[nextSave - 1] == null) {
        var prevSavedGraph = savedGraphs[prevSave - 1];
        var prevLabelsArr = prevSavedGraph.config.data.labels;
        var prevDataArr = prevSavedGraph.config.data.datasets[0].data;
        var prevHoverText = prevSavedGraph.description;
        var prevDB = prevSavedGraph.DB;
        var prevX = prevSavedGraph.X;
        var prevY = prevSavedGraph.Y;
        var prevLowDate = prevSavedGraph.lowDate;
        var prevHighDate = prevSavedGraph.highDate;
        var prevMinDate = prevSavedGraph.minDate;
        var prevMaxDate = prevSavedGraph.maxDate;
        var prevGraphType = prevSavedGraph.type;
        var prevColor = prevSavedGraph.color;

        var tip = document.getElementById("tip" + prevSave);
        tip.style.display = "none";
        tip.style.backgroundColor = "transparent";
        tip.innerHTML = "";

        deleteGraph(prevSave);

        var canvas = document.getElementById("saved" + nextSave);
        canvas = canvas.getContext("2d");
        var g = new Chart(canvas, {
            type: prevGraphType,
            options: {
                scales: {
                    xAxes: [{display: false}],
                    yAxes: [{display: false}],
                },
                legend: {display: false},
                responsive: true,
                maintainAspectRatio: false,
                tooltips: false,
                animation: {duration: 0}
            },
            data: {
                labels: prevLabelsArr,
                datasets: [{
                    data: prevDataArr,
                    backgroundColor: savedGraphColor,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }]
            }
        });
        g.description = prevHoverText;
        g.DB = prevDB;
        g.X = prevX;
        g.Y = prevY;
        g.lowDate = prevLowDate;
        g.highDate = prevHighDate;
        g.minDate = prevMinDate;
        g.maxDate = prevMaxDate;
        g.type = prevGraphType;
        g.color = prevColor;
        savedGraphs[nextSave - 1] = g;

        tip = document.getElementById("tip" + nextSave);
        tip.style.display = "block";
        tip.style.backgroundColor = "#0000005c";
        prevHoverText = prevHoverText.replace(/\n( *)/g, function (match, p1) {
            return '<br>' + '&nbsp;'.repeat(p1.length);
        });
        tip.innerHTML = prevHoverText;
        tip.style.visibility = "hidden";

        var exit = document.getElementById("exit" + nextSave);
        exit.style.visibility = "visible";

        var swap = document.getElementById("swap" + nextSave);
        swap.style.visibility = "visible";
    }
    else {
        var savedGraph1 = savedGraphs[prevSave - 1];
        var labelsArr1 = savedGraph1.config.data.labels;
        var dataArr1 = savedGraph1.config.data.datasets[0].data;
        var hoverText1 = savedGraph1.description;
        var db1 = savedGraph1.DB;
        var x1 = savedGraph1.X;
        var y1 = savedGraph1.Y;
        var lowDate1 = savedGraph1.lowDate;
        var highDate1 = savedGraph1.highDate;
        var minDate1 = savedGraph1.minDate;
        var maxDate1 = savedGraph1.maxDate;
        var graphType1 = savedGraph1.type;
        var color1 = savedGraph1.color;

        var tip = document.getElementById("tip" + prevSave);
        tip.style.display = "none";
        tip.style.backgroundColor = "transparent";
        tip.innerHTML = "";

        deleteGraph(prevSave);

        var savedGraph2 = savedGraphs[nextSave - 1];
        var labelsArr2 = savedGraph2.config.data.labels;
        var dataArr2 = savedGraph2.config.data.datasets[0].data;
        var hoverText2 = savedGraph2.description;
        var db2 = savedGraph2.DB;
        var x2 = savedGraph2.X;
        var y2 = savedGraph2.Y;
        var lowDate2 = savedGraph2.lowDate;
        var highDate2 = savedGraph2.highDate;
        var minDate2 = savedGraph2.minDate;
        var maxDate2 = savedGraph2.maxDate;
        var graphType2 = savedGraph2.type;
        var color2 = savedGraph2.color;

        tip = document.getElementById("tip" + nextSave);
        tip.style.display = "none";
        tip.style.backgroundColor = "transparent";
        tip.innerHTML = "";

        deleteGraph(nextSave);

        var canvas1 = document.getElementById("saved" + nextSave);
        canvas1 = canvas1.getContext("2d");
        var g1 = new Chart(canvas1, {
            type: graphType1,
            options: {
                scales: {
                    xAxes: [{display: false}],
                    yAxes: [{display: false}],
                },
                legend: {display: false},
                responsive: true,
                maintainAspectRatio: false,
                tooltips: false,
                animation: {duration: 0}
            },
            data: {
                labels: labelsArr1,
                datasets: [{
                    data: dataArr1,
                    backgroundColor: savedGraphColor,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }]
            }
        });
        g1.description = hoverText1;
        g1.DB = db1;
        g1.X = x1;
        g1.Y = y1;
        g1.lowDate = lowDate1;
        g1.highDate = highDate1;
        g1.minDate = minDate1;
        g1.maxDate = maxDate1;
        g1.type = graphType1;
        g1.color = color1;
        savedGraphs[nextSave - 1] = g1;

        tip = document.getElementById("tip" + nextSave);
        tip.style.display = "block";
        tip.style.backgroundColor = "#0000005c";
        hoverText1 = hoverText1.replace(/\n( *)/g, function (match, p1) {
            return '<br>' + '&nbsp;'.repeat(p1.length);
        });
        tip.innerHTML = hoverText1;
        tip.style.visibility = "hidden";

        var exit = document.getElementById("exit" + nextSave);
        exit.style.visibility = "visible";

        var swap = document.getElementById("swap" + nextSave);
        swap.style.visibility = "visible";

        var canvas2 = document.getElementById("saved" + prevSave);
        canvas2 = canvas2.getContext("2d");
        var g2 = new Chart(canvas2, {
            type: graphType2,
            options: {
                scales: {
                    xAxes: [{display: false}],
                    yAxes: [{display: false}],
                },
                legend: {display: false},
                responsive: true,
                maintainAspectRatio: false,
                tooltips: false,
                animation: {duration: 0}
            },
            data: {
                labels: labelsArr2,
                datasets: [{
                    data: dataArr2,
                    backgroundColor: savedGraphColor,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }]
            }
        });
        g2.description = hoverText2;
        g2.DB = db2;
        g2.X = x2;
        g2.Y = y2;
        g2.lowDate = lowDate2;
        g2.highDate = highDate2;
        g2.minDate = minDate2;
        g2.maxDate = maxDate2;
        g2.type = graphType2;
        g2.color = color2;
        savedGraphs[prevSave - 1] = g2;

        tip = document.getElementById("tip" + prevSave);
        tip.style.display = "block";
        tip.style.backgroundColor = "#0000005c";
        hoverText2 = hoverText2.replace(/\n( *)/g, function (match, p1) {
            return '<br>' + '&nbsp;'.repeat(p1.length);
        });
        tip.innerHTML = hoverText2;
        tip.style.visibility = "hidden";

        exit = document.getElementById("exit" + prevSave);
        exit.style.visibility = "visible";

        swap = document.getElementById("swap" + prevSave);
        swap.style.visibility = "visible";
    }
}

//Removes a graph from the saved section
function deleteGraph(savedNum) {
    var g = savedGraphs[savedNum - 1];
    g.destroy();
    savedGraphs[savedNum - 1] = undefined;

    var tip = document.getElementById("tip" + savedNum);
    tip.style.display = "none";
    tip.style.backgroundColor = "transparent";
    tip.innerHTML = "";
    tip.style.visibility = "hidden";

    var exit = document.getElementById("exit" + savedNum);
    exit.style.visibility = "hidden";

    var swap = document.getElementById("swap" + savedNum);
    swap.style.visibility = "hidden";
}

//Shows tooltip over saved graph
function showToolTip(savedNum) {
    var tip = document.getElementById("tip" + savedNum);
    if (tip.style.visibility != "visible")
        tip.style.visibility = "visible";
    else
        tip.style.visibility = "hidden";
}

//Opens and closes color pallette
function showColorWheel(num) {
    var wheel = document.getElementById("colorWheel" + num);
    if (wheel.style.visibility != "visible")
        wheel.style.visibility = "visible";
    else
        wheel.style.visibility = "hidden";
}

//Changes color button
function changeColorButton(num, colorStr) {
    var btn = document.getElementById("colorButton" + num);
    btn.style.backgroundColor = colorValues[colorStr];
    btn.description = colorSchemeValues[colorStr];
    btn.value = colorStr;
    var wheel = document.getElementById("colorWheel" + num);
    wheel.style.visibility = "hidden";
}

//Reset color button
function resetColorButton(num) {
    changeColorButton(num, "white");
}

//Runs when dragging to save a graph into a saved region
function drag(ev, graph) {
    ev.dataTransfer.setData("text", graph);
}

//Runs when dropping a graph over a saved region
function drop(ev, destination) {
    ev.preventDefault();
    
    var data = ev.dataTransfer.getData("text");
    if (data.startsWith("graph")) {
        if (destination.startsWith("graph")) {
            //do nothing
        }
        else if (destination.startsWith("saved")) {
            var graphNum = data.substring(5);
            var saveNum = destination.substring(5);
            if (savedGraphs[saveNum - 1] == undefined || savedGraphs[saveNum - 1] == null) {
                saveGraph(saveNum, graphNum, false)
            }
            else {
                swap(saveNum, graphNum);
            }
        }
    }
    else if (data.startsWith("saved")) {
        if (destination.startsWith("graph")) {
            var graphNum = destination.substring(5);
            var saveNum = data.substring(5);
            swap(saveNum, graphNum);
            if ((graphNum == 1 && graph1 == undefined) || (graphNum == 2 && graph2 == undefined))
                deleteGraph(saveNum);
        }
        else if (destination.startsWith("saved")) {
            var prevSave = data.substring(5);
            var nextSave = destination.substring(5);
            relocate(prevSave, nextSave);
        }
    }
}

//Allows drops to occur
function allowDrop(ev) {
    ev.preventDefault();
}

//Changes site color theme
function changeColorTheme(element) {
    if (element.checked) {  //dark
        Chart.defaults.global.defaultFontColor = "white";
        //redraw graphs 1 and 2
        regraph(1);
        regraph(2);

        savedGraphColor = "white";
        for (var i = 1; i <= 10; i++) {
            resave(i);
        }

        var x = document.getElementsByClassName("logo")[0];
        x.src = "img/HistoryInDatalogodark.png";

        x = document.getElementsByTagName("BODY")[0];
        x.style.backgroundColor = "#413f3d";

        x = document.getElementsByClassName("col1")[0];
        x.style.color = "white";

        x = document.getElementsByClassName("row")[0];
        x.style.backgroundColor = "#263859";
        x = document.getElementsByClassName("row")[1];
        x.style.backgroundColor = "#263859";

        x = document.getElementsByClassName("select");
        for (var y = 0; y < x.length; y++) {
            x[y].style.backgroundColor = "black";
            x[y].style.color = "white";
        }

        x = document.getElementsByClassName("col2")[0];
        x.style.backgroundColor = "#525252";
        x.style.color = "white";

        x = document.getElementsByClassName("col3")[0];
        x.style.backgroundColor = "#160f30";
        x.style.color = "white";

        x = document.getElementsByClassName("tile");
        for (var y = 0; y < x.length; y++) {
            x[y].style.border = "1px solid white";
        }

        x = document.getElementsByClassName("exit");
        for (var y = 0; y < x.length; y++) {
            x[y].style.color = "white";
        }

        x = document.getElementsByClassName("swap");
        for (var y = 0; y < x.length; y++) {
            x[y].style.color = "white";
        }

        x = document.getElementsByClassName("modal-content")[0];
        x.style.backgroundColor = "#555555";
        x.style.color = "white";

        x = document.getElementsByTagName("legend");
        for (var y = 0; y < x.length; y++) {
            x[y].style.color = "white";
        }
    }
    else {  //light
        Chart.defaults.global.defaultFontColor = "#524636";
        //redraw graphs 1 and 2
        regraph(1);
        regraph(2);

        savedGraphColor = "#524636";
        for (var i = 1; i <= 10; i++) {
            resave(i);
        }

        var x = document.getElementsByClassName("logo")[0];
        x.src = "img/HistoryInDatalogolight.png";

        x = document.getElementsByTagName("BODY")[0];
        x.style.backgroundColor = "#c2edce";

        x = document.getElementsByClassName("col1")[0];
        x.style.color = "#524636";

        x = document.getElementsByClassName("select");
        for (var y = 0; y < x.length; y++) {
            x[y].style.backgroundColor = "white";
            x[y].style.color = "black";
        }

        x = document.getElementsByClassName("row")[0];
        x.style.backgroundColor = "#92bbbd";
        x = document.getElementsByClassName("row")[1];
        x.style.backgroundColor = "#92bbbd";

        x = document.getElementsByClassName("col2")[0];
        x.style.backgroundColor = "#f6f6f2";
        x.style.color = "#524636";

        x = document.getElementsByClassName("col3")[0];
        x.style.backgroundColor = "#66aedb";
        x.style.color = "524636";

        x = document.getElementsByClassName("tile");
        for (var y = 0; y < x.length; y++) {
            x[y].style.border= "1px solid #524636";
        }

        x = document.getElementsByClassName("exit");
        for (var y = 0; y < x.length; y++) {
            x[y].style.color = "#524636";
        }

        x = document.getElementsByClassName("swap");
        for (var y = 0; y < x.length; y++) {
            x[y].style.color = "#524636";
        }

        x = document.getElementsByClassName("modal-content")[0];
        x.style.backgroundColor = "white";
        x.style.color = "black";

        x = document.getElementsByTagName("legend");
        for (var y = 0; y < x.length; y++) {
            x[y].style.color = "black";
        }
    }
}

//redraws a graph in the second column
function regraph(n) {
    var db = undefined;
    var x = undefined;
    var y = undefined;
    var lowDate = undefined;
    var highDate = undefined;
    var minDate = undefined;
    var maxDate = undefined;
    var graphType = undefined;
    var color = undefined;

    if (n == 1) {
        if (graph1 == undefined)
            return;
        db = graph1.DB;
        x = graph1.X;
        y = graph1.Y;
        lowDate = graph1.lowDate;
        highDate = graph1.highDate;
        minDate = graph1.minDate;
        maxDate = graph1.maxDate;
        graphType = graph1.type;
        color = graph1.color;
    }
    else {
        if (graph2 == undefined)
            return;
        db = graph2.DB;
        x = graph2.X;
        y = graph2.Y;
        lowDate = graph2.lowDate;
        highDate = graph2.highDate;
        minDate = graph2.minDate;
        maxDate = graph2.maxDate;
        graphType = graph2.type;
        color = graph2.color;
    }

    if (db.startsWith("external"))
        graphExternalData(db, x, y, n, lowDate, highDate, minDate, maxDate, graphType, color);
    else
        graphData(db, x, y, n, lowDate, highDate, minDate, maxDate, graphType, color);
}

//redraws a graph in the saved region
function resave(saveNum) {
    var savedGraph = savedGraphs[saveNum - 1];
    if (savedGraph == undefined)
        return;
    if (g != null)
        g.destroy();
    savedGraph[saveNum - 1] = undefined;
    
    var labelsArr = savedGraph.config.data.labels;
    var dataArr = savedGraph.config.data.datasets[0].data;
    var hoverText = savedGraph.description;
    var db = savedGraph.DB;
    var x = savedGraph.X;
    var y = savedGraph.Y;
    var lowDate = savedGraph.lowDate;
    var highDate = savedGraph.highDate;
    var minDate = savedGraph.minDate;
    var maxDate = savedGraph.maxDate;
    var graph_type = savedGraph.type;
    var color = savedGraph.color;

    var tip = document.getElementById("tip" + saveNum);
    tip.style.display = "none";
    tip.style.backgroundColor = "transparent";
    tip.innerHTML = "";

    var canvas = document.getElementById("saved" + saveNum);
    canvas = canvas.getContext("2d");
    var g = new Chart(canvas, {
        type: graph_type,
        options: {
            scales: {
                xAxes: [{
                    display: false
                }],
                yAxes: [{
                    display: false
                }],
            },
            legend: {
                display: false
            },
            responsive: true,
            maintainAspectRatio: false,
            tooltips: false,
            animation: {
                duration: 0
            }
        },
        data: {
            labels: labelsArr,
            datasets: [{
                data: dataArr,
                backgroundColor: savedGraphColor,
                pointRadius: 0,
                pointHoverRadius: 0
            }]
        }
    });
    g.description = hoverText;
    g.DB = db;
    g.X = x;
    g.Y = y;
    g.lowDate = lowDate;
    g.highDate = highDate;
    g.minDate = minDate;
    g.maxDate = maxDate;
    g.type = graph_type;
    g.color = color;
    savedGraphs[saveNum - 1] = g;

    var tip = document.getElementById("tip" + saveNum);
    tip.style.display = "block";
    tip.style.backgroundColor = "#0000005c";
    hoverText = hoverText.replace(/\n( *)/g, function (match, p1) {
        return '<br>' + '&nbsp;'.repeat(p1.length);
    });
    tip.innerHTML = hoverText;
    tip.style.visibility = "hidden";

    var exit = document.getElementById("exit" + saveNum);
    exit.style.visibility = "visible";

    var swap = document.getElementById("swap" + saveNum);
    swap.style.visibility = "visible";
}

function exportGraph(n) {
    var labelsArr = undefined;
    var dataArr = undefined;
    var db = undefined;
    var x = undefined;
    var y = undefined;
    var lowDate = undefined;
    var highDate = undefined;
    var minDate = undefined;
    var maxDate = undefined;
    var graph_type = undefined;
    var color = undefined;

    if (n == 1) {
        labelsArr = graph1.config.data.labels;
        dataArr = graph1.config.data.datasets[0].data;
        db = graph1.DB;
        x = graph1.X;
        y = graph1.Y;
        lowDate = graph1.lowDate;
        highDate = graph1.highDate;
        minDate = graph1.minDate;
        maxDate = graph1.maxDate;
        graph_type = graph1.type;
        color = graph1.color;
    }
    else if (n == 2) {
        labelsArr = graph2.config.data.labels;
        dataArr = graph2.config.data.datasets[0].data;
        db = graph2.DB;
        x = graph2.X;
        y = graph2.Y;
        lowDate = graph2.lowDate;
        highDate = graph2.highDate;
        minDate = graph2.minDate;
        maxDate = graph2.maxDate;
        graph_type = graph2.type;
        color = graph2.color;
    }

    sessionStorage.setItem("labelsArr", labelsArr);
    sessionStorage.setItem("dataArr", dataArr);
    sessionStorage.setItem("db", db);
    sessionStorage.setItem("x", x);
    sessionStorage.setItem("y", y);
    sessionStorage.setItem("lowDate", lowDate);
    sessionStorage.setItem("highDate", highDate);
    sessionStorage.setItem("minDate", minDate);
    sessionStorage.setItem("maxDate", maxDate);
    sessionStorage.setItem("graph_type", graph_type);
    sessionStorage.setItem("color", colorSchemeValues[color]);

    window.open("/export.html", "_blank");
}