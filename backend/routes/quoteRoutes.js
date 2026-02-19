const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, quoteController.getQuotes);
router.delete('/:id', authMiddleware, quoteController.deleteQuote);
router.get('/:id/excel', authMiddleware, quoteController.downloadExcel);
router.get('/:id/word', authMiddleware, quoteController.downloadWord);

module.exports = router;
