# Catálogo Público — FASE 14

## Objetivo

A FASE 14 disponibiliza uma vitrine pública da NM Calçados usando exclusivamente dados comerciais já existentes. O catálogo não cria uma cópia de produtos, preços ou estoque e não reutiliza endpoints administrativos.

Página pública: `/catalog/`.

## Regra de publicação

Um produto só pode aparecer quando:

- `products.is_active = 1`;
- `products.is_catalog_visible = 1`.

Variantes, cores, tamanhos e SKUs inativos não são expostos. Imagens vinculadas a variante inativa também não são publicadas.

A publicação continua sendo controlada pelo módulo administrativo de Produtos através de `catalog.manage`/`products.manage` já existente; a API pública não possui endpoints de escrita.

## Dados expostos

A API pública retorna apenas dados necessários à vitrine:

- nome e descrição comercial;
- modelo, coleção, material e público;
- categoria e marca;
- fotos;
- cores e tamanhos ativos;
- preço efetivo;
- disponibilidade booleana por tamanho;
- identificador técnico do SKU para permitir a futura reserva da FASE 15.

Não são expostos:

- custo e margem;
- código interno do produto;
- SKU textual ou código de barras;
- quantidade exata em estoque;
- estoque mínimo;
- histórico de estoque;
- dados de usuários, clientes ou fornecedores;
- auditoria ou informações financeiras.

## Preço

A resolução do preço segue a mesma precedência comercial usada no PDV:

1. promoção específica do SKU;
2. preço específico do SKU;
3. promoção do produto;
4. preço-base do produto.

O card apresenta uma faixa quando diferentes tamanhos possuem preços efetivos diferentes. O detalhe apresenta o preço por tamanho.

## Disponibilidade

A vitrine nunca retorna `stock_balances.quantity`. Cada tamanho possui apenas `available: true|false`, calculado por `quantity > 0`.

Essa disponibilidade é informativa e pode mudar após uma venda. Na FASE 15, qualquer reserva/pedido deverá revalidar o saldo dentro de transação antes de assumir disponibilidade.

## Filtros

`GET /api/catalog/products` aceita:

- `q` — pesquisa por nome/modelo/descrição/marca/categoria;
- `category` — slug da categoria;
- `brand` — slug da marca;
- `audience` — público;
- `featured` — destaque;
- `availability` — `all`, `available` ou `unavailable`;
- `sort` — `featured`, `newest`, `price_asc`, `price_desc` ou `name`;
- `page`;
- `pageSize`, máximo 24.

## Endpoints públicos

- `GET /api/catalog/meta`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:id`

Essas rotas não usam autenticação, mas possuem validação rígida, SQL parametrizado e rate limit em memória de 180 requisições/minuto por IP. Em uma futura implantação com múltiplas instâncias, esse rate limit deverá migrar para armazenamento compartilhado.

## Cache

As respostas utilizam cache público curto (`max-age=20`) com `stale-while-revalidate=40`. O objetivo é reduzir leituras repetidas sem transformar o catálogo em uma fonte de estoque confiável para reserva.

## Interface

A página usa apenas HTML, CSS e JavaScript puro. Possui:

- hero com pesquisa;
- filtros responsivos;
- paginação;
- ordenação;
- cards com foto/preço/disponibilidade;
- detalhe em dialog com galeria;
- agrupamento por cor;
- tamanhos disponíveis/indisponíveis;
- URL compartilhável com filtros e produto aberto.

Nenhum dado fictício de contato, endereço ou rede social foi inserido.

## Banco

A migration `017_public_catalog_phase14.sql` adiciona apenas índices de leitura para variante, SKU e imagem. Não existe tabela paralela de catálogo.

## Limite da fase

A FASE 14 é somente vitrine. Ela não cria carrinho, reserva, pedido, cliente anônimo ou baixa/bloqueio de estoque. Esses fluxos pertencem à FASE 15 — Pedidos e Reservas pelo Catálogo.
