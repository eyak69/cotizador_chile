const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, empresaController.getEmpresas);
router.post('/', authMiddleware, empresaController.createEmpresa);
router.put('/:id', authMiddleware, empresaController.updateEmpresa);
router.delete('/:id', authMiddleware, empresaController.deleteEmpresa);

module.exports = router;
