'use strict';

const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();
router.get('/health', (req, res) => { res.status(200).json({ status: 'ok', application: 'nm-calcados' }); });
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
module.exports = router;
