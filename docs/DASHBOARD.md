# Dashboard executivo — FASE 12

## Objetivo

O dashboard consolida indicadores derivados dos módulos já transacionados. Nenhum KPI cria uma segunda fonte de verdade: vendas vêm de `sales/sale_items`, estoque de `stock_balances`, compras de `purchases/purchase_items`, caixa de `cash_sessions/cash_movements` e financeiro de `receivables`, `payables`, `receipts` e `disbursements`.

## Permissão

`dashboard.read` controla o acesso ao painel executivo. Administrador e Gerente recebem a permissão por padrão. Outros usuários podem recebê-la diretamente ou por cargos adicionais, conforme o RBAC já implementado.

## Período

`GET /api/dashboard` aceita `dateFrom` e `dateTo` no formato `YYYY-MM-DD`. Sem parâmetros, usa os últimos 30 dias. O intervalo máximo é de 366 dias.

O serviço também calcula automaticamente o período anterior de mesma duração para comparação de:

- faturamento;
- quantidade de vendas;
- ticket médio;
- unidades vendidas.

Quando o período anterior é zero e o atual é positivo, o percentual não é inventado como infinito: a comparação retorna `null` e a interface mostra ausência de base comparável.

## Indicadores comerciais

Somente vendas com `status = COMPLETED` entram em faturamento, ticket médio, unidades vendidas, evolução diária e ranking de produtos. Vendas canceladas ou devolvidas não são tratadas como receita do período.

O painel apresenta:

- faturamento;
- quantidade de vendas;
- ticket médio;
- unidades vendidas;
- série diária de faturamento;
- top 10 produtos por unidades;
- mix de formas de pagamento confirmadas;
- vendas concluídas mais recentes.

## Estoque

O bloco de estoque é posição atual, não histórica do período. Ele mostra:

- SKUs ativos;
- unidades atuais;
- valor estimado pelo custo cadastrado;
- valor potencial de venda pelo preço normal cadastrado;
- SKUs em ruptura;
- SKUs abaixo ou no mínimo;
- lista prioritária de até 10 SKUs em ruptura/baixo estoque.

Valores de estoque são estimativas gerenciais e não substituem inventário contábil/fiscal.

## Compras

Compras pendentes consideram `ORDERED` e `PARTIALLY_RECEIVED`. O painel informa quantidade de compras, valor total dos documentos e unidades físicas ainda pendentes de recebimento.

## Financeiro

A posição financeira exibe:

- contas a receber abertas;
- contas a receber vencidas;
- contas a pagar abertas;
- contas a pagar vencidas;
- recebimentos confirmados no período;
- pagamentos confirmados no período;
- fluxo líquido do período.

O fluxo usa eventos confirmados de recebimento/desembolso e mantém venda diferente de recebimento e compra diferente de pagamento.

## Caixa

O dashboard mostra quantas sessões estão abertas e o numerário físico esperado agregado das sessões abertas. PIX/cartões não são somados ao dinheiro esperado da gaveta porque o cálculo usa exclusivamente `cash_movements` e seus tipos/direções.

Divergências de fechamento dos últimos 7 dias geram alerta executivo, mas não são ajustadas automaticamente.

## Alertas

Alertas derivados:

- `OUT_OF_STOCK`;
- `LOW_STOCK`;
- `OVERDUE_RECEIVABLES`;
- `OVERDUE_PAYABLES`;
- `PENDING_PURCHASES`;
- `CASH_DIFFERENCE`.

Alertas são calculados na leitura; não existe tabela paralela de alertas que possa ficar dessincronizada.

## Endpoint

- `GET /api/dashboard?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

Tela: `/pages/dashboard.html`.

## Limite da fase

A FASE 12 é uma visão executiva. Exportações, filtros analíticos extensos, relatórios detalhados e arquivos PDF/CSV pertencem à FASE 13 — Relatórios.
