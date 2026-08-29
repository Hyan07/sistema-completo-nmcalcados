'use strict';

const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

const router = express.Router();
router.use(authenticate);
router.get('/', authorize('users.read'), userController.list);
router.post('/', authorize('users.create'), userController.create);
router.patch('/:id/password', authorize('users.update'), userController.resetPassword);
router.patch('/:id', authorize('users.update'), userController.update);
router.get('/meta/roles', authorize('roles.read'), userController.roles);
router.get('/meta/permissions', authorize('permissions.read'), userController.permissions);
module.exports = router;
