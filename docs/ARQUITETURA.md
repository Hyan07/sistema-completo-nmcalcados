# Arquitetura — NM Calçados

## Decisão inicial

A aplicação será um monólito modular:

- o Express expõe a API interna;
- o próprio Express serve os arquivos estáticos do frontend;
- o MySQL será a fonte única dos dados persistentes;
- regras críticas permanecerão no backend;
- módulos serão separados em controllers, services e repositories à medida que forem implementados.

## Responsabilidades por camada

### routes
Define endpoints e encadeia middlewares/controllers.

### controllers
Traduz HTTP para chamadas de aplicação. Não deve concentrar regra de negócio complexa.

### services
Contém regras de negócio, coordenação de transações e integração entre domínios.

### repositories
Centraliza acesso ao MySQL com consultas parametrizadas.

### middlewares
Autenticação, autorização, validações transversais e tratamento HTTP.

### database
Migrations e seeds versionados. Nenhuma alteração estrutural de produção deve depender de edição manual não documentada.

### public
Frontend administrativo e catálogo público em HTML, CSS e JavaScript puro.

## Princípios já fixados

1. Venda e recebimento financeiro são entidades/processos distintos.
2. Estoque será controlado por variação de produto, com movimentação imutável/rastreável.
3. Operações compostas usarão transações MySQL.
4. Permissões serão verificadas no backend.
5. Credenciais reais nunca serão versionadas.
6. O catálogo público reutilizará o mesmo banco e as mesmas regras de disponibilidade do administrativo.

## Limite da FASE 1

Esta fase não cria schema MySQL, sessão, usuários, produtos ou estoque. Ela estabelece apenas uma base executável para que as próximas fases sejam adicionadas sem reestruturações improvisadas.
