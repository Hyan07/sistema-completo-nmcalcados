'use strict';
const service = require('../services/publicCatalogService');
function cache(res){res.setHeader('Cache-Control','public, max-age=20, stale-while-revalidate=40');}
async function metadata(req,res,next){try{cache(res);res.json({data:await service.getMetadata()});}catch(e){next(e);}}
async function products(req,res,next){try{cache(res);res.json(await service.listProducts(req.query));}catch(e){next(e);}}
async function product(req,res,next){try{cache(res);res.json({data:await service.getProduct(req.params.id)});}catch(e){next(e);}}
module.exports={metadata,product,products};
