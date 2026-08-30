# Pedidos e Reservas pelo Catálogo — FASE 15

## Princípio

Pedido online, reserva, venda e baixa física de estoque são fatos diferentes:

- enviar um pedido público **não** altera `stock_balances` e não cria `stock_movements`;
- confirmar internamente o pedido cria `stock_reservations`, mas não baixa o estoque físico;
- converter o pedido cria uma venda em `DRAFT` vinculada ao pedido;
- somente `finalizeSale()` cria a movimentação `SALE` e reduz `stock_balances`.

## Fluxo

`NEW → WAITING_SERVICE → NEGOTIATING → CONFIRMED → CONVERTED`.

Também existem `CANCELLED` e `EXPIRED`. Reserva expirada pode voltar para `NEGOTIATING` e ser confirmada novamente, sempre revalidando saldo.

## Pedido público

`POST /api/catalog/orders` recebe de 1 a 20 itens, no máximo 10 unidades por SKU, dados mínimos de contato, `operationKey` e `trackingToken` gerados pelo navegador.

O backend:

1. normaliza/valida contato e itens;
2. rejeita SKU duplicado;
3. revalida produto/variante/cor/tamanho/SKU ativos e publicados;
4. bloqueia cada saldo durante a leitura;
5. desconta reservas ativas da disponibilidade livre;
6. congela nome, grade, SKU interno (somente no banco), preço unitário e total do item;
7. cria `catalog_orders` + `catalog_order_items`;
8. não cria reserva e não movimenta estoque.

A chave pública é idempotente. O token de acompanhamento é persistido somente como SHA-256.

## Acompanhamento público

`POST /api/catalog/orders/track` exige número do pedido e token. O token não vai em query string.

A resposta pública não retorna nome, telefone, WhatsApp, e-mail, usuário responsável, estoque exato ou dados administrativos. Os estados são apresentados como `RECEIVED`, `IN_SERVICE`, `NEGOTIATING`, `RESERVED`, `CONVERTED`, `CANCELLED` ou `EXPIRED`.

## Reserva

`POST /api/catalog-orders/:id/confirm` exige `catalog.orders.manage`.

O prazo padrão é 48 horas e pode variar entre 1 e 168 horas. Na mesma transação:

1. o pedido é bloqueado;
2. reservas vencidas são expiradas;
3. itens são bloqueados por SKU em ordem estável;
4. `stock_balances` é bloqueado com `FOR UPDATE`;
5. calcula-se `estoque físico - reservas ativas`;
6. se algum item não couber, tudo é revertido;
7. cria-se uma reserva por item;
8. pedido muda para `CONFIRMED`.

Reserva não é movimentação de estoque.

## Proteção do estoque reservado

A FASE 15 evolui `stockRepository.updateBalance()`: qualquer redução física verifica quanto do saldo está protegido por reservas ativas. Se a nova quantidade física ficaria abaixo do total reservado, a operação é rejeitada com conflito.

Quando a redução é uma `SALE` originada de um pedido convertido, a reserva daquele pedido/SKU é consumida dentro da mesma transação imediatamente antes da atualização de `stock_balances`. Se a venda falhar, consumo da reserva e movimentação também sofrem rollback.

Isso protege a reserva contra venda comum, saída manual, perda/avaria e devolução ao fornecedor.

## Conversão em venda

`POST /api/catalog-orders/:id/convert` exige `catalog.orders.manage` + `sales.create`.

Somente `CONFIRMED` com reserva ativa pode converter. O sistema cria uma venda `DRAFT`, preservando snapshots e preços do pedido, liga `catalog_orders.converted_sale_id` e torna a reserva sem expiração até a venda ser concluída ou o pedido convertido ser cancelado.

Converter não movimenta estoque.

## Cancelamento

Antes da conversão, cancelar libera reservas ativas. Depois da conversão, se a venda vinculada ainda estiver `DRAFT`, ela é cancelada sem movimento de estoque e a reserva é liberada. Se a venda já estiver `COMPLETED`, o pedido não pode ser cancelado isoladamente; deve-se usar o fluxo de cancelamento/estorno da venda.

## Permissões

- `catalog.orders.read`: consultar pedidos/reservas;
- `catalog.orders.manage`: atender, reservar, converter e cancelar.

Administrador, Gerente e Vendedor recebem ambas por padrão. A conversão ainda exige `sales.create`.

## Privacidade e abuso

- contatos públicos não são gravados em `audit_logs`;
- auditoria registra apenas IDs, status, quantidades, prazo e chaves operacionais;
- criação pública tem limite adicional de 8 pedidos por 10 minutos/IP;
- rastreamento tem limite de 30 consultas/minuto/IP;
- existe honeypot simples contra submissão automatizada;
- SQL continua parametrizado.

## Endpoints

### Públicos
- `POST /api/catalog/orders`
- `POST /api/catalog/orders/track`

### Internos
- `GET /api/catalog-orders`
- `GET /api/catalog-orders/:id`
- `PATCH /api/catalog-orders/:id`
- `POST /api/catalog-orders/:id/confirm`
- `POST /api/catalog-orders/:id/convert`
- `POST /api/catalog-orders/:id/cancel`

Telas: `/catalog/` e `/pages/catalog-orders.html`.

## Limite da fase

A FASE 15 não cria checkout com pagamento online, frete, entrega, integração com gateway ou emissão fiscal. A FASE 16 é a importação dos dados reais.
