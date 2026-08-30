# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 16 — Importação dos dados reais concluída no código.**

O sistema possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas, caixa, financeiro, dashboard, relatórios, catálogo público, pedidos/reservas e agora uma esteira segura de importação CSV com dry-run, idempotência e aplicação transacional.

A carga real não inventa dados: os arquivos efetivos da loja ainda precisam ser fornecidos e validados no ambiente de implantação.

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

Documentação da fase: `docs/IMPORTACAO_DADOS.md`.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 16 adiciona `019_data_import_phase16.sql`, criando somente metadados de lotes/idempotência e permissões. O conteúdo bruto dos CSVs não é persistido em staging.

## Próxima fase

**FASE 17 — Auditoria completa do sistema.**
