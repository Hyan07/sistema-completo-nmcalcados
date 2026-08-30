# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 14 — Catálogo Público concluída.**

O sistema possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas, caixa, financeiro, dashboard, relatórios e agora catálogo público derivado do mesmo cadastro comercial.

A vitrine publica somente produtos ativos marcados para catálogo, resolve preços com a mesma regra do PDV e expõe disponibilidade por tamanho sem revelar saldo exato, custos, códigos internos ou dados administrativos.

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

Documentação da fase: `docs/CATALOGO_PUBLICO.md`.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 14 adiciona `017_public_catalog_phase14.sql`, apenas com índices para consultas públicas de variantes, SKUs e imagens. Produtos/preços/estoque continuam usando as tabelas transacionais existentes.

## Próxima fase

**FASE 15 — Pedidos e reservas pelo catálogo.**
