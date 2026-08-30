# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 11 — Financeiro concluída.**

O sistema possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas, caixa e agora contas a receber/pagar com liquidação parcial, estornos, receitas/despesas manuais, financeirização de compras e fluxo financeiro.

Venda continua separada de recebimento; compra continua separada de pagamento. Movimentações financeiras são rastreáveis e correções usam estorno, sem apagar ledgers históricos.

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

Documentação da fase: `docs/FINANCEIRO.md`.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 11 adiciona `014_finance_phase11.sql`, com idempotência em obrigações/liquidações, financeirização de compras, transferência bancária, tipos de caixa para financeiro e proteção das alocações de desembolso.

## Próxima fase

**FASE 12 — Dashboard.**
