'use strict';

const { getPool } = require('../config/database');
const productRepository = require('../repositories/productRepository');
const colorRepository = require('../repositories/colorRepository');
const sizeRepository = require('../repositories/sizeRepository');
const variantRepository = require('../repositories/variantRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { parsePositiveId } = require('../utils/gradeValidation');

function normalizeSizeIds(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new HttpError(400, 'INVALID_QUICK_GRADE_SIZES', 'Selecione de 1 a 50 tamanhos.');
  }

  const sizeIds = value.map((item) => parsePositiveId(item, 'Tamanho'));
  if (new Set(sizeIds).size !== sizeIds.length) {
    throw new HttpError(400, 'DUPLICATE_QUICK_GRADE_SIZE', 'O mesmo tamanho foi informado mais de uma vez.');
  }
  return sizeIds;
}

function generatedSku(productId, variantId, sizeId) {
  return `NM-${productId}-${variantId}-${sizeId}`;
}

async function createQuickGrade(productId, input, actor) {
  const product = parsePositiveId(productId, 'Produto');
  const colorId = parsePositiveId(input?.colorId, 'Cor');
  const sizeIds = normalizeSizeIds(input?.sizeIds);
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const productRow = await productRepository.findProductById(product, connection, { forUpdate: true });
    if (!productRow || !productRow.is_active) {
      throw new HttpError(404, 'PRODUCT_NOT_AVAILABLE', 'Produto não encontrado ou inativo.');
    }

    const color = await colorRepository.findColorById(colorId, connection);
    if (!color || !color.is_active) {
      throw new HttpError(400, 'INVALID_COLOR', 'Cor inexistente ou inativa.');
    }

    let variant = await variantRepository.findVariantByColor(product, colorId, connection, { forUpdate: true });
    let variantCreated = false;

    if (!variant) {
      const variantId = await variantRepository.createVariant(product, {
        colorId,
        variantName: null,
        isActive: true
      }, connection);
      variant = await variantRepository.findVariantById(product, variantId, connection, { forUpdate: true });
      variantCreated = true;
    } else if (!variant.is_active) {
      await variantRepository.updateVariant(variant.id, { isActive: true }, connection);
      variant.is_active = 1;
    }

    const createdSkuIds = [];
    const reactivatedSkuIds = [];
    const existingSkuIds = [];

    for (const sizeId of sizeIds) {
      const size = await sizeRepository.findSizeById(sizeId, connection);
      if (!size || !size.is_active) {
        throw new HttpError(400, 'INVALID_SIZE', `Tamanho ${sizeId} inexistente ou inativo.`);
      }

      const existingSku = await variantRepository.findSkuBySize(variant.id, sizeId, connection, { forUpdate: true });
      if (existingSku) {
        if (!existingSku.is_active) {
          await variantRepository.updateSku(existingSku.id, { isActive: true }, connection);
          reactivatedSkuIds.push(String(existingSku.id));
        } else {
          existingSkuIds.push(String(existingSku.id));
        }
        continue;
      }

      const skuId = await variantRepository.createSku(variant.id, {
        sizeId,
        sku: generatedSku(product, variant.id, sizeId),
        barcode: null,
        costPrice: null,
        salePrice: null,
        promotionalPrice: null,
        minimumStock: 0,
        isActive: true
      }, connection);
      createdSkuIds.push(String(skuId));
    }

    await createAuditLog({
      userId: actor.id,
      actionCode: 'PRODUCT_QUICK_GRADE_CREATED',
      entityType: 'PRODUCT_VARIANT',
      entityId: variant.id,
      newData: {
        productId: String(product),
        colorId: String(colorId),
        variantCreated,
        createdSkuIds,
        reactivatedSkuIds,
        existingSkuIds
      }
    }, connection);

    await connection.commit();
    return {
      variantId: String(variant.id),
      created: createdSkuIds.length,
      reactivated: reactivatedSkuIds.length,
      alreadyExisting: existingSkuIds.length
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'QUICK_GRADE_CONFLICT', 'A grade informada já possui um código conflitante. Atualize a tela e tente novamente.');
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { createQuickGrade };
