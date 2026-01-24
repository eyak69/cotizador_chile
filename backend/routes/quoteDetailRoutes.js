const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');

router.put('/:id', quoteController.updateQuoteDetail);

module.exports = router;
