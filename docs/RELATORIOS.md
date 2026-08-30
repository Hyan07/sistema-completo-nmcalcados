# Relatórios - FASE 13

## Princípio

Relatórios são projeções de leitura sobre as tabelas transacionais já existentes. A FASE 13 não cria tabelas de saldo, faturamento, estoque ou financeiro paralelas.

A mesma consulta filtrada alimenta três saídas:

- visualização paginada em JSON/tela;
- CSV UTF-8 compatível com planilhas;
- PDF A4 paisagem para impressão/arquivo.

## Relatórios disponíveis

1. **Vendas detalhadas** - uma linha por item de venda, com vendedor, cliente, SKU, grade, quantidade, preço e desconto.
2. **Produtos e grade** - cadastro do produto, marca/categoria, quantidade de SKUs e posição consolidada de estoque.
3. **Posição de estoque** - saldo atual por SKU, mínimo, situação, custo e valor potencial.
4. **Movimentações de estoque** - ledger imutável com saldo anterior, variação, saldo novo, usuário, motivo e referência comercial.
5. **Compras detalhadas** - uma linha por item de compra, com pedido/recebido/pendente e custos.
6. **Clientes** - dados operacionais mínimos, documento mascarado e histórico comercial agregado.
7. **Fornecedores** - dados operacionais mínimos, documento mascarado e compras agregadas.
8. **Caixa** - sessões, entradas/saídas físicas, esperado, declarado e diferenças.
9. **Financeiro** - contas a receber/pagar, vencimento, origem, valor original e saldo em aberto.

## Segurança e permissões

Todo relatório exige `reports.read` e também a permissão de leitura do domínio correspondente:

- vendas: `sales.read`;
- produtos: `products.read`;
- estoque/movimentos: `stock.read`;
- compras: `purchases.read`;
- clientes: `customers.read`;
- fornecedores: `suppliers.read`;
- caixa: `cash.read`;
- financeiro: `finance.read`.

Isso impede que `reports.read` isoladamente exponha informações financeiras. A migration da fase concede `reports.read` a Caixa e Estoque; esses perfis continuam limitados pelos acessos do próprio domínio.

Respostas usam `Cache-Control: no-store`. Exportações CSV/PDF geram auditoria `REPORT_EXPORTED` contendo apenas tipo, formato, período e quantidade de linhas; termos pesquisados e conteúdo exportado não são duplicados no log.

## Privacidade

Relatórios de clientes e fornecedores não exportam endereço completo, observações ou documento integral. O documento é mascarado e são expostos apenas dados operacionais necessários para gestão.

## Filtros

Relatórios temporais usam 30 dias por padrão e aceitam até 10 anos por consulta. A interface permite filtros de período, pesquisa, status, ativo/inativo, situação de estoque, tipo de movimento e tipo financeiro conforme o relatório.

A tela usa paginação de até 100 linhas por página. Exportações têm limites para proteger memória/CPU do monólito:

- CSV: até 5.000 linhas;
- PDF: até 1.500 linhas.

Acima disso o backend retorna erro e exige filtros mais específicos, sem truncar silenciosamente o arquivo.

## CSV

CSV usa `;`, BOM UTF-8 e escaping de aspas. Valores iniciados por `=`, `+`, `-` ou `@` recebem prefixo seguro para reduzir risco de formula injection ao abrir em Excel/LibreOffice.

## PDF

PDF é gerado no backend com PDFKit, A4 paisagem, cabeçalho, período e paginação. Para preservar legibilidade, o PDF usa até as 10 primeiras colunas do relatório; o CSV continua contendo todas as colunas.

## Endpoints

- `GET /api/reports/catalog`
- `GET /api/reports/sales`
- `GET /api/reports/products`
- `GET /api/reports/stock`
- `GET /api/reports/stock-movements`
- `GET /api/reports/purchases`
- `GET /api/reports/customers`
- `GET /api/reports/suppliers`
- `GET /api/reports/cash`
- `GET /api/reports/finance`

Parâmetro `format`: `json`, `csv` ou `pdf`.

Tela: `/pages/reports.html`.

## Limite da fase

A FASE 13 entrega relatórios operacionais/gerenciais e exportações. Catálogo público e pedidos online continuam nas FASES 14 e 15.
