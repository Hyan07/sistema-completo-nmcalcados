'use strict';

const express = require('express');
const controller = require('../controllers/healthController');

const router = express.Router();
router.get('/', controller.live);
router.get('/live', controller.live);
router.get('/ready', controller.ready);
module.exports = router;
