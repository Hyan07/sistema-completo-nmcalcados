# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 9 — PDV e vendas concluída.**

Já existem autenticação e permissões, auditoria, produtos, grade por cor/tamanho/SKU, estoque transacional, clientes, fornecedores, compras/recebimentos e PDV com venda em rascunho, finalização e cancelamento integrado ao estoque.

A venda mantém separação rigorosa entre operação comercial e financeiro: rascunho não baixa estoque; finalizar gera `SALE` por item dentro da mesma transação; cancelar venda concluída e ainda sem vínculos financeiros gera `SALE_CANCEL`. Pagamentos e caixa serão implementados na FASE 10.

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

## Módulos disponíveis

- Produtos: `/pages/products.html`
- Grade: `/pages/grade.html`
- Estoque: `/pages/stock.html`
- Clientes: `/pages/customers.html`
- Fornecedores: `/pages/suppliers.html`
- Compras: `/pages/purchases.html`
- PDV/Vendas: `/pages/pos.html`
- Usuários: `/pages/users.html`

A FASE 9 adiciona `012_sales_phase9.sql`, permissões `sales.read` e `sales.discount`, trilha de finalização/cancelamento idempotente e itens de venda com cancelamento lógico em rascunho.

## Próxima fase

**FASE 10 — Caixa e formas de pagamento.**
