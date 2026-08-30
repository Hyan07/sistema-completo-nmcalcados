'use strict';

const repository = require('../repositories/publicCatalogRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeCatalogQuery, parseCatalogProductId } = require('../utils/publicCatalogValidation');
const { groupVariants, mapCard, priceRangeFromRows, publicImageUrl } = require('../utils/publicCatalogMapper');

async function getMetadata() {
  const data = await repository.listMetadata();
  return {
    categories: data.categories.map((row) => ({ name: row.name, slug: row.slug, productCount: Number(row.product_count) })),
    brands: data.brands.map((row) => ({ name: row.name, slug: row.slug, productCount: Number(row.product_count) })),
    audiences: data.audiences
  };
}
async function listProducts(query = {}) {
  const filters = normalizeCatalogQuery(query);
  const result = await repository.listProducts(filters);
  return {
    data: result.rows.map(mapCard),
    pagination: {
      page: filters.page, pageSize: filters.pageSize, total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / filters.pageSize))
    }
  };
}
async function getProduct(productId) {
  const id = parseCatalogProductId(productId);
  const product = await repository.findPublicProduct(id);
  if (!product) throw new HttpError(404, 'CATALOG_PRODUCT_NOT_FOUND', 'Produto não encontrado no catálogo.');
  const [images, skuRows] = await Promise.all([repository.listPublicImages(id), repository.listPublicSkus(id)]);
  const variants = groupVariants(skuRows);
  return {
    id: Number(product.id), name: product.name, description: product.description, model: product.model,
    audience: product.audience, collectionName: product.collection_name, material: product.material, featured: Boolean(product.is_featured),
    category: product.category_name ? { name: product.category_name, slug: product.category_slug } : null,
    brand: product.brand_name ? { name: product.brand_name, slug: product.brand_slug } : null,
    price: priceRangeFromRows(skuRows, product.promotional_price ?? product.base_sale_price),
    available: variants.some((variant) => variant.sizes.some((size) => size.available)),
    images: images.map((image) => ({ id: Number(image.id), variantId: image.product_variant_id ? Number(image.product_variant_id) : null, url: publicImageUrl(image.file_path), alt: image.alt_text || product.name, primary: Boolean(image.is_primary) })).filter((image) => image.url),
    variants
  };
}

module.exports = { getMetadata, getProduct, listProducts };
