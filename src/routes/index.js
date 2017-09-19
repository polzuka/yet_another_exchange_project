'use strict';

const express = require('express');
const router = express.Router();

/* GET main page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Yet another exchange project' });
});

module.exports = router;
