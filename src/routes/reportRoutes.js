'use strict';
const express=require('express');
const controller=require('../controllers/reportController');
const{authenticate}=require('../middlewares/authenticate');
const{authorize}=require('../middlewares/authorize');
const router=express.Router();
router.use(authenticate);
router.get('/catalog',authorize('reports.read'),controller.catalog);
function report(path,key,domainPermission){router.get(path,authorize('reports.read'),authorize(domainPermission),controller.handle(key));}
report('/sales','sales','sales.read');
report('/products','products','products.read');
report('/stock','stock','stock.read');
report('/stock-movements','stock-movements','stock.read');
report('/purchases','purchases','purchases.read');
report('/customers','customers','customers.read');
report('/suppliers','suppliers','suppliers.read');
report('/cash','cash','cash.read');
report('/finance','finance','finance.read');
module.exports=router;
