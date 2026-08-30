# Importação dos Dados Reais — FASE 16

## Princípio

A importação de dados reais não grava planilhas diretamente nas tabelas comerciais. O fluxo possui duas etapas obrigatórias:

1. **Validar** o arquivo completo, sem alterar os cadastros;
2. **Aplicar** exatamente o mesmo arquivo validado, dentro de uma transação.

A aplicação é `create-only`: nenhum cliente, fornecedor, produto, SKU ou barcode já existente é sobrescrito silenciosamente.

## Formato oficial

A FASE 16 utiliza **CSV UTF-8**. O parser aceita `;`, `,` ou tabulação, BOM UTF-8, campos entre aspas, aspas escapadas e quebras de linha dentro de campo citado.

Limites:

- 5 MB por arquivo;
- 5.000 linhas de dados por lote;
- 1 arquivo por requisição;
- 10.000 caracteres por célula.

O arquivo é recebido em memória. O conteúdo bruto não é salvo em disco nem copiado para tabela de staging.

## Lotes e privacidade

`data_import_batches` persiste apenas:

- tipo de importação;
- nome técnico do modelo (`catalog.csv`, `customers.csv`, etc.);
- SHA-256 do arquivo;
- status;
- contagem de linhas válidas/inválidas;
- erros por número de linha/código/mensagem;
- resumo de aplicação;
- usuário e timestamps.

Não são persistidas cópias das linhas originais, CPF/CNPJ, telefones, endereços ou preços em staging.

## Tipos

### `catalog`

Uma linha por SKU. Pode criar, no mesmo lote:

- categoria de primeiro nível, se ainda não existir;
- marca;
- cor;
- tamanho;
- produto;
- variante produto/cor;
- SKU;
- saldo técnico zero em `stock_balances`.

Campos principais:

`internal_code,name,category,brand,description,model,audience,collection_name,material,base_cost_price,base_sale_price,promotional_price,is_catalog_visible,color,color_hex,size,size_sort_order,sku,barcode,cost_price,sale_price,sku_promotional_price,minimum_stock`

Regras importantes:

- o mesmo `internal_code` pode aparecer em várias linhas para formar a grade, mas os dados do produto precisam ser idênticos;
- `SKU` e barcode são únicos no arquivo e no banco;
- produto + cor + tamanho só pode aparecer uma vez;
- uma cor repetida precisa manter o mesmo HEX;
- um tamanho repetido precisa manter a mesma ordenação dentro do arquivo;
- cadastros auxiliares existentes são reutilizados, nunca reativados/alterados automaticamente;
- imagens não são importadas por CSV nesta fase.

### `customers`

Campos:

`name,document,phone,whatsapp,email,birth_date,postal_code,street,street_number,address_complement,neighborhood,city,state,notes,is_active`

As mesmas validações do cadastro normal são reutilizadas, inclusive CPF/CNPJ, e-mail, telefone, CEP e UF.

### `suppliers`

Campos:

`legal_name,trade_name,document,contact_name,phone,whatsapp,email,postal_code,street,street_number,address_complement,neighborhood,city,state,notes,is_active`

Também reutiliza as regras normais do módulo de fornecedores.

### `opening_stock`

Campos:

`sku,quantity,reason`

O saldo inicial **não** executa `UPDATE stock_balances` diretamente. Cada linha chama o serviço transacional de estoque com `INITIAL_BALANCE` e chave idempotente derivada do lote.

Só é permitido quando o SKU:

- existe e está ativo;
- possui saldo físico zero;
- não possui nenhuma movimentação anterior.

Assim a implantação deixa histórico completo desde o primeiro saldo.

## Dry-run / validação

`POST /api/imports/validate` recebe `type`, `operationKey` e `file` via `multipart/form-data`.

A validação verifica:

- estrutura/cabeçalho;
- tipos e valores;
- duplicidades internas;
- consistência entre linhas;
- constraints comerciais;
- conflitos com o banco atual.

Nenhum dado comercial é inserido.

## Aplicação

`POST /api/imports/:id/apply` exige:

- o mesmo arquivo byte a byte (SHA-256 igual);
- nova `operationKey`;
- confirmação textual `IMPORTAR`;
- lote previamente válido.

Antes de gravar, o backend reexecuta a validação dentro da conexão transacional. Se o contexto do banco mudou desde o dry-run, o lote é recusado.

A aplicação inteira usa uma única transação. Qualquer erro produz rollback do lote.

## Idempotência

- `validation_operation_key` é única;
- `apply_operation_key` é única;
- o SHA-256 garante que aplicação e validação referem-se ao mesmo arquivo;
- saldo inicial deriva uma chave SHA-256 por linha/SKU e utiliza a idempotência do estoque.

## Permissões

- `imports.read`: modelos e histórico;
- `imports.manage`: validar e aplicar.

Padrão:

- Administrador: leitura + gestão;
- Gerente: somente leitura.

Permissões continuam podendo ser concedidas individualmente pelo RBAC existente.

## Endpoints

- `GET /api/imports/templates/:type`
- `GET /api/imports`
- `GET /api/imports/:id`
- `POST /api/imports/validate`
- `POST /api/imports/:id/apply`

Tela: `/pages/imports.html`.

## Ordem recomendada para implantação

1. `catalog`;
2. revisar produtos/grade no sistema;
3. `customers`;
4. `suppliers`;
5. `opening_stock` por último, antes de iniciar vendas reais.

Não importe saldo inicial depois que o SKU já começou a operar.

## O que não foi carregado automaticamente

A FASE 16 entrega o mecanismo seguro de migração. A carga dos **dados reais específicos da NM Calçados** depende dos arquivos fornecidos pelo operador. Sem arquivos reais anexados/configurados, nenhuma informação comercial ou pessoal é inventada e nenhuma carga é executada.

## Próxima fase

A FASE 17 é a auditoria completa dos fluxos e regras integradas do sistema.
