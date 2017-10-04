const $ = require('../jquery/jquery.min.js');
require('../amcharts/amcharts.js');
require('../amcharts/serial.js');
require('../amcharts/amstock.js');
require('../amcharts/plugins/export/export.min.js');
require('../amcharts/themes/light.js');
require('../stylesheets/main.css');

const data = [];

function createChart() {
  return AmCharts.makeChart("chart", {
    type: "stock",
    theme: "light",

    mouseWheelScrollEnabled: true,
  
    "categoryAxesSettings": {
      "minPeriod": "ss",
      "groupToPeriods": [ 'ss' ]
    },

    panels: [{
      showCategoryAxis: true,
      title: "MARKET 1",
      percentHeight: 50,
      stockGraphs: [{
        bulletAlpha: 0,
        bulletBorderAlpha: 1,
        bulletBorderThickness: 1,
        balloonText: "price: [[price1]]<br>amount: [[volume]]",
        id: 'g1',
        valueField: 'price1',
        type: 'line',
        lineThickness: 0,
        bullet: 'round',
        lineColorField: 'bulletColor',
        bulletSizeField: 'bulletSize',
      }],
      stockLegend: {
        valueText: '',
        valueTextRegular: '',
        "markerType": "none"
      }
    }, {
      showCategoryAxis: true,
      title: "MARKET 2",
      percentHeight: 50,
      stockGraphs: [{
        bulletAlpha: 0,
        bulletBorderAlpha: 1,
        bulletBorderThickness: 1,
        balloonText: "price: [[price2]]<br>amount: [[volume]]",
        id: 'g2',
        valueField: 'price2',
        type: 'line',
        lineThickness: 0,
        bullet: 'round',
        lineColorField: 'bulletColor',
        bulletSizeField: 'bulletSize',
      }],
      stockLegend: {
        valueText: '',
        valueTextRegular: '',
        "markerType": "none"
      }
    }],

    dataSets: [ {
      fieldMappings: [ {
        fromField: "volume",
        toField: "volume"
      }, {
        fromField: "price1",
        toField: "price1"
      }, {
        fromField: "price2",
        toField: "price2"
      }, {
        fromField: "bulletSize",
        toField: "bulletSize"
      }, {
        fromField: "bulletColor",
        toField: "bulletColor"
      } ],
      dataProvider: data,
      categoryField: "date",
      stockEvents: []
    } ],

    chartCursorSettings: {
      enabled: true,
      position: 'mouse',
      valueBalloonsEnabled: true,
      graphBulletSize: 1,
      valueLineBalloonEnabled: true,
      valueLineEnabled: true,
      valueLineAlpha: 0.5,
      // zoomable: false,
      // valueZoomable: true,
    },

    chartScrollbarSettings: {
      enabled: true,
      graph: "g1",
      graphType: "line",
      scrollbarHeight: 30,
      usePeriod: 'ss'
    },

    // periodSelector: {
    //   position: "bottom",
    //   periods: [ {
    //     period: "ss",
    //     count: 1,
    //     label: "1 sec"
    //   }, {
    //     period: "ss",
    //     count: 10,
    //     label: "10 sec"
    //   }, {
    //     period: "ss",
    //     count: 100,
    //     label: "100 sec"
    //   }, {
    //     period: "DD",
    //     count: 10,
    //     label: "10 days"
    //   }, {
    //     period: "MM",
    //     selected: true,
    //     count: 1,
    //     label: "1 month"
    //   }, {
    //     period: "YYYY",
    //     count: 1,
    //     label: "1 year"
    //   }, {
    //     period: "YTD",
    //     label: "YTD"
    //   }, {
    //     period: "MAX",
    //     label: "MAX"
    //   } ]
    // },
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
  addNode(pricesDiv, '', 'Price');
  addNode(amountsDiv, '', 'Amount');

  items.forEach(item => {
    const [price, amount] = item;
    const priceDiv = addNode(pricesDiv, 'price');
    const amountDiv = addNode(amountsDiv, 'amount');
    priceDiv.text(price);
    amountDiv.text(amount);
  });
}

function onClickGraphItem(event) {
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
}

chart.addListener('init', () => {
  chart.panels.forEach(panel => {
    panel.addListener('clickGraphItem', onClickGraphItem);
  });
});

let nonce;
let batchId;
let intervalId;

function updateChart(data) {
  if (!data.length)
    return;

  chart.dataSets.forEach(dataSet => dataSet.dataProvider = dataSet.dataProvider.concat(data));
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

