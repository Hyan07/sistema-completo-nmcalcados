'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authenticate');
const { loginRateLimit } = require('../middlewares/loginRateLimit');

const router = express.Router();
router.post('/login', loginRateLimit, authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/password', authenticate, authController.changePassword);
module.exports = router;
