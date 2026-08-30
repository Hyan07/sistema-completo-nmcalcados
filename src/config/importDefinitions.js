'use strict';

const DEFINITIONS = {
  catalog: {
    code: 'CATALOG',
    label: 'Catálogo / produtos e grade',
    required: ['internal_code','name','color','size','sku','base_sale_price'],
    columns: [
      'internal_code','name','category','brand','description','model','audience','collection_name','material',
      'base_cost_price','base_sale_price','promotional_price','is_catalog_visible','color','color_hex','size',
      'size_sort_order','sku','barcode','cost_price','sale_price','sku_promotional_price','minimum_stock'
    ],
    example: ['TENIS-001','Tênis Exemplo','Tênis','Marca Exemplo','','Modelo X','Unissex','','','100,00','199,90','','sim','Preto','#000000','38','38','TENIS-001-PT-38','','100,00','199,90','','2']
  },
  customers: {
    code: 'CUSTOMERS',
    label: 'Clientes',
    required: ['name'],
    columns: ['name','document','phone','whatsapp','email','birth_date','postal_code','street','street_number','address_complement','neighborhood','city','state','notes','is_active'],
    example: ['Cliente Exemplo','','','','','','','','','','','','','','sim']
  },
  suppliers: {
    code: 'SUPPLIERS',
    label: 'Fornecedores',
    required: ['legal_name'],
    columns: ['legal_name','trade_name','document','contact_name','phone','whatsapp','email','postal_code','street','street_number','address_complement','neighborhood','city','state','notes','is_active'],
    example: ['Fornecedor Exemplo','','','','','','','','','','','','','','','sim']
  },
  opening_stock: {
    code: 'OPENING_STOCK',
    label: 'Saldo inicial de estoque',
    required: ['sku','quantity'],
    columns: ['sku','quantity','reason'],
    example: ['TENIS-001-PT-38','10','Saldo inicial da implantação']
  }
};

const HEADER_ALIASES = {
  codigo_interno: 'internal_code', codigo: 'internal_code', produto: 'name', nome: 'name', categoria: 'category', marca: 'brand',
  descricao: 'description', modelo: 'model', publico: 'audience', colecao: 'collection_name', material: 'material',
  preco_custo: 'base_cost_price', custo_base: 'base_cost_price', preco_venda: 'base_sale_price', venda_base: 'base_sale_price',
  preco_promocional: 'promotional_price', catalogo: 'is_catalog_visible', visivel_catalogo: 'is_catalog_visible',
  cor: 'color', cor_hex: 'color_hex', tamanho: 'size', ordem_tamanho: 'size_sort_order', codigo_barras: 'barcode',
  custo_sku: 'cost_price', venda_sku: 'sale_price', promocao_sku: 'sku_promotional_price', estoque_minimo: 'minimum_stock',
  cpf_cnpj: 'document', documento: 'document', telefone: 'phone', celular: 'whatsapp', nome_fantasia: 'trade_name',
  razao_social: 'legal_name', contato: 'contact_name', data_nascimento: 'birth_date', cep: 'postal_code',
  logradouro: 'street', numero: 'street_number', complemento: 'address_complement', bairro: 'neighborhood', cidade: 'city', uf: 'state',
  observacoes: 'notes', ativo: 'is_active', quantidade: 'quantity', motivo: 'reason'
};

function getDefinition(type) {
  return DEFINITIONS[String(type || '').trim().toLowerCase()] || null;
}

function templateCsv(type) {
  const def = getDefinition(type);
  if (!def) return null;
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return `\uFEFF${def.columns.map(escape).join(';')}\r\n${def.example.map(escape).join(';')}\r\n`;
}

module.exports = { DEFINITIONS, HEADER_ALIASES, getDefinition, templateCsv };
