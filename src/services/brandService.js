'use strict';

const { getPool } = require('../config/database');
const brandRepository = require('../repositories/brandRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeText, parseBoolean, slugify, validateLength } = require('../utils/catalogValidation');

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_BRAND_ID', 'Marca inválida.');
  return id;
}

async function uniqueSlug(name, excludeId = null, connection = null) {
  const base = slugify(name);
  if (!base) throw new HttpError(400, 'INVALID_BRAND_NAME', 'Nome da marca inválido.');
  let candidate = base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    if (!(await brandRepository.findBrandBySlug(candidate, excludeId, connection))) return candidate;
    candidate = `${base.slice(0, 145)}-${suffix}`;
  }
  throw new HttpError(409, 'BRAND_SLUG_CONFLICT', 'Não foi possível gerar identificador único para a marca.');
}

async function listBrands(query = {}) {
  return brandRepository.listBrands(normalizeText(query.search).slice(0, 120));
}

async function createBrand(input, actor) {
  const name = validateLength(input.name, 2, 120, 'Nome');
  const isActive = input.isActive === undefined ? true : parseBoolean(input.isActive, 'isActive');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const slug = await uniqueSlug(name, null, connection);
    const id = await brandRepository.createBrand({ name, slug, isActive }, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'BRAND_CREATED', entityType: 'BRAND', entityId: id, newData: { name, slug, isActive } }, connection);
    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'BRAND_EXISTS', 'Já existe uma marca com este nome.');
    throw error;
  } finally { connection.release(); }
}

async function updateBrand(brandId, input, actor) {
  const id = parseId(brandId);
  const changes = {};
  if (Object.prototype.hasOwnProperty.call(input, 'name')) changes.name = validateLength(input.name, 2, 120, 'Nome');
  if (Object.prototype.hasOwnProperty.call(input, 'isActive')) changes.isActive = parseBoolean(input.isActive, 'isActive');
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await brandRepository.findBrandById(id, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'BRAND_NOT_FOUND', 'Marca não encontrada.');
    if (changes.name !== undefined) changes.slug = await uniqueSlug(changes.name, id, connection);
    if (changes.isActive === false && current.is_active && await brandRepository.countActiveProducts(id, connection)) {
      throw new HttpError(409, 'BRAND_HAS_ACTIVE_PRODUCTS', 'Desative ou mova os produtos ativos antes de desativar a marca.');
    }
    await brandRepository.updateBrand(id, changes, connection);
    await createAuditLog({
      userId: actor.id, actionCode: 'BRAND_UPDATED', entityType: 'BRAND', entityId: id,
      previousData: { name: current.name, slug: current.slug, isActive: Boolean(current.is_active) }, newData: changes
    }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'BRAND_EXISTS', 'Já existe uma marca com este nome.');
    throw error;
  } finally { connection.release(); }
}

module.exports = { createBrand, listBrands, updateBrand };
