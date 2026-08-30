# Controle de estoque — FASE 6

## Princípio central

O estoque é controlado exclusivamente no SKU final (`produto → cor/variante → tamanho/SKU`). A tabela `stock_balances` existe para leitura rápida do saldo atual; a verdade histórica de cada alteração fica em `stock_movements`.

Nenhum endpoint da aplicação permite gravar diretamente uma quantidade em `stock_balances`. Toda alteração de saldo passa pelo serviço transacional de estoque e gera uma movimentação com saldo anterior, variação, saldo novo, usuário, motivo, tipo e data.

## Concorrência e saldo negativo

Antes de movimentar um SKU, o serviço garante a existência da linha em `stock_balances` e executa `SELECT ... FOR UPDATE`. Duas operações concorrentes sobre o mesmo SKU são serializadas pelo MySQL. A nova quantidade é calculada ainda dentro da transação e uma saída que resultaria em saldo negativo é rejeitada com conflito.

A gravação da movimentação, a atualização do saldo e o registro de auditoria pertencem à mesma transação.

## Idempotência

`stock_movements.operation_key` é único. Operações feitas pela API exigem uma chave de 16 a 64 caracteres. O frontend gera uma chave nova por ação.

Se a mesma requisição for reenviada com a mesma chave e os mesmos dados, o sistema devolve a movimentação já criada sem duplicar o estoque. Reutilizar a mesma chave para dados diferentes gera conflito.

Essa regra será reutilizada por compras, vendas e importações nas fases posteriores.

## Imutabilidade

A migration da FASE 6 cria triggers MySQL que bloqueiam `UPDATE` e `DELETE` em `stock_movements`. Correções devem ser feitas por uma nova movimentação inversa/ajuste, preservando a trilha histórica.

## Tipos oficiais

- `INITIAL_BALANCE`: saldo inicial/importação futura;
- `MANUAL_ENTRY`: entrada manual;
- `MANUAL_EXIT`: saída manual;
- `INVENTORY_GAIN`: diferença positiva apurada em inventário;
- `INVENTORY_LOSS`: diferença negativa apurada em inventário;
- `LOSS`: perda ou avaria;
- `PURCHASE_RECEIPT`: recebimento de compra (FASE 8);
- `SUPPLIER_RETURN`: devolução ao fornecedor;
- `SALE`: baixa de venda (FASE 9);
- `SALE_CANCEL`: estorno de venda;
- `CUSTOMER_RETURN`: devolução de cliente.

Na FASE 6 a API administrativa expõe apenas entrada manual, saída manual, perda/avaria e contagem física. Os tipos comerciais ficam reservados aos serviços internos das fases correspondentes.

## Contagem física

A contagem recebe a quantidade efetivamente encontrada. Sob lock do SKU, o serviço compara o contado com o saldo atual:

- contado maior: gera `INVENTORY_GAIN`;
- contado menor: gera `INVENTORY_LOSS`;
- igual: nenhuma movimentação de quantidade é criada, mas a conferência fica registrada em `audit_logs`.

## Estoque mínimo e alertas

Cada SKU já possui `minimum_stock`. A consulta classifica:

- `OUT_OF_STOCK`: saldo zero em SKU ativo;
- `LOW_STOCK`: saldo positivo menor ou igual ao mínimo;
- `OK`: saldo acima do mínimo;
- `INACTIVE`: produto/variante/SKU inativo sem saldo;
- `INACTIVE_WITH_STOCK`: item inativo que ainda possui unidades e exige atenção operacional.

## Permissões

- `stock.read`: consultar saldos, alertas, tipos e histórico;
- `stock.manage`: realizar entrada, saída, perda e ajuste por contagem.

Vendedor e Caixa recebem leitura; Administrador, Gerente e Estoque recebem leitura e já possuem `stock.manage` pelos perfis base. Permissões diretas e cargos acumulados continuam funcionando conforme a FASE 3.

## Endpoints

- `GET /api/stock/summary`
- `GET /api/stock/items`
- `GET /api/stock/items/:skuId`
- `GET /api/stock/movement-types`
- `GET /api/stock/movements`
- `POST /api/stock/items/:skuId/movements`
- `POST /api/stock/items/:skuId/count`

Tela administrativa: `/pages/stock.html`.

## Integração futura

`stockService.applyStockMovement(input, { connection })` aceita uma conexão MySQL já transacionada. Compras e vendas deverão chamá-lo usando a mesma conexão da operação comercial, garantindo atomicidade entre documento, item comercial e estoque.

Uma compra cadastrada não movimentará estoque: somente o recebimento confirmado usará `PURCHASE_RECEIPT`. Uma venda concluída usará `SALE`; cancelamento/devolução deverá gerar uma movimentação correspondente, nunca apagar a baixa original.
