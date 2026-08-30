# Categorias, marcas e produtos — FASE 4

## Escopo

A FASE 4 implementa o cadastro administrativo de categorias, marcas, produtos e imagens de produto. A FASE 5 complementa esse módulo com cores, tamanhos, variantes e SKUs, documentados em `GRADE_PRODUTOS.md`.

## Permissões

- `products.read`: consulta categorias, marcas, produtos, imagens e grade.
- `products.manage`: cria e altera categorias, marcas, produtos, imagens e grade.

A autorização é verificada no backend. A interface apenas adapta os controles visíveis à permissão efetiva do usuário.

## Categorias

Categorias aceitam relação pai/filho. O backend impede referência ao próprio registro e ciclos na árvore. Uma categoria com produtos ativos ou subcategorias ativas não pode ser desativada até que essas dependências sejam tratadas.

Não existe exclusão física no fluxo administrativo.

## Marcas

Marcas possuem nome, slug e status. Uma marca com produtos ativos não pode ser desativada silenciosamente. Não existe exclusão física no fluxo administrativo.

## Produtos

Campos implementados: código interno, nome, descrição, categoria, marca, modelo, público, coleção, material, custo base, preço de venda base, preço promocional, ativo, destaque e publicação no catálogo.

Regras principais:

- código interno é único;
- dinheiro usa `DECIMAL(15,2)` no MySQL;
- preço promocional não pode superar o preço normal;
- produto publicado deve estar ativo e possuir preço de venda maior que zero;
- ao desativar um produto, `is_catalog_visible` e `is_featured` são desligados automaticamente;
- alterações relevantes são registradas em `audit_logs`;
- listagem usa paginação e filtros no backend.

A margem exibida é estimada em consulta a partir de custo e venda; ela não é persistida como verdade independente.

## Imagens

O upload aceita somente JPEG, PNG e WebP, até 5 MB por arquivo, no máximo 6 arquivos por requisição e 10 imagens por produto. O servidor valida assinatura binária do arquivo além do MIME informado pelo cliente.

Os arquivos ficam em `uploads/products/`, fora do Git, e são servidos em `/media/products/`. SVG e outros formatos ativos não são aceitos.

A primeira imagem vira principal automaticamente; outra imagem pode ser promovida. Ao remover a principal, a próxima imagem disponível é promovida.

A partir da FASE 5, cada imagem também pode ser associada opcionalmente a uma variante/cor usando `product_variant_id`, sem duplicar o arquivo físico.

## Endpoints da FASE 4

- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `GET /api/brands`
- `POST /api/brands`
- `PATCH /api/brands/:id`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PATCH /api/products/:id`
- `POST /api/products/:id/images`
- `PATCH /api/products/:id/images/:imageId`
- `DELETE /api/products/:id/images/:imageId`

Tela administrativa: `/pages/products.html`. A grade está em `/pages/grade.html`.
