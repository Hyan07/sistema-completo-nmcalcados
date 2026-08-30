# PDV e vendas — FASE 9 (integrada à FASE 10)

## Princípio comercial

A venda continua separada de recebimentos e caixa.

- `DRAFT`: venda em montagem; não altera estoque.
- `COMPLETED`: venda finalizada; cada item gera `SALE`.
- `CANCELLED`: venda cancelada; cada item gera `SALE_CANCEL`.
- `PARTIALLY_RETURNED` e `RETURNED`: reservados para devoluções futuras.

A FASE 10 passou a registrar formas de pagamento e recebimentos sem alterar a natureza da venda. O status financeiro é derivado das alocações confirmadas: `UNPAID`, `PARTIAL` ou `SETTLED`.

## Preço e snapshots

Ao inserir um SKU no rascunho, o preço vigente é resolvido na seguinte precedência: preço promocional do SKU; preço de venda específico do SKU; preço promocional do produto; preço-base de venda do produto. O valor fica gravado em `sale_items.original_unit_price` e alterações posteriores no cadastro não reescrevem a venda.

## Descontos

Vendedor/Caixa podem montar e finalizar vendas pelo preço vigente através de `sales.create`. Desconto manual de item, desconto geral e acréscimo exigem `sales.discount`. Administrador e Gerente recebem essa permissão por padrão.

## Finalização transacional

A finalização exige `operationKey` única. O backend bloqueia a venda, recalcula totais, valida cliente/itens/SKUs, baixa cada item com `stockService.applyStockMovement(..., { connection })`, registra `SALE`, marca a venda `COMPLETED`, audita e confirma tudo na mesma transação. Se qualquer SKU não possuir saldo suficiente, a transação inteira é revertida.

Finalizar a venda não significa receber o dinheiro. Os pagamentos são registrados depois em `/api/payments/sales/:saleId`, preservando a distinção entre fato comercial e financeiro.

## Cancelamento integrado após a FASE 10

O mesmo endpoint `POST /api/sales/:id/cancel` continua exigindo `sales.cancel`, motivo e chave idempotente, mas agora coordena também o estorno financeiro quando houver pagamentos:

- reverte recebimentos imediatos elegíveis;
- cancela recebíveis dos lotes;
- marca lotes como revertidos;
- cria saída `RECEIPT_REVERSAL` quando houve dinheiro em caixa ainda aberto;
- gera `SALE_CANCEL` para os SKUs;
- marca a venda `CANCELLED`.

Se o dinheiro pertence a uma sessão de caixa já fechada, o cancelamento é bloqueado para não alterar retrospectivamente um fechamento auditado.

## Permissões

- `sales.read`: consultar vendas e PDV;
- `sales.create`: criar/editar rascunho e finalizar;
- `sales.discount`: aplicar descontos/acréscimos;
- `sales.cancel`: cancelar venda conforme regras;
- `payments.read`/`payments.manage`: consultar e registrar os fatos financeiros da venda (FASE 10).

Tela: `/pages/pos.html`.
