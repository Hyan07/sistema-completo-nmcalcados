# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 1 — Arquitetura e estrutura inicial.**

Nesta etapa existe somente o bootstrap técnico da aplicação. Banco de dados, autenticação e módulos comerciais ainda não foram implementados para preservar o desenvolvimento incremental definido no `PROMPT_MESTRE.md`.

## Tecnologias previstas

- Node.js
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
- npm.

```bash
npm install
cp .env.example .env
npm run dev
```

No Windows, copie `.env.example` para `.env` manualmente ou pelo PowerShell:

```powershell
Copy-Item .env.example .env
```

A aplicação inicia por padrão em `http://localhost:3000`.

Health check:

```text
GET /api/health
```

## Variáveis de ambiente

O arquivo `.env` não deve ser versionado. Use `.env.example` como referência e substitua todos os valores por credenciais próprias do ambiente.

Nesta fase as variáveis do MySQL e de sessão já estão documentadas, mas ainda não são utilizadas para abrir conexão ou autenticar usuários.

## Scripts npm

- `npm start`: inicia o servidor;
- `npm run dev`: inicia com `node --watch`;
- `npm run check`: valida sintaxe dos arquivos JavaScript principais.

## Produção / Hostinger

A aplicação já respeita `process.env.PORT` e não utiliza caminhos absolutos do Windows. A configuração definitiva do MySQL, sessões seguras, migrations e procedimento de deploy será adicionada nas fases correspondentes, antes da homologação.

## Próxima fase

**FASE 2 — Banco de dados e migrations.**

Antes de implementá-la, será definido o modelo relacional base e as dependências entre usuários, produtos, variantes, estoque, vendas, compras e financeiro.
