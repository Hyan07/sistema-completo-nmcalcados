# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 5 — Variantes, cores, tamanhos e SKUs concluída.**

Já existem bootstrap Express, conexão MySQL, migrations versionadas, autenticação por sessão persistida no MySQL, bcrypt, múltiplos cargos e permissões por usuário, auditoria, gestão de usuários, categorias, marcas, produtos, imagens e a grade comercial por cor/tamanho/SKU.

O produto agora segue a hierarquia `produto → variante/cor → tamanho/SKU`. O saldo e o histórico de movimentações permanecem reservados para a FASE 6 — Estoque.

## Execução local

Requisitos: Node.js 20+, npm e MySQL 8+.

```bash
npm install
cp .env.example .env
npm run db:check
npm run db:migrate
npm run auth:bootstrap-admin
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

Uploads de produtos aceitam apenas JPEG, PNG e WebP com limites de tamanho/quantidade e validação da assinatura binária. Os arquivos enviados não são versionados no Git.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas. A FASE 5 reutiliza as tabelas de grade já criadas em `002_products_and_inventory.sql`, portanto não exige nova migration estrutural. Consulte `docs/BANCO_DE_DADOS.md`.

## Produtos e grade

- Produtos: `/pages/products.html`
- Grade: `/pages/grade.html`
- Regras de produtos: `docs/PRODUTOS.md`
- Regras de variantes/SKUs: `docs/GRADE_PRODUTOS.md`

## Produção / Hostinger

Use credenciais exclusivas no ambiente, `NODE_ENV=production`, `SESSION_SECRET` aleatório, remova `ADMIN_PASSWORD` após o bootstrap e aplique migrations antes de iniciar uma versão que dependa delas. Garanta permissão de escrita do processo Node em `uploads/products/`.

## Próxima fase

**FASE 6 — Estoque.**
