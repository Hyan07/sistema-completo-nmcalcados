# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 12 — Dashboard concluída.**

O sistema possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas, caixa, financeiro completo e agora um dashboard executivo derivado das fontes transacionais.

O painel consolida faturamento, vendas, ticket médio, unidades, evolução diária, top produtos, mix de pagamento, estoque/ruptura, compras pendentes, posição financeira, fluxo líquido, caixas abertos e alertas operacionais sem duplicar saldos em tabelas auxiliares.

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

- Dashboard: `/pages/dashboard.html`
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

Documentação da fase: `docs/DASHBOARD.md`.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 12 adiciona `015_dashboard_phase12.sql`, criando apenas a permissão executiva `dashboard.read`. Os indicadores são calculados das tabelas existentes e não exigem tabelas de agregação duplicadas.

## Próxima fase

**FASE 13 — Relatórios.**
