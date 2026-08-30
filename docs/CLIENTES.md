# Clientes — FASE 7

## Escopo

A FASE 7 implementa cadastro, consulta, atualização, ativação/inativação e ficha comercial de clientes. Não existe exclusão física no fluxo administrativo.

A tabela `customers` já existia desde o núcleo comercial. A migration desta fase adiciona trilha de criação/última alteração, índices de consulta e a permissão `customers.read`.

## Dados

Campos disponíveis:

- nome;
- CPF/CNPJ opcional;
- telefone;
- WhatsApp;
- e-mail;
- data de nascimento;
- CEP;
- logradouro, número, complemento, bairro, cidade e UF;
- observações;
- status ativo/inativo.

CPF/CNPJ é normalizado para somente dígitos e validado no backend quando informado. Telefone, WhatsApp e CEP também são normalizados antes de persistir. E-mail é armazenado em minúsculas.

## Privacidade

A listagem retorna o documento mascarado. O documento completo fica disponível somente na ficha protegida por `customers.read`.

`audit_logs` não recebe cópias de CPF, telefone, e-mail, endereço ou data de nascimento. A auditoria registra o cliente afetado, o usuário responsável, os nomes dos campos alterados e mudança de status quando houver.

Não devem ser gravados documentos reais em seeds, exemplos ou arquivos versionados.

## Duplicidade

`customers.document` continua único no banco. Como o documento é opcional, vários clientes sem documento podem existir; dois clientes com o mesmo CPF/CNPJ não podem.

A fase não tenta mesclar automaticamente pessoas com nome/telefone semelhantes, pois isso poderia unir clientes distintos. Eventual ferramenta de deduplicação deve ser explícita e auditável em fase posterior.

## Busca rápida

`GET /api/customers/lookup?q=` retorna até 10 clientes ativos e foi preparado para seleção no futuro PDV. A busca considera nome, e-mail, CPF/CNPJ, telefone e WhatsApp.

A listagem administrativa é paginada e aceita os mesmos termos de busca, além de filtro por status.

## Histórico comercial

A ficha consulta, sem duplicar dados:

- quantidade de vendas concluídas/históricas;
- valor total vendido;
- última venda;
- quantidade de contas a receber abertas;
- saldo a receber;
- até 20 vendas recentes;
- até 50 recebíveis em aberto.

Enquanto as fases de PDV e financeiro ainda não tiverem lançado dados, esses indicadores permanecem zero/vazios. A FASE 7 apenas prepara a leitura e não cria vendas nem recebíveis.

## Status

Cliente inativo permanece no histórico e pode continuar vinculado a vendas, recebimentos e contas existentes. Inativar não apaga nem altera documentos comerciais anteriores.

O futuro PDV deverá selecionar clientes ativos para novas vendas, sem impedir consulta ao histórico de clientes inativos.

## Permissões

- `customers.read`: consultar lista, busca rápida, ficha e histórico;
- `customers.manage`: criar e atualizar clientes.

Administrador, Gerente, Vendedor e Caixa recebem `customers.read` na migration desta fase. `customers.manage` já existe nos perfis operacionais definidos na FASE 3 e continua podendo ser combinado por cargos/permissões diretas.

## Endpoints

- `GET /api/customers`
- `GET /api/customers/lookup?q=`
- `GET /api/customers/:id`
- `POST /api/customers`
- `PATCH /api/customers/:id`

Tela administrativa: `/pages/customers.html`.
