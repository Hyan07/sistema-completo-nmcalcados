'use strict';

const form = document.getElementById('report-filters');
const reportSelect = document.getElementById('report-key');
const reportMenu = document.getElementById('report-catalog-menu');
const feedback = document.getElementById('feedback');
const head = document.getElementById('report-head');
const body = document.getElementById('report-body');
const summary = document.getElementById('summary');
let catalog = [];
let current = null;
let page = 1;
let totalPages = 1;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setFeedback(m,e=false){feedback.textContent=m;feedback.classList.toggle('is-error',e);}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function format(v,type){if(v===null||v===undefined||v==='')return'—';if(type==='money')return money(v);if(type==='boolean')return Number(v)===1||v===true?'Sim':'Não';if(type==='date'){const s=String(v).slice(0,10),[y,m,d]=s.split('-');return y&&m&&d?`${d}/${m}/${y}`:esc(v);}if(type==='datetime'){const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):d.toLocaleString('pt-BR');}return esc(v);}
async function api(url){const r=await fetch(url,{credentials:'same-origin'}),b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.message||'Não foi possível gerar o relatório.');return b;}

const statusOptions={sales:[['','Todos'],['DRAFT','Rascunho'],['COMPLETED','Concluída'],['CANCELLED','Cancelada'],['PARTIALLY_RETURNED','Parcialmente devolvida'],['RETURNED','Devolvida']],purchases:[['','Todos'],['DRAFT','Rascunho'],['ORDERED','Pedido'],['PARTIALLY_RECEIVED','Parcialmente recebido'],['RECEIVED','Recebido'],['CANCELLED','Cancelado']],cash:[['','Todos'],['OPEN','Aberto'],['CLOSED','Fechado']],finance:[['','Todos'],['OPEN','Aberta'],['PARTIAL','Parcial'],['PAID','Paga'],['CANCELLED','Cancelada']]};
const summaryLabels={sales_count:'Vendas',sales_total:'Total das vendas',units:'Unidades',product_count:'Produtos',sku_count:'SKUs',stock_units:'Unidades em estoque',catalog_products:'No catálogo',inventory_cost:'Custo do estoque',inventory_sale_value:'Venda potencial',out_of_stock:'Sem estoque',low_stock:'Estoque baixo',movement_count:'Movimentações',units_in:'Entradas',units_out:'Saídas',purchase_count:'Compras',purchase_total:'Total de compras',ordered_units:'Unidades pedidas',received_units:'Unidades recebidas',pending_units:'Unidades pendentes',customer_count:'Clientes',active_customers:'Clientes ativos',total_spent:'Total comprado',supplier_count:'Fornecedores',active_suppliers:'Fornecedores ativos',total_purchased:'Total comprado',session_count:'Sessões',open_sessions:'Caixas abertos',cash_in:'Entradas em dinheiro',cash_out:'Saídas em dinheiro',closing_difference:'Diferença de fechamento',receivable_open:'A receber',payable_open:'A pagar',receivable_overdue:'A receber vencido',payable_overdue:'A pagar vencido'};
const moneySummary=new Set(['sales_total','inventory_cost','inventory_sale_value','purchase_total','total_spent','total_purchased','cash_in','cash_out','closing_difference','receivable_open','payable_open','receivable_overdue','payable_overdue']);
const GROUPS=[
  {key:'sales',label:'Vendas',test:/sale|venda|product.*sold|mais.*vend/i},
  {key:'inventory',label:'Estoque e compras',test:/stock|estoque|inventory|mov|purchase|compra|supplier|fornecedor|product|sku/i},
  {key:'relationship',label:'Clientes e relacionamento',test:/customer|cliente/i},
  {key:'finance',label:'Financeiro e caixa',test:/finance|cash|caixa|receiv|payable|fluxo/i}
];
function groupFor(item){const hay=`${item.key} ${item.label}`;return GROUPS.find(g=>g.test.test(hay))||{key:'other',label:'Outros'};}
function renderCatalogMenu(){if(!reportMenu)return;const groups=new Map();for(const item of catalog){const group=groupFor(item);if(!groups.has(group.key))groups.set(group.key,{label:group.label,items:[]});groups.get(group.key).items.push(item);}reportMenu.innerHTML=[...groups.values()].map(group=>`<section class="report-menu-group"><span>${esc(group.label)}</span>${group.items.map(item=>`<button type="button" class="report-menu-item${item.key===reportSelect.value?' is-active':''}" data-report-key="${esc(item.key)}"><strong>${esc(item.label)}</strong><small>Gerar e exportar</small></button>`).join('')}</section>`).join('');}
function syncMenu(){reportMenu?.querySelectorAll('[data-report-key]').forEach(button=>button.classList.toggle('is-active',button.dataset.reportKey===reportSelect.value));}
function updateFilters(){const def=catalog.find(x=>x.key===reportSelect.value);for(const el of document.querySelectorAll('[data-filter]'))el.hidden=!def?.filters.includes(el.dataset.filter);const status=document.getElementById('status'),opts=statusOptions[def?.key]||[['','Todos']];status.innerHTML=opts.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');syncMenu();}
function queryString(formatValue='json',targetPage=page){const p=new URLSearchParams({format:formatValue,page:String(targetPage),pageSize:'50'}),def=catalog.find(x=>x.key===reportSelect.value);for(const key of def?.filters||[]){const map={q:'q',dateFrom:'date-from',dateTo:'date-to',status:'status',isActive:'is-active',stockStatus:'stock-status',movementType:'movement-type',financeType:'finance-type'},el=document.getElementById(map[key]);if(el&&el.value)p.set(key,el.value);}return p;}
function renderSummary(data){const entries=Object.entries(data||{});summary.innerHTML=entries.map(([key,value])=>`<article class="summary-card"><span>${esc(summaryLabels[key]||key)}</span><strong>${moneySummary.has(key)?money(value):Number.isFinite(Number(value))?Number(value).toLocaleString('pt-BR'):esc(value)}</strong></article>`).join('');}
function renderReport(report){current=report;document.getElementById('report-title').textContent=report.label;document.getElementById('period-label').textContent=report.periodLabel||'';document.getElementById('row-count').textContent=`${report.total.toLocaleString('pt-BR')} registro(s)`;head.innerHTML=report.columns.map(c=>`<th>${esc(c.label)}</th>`).join('');body.innerHTML=report.rows.length?report.rows.map(row=>`<tr>${report.columns.map(c=>`<td title="${esc(row[c.key]??'')}">${format(row[c.key],c.type)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${report.columns.length}" class="muted">Nenhum registro encontrado.</td></tr>`;renderSummary(report.summary);page=report.pagination?.page||1;totalPages=report.pagination?.totalPages||1;document.getElementById('page-info').textContent=`Página ${page} de ${totalPages}`;document.getElementById('prev-page').disabled=page<=1;document.getElementById('next-page').disabled=page>=totalPages;window.NMUI?.enhance(document.querySelector('.report-result-card'));}
async function load(target=1){if(!reportSelect.value)return;setFeedback('Gerando relatório...');try{const result=await api(`/api/reports/${encodeURIComponent(reportSelect.value)}?${queryString('json',target)}`);renderReport(result.data);setFeedback('Relatório atualizado.');}catch(e){setFeedback(e.message,true);}}
function exportReport(formatValue){if(!reportSelect.value)return;const url=`/api/reports/${encodeURIComponent(reportSelect.value)}?${queryString(formatValue,1)}`;window.location.assign(url);}
async function init(){try{const r=await api('/api/reports/catalog');catalog=r.data||[];if(!catalog.length)throw new Error('Nenhum relatório disponível para suas permissões.');reportSelect.innerHTML=catalog.map(x=>`<option value="${esc(x.key)}">${esc(x.label)}</option>`).join('');renderCatalogMenu();updateFilters();await load(1);}catch(e){setFeedback(e.message,true);}}

reportMenu?.addEventListener('click',(event)=>{const button=event.target.closest('[data-report-key]');if(!button)return;reportSelect.value=button.dataset.reportKey;page=1;updateFilters();load(1);});
reportSelect.addEventListener('change',()=>{page=1;updateFilters();load(1);});
form.addEventListener('submit',e=>{e.preventDefault();load(1);});
document.getElementById('export-csv').addEventListener('click',()=>exportReport('csv'));
document.getElementById('export-pdf').addEventListener('click',()=>exportReport('pdf'));
document.getElementById('prev-page').addEventListener('click',()=>load(page-1));
document.getElementById('next-page').addEventListener('click',()=>load(page+1));
init();
