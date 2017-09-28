const $ = require('../jquery/jquery.min.js');
require('../amcharts/amcharts.js');
require('../amcharts/serial.js');
require('../amcharts/amstock.js');
require('../amcharts/plugins/export/export.min.js');
require('../amcharts/themes/light.js');
require('../stylesheets/main.css');


function createChart() {
  return AmCharts.makeChart( "chart", {
    type: "serial",
    categoryField: "date",
    autoMarginOffset: 40,
    marginRight: 60,
    marginTop: 60,
    fontSize: 12,
    theme: "light",

    legend: {
      equalWidths: false,
      useGraphSettings: true,
      valueAlign: "left",
      valueWidth: 120
    },

    categoryAxis: {
      parseDates: true, 
      minPeriod: 'ss'
    },


    "chartCursor": {
      "enabled": true,
      position: 'mouse',
      "valueBalloonsEnabled": true,
    "graphBulletSize": 1,
    "valueLineBalloonEnabled": true,
    "valueLineEnabled": true,
    "valueLineAlpha": 0.5
    },
    "chartScrollbar": {
      "enabled": true,
      "graph": "g1",
      "graphType": "line",
      "scrollbarHeight": 30,
      usePeriod: "ss"
    },
    "trendLines": [],
    "graphs": [
      {
        bulletAlpha: 1,
        balloonText: "[[volume]]",
        id: 'g1',
        valueField: 'price1',
        type: 'line',
        fillAlphas: 0,
        lineThickness: 0,
        bullet: 'round',
        bulletColor: 'red',
        bulletSizeField: 'bulletSize',
        title: 'MARKET 1'
      },
      {
        bulletAlpha: 1,
        balloonText: "[[volume]]",
        id: 'g2',
        valueField: 'price2',
        type: 'line',
        fillAlphas: 0,
        lineThickness: 0,
        bullet: 'round',
        bulletColor: 'green',
        bulletSizeField: 'bulletSize',
        title: 'MARKET 2'
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
    "titles": [],
    "dataProvider": []
  } );
}

const chart = createChart();

function addNode(parent, childClass, text) {
  const childDiv = $('<div/>');
  childDiv.addClass(childClass);
  parent.append(childDiv);
  childDiv.text(text);
  return childDiv;
}


function fillItems(items, div) {
  const pricesDiv = addNode(div, 'prices');
  const amountsDiv = addNode(div, 'amounts');
  addNode(pricesDiv, 'header', 'Price');
  addNode(amountsDiv, 'header', 'Amount');

  items.forEach(item => {
    const [price, amount] = item;
    const priceDiv = addNode(pricesDiv, 'price');
    const amountDiv = addNode(amountsDiv, 'amount');
    priceDiv.text(price);
    amountDiv.text(amount);
  });
}

chart.addListener("rollOverGraphItem", function(event) {
  const booksDiv = $('#books');
  booksDiv.empty();
  const books = event.item.dataContext.books;

  books.forEach((book, i) => {
    const bookDiv = addNode(booksDiv, 'book');
    addNode(bookDiv, 'header', `MARKET ${i + 1} - ${book.mic}`);
    const asksDiv = addNode(bookDiv, 'asks');
    const bidsDiv = addNode(bookDiv, 'bids');
    addNode(asksDiv, 'header', 'Sell side');
    addNode(bidsDiv, 'header', 'Buy side');
    fillItems(book.sellSide, asksDiv);
    fillItems(book.buySide, bidsDiv);
  });

});

let nonce;
let batchId;
let intervalId;

function updateChart(data) {
  if (!data.length)
    return;

  chart.dataProvider = chart.dataProvider.concat(data);
  chart.validateData();
}

function start() {
  const uri = window.location.origin.replace('http', 'ws');
  const ws = new WebSocket(uri + '/ws/data');

  ws.onopen = () => {
    const historyRequestObject = {type: 'history'};
    ws.send(JSON.stringify(historyRequestObject));

    intervalId = setInterval(() => {
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

  ws.onclose = () => {
    clearInterval(intervalId);
    start();
  }

  ws.onerror = event => {
    console.log(event);
  };
}

start();

