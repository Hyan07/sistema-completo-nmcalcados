'use strict';

const { getPool } = require('../config/database');
const categoryRepository = require('../repositories/categoryRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeText, optionalId, parseBoolean, slugify, validateLength } = require('../utils/catalogValidation');

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_CATEGORY_ID', 'Categoria inválida.');
  return id;
}

async function uniqueSlug(name, excludeId = null, connection = null) {
  const base = slugify(name);
  if (!base) throw new HttpError(400, 'INVALID_CATEGORY_NAME', 'Nome da categoria inválido.');
  let candidate = base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    if (!(await categoryRepository.findCategoryBySlug(candidate, excludeId, connection))) return candidate;
    candidate = `${base.slice(0, 145)}-${suffix}`;
  }
  throw new HttpError(409, 'CATEGORY_SLUG_CONFLICT', 'Não foi possível gerar identificador único para a categoria.');
}

async function validateParent(parentId, categoryId, connection) {
  if (!parentId) return;
  if (categoryId && Number(parentId) === Number(categoryId)) throw new HttpError(400, 'CATEGORY_CYCLE', 'Categoria não pode ser pai de si mesma.');
  const parent = await categoryRepository.findCategoryById(parentId, connection);
  if (!parent || !parent.is_active) throw new HttpError(400, 'INVALID_PARENT_CATEGORY', 'Categoria pai inexistente ou inativa.');
  if (categoryId && await categoryRepository.isDescendant(parentId, categoryId, connection)) throw new HttpError(400, 'CATEGORY_CYCLE', 'A hierarquia informada criaria um ciclo de categorias.');
}

async function listCategories(query = {}) {
  const search = normalizeText(query.search).slice(0, 120);
  return categoryRepository.listCategories(search);
}

async function createCategory(input, actor) {
  const name = validateLength(input.name, 2, 120, 'Nome');
  const parentId = optionalId(input.parentId, 'Categoria pai');
  const isActive = input.isActive === undefined ? true : parseBoolean(input.isActive, 'isActive');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await validateParent(parentId, null, connection);
    const slug = await uniqueSlug(name, null, connection);
    const id = await categoryRepository.createCategory({ name, parentId, slug, isActive }, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'CATEGORY_CREATED', entityType: 'CATEGORY', entityId: id, newData: { name, parentId, slug, isActive } }, connection);
    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function updateCategory(categoryId, input, actor) {
  const id = parseId(categoryId);
  const changes = {};
  if (Object.prototype.hasOwnProperty.call(input, 'name')) changes.name = validateLength(input.name, 2, 120, 'Nome');
  if (Object.prototype.hasOwnProperty.call(input, 'parentId')) changes.parentId = optionalId(input.parentId, 'Categoria pai');
  if (Object.prototype.hasOwnProperty.call(input, 'isActive')) changes.isActive = parseBoolean(input.isActive, 'isActive');
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await categoryRepository.findCategoryById(id, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'Categoria não encontrada.');
    if (changes.parentId !== undefined) await validateParent(changes.parentId, id, connection);
    if (changes.name !== undefined) changes.slug = await uniqueSlug(changes.name, id, connection);
    if (changes.isActive === false && current.is_active) {
      if (await categoryRepository.countActiveProducts(id, connection)) throw new HttpError(409, 'CATEGORY_HAS_ACTIVE_PRODUCTS', 'Desative ou mova os produtos ativos antes de desativar a categoria.');
      if (await categoryRepository.countActiveChildren(id, connection)) throw new HttpError(409, 'CATEGORY_HAS_ACTIVE_CHILDREN', 'Desative ou mova as subcategorias ativas antes de desativar esta categoria.');
    }
    await categoryRepository.updateCategory(id, changes, connection);
    await createAuditLog({
      userId: actor.id, actionCode: 'CATEGORY_UPDATED', entityType: 'CATEGORY', entityId: id,
      previousData: { name: current.name, parentId: current.parent_id, slug: current.slug, isActive: Boolean(current.is_active) },
      newData: changes
    }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

module.exports = { createCategory, listCategories, updateCategory };
