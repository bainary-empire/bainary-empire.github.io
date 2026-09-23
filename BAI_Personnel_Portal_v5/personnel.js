const KB_KEY='baiHelpKnowledgeBase';
const ENQ_KEY='baiHelpEnquiries';
const PERSONNEL_SESSION='baiPersonnelPortalLoggedIn';
const PERSONNEL_EMAIL='support@bai.local';
const PERSONNEL_PASSWORD='BAI-support';
const app=document.getElementById('app');
let realtimeTimer=null;
let realtimeSignature='';
let realtimeStorageHandler=null;
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function jsonGet(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function jsonSet(key,v){localStorage.setItem(key,JSON.stringify(v))}
function nowIso(){return new Date().toISOString()}
function uid(prefix='ID'){return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}
function getKnowledgeBase(){return jsonGet(KB_KEY,[])}
function saveKnowledgeBase(v){jsonSet(KB_KEY,v)}
function getEnquiries(){return jsonGet(ENQ_KEY,[])}
function saveEnquiries(v){jsonSet(ENQ_KEY,v)}
function getApps(){try{const raw=sessionStorage.getItem('baiApplications');return raw?JSON.parse(raw):[]}catch{return[]}}
function formatDateTime(v){try{return new Date(v).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch{return v||''}}
function parseRoute(){const raw=(location.hash||'#login').slice(1);const [p,...q]=raw.split('?');return{page:p||'login',params:new URLSearchParams(q.join('?'))}}
function go(page,params={}){const qs=new URLSearchParams(params).toString();location.hash=qs?`${page}?${qs}`:page;render()}
function isLoggedIn(){return sessionStorage.getItem(PERSONNEL_SESSION)==='true'}
function statusClass(v){return String(v||'pending').toLowerCase().replace(/[^a-z]+/g,'-')}
function statusOptions(selected=''){return [['','All Statuses'],...['Pending','AI-Assisted','Escalated','In Progress','Resolved','Closed'].map(x=>[x,x])].map(([v,t])=>`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(t)}</option>`).join('')}
function categoryOptions(selected=''){const cats=['Application Status','New Passport','Passport Renewal','Lost Passport Replacement','Documents / Requirements','Payment','Appointment / DFA Consular Office','Account / OTP','Other'];return `<option value="">All Categories</option>`+cats.map(c=>`<option value="${esc(c)}" ${selected===c?'selected':''}>${esc(c)}</option>`).join('')}
function login(){if(isLoggedIn()){go('dashboard');return ''}return `<div class="login-screen"><div class="login-card"><div class="brand"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><h2>BAI PERSONNEL PORTAL</h2><p>Authorized support personnel only.</p><form onsubmit="signIn(event)"><div class="field"><label for="email">Personnel Email</label><input id="email" type="email" autocomplete="username" required placeholder="Enter personnel email"></div><div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required placeholder="Enter password"></div><div id="loginError" class="error"></div><button class="primary" type="submit">Sign In</button></form><button class="secondary" type="button" style="width:100%;margin-top:8px" onclick="demoPersonnelLogin()">Personnel Demo Login</button></div></div>`}
function signIn(e){e.preventDefault();const email=(document.getElementById('email')?.value||'').trim().toLowerCase();const pass=document.getElementById('password')?.value||'';if(email!==PERSONNEL_EMAIL||pass!==PERSONNEL_PASSWORD){document.getElementById('loginError').textContent='Invalid personnel credentials.';return}sessionStorage.setItem(PERSONNEL_SESSION,'true');go('dashboard')}
function demoPersonnelLogin(){sessionStorage.setItem(PERSONNEL_SESSION,'true');go('dashboard')}
function logout(){sessionStorage.removeItem(PERSONNEL_SESSION);go('login')}
function shell(inner,active='dashboard'){return `<div class="personnel-page"><header class="personnel-top"><div class="brand"><img src="assets/dashboard-logo.png" alt="BAI logo"><div><h1>BAI Personnel Portal</h1><p>Support Enquiry Management</p></div></div><div class="top-actions"><button class="${active==='dashboard'?'active':''}" onclick="go('dashboard')">Enquiries</button><button class="${active==='kb'?'active':''}" onclick="go('kb')">Knowledge Base</button><button onclick="logout()">Logout</button></div></header><main class="personnel-content">${inner}</main></div>`}
function dashboard(){if(!isLoggedIn())return '';const {params}=parseRoute();const sf=params.get('status')||'',cf=params.get('category')||'';const all=getEnquiries();const filtered=all.filter(e=>(!sf||e.status===sf)&&(!cf||e.category===cf));const attention=all.filter(e=>['Pending','Escalated','In Progress','AI-Assisted'].includes(e.status));return shell(`<section class="stats" id="personnelStats"><div class="stat"><b>${all.length}</b><span>All Enquiries</span></div><div class="stat"><b>${attention.length}</b><span>Needs Attention</span></div><div class="stat"><b>${all.filter(e=>e.status==='Resolved').length}</b><span>Resolved</span></div><div class="stat"><b>${getKnowledgeBase().length}</b><span>Knowledge Articles</span></div></section><section class="card"><div class="card-head"><div><h2>Enquiry Queue</h2><p>Review, reply to, and manage member enquiries.</p></div><button class="secondary" onclick="go('dashboard')">Clear Filters</button></div><div class="filters"><select onchange="filterStatus(this.value)">${statusOptions(sf)}</select><select onchange="filterCategory(this.value)">${categoryOptions(cf)}</select></div>${filtered.length?`<div class="enquiry-list" id="personnelEnquiryList">${filtered.map(enquiryItem).join('')}</div>`:`<div class="empty" style="padding:28px;text-align:center;color:#999;border:1px dashed #c8d6df;border-radius:10px;font-size:11px">No enquiries match the selected filters.</div>`}</section>`)}
function enquiryItem(e){return `<button class="enquiry-item" onclick="go('enquiry',{id:'${esc(e.id)}'})"><div><span class="status ${statusClass(e.status)}">${esc(e.status)}</span><h3>${esc(e.id)}</h3><b>${esc(e.category)}</b><p>${esc(e.description||'')}</p></div><div class="meta"><span>${esc(e.memberName||'Member')}</span><span>${formatDateTime(e.updatedAt||e.createdAt)}</span></div></button>`}
function filterStatus(v){const {params}=parseRoute();const cat=params.get('category')||'';go('dashboard',v?{status:v,...(cat?{category:cat}:{})}:cat?{category:cat}:{})}
function filterCategory(v){const {params}=parseRoute();const st=params.get('status')||'';go('dashboard',v?{category:v,...(st?{status:st}:{})}:st?{status:st}:{})}
function enquiry(){
  if(!isLoggedIn())return '';
  const id=parseRoute().params.get('id')||'';
  const e=getEnquiries().find(x=>x.id===id);
  if(!e)return shell(`<section class="card"><h2>Enquiry Not Found</h2><button class="secondary" onclick="go('dashboard')">← Back to Enquiries</button></section>`);
  const rel=e.applicationSnapshot || (e.applicationId?getApps().find(a=>a.id===e.applicationId):null);
  const closed=e.status==='Closed';
  const actionButtons=closed?'<div class="closed-notice" style="padding:10px 12px;border:1px solid #ddd;border-radius:8px;color:#777;background:#f7f7f7;font-size:12px">This enquiry is closed and is view-only.</div>':`<div class="detail-actions"><button onclick="changeStatus('${esc(e.id)}','In Progress')">In Progress</button><button onclick="changeStatus('${esc(e.id)}','Resolved')">Resolved</button><button onclick="changeStatus('${esc(e.id)}','Closed')">Closed</button></div>`;
  const replyForm=closed?`<div class="reply closed-reply" id="personnelEnquiryReply"><div class="closed-notice" style="padding:10px 12px;border:1px solid #ddd;border-radius:8px;color:#777;background:#f7f7f7;font-size:12px">This enquiry is closed. Replies and status changes are disabled.</div></div>`:`<form class="reply" id="personnelEnquiryReply" onsubmit="sendReply(event,'${esc(e.id)}')"><div class="field"><label>Reply to Member</label><textarea id="replyText" required placeholder="Write your response..."></textarea></div><div class="reply-actions"><select id="replyStatus" style="border:1px solid #cfd8dc;border-radius:7px;padding:8px"><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option></select><button class="primary" type="submit">Send Reply</button></div></form>`;
  return shell(`<section class="detail-grid"><div class="detail-main"><div class="detail-title"><div><button class="secondary" onclick="go('dashboard')">← Back to Enquiries</button><h2>${esc(e.id)}</h2><span id="personnelEnquiryStatus" class="status ${statusClass(e.status)}">${esc(e.status)}</span></div>${actionButtons}</div><div class="detail-info"><div><span>Member</span><b>${esc(e.memberName)}</b></div><div><span>Email</span><b>${esc(e.memberEmail)}</b></div><div><span>Related Application</span><b>${esc(rel?`${rel.type} — ${rel.id}`:'None')}</b></div><div><span>Category</span><b>${esc(e.category)}</b></div></div>${e.chatTranscript?.length?`<div class="context"><h3>Original AI Chat Transcript</h3>${e.chatTranscript.map(m=>`<div><b>${m.sender==='member'?'Member':'AI'}:</b> ${esc(m.text)}</div>`).join('')}</div>`:''}<div class="thread" id="personnelEnquiryThread">${(e.messages||[]).map(messageHtml).join('')}</div>${replyForm}</div><aside class="detail-side"><h3 class="side-title">Enquiry Details</h3><div class="side-item"><span>Enquiry ID</span><b>${esc(e.id)}</b></div><div class="side-item"><span>Created</span><b>${formatDateTime(e.createdAt)}</b></div><div class="side-item"><span>Updated</span><b id="personnelEnquiryUpdated">${formatDateTime(e.updatedAt)}</b></div><div class="side-item"><span>Escalated</span><b>${e.escalationFlag?'Yes':'No'}</b></div><div class="side-item"><span>Personnel</span><b>${esc(e.personnelId||'Unassigned')}</b></div><div class="side-item"><span>Messages</span><b id="personnelEnquiryMessageCount">${e.messages?.length||0}</b></div></aside></section>`,'dashboard')
}

function messageHtml(m){return `<div class="message ${m.senderType==='member'?'member':''}"><div><b>${esc(m.senderName||m.senderType)}</b><small>${formatDateTime(m.createdAt)}</small></div><p>${esc(m.text||'')}</p></div>`}
function personnelDashboardSignature(){
  const all=getEnquiries();
  return JSON.stringify({enquiries:all.map(e=>({id:e.id,updatedAt:e.updatedAt,status:e.status,count:e.messages?.length||0})),kb:getKnowledgeBase().length});
}
function refreshPersonnelEnquiryRealtime(){
  const route=parseRoute(); if(route.page!=='enquiry') return;
  const id=route.params.get('id')||''; const e=getEnquiries().find(x=>x.id===id); if(!e)return;
  const signature=JSON.stringify({updatedAt:e.updatedAt,status:e.status,messages:e.messages?.map(m=>({id:m.id,s:m.senderType,t:m.text,at:m.createdAt}))||[]});
  if(signature===realtimeSignature)return;
  const thread=document.getElementById('personnelEnquiryThread');
  const count=document.getElementById('personnelEnquiryMessageCount');
  const status=document.getElementById('personnelEnquiryStatus');
  const updated=document.getElementById('personnelEnquiryUpdated');
  const replyHost=document.getElementById('personnelEnquiryReply');
  const detailActions=document.querySelector('.detail-actions');
  const wasAtBottom=thread?thread.scrollHeight-thread.scrollTop-thread.clientHeight<40:false;
  if(thread) thread.innerHTML=(e.messages||[]).map(messageHtml).join('');
  if(wasAtBottom && thread) thread.scrollTop=thread.scrollHeight;
  if(count) count.textContent=String(e.messages?.length||0);
  if(status){status.className=`status ${statusClass(e.status)}`;status.textContent=e.status;}
  if(updated) updated.textContent=formatDateTime(e.updatedAt);
  if(e.status==='Closed'){
    if(detailActions) detailActions.outerHTML='<div class="closed-notice">This enquiry is closed and is view-only.</div>';
    if(replyHost) replyHost.outerHTML='<div class="reply closed-reply" id="personnelEnquiryReply"><div class="closed-notice" style="padding:10px 12px;border:1px solid #ddd;border-radius:8px;color:#777;background:#f7f7f7;font-size:12px">This enquiry is closed. Replies and status changes are disabled.</div></div>';
  }
  realtimeSignature=signature;
}
function refreshPersonnelDashboardRealtime(){
  const route=parseRoute(); if(route.page!=='dashboard') return;
  const signature=personnelDashboardSignature();
  if(signature===realtimeSignature)return;
  app.innerHTML=dashboard();
  realtimeSignature=signature;
}
function stopRealtime(){
  if(realtimeTimer){clearInterval(realtimeTimer);realtimeTimer=null;}
  if(realtimeStorageHandler){window.removeEventListener('storage',realtimeStorageHandler);realtimeStorageHandler=null;}
  realtimeSignature='';
}
function startRealtime(page){
  stopRealtime();
  if(!['dashboard','enquiry'].includes(page))return;
  if(page==='enquiry'){
    const id=parseRoute().params.get('id')||''; const e=getEnquiries().find(x=>x.id===id);
    realtimeSignature=e?JSON.stringify({updatedAt:e.updatedAt,status:e.status,messages:e.messages?.map(m=>({id:m.id,s:m.senderType,t:m.text,at:m.createdAt}))||[]}):'';
  }else realtimeSignature=personnelDashboardSignature();
  const refresh=()=>page==='enquiry'?refreshPersonnelEnquiryRealtime():refreshPersonnelDashboardRealtime();
  realtimeTimer=setInterval(refresh,1500);
  realtimeStorageHandler=(event)=>{if(event.key===ENQ_KEY || event.key===KB_KEY)refresh();};
  window.addEventListener('storage',realtimeStorageHandler);
}
function changeStatus(id,status){if(!isLoggedIn())return;const all=getEnquiries();const i=all.findIndex(e=>e.id===id);if(i<0)return;const e=all[i];if(e.status==='Closed')return;if(status==='Closed'||status==='In Progress'||status==='Resolved'){e.status=status;e.personnelId=PERSONNEL_EMAIL;e.updatedAt=nowIso();all[i]=e;saveEnquiries(all);go('enquiry',{id})}}
function sendReply(event,id){event.preventDefault();if(!isLoggedIn())return;const text=(document.getElementById('replyText')?.value||'').trim();if(!text)return;const status=document.getElementById('replyStatus')?.value||'In Progress';const all=getEnquiries();const i=all.findIndex(e=>e.id===id);if(i<0)return;const e=all[i];if(e.status==='Closed')return;e.messages=e.messages||[];e.messages.push({id:uid('MSG'),senderType:'personnel',senderId:PERSONNEL_EMAIL,senderName:'BAI Support Personnel',text,createdAt:nowIso()});e.status=status;e.personnelId=PERSONNEL_EMAIL;e.updatedAt=nowIso();saveEnquiries(all);go('enquiry',{id})}
function kb(){if(!isLoggedIn())return '';const articles=getKnowledgeBase();return shell(`<section class="card"><div class="card-head"><div><h2>Knowledge Base Management</h2><p>Articles, FAQs, and service advisories used by the member Help Center and AI Assistant.</p></div><button class="primary" onclick="go('kb-edit',{mode:'new'})">Add Article</button></div><div class="kb-list">${articles.map(kbItem).join('')}</div></section>`,'kb')}
function kbItem(a){return `<div class="kb-item"><div><span class="type">${a.type==='faq'?'FAQ':a.type==='advisory'?'Service Advisory':'Knowledge Article'}</span><h3>${esc(a.title)}</h3><p>${esc(a.body).slice(0,220)}${a.body.length>220?'…':''}</p><small>${esc(a.category)} · Updated ${formatDateTime(a.updatedAt)}</small></div><div><button class="secondary" onclick="go('kb-edit',{id:'${esc(a.id)}'})">Edit</button></div></div>`}
function kbEdit(){if(!isLoggedIn())return '';const id=parseRoute().params.get('id')||'';const a=id?getKnowledgeBase().find(x=>x.id===id):null;const cats=['Application Status','New Passport','Passport Renewal','Lost Passport Replacement','Documents / Requirements','Payment','Appointment / DFA Consular Office','Account / OTP','Other','Service Advisory'];return shell(`<section class="card"><div class="card-head"><div><button class="secondary" onclick="go('kb')">← Back to Knowledge Base</button><h2>${a?'Edit Knowledge Article':'Add Knowledge Article'}</h2><p>Only publish accurate information that can be safely used by the AI Assistant.</p></div></div><form class="kb-form" onsubmit="saveKb(event,'${a?esc(a.id):''}')"><div class="field"><label>Title</label><input id="kbTitle" required value="${esc(a?.title||'')}"></div><div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label>Type</label><select id="kbType"><option value="article" ${a?.type==='article'?'selected':''}>Knowledge Article</option><option value="faq" ${a?.type==='faq'?'selected':''}>FAQ</option><option value="advisory" ${a?.type==='advisory'?'selected':''}>Service Advisory</option></select></div><div class="field"><label>Category</label><select id="kbCategory" required>${cats.map(c=>`<option ${a?.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div></div><div class="field"><label>Tags</label><input id="kbTags" value="${esc((a?.tags||[]).join(', '))}" placeholder="renewal, documents, passport"></div><div class="field"><label>Article Body</label><textarea id="kbBody" required placeholder="Write accurate information for the Help Center and AI Assistant.">${esc(a?.body||'')}</textarea></div><div class="reply-actions"><button class="secondary" type="button" onclick="go('kb')">Cancel</button><button class="primary" type="submit">Save Article</button></div></form></section>`,'kb')}
function saveKb(event,id){event.preventDefault();if(!isLoggedIn())return;const title=document.getElementById('kbTitle')?.value.trim();const type=document.getElementById('kbType')?.value;const category=document.getElementById('kbCategory')?.value;const body=document.getElementById('kbBody')?.value.trim();const tags=(document.getElementById('kbTags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);if(!title||!body||!category)return;const all=getKnowledgeBase();const now=nowIso();if(id){const i=all.findIndex(a=>a.id===id);if(i>=0)all[i]={...all[i],title,type,category,body,tags,updatedAt:now}}else all.push({id:uid('KB'),type,title,category,body,tags,createdAt:now,updatedAt:now});saveKnowledgeBase(all);alert('Knowledge Base article saved successfully.');go('kb')}
function render(){stopRealtime();const {page}=parseRoute();if(page!=='login'&&!isLoggedIn()){go('login');return}const views={login,dashboard,enquiry,kb,'kb-edit':kbEdit};app.innerHTML=(views[page]||login)()||'';startRealtime(page)}
window.addEventListener('hashchange',render);render();
