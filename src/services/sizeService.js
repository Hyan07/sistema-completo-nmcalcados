'use strict';

const { getPool } = require('../config/database');
const sizeRepository = require('../repositories/sizeRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeSizeInput, parsePositiveId } = require('../utils/gradeValidation');

async function listSizes() { return sizeRepository.listSizes(); }

async function createSize(input, actor) {
  const data = normalizeSizeInput(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const id = await sizeRepository.createSize(data, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'SIZE_CREATED', entityType: 'SIZE', entityId: id, newData: data }, connection);
    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'SIZE_EXISTS', 'Já existe esse tamanho cadastrado.');
    throw error;
  } finally { connection.release(); }
}

async function updateSize(sizeId, input, actor) {
  const id = parsePositiveId(sizeId, 'Tamanho');
  const changes = normalizeSizeInput(input, { partial: true });
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await sizeRepository.findSizeById(id, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'SIZE_NOT_FOUND', 'Tamanho não encontrado.');
    if (changes.isActive === false && current.is_active && await sizeRepository.countActiveSkus(id, connection) > 0) {
      throw new HttpError(409, 'SIZE_IN_USE', 'Não é possível desativar um tamanho usado por SKUs ativos.');
    }
    await sizeRepository.updateSize(id, changes, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'SIZE_UPDATED', entityType: 'SIZE', entityId: id, previousData: current, newData: changes }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'SIZE_EXISTS', 'Já existe esse tamanho cadastrado.');
    throw error;
  } finally { connection.release(); }
}

module.exports = { createSize, listSizes, updateSize };
