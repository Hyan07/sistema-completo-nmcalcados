# Fornecedores e compras — FASE 8

A FASE 8 implementa fornecedores, compras, itens de compra e recebimento físico. **Registrar uma compra não altera estoque**; somente recebimento confirmado gera `PURCHASE_RECEIPT`.

Fluxo: `DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED`. Compra sem recebimento pode ser `CANCELLED`.

Recebimentos são parciais ou totais e usam uma única transação: bloqueio da compra/itens, validação do pendente, criação de `purchase_receipts`, movimentação de estoque, incremento de `quantity_received`, atualização do status e auditoria. Falha em qualquer etapa gera rollback.

Cada recebimento possui `operation_key` única e os movimentos de estoque usam chave SHA-256 determinística por item. Reenvio idêntico não duplica estoque.

`purchase_receipts` e `purchase_receipt_items` são imutáveis por triggers MySQL.

Permissões: `suppliers.read`, `suppliers.manage`, `purchases.read`, `purchases.manage`, `purchases.receive`.

Endpoints principais: `/api/suppliers`, `/api/purchases`, `/api/purchases/:id/order`, `/api/purchases/:id/cancel`, `/api/purchases/:id/receipts`.

A fase não cria pagamento, desembolso ou contas a pagar; financeiro permanece separado.
