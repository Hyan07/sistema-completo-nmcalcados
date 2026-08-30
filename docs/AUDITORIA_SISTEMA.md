# Auditoria Completa do Sistema — FASE 17

## Objetivo

A FASE 17 revisa os fluxos integrados já implementados e endurece invariantes antes da bateria de segurança/homologação. Ela não cria uma segunda fonte de verdade e não executa correção automática de dados.

## Achados corrigidos

### 1. Consumo de reserva por inferência de saldo — crítico

A proteção da FASE 15 localizava a reserva a consumir procurando a movimentação mais recente que tivesse o mesmo `previous_quantity` e `new_quantity`. Uma saída posterior não relacionada poderia reproduzir o mesmo par de saldos e, em cenário de borda, localizar uma venda antiga do catálogo.

Correção: `stockService` passa o `movementId` recém-criado a `stockRepository.updateBalance()`. Somente esse movimento, se for `SALE` ligado a uma venda convertida, pode consumir a reserva correspondente.

### 2. Idempotência de liquidações financeiras — crítico

Recebimentos/pagamentos posteriores aceitavam uma `operationKey` já existente sem conferir completamente conta, valor, forma de pagamento e caixa. Estornos também não comparavam entidade/motivo.

Correção: as rotas financeiras utilizam um guard por chave operacional no processo Node. Requisições concorrentes com a mesma chave são recusadas enquanto a primeira está em processamento, e a assinatura da operação já persistida é comparada no MySQL antes do serviço financeiro ser executado. Isso evita ocupar uma conexão do pool durante toda a requisição. Como o deploy atual é monolítico em uma instância Node, o lock local cobre a concorrência do processo; uma futura execução multi-instância deverá substituir esse lock por coordenação distribuída sem alterar as chaves únicas já existentes no banco.

## Hardening de banco

A migration `020_integrity_audit_phase17.sql` adiciona garantias que eram apenas de aplicação:

- no máximo uma sessão `OPEN` por terminal de caixa;
- no máximo uma sessão `OPEN` por operador;
- `converted_sale_id` não pode ser compartilhado entre pedidos de catálogo;
- pedido em `CONVERTED` precisa possuir venda vinculada;
- no máximo uma reserva `ACTIVE` por item de pedido.

As unicidades condicionais usam colunas geradas que retornam `NULL` quando a linha não está no estado protegido, preservando o histórico de sessões e reservas encerradas.

## Auditoria read-only

Novo comando:

```bash
npm run audit:integrity
```

O comando consulta o MySQL e não altera dados. Ele cobre, entre outros:

- saldo negativo;
- `stock_balances` diferente da última movimentação;
- quebra da cadeia `previous_quantity → new_quantity`;
- reservas acima do estoque físico;
- pedidos confirmados sem reserva;
- venda de catálogo concluída com reserva ainda ativa;
- `quantity_received` diferente dos recebimentos imutáveis;
- status de compra incompatível com quantidades;
- venda concluída sem baixa `SALE` equivalente;
- venda cancelada sem `SALE_CANCEL` equivalente;
- venda sobrealocada financeiramente;
- valor de receipt/disbursement diferente das alocações;
- saldo de receivable/payable diferente das liquidações confirmadas;
- múltiplos caixas abertos por terminal/operador;
- diferença de fechamento de caixa inconsistente;
- lote de importação `APPLIED` com contagens inválidas.

Por padrão são exibidas até 20 amostras de cada problema. `AUDIT_SAMPLE_LIMIT` aceita de 1 a 100.

O processo termina com:

- código `0`: sem achados `CRITICAL`/`ERROR`;
- código `2`: integridade inconsistente;
- código `1`: falha técnica ao executar a auditoria.

## Matriz de invariantes revisada

### Estoque

Toda mudança física continua passando por `stock_movements` na mesma transação. Saldo inicial usa `INITIAL_BALANCE`; reserva não é movimento físico.

### Pedidos e reservas

Pedido público não reserva. `CONFIRMED` cria hold. `CONVERTED` cria venda `DRAFT`. A reserva só é consumida pela movimentação `SALE` exata da venda convertida.

### Compras

Pedido de compra não altera estoque. Somente `purchase_receipts` gera `PURCHASE_RECEIPT`. Quantidade acumulada do item precisa coincidir com os itens dos recebimentos imutáveis.

### Vendas

Venda `DRAFT` não altera estoque. `COMPLETED` gera `SALE`. Cancelamento integrado gera `SALE_CANCEL` e reversão financeira na mesma transação quando aplicável.

### Caixa e financeiro

Venda, alocação da forma de pagamento, recebimento/pagamento e movimento de caixa permanecem fatos distintos. Alocações são imutáveis e os saldos de contas são auditados contra liquidações confirmadas.

### Importação

Dry-run e aplicação continuam separados. O auditor valida também que um lote marcado como `APPLIED` não contenha linhas inválidas.

## Procedimento antes da FASE 18

Em um banco de teste/homologação:

```bash
npm run db:check
npm run audit:integrity
npm run db:migrate
npm test
npm run audit:integrity
```

A primeira auditoria é útil antes da migration 020 para descobrir duplicidades históricas que fariam as novas constraints falharem. Não force a migration corrigindo registros diretamente: investigue cada achado e use operações de negócio/ajustes rastreáveis.

## Limitação desta execução

A revisão estática, testes unitários e sintaxe foram executados sem credenciais reais. A auditoria SQL não foi executada contra o MySQL real da loja; portanto a ausência de inconsistências nos dados reais ainda não pode ser afirmada.
