'use strict';



class Connectors {
  constructor() {

  }

  async create(type, pair, apiKey, apiSecret, depth) {
    switch (type) {
      case 'cex': return await new CexConnector(pair, apiKey, apiSecret, depth)
    }
  }
}