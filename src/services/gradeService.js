'use strict';

const { getPool } = require('../config/database');
const productRepository = require('../repositories/productRepository');
const colorRepository = require('../repositories/colorRepository');
const sizeRepository = require('../repositories/sizeRepository');
const variantRepository = require('../repositories/variantRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const {
  normalizeSkuInput,
  normalizeVariantInput,
  parsePositiveId,
  validateEffectiveSkuPrices
} = require('../utils/gradeValidation');

function skuSnapshot(sku) {
  return {
    sizeId: String(sku.size_id), sku: sku.sku, barcode: sku.barcode,
    costPrice: sku.cost_price === null ? null : String(sku.cost_price),
    salePrice: sku.sale_price === null ? null : String(sku.sale_price),
    promotionalPrice: sku.promotional_price === null ? null : String(sku.promotional_price),
    minimumStock: Number(sku.minimum_stock), isActive: Boolean(sku.is_active)
  };
}

async function requireProduct(productId, connection = null, { forUpdate = false } = {}) {
  const id = parsePositiveId(productId, 'Produto');
  const product = await productRepository.findProductById(id, connection, { forUpdate });
  if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
  return product;
}

async function getGrade(productId) {
  const product = await requireProduct(productId);
  const [variants, images] = await Promise.all([variantRepository.listGrade(product.id), productRepository.listImages(product.id)]);
  return { product, variants, images };
}

async function createVariant(productId, input, actor) {
  const id = parsePositiveId(productId, 'Produto');
  const data = normalizeVariantInput(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const product = await requireProduct(id, connection, { forUpdate: true });
    const color = await colorRepository.findColorById(data.colorId, connection);
    if (!color || !color.is_active) throw new HttpError(400, 'INVALID_COLOR', 'Cor inexistente ou inativa.');
    const variantId = await variantRepository.createVariant(id, data, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'PRODUCT_VARIANT_CREATED', entityType: 'PRODUCT_VARIANT', entityId: variantId, newData: { productId: String(product.id), ...data } }, connection);
    await connection.commit();
    return variantId;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'VARIANT_COLOR_EXISTS', 'Este produto já possui uma variante para a cor informada.');
    throw error;
  } finally { connection.release(); }
}

async function updateVariant(productId, variantId, input, actor) {
  const product = parsePositiveId(productId, 'Produto');
  const variant = parsePositiveId(variantId, 'Variante');
  const changes = normalizeVariantInput(input, { partial: true });
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await requireProduct(product, connection, { forUpdate: true });
    const current = await variantRepository.findVariantById(product, variant, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'VARIANT_NOT_FOUND', 'Variante não encontrada.');
    if (changes.colorId !== undefined) {
      const color = await colorRepository.findColorById(changes.colorId, connection);
      if (!color || !color.is_active) throw new HttpError(400, 'INVALID_COLOR', 'Cor inexistente ou inativa.');
    }
    await variantRepository.updateVariant(variant, changes, connection);
    if (changes.isActive === false && current.is_active) await variantRepository.deactivateSkusByVariant(variant, connection);
    await createAuditLog({
      userId: actor.id, actionCode: 'PRODUCT_VARIANT_UPDATED', entityType: 'PRODUCT_VARIANT', entityId: variant,
      previousData: { colorId: String(current.color_id), variantName: current.variant_name, isActive: Boolean(current.is_active) }, newData: changes
    }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'VARIANT_COLOR_EXISTS', 'Este produto já possui uma variante para a cor informada.');
    throw error;
  } finally { connection.release(); }
}

async function createSkus(productId, variantId, input, actor) {
  const productIdNumber = parsePositiveId(productId, 'Produto');
  const variantIdNumber = parsePositiveId(variantId, 'Variante');
  const items = Array.isArray(input.items) ? input.items : [input];
  if (items.length < 1 || items.length > 50) throw new HttpError(400, 'INVALID_SKU_BATCH', 'Informe entre 1 e 50 SKUs por operação.');
  const normalized = items.map((item) => normalizeSkuInput(item));
  const sizeIds = normalized.map((item) => item.sizeId);
  if (new Set(sizeIds).size !== sizeIds.length) throw new HttpError(400, 'DUPLICATE_SIZE_IN_BATCH', 'O mesmo tamanho não pode aparecer duas vezes na mesma grade.');
  const skuCodes = normalized.map((item) => item.sku);
  if (new Set(skuCodes).size !== skuCodes.length) throw new HttpError(400, 'DUPLICATE_SKU_IN_BATCH', 'O mesmo SKU não pode aparecer duas vezes na operação.');
  const barcodes = normalized.map((item) => item.barcode).filter(Boolean);
  if (new Set(barcodes).size !== barcodes.length) throw new HttpError(400, 'DUPLICATE_BARCODE_IN_BATCH', 'O mesmo código de barras não pode aparecer duas vezes na operação.');

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const product = await requireProduct(productIdNumber, connection, { forUpdate: true });
    const variant = await variantRepository.findVariantById(productIdNumber, variantIdNumber, connection, { forUpdate: true });
    if (!variant) throw new HttpError(404, 'VARIANT_NOT_FOUND', 'Variante não encontrada.');
    if (!variant.is_active) throw new HttpError(409, 'VARIANT_INACTIVE', 'Ative a variante antes de cadastrar SKUs.');
    const createdIds = [];
    for (const data of normalized) {
      const size = await sizeRepository.findSizeById(data.sizeId, connection);
      if (!size || !size.is_active) throw new HttpError(400, 'INVALID_SIZE', `Tamanho ${data.sizeId} inexistente ou inativo.`);
      validateEffectiveSkuPrices(data, product);
      const skuId = await variantRepository.createSku(variantIdNumber, data, connection);
      createdIds.push(String(skuId));
    }
    await createAuditLog({
      userId: actor.id, actionCode: 'PRODUCT_SKUS_CREATED', entityType: 'PRODUCT_VARIANT', entityId: variantIdNumber,
      newData: { productId: String(productIdNumber), skuIds: createdIds, count: createdIds.length }
    }, connection);
    await connection.commit();
    return createdIds;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'SKU_CONFLICT', 'Já existe SKU, código de barras ou tamanho repetido nesta variante.');
    throw error;
  } finally { connection.release(); }
}

async function updateSku(productId, variantId, skuId, input, actor) {
  const product = parsePositiveId(productId, 'Produto');
  const variant = parsePositiveId(variantId, 'Variante');
  const sku = parsePositiveId(skuId, 'SKU');
  const changes = normalizeSkuInput(input, { partial: true });
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const productRow = await requireProduct(product, connection, { forUpdate: true });
    const variantRow = await variantRepository.findVariantById(product, variant, connection, { forUpdate: true });
    if (!variantRow) throw new HttpError(404, 'VARIANT_NOT_FOUND', 'Variante não encontrada.');
    const current = await variantRepository.findSkuById(variant, sku, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'SKU_NOT_FOUND', 'SKU não encontrado.');
    if (changes.sizeId !== undefined) {
      const size = await sizeRepository.findSizeById(changes.sizeId, connection);
      if (!size || !size.is_active) throw new HttpError(400, 'INVALID_SIZE', 'Tamanho inexistente ou inativo.');
    }
    if (changes.isActive === true && !variantRow.is_active) throw new HttpError(409, 'VARIANT_INACTIVE', 'Não é possível ativar SKU de uma variante inativa.');
    const merged = {
      sizeId: changes.sizeId ?? Number(current.size_id),
      sku: changes.sku ?? current.sku,
      barcode: Object.prototype.hasOwnProperty.call(changes, 'barcode') ? changes.barcode : current.barcode,
      costPrice: Object.prototype.hasOwnProperty.call(changes, 'costPrice') ? changes.costPrice : (current.cost_price === null ? null : String(current.cost_price)),
      salePrice: Object.prototype.hasOwnProperty.call(changes, 'salePrice') ? changes.salePrice : (current.sale_price === null ? null : String(current.sale_price)),
      promotionalPrice: Object.prototype.hasOwnProperty.call(changes, 'promotionalPrice') ? changes.promotionalPrice : (current.promotional_price === null ? null : String(current.promotional_price)),
      minimumStock: changes.minimumStock ?? Number(current.minimum_stock),
      isActive: changes.isActive ?? Boolean(current.is_active)
    };
    validateEffectiveSkuPrices(merged, productRow);
    await variantRepository.updateSku(sku, changes, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'PRODUCT_SKU_UPDATED', entityType: 'PRODUCT_SKU', entityId: sku, previousData: skuSnapshot(current), newData: changes }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'SKU_CONFLICT', 'Já existe SKU, código de barras ou tamanho repetido nesta variante.');
    throw error;
  } finally { connection.release(); }
}

async function assignImageVariant(productId, imageId, input, actor) {
  const product = parsePositiveId(productId, 'Produto');
  const image = parsePositiveId(imageId, 'Imagem');
  const rawVariantId = input.variantId;
  const targetVariantId = rawVariantId === null || rawVariantId === undefined || rawVariantId === '' ? null : parsePositiveId(rawVariantId, 'Variante');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await requireProduct(product, connection, { forUpdate: true });
    const current = await variantRepository.findProductImageById(product, image, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'IMAGE_NOT_FOUND', 'Imagem não encontrada para este produto.');
    if (targetVariantId !== null) {
      const variant = await variantRepository.findVariantById(product, targetVariantId, connection);
      if (!variant) throw new HttpError(404, 'VARIANT_NOT_FOUND', 'Variante não encontrada.');
    }
    await variantRepository.assignImageVariant(image, targetVariantId, connection);
    await createAuditLog({
      userId: actor.id, actionCode: 'PRODUCT_IMAGE_VARIANT_CHANGED', entityType: 'PRODUCT_IMAGE', entityId: image,
      previousData: { productVariantId: current.product_variant_id ? String(current.product_variant_id) : null },
      newData: { productVariantId: targetVariantId ? String(targetVariantId) : null }
    }, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = { assignImageVariant, createSkus, createVariant, getGrade, updateSku, updateVariant };
