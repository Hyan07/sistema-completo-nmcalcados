# Banco de dados — NM Calçados

## Objetivo

O banco foi modelado como a fonte única de verdade do ERP/POS. O catálogo público, estoque, vendas, compras e financeiro compartilham as mesmas entidades; não existem cadastros paralelos por módulo.

## Princípios

1. MySQL/InnoDB com `utf8mb4`.
2. Valores monetários sempre em `DECIMAL(15,2)`; nunca `FLOAT`.
3. Chaves estrangeiras preservam integridade referencial.
4. Registros históricos críticos não devem ser apagados fisicamente pela aplicação.
5. Alterações estruturais são feitas apenas por migrations versionadas.
6. Operações de negócio que escrevem em múltiplas tabelas deverão usar transações MySQL no service correspondente.
7. O pool normal da aplicação mantém `multipleStatements=false`; somente o executor de migrations habilita múltiplas instruções SQL.
8. `DECIMAL` deve permanecer como string ao sair do `mysql2` até ser tratado por uma rotina monetária segura. Não habilitar `decimalNumbers` globalmente.

## Modelo de produtos e estoque

```text
products
  └─ product_variants (cor)
       └─ product_skus (tamanho + SKU/código de barras)
            ├─ stock_balances
            └─ stock_movements
```

O saldo é controlado por `product_skus`. Assim, um mesmo tênis pode possuir saldo independente para Preto/38, Preto/39, Branco/38 etc.

`stock_balances` representa o saldo atual para leitura rápida. `stock_movements` é o histórico imutável de entradas e saídas e registra saldo anterior, variação e saldo posterior.

A futura implementação de estoque deverá atualizar saldo e inserir movimentação na mesma transação, utilizando bloqueio de linha (`SELECT ... FOR UPDATE`) antes de conferir/alterar a quantidade.

## Venda não é recebimento

O modelo separa os fatos:

```text
sales
  ├─ sale_items
  └─ sale_payment_allocations   <- como a venda foi combinada
         └─ receivables         <- valores a receber / parcelas
              └─ receipt_allocations
                    └─ receipts <- dinheiro efetivamente recebido
```

Uma venda concluída pode existir antes de todo o dinheiro ter sido recebido. Isso permite crediário, parcelamento, recebimento parcial e múltiplas formas de pagamento sem distorcer o faturamento comercial.

`receivables.status=OPEN/PARTIAL/PAID/CANCELLED`. O conceito de "atrasado" deve ser calculado por `due_date < data atual` enquanto houver saldo em aberto, evitando um status persistido que possa ficar desatualizado.

## Compra não é pagamento

A mesma separação existe no contas a pagar:

```text
purchases
  └─ payables
       └─ disbursement_allocations
            └─ disbursements
```

Confirmar uma compra/entrada pode gerar uma obrigação; o desembolso efetivo ocorre separadamente.

## Caixa

`cash_registers` representa o caixa físico/lógico. `cash_sessions` representa uma abertura e fechamento por operador. `cash_movements` registra eventos que realmente afetam a sessão.

A regra de apenas uma sessão aberta por caixa será aplicada no backend com transação e bloqueio. Não há dependência de esconder botões no frontend.

## Histórico comercial

Itens de venda, compra e pedido mantêm campos `*_snapshot` para preservar a descrição/SKU utilizados no momento da operação, mesmo que posteriormente o nome comercial de um produto seja alterado.

## Auditoria

`audit_logs` está disponível como infraestrutura, mas a política completa de quais ações e campos registrar será implementada nas fases funcionais. Não armazenar senhas, hashes de senha, tokens, chaves, dados completos de cartão ou outros segredos em JSON de auditoria.

## Migrations

Arquivos SQL ficam em `src/database/migrations` e usam o padrão:

```text
001_nome.sql
002_nome.sql
...
```

O executor:

- cria `schema_migrations` automaticamente;
- ordena migrations pelo nome;
- calcula SHA-256 de cada arquivo;
- registra migrations aplicadas;
- rejeita alteração de migration já executada;
- usa `GET_LOCK` para impedir duas execuções simultâneas.

Migrations aplicadas são imutáveis. Para corrigir ou evoluir o esquema, crie um novo arquivo.

### Observação sobre DDL MySQL

Comandos DDL podem realizar commit implícito no MySQL. Por isso, uma migration estrutural que falhe parcialmente deve ser analisada antes de nova tentativa. O checksum protege o histórico, mas não substitui backup, homologação e revisão antes de produção.

## Índices

Os primeiros índices foram criados para consultas esperadas de maior frequência:

- produto por categoria/marca/publicação;
- SKU/código de barras;
- estoque por saldo;
- vendas por período, vendedor e cliente;
- compras por período/status;
- contas por vencimento/status;
- movimentações por SKU/data;
- pedidos do catálogo por status/data;
- auditoria por entidade, usuário e ação.

Índices adicionais devem ser incluídos somente depois de observar consultas reais, evitando indexação excessiva.
