const KB_KEY='baiHelpKnowledgeBase';
const ENQ_KEY='baiHelpEnquiries';
const NOTIF_KEY='baiHelpNotifications';
const PERSONNEL_SESSION='baiPersonnelPortalLoggedIn';
const PERSONNEL_ACCOUNTS_KEY='baiPersonnelAccounts';
const DEFAULT_PERSONNEL_ACCOUNTS=[
  {id:'PERS-0001',email:'support@bai.local',password:'BAI-support',name:'BAI Support Personnel',role:'Personnel',status:'Active',mustChangePassword:false,contact:''},
  {id:'PERS-0002',email:'maria.santos@bai.local',password:'BAI-support2',name:'Maria Santos',role:'Personnel',status:'Active',mustChangePassword:false,contact:''}
];
function getPersonnelAccounts(){try{const raw=localStorage.getItem(PERSONNEL_ACCOUNTS_KEY);if(raw){const a=JSON.parse(raw);if(Array.isArray(a))return a}}catch(e){} localStorage.setItem(PERSONNEL_ACCOUNTS_KEY,JSON.stringify(DEFAULT_PERSONNEL_ACCOUNTS));return DEFAULT_PERSONNEL_ACCOUNTS.slice()}
function savePersonnelAccounts(v){localStorage.setItem(PERSONNEL_ACCOUNTS_KEY,JSON.stringify(v));localStorage.setItem('baiPersonnelAccountsUpdatedAt',String(Date.now()))}
const app=document.getElementById('app');
const REMOVED_ENQUIRY_IDS = new Set(['ENQ-20260922-2627','ENQ-20260923-3116']);
function removeOldPrototypeEnquiries(){
  try{
    const enquiries=jsonGet(ENQ_KEY,[]);
    const filtered=enquiries.filter(e=>!REMOVED_ENQUIRY_IDS.has(String(e.id||'')));
    if(filtered.length!==enquiries.length) jsonSet(ENQ_KEY,filtered);
  }catch(e){}
}
removeOldPrototypeEnquiries();
let realtimeTimer=null;
let realtimeSignature='';
let realtimeStorageHandler=null;
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function displayPersonName(v){return String(v??'').trim().split(/\s+/).filter(Boolean).map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ')}
function jsonGet(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function jsonSet(key,v){localStorage.setItem(key,JSON.stringify(v))}
const BAI_ATTACHMENT_DB='baiSupportAttachments'; const BAI_ATTACHMENT_STORE='files';
function openAttachmentDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(BAI_ATTACHMENT_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(BAI_ATTACHMENT_STORE))req.result.createObjectStore(BAI_ATTACHMENT_STORE,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Unable to open attachment storage'));});}
async function loadEnquiryAttachment(id){if(!id)return null;try{const db=await openAttachmentDb();const item=await new Promise((resolve,reject)=>{const req=db.transaction(BAI_ATTACHMENT_STORE,'readonly').objectStore(BAI_ATTACHMENT_STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});db.close();return item;}catch(e){return null;}}
function formatAttachmentSize(size){const n=Number(size)||0;if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(2)} MB`;}
function enquiryAttachmentHtml(a){if(!a)return '';const safeName=esc(a.name||'Attachment');const id=esc(a.id||'');const icon=(a.type||'').startsWith('image/')?'🖼️':'📎';return `<div class="enquiry-attachment" data-attachment-id="${id}"><span class="attachment-icon">${icon}</span><div class="attachment-info"><b>${safeName}</b><small>${esc(formatAttachmentSize(a.size))}</small></div><button type="button" class="attachment-view-btn" onclick="viewEnquiryAttachment('${id}','${esc(a.type||'application/octet-stream')}','${safeName}')">View</button></div>`;}
function enquiryAttachmentsHtml(items,fallback=null){const list=Array.isArray(items)?items.filter(Boolean):(items?[items]:[]);if(!list.length&&fallback)return enquiryAttachmentHtml(fallback);return list.map(a=>enquiryAttachmentHtml(a)).join('');}
async function viewEnquiryAttachment(id,type,name){const item=await loadEnquiryAttachment(id);if(!item?.blob){alert('This attachment is no longer available.');return;}const url=URL.createObjectURL(item.blob);const win=window.open(url,'_blank');if(!win){const a=document.createElement('a');a.href=url;a.download=name||item.name||'attachment';a.click();}setTimeout(()=>URL.revokeObjectURL(url),60000);}

function nowIso(){return new Date().toISOString()}
function uid(prefix='ID'){return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}
function getKnowledgeBase(){return jsonGet(KB_KEY,[])}
function saveKnowledgeBase(v){jsonSet(KB_KEY,v)}
function getEnquiries(){const all=jsonGet(ENQ_KEY,[]);let changed=false;const normalized=all.map(e=>{if(e.status==='AI-Assisted'){changed=true;return {...e,status:e.escalationFlag?'Escalated':'Pending'}}return e});if(changed)jsonSet(ENQ_KEY,normalized);return normalized}
function saveEnquiries(v){jsonSet(ENQ_KEY,v)}
function getApps(){try{const raw=sessionStorage.getItem('baiApplications');return raw?JSON.parse(raw):[]}catch{return[]}}
function formatDateTime(v){try{return new Date(v).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch{return v||''}}
function parseRoute(){const raw=(location.hash||'#login').slice(1);const [p,...q]=raw.split('?');return{page:p||'login',params:new URLSearchParams(q.join('?'))}}
function go(page,params={}){const qs=new URLSearchParams(params).toString();location.hash=qs?`${page}?${qs}`:page;render()}
function isLoggedIn(){return sessionStorage.getItem(PERSONNEL_SESSION)==='true'}
function statusClass(v){return String(v||'pending').toLowerCase().replace(/[^a-z]+/g,'-')}
function statusOptions(selected=''){return [['','All Statuses'],...['Pending','Escalated','In Progress','Resolved','Closed'].map(x=>[x,x])].map(([v,t])=>`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(t)}</option>`).join('')}
function categoryOptions(selected=''){const cats=['Application Status','New Passport','Passport Renewal','Lost Passport Replacement','Documents / Requirements','Payment','Appointment / DFA Consular Office','Account / OTP','Other'];return `<option value="">All Categories</option>`+cats.map(c=>`<option value="${esc(c)}" ${selected===c?'selected':''}>${esc(c)}</option>`).join('')}
function login(){if(isLoggedIn()){go('dashboard');return ''}return `<div class="login-screen"><div class="login-card"><div class="brand"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><h2>BAI PERSONNEL PORTAL</h2><p>Authorized support personnel only.</p><form onsubmit="signIn(event)"><div class="field"><label for="email">Work Email</label><input id="email" type="email" autocomplete="username" required placeholder="Enter work email"></div><div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required placeholder="Enter password"></div><div id="loginError" class="error"></div><button class="primary" type="submit">Log In</button></form></div></div>`}
function signIn(e){e.preventDefault();const email=(document.getElementById('email')?.value||'').trim().toLowerCase();const pass=document.getElementById('password')?.value||'';const personnel=getPersonnelAccounts().find(p=>p.email===email&&p.password===pass);if(!personnel){document.getElementById('loginError').textContent='Invalid personnel credentials.';return}if(personnel.status!=='Active'){document.getElementById('loginError').textContent='This personnel account is disabled. Contact an administrator.';return}sessionStorage.setItem(PERSONNEL_SESSION,'true');sessionStorage.setItem('baiPersonnelId',personnel.id);if(personnel.mustChangePassword)go('change-password');else go('dashboard')}
function changePassword(){if(!isLoggedIn())return '';const p=currentPersonnel();return shell(`<section class="card form-card"><h2>Change Temporary Password</h2><p class="sub">For security, create a new password before continuing to the Personnel Portal.</p><form onsubmit="saveNewPassword(event)"><div class="field"><label>New Password</label><input id="newPassword" type="password" minlength="8" required placeholder="Enter new password"></div><div class="field"><label>Confirm New Password</label><input id="confirmPassword" type="password" minlength="8" required placeholder="Confirm new password"></div><div id="passwordError" class="error"></div><button class="primary" type="submit">Save Password</button></form></section>`,`dashboard`)}
function saveNewPassword(e){e.preventDefault();const a=getPersonnelAccounts(),p=a.find(x=>x.id===sessionStorage.getItem('baiPersonnelId'));const n=document.getElementById('newPassword').value,c=document.getElementById('confirmPassword').value;if(n!==c){document.getElementById('passwordError').textContent='Passwords do not match.';return}if(n.length<8){document.getElementById('passwordError').textContent='Password must be at least 8 characters.';return}p.password=n;p.mustChangePassword=false;savePersonnelAccounts(a);go('dashboard')}
function logout(){sessionStorage.removeItem(PERSONNEL_SESSION);sessionStorage.removeItem('baiPersonnelId');go('login')}
function shell(inner,active='dashboard'){return `<div class="personnel-page"><header class="personnel-top"><div class="brand"><img src="assets/dashboard-logo.png" alt="BAI logo"><div><h1>BAI Personnel Portal</h1><p>Support Enquiry Management</p></div></div><div class="top-actions"><button class="${active==='dashboard'?'active':''}" onclick="go('dashboard')">Enquiries</button><button class="${active==='kb'?'active':''}" onclick="go('kb')">Knowledge Base</button><button onclick="logout()">Logout</button></div></header><main class="personnel-content">${inner}</main></div>`}
function dashboard(){if(!isLoggedIn())return '';const {params}=parseRoute();const sf=params.get('status')||'',cf=params.get('category')||'';const all=getEnquiries();const filtered=all.filter(e=>(!sf||e.status===sf)&&(!cf||e.category===cf));const attention=all.filter(e=>['Pending','Escalated','In Progress'].includes(e.status));return shell(`<section class="stats" id="personnelStats"><div class="stat"><b>${all.length}</b><span>All Enquiries</span></div><div class="stat"><b>${attention.length}</b><span>Needs Attention</span></div><div class="stat"><b>${all.filter(e=>e.status==='Resolved').length}</b><span>Resolved</span></div><div class="stat"><b>${all.filter(e=>e.status==='Closed').length}</b><span>Closed</span></div></section><section class="card"><div class="card-head"><div><h2>Enquiry Queue</h2><p>Review, reply to, and manage member enquiries.</p></div><button class="secondary" onclick="go('dashboard')">Clear Filters</button></div><div class="filters"><select onchange="filterStatus(this.value)">${statusOptions(sf)}</select><select onchange="filterCategory(this.value)">${categoryOptions(cf)}</select></div>${filtered.length?`<div class="enquiry-list" id="personnelEnquiryList">${filtered.map(enquiryItem).join('')}</div>`:`<div class="empty" style="padding:28px;text-align:center;color:#999;border:1px dashed #c8d6df;border-radius:10px;font-size:11px">No enquiries match the selected filters.</div>`}</section>`)}
function enquiryItem(e){return `<button class="enquiry-item" onclick="go('enquiry',{id:'${esc(e.id)}'})"><div><span class="status ${statusClass(e.status)}">${esc(e.status)}</span><h3>${esc(e.id)}</h3><b>${esc(e.category)}</b><p>${esc(e.description||'')}</p></div><div class="meta"><span>${esc(e.memberName||'Member')}</span><span>${formatDateTime(e.updatedAt||e.createdAt)}</span></div></button>`}
function filterStatus(v){const {params}=parseRoute();const cat=params.get('category')||'';go('dashboard',v?{status:v,...(cat?{category:cat}:{})}:cat?{category:cat}:{})}
function filterCategory(v){const {params}=parseRoute();const st=params.get('status')||'';go('dashboard',v?{category:v,...(st?{status:st}:{})}:st?{status:st}:{})}
function enquiry(){
 if(!isLoggedIn())return '';
 const id=parseRoute().params.get('id')||''; const e=getEnquiries().find(x=>x.id===id);
 if(!e)return shell(`<section class="card"><h2>Enquiry Not Found</h2><button class="secondary" onclick="go('dashboard')">← Back to Enquiries</button></section>`);
 const rel=e.applicationSnapshot || (e.applicationId?getApps().find(a=>a.id===e.applicationId):null);
 const closed=e.status==='Closed';
 return shell(`<section class="detail-grid"><div class="detail-main"><div class="detail-title"><div><button class="secondary" onclick="go('dashboard')">← Back to Enquiries</button><h2>${esc(e.id)}</h2><span id="personnelEnquiryStatus" class="status ${statusClass(e.status)}">${esc(e.status)}</span></div>${closed?'<div class="closed-readonly-note">Closed — this enquiry is view-only.</div>':`<div class="detail-actions" id="personnelDetailActions"><button onclick="changeStatus('${esc(e.id)}','In Progress')">In Progress</button><button onclick="changeStatus('${esc(e.id)}','Resolved')">Resolved</button><button onclick="changeStatus('${esc(e.id)}','Closed')">Closed</button></div>`}</div><div class="detail-info"><div><span>Member</span><b>${esc(e.memberName)}</b></div><div><span>Email</span><b>${esc(e.memberEmail||e.email||'Not provided')}</b></div><div><span>Related Application</span><b>${esc(rel?`${rel.type} — ${rel.id}`:'None')}</b></div><div><span>Category</span><b>${esc(e.category)}</b></div>${e.sourceArticleId?`<div><span>Source Article</span><b>${esc(e.sourceArticleTitle||e.sourceArticleId)}</b></div>`:''}</div>${e.chatTranscript?.length?`<div class="context"><h3>Original AI Chat Transcript</h3>${e.chatTranscript.map(m=>`<div><b>${m.sender==='member'?'Member':'AI'}:</b> ${esc(m.text)}</div>`).join('')}</div>`:''}<div class="thread" id="personnelEnquiryThread">${(e.messages||[]).map((m,i)=>messageHtml(m,i===0?(e.attachments||e.attachment):null)).join('')}</div>${closed?'':`<form class="reply" id="personnelReplyForm" onsubmit="sendReply(event,'${esc(e.id)}')"><div class="field"><label>Reply to Member</label><textarea id="replyText" required placeholder="Write your response..."></textarea></div><div class="reply-actions"><select id="replyStatus" style="border:1px solid #cfd8dc;border-radius:7px;padding:8px"><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option></select><button class="primary" type="submit">Send Reply</button></div></form>`}</div><aside class="detail-side"><h3 class="side-title">Enquiry Details</h3><div class="side-item"><span>Enquiry ID</span><b>${esc(e.id)}</b></div><div class="side-item"><span>Created</span><b>${formatDateTime(e.createdAt)}</b></div><div class="side-item"><span>Updated</span><b id="personnelEnquiryUpdated">${formatDateTime(e.updatedAt)}</b></div><div class="side-item"><span>Escalated</span><b>${e.escalationFlag?'Yes':'No'}</b></div><div class="side-item"><span>Personnel</span><b>${esc(displayPersonName(e.personnelName||e.personnelId||'Unassigned'))}</b></div><div class="side-item"><span>Messages</span><b id="personnelEnquiryMessageCount">${e.messages?.length||0}</b></div></aside></section>`,'dashboard')}
function messageHtml(m,fallbackAttachment=null){const isMember=String(m.senderType||'').trim().toLowerCase()==='member';const attachmentHtml=isMember?(m.attachments?.length?enquiryAttachmentsHtml(m.attachments):m.attachment?enquiryAttachmentHtml(m.attachment):(Array.isArray(fallbackAttachment)?enquiryAttachmentsHtml(fallbackAttachment):fallbackAttachment?enquiryAttachmentHtml(fallbackAttachment):'')):'';return `<div class="message ${isMember?'member-message':'personnel-message'}"><div><b>${esc(m.senderName||m.senderType)}</b><small>${formatDateTime(m.createdAt)}</small></div><p>${esc(m.text||'')}</p>${attachmentHtml}</div>`}
function personnelDashboardSignature(){
  const all=getEnquiries();
  return JSON.stringify({enquiries:all.map(e=>({id:e.id,updatedAt:e.updatedAt,status:e.status,count:e.messages?.length||0})),kb:getKnowledgeBase().length});
}
function refreshPersonnelEnquiryRealtime(){
  const route=parseRoute(); if(route.page!=='enquiry') return;
  const id=route.params.get('id')||''; const e=getEnquiries().find(x=>x.id===id); if(!e)return;
  const signature=JSON.stringify({updatedAt:e.updatedAt,status:e.status,attachments:(e.attachments||[]).map(a=>a.id),attachment:e.attachment?.id||null,messages:e.messages?.map(m=>({id:m.id,s:m.senderType,t:m.text,a:m.attachment?.id||null,as:(m.attachments||[]).map(a=>a.id),at:m.createdAt}))||[]});
  if(signature===realtimeSignature)return;
  const thread=document.getElementById('personnelEnquiryThread');
  const count=document.getElementById('personnelEnquiryMessageCount');
  const status=document.getElementById('personnelEnquiryStatus');
  const updated=document.getElementById('personnelEnquiryUpdated');
  const wasAtBottom=thread?thread.scrollHeight-thread.scrollTop-thread.clientHeight<40:false;
  if(thread) thread.innerHTML=(e.messages||[]).map((m,i)=>messageHtml(m,i===0?(e.attachments||e.attachment):null)).join('');
  if(wasAtBottom && thread) thread.scrollTop=thread.scrollHeight;
  if(count) count.textContent=String(e.messages?.length||0);
  if(status){status.className=`status ${statusClass(e.status)}`;status.textContent=e.status;}
  if(updated) updated.textContent=formatDateTime(e.updatedAt);
  const actionBox=document.getElementById('personnelDetailActions'); const replyForm=document.getElementById('personnelReplyForm');
  if(e.status==='Closed'){ if(actionBox) actionBox.style.display='none'; if(replyForm) replyForm.style.display='none'; }
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
    realtimeSignature=e?JSON.stringify({updatedAt:e.updatedAt,status:e.status,attachments:(e.attachments||[]).map(a=>a.id),attachment:e.attachment?.id||null,messages:e.messages?.map(m=>({id:m.id,s:m.senderType,t:m.text,a:m.attachment?.id||null,as:(m.attachments||[]).map(a=>a.id),at:m.createdAt}))||[]}):'';
  }else realtimeSignature=personnelDashboardSignature();
  const refresh=()=>page==='enquiry'?refreshPersonnelEnquiryRealtime():refreshPersonnelDashboardRealtime();
  realtimeTimer=setInterval(refresh,1500);
  realtimeStorageHandler=(event)=>{if(event.key===ENQ_KEY || event.key===KB_KEY)refresh();};
  window.addEventListener('storage',realtimeStorageHandler);
}
function currentPersonnel(){const accounts=getPersonnelAccounts();const id=sessionStorage.getItem('baiPersonnelId')||'PERS-0001';const p=accounts.find(p=>p.id===id)||accounts[0];if(p&&p.name)p.name=displayPersonName(p.name);return p;}
function addMemberNotification(email,message,enquiryId,memberIdValue){const raw=jsonGet(NOTIF_KEY,[]);raw.push({id:uid('NTF'),memberId:memberIdValue||null,email:String(email||'').toLowerCase(),message,enquiryId,createdAt:nowIso(),read:false});jsonSet(NOTIF_KEY,raw);}
function changeStatus(id,status){
 if(!isLoggedIn())return;
 const allowed=['Pending','Escalated','In Progress','Resolved','Closed']; if(!allowed.includes(status))return;
 const all=getEnquiries(); const i=all.findIndex(e=>e.id===id); if(i<0)return; const e=all[i];
 if(e.status==='Closed'){alert('Closed enquiries are view-only and cannot be changed.');return;}
 if(e.status===status)return;
 const personnel=currentPersonnel(); e.status=status; e.personnelId=personnel.id; e.personnelName=displayPersonName(personnel.name); e.updatedAt=nowIso(); e.auditTrail=[...(e.auditTrail||[]),{actorType:'personnel',actorId:personnel.id,action:`Changed status to ${status}`,createdAt:e.updatedAt}]; all[i]=e; saveEnquiries(all);
 addMemberNotification(e.memberEmail,`Your enquiry ${e.id} is now ${status}.`,e.id,e.memberId); go('enquiry',{id});
}
function sendReply(event,id){
 event.preventDefault(); if(!isLoggedIn())return; const text=(document.getElementById('replyText')?.value||'').trim(); if(!text)return;
 const status=document.getElementById('replyStatus')?.value||'In Progress'; const all=getEnquiries(); const i=all.findIndex(e=>e.id===id); if(i<0)return; const e=all[i];
 if(e.status==='Closed'){alert('Closed enquiries are view-only and cannot receive replies.');return;}
 const personnel=currentPersonnel(); e.messages=e.messages||[]; e.messages.push({id:uid('MSG'),senderType:'personnel',senderId:personnel.id,senderName:displayPersonName(personnel.name),text,createdAt:nowIso()}); e.status=status; e.personnelId=personnel.id; e.personnelName=displayPersonName(personnel.name); e.updatedAt=nowIso(); e.auditTrail=[...(e.auditTrail||[]),{actorType:'personnel',actorId:personnel.id,action:'Replied to member',createdAt:e.updatedAt}]; all[i]=e; saveEnquiries(all);
 addMemberNotification(e.memberEmail,status==='Resolved'?`Support personnel replied to enquiry ${e.id} and marked it Resolved.`:`Support personnel replied to enquiry ${e.id}.`,e.id,e.memberId); go('enquiry',{id});
}
function kb(){if(!isLoggedIn())return '';const articles=getKnowledgeBase();return shell(`<section class="card"><div class="card-head"><div><h2>Knowledge Base Management</h2><p>Articles, FAQs, and service advisories used by the member Help Center and AI Assistant.</p></div><button class="primary" onclick="go('kb-edit',{mode:'new'})">Add Article</button></div><div class="kb-list">${articles.map(kbItem).join('')}</div></section>`,'kb')}
function kbItem(a){return `<div class="kb-item"><div><span class="type">${a.type==='faq'?'FAQ':a.type==='advisory'?'Service Advisory':'Knowledge Article'}</span><h3>${esc(a.title)}</h3><p>${esc(a.body).slice(0,220)}${a.body.length>220?'…':''}</p><small>${esc(a.category)} · Updated ${formatDateTime(a.updatedAt)}</small></div><div><button class="secondary" onclick="go('kb-edit',{id:'${esc(a.id)}'})">Edit</button><button class="danger" onclick="openDeleteKbModal('${esc(a.id)}')">Delete</button></div></div>`}
function kbEdit(){if(!isLoggedIn())return '';const id=parseRoute().params.get('id')||'';const a=id?getKnowledgeBase().find(x=>x.id===id):null;const cats=['Application Status','New Passport','Passport Renewal','Lost Passport Replacement','Documents / Requirements','Payment','Appointment / DFA Consular Office','Account / OTP','Other','Service Advisory'];return shell(`<section class="card"><div class="card-head"><div><button class="secondary" onclick="go('kb')">← Back to Knowledge Base</button><h2>${a?'Edit Knowledge Article':'Add Knowledge Article'}</h2><p>Only publish accurate information that can be safely used by the AI Assistant.</p></div></div><form class="kb-form" onsubmit="saveKb(event,'${a?esc(a.id):''}')"><div class="field"><label>Title</label><input id="kbTitle" required value="${esc(a?.title||'')}"></div><div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label>Type</label><select id="kbType"><option value="article" ${a?.type==='article'?'selected':''}>Knowledge Article</option><option value="faq" ${a?.type==='faq'?'selected':''}>FAQ</option><option value="advisory" ${a?.type==='advisory'?'selected':''}>Service Advisory</option></select></div><div class="field"><label>Category</label><select id="kbCategory" required>${cats.map(c=>`<option ${a?.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div></div><div class="field"><label>Tags</label><input id="kbTags" value="${esc((a?.tags||[]).join(', '))}" placeholder="renewal, documents, passport"></div><div class="field"><label>Article Body</label><textarea id="kbBody" required placeholder="Write accurate information for the Help Center and AI Assistant.">${esc(a?.body||'')}</textarea></div><div class="reply-actions"><button class="secondary" type="button" onclick="go('kb')">Cancel</button><button class="primary" type="submit">Save Article</button></div></form></section>`,'kb')}
function saveKb(event,id){
 event.preventDefault();
 if(!isLoggedIn())return;
 const title=document.getElementById('kbTitle')?.value.trim();
 const type=document.getElementById('kbType')?.value;
 const category=document.getElementById('kbCategory')?.value;
 const body=document.getElementById('kbBody')?.value.trim();
 const tags=(document.getElementById('kbTags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!title||!body||!category)return;
 const all=getKnowledgeBase();
 const now=nowIso();
 if(id){
   const i=all.findIndex(a=>a.id===id);
   if(i>=0)all[i]={...all[i],title,type,category,body,tags,updatedAt:now,updatedBy:currentPersonnel().id};
   saveKnowledgeBase(all);
   alert('Knowledge Base article saved successfully.');
   go('kb');
 }else{
   all.push({id:uid('KB'),type,title,category,body,tags,createdAt:now,updatedAt:now,createdBy:currentPersonnel().id});
   saveKnowledgeBase(all);
   showAddKbSuccessModal();
 }
}
function showAddKbSuccessModal(){
 const overlay=document.createElement('div');
 overlay.id='addKbSuccessModal';
 overlay.className='modal-overlay';
 overlay.innerHTML=`<div class="modal-card success-modal" role="dialog" aria-modal="true" aria-labelledby="addKbSuccessTitle"><div class="success-icon">✓</div><h3 id="addKbSuccessTitle">Article Added Successfully</h3><p>The Knowledge Base article has been added and is now available to members and the AI Assistant.</p><div class="modal-actions"><button class="primary" type="button" onclick="closeAddKbSuccessModal()">OK</button></div></div>`;
 document.body.appendChild(overlay);
 requestAnimationFrame(()=>overlay.classList.add('show'));
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeAddKbSuccessModal()});
 document.addEventListener('keydown',addKbSuccessEscHandler);
}
function addKbSuccessEscHandler(e){if(e.key==='Escape')closeAddKbSuccessModal()}
function closeAddKbSuccessModal(){const overlay=document.getElementById('addKbSuccessModal');if(overlay){overlay.classList.remove('show');setTimeout(()=>{overlay.remove();go('kb')},120)}document.removeEventListener('keydown',addKbSuccessEscHandler)}
function openDeleteKbModal(id){if(!isLoggedIn())return;const article=getKnowledgeBase().find(a=>a.id===id);if(!article)return;closeDeleteKbModal();const overlay=document.createElement('div');overlay.id='deleteKbModal';overlay.className='modal-overlay';overlay.innerHTML=`<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="deleteKbTitle"><div class="modal-icon">!</div><h3 id="deleteKbTitle">Delete Knowledge Base Article?</h3><p>Are you sure you want to delete <strong>${esc(article.title)}</strong>?</p><p class="modal-note">This article will no longer be available to members or the AI Assistant. Existing enquiries that referenced this article will remain unchanged.</p><div class="modal-actions"><button class="secondary" type="button" onclick="closeDeleteKbModal()">Cancel</button><button class="danger modal-danger" type="button" onclick="confirmDeleteKb('${esc(article.id)}')">Delete Article</button></div></div>`;document.body.appendChild(overlay);requestAnimationFrame(()=>overlay.classList.add('show'));overlay.addEventListener('click',e=>{if(e.target===overlay)closeDeleteKbModal()});document.addEventListener('keydown',deleteKbEscHandler);}
function deleteKbEscHandler(e){if(e.key==='Escape')closeDeleteKbModal()}
function closeDeleteKbModal(){const overlay=document.getElementById('deleteKbModal');if(overlay){overlay.classList.remove('show');setTimeout(()=>overlay.remove(),120)}document.removeEventListener('keydown',deleteKbEscHandler)}
function showDeleteKbSuccessModal(){
 const overlay=document.createElement('div');
 overlay.id='deleteKbSuccessModal';
 overlay.className='modal-overlay';
 overlay.innerHTML=`<div class="modal-card success-modal" role="dialog" aria-modal="true" aria-labelledby="deleteKbSuccessTitle"><div class="success-icon">✓</div><h3 id="deleteKbSuccessTitle">Article Deleted Successfully</h3><p>The Knowledge Base article has been removed and is no longer available to members or the AI Assistant.</p><div class="modal-actions"><button class="primary" type="button" onclick="closeDeleteKbSuccessModal()">OK</button></div></div>`;
 document.body.appendChild(overlay);
 requestAnimationFrame(()=>overlay.classList.add('show'));
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeDeleteKbSuccessModal()});
 document.addEventListener('keydown',deleteKbSuccessEscHandler);
}
function deleteKbSuccessEscHandler(e){if(e.key==='Escape')closeDeleteKbSuccessModal()}
function closeDeleteKbSuccessModal(){const overlay=document.getElementById('deleteKbSuccessModal');if(overlay){overlay.classList.remove('show');setTimeout(()=>{overlay.remove();go('kb')},120)}document.removeEventListener('keydown',deleteKbSuccessEscHandler)}
function confirmDeleteKb(id){if(!isLoggedIn())return;const all=getKnowledgeBase();const article=all.find(a=>a.id===id);if(!article){closeDeleteKbModal();return}saveKnowledgeBase(all.filter(a=>a.id!==id));closeDeleteKbModal();showDeleteKbSuccessModal()}
function render(){stopRealtime();const {page}=parseRoute();if(page!=='login'&&!isLoggedIn()){go('login');return}const cp=currentPersonnel();if(page!=='login'&&cp?.mustChangePassword&&page!=='change-password'){go('change-password');return}const views={login,dashboard,enquiry,kb,'kb-edit':kbEdit,'change-password':changePassword};app.innerHTML=(views[page]||login)()||'';startRealtime(page)}
window.addEventListener('hashchange',render);render();
