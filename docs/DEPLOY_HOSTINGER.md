# FASE 19 — Deploy na Hostinger

## Objetivo

Preparar e validar o monólito NM Calçados para o serviço **Node.js Web App** da Hostinger, mantendo Express + MySQL e sem migrar para Horizons/React.

## Runtime

O projeto fixa Node.js 24 (`.nvmrc` e `engines.node = 24.x`). A Hostinger informa suporte a Node 18, 20, 22 e 24 em Node.js Web Apps.

Comandos previstos no painel:

```text
Build: npm run build
Start: npm start
```

`npm run build` executa apenas validações sem banco (`check + test + security:check`). Migrations não rodam automaticamente durante o build.

## 1. Plano Hostinger

Use um plano que ofereça **Node.js Web App** (Business Web Hosting ou Cloud compatível). Não use Hostinger Horizons para este projeto, porque Horizons possui outra stack/backend e não é o ambiente deste ERP.

## 2. Banco MySQL

No hPanel:

1. Databases → MySQL Databases;
2. crie banco e usuário próprios do NM Calçados;
3. gere senha forte;
4. anote host, banco e usuário;
5. não reutilize conta administrativa do banco.

Na hospedagem gerenciada Hostinger, o host do MySQL normalmente é `localhost`, mas use exatamente o host exibido no painel.

## 3. Deploy pelo GitHub

No hPanel:

1. Websites → Add Website;
2. escolha **Node.js Web App**;
3. escolha **Import Git Repository**;
4. autorize o GitHub somente para o repositório necessário;
5. selecione `Hyan07/sistema-completo-nmcalcados` e branch `main`;
6. selecione Node.js 24;
7. Build: `npm run build`;
8. Start: `npm start`;
9. configure as variáveis de ambiente antes de concluir o deploy.

## 4. Variáveis de ambiente

Use `deploy/hostinger.env.example` apenas como modelo. Nunca envie valores reais ao Git.

Obrigatórias:

- `NODE_ENV=production`;
- `APP_ORIGIN=https://...`;
- `DB_HOST`;
- `DB_PORT`;
- `DB_NAME`;
- `DB_USER`;
- `DB_PASSWORD`;
- `DB_CONNECTION_LIMIT`;
- `SESSION_SECRET`;
- `SESSION_MAX_AGE_MINUTES`;
- `BCRYPT_ROUNDS`.

Não fixe `PORT` no hPanel quando a plataforma fornecer a porta automaticamente. O servidor já usa `process.env.PORT` quando presente.

### APP_ORIGIN

`APP_ORIGIN` precisa coincidir exatamente com a origem utilizada pelo navegador, sem `/` final, path, query ou credenciais.

Durante validação no domínio temporário, use a origem HTTPS temporária. Depois de conectar o domínio definitivo, atualize `APP_ORIGIN` para o domínio definitivo e reinicie/aplique as variáveis.

## 5. Bootstrap do primeiro administrador

Se o banco for novo, defina `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL` (opcional) e `ADMIN_PASSWORD` apenas temporariamente e execute:

```bash
npm run auth:bootstrap-admin
```

Depois remova `ADMIN_PASSWORD` do ambiente. `npm run deploy:check` reprova produção se `ADMIN_PASSWORD` continuar definida.

## 6. Migrations

Para banco novo:

```bash
npm run db:check
npm run db:status
npm run db:migrate
npm run db:status
```

Para banco que já contém dados, faça backup antes e execute:

```bash
npm run db:check
npm run audit:integrity
npm run db:status
npm run db:migrate
npm run db:status
npm run audit:integrity
```

Não edite migrations antigas para fazer o deploy passar.

## 7. Verificações de produção

Após migrations e bootstrap:

```bash
npm run verify
npm run security:deps
npm run deploy:check
npm run audit:integrity
```

`deploy:check` falha quando:

- ambiente não é `production`;
- `APP_ORIGIN` não é HTTPS;
- credenciais ainda são placeholders;
- `SESSION_SECRET` é fraco/placeholder;
- `ADMIN_PASSWORD` ficou no ambiente;
- MySQL não conecta;
- existe migration pendente, divergente ou órfã.

## 8. Health checks

Endpoints públicos mínimos:

```text
GET /api/health
GET /api/health/live
GET /api/health/ready
```

`/live` verifica que o processo Express está respondendo.

`/ready` verifica MySQL e estado das migrations. Retorna **503** enquanto banco/schema não estiver pronto e **200** somente quando todas as migrations locais estiverem aplicadas com checksum correto.

A resposta de readiness expõe apenas contagens, nunca credenciais ou nomes de tabelas pendentes.

## 9. Domínio e SSL

A Hostinger permite iniciar em domínio temporário e depois usar **Connect domain**. Quando o DNS termina de propagar, o SSL é instalado automaticamente pela plataforma.

Após conectar o domínio definitivo:

1. confirme HTTPS;
2. atualize `APP_ORIGIN`;
3. aplique/reinicie a aplicação;
4. teste login e todas as mutações autenticadas;
5. confirme `Strict-Transport-Security` nas respostas de produção.

## 10. Dependências reproduzíveis

As dependências diretas foram fixadas sem `^` na FASE 19 para reduzir variação durante deploy.

O `package-lock.json` ainda precisa ser gerado por `npm install` em ambiente com acesso confiável ao registry npm e então versionado. Não fabrique o lockfile manualmente.

Depois de gerar:

```bash
git add package-lock.json
git commit -m "build: adiciona lockfile de producao"
```

Com lockfile versionado, prefira instalação baseada em lock (`npm ci`) quando o fluxo Hostinger permitir.

## 11. Smoke test no domínio temporário/final

Validar:

1. `/api/health/live` → 200;
2. `/api/health/ready` → 200 após migrations;
3. catálogo público abre;
4. login funciona sobre HTTPS;
5. usuário sem permissão recebe 403;
6. CRUD mínimo de produto/grade em homologação;
7. recebimento de compra movimenta estoque;
8. venda finalizada baixa estoque;
9. pagamento em dinheiro exige caixa aberto;
10. cancelamento reverte financeiro + estoque;
11. pedido público não reserva até confirmação;
12. `npm run audit:integrity` termina sem CRITICAL/ERROR.

## 12. Rollback operacional

Antes de alteração de schema/dados:

- backup do MySQL;
- registrar SHA do commit implantado;
- não fazer force push na `main`;
- rollback de código = redeploy do SHA anterior;
- rollback de banco não deve ser feito apagando registros/movements; restaure backup somente sob procedimento de contingência e reconciliação.

## Limitação desta execução

O conector Hostinger disponível nesta conversa é Horizons e não dá acesso ao hPanel Node.js/MySQL. Por isso esta fase prepara e valida o código, mas não afirma que o site real foi criado, que credenciais foram inseridas ou que migrations foram executadas no servidor Hostinger.
