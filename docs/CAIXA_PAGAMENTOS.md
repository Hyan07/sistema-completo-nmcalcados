# Caixa e formas de pagamento — FASE 10

## Separação contábil

A FASE 10 mantém três fatos distintos:

1. **Venda**: `sales`/`sale_items` registram o fato comercial e a baixa de estoque.
2. **Alocação de pagamento**: `sale_payment_allocations` informa como o total da venda foi distribuído entre dinheiro, PIX e cartões.
3. **Recebimento**: `receipts` e `receipt_allocations` registram valores efetivamente recebidos; valores ainda não liquidados permanecem em `receivables`.

Uma venda pode estar `COMPLETED` e ainda possuir pagamento `UNPAID` ou `PARTIAL`. O status financeiro é derivado, não gravado na venda.

## Formas padrão

A migration `013_cash_payments_phase10.sql` registra:

- `CASH`: dinheiro; exige sessão de caixa e gera recebimento imediato;
- `PIX`: recebimento imediato, sem alterar numerário da gaveta;
- `DEBIT_CARD`: gera conta a receber da adquirente;
- `CREDIT_CARD`: gera uma ou mais contas a receber da adquirente.

Na FASE 10, parcelamento acima de 1x é aceito somente para cartão de crédito, até 12 parcelas. Diferenças de centavos são distribuídas entre as primeiras parcelas para que a soma seja exatamente igual ao valor alocado.

## Múltiplas formas

Uma venda pode receber vários meios na mesma operação ou em lotes separados. O backend impede que a soma das alocações confirmadas ultrapasse `sales.total_amount`.

Exemplo para venda de R$ 300,00:

- R$ 50,00 em dinheiro;
- R$ 100,00 em PIX;
- R$ 150,00 em crédito 3x.

A venda fica financeiramente `SETTLED` quando a soma das alocações confirmadas atinge exatamente R$ 300,00, embora as parcelas do cartão ainda permaneçam como recebíveis abertos até a liquidação financeira futura.

## Lotes e idempotência

`sale_payment_batches.operation_key` identifica uma tentativa lógica de pagamento. Reenvio da mesma chave com os mesmos dados devolve o lote já existente; reutilizar a chave com dados diferentes gera conflito.

Recebimentos e movimentos de caixa também possuem `operation_key` única. As chaves internas são derivadas por SHA-256 a partir da operação principal.

## Caixa físico

`cash_sessions` representa o período entre abertura e fechamento de um terminal. Um terminal só pode possuir uma sessão aberta por vez e o operador não pode abrir uma segunda sessão enquanto já tiver uma aberta.

O esperado no fechamento considera apenas numerário físico:

`saldo inicial + entradas de dinheiro + suprimentos - sangrias - estornos em dinheiro`

PIX, débito e crédito aparecem no resumo por forma de pagamento da sessão quando o lote foi vinculado a ela, mas não alteram o saldo esperado da gaveta.

O fechamento grava:

- saldo esperado;
- saldo declarado/contado;
- diferença;
- usuário e horário.

A diferença é preservada para auditoria; não existe ajuste automático para “zerar” divergência.

## Ledger de caixa

Tipos da fase:

- `SALE_RECEIPT`: entrada por venda em dinheiro;
- `CASH_SUPPLY`: suprimento manual;
- `CASH_WITHDRAWAL`: sangria manual;
- `RECEIPT_REVERSAL`: saída decorrente de estorno de recebimento em dinheiro.

`cash_movements`, `sale_payment_allocations` e `receipt_allocations` são protegidos contra `UPDATE` e `DELETE`. Correções usam novos eventos ou status de reversão, preservando a trilha histórica.

## Cancelamento de venda paga

O endpoint de cancelamento de vendas passou a usar estorno integrado:

1. bloqueia a venda;
2. reverte recebimentos confirmados elegíveis;
3. cancela recebíveis do lote;
4. marca lotes de pagamento como `REVERSED`;
5. para dinheiro, cria `RECEIPT_REVERSAL` no caixa ainda aberto;
6. gera `SALE_CANCEL` para cada SKU;
7. marca a venda `CANCELLED`;
8. confirma tudo na mesma transação.

Se o dinheiro foi recebido em uma sessão já fechada, a FASE 10 bloqueia o cancelamento. Alterar retrospectivamente um caixa fechado quebraria a conferência histórica; esse caso deverá usar o fluxo financeiro de devolução/estorno da fase financeira.

## Permissões

- `cash.read`: consultar caixas, sessões e movimentos;
- `cash.manage`: cadastrar terminal, abrir/fechar sessão, suprimento e sangria;
- `payments.read`: consultar formas, alocações, recebíveis e recebimentos da venda;
- `payments.manage`: registrar pagamento da venda;
- `sales.cancel`: continua obrigatório para cancelar a venda e acionar o estorno integrado.

Perfis base:

- Administrador/Gerente/Caixa: consulta de caixa e pagamentos;
- Administrador/Gerente/Caixa: registro de pagamentos;
- Vendedor: consulta de pagamentos;
- `cash.manage` permanece conforme os perfis definidos na FASE 3.

## Endpoints

### Caixa

- `GET /api/cash/registers`
- `POST /api/cash/registers`
- `PATCH /api/cash/registers/:id`
- `GET /api/cash/sessions`
- `GET /api/cash/sessions/current`
- `POST /api/cash/sessions`
- `GET /api/cash/sessions/:id`
- `POST /api/cash/sessions/:id/movements`
- `POST /api/cash/sessions/:id/close`

### Pagamentos

- `GET /api/payments/methods`
- `GET /api/payments/sales/:saleId`
- `POST /api/payments/sales/:saleId`

Telas: `/pages/pos.html` e `/pages/cash.html`.

## Limite da fase

A FASE 10 cria os recebíveis decorrentes de cartão, mas não realiza conciliação bancária/adquirente nem liquidação posterior dessas parcelas. Contas a receber, recebimentos posteriores, despesas, contas a pagar e fluxo financeiro completo pertencem à FASE 11.
