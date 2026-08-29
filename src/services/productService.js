'use strict';

const fs = require('fs/promises');
const path = require('path');
const { getPool } = require('../config/database');
const categoryRepository = require('../repositories/categoryRepository');
const brandRepository = require('../repositories/brandRepository');
const productRepository = require('../repositories/productRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { productImageUploadDir } = require('../middlewares/productImageUpload');
const { detectImageType } = require('../utils/imageSignature');
const { HttpError } = require('../utils/httpError');
const {
  normalizeProductInput,
  normalizeText,
  optionalId,
  parseBoolean,
  parsePagination,
  validateLength,
  validateProductBusinessRules
} = require('../utils/catalogValidation');

const mimeToDetected = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGES_PER_PRODUCT = 10;

function parseId(value, label = 'Produto') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_ID', `${label} inválido.`);
  return id;
}

function parseOptionalQueryBoolean(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new HttpError(400, 'INVALID_FILTER', `${label} inválido.`);
}

function currentToBusinessState(current) {
  return {
    categoryId: current.category_id ? Number(current.category_id) : null,
    brandId: current.brand_id ? Number(current.brand_id) : null,
    internalCode: current.internal_code,
    name: current.name,
    description: current.description,
    model: current.model,
    audience: current.audience,
    collectionName: current.collection_name,
    material: current.material,
    baseCostPrice: String(current.base_cost_price),
    baseSalePrice: String(current.base_sale_price),
    promotionalPrice: current.promotional_price === null ? null : String(current.promotional_price),
    isActive: Boolean(current.is_active),
    isFeatured: Boolean(current.is_featured),
    isCatalogVisible: Boolean(current.is_catalog_visible)
  };
}

function snapshot(current) {
  return currentToBusinessState(current);
}

async function validateReferences(data, connection, changedOnly = false) {
  if ((!changedOnly || Object.prototype.hasOwnProperty.call(data, 'categoryId')) && data.categoryId) {
    const category = await categoryRepository.findCategoryById(data.categoryId, connection);
    if (!category || !category.is_active) throw new HttpError(400, 'INVALID_CATEGORY', 'Categoria inexistente ou inativa.');
  }
  if ((!changedOnly || Object.prototype.hasOwnProperty.call(data, 'brandId')) && data.brandId) {
    const brand = await brandRepository.findBrandById(data.brandId, connection);
    if (!brand || !brand.is_active) throw new HttpError(400, 'INVALID_BRAND', 'Marca inexistente ou inativa.');
  }
}

async function listProducts(query = {}) {
  const pagination = parsePagination(query);
  const filters = {
    q: normalizeText(query.q).slice(0, 180),
    categoryId: optionalId(query.categoryId, 'Categoria'),
    brandId: optionalId(query.brandId, 'Marca'),
    isActive: parseOptionalQueryBoolean(query.isActive, 'Status'),
    isCatalogVisible: parseOptionalQueryBoolean(query.isCatalogVisible, 'Publicação')
  };
  const result = await productRepository.listProducts(filters, pagination);
  return {
    data: result.rows,
    pagination: { page: pagination.page, pageSize: pagination.pageSize, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / pagination.pageSize)) }
  };
}

async function getProduct(productId) {
  const id = parseId(productId);
  const product = await productRepository.findProductById(id);
  if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
  const images = await productRepository.listImages(id);
  return { ...product, images };
}

async function createProduct(input, actor) {
  const data = normalizeProductInput(input);
  validateProductBusinessRules(data);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await validateReferences(data, connection);
    const id = await productRepository.createProduct(data, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'PRODUCT_CREATED', entityType: 'PRODUCT', entityId: id, newData: data }, connection);
    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'PRODUCT_CODE_EXISTS', 'Já existe produto com este código interno.');
    throw error;
  } finally { connection.release(); }
}

async function updateProduct(productId, input, actor) {
  const id = parseId(productId);
  const changes = normalizeProductInput(input, { partial: true });
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await productRepository.findProductById(id, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
    await validateReferences(changes, connection, true);
    const merged = { ...currentToBusinessState(current), ...changes };
    if (merged.isActive === false) {
      changes.isCatalogVisible = false;
      changes.isFeatured = false;
      merged.isCatalogVisible = false;
      merged.isFeatured = false;
    }
    validateProductBusinessRules(merged);
    await productRepository.updateProduct(id, changes, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'PRODUCT_UPDATED', entityType: 'PRODUCT', entityId: id, previousData: snapshot(current), newData: changes }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'PRODUCT_CODE_EXISTS', 'Já existe produto com este código interno.');
    throw error;
  } finally { connection.release(); }
}

async function safeUnlink(filePath) {
  try { await fs.unlink(filePath); }
  catch (error) { if (error.code !== 'ENOENT') console.error('[NM Calçados] falha ao remover imagem:', error.message); }
}

async function cleanupUploadedFiles(files = []) {
  await Promise.all(files.map((file) => safeUnlink(file.path)));
}

async function addImages(productId, files, input, actor) {
  const id = parseId(productId);
  if (!Array.isArray(files) || files.length === 0) throw new HttpError(400, 'IMAGES_REQUIRED', 'Envie ao menos uma imagem.');
  const altText = input.altText ? validateLength(input.altText, 1, 255, 'Texto alternativo', { nullable: true }) : null;

  try {
    for (const file of files) {
      const detected = await detectImageType(file.path);
      if (!detected || detected !== mimeToDetected[file.mimetype]) throw new HttpError(400, 'INVALID_IMAGE_CONTENT', 'O conteúdo de uma das imagens não corresponde a JPEG, PNG ou WebP válido.');
    }
  } catch (error) {
    await cleanupUploadedFiles(files);
    throw error;
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const product = await productRepository.findProductById(id, connection, { forUpdate: true });
    if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
    const currentCount = await productRepository.countImages(id, connection);
    if (currentCount + files.length > MAX_IMAGES_PER_PRODUCT) throw new HttpError(409, 'PRODUCT_IMAGE_LIMIT', `Cada produto pode possuir no máximo ${MAX_IMAGES_PER_PRODUCT} imagens.`);
    let sortOrder = await productRepository.maxImageSortOrder(id, connection);
    let hasPrimary = await productRepository.hasPrimaryImage(id, connection);
    const imageIds = [];
    for (const file of files) {
      sortOrder += 10;
      const isPrimary = !hasPrimary;
      const imageId = await productRepository.insertImage({
        productId: id,
        filePath: `/media/products/${file.filename}`,
        altText: altText || product.name,
        sortOrder,
        isPrimary
      }, connection);
      imageIds.push(String(imageId));
      if (isPrimary) hasPrimary = true;
    }
    await createAuditLog({ userId: actor.id, actionCode: 'PRODUCT_IMAGES_ADDED', entityType: 'PRODUCT', entityId: id, newData: { imageIds, count: files.length } }, connection);
    await connection.commit();
    return productRepository.listImages(id);
  } catch (error) {
    await connection.rollback();
    await cleanupUploadedFiles(files);
    throw error;
  } finally { connection.release(); }
}

async function updateImage(productId, imageId, input, actor) {
  const product = parseId(productId);
  const image = parseId(imageId, 'Imagem');
  const changes = {};
  if (Object.prototype.hasOwnProperty.call(input, 'altText')) {
    const text = String(input.altText ?? '').trim();
    if (text.length > 255) throw new HttpError(400, 'INVALID_ALT_TEXT', 'Texto alternativo excede 255 caracteres.');
    changes.altText = text || null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'sortOrder')) {
    const order = Number(input.sortOrder);
    if (!Number.isSafeInteger(order) || order < 0 || order > 100000) throw new HttpError(400, 'INVALID_SORT_ORDER', 'Ordem da imagem inválida.');
    changes.sortOrder = order;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'isPrimary')) changes.isPrimary = parseBoolean(input.isPrimary, 'isPrimary');
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await productRepository.getImageById(product, image, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'IMAGE_NOT_FOUND', 'Imagem não encontrada.');
    if (changes.isPrimary === false && current.is_primary) throw new HttpError(409, 'PRIMARY_IMAGE_REQUIRED', 'Defina outra imagem como principal em vez de remover diretamente a principal.');
    if (changes.isPrimary === true) await productRepository.clearPrimaryImage(product, connection);
    await productRepository.updateImage(product, image, changes, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'PRODUCT_IMAGE_UPDATED', entityType: 'PRODUCT_IMAGE', entityId: image, previousData: current, newData: changes }, connection);
    await connection.commit();
    return productRepository.listImages(product);
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function removeImage(productId, imageId, actor) {
  const product = parseId(productId);
  const image = parseId(imageId, 'Imagem');
  const connection = await getPool().getConnection();
  let filePath = null;
  try {
    await connection.beginTransaction();
    const current = await productRepository.getImageById(product, image, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'IMAGE_NOT_FOUND', 'Imagem não encontrada.');
    filePath = path.join(productImageUploadDir, path.basename(current.file_path));
    await productRepository.deleteImage(product, image, connection);
    if (current.is_primary) await productRepository.promoteFirstImage(product, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'PRODUCT_IMAGE_REMOVED', entityType: 'PRODUCT_IMAGE', entityId: image, previousData: current }, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  if (filePath) await safeUnlink(filePath);
}

module.exports = { addImages, createProduct, getProduct, listProducts, removeImage, updateImage, updateProduct };
