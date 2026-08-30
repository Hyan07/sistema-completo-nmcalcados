# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 6 — Controle transacional de estoque concluída.**

Já existem bootstrap Express, conexão MySQL, migrations versionadas, autenticação por sessão persistida no MySQL, bcrypt, múltiplos cargos/permissões por usuário, auditoria, gestão de usuários, categorias, marcas, produtos, imagens, grade comercial por cor/tamanho/SKU e estoque rastreável por SKU.

O estoque usa `stock_balances` como saldo de leitura e `stock_movements` como histórico imutável. Entradas, saídas, perdas e ajustes físicos são transacionais, idempotentes e impedem saldo negativo.

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

## Segurança

O cookie é HTTP-only e `secure` em produção. A sessão fica no MySQL. Autorizações são verificadas no backend em cada requisição autenticada. Usuários podem acumular cargos e permissões diretas. Consulte `docs/AUTENTICACAO.md`.

Uploads de produtos aceitam somente JPEG, PNG e WebP com limites e validação da assinatura binária. Arquivos enviados não são versionados no Git.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas.

A FASE 6 adiciona a migration `009_stock_phase6.sql`, que registra os tipos oficiais, `stock.read`, idempotência das movimentações, inicialização dos saldos e proteção de imutabilidade do ledger.

## Módulos disponíveis

- Produtos: `/pages/products.html`
- Grade: `/pages/grade.html`
- Estoque: `/pages/stock.html`
- Regras de produtos: `docs/PRODUTOS.md`
- Regras de variantes/SKUs: `docs/GRADE_PRODUTOS.md`
- Regras de estoque: `docs/ESTOQUE.md`

## Produção / Hostinger

Use credenciais exclusivas no ambiente, `NODE_ENV=production`, `SESSION_SECRET` aleatório, remova `ADMIN_PASSWORD` após o bootstrap e aplique migrations antes de iniciar uma versão que dependa delas. Garanta permissão de escrita do processo Node em `uploads/products/`.

## Próxima fase

**FASE 7 — Clientes.**
