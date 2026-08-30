# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 7 — Clientes concluída.**

Já existem autenticação e permissões, auditoria, produtos, grade por cor/tamanho/SKU, estoque transacional e cadastro de clientes com busca rápida e ficha comercial preparada para vendas/recebíveis.

Clientes não são excluídos fisicamente. CPF/CNPJ opcional é normalizado e validado quando informado, listagens mascaram o documento e dados pessoais não são duplicados no JSON de auditoria.

## Execução local

Requisitos: Node.js 20+, npm e MySQL 8+.

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

## Scripts

- `npm start`
- `npm run dev`
- `npm run check`
- `npm test`
- `npm run db:check`
- `npm run db:migrate`
- `npm run auth:bootstrap-admin`

## Módulos disponíveis

- Produtos: `/pages/products.html`
- Grade: `/pages/grade.html`
- Estoque: `/pages/stock.html`
- Clientes: `/pages/customers.html`
- Usuários: `/pages/users.html`

Documentação: `docs/PRODUTOS.md`, `docs/GRADE_PRODUTOS.md`, `docs/ESTOQUE.md`, `docs/CLIENTES.md` e `docs/AUTENTICACAO.md`.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 7 adiciona `010_customers_phase7.sql`, com `customers.read`, índices de busca e referência do usuário que criou/alterou o cadastro.

## Produção / Hostinger

Use credenciais exclusivas no ambiente, `NODE_ENV=production`, `SESSION_SECRET` aleatório, remova `ADMIN_PASSWORD` após o bootstrap e aplique migrations antes de iniciar uma versão que dependa delas.

## Próxima fase

**FASE 8 — Fornecedores e compras.**
