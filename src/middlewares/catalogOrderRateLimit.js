'use strict';
const {HttpError}=require('../utils/httpError');
const buckets=new Map();
function limiter({windowMs,max,code}){return function(req,res,next){const key=`${code}:${req.ip||req.socket?.remoteAddress||'unknown'}`;const now=Date.now();let bucket=buckets.get(key);if(!bucket||now>=bucket.resetAt){bucket={count:0,resetAt:now+windowMs};buckets.set(key,bucket);}bucket.count+=1;res.set('X-RateLimit-Limit',String(max));res.set('X-RateLimit-Remaining',String(Math.max(0,max-bucket.count)));if(bucket.count>max)return next(new HttpError(429,code,'Muitas solicitações. Tente novamente mais tarde.'));if(buckets.size>5000)for(const[k,v]of buckets)if(now>=v.resetAt)buckets.delete(k);return next();};}
const catalogOrderCreateRateLimit=limiter({windowMs:10*60*1000,max:8,code:'CATALOG_ORDER_RATE_LIMIT'});
const catalogOrderTrackRateLimit=limiter({windowMs:60*1000,max:30,code:'CATALOG_TRACK_RATE_LIMIT'});
module.exports={catalogOrderCreateRateLimit,catalogOrderTrackRateLimit,limiter};
