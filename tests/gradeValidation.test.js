'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeColorInput,
  normalizeSizeInput,
  normalizeSkuInput,
  normalizeVariantInput,
  validateEffectiveSkuPrices
} = require('../src/utils/gradeValidation');

test('normaliza cor e hexadecimal', () => {
  assert.deepEqual(normalizeColorInput({ name: ' Preto ', hexCode: '#0a0b0c' }), { name: 'Preto', hexCode: '#0A0B0C', isActive: true });
  assert.throws(() => normalizeColorInput({ name: 'Preto', hexCode: '000000' }), /#RRGGBB/);
});

test('normaliza tamanho e ordem', () => {
  assert.deepEqual(normalizeSizeInput({ label: ' 38 ', sortOrder: '38' }), { label: '38', sortOrder: 38, isActive: true });
  assert.throws(() => normalizeSizeInput({ label: '', sortOrder: 0 }), /Tamanho/);
});

test('normaliza variante', () => {
  assert.deepEqual(normalizeVariantInput({ colorId: '2', variantName: ' Preto fosco ' }), { colorId: 2, variantName: 'Preto fosco', isActive: true });
});

test('normaliza SKU, barcode e preços opcionais', () => {
  assert.deepEqual(normalizeSkuInput({ sizeId: '4', sku: ' urban-preto-38 ', barcode: '', costPrice: '', salePrice: '129.90', promotionalPrice: '', minimumStock: '2' }), {
    sizeId: 4,
    sku: 'URBAN-PRETO-38',
    barcode: null,
    costPrice: null,
    salePrice: '129.90',
    promotionalPrice: null,
    minimumStock: 2,
    isActive: true
  });
});

test('rejeita SKU com espaços ou caracteres fora do padrão', () => {
  assert.throws(() => normalizeSkuInput({ sizeId: 1, sku: 'SKU 38' }), /SKU deve/);
});

test('preço promocional respeita preço específico do SKU', () => {
  assert.doesNotThrow(() => validateEffectiveSkuPrices({ salePrice: '100.00', promotionalPrice: '90.00' }, { base_sale_price: '120.00' }));
  assert.throws(() => validateEffectiveSkuPrices({ salePrice: '100.00', promotionalPrice: '101.00' }, { base_sale_price: '120.00' }), /não pode superar/);
});

test('preço promocional usa venda base quando SKU herda preço', () => {
  assert.doesNotThrow(() => validateEffectiveSkuPrices({ salePrice: null, promotionalPrice: '119.00' }, { base_sale_price: '120.00' }));
  assert.throws(() => validateEffectiveSkuPrices({ salePrice: null, promotionalPrice: '121.00' }, { base_sale_price: '120.00' }), /não pode superar/);
});
