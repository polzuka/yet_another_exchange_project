'use strict';

const express = require('express');
const db = require('../../backend/db');

const router = express.Router();

/* GET main page. */
router.get('/', async (req, res) => {
  const batches = await db.trades.getBatches();
  res.render('index', { title: 'Yet another exchange project', batchId: req.query.batchId, batches });
});

module.exports = router;
