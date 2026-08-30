'use strict';

const { getPool } = require('../config/database');
const colorRepository = require('../repositories/colorRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeColorInput, parsePositiveId } = require('../utils/gradeValidation');

async function listColors() { return colorRepository.listColors(); }

async function createColor(input, actor) {
  const data = normalizeColorInput(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const id = await colorRepository.createColor(data, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'COLOR_CREATED', entityType: 'COLOR', entityId: id, newData: data }, connection);
    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'COLOR_EXISTS', 'Já existe uma cor com esse nome.');
    throw error;
  } finally { connection.release(); }
}

async function updateColor(colorId, input, actor) {
  const id = parsePositiveId(colorId, 'Cor');
  const changes = normalizeColorInput(input, { partial: true });
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await colorRepository.findColorById(id, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'COLOR_NOT_FOUND', 'Cor não encontrada.');
    if (changes.isActive === false && current.is_active && await colorRepository.countActiveVariants(id, connection) > 0) {
      throw new HttpError(409, 'COLOR_IN_USE', 'Não é possível desativar uma cor usada por variantes ativas.');
    }
    await colorRepository.updateColor(id, changes, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'COLOR_UPDATED', entityType: 'COLOR', entityId: id, previousData: current, newData: changes }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'COLOR_EXISTS', 'Já existe uma cor com esse nome.');
    throw error;
  } finally { connection.release(); }
}

module.exports = { createColor, listColors, updateColor };
