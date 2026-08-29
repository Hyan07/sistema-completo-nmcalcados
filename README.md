# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 2 — Banco de dados e migrations concluída.**

A aplicação possui bootstrap Express, configuração segura do MySQL, executor de migrations com checksum/lock e o modelo relacional base do ERP/POS. As regras funcionais dos módulos ainda serão implementadas incrementalmente nas próximas fases.

## Tecnologias

- Node.js 20+
- Express.js
- HTML5, CSS3 e JavaScript puro
- MySQL via `mysql2`
- `dotenv`
- `bcrypt`
- `express-session`

## Estrutura

```text
src/
  config/
    database.js
    env.js
  controllers/
  services/
  repositories/
  routes/
  middlewares/
  utils/
  database/
    migrations/
    seeds/
public/
  css/
  js/
  images/
  pages/
uploads/
scripts/
docs/
server.js
```

## Execução local

Requisitos:

- Node.js 20 ou superior;
- npm;
- MySQL 8+;
- um banco vazio de desenvolvimento criado previamente.

```bash
npm install
cp .env.example .env
npm run db:check
npm run db:migrate
npm run dev
```

No Windows:

```powershell
Copy-Item .env.example .env
npm run db:check
npm run db:migrate
npm run dev
```

A aplicação inicia por padrão em `http://localhost:3000`.

Health check HTTP:

```text
GET /api/health
```

## Banco de dados

O projeto não cria o database automaticamente, pois ambientes de hospedagem normalmente controlam essa permissão. Crie um banco vazio no MySQL/Hostinger e configure as credenciais no `.env`.

Exemplo apenas para desenvolvimento local:

```sql
CREATE DATABASE nm_calcados_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Depois execute:

```bash
npm run db:check
npm run db:migrate
```

As migrations ficam em `src/database/migrations`. Não edite uma migration que já foi aplicada; crie outra com numeração superior.

Detalhes do modelo: `docs/BANCO_DE_DADOS.md`.

## Variáveis de ambiente

O `.env` não deve ser versionado. Use `.env.example` somente como modelo e forneça valores próprios de cada ambiente.

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECTION_LIMIT`

O pool da aplicação não permite múltiplas instruções SQL na mesma consulta. Essa opção é ativada exclusivamente na conexão isolada do executor de migrations.

## Scripts npm

- `npm start`: inicia o servidor;
- `npm run dev`: inicia com `node --watch`;
- `npm run check`: valida sintaxe dos arquivos JavaScript principais;
- `npm run db:check`: testa as credenciais e conexão com o MySQL;
- `npm run db:migrate`: aplica migrations pendentes.

## Produção / Hostinger

A aplicação usa `process.env.PORT`, configura MySQL via ambiente e não depende de caminhos absolutos locais. Banco de desenvolvimento e banco de produção devem ser separados.

Antes de qualquer migration em produção, realizar backup e conferir a migration em ambiente de homologação.

## Próxima fase

**FASE 3 — Autenticação, usuários e permissões.**

A estrutura de `users`, `roles`, `permissions` e `role_permissions` já existe no banco. A próxima etapa implementará autenticação com bcrypt, sessão, autorização no backend e seed inicial seguro, sem credenciais reais no repositório.
