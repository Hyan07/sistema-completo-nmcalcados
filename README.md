# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 4 — Categorias, marcas e produtos concluída.**

Já existem bootstrap Express, conexão MySQL, migrations versionadas, autenticação por sessão persistida no MySQL, bcrypt, múltiplos cargos e permissões por usuário, auditoria, gestão de usuários e o cadastro administrativo de categorias, marcas, produtos e imagens.

A estrutura de banco para variantes, tamanhos, SKUs e estoque já existe, mas os fluxos de negócio correspondentes ainda não foram ativados na aplicação. Eles serão implementados incrementalmente nas próximas fases.

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

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas. Consulte `docs/BANCO_DE_DADOS.md`.

## Produtos

A tela administrativa está em `/pages/products.html`. Consulte `docs/PRODUTOS.md` para regras, permissões e endpoints.

## Produção / Hostinger

Use credenciais exclusivas no ambiente, `NODE_ENV=production`, `SESSION_SECRET` aleatório, remova `ADMIN_PASSWORD` após o bootstrap e aplique migrations antes de iniciar uma versão que dependa delas. Garanta permissão de escrita do processo Node em `uploads/products/`.

## Próxima fase

**FASE 5 — Variantes, cores, tamanhos e SKUs.**
