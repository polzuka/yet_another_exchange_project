'use strict';

function generateBar(date) {
  let open = Math.round( Math.random() * ( 30 ) + 100 );
  let close = open + Math.round( Math.random() * ( 15 ) - Math.random() * 10 );

  let low;
  if ( open < close ) {
    low = open - Math.round( Math.random() * 5 );
  } else {
    low = close - Math.round( Math.random() * 5 );
  }

  let high;
  if ( open < close ) {
    high = close + Math.round( Math.random() * 5 );
  } else {
    high = open + Math.round( Math.random() * 5 );
  }

  let i = Math.round(Math.random() * 1000);
  let volume = Math.round( Math.random() * ( 1000 + i ) ) + 100 + i;
  let value = Math.round( Math.random() * ( 30 ) + 100 );

  return {
    date,
    open,
    close,
    low,
    high,
    volume,
    value
  };
}

function generateHistoryData() {
  const nonce = new Date().getTime();

  const firstDate = new Date(nonce);
  firstDate.setHours(0, 0, 0, 0);
  firstDate.setDate(firstDate.getDate() - 2000);

  const chartData = [];

  for (let i = 0; i < 2000; i++) {
    const newDate = new Date(firstDate);
    newDate.setDate(newDate.getDate() + i);

    const bar = generateBar(newDate);
    chartData.push(bar);
  }

  return {
    chartData,
    nonce
  };
}

function generateUpdateData(oldNonce) {
  const nonce = new Date().getTime();

  const newDate = new Date(nonce);
  newDate.setHours(0, 0, 0, 0);

  const bar = generateBar(newDate);
  const chartData = [bar];

  return {
    chartData,
    nonce
  };
}

module.exports = {
  generateHistoryData,
  generateUpdateData
};