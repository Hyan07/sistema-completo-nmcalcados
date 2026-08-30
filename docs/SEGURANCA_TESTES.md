# FASE 18 — Testes, Segurança e Revisão de Fluxos

## Objetivo

A FASE 18 endurece a superfície HTTP e transforma premissas de segurança da arquitetura em verificações repetíveis. Ela complementa a auditoria de integridade da FASE 17; não substitui homologação contra um MySQL de teste nem pentest profissional.

## Proteções HTTP adicionadas

### Headers

Todas as respostas passam a receber políticas centrais:

- `Content-Security-Policy`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY` e `frame-ancestors 'none'`;
- `Referrer-Policy: no-referrer`;
- `Permissions-Policy` restritiva;
- `Cross-Origin-Opener-Policy: same-origin`;
- `Cross-Origin-Resource-Policy: same-origin`;
- `Strict-Transport-Security` em produção.

A CSP mantém `style-src 'unsafe-inline'` porque o frontend atual usa estilos inline controlados em alguns componentes. Scripts continuam restritos a `'self'`.

### Proteção de origem / CSRF

Mutações (`POST`, `PUT`, `PATCH`, `DELETE`) verificam `Origin`/`Referer`.

- origem diferente da aplicação: `403 UNTRUSTED_REQUEST_ORIGIN`;
- sessão autenticada sem origem validável: `403 REQUEST_ORIGIN_REQUIRED`;
- `Sec-Fetch-Site: cross-site`: bloqueado;
- API pública sem sessão pode continuar sendo usada por clientes não-browser sem `Origin`, mas uma origem explicitamente diferente é recusada.

Em produção, `APP_ORIGIN` é obrigatório para evitar depender de Host/proxy na decisão de confiança.

A proteção funciona em conjunto com o cookie de sessão `httpOnly`, `secure` em produção e `sameSite=lax`.

### Rate limit global

Além dos limites específicos de login e catálogo, `/api` possui limite de 1.200 requisições por minuto por IP. O objetivo é conter abuso grosseiro sem prejudicar uma loja operando atrás do mesmo NAT.

### Content-Type

Requisições de mutação com corpo aceitam somente:

- `application/json`;
- `application/x-www-form-urlencoded`;
- `multipart/form-data`.

Payload `text/plain` ou tipo arbitrário recebe `415 UNSUPPORTED_CONTENT_TYPE`.

### Cache e rastreabilidade

APIs recebem `Cache-Control: no-store` por padrão. Endpoints públicos de leitura do catálogo podem sobrescrever essa política com o cache curto já existente.

Cada requisição recebe um UUID novo em `X-Request-Id`. O valor enviado pelo cliente não é reutilizado, evitando injeção/confusão em logs.

Em produção, erros 5xx registram somente metadados sanitizados (`requestId`, método, path, status e código), sem body, SQL, parâmetros ou stack no log HTTP padrão.

## Sessões

A sessão continua armazenada no MySQL, com:

- `httpOnly`;
- `secure` quando `NODE_ENV=production`;
- `sameSite=lax`;
- cookie `priority=high`;
- renovação rolling;
- destruição explícita ao remover sessão;
- `auth_version` para invalidar sessões após mudança de senha/acesso.

## Uploads revisados

Imagens de produto continuam com:

- JPEG/PNG/WebP somente;
- máximo 5 MB por arquivo;
- máximo 6 arquivos por requisição;
- nome aleatório UUID;
- assinatura binária validada antes da persistência;
- limite de 10 imagens por produto;
- limpeza de arquivo quando a operação falha.

CSV de importação continua em memória, com um arquivo de até 5 MB e parsing controlado.

## Dependências

A revisão de 30/08/2026 conferiu as versões declaradas no projeto. Em especial, o projeto utiliza Multer `^2.3.0`, acima das versões corrigidas para os advisories DoS recentes da linha 2.x.

Isso não substitui auditoria de dependências transitivas. Após `npm install`, execute:

```bash
npm run security:deps
```

O repositório ainda não contém `package-lock.json`; a geração e versionamento de um lockfile reproduzível deve ser tratada antes do deploy da FASE 19, em ambiente com acesso confiável ao registry npm.

## Check estático de arquitetura

Novo comando:

```bash
npm run security:check
```

Ele falha se detectar, entre outros:

- `eval()` ou `new Function()` em `src`/`public/js`;
- `child_process` dentro da aplicação web;
- conexão padrão sem `multipleStatements=false`;
- rota administrativa sem referência a `authenticate`;
- retirada dos rate limits públicos/login;
- `gradeRoutes` fora do `productRoutes` autenticado;
- atualização direta de `stock_balances.quantity` fora do repositório oficial;
- tentativa de `UPDATE/DELETE` do ledger `stock_movements`;
- `.env` deixando de ser ignorado pelo Git.

O check é propositalmente arquitetural: não tenta substituir SAST completo nem provar que toda query SQL é segura.

## Pipeline local

Sem banco:

```bash
npm install
npm run verify
npm run security:deps
```

Com banco de homologação:

```bash
npm run db:check
npm run audit:integrity
npm run db:migrate
npm run verify
npm run audit:integrity
```

## Matriz de revisão manual de fluxos

Antes de produção, execute em banco dedicado de homologação:

1. login inválido repetido → rate limit e lock de conta;
2. usuário sem permissão → `403` no backend, mesmo chamando endpoint diretamente;
3. troca de senha/permissão → sessão antiga invalidada;
4. `POST/PATCH/DELETE` autenticado com Origin externo → `403`;
5. consulta com payload típico de SQL Injection em campos de busca → tratado como texto e sem alteração do banco;
6. upload `.jpg` com conteúdo que não é imagem → rejeitado;
7. upload/import acima do limite → `413/400` controlado;
8. compra `ORDERED` → nenhum estoque antes do recebimento;
9. recebimento da compra → `PURCHASE_RECEIPT` e saldo na mesma transação;
10. venda `DRAFT` → nenhum estoque;
11. venda `COMPLETED` → baixa `SALE` exata;
12. pagamento em dinheiro → exige caixa aberto e cria recebimento/movimento de caixa;
13. cancelamento da venda → reversão financeira + `SALE_CANCEL` atômicos;
14. pedido público → não reserva estoque sozinho;
15. confirmação do pedido → reserva sem alterar saldo físico;
16. venda convertida do catálogo → consome a própria reserva somente ao finalizar;
17. concorrência pelo último SKU → apenas uma reserva/venda pode comprometer o saldo livre;
18. `npm run audit:integrity` após os cenários → zero achados críticos/erros.

## Limitações desta execução

Nesta fase foram executados testes unitários e checagem sintática no sandbox. O sandbox não consegue resolver `github.com` para `git clone` e não possui credenciais MySQL da loja, portanto não foram executados testes HTTP end-to-end nem as transações contra um banco real.

A FASE 19 deve validar proxy/HTTPS/`APP_ORIGIN`, gerar e versionar o lockfile npm e executar o pipeline em ambiente de homologação antes de liberar produção.
