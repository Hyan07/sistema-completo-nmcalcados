'use strict';

const { getPool } = require('../config/database');
const repository = require('../repositories/importRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { getDefinition, templateCsv } = require('../config/importDefinitions');
const { hashBuffer, normalizeImportType, normalizeOperationKey } = require('../utils/importValidation');
const { HttpError } = require('../utils/httpError');
const { parsePagination } = require('../utils/customerValidation');
const { inspectFile, validationSummary } = require('./importValidationService');
const { applyRows } = require('./importApplyService');

const ALLOWED_STATUS = new Set(['VALIDATED','INVALID','APPLIED','FAILED']);
function decodeJson(value, fallback = null) { if (value === null || value === undefined || value === '') return fallback; if (typeof value === 'object') return value; try { return JSON.parse(value); } catch (_) { return fallback; } }
function mapBatch(row) {
  if (!row) return null;
  return { id:Number(row.id),type:row.import_type,filename:row.original_filename,status:row.status,rowCount:Number(row.row_count||0),validRows:Number(row.valid_rows||0),invalidRows:Number(row.invalid_rows||0),fileHashPrefix:String(row.file_sha256||'').slice(0,12),validation:decodeJson(row.validation_errors,{errors:[],totalErrors:0,truncated:false}),result:decodeJson(row.result_summary,null),createdBy:row.created_by_name||null,appliedBy:row.applied_by_name||null,createdAt:row.created_at,validatedAt:row.validated_at,appliedAt:row.applied_at };
}
function fileOrThrow(file) { if (!file?.buffer) throw new HttpError(400,'IMPORT_FILE_REQUIRED','Selecione um arquivo CSV.'); if (!String(file.originalname||'').toLowerCase().endsWith('.csv')) throw new HttpError(400,'IMPORT_FILE_EXTENSION','Use um arquivo com extensão .csv.'); return file; }
async function list(query={}) {
  const pagination=parsePagination(query); const type=query.type?getDefinition(String(query.type).toLowerCase())?.code:null;
  if(query.type&&!type)throw new HttpError(400,'INVALID_IMPORT_TYPE','Tipo de importação inválido.'); const status=String(query.status||'').trim().toUpperCase()||null;
  if(status&&!ALLOWED_STATUS.has(status))throw new HttpError(400,'INVALID_IMPORT_STATUS','Status de importação inválido.'); const result=await repository.listBatches({...pagination,type,status});
  return{data:result.rows.map(mapBatch),pagination:{page:pagination.page,pageSize:pagination.pageSize,total:result.total,totalPages:Math.max(1,Math.ceil(result.total/pagination.pageSize))}};
}
async function get(batchId){const id=Number(batchId);if(!Number.isSafeInteger(id)||id<1)throw new HttpError(400,'INVALID_IMPORT_ID','Lote de importação inválido.');const row=await repository.findBatchById(id);if(!row)throw new HttpError(404,'IMPORT_BATCH_NOT_FOUND','Lote de importação não encontrado.');return mapBatch(row);}
async function template(type){const normalizedType=normalizeImportType(type);return{filename:`modelo_${normalizedType}.csv`,content:templateCsv(normalizedType)};}
async function validateUpload({type,file,operationKey},actor){
  type=normalizeImportType(type);file=fileOrThrow(file);const validationOperationKey=normalizeOperationKey(operationKey,'Chave de validação'),fileSha256=hashBuffer(file.buffer),importType=getDefinition(type).code;
  const existing=await repository.findBatchByValidationKey(validationOperationKey);if(existing){if(existing.import_type!==importType||existing.file_sha256!==fileSha256||Number(existing.created_by_user_id)!==Number(actor.id))throw new HttpError(409,'IMPORT_VALIDATION_KEY_REUSED','A chave de validação já foi usada com outro lote.');return{batch:mapBatch(existing),duplicate:true};}
  const inspected=await inspectFile(type,file),status=inspected.errors.length?'INVALID':'VALIDATED';let id;
  try{id=await repository.createBatch({importType,originalFilename:`${type}.csv`,fileSha256,status,validationOperationKey,rowCount:inspected.rowCount,validRows:inspected.validRows,invalidRows:inspected.invalidRows,validationErrors:validationSummary(inspected.errors),userId:actor.id});}
  catch(error){if(error.code==='ER_DUP_ENTRY'){const concurrent=await repository.findBatchByValidationKey(validationOperationKey);if(concurrent)return{batch:mapBatch(concurrent),duplicate:true};}throw error;}
  await createAuditLog({userId:actor.id,actionCode:'DATA_IMPORT_VALIDATED',entityType:'DATA_IMPORT_BATCH',entityId:id,newData:{importType,rowCount:inspected.rowCount,validRows:inspected.validRows,invalidRows:inspected.invalidRows,status}});
  return{batch:mapBatch(await repository.findBatchById(id)),duplicate:false};
}
async function apply(batchId,{file,operationKey,confirmation},actor){
  const id=Number(batchId);if(!Number.isSafeInteger(id)||id<1)throw new HttpError(400,'INVALID_IMPORT_ID','Lote de importação inválido.');file=fileOrThrow(file);
  if(String(confirmation||'').trim().toUpperCase()!=='IMPORTAR')throw new HttpError(400,'IMPORT_CONFIRMATION_REQUIRED','Confirme a operação digitando IMPORTAR.');
  const applyOperationKey=normalizeOperationKey(operationKey,'Chave de aplicação'),initialBatch=await repository.findBatchById(id);if(!initialBatch)throw new HttpError(404,'IMPORT_BATCH_NOT_FOUND','Lote de importação não encontrado.');
  const duplicate=await repository.findBatchByApplyKey(applyOperationKey);if(duplicate){if(Number(duplicate.id)!==id)throw new HttpError(409,'IMPORT_APPLY_KEY_REUSED','A chave de aplicação já pertence a outro lote.');return{batch:mapBatch(duplicate),duplicate:true};}
  if(initialBatch.status==='APPLIED')throw new HttpError(409,'IMPORT_ALREADY_APPLIED','Este lote já foi aplicado.');if(initialBatch.status==='INVALID')throw new HttpError(409,'IMPORT_NOT_VALID','Corrija o arquivo e faça uma nova validação antes de aplicar.');
  if(hashBuffer(file.buffer)!==initialBatch.file_sha256)throw new HttpError(409,'IMPORT_FILE_CHANGED','O arquivo enviado não é exatamente o mesmo que foi validado.');
  const type=String(initialBatch.import_type).toLowerCase(),connection=await getPool().getConnection();
  try{await connection.beginTransaction();const locked=await repository.findBatchForUpdate(id,connection);if(!locked)throw new HttpError(404,'IMPORT_BATCH_NOT_FOUND','Lote de importação não encontrado.');
    if(locked.status==='APPLIED'){if(locked.apply_operation_key===applyOperationKey){await connection.commit();return{batch:mapBatch(await repository.findBatchById(id)),duplicate:true};}throw new HttpError(409,'IMPORT_ALREADY_APPLIED','Este lote já foi aplicado.');}
    const inspected=await inspectFile(type,file,connection);if(inspected.errors.length)throw new HttpError(409,'IMPORT_CONTEXT_CHANGED',`A importação deixou de ser aplicável. Revise ${inspected.errors.length} erro(s) e faça nova validação.`);
    const resultSummary=await applyRows(type,inspected.rows,actor.id,applyOperationKey,connection);resultSummary.rowsApplied=inspected.rowCount;
    await repository.markBatchApplied(id,{applyOperationKey,resultSummary,userId:actor.id},connection);await createAuditLog({userId:actor.id,actionCode:'DATA_IMPORT_APPLIED',entityType:'DATA_IMPORT_BATCH',entityId:id,newData:{importType:locked.import_type,rowsApplied:inspected.rowCount,resultSummary}},connection);await connection.commit();return{batch:mapBatch(await repository.findBatchById(id)),duplicate:false};
  }catch(error){try{await connection.rollback();}catch(_){}try{await repository.markBatchFailed(id,error.code);}catch(_){}if(error.code==='ER_DUP_ENTRY')throw new HttpError(409,'IMPORT_CONCURRENT_CONFLICT','Outro cadastro foi criado durante a importação. Nenhuma linha deste lote foi aplicada. Valide novamente.');throw error;}finally{connection.release();}
}
module.exports={apply,get,list,mapBatch,template,validateUpload};
