# Reformulação de Design, UX/UI e Estrutura — NM Calçados

## Objetivo

Reformular a experiência do ERP/PDV sem alterar contratos de API, regras de negócio, estrutura do banco ou permissões por motivos exclusivamente visuais.

A execução é incremental. Cada fase deve preservar os fluxos já existentes e ser validada antes do módulo seguinte.

## Diagnóstico inicial

A auditoria do frontend identificou os seguintes pontos estruturais:

1. As páginas administrativas são HTML independentes em `public/pages`, com JavaScript de módulo em `public/js` e CSS compartilhado/por módulo em `public/css`.
2. O backend injeta a camada visual administrativa por meio de `src/middlewares/adminPageShell.js`, o que permite padronizar o produto sem reescrever rotas.
3. Existiam três camadas visuais simultâneas sobre as páginas administrativas:
   - `admin-shell.css/js`;
   - `bankdash-theme.css` + `ui-polish.js`;
   - `ux-navigation.css/js`.
4. Essas camadas possuíam tokens próprios, regras duplicadas e grande quantidade de sobrescritas, inclusive `!important`, aumentando o risco de inconsistência entre módulos.
5. O Dashboard possuía shell HTML próprio, enquanto outras páginas dependiam da montagem dinâmica do shell, criando duas estruturas de navegação diferentes.
6. IDs, formulários e elementos utilizados pelos JavaScripts de negócio permanecem dentro do conteúdo de cada módulo e não precisam ser removidos para a reformulação visual.

## Nova arquitetura visual

### Camada 1 — Design System

Arquivo canônico:

`public/css/design-system.css`

Responsabilidades:

- cores de marca e cores semânticas;
- superfícies e bordas;
- tipografia;
- escala de espaçamento;
- radius;
- sombras;
- alturas de controles;
- foco acessível;
- botões;
- inputs/selects/textarea;
- tabelas;
- feedback;
- diálogos;
- paginação e componentes compartilhados.

Novos estilos devem preferir tokens `--nm-*` em vez de valores visuais isolados.

### Camada 2 — Shell administrativo

Arquivos:

- `public/css/admin-shell.css`
- `public/js/admin-shell.js`

Responsabilidades:

- sidebar;
- navegação por domínio;
- filtragem de módulos por permissão;
- módulo ativo;
- recolhimento da sidebar no desktop;
- drawer no mobile;
- breadcrumb;
- busca global de módulos;
- identificação do usuário;
- logout;
- estrutura de página consistente.

### Camada 3 — CSS e JS de cada módulo

Os arquivos atuais dos módulos continuam responsáveis apenas pela experiência específica da área, por exemplo:

- `dashboard.css/js`;
- `products.js`;
- `stock.css/js`;
- `pos.css/js`;
- `finance.css/js`.

Durante a reformulação, eles devem migrar progressivamente para os componentes e tokens compartilhados.

## Navegação definida

### Visão geral
- Dashboard

### Comercial
- Vendas / PDV
- Clientes
- Pedidos do catálogo
- Catálogo público

### Estoque
- Produtos
- Grade
- Estoque
- Compras
- Fornecedores

### Financeiro
- Caixa
- Financeiro

### Gestão
- Relatórios
- Importações
- Usuários e acessos

Os itens continuam condicionados às permissões retornadas por `/api/auth/me`.

## Fases de execução

### Fase 1 — Fundação visual e shell

Status: iniciada.

- consolidar tokens;
- eliminar sobreposição de temas;
- unificar sidebar/topbar;
- padronizar responsividade base;
- manter rotas, permissões e contratos existentes.

### Fase 2 — Dashboard

- hierarquia dos KPIs;
- filtros de período;
- faturamento e vendas;
- estoque crítico;
- financeiro;
- vendas recentes;
- estados de loading/erro/vazio;
- responsividade.

### Fase 3 — Produtos e Grade

- página de produtos orientada a listagem;
- criação em fluxo organizado;
- categorias e marcas sem competir visualmente com o objetivo principal;
- tabela profissional;
- filtros compactos;
- edição e imagens;
- grade por cor/tamanho/SKU.

### Fase 4 — Estoque

- visão operacional;
- indicadores de saldo e criticidade;
- ações Entrada/Saída/Ajuste/Histórico;
- movimentações com rastreabilidade.

### Fase 5 — Vendas / PDV

- busca e seleção de produtos;
- carrinho persistente na área de trabalho;
- revisão clara de quantidade/preço/desconto;
- separação rigorosa entre venda e recebimento;
- finalização simples e segura.

### Fase 6 — Clientes, Fornecedores e Compras

- tabelas e filtros padronizados;
- formulários por seções;
- histórico e relacionamento;
- fluxo de compra/recebimento sem alterar regras de estoque.

### Fase 7 — Financeiro e Caixa

- separação visual entre obrigação, recebimento/pagamento e caixa;
- vencimentos;
- liquidações;
- saldo e sessões de caixa;
- histórico operacional.

### Fase 8 — Relatórios, Importações, Usuários e Auditoria

- organização por contexto;
- permissões agrupadas por módulo;
- importação em etapas;
- visualização de auditoria com filtros.

### Fase 9 — Catálogo público

- experiência e-commerce mobile-first;
- busca e categorias;
- cards de produto;
- detalhe;
- pedido/carrinho preservando contratos atuais.

### Fase 10 — Revisão final

- responsividade completa;
- acessibilidade;
- navegação por teclado;
- estados vazios;
- loading;
- feedback;
- remoção de CSS visual obsoleto somente após confirmação de ausência de dependências.

## Regras de preservação

Durante todas as fases:

- não alterar banco por necessidade visual;
- não remover IDs usados pelos scripts antes de atualizar seus consumidores;
- não alterar endpoints sem necessidade real;
- manter `credentials: same-origin` nas chamadas autenticadas;
- respeitar `data-permission` e o resultado de `/api/auth/me`;
- não remover funcionalidades existentes para simplificar o layout;
- tratar Venda e Recebimento como conceitos distintos;
- tratar movimentação física de estoque somente nos eventos previstos pelas regras de negócio.

## Checkpoint mínimo por módulo

Antes de considerar um módulo reformulado:

- página carrega sem erro de console;
- sessão e permissões funcionam;
- criação funciona;
- edição funciona;
- exclusão/desativação funciona quando existente;
- pesquisa e filtros funcionam;
- paginação funciona quando existente;
- diálogos funcionam;
- chamadas de rede mantêm o contrato esperado;
- desktop, tablet e celular permanecem utilizáveis.
