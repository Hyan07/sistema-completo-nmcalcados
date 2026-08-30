'use strict';

const { HttpError } = require('./httpError');

const CATALOG_SORTS = new Set(['featured', 'newest', 'price_asc', 'price_desc', 'name']);
const AVAILABILITY = new Set(['all', 'available', 'unavailable']);

function text(value) { return String(value ?? '').trim(); }
function parsePositiveInt(value, label, { min = 1, max = Number.MAX_SAFE_INTEGER, defaultValue = null } = {}) {
  if ((value === undefined || value === null || value === '') && defaultValue !== null) return defaultValue;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new HttpError(400, 'INVALID_CATALOG_FILTER', `${label} inválido.`);
  }
  return number;
}
function normalizeSlug(value, label) {
  const slug = text(value).toLowerCase();
  if (!slug) return null;
  if (slug.length > 150 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new HttpError(400, 'INVALID_CATALOG_FILTER', `${label} inválido.`);
  }
  return slug;
}
function normalizeAudience(value) {
  const audience = text(value);
  if (!audience) return null;
  if (audience.length > 80) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Público inválido.');
  return audience;
}
function normalizeBoolean(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  throw new HttpError(400, 'INVALID_CATALOG_FILTER', `${label} inválido.`);
}
function normalizeCatalogQuery(query = {}) {
  const q = text(query.q);
  if (q.length > 100) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Pesquisa excede 100 caracteres.');
  const sort = text(query.sort || 'featured').toLowerCase();
  if (!CATALOG_SORTS.has(sort)) throw new HttpError(400, 'INVALID_CATALOG_SORT', 'Ordenação do catálogo inválida.');
  const availability = text(query.availability || 'all').toLowerCase();
  if (!AVAILABILITY.has(availability)) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Disponibilidade inválida.');
  const page = parsePositiveInt(query.page, 'Página', { defaultValue: 1 });
  const pageSize = parsePositiveInt(query.pageSize, 'Tamanho da página', { defaultValue: 12, max: 24 });
  return {
    q: q || null,
    categorySlug: normalizeSlug(query.category, 'Categoria'),
    brandSlug: normalizeSlug(query.brand, 'Marca'),
    audience: normalizeAudience(query.audience),
    featured: normalizeBoolean(query.featured, 'Destaque'),
    availability,
    sort,
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}
function parseCatalogProductId(value) {
  return parsePositiveInt(value, 'Produto');
}

module.exports = { CATALOG_SORTS, normalizeCatalogQuery, parseCatalogProductId };
