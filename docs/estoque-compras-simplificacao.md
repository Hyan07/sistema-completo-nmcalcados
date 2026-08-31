# Simplificação de estoque e compras

## Objetivo

Reduzir a complexidade operacional do sistema sem perder rastreabilidade, integridade de estoque e controle de permissões.

## Fluxo de produtos e grade

O usuário trabalha com produto, cor e tamanho. O SKU continua existindo internamente para garantir saldo individual por combinação, mas não é o elemento principal da interface.

Fluxo recomendado:

1. Cadastrar o produto.
2. Selecionar o produto na tela de grade.
3. Escolher uma cor.
4. Marcar os tamanhos disponíveis.
5. Adicionar à grade.
6. O sistema cria as combinações e referências internas automaticamente.

## Fluxo de compras

A confirmação integral da compra deve ser o caminho principal quando toda a mercadoria tiver chegado.

Ao confirmar uma compra:

- todos os itens pendentes são recebidos;
- cada combinação de produto, cor e tamanho recebe sua quantidade correspondente;
- as movimentações são registradas no histórico de estoque;
- o recebimento da compra é registrado;
- a compra passa para o status RECEIVED;
- toda a operação ocorre dentro da mesma transação.

O recebimento parcial permanece disponível para situações em que somente parte da mercadoria tenha sido entregue.

## Permissões

A permissão `purchases.confirm` controla especificamente a confirmação integral de compras e a consequente entrada dos itens no estoque.

A estrutura de permissões individuais por usuário deve ser preservada para permitir acesso granular à única funcionária operacional.

## Regra de integridade

Nenhuma entrada proveniente de compra deve alterar diretamente o saldo sem gerar uma movimentação de estoque vinculada ao item da compra. Em caso de erro durante a confirmação, a transação inteira deve ser revertida.
