# PDV e vendas — FASE 9

## Princípio comercial

A venda é controlada separadamente de recebimentos e caixa.

- `DRAFT`: venda em montagem; não altera estoque.
- `COMPLETED`: venda finalizada; cada item gera uma movimentação `SALE`.
- `CANCELLED`: venda concluída cancelada antes de possuir vínculos financeiros; cada item gera `SALE_CANCEL`.
- `PARTIALLY_RETURNED` e `RETURNED`: reservados para devoluções futuras.

A FASE 9 não cria `sale_payment_allocations`, `receipts`, `receivables` ou movimentos de caixa. Esses vínculos pertencem à FASE 10 e às fases financeiras.

## Preço e snapshots

Ao inserir um SKU no rascunho, o preço vigente é resolvido na seguinte precedência: preço promocional do SKU; preço de venda específico do SKU; preço promocional do produto; preço-base de venda do produto. O valor fica gravado em `sale_items.original_unit_price` e alterações posteriores no cadastro não reescrevem a venda.

## Descontos

Vendedor/Caixa podem montar e finalizar vendas pelo preço vigente através de `sales.create`. Desconto manual de item, desconto geral e acréscimo exigem `sales.discount`. Administrador e Gerente recebem essa permissão por padrão.

`discount_amount` no item representa o desconto total da linha. `line_total` é a verdade monetária da linha; `effective_unit_price` é uma média unitária arredondada para duas casas.

## Finalização transacional

A finalização exige `operationKey` única. O backend bloqueia a venda, recalcula totais, valida cliente/itens/SKUs, baixa cada item com `stockService.applyStockMovement(..., { connection })`, registra `SALE`, marca a venda `COMPLETED`, audita e confirma tudo na mesma transação. Se qualquer SKU não possuir saldo suficiente, a transação inteira é revertida.

## Cancelamento

Cancelamento exige `sales.cancel`, motivo e chave idempotente. Somente venda `COMPLETED`, ainda sem alocações de pagamento ou contas a receber, pode ser cancelada nesta fase. O serviço gera `SALE_CANCEL` para todos os itens e marca a venda `CANCELLED` na mesma transação.

## Itens em rascunho

Itens podem ser adicionados, ter quantidade alterada ou ser cancelados logicamente somente em `DRAFT`. Não há exclusão física pelo fluxo administrativo.

## Idempotência

`sales.completion_operation_key` e `sales.cancellation_operation_key` são únicas. Cada movimentação de estoque recebe SHA-256 derivado da operação, item e tipo (`SALE` ou `SALE_CANCEL`).

## Permissões

- `sales.read`: consultar vendas e PDV;
- `sales.create`: criar/editar rascunho e finalizar;
- `sales.discount`: aplicar descontos/acréscimos;
- `sales.cancel`: cancelar venda concluída conforme regras.

## Endpoints

- `GET /api/sales`
- `GET /api/sales/meta/skus?q=`
- `GET /api/sales/:id`
- `POST /api/sales`
- `PATCH /api/sales/:id`
- `POST /api/sales/:id/items`
- `PATCH /api/sales/:id/items/:itemId`
- `POST /api/sales/:id/items/:itemId/cancel`
- `PATCH /api/sales/:id/pricing`
- `PATCH /api/sales/:id/items/:itemId/discount`
- `POST /api/sales/:id/finalize`
- `POST /api/sales/:id/cancel`

Tela: `/pages/pos.html`.
