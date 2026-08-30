# Grade de produtos — FASE 5

## Modelo

A grade comercial de calçados segue a hierarquia:

`products → product_variants (cor) → product_skus (tamanho)`

Um produto pode possuir várias cores. Cada cor pode possuir vários tamanhos. O estoque da FASE 6 será controlado no nível do SKU final, nunca no produto genérico.

Exemplo:

- Tênis Urban
  - Preto
    - 38 → SKU URBAN-PRETO-38
    - 39 → SKU URBAN-PRETO-39
  - Branco
    - 38 → SKU URBAN-BRANCO-38

## Cores

Cores são cadastros reutilizáveis, com nome, código hexadecimal opcional e status. Uma cor usada por variante ativa não pode ser desativada enquanto a dependência estiver ativa.

## Tamanhos

Tamanhos possuem rótulo, ordem de apresentação e status. Um tamanho utilizado por SKU ativo não pode ser desativado enquanto a dependência estiver ativa.

## Variantes

Cada produto pode ter no máximo uma variante por cor, restrição já garantida pelo banco. A variante aceita um nome complementar opcional. Ao desativar a variante, seus SKUs ativos são desativados na mesma transação.

Não existe exclusão física no fluxo administrativo desta fase.

## SKUs

Cada combinação variante+tamanho é única. O SKU textual também é único em todo o sistema e o código de barras, quando informado, também é único.

Campos por SKU:

- tamanho;
- SKU;
- código de barras opcional;
- preço de custo opcional;
- preço de venda opcional;
- preço promocional opcional;
- estoque mínimo;
- status.

Preço de custo/venda/promoção vazio significa herdar os valores-base do produto. Quando há promoção específica no SKU, ela não pode superar o preço de venda efetivo.

O cadastro em lote aceita até 50 SKUs por operação e é transacional: se qualquer tamanho, SKU ou código de barras for inválido/conflitante, nenhum item do lote é persistido.

## Imagens por cor

As imagens continuam pertencendo ao produto, mas podem receber `product_variant_id` para indicar a cor correspondente. A FASE 5 não duplica o arquivo físico; apenas altera o vínculo relacional. A imagem pode permanecer sem cor específica.

## Permissões

- `products.read`: consulta cores, tamanhos, grade e SKUs.
- `products.manage`: cria e altera cores, tamanhos, variantes, SKUs e associação de imagens à variante.

Toda autorização é verificada no backend.

## Endpoints

- `GET /api/colors`
- `POST /api/colors`
- `PATCH /api/colors/:id`
- `GET /api/sizes`
- `POST /api/sizes`
- `PATCH /api/sizes/:id`
- `GET /api/products/:productId/grade`
- `POST /api/products/:productId/grade/variants`
- `PATCH /api/products/:productId/grade/variants/:variantId`
- `POST /api/products/:productId/grade/variants/:variantId/skus`
- `PATCH /api/products/:productId/grade/variants/:variantId/skus/:skuId`
- `PATCH /api/products/:productId/grade/images/:imageId/variant`

Tela administrativa: `/pages/grade.html`.

## Limite da fase

Esta fase não altera saldo de estoque e não cria movimentações. `stock_balances` e `stock_movements` serão ativados pela regra transacional da FASE 6.
