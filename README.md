# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 3 — Autenticação, usuários e permissões concluída.**

Já existem bootstrap Express, conexão MySQL, migrations versionadas, modelo relacional base, autenticação por sessão persistida no MySQL, bcrypt, perfis/permissões (RBAC) no backend, primeiro administrador seguro, gestão básica de usuários, auditoria e telas de login/usuários.

Produtos e estoque ainda não possuem serviços/telas de negócio: começam nas próximas fases.

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

O cookie é HTTP-only e `secure` em produção. A sessão fica no MySQL, não no MemoryStore. Mudança de senha, perfil ou status invalida sessões antigas usando `auth_version`. Autorizações são verificadas no backend em cada requisição autenticada. Consulte `docs/AUTENTICACAO.md`.

## Banco

Migrations ficam em `src/database/migrations/` e são controladas por `schema_migrations` com checksum. Não altere migrations já aplicadas. Consulte `docs/BANCO_DE_DADOS.md`.

## Produção / Hostinger

Use credenciais exclusivas no ambiente, `NODE_ENV=production`, `SESSION_SECRET` aleatório, remova `ADMIN_PASSWORD` após o bootstrap e aplique migrations antes de iniciar uma versão que dependa delas.

## Próxima fase

**FASE 4 — Categorias, marcas e produtos.**
