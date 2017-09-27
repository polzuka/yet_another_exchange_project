require('../amcharts/amcharts.js');
require('../amcharts/serial.js');
require('../amcharts/amstock.js');
require('../amcharts/plugins/export/export.min.js');
require('../amcharts/themes/light.js');
require('../stylesheets/main.css');

function createChart() {
  return AmCharts.makeChart( "chartdiv", {
    "type": "serial",
    "categoryField": "date",
    "autoMarginOffset": 40,
    "marginRight": 60,
    "marginTop": 60,
    "fontSize": 12,
    "theme": "light",
    "categoryAxis": {
      "parseDates": true, 
      minPeriod: 'ss'
    },
    "chartCursor": {
      "enabled": true,
      // valueLineBalloonEnabled: true,
      //   valueLineEnabled: true
    },
    "chartScrollbar": {
      "enabled": true,
      "graph": "g1",
      "graphType": "line",
      "scrollbarHeight": 30,
      usePeriod: "mm"
    },
    "trendLines": [],
    "graphs": [
      {
        "balloonText": "Open:<b>[[open]]</b><br>Low:<b>[[low]]</b><br>High:<b>[[high]]</b><br>Close:<b>[[close]]</b><br>",
        id: 'g1',
        valueField: 'price1',
        type: 'line',
        showBalloon: false,
        fillAlphas: 0,
        lineThickness: 2,
        bullet: 'round',
        bulletColor: 'red',
        bulletSizeField: 'bulletSize1',
        // "useDataSetColors": true,
      },
      {
        "balloonText": "Open:<b>[[open]]</b><br>Low:<b>[[low]]</b><br>High:<b>[[high]]</b><br>Close:<b>[[close]]</b><br>",
        id: 'g2',
        valueField: 'price2',
        type: 'line',
        showBalloon: false,
        fillAlphas: 0,
        lineThickness: 2,
        bullet: 'round',
        bulletColor: 'green',
        bulletSizeField: 'bulletSize2',
        // "useDataSetColors": true,
      }
    ],
    "guides": [
      {
        "id": "Guide-1"
      },
      {
        "id": "Guide-2"
      }
    ],
    "valueAxes": [
      {
        "id": "ValueAxis-1"
      }
    ],
    periodSelector: {
      position: "bottom",
      periods: [ {
        period: "ss",
        count: 1,
        label: "1 sec"
      }, {
        period: "ss",
        count: 100,
        label: "100 sec"
      }, {
        period: "DD",
        count: 10,
        label: "10 days"
      }, {
        period: "MM",
        selected: true,
        count: 1,
        label: "1 month"
      }, {
        period: "YYYY",
        count: 1,
        label: "1 year"
      }, {
        period: "YTD",
        label: "YTD"
      }, {
        period: "MAX",
        label: "MAX"
      } ]
    },
    "allLabels": [],
    "balloon": {},
    "titles": [],
    "dataProvider": []
  } );
}

const chart = createChart();
let nonce;
let batchId;

function updateChart(data) {
  data.forEach((trade) => chart.dataProvider.push(trade));
  // chart.dataProvider = chart.dataProvider.concat(d []ata);
  chart.validateData();
}

function start() {
  const uri = window.location.origin.replace('http', 'ws');
  const ws = new WebSocket(uri + '/ws/data');

  ws.onopen = () => {
    const historyRequestObject = {type: 'history'};
    ws.send(JSON.stringify(historyRequestObject));

    setInterval(() => {
      const updateRequestObject = {
        type: 'update',
        nonce,
        batchId
      };

      ws.send(JSON.stringify(updateRequestObject));
    }, 1000);
  };

  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    updateChart(data.chartData);
    nonce = data.nonce;
    batchId = data.batchId;
  };

  ws.onclose = () => setTimeout(start, 1000);

  ws.onerror = event => {
    console.log(event);
  };
}

start();

