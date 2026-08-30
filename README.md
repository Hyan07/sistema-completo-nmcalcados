# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 17 — Auditoria Completa do Sistema concluída.**

O sistema possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas, caixa, financeiro, dashboard, relatórios, catálogo público, pedidos/reservas e importação controlada de dados reais.

A FASE 17 endurece invariantes entre módulos, corrige o consumo de reservas por movimento exato, reforça idempotência financeira e adiciona auditoria read-only de integridade.

## Execução local

```bash
npm install
cp .env.example .env
npm run db:check
npm run audit:integrity
npm run db:migrate
npm test
npm run audit:integrity
npm run dev
```

No Windows: `Copy-Item .env.example .env`.

## Auditoria de integridade

```bash
npm run audit:integrity
```

O comando não altera dados. Ele falha quando encontra inconsistências críticas entre saldo/ledger, reservas, compras, vendas, caixa, financeiro ou importações. Consulte `docs/AUDITORIA_SISTEMA.md`.

## Módulos disponíveis

- Catálogo público: `/catalog/`
- Pedidos do catálogo: `/pages/catalog-orders.html`
- Importações: `/pages/imports.html`
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

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 17 adiciona `020_integrity_audit_phase17.sql`, reforçando unicidade de caixa aberto, vínculo único de venda convertida e reserva ativa única por item.

## Próxima fase

**FASE 18 — Testes, segurança e revisão de fluxos.**
