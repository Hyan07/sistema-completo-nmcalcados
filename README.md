# NM Calçados

ERP/POS monolítico e integrado para a NM Calçados, com backend Node.js/Express, frontend HTML/CSS/JavaScript e banco MySQL.

## Estado atual

**FASE 8 — Fornecedores e compras concluída.**

Já existem autenticação e permissões, auditoria, produtos, grade por cor/tamanho/SKU, estoque transacional, clientes, fornecedores e compras com recebimento físico parcial/total integrado ao estoque.

A regra comercial permanece explícita: cadastrar ou confirmar um pedido de compra não aumenta estoque. Somente um recebimento confirmado gera `PURCHASE_RECEIPT`. Pagamento ao fornecedor não é criado nesta fase.

## Execução local

```bash
npm install
cp .env.example .env
npm run db:check
npm run db:migrate
npm run auth:bootstrap-admin
npm test
npm run dev
```

## Módulos disponíveis

- Produtos: `/pages/products.html`
- Grade: `/pages/grade.html`
- Estoque: `/pages/stock.html`
- Clientes: `/pages/customers.html`
- Fornecedores: `/pages/suppliers.html`
- Compras: `/pages/purchases.html`
- Usuários: `/pages/users.html`

A FASE 8 adiciona `011_suppliers_purchases_phase8.sql`, com permissões de consulta/recebimento, trilha de usuário em fornecedores/compras, cancelamento lógico de itens e ledger imutável de recebimentos.

## Próxima fase

**FASE 9 — PDV e vendas.**
