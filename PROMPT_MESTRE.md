# Prompt Mestre — Sistema Completo NM Calçados

## Objetivo

Construir um sistema web completo para a **NM Calçados**, integrando em uma única aplicação:

- vendas / PDV;
- cadastro de produtos e variações;
- controle de estoque;
- compras e fornecedores;
- clientes;
- controle de caixa;
- controle financeiro;
- contas a pagar e receber;
- catálogo online público;
- pedidos/orçamentos originados pelo catálogo;
- relatórios e indicadores;
- usuários, permissões e auditoria;
- importação de dados existentes;
- administração e configurações do sistema.

O sistema deverá ser desenvolvido de forma modular, porém com todos os módulos compartilhando o mesmo banco de dados e regras de negócio, evitando cadastros duplicados e inconsistências.

---

# 1. Stack obrigatória

## Backend
- Node.js
- Express.js
- JavaScript
- API REST
- MySQL
- mysql2 com pool de conexões

## Frontend
- HTML5
- CSS3
- JavaScript puro
- Fetch API para comunicação com o backend
- Layout responsivo para desktop, tablet e celular

## Infraestrutura
- GitHub como repositório oficial
- Hospedagem final na Hostinger
- Configurações sensíveis exclusivamente por variáveis de ambiente
- Banco MySQL de produção separado do banco de desenvolvimento

Não colocar senhas, credenciais, chaves privadas ou dados sensíveis dentro do GitHub.

---

# 2. Regra de desenvolvimento

O sistema NÃO deve ser criado inteiro de uma só vez.

Desenvolver em etapas pequenas, completas e testáveis.

Para cada etapa:

1. analisar o que já existe no repositório;
2. preservar funcionalidades já concluídas;
3. definir as tabelas e relacionamentos necessários;
4. implementar backend;
5. implementar frontend;
6. realizar validações;
7. testar os principais fluxos;
8. documentar alterações importantes;
9. realizar commit com mensagem clara;
10. somente depois iniciar a próxima etapa.

Nunca substituir grandes partes do sistema sem necessidade.

Não criar dados fictícios permanentes em produção.

---

# 3. Arquitetura inicial

Utilizar uma estrutura semelhante a:

```text
sistema-completo-nmcalcados/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── admin/
│   └── catalogo/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── imports/
├── scripts/
├── docs/
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Separar regras de negócio dos controllers e do código de interface.

---

# 4. Banco de dados

Criar banco relacional normalizado e preparado para crescimento.

Toda alteração estrutural deverá possuir migration SQL versionada.

Evitar exclusão física de registros importantes de venda, estoque e financeiro. Quando necessário, trabalhar com status, cancelamento ou desativação para preservar histórico e auditoria.

Utilizar transações SQL sempre que uma operação afetar múltiplas tabelas críticas.

Exemplo: finalizar venda deve registrar venda, itens, pagamentos, baixa de estoque, movimentação de caixa e lançamento financeiro dentro de uma operação consistente.

---

# 5. Módulo de usuários e segurança

Implementar:

- login;
- logout;
- recuperação/troca de senha posteriormente;
- senha armazenada com hash seguro;
- sessão autenticada com cookie seguro;
- usuários ativos/inativos;
- perfis e permissões;
- controle de acesso por módulo e ação;
- registro de auditoria.

Perfis iniciais sugeridos:

- Administrador;
- Gerente;
- Caixa/Vendedor;
- Estoque;
- Financeiro;
- Consulta.

Registrar em auditoria ações relevantes como:

- login;
- criação/edição de produtos;
- alteração de preço;
- ajuste de estoque;
- cancelamento de venda;
- abertura/fechamento de caixa;
- exclusão lógica ou cancelamento financeiro;
- importação de dados;
- alteração de permissões.

---

# 6. Produtos

O cadastro de produtos deverá ser adequado a uma loja de calçados.

Cada produto poderá possuir:

- código interno;
- SKU;
- código de barras;
- nome;
- descrição;
- categoria;
- marca;
- fornecedor principal;
- gênero/público;
- coleção;
- referência/modelo;
- cor;
- numeração/tamanho;
- custo;
- preço de venda;
- preço promocional;
- margem;
- estoque mínimo;
- status ativo/inativo;
- disponibilidade no catálogo;
- imagens;
- observações.

IMPORTANTE: tamanho e cor devem ser tratados como variações do produto, permitindo controlar estoque individualmente por combinação.

Exemplo:

```text
Tênis Modelo X
├── Preto / 38
├── Preto / 39
├── Preto / 40
├── Branco / 38
└── Branco / 39
```

Cada variação deve ter estoque próprio e poderá ter SKU/código de barras próprio.

---

# 7. Estoque

O estoque deverá ser movimentado exclusivamente através de registros de movimentação.

Tipos mínimos:

- entrada por compra;
- saída por venda;
- devolução de cliente;
- devolução a fornecedor;
- ajuste positivo;
- ajuste negativo;
- perda/avaria;
- cancelamento de venda;
- inventário.

Cada movimentação deve armazenar:

- produto/variação;
- quantidade;
- estoque anterior;
- estoque posterior;
- tipo;
- origem;
- documento relacionado;
- usuário;
- data/hora;
- observação.

O sistema deve impedir estoque negativo por padrão, salvo configuração administrativa explícita.

Criar alertas de estoque mínimo.

---

# 8. Fornecedores e compras

Cadastrar fornecedores com:

- razão social/nome;
- nome fantasia;
- CPF/CNPJ;
- telefone;
- WhatsApp;
- e-mail;
- endereço;
- contato responsável;
- observações;
- status.

Compras deverão permitir:

- fornecedor;
- número do documento;
- data de compra;
- data de entrada;
- produtos e variações;
- quantidade;
- custo unitário;
- desconto;
- frete;
- custo total;
- forma/condição de pagamento;
- parcelas;
- observações.

Ao confirmar entrada de compra:

1. atualizar estoque;
2. registrar movimentações;
3. atualizar custos quando aplicável;
4. gerar contas a pagar quando houver valores pendentes.

---

# 9. Clientes

Cadastro com:

- nome;
- CPF/CNPJ opcional conforme regra de negócio;
- telefone;
- WhatsApp;
- e-mail;
- data de nascimento;
- endereço;
- observações;
- histórico de compras;
- total comprado;
- última compra.

Permitir venda para consumidor não identificado quando necessário.

---

# 10. PDV / Vendas

Criar tela de venda rápida e simples.

Permitir busca por:

- código de barras;
- SKU;
- referência;
- nome;
- marca.

Fluxo:

1. selecionar cliente, opcional;
2. adicionar produtos/variações;
3. informar quantidade;
4. aplicar desconto conforme permissão;
5. calcular subtotal, desconto e total;
6. informar forma(s) de pagamento;
7. finalizar venda;
8. baixar estoque automaticamente;
9. movimentar caixa;
10. registrar financeiro;
11. gerar comprovante/recibo.

Formas de pagamento iniciais:

- dinheiro;
- PIX;
- cartão de débito;
- cartão de crédito;
- crediário/conta a receber;
- múltiplas formas na mesma venda.

Suportar:

- desconto por item;
- desconto no total;
- acréscimo;
- parcelamento;
- troco;
- observações;
- cancelamento autorizado;
- devolução/troca;
- histórico completo da venda.

Uma venda finalizada nunca deverá simplesmente desaparecer do banco.

---

# 11. Caixa

Criar controle de caixa por operador.

Funções:

- abertura;
- saldo inicial;
- entradas;
- saídas/sangrias;
- suprimentos;
- vendas recebidas;
- fechamento;
- saldo esperado;
- saldo informado;
- diferença;
- histórico.

Não permitir vendas em dinheiro/cartão vinculadas ao PDV quando a regra exigir caixa aberto.

---

# 12. Financeiro

Implementar:

## Contas a receber
- vendas a prazo;
- parcelas;
- vencimento;
- recebido/pendente/atrasado/cancelado;
- data do recebimento;
- juros/desconto quando necessário.

## Contas a pagar
- fornecedores;
- compras;
- despesas operacionais;
- parcelas;
- vencimentos;
- pagamento parcial ou total;
- status.

## Despesas
Categorias como:

- aluguel;
- energia;
- água;
- internet;
- salários;
- impostos;
- manutenção;
- marketing;
- frete;
- outras.

## Indicadores

- vendas do dia;
- faturamento por período;
- recebimentos;
- despesas;
- saldo;
- contas vencidas;
- contas a vencer;
- lucro bruto estimado;
- ticket médio;
- margem;
- produtos mais vendidos;
- estoque parado.

---

# 13. Catálogo online

Criar área pública independente do painel administrativo, mas integrada ao mesmo banco.

O catálogo deverá apresentar apenas produtos ativos e habilitados para publicação.

Recursos:

- página inicial;
- produtos em destaque;
- promoções;
- categorias;
- marcas;
- pesquisa;
- filtros;
- página do produto;
- imagens;
- preço;
- preço promocional;
- cores;
- numerações disponíveis;
- indicação real de disponibilidade baseada no estoque;
- produtos relacionados;
- botão de WhatsApp;
- carrinho para montar pedido/interesse.

Nesta primeira versão, o catálogo poderá gerar um pedido/solicitação de atendimento sem exigir pagamento online.

Não expor quantidade interna exata de estoque ao público, salvo decisão posterior. Exibir apenas disponibilidade como disponível, últimas unidades ou indisponível, conforme regra configurada.

Quando um pedido do catálogo for convertido em venda, utilizar o mesmo fluxo de vendas e estoque do sistema interno.

---

# 14. Pedidos do catálogo

Criar fluxo:

- novo;
- aguardando atendimento;
- em negociação;
- confirmado;
- convertido em venda;
- cancelado.

Registrar:

- cliente;
- itens;
- tamanhos/cores;
- quantidades;
- valores no momento da solicitação;
- contato;
- observações;
- data/hora;
- status;
- atendente responsável.

Evitar baixa definitiva de estoque apenas por adicionar produto ao carrinho público.

Uma reserva temporária de estoque poderá ser criada futuramente caso seja necessária.

---

# 15. Dashboard

Criar dashboard administrativo com indicadores úteis, sem consultas excessivamente pesadas.

Exibir inicialmente:

- vendas hoje;
- vendas no mês;
- faturamento;
- ticket médio;
- quantidade de vendas;
- produtos com estoque baixo;
- contas a pagar vencidas;
- contas a receber vencidas;
- saldo de caixa;
- últimos pedidos online;
- produtos mais vendidos;
- vendas por forma de pagamento.

Filtros por período devem ser reutilizados nos relatórios.

---

# 16. Relatórios

Preparar relatórios de:

- vendas por período;
- vendas por vendedor;
- vendas por produto;
- produtos mais vendidos;
- vendas por categoria;
- formas de pagamento;
- margem/lucro bruto estimado;
- estoque atual;
- estoque mínimo;
- movimentações de estoque;
- inventário;
- compras;
- fornecedores;
- contas a pagar;
- contas a receber;
- despesas;
- fluxo de caixa;
- clientes;
- pedidos do catálogo.

Permitir exportação posteriormente para PDF, CSV e/ou XLSX quando pertinente.

---

# 17. Importação dos dados existentes

A importação é uma parte CRÍTICA do projeto.

Não importar dados diretamente para as tabelas finais sem validação.

Criar fluxo de importação com:

1. upload/leitura de CSV ou XLSX;
2. identificação do tipo de dado;
3. pré-visualização;
4. mapeamento das colunas;
5. validação;
6. detecção de duplicidade;
7. relatório de erros;
8. confirmação;
9. importação transacional;
10. registro do lote importado;
11. possibilidade de identificar quais registros vieram de cada lote.

Tipos de importação previstos:

- produtos;
- estoque inicial;
- clientes;
- fornecedores;
- preços;
- contas a pagar;
- contas a receber;
- histórico de vendas, caso disponível;
- demais dados legados pertinentes.

Criar tabelas ou área de staging quando necessário.

A importação deve ser idempotente sempre que possível para evitar duplicações se o mesmo arquivo for processado novamente.

Antes de construir os importadores definitivos, analisar os arquivos reais fornecidos pelo usuário e mapear as colunas.

---

# 18. Configurações da empresa

Criar configuração central para:

- nome da empresa;
- nome fantasia;
- CPF/CNPJ;
- endereço;
- telefone;
- WhatsApp;
- e-mail;
- logotipo;
- dados para recibo;
- percentual/limites de desconto;
- permitir ou bloquear estoque negativo;
- mensagens do catálogo;
- horário de funcionamento;
- redes sociais.

Evitar valores comerciais importantes espalhados diretamente no código.

---

# 19. Requisitos de interface

A interface administrativa deverá ser:

- moderna;
- limpa;
- profissional;
- rápida;
- responsiva;
- simples para funcionários com pouca familiaridade tecnológica;
- consistente em todos os módulos.

Estrutura sugerida:

- sidebar;
- topo com usuário e atalhos;
- dashboard;
- tabelas com pesquisa, filtros e paginação;
- formulários claros;
- modais apenas quando fizerem sentido;
- mensagens de sucesso/erro visíveis;
- confirmação antes de ações destrutivas.

O catálogo deve possuir identidade visual própria da NM Calçados e foco em celular.

---

# 20. Validação e qualidade

Todas as entradas devem ser validadas também no backend.

Nunca confiar apenas nas validações do navegador.

Implementar tratamento centralizado de erros.

Utilizar respostas padronizadas da API.

Criar paginação para listagens grandes.

Evitar consultas N+1.

Criar índices MySQL para campos frequentemente pesquisados, como:

- SKU;
- código de barras;
- produto;
- cliente;
- CPF/CNPJ;
- datas;
- status;
- chaves estrangeiras.

Valores monetários devem utilizar DECIMAL no MySQL, nunca FLOAT.

Datas e horários devem ser tratados de forma consistente.

---

# 21. Segurança

Implementar no mínimo:

- bcrypt para senhas;
- sessão segura;
- cookies HttpOnly;
- Secure em produção HTTPS;
- SameSite adequado;
- proteção contra SQL Injection usando parâmetros;
- Helmet;
- rate limit em autenticação;
- validação e sanitização de entrada;
- CORS restrito quando aplicável;
- proteção CSRF quando necessária ao modelo de autenticação;
- logs sem exposição de senhas ou dados secretos;
- .env fora do Git;
- princípio do menor privilégio no banco de dados.

---

# 22. Deploy Hostinger

O projeto deve estar preparado para produção na Hostinger.

Criar:

- `.env.example` sem segredos;
- scripts npm claros;
- configuração de porta via `process.env.PORT`;
- conexão MySQL via variáveis de ambiente;
- migrations executáveis de forma controlada;
- logs de inicialização claros;
- health check da aplicação;
- procedimento documentado de deploy;
- procedimento de backup e restauração do banco.

Nunca depender de caminhos absolutos do computador de desenvolvimento.

---

# 23. Fluxo Git/GitHub

O repositório oficial é:

`Hyan07/sistema-completo-nmcalcados`

Utilizar commits pequenos e descritivos.

Padrão sugerido:

```text
chore: configura estrutura inicial do projeto
feat: adiciona autenticação de usuários
feat: adiciona cadastro de produtos
feat: implementa variações de tamanho e cor
feat: adiciona movimentação de estoque
feat: implementa PDV
feat: integra vendas ao financeiro
feat: adiciona catálogo público
fix: corrige baixa de estoque no cancelamento
refactor: separa regras de venda em service
```

Antes de alterar arquivos existentes, analisar a versão atual para não apagar funcionalidades sem intenção.

---

# 24. Ordem de desenvolvimento

Seguir preferencialmente esta sequência:

## Etapa 0 — Fundação
- estrutura do projeto;
- package.json;
- Express;
- conexão MySQL;
- .env.example;
- migrations;
- tratamento de erros;
- health check;
- documentação para execução local.

## Etapa 1 — Autenticação e administração
- usuários;
- login/logout;
- sessões;
- perfis;
- permissões;
- auditoria básica.

## Etapa 2 — Cadastros-base
- configurações da empresa;
- categorias;
- marcas;
- fornecedores;
- clientes.

## Etapa 3 — Produtos
- produtos;
- cores;
- tamanhos;
- variações;
- SKU/código de barras;
- preços;
- imagens.

## Etapa 4 — Estoque
- saldo;
- movimentações;
- ajustes;
- inventário;
- estoque mínimo.

## Etapa 5 — Compras
- entrada de mercadoria;
- fornecedores;
- custos;
- integração com estoque;
- contas a pagar.

## Etapa 6 — PDV e vendas
- carrinho interno;
- cliente;
- desconto;
- pagamentos;
- venda;
- baixa de estoque;
- recibo;
- cancelamento/devolução.

## Etapa 7 — Caixa
- abertura;
- movimentações;
- sangria/suprimento;
- fechamento;
- conferência.

## Etapa 8 — Financeiro
- contas a pagar;
- contas a receber;
- despesas;
- recebimentos;
- indicadores financeiros.

## Etapa 9 — Catálogo online
- home pública;
- listagem;
- filtros;
- produto;
- disponibilidade;
- carrinho;
- WhatsApp;
- pedido online.

## Etapa 10 — Relatórios e dashboard
- KPIs;
- relatórios;
- filtros;
- exportações prioritárias.

## Etapa 11 — Importação de dados
- analisar arquivos reais;
- mapeamento;
- staging;
- validações;
- importação;
- logs de importação.

A importação poderá ser antecipada se os arquivos existentes forem necessários para testar corretamente produtos, clientes ou estoque.

## Etapa 12 — Produção
- revisão geral;
- segurança;
- backup;
- migrations de produção;
- preparação da Hostinger;
- testes finais;
- publicação.

---

# 25. Critérios para considerar uma etapa concluída

Uma etapa somente está concluída quando:

- banco criado/migrado corretamente;
- backend funcional;
- interface funcional quando aplicável;
- validações de backend implementadas;
- erros tratados;
- integração com módulos anteriores preservada;
- fluxo principal testado;
- nenhum segredo foi incluído no Git;
- documentação relevante atualizada;
- commit realizado.

---

# 26. Regra principal de integração

Todas as áreas devem trabalhar sobre a mesma fonte de verdade.

Exemplos:

- venda finalizada reduz estoque;
- cancelamento/devolução recompõe estoque conforme regra;
- venda gera recebimento/conta a receber;
- venda movimenta caixa quando aplicável;
- compra aumenta estoque;
- compra gera conta a pagar quando aplicável;
- catálogo lê produto, preço e disponibilidade do mesmo cadastro usado no PDV;
- pedido online pode ser convertido em venda sem recadastrar produtos ou cliente;
- dashboard e relatórios usam os mesmos dados transacionais.

Evitar qualquer mecanismo que duplique manualmente saldo de estoque, valor de venda ou informação financeira em sistemas separados.

---

# 27. Como responder durante o desenvolvimento

Em cada nova etapa:

1. informar resumidamente o objetivo;
2. analisar os arquivos atuais;
3. implementar a solução completa daquela etapa;
4. apontar migrations ou variáveis de ambiente necessárias;
5. realizar o commit no GitHub;
6. informar exatamente o que foi concluído;
7. listar testes manuais essenciais;
8. indicar qual será a próxima etapa lógica.

Quando houver dúvida não bloqueante, utilizar a alternativa mais segura, simples e escalável e documentar a decisão.

Priorizar funcionamento correto e consistência de dados antes de efeitos visuais avançados.

---

# 28. Primeira tarefa após este documento

Iniciar somente a **Etapa 0 — Fundação**.

Criar a estrutura inicial Node.js + Express + MySQL, incluindo:

- `package.json`;
- servidor Express;
- pasta `public`;
- conexão MySQL com pool;
- variáveis de ambiente;
- `.env.example`;
- `.gitignore`;
- endpoint `/api/health`;
- tratamento de rota não encontrada;
- tratamento central de erro;
- sistema de migrations SQL;
- migration inicial preparada para controle de migrations;
- scripts npm para desenvolvimento e produção;
- README com instalação local;
- estrutura preparada para Hostinger.

Não implementar ainda produtos, vendas, estoque ou financeiro nesta primeira tarefa.

Ao concluir, realizar commit específico da fundação e apresentar os arquivos criados e os passos para testar localmente.
