# Financeiro — FASE 11

## Princípio contábil

A FASE 11 mantém fatos distintos e auditáveis:

- venda não é recebimento;
- compra não é pagamento;
- recebimento físico de mercadoria não cria pagamento ao fornecedor;
- alocação de forma de pagamento não significa necessariamente liquidação bancária;
- caixa físico representa apenas numerário realmente movimentado.

## Contas a receber

`receivables` pode nascer de `SALE` (incluindo recebíveis de cartão) ou `MANUAL`. A conta mantém valor original e saldo em aberto. Liquidações podem ser parciais; o status evolui entre `OPEN`, `PARTIAL`, `PAID` e `CANCELLED`.

A liquidação usa `receipts` + `receipt_allocations`. Estorno marca o recebimento como `REVERSED`, reabre o saldo da conta e, quando o meio foi dinheiro, gera `RECEIPT_REVERSAL` no caixa original ainda aberto.

## Contas a pagar

`payables` pode nascer de `PURCHASE`, após financeirização explícita da compra recebida, ou de `MANUAL`. Pagamentos usam `disbursements` + `disbursement_allocations` e podem ser parciais.

Estorno marca o desembolso como `REVERSED`, reabre o saldo da conta e, se houve dinheiro físico, gera `DISBURSEMENT_REVERSAL` no caixa ainda aberto.

## Financeirização de compras

Somente compra em estado `RECEIVED` pode gerar contas a pagar. O endpoint aceita de 1 a 36 parcelas e exige que a soma seja exatamente igual a `purchases.total_amount`.

Cada parcela vira um `payable` com `source_type = PURCHASE`; a compra recebe `financialized_at`, usuário responsável e `financialization_operation_key`. A categoria padrão `PURCHASES` é utilizada.

## Liquidação de cartão

Débito/crédito criados na FASE 10 permanecem como recebíveis da adquirente. Na FASE 11 esses recebíveis podem ser liquidados por PIX ou `BANK_TRANSFER`, sem criar nova venda nem alterar estoque.

A fase ainda não cria livro de contas bancárias/conciliação por extrato. O fluxo é derivado de recebimentos e desembolsos confirmados.

## Meios de liquidação

- `CASH`: exige sessão de caixa aberta do operador;
- `PIX`: liquidação não física;
- `BANK_TRANSFER`: liquidação não física.

Meios com `creates_receivable = 1` não podem liquidar uma conta financeira, para evitar criar outro recebível em cascata.

## Caixa e imutabilidade

Novos tipos de caixa:

- `RECEIVABLE_RECEIPT` — entrada em dinheiro por conta a receber;
- `PAYABLE_PAYMENT` — saída em dinheiro por conta a pagar;
- `DISBURSEMENT_REVERSAL` — entrada por estorno de pagamento em dinheiro.

`disbursement_allocations` é protegido contra `UPDATE` e `DELETE`. Se a liquidação em dinheiro pertence a caixa já fechado, o estorno retroativo é bloqueado para preservar a conferência histórica.

## Receitas e despesas manuais

`finance.manage` permite criar contas manuais com descrição, vencimento, valor, contraparte opcional e categoria. Cancelamento manual só é permitido enquanto a conta estiver integralmente aberta e nunca liquidada.

## Categorias financeiras

Categorias são hierárquicas e têm tipo `INCOME` ou `EXPENSE`. Pai e filho precisam possuir o mesmo tipo; ciclos são proibidos. Categoria já utilizada não pode trocar de tipo.

Categorias padrão: `OTHER_INCOME`, `PURCHASES`, `OPERATING_EXPENSE`.

## Indicadores e fluxo

O resumo informa a receber/pagar em aberto e vencido, recebimentos do dia, pagamentos do dia e fluxo líquido. `GET /api/finance/flow` consolida entradas e saídas confirmadas por dia.

## Permissões

- `finance.read`: consultar contas, transações, compras pendentes e fluxo;
- `finance.manage`: criar/cancelar contas manuais, liquidar, estornar, gerenciar categorias e financeirizar compras.

Administrador e Gerente mantêm `finance.manage`. Administrador, Gerente e Caixa recebem `finance.read` por padrão.

## Endpoints

- `GET /api/finance/summary`
- `GET /api/finance/flow`
- `GET /api/finance/transactions`
- `GET|POST /api/finance/categories`
- `PATCH /api/finance/categories/:id`
- `GET|POST /api/finance/receivables`
- `POST /api/finance/receivables/:id/receive`
- `POST /api/finance/receivables/:id/cancel`
- `POST /api/finance/receipts/:id/reverse`
- `GET|POST /api/finance/payables`
- `POST /api/finance/payables/:id/pay`
- `POST /api/finance/payables/:id/cancel`
- `POST /api/finance/disbursements/:id/reverse`
- `GET /api/finance/purchases/pending`
- `POST /api/finance/purchases/:id/financialize`

Tela: `/pages/finance.html`.

## Limite da fase

A FASE 11 fecha contas a pagar/receber e fluxo financeiro, mas não implementa conciliação bancária por extrato, DRE contábil completa, dashboard executivo ou relatórios gerenciais avançados. O dashboard é a FASE 12.
