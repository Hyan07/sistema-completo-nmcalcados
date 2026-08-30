'use strict';

const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const brandRoutes = require('./brandRoutes');
const colorRoutes = require('./colorRoutes');
const sizeRoutes = require('./sizeRoutes');
const productRoutes = require('./productRoutes');

const router = express.Router();
router.get('/health', (req, res) => { res.status(200).json({ status: 'ok', application: 'nm-calcados' }); });
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/colors', colorRoutes);
router.use('/sizes', sizeRoutes);
router.use('/products', productRoutes);
module.exports = router;
