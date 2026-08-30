'use strict';

function money(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  return `${whole}.${(fraction + '00').slice(0, 2)}`;
}
function moneyToCents(value) {
  const normalized = money(value);
  if (normalized === null) return null;
  const [whole, fraction] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
}
function centsToMoney(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
function publicImageUrl(value) {
  const path = String(value ?? '').trim();
  return /^\/media\/products\/[A-Za-z0-9._-]+$/.test(path) ? path : null;
}
function mapCard(row) {
  return {
    id: Number(row.id), name: row.name, model: row.model, audience: row.audience,
    collectionName: row.collection_name, material: row.material, featured: Boolean(row.is_featured),
    category: row.category_name ? { name: row.category_name, slug: row.category_slug } : null,
    brand: row.brand_name ? { name: row.brand_name, slug: row.brand_slug } : null,
    image: publicImageUrl(row.primary_image),
    price: { from: money(row.price_from), to: money(row.price_to) },
    available: Boolean(row.has_stock)
  };
}
function groupVariants(rows) {
  const variants = new Map();
  for (const row of rows) {
    const id = Number(row.variant_id);
    if (!variants.has(id)) variants.set(id, { id, name: row.variant_name, color: { name: row.color_name, hex: row.hex_code }, sizes: [] });
    const regularPrice = money(row.regular_price);
    const currentPrice = money(row.current_price);
    const currentCents = moneyToCents(currentPrice);
    const regularCents = moneyToCents(regularPrice);
    variants.get(id).sizes.push({
      skuId: Number(row.sku_id), sizeId: Number(row.size_id), label: row.size_label,
      available: Boolean(row.is_available),
      price: { current: currentPrice, regular: regularPrice, onSale: currentCents !== null && regularCents !== null && currentCents < regularCents }
    });
  }
  return [...variants.values()];
}
function priceRangeFromRows(rows, fallback) {
  const values = rows.map((row) => moneyToCents(row.current_price)).filter((value) => value !== null);
  if (!values.length) return { from: money(fallback), to: money(fallback) };
  return { from: centsToMoney(Math.min(...values)), to: centsToMoney(Math.max(...values)) };
}

module.exports = { centsToMoney, groupVariants, mapCard, money, moneyToCents, priceRangeFromRows, publicImageUrl };
