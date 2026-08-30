'use strict';
const form=document.getElementById('login-form'),panel=document.getElementById('session-panel'),feedback=document.getElementById('feedback'),loginButton=document.getElementById('login-button'),logoutButton=document.getElementById('logout-button'),passwordInput=document.getElementById('password'),togglePassword=document.getElementById('toggle-password');
function setFeedback(m,e=false){feedback.textContent=m;feedback.classList.toggle('is-error',e);}
function showSession(user,permissions=[]){
  form.hidden=true;panel.hidden=false;
  document.getElementById('session-user').textContent=user.name;
  document.getElementById('session-role').textContent=(user.roles||[]).map(r=>r.name).join(' + ')||'Sem cargo ativo';
  document.getElementById('dashboard-link').hidden=!permissions.includes('dashboard.read');
  document.getElementById('reports-link').hidden=!permissions.includes('reports.read');
  document.getElementById('pos-link').hidden=!permissions.includes('sales.read');
  document.getElementById('cash-link').hidden=!permissions.includes('cash.read');
  document.getElementById('finance-link').hidden=!permissions.includes('finance.read');
  document.getElementById('products-link').hidden=!permissions.includes('products.read');
  document.getElementById('grade-link').hidden=!permissions.includes('products.read');
  document.getElementById('stock-link').hidden=!permissions.includes('stock.read');
  document.getElementById('customers-link').hidden=!permissions.includes('customers.read');
  document.getElementById('suppliers-link').hidden=!permissions.includes('suppliers.read');
  document.getElementById('purchases-link').hidden=!permissions.includes('purchases.read');
  document.getElementById('users-link').hidden=!permissions.includes('users.read');
}
function showLogin(){panel.hidden=true;form.hidden=false;}
async function request(url,options={}){const response=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(response.status===204)return null;const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||'Não foi possível concluir a operação.');return body;}
form.addEventListener('submit',async e=>{e.preventDefault();loginButton.disabled=true;setFeedback('Autenticando...');try{const data=await request('/api/auth/login',{method:'POST',body:JSON.stringify({username:form.username.value,password:form.password.value})});form.reset();showSession(data.user,data.permissions);setFeedback('Acesso autorizado.');}catch(err){setFeedback(err.message,true);}finally{loginButton.disabled=false;}});
logoutButton.addEventListener('click',async()=>{try{await request('/api/auth/logout',{method:'POST'});}finally{showLogin();setFeedback('Sessão encerrada.');}});
togglePassword.addEventListener('click',()=>{const v=passwordInput.type==='text';passwordInput.type=v?'password':'text';togglePassword.textContent=v?'Mostrar':'Ocultar';});
request('/api/auth/me').then(d=>showSession(d.user,d.permissions)).catch(()=>showLogin());
