# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 19 — Preparação e Deploy Hostinger concluída no repositório.**

O sistema possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas, caixa, financeiro, dashboard, relatórios, catálogo público, pedidos/reservas, importação controlada, auditoria de integridade e hardening de segurança.

A FASE 19 fixa Node.js 24, fixa dependências diretas, adiciona health/readiness de produção, status de migrations, verificação pré-deploy e documentação específica para Hostinger.

## Execução local

```bash
npm install
cp .env.example .env
npm run verify
npm run db:check
npm run db:status
npm run db:migrate
npm run audit:integrity
npm run dev
```

No Windows: `Copy-Item .env.example .env`.

## Produção / Hostinger

Consulte `docs/DEPLOY_HOSTINGER.md`.

Comandos principais:

```bash
npm run build
npm run db:status
npm run deploy:check
npm run audit:integrity
```

Health checks:

- `/api/health/live` — processo Express;
- `/api/health/ready` — MySQL + migrations.

## Segurança

```bash
npm run verify
npm run security:deps
npm run audit:integrity
```

Consulte `docs/SEGURANCA_TESTES.md` e `docs/AUDITORIA_SISTEMA.md`.

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

A última migration estrutural é `020_integrity_audit_phase17.sql`. A FASE 19 não adiciona migration.

## Próxima fase

**FASE 20 — Homologação e entrada em produção.**
