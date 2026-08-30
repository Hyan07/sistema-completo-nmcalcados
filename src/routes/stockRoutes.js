'use strict';

const express = require('express');
const controller = require('../controllers/stockController');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

const router = express.Router();
router.use(authenticate);
router.get('/summary', authorize('stock.read'), controller.summary);
router.get('/items', authorize('stock.read'), controller.listItems);
router.get('/items/:skuId', authorize('stock.read'), controller.getItem);
router.get('/movement-types', authorize('stock.read'), controller.movementTypes);
router.get('/movements', authorize('stock.read'), controller.movements);
router.post('/items/:skuId/movements', authorize('stock.manage'), controller.createMovement);
router.post('/items/:skuId/count', authorize('stock.manage'), controller.count);
module.exports = router;
