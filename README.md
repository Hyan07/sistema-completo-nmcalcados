# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 15 — Pedidos e Reservas pelo Catálogo concluída.**

O sistema possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas, caixa, financeiro, dashboard, relatórios, catálogo público e agora pedidos online com reserva comercial controlada.

Pedido público não é venda e reserva não é baixa física. O estoque reservado é protegido contra outras saídas; a baixa `SALE` só ocorre ao finalizar a venda convertida.

## Execução local

```bash
npm install
cp .env.example .env
npm run db:check
npm run db:migrate
npm run auth:bootstrap-admin
npm test
npm run dev
```

No Windows: `Copy-Item .env.example .env`.

## Módulos disponíveis

- Catálogo público: `/catalog/`
- Pedidos do catálogo: `/pages/catalog-orders.html`
- Dashboard: `/pages/dashboard.html`
- Relatórios: `/pages/reports.html`
- PDV: `/pages/pos.html`
- Caixa: `/pages/cash.html`
- Financeiro: `/pages/finance.html`
- Produtos: `/pages/products.html`
- Grade: `/pages/grade.html`
- Estoque: `/pages/stock.html`
- Clientes: `/pages/customers.html`
- Fornecedores: `/pages/suppliers.html`
- Compras: `/pages/purchases.html`
- Usuários: `/pages/users.html`

Documentação da fase: `docs/PEDIDOS_CATALOGO.md`.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 15 adiciona `018_catalog_orders_phase15.sql`, evoluindo pedidos públicos e criando `stock_reservations` para holds comerciais sem alteração de `stock_balances`.

## Próxima fase

**FASE 16 — Importação dos dados reais.**
