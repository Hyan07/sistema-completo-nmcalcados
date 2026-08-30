'use strict';

const REPORT_DEFINITIONS = Object.freeze({
  sales: {
    key: 'sales', label: 'Vendas detalhadas', domainPermission: 'sales.read', dateBased: true,
    filters: ['q', 'dateFrom', 'dateTo', 'status'],
    columns: [
      ['sale_date','Data','date',1],['sale_number','Venda','text',1.1],['status','Status','text',0.9],['seller_name','Vendedor','text',1.2],
      ['customer_name','Cliente','text',1.3],['product_name','Produto','text',1.6],['sku','SKU','text',1.1],['variant','Grade','text',1.1],
      ['quantity','Qtd.','integer',0.6],['line_total','Total item','money',0.9],['unit_price','Unitário','money',0.8],['item_discount','Desc. item','money',0.8]
    ]
  },
  products: {
    key: 'products', label: 'Produtos e grade', domainPermission: 'products.read', dateBased: false,
    filters: ['q', 'isActive'],
    columns: [
      ['internal_code','Código','text',1],['product_name','Produto','text',1.8],['brand_name','Marca','text',1],['category_name','Categoria','text',1],
      ['model','Modelo','text',1],['sku_count','SKUs','integer',0.6],['stock_units','Estoque','integer',0.7],['base_cost_price','Custo base','money',0.8],
      ['base_sale_price','Venda base','money',0.8],['is_active','Ativo','boolean',0.6],['is_catalog_visible','Catálogo','boolean',0.7]
    ]
  },
  stock: {
    key: 'stock', label: 'Posição de estoque', domainPermission: 'stock.read', dateBased: false,
    filters: ['q', 'stockStatus'],
    columns: [
      ['sku','SKU','text',1.1],['product_name','Produto','text',1.7],['color_name','Cor','text',0.9],['size_label','Tam.','text',0.6],
      ['quantity','Saldo','integer',0.6],['minimum_stock','Mínimo','integer',0.6],['stock_status','Situação','text',1],['cost_price','Custo','money',0.8],
      ['sale_price','Venda','money',0.8],['inventory_cost','Custo estoque','money',0.9],['inventory_sale_value','Venda potencial','money',1]
    ]
  },
  'stock-movements': {
    key: 'stock-movements', label: 'Movimentações de estoque', domainPermission: 'stock.read', dateBased: true,
    filters: ['q', 'dateFrom', 'dateTo', 'movementType'],
    columns: [
      ['happened_at','Data/hora','datetime',1.1],['sku','SKU','text',1],['product_name','Produto','text',1.5],['grade','Grade','text',1],
      ['type_name','Movimento','text',1.2],['previous_quantity','Anterior','integer',0.6],['quantity_change','Variação','integer',0.6],['new_quantity','Novo','integer',0.6],
      ['user_name','Usuário','text',1],['reference','Referência','text',1],['reason','Motivo','text',1.6]
    ]
  },
  purchases: {
    key: 'purchases', label: 'Compras detalhadas', domainPermission: 'purchases.read', dateBased: true,
    filters: ['q', 'dateFrom', 'dateTo', 'status'],
    columns: [
      ['purchase_date','Data','date',0.9],['document_number','Documento','text',1],['supplier_name','Fornecedor','text',1.5],['status','Status','text',1],
      ['description','Item','text',1.6],['sku','SKU','text',1],['quantity_ordered','Pedido','integer',0.6],['quantity_received','Recebido','integer',0.7],
      ['quantity_pending','Pendente','integer',0.7],['line_total','Total item','money',0.9],['unit_cost','Custo unit.','money',0.8]
    ]
  },
  customers: {
    key: 'customers', label: 'Clientes', domainPermission: 'customers.read', dateBased: false,
    filters: ['q', 'isActive'],
    columns: [
      ['customer_name','Cliente','text',1.8],['document_masked','Documento','text',1],['phone','Telefone','text',1],['whatsapp','WhatsApp','text',1],
      ['email','E-mail','text',1.5],['city_state','Cidade/UF','text',1.2],['is_active','Ativo','boolean',0.6],['sale_count','Vendas','integer',0.6],
      ['total_spent','Total comprado','money',1],['last_sale_at','Última compra','datetime',1]
    ]
  },
  suppliers: {
    key: 'suppliers', label: 'Fornecedores', domainPermission: 'suppliers.read', dateBased: false,
    filters: ['q', 'isActive'],
    columns: [
      ['supplier_name','Fornecedor','text',1.8],['document_masked','Documento','text',1],['contact_name','Contato','text',1.1],['phone','Telefone','text',1],
      ['email','E-mail','text',1.4],['city_state','Cidade/UF','text',1.1],['is_active','Ativo','boolean',0.6],['purchase_count','Compras','integer',0.6],
      ['total_purchased','Total comprado','money',1],['last_purchase_date','Última compra','date',0.9]
    ]
  },
  cash: {
    key: 'cash', label: 'Caixa', domainPermission: 'cash.read', dateBased: true,
    filters: ['q', 'dateFrom', 'dateTo', 'status'],
    columns: [
      ['opened_at','Abertura','datetime',1.1],['register_code','Caixa','text',0.7],['register_name','Nome','text',1.1],['operator_name','Operador','text',1.1],
      ['status','Status','text',0.7],['opening_balance','Saldo inicial','money',0.8],['cash_in','Entradas','money',0.8],['cash_out','Saídas','money',0.8],
      ['expected_balance','Esperado','money',0.8],['declared_closing_balance','Declarado','money',0.8],['closing_difference','Diferença','money',0.8],['closed_at','Fechamento','datetime',1.1]
    ]
  },
  finance: {
    key: 'finance', label: 'Contas financeiras', domainPermission: 'finance.read', dateBased: true,
    filters: ['q', 'dateFrom', 'dateTo', 'status', 'financeType'],
    columns: [
      ['record_type','Tipo','text',0.8],['due_date','Vencimento','date',0.9],['status','Status','text',0.8],['source_type','Origem','text',0.8],
      ['description','Descrição','text',1.8],['counterparty_name','Contraparte','text',1.4],['category_name','Categoria','text',1.2],
      ['original_amount','Original','money',0.9],['outstanding_amount','Em aberto','money',0.9],['is_overdue','Vencida','boolean',0.6]
    ]
  }
});

function definition(key) { return REPORT_DEFINITIONS[key] || null; }
function publicDefinition(item) {
  return { key:item.key,label:item.label,filters:item.filters,columns:item.columns.map(([key,label,type])=>({key,label,type})) };
}
module.exports={REPORT_DEFINITIONS,definition,publicDefinition};
