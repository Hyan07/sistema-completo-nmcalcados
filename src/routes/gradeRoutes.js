'use strict';

const express = require('express');
const controller = require('../controllers/gradeController');
const { authorize } = require('../middlewares/authorize');

const router = express.Router({ mergeParams: true });
router.get('/', authorize('products.read'), controller.get);
router.post('/quick', authorize('products.manage'), controller.createQuickGrade);
router.patch('/images/:imageId/variant', authorize('products.manage'), controller.assignImageVariant);
router.post('/variants', authorize('products.manage'), controller.createVariant);
router.patch('/variants/:variantId', authorize('products.manage'), controller.updateVariant);
router.post('/variants/:variantId/skus', authorize('products.manage'), controller.createSkus);
router.patch('/variants/:variantId/skus/:skuId', authorize('products.manage'), controller.updateSku);
module.exports = router;
