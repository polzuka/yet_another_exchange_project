const $ = require('../jquery/jquery.min.js');
require('../amcharts/amcharts.js');
require('../amcharts/serial.js');
require('../amcharts/amstock.js');
require('../amcharts/plugins/export/export.min.js');
require('../amcharts/themes/light.js');
require('../stylesheets/main.css');

function createChart () {
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
      // Цена первой биржи
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
      // Цена второй биржи
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
      // Сторона sell стакана первой биржи
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
      // Сторона sell стакана второй биржи
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
      // Сторона buy стакана первой биржи
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
      // Сторона buy стакана второй биржи
      {
        id: 'g6',
        valueField: 'buy2',
        type: 'line',
        fillAlphas: 0,
        bulletColor: 'green',
        lineColor: 'green',
        bulletSize: 0,
        showBalloon: false
      },
      // Самая мякотка
      // То, чего вы никогда не увидите на графике. Но оно там есть
      {
        id: 'g7',
        valueField: 'firstPrice1',
        type: 'line',
        fillAlphas: 0,
        bulletSize: 0,
        showBalloon: false
      },
      {
        id: 'g8',
        valueField: 'firstPrice2',
        type: 'line',
        fillAlphas: 0,
        bulletSize: 0,
        showBalloon: false
      }
    ],
    dataProvider: []
  });
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

chart.addListener('zoomed', event => {
  event.chart.lastZoomed = event;
});

chart.addListener('rendered', event => {
  event.chart.chartDiv.addEventListener('mouseup', () => {
    console.log('mouse up')
    if (!event.chart.mouseIsDown)
      return;
    console.log(event.chart.lastZoomed)
    event.chart.mouseIsDown = false;
    const zoomedEvent = event.chart.lastZoomed;

    const requestedFirstDate = new Date(zoomedEvent.startDate).getTime();
    event.chart.viewer.getHistory(requestedFirstDate);
  });
});

chart.addListener('dataUpdated', event => {
  // set up generic mouse events
  if (event.chart.chartScrollbar.set) {
    const sb = event.chart.chartScrollbar.set.node;
    sb.addEventListener('mousedown', event.chart.mouseIsDown = true);
  }

  const data = event.chart.dataProvider;

  if (data.length === 0)
    return;

  const loader = $('#loader');
  loader.hide();

  // Индекс 1, потому что сделка с нулевым индексом - вспомогательная невидимая.
  const firstDate = new Date(data[1].date);
  const lastDate = new Date(data[data.length - 1].date);
  event.chart.zoomToDates(firstDate, lastDate);
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
    chart.viewer = this;
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

  getUpdate () {
    const updateRequestObject = {
      type: 'update',
      lastLoadedId: this.lastLoadedId,
      batchId: this.batchId
    };
    console.log(updateRequestObject);
    this.ws.send(JSON.stringify(updateRequestObject));
  }

  getHistory (requestedFirstDate) {
    console.log('getHistory')
    if (this.firstLoadedId === undefined)
      return;

    const historyRequestObject = {
      type: 'history',
      batchId: this.batchId,
      limit: 10,
      firstLoadedId: this.firstLoadedId,
      requestedFirstDate
    };
    console.log(historyRequestObject);
    this.send(historyRequestObject);
  }

  getBoundary () {
    const boundaryRequestObject = {
      type: 'boundary',
      batchId: this.batchId
    };
    console.log(boundaryRequestObject);
    this.send(boundaryRequestObject);
  }

  startUpdate () {
    this.intervalId = setInterval(() => this.getUpdate(), 1000);
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
    console.log(data);
    this.updateChart(data.chartData);
    this.firstLoadedId = data.firstLoadedId;
    if (data.complete)
      return;
    this.getHistory(data.requestedFirstDate);
  }

  onUpdate (data) {
    console.log(data);
    this.updateChart(data.chartData);
    this.lastLoadedId = data.lastLoadedId;
  }

  onBoundary (data) {
    console.log(data);
    this.updateChart(data.chartData);
    this.lastLoadedId = data.lastLoadedId;
    this.firstLoadedId = data.lastLoadedId;
    this.batchId = data.batchId;
    this.getHistory();
  }

  send (data) {
    this.ws.send(JSON.stringify(data));
  }

  start () {
    this.batchId = $('#chart').attr('batchId');
    const uri = window.location.origin.replace('http', 'ws');
    this.ws = new WebSocket(uri + '/ws/data');

    this.ws.onopen = () => {
      this.getBoundary();

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
