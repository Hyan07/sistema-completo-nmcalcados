# Arquitetura — NM Calçados

## Decisão arquitetural

A aplicação é um monólito modular:

- o Express expõe a API interna;
- o próprio Express serve os arquivos estáticos do frontend;
- o MySQL é a fonte única dos dados persistentes;
- regras críticas permanecem no backend;
- módulos são separados em controllers, services e repositories à medida que forem implementados.

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

## Infraestrutura de banco

A FASE 2 adicionou:

- pool MySQL via `mysql2/promise`;
- configuração centralizada por variáveis de ambiente;
- conexão normal com `multipleStatements=false`;
- executor isolado de migrations com checksum SHA-256;
- lock exclusivo via `GET_LOCK` durante migrations;
- `schema_migrations` para rastrear histórico aplicado;
- modelo relacional base para usuários, produtos/SKUs, estoque, compras, vendas, caixa, financeiro, catálogo e auditoria.

O documento `docs/BANCO_DE_DADOS.md` descreve as decisões de modelagem com maior profundidade.

## Princípios fixados

1. Venda e recebimento financeiro são entidades/processos distintos.
2. Compra e pagamento também são processos distintos.
3. Estoque é controlado pelo SKU final (produto + cor + tamanho), com saldo atual e histórico de movimentações separados.
4. Operações compostas usarão transações MySQL e bloqueio de linha quando houver concorrência de estoque/saldo.
5. Permissões serão verificadas no backend.
6. Credenciais reais nunca serão versionadas.
7. O catálogo público reutilizará o mesmo banco e as mesmas regras de disponibilidade do administrativo.
8. Valores monetários usam `DECIMAL`, sem `FLOAT`.
9. Registros comerciais e financeiros históricos não serão apagados para mascarar operações; cancelamento/estorno possuirá fluxo explícito.
10. Migrations já aplicadas são imutáveis; toda evolução de schema gera nova migration.

## Estado após a FASE 2

O schema está preparado, mas tabelas disponíveis não significam módulos funcionais. Controllers, services, repositories, autenticação, telas e fluxos de negócio serão adicionados somente nas fases correspondentes.

A próxima fase é autenticação, usuários e permissões.
