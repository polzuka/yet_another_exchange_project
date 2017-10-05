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
    autoMarginOffset: 10,
    marginRight: 10,
    marginTop: 10,
    fontSize: 12,
    theme: "light",

    legend: {
      equalWidths: false,
      useGraphSettings: true,
      valueAlign: "left",
      valueWidth: 120,
      valueText: '',
      markerType: 'square'
    },

    categoryAxis: {
      parseDates: true, 
      minPeriod: 'ss'
    },

    chartCursor: {
      enabled: true,
      position: 'mouse',
      valueBalloonsEnabled: true,
      graphBulletSize: 1,
      valueLineBalloonEnabled: true,
      valueLineEnabled: true,
      valueLineAlpha: 0.5,
      zoomable: false,
      valueZoomable: true,
    },

    chartScrollbar: {
      enabled: true,
      graph: 'g1',
      graphType: 'line',
      scrollbarHeight: 30,
      usePeriod: 'ss',
      oppositeAxis: false
    },

    valueScrollbar: {
      autoGridCount: true,
      color: "#000000",
      scrollbarHeight: 30
    },

    graphs: [
      {
        bulletAlpha: 0,
        bulletBorderAlpha: 1,
        bulletBorderThickness: 1,
        balloonText: "[[volume]]",
        id: 'g1',
        valueField: 'price1',
        type: 'line',
        fillAlphas: 0,
        lineThickness: 0,
        bulletField: 'bullet',
        bulletColor: 'purple',
        lineColor: 'purple',
        bulletSizeField: 'bulletSize',
        title: 'MARKET 1',
        markerType: 'square'
      },
      {
        bulletAlpha: 0,
        bulletBorderAlpha: 1,
        bulletBorderThickness: 1,
        balloonText: "[[volume]]",
        id: 'g2',
        valueField: 'price2',
        type: 'line',
        fillAlphas: 0,
        lineThickness: 0,
        bulletField: 'bullet',
        bulletColor: 'blue',
        lineColor: 'blue',
        bulletSizeField: 'bulletSize',
        title: 'MARKET 2',
        markerType: 'square'
      },
      {
        id: 'g3',
        valueField: 'sell1',
        type: 'line',
        fillAlphas: 0,
        lineThickness: 0,
        bullet: 'custom',
        customBullet: window.location.origin + '/images/red_line.svg',
        bulletColor: 'red',
        lineColor: 'red',
        bulletSizeField: 'bulletSize',
      },
      {
        id: 'g4',
        valueField: 'sell2',
        type: 'line',
        fillAlphas: 0,
        lineThickness: 0,
        bullet: 'custom',
        customBullet: window.location.origin + '/images/red_line.svg',
        bulletColor: 'red',
        lineColor: 'red',
        bulletSizeField: 'bulletSize',
      },
      {
        id: 'g5',
        valueField: 'buy1',
        type: 'line',
        fillAlphas: 0,
        lineThickness: 0,
        bullet: 'custom',
        customBullet: window.location.origin + '/images/green_line.svg',
        bulletColor: 'green',
        lineColor: 'green',
        bulletSizeField: 'bulletSize',
      },
      {
        id: 'g6',
        valueField: 'buy2',
        type: 'line',
        fillAlphas: 0,
        lineThickness: 0,
        bullet: 'custom',
        customBullet: window.location.origin + '/images/green_line.svg',
        bulletColor: 'green',
        lineColor: 'green',
        bulletSizeField: 'bulletSize',
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

chart.addListener('rollOverGraphItem', event => {
  const booksDiv = $('#books');
  booksDiv.empty();
  const books = event.item.dataContext.books;

  books.forEach((book, i) => {
    const bookDiv = addNode(booksDiv, `book${i + 1}`);
    addNode(bookDiv, 'header', `MARKET ${i + 1} - ${book.mic}`);
    const asksDiv = addNode(bookDiv, 'asks');
    const bidsDiv = addNode(bookDiv, 'bids');
    addNode(asksDiv, 'header', 'Sell side');
    addNode(bidsDiv, 'header', 'Buy side');
    fillItems(book.sellSide, asksDiv);
    fillItems(book.buySide, bidsDiv);
  });
});

chart.addListener('rendered', () => {
  const loader = $('#loader');
  loader.hide();
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
  batchId = $('#chart').attr('batchId');
  const uri = window.location.origin.replace('http', 'ws');
  const ws = new WebSocket(uri + '/ws/data');

  ws.onopen = () => {
    const historyRequestObject = {
      type: 'history',
      batchId: batchId
    };
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

$(document).ready(() => {
  start();
  $('#batches select').change(event => {
    window.location.href = window.location.origin + '?batchId=' + $(event.target).find('option:selected').attr('batchId')
  });
});
