const $ = require('../jquery/jquery.min.js');
require('../amcharts/amcharts.js');
require('../amcharts/serial.js');
require('../amcharts/amstock.js');
require('../amcharts/plugins/export/export.min.js');
require('../amcharts/themes/light.js');
require('../stylesheets/main.css');

function createChart() {
  return AmCharts.makeChart('chart', {
    type: 'serial',
    categoryField: 'date',
    autoMarginOffset: 10,
    marginRight: 10,
    marginTop: 10,
    fontSize: 12,
    theme: 'light',

    legend: {
      equalWidths: false,
      useGraphSettings: true,
      valueAlign: 'left',
      valueWidth: 120,
      valueText: '',
      markerType: 'square'
    },

    categoryAxis: {
      parseDates: true,
      minPeriod: 'fff'
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
      categoryBalloonDateFormat: 'JJ:NN:SS.QQQ'
    },

    chartScrollbar: {
      enabled: true,
      graph: 'g1',
      graphType: 'line',
      scrollbarHeight: 30,
      usePeriod: 'fff',
      oppositeAxis: false
    },

    valueScrollbar: {
      autoGridCount: true,
      color: '#000000',
      scrollbarHeight: 30
    },

    graphs: [
      {
        bulletAlpha: 0,
        bulletBorderAlpha: 1,
        bulletBorderThickness: 1,
        balloonText: '[[volume]]',
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
        balloonText: '[[volume]]',
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
        bulletColor: 'red',
        lineColor: 'red',
        bulletSize: 0,
        showBalloon: false
      },
      {
        id: 'g4',
        valueField: 'sell2',
        type: 'line',
        fillAlphas: 0,
        bulletColor: 'red',
        lineColor: 'red',
        bulletSize: 0,
        showBalloon: false
      },
      {
        id: 'g5',
        valueField: 'buy1',
        type: 'line',
        fillAlphas: 0,
        bulletColor: 'green',
        lineColor: 'green',
        bulletSize: 0,
        showBalloon: false
      },
      {
        id: 'g6',
        valueField: 'buy2',
        type: 'line',
        fillAlphas: 0,
        bulletColor: 'green',
        lineColor: 'green',
        bulletSize: 0,
        showBalloon: false
      }
    ],
    'dataProvider': []
  } );
}

const chart = createChart();

function addNode (parent, childClass, text) {
  const childDiv = $('<div/>');
  childDiv.addClass(childClass);
  parent.append(childDiv);
  childDiv.text(text);
  return childDiv;
}

function fillItems (items, div) {
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
  const booksDiv = $('#booksWrapper');
  booksDiv.empty();
  const tradeId = event.item.dataContext.tradeId;
  fetch('/ws/data?tradeId=' + tradeId)
    .then(response => response.json())
    .then(data => {
      const books = data.books;
      const keys = getKeys(books);

      books.forEach(book => {
        const index = keys[getKey(book)];
        const bookDiv = addNode(booksDiv, `book${index}`);
        addNode(bookDiv, 'header', `MARKET ${index} - ${book.mic}`);
        const asksDiv = addNode(bookDiv, 'asks');
        const bidsDiv = addNode(bookDiv, 'bids');
        addNode(asksDiv, 'header', 'Sell side');
        addNode(bidsDiv, 'header', 'Buy side');
        fillItems(book.sellSide, asksDiv);
        fillItems(book.buySide, bidsDiv);
      });
    });
});

chart.addListener('rendered', () => {
  const loader = $('#loader');
  loader.hide();
});

function getKeys (books) {
  let [key1, key2] = books.map(book => getKey(book));
  const keys = {};

  if (key1 < key2)
    [key1, key2] = [key2, key1];

  keys[key1] = 1;
  keys[key2] = 2;
  return keys;
}

function getKey ({mic, pair}) {
  return mic + pair;
}

class Viewer {
  constructor (chart) {
    this.chart = chart;
  }

  updateChart (data) {
    // Если ничего не пришло, ничего не делаем
    if (!data.length)
      return;

    if (chart.dataProvider.length) {
      data.forEach(trade => {
        // Тут нельзя просто приклеить новые данные, 
        // т.к. с некоторых бирж данные приходят с опозданием,
        // и возникают ситуации, при которых данные с более ранним временем 
        // находятся в списке правее, чем данные с более поздним временем.
        // Короче, график ломается.
        for (let i = chart.dataProvider.length - 1; i >= 0; i--) {
          if (chart.dataProvider[i].date < trade.date) {
            chart.dataProvider.splice(i + 1, 0, trade);
            break;
          }
        }
      });
    } else
      chart.dataProvider = data;

    // Перерисовка графика
    chart.validateData();
  }

  startUpdate () {
    this.intervalId = setInterval(() => {
      const updateRequestObject = {
        type: 'update',
        lastLoadedId: this.lastLoadedId,
        batchId: this.batchId
      };

      this.ws.send(JSON.stringify(updateRequestObject));
    }, 1000);
  }

  stopUpdate () {
    clearInterval(this.intervalId);
  }

  onMessage (event) {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'history': return this.onHistory(data);
      case 'boundary': return this.onBoundary(data);
      case 'update': return this.onUpdate(data);
    }
  }

  onHistory (data) {
    this.updateChart(data.chartData);
    this.firstLoadedId = data.firstLoadedId;
  }

  onUpdate (data) {
    this.updateChart(data.chartData);
    this.lastLoadedId = data.lastLoadedId;
  }

  onBoundary (data) {
    this.updateChart(data.chartData);
    this.lastLoadedId = data.lastLoadedId;
    this.batchId = data.batchId;

    const historyRequestObject = {
      type: 'history',
      batchId: this.batchId,
      limit: 10,
      firstLoadedId: this.firstLoadedId
    };
    this.send(historyRequestObject);
  }

  send (data) {
    this.ws.send(JSON.stringify(data));
  }

  start () {
    this.batchId = $('#chart').attr('batchId');
    const uri = window.location.origin.replace('http', 'ws');
    this.ws = new WebSocket(uri + '/ws/data');

    this.ws.onopen = () => {
      const boundaryRequestObject = {
        type: 'boundary',
        batchId: this.batchId
      };
      this.send(boundaryRequestObject);

      if (this.update)
        this.startUpdate();
    };

    this.ws.onmessage = event => this.onMessage(event);

    this.ws.onclose = () => {
      this.stopUpdate();
      this.start();
    };

    this.ws.onerror = event => {
      console.log(event);
    };
  }

  init () {
    $('#batches select').change(event => {
      window.location.href = window.location.origin + '?batchId=' + $(event.target).find('option:selected').attr('batchId');
    });

    this.update = false;
    const updateButton = $('#update');
    updateButton.text('update');
    updateButton.click(() => {
      this.update = !this.update;
      updateButton.text(this.update ? 'stop' : 'update');
      this.update ? this.startUpdate() : this.stopUpdate();
    });

    this.start();
  }
}

const viewer = new Viewer(chart);

$(document).ready(() => viewer.init());
