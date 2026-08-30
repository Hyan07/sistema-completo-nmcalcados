'use strict';
const dashboardService = require('../services/dashboardService');
async function get(req,res,next){try{res.json({data:await dashboardService.getDashboard(req.query)});}catch(error){next(error);}}
module.exports={get};
