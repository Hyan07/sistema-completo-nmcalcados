'use strict';
const { getPool } = require('../config/database');
const { HttpError } = require('../utils/httpError');
async function protectCatalogConvertedSaleItems(req,res,next){
  try{
    const saleId=Number(req.params.id);
    if(!Number.isSafeInteger(saleId)||saleId<1)return next(new HttpError(400,'INVALID_SALE_ID','Venda inválida.'));
    const [rows]=await getPool().execute("SELECT id,status FROM catalog_orders WHERE converted_sale_id=? LIMIT 1",[saleId]);
    if(rows[0])return next(new HttpError(409,'CATALOG_SALE_ITEMS_LOCKED','Itens de venda originada de reserva do catálogo não podem ser incluídos, removidos ou ter quantidade alterada. Cancele o pedido/reserva e refaça a negociação.'));
    return next();
  }catch(error){return next(error);}
}
module.exports={protectCatalogConvertedSaleItems};
