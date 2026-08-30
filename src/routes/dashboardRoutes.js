'use strict';
const express=require('express');
const controller=require('../controllers/dashboardController');
const {authenticate}=require('../middlewares/authenticate');
const {authorize}=require('../middlewares/authorize');
const router=express.Router();
router.use(authenticate);
router.get('/',authorize('dashboard.read'),controller.get);
module.exports=router;
