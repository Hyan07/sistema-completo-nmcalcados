# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 18 — Testes, Segurança e Revisão de Fluxos concluída.**

O sistema possui autenticação/RBAC, produtos e grade, estoque transacional, clientes, fornecedores/compras, PDV/vendas, caixa, financeiro, dashboard, relatórios, catálogo público, pedidos/reservas, importação controlada e auditoria de integridade.

A FASE 18 adiciona headers HTTP/CSP, validação de origem para mutações, rate limit global, validação de Content-Type, request-id, logs 5xx sanitizados e checks estáticos de regressão de segurança.

## Execução local

```bash
npm install
cp .env.example .env
npm run verify
npm run db:check
npm run audit:integrity
npm run db:migrate
npm run audit:integrity
npm run dev
```

No Windows: `Copy-Item .env.example .env`.

## Segurança

```bash
npm run verify
npm run security:check
npm run security:deps
npm run audit:integrity
```

- `verify`: sintaxe + testes + check estático de segurança;
- `security:check`: invariantes arquiteturais sem acessar banco;
- `security:deps`: `npm audit` das dependências instaladas;
- `audit:integrity`: consistência transacional do MySQL.

Em produção, `APP_ORIGIN` é obrigatório. Consulte `docs/SEGURANCA_TESTES.md` e `docs/AUDITORIA_SISTEMA.md`.

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

A FASE 18 não cria migration: as alterações são de segurança HTTP, testes e ferramentas de verificação. A migration estrutural mais recente continua sendo `020_integrity_audit_phase17.sql`.

## Próxima fase

**FASE 19 — Deploy na Hostinger.**
