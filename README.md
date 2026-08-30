# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 10 — Caixa e formas de pagamento concluída.**

O sistema já possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas e agora caixa com abertura/fechamento, suprimento/sangria e pagamentos por dinheiro, PIX, débito e crédito parcelado.

Venda, alocação de pagamento e recebimento são fatos separados. Dinheiro/PIX geram recebimento imediato; cartões geram recebíveis para liquidação posterior. O fechamento do caixa físico considera somente numerário.

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
- Produtos: `/pages/products.html`
- Grade: `/pages/grade.html`
- Estoque: `/pages/stock.html`
- Clientes: `/pages/customers.html`
- Fornecedores: `/pages/suppliers.html`
- Compras: `/pages/purchases.html`
- Usuários: `/pages/users.html`

Documentação da fase: `docs/CAIXA_PAGAMENTOS.md`.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 10 adiciona `013_cash_payments_phase10.sql`, com lotes idempotentes de pagamento, formas padrão, chaves de operação em caixa/recebimentos, novos tipos de movimento e proteção de imutabilidade dos ledgers.

## Próxima fase

**FASE 11 — Financeiro.**
