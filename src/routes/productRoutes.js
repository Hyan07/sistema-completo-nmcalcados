'use strict';

const express = require('express');
const controller = require('../controllers/productController');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { uploadProductImages } = require('../middlewares/productImageUpload');

const router = express.Router();
router.use(authenticate);
router.get('/', authorize('products.read'), controller.list);
router.get('/:id', authorize('products.read'), controller.getById);
router.post('/', authorize('products.manage'), controller.create);
router.patch('/:id', authorize('products.manage'), controller.update);
router.post('/:id/images', authorize('products.manage'), uploadProductImages, controller.addImages);
router.patch('/:id/images/:imageId', authorize('products.manage'), controller.updateImage);
router.delete('/:id/images/:imageId', authorize('products.manage'), controller.removeImage);
module.exports = router;
