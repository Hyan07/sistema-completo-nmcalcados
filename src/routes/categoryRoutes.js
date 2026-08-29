'use strict';

const express = require('express');
const controller = require('../controllers/categoryController');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

const router = express.Router();
router.use(authenticate);
router.get('/', authorize('products.read'), controller.list);
router.post('/', authorize('products.manage'), controller.create);
router.patch('/:id', authorize('products.manage'), controller.update);
module.exports = router;
