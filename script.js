
const app = document.getElementById('app');
let enquiryRealtimeTimer = null;
let enquiryRealtimeSignature = '';
let enquiryRealtimeStorageHandler = null;

function getRegistrationPageType(){
  const page=(location.hash||'#login').slice(1);
  if(page==='adult-register') return 'adult';
  if(page==='minor-register') return 'minor';
  return null;
}
function go(page){
  const currentType=getRegistrationPageType();
  if(currentType) saveRegistrationDraft(currentType);
  location.hash = page; render(); window.scrollTo(0,0);
}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

window.baiUploadFiles = window.baiUploadFiles || {};
/* Persistent MyBAI account registry: account identity survives a fresh website session. */
const BAI_ACCOUNT_REGISTRY_KEY = 'baiAccountRegistry';
function accountEmail(){ return (sessionStorage.getItem('baiAccountEmail')||'').trim(); }
function accountName(){ return sessionStorage.getItem('baiAccountName') || 'MyBAI User'; }
function getAccountRegistry(){ try{ const raw=localStorage.getItem(BAI_ACCOUNT_REGISTRY_KEY); const data=raw?JSON.parse(raw):[]; return Array.isArray(data)?data:[]; }catch(e){ return []; } }
function saveAccountRegistry(accounts){ localStorage.setItem(BAI_ACCOUNT_REGISTRY_KEY,JSON.stringify(accounts)); }
function normalizeAccountEmail(email){ return String(email||'').trim().toLowerCase(); }
function findAccountByEmail(email){ const target=normalizeAccountEmail(email); return getAccountRegistry().find(a=>normalizeAccountEmail(a.email)===target)||null; }
function currentAccount(){
  const id=sessionStorage.getItem('baiAccountId')||'';
  if(id){
    const account=getAccountRegistry().find(a=>a.id===id);
    if(account) return account;
  }
  const email=accountEmail();
  return email?findAccountByEmail(email):null;
}
function accountExists(email){ return !!findAccountByEmail(email) || (!!accountEmail() && normalizeAccountEmail(accountEmail())===normalizeAccountEmail(email)); }

function getApplicationsSafeForAccount(){ try{return JSON.parse(sessionStorage.getItem('baiApplications')||'[]');}catch(e){return [];} }

function migrateLoggedInAccountToRegistry(){ if(sessionStorage.getItem('baiRegistrationPending')==='true') return; if(sessionStorage.getItem('baiLoggedIn')==='true' && accountEmail() && sessionStorage.getItem('baiAccountId') && !findAccountByEmail(accountEmail())) saveCurrentAccountToRegistry(); }


function calculateAge(value){
 const dob=new Date(value+'T00:00:00'); if(Number.isNaN(dob.getTime())) return null;
 const today=new Date(); let age=today.getFullYear()-dob.getFullYear();
 const m=today.getMonth()-dob.getMonth(); if(m<0 || (m===0 && today.getDate()<dob.getDate())) age--;
 return age;
}
function uploadBox(id,label, extraClass=''){
 return `<label class="upload-box ${extraClass}" for="${id}"><input id="${id}" type="file" accept="image/*,.pdf"><span class="upload-icon">${uploadIcon()}</span><span class="upload-label">${label}</span><span class="upload-file-name"></span></label>`;
}
function wireUploadInputs(scope){
 const root=scope||document;
 root.querySelectorAll('.upload-box input[type=file]').forEach(input=>{
   const saved=window.baiUploadFiles[input.id];
   const nameEl=input.closest('.upload-box')?.querySelector('.upload-file-name');
   if(saved?.name && nameEl){ nameEl.textContent=saved.name; input.closest('.upload-box').classList.add('has-file'); }
   input.addEventListener('change',()=>{
     const file=input.files?.[0]; if(file){ window.baiUploadFiles[input.id]=file; }
     const box=input.closest('.upload-box'); const n=box?.querySelector('.upload-file-name');
     if(n) n.textContent=file?.name||'';
     if(box) {
       box.classList.toggle('has-file',!!file);
       if(file) {
         box.classList.remove('upload-invalid');
         box.querySelector('.field-error')?.remove();
       }
     }
     const form=box?.closest('.registration-card');
     if(form){
       const type=form.classList.contains('minor-card')?'minor':(form.classList.contains('renewal-card')?'renewal':'adult');
       if(type==='adult'||type==='minor') saveRegistrationDraft(type);
     }
     input.closest('.field')?.querySelector('.field-error')?.remove();
   });
 });
}
function validateUpload(id,message){
 const input=document.getElementById(id); const hasFile=!!(input?.files?.length || window.baiUploadFiles[id]);
 if(!hasFile){
   const host=input?.closest('.upload-box');
   if(host){ host.classList.add('upload-invalid'); if(!host.querySelector('.field-error')){ const e=document.createElement('div'); e.className='field-error upload-error'; e.textContent=message; host.appendChild(e); } }
   return false;
 }
 const host=input?.closest('.upload-box'); host?.classList.remove('upload-invalid'); host?.querySelector('.field-error')?.remove();
 return true;
}
function clearUploadError(id){ const input=document.getElementById(id); const host=input?.closest('.upload-box'); host?.classList.remove('upload-invalid'); host?.querySelector('.field-error')?.remove(); }
function statusLabel(status){
 const s=String(status||'').toUpperCase();
 if(s==='SUBMITTED') return 'SUBMITTED';
 if(s==='PROCESSING') return 'PROCESSING';
 if(s==='PASSPORT PRINTED') return 'PASSPORT PRINTED';
 if(s==='READY FOR RELEASE') return 'READY FOR RELEASE';
 if(s==='COMPLETED') return 'COMPLETED';
 return s || 'PROCESSING';
}
function timelineFor(status){
 const s=statusLabel(status); let current=2;
 if(s==='SUBMITTED') current=0; else if(s==='PASSPORT PRINTED') current=3; else if(s==='READY FOR RELEASE') current=4; else if(s==='COMPLETED') current=5;
 return [
  ['Application Submitted','Application was successfully submitted.'],
  ['Documents Received','Required documents have been received.'],
  ['Processing','Your application is currently being processed.'],
  ['Passport Printed','Waiting for passport production.'],
  ['Ready for Release','Passport will be available for release or delivery.']
 ].map((x,i)=>({title:x[0],desc:x[1],done:s==='COMPLETED'||i<current,current:s!=='COMPLETED'&&i===current}));
}
function buildTimeline(status){
 return timelineFor(status).map(step=>`<div class="timeline-step ${step.done?'done':''} ${step.current?'current':''}"><span>${step.done?'✓':step.current?'●':'○'}</span><div><b>${step.title}</b><small>${step.desc}</small></div></div>`).join('');
}


function uploadIcon(){
 return `<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M13 29h-1a8 8 0 1 1 2-15.8A10 10 0 0 1 33 18a7 7 0 0 1-1 14h-5" fill="none" stroke="#2f75a8" stroke-width="2" stroke-linecap="round"/><path d="M22 33V17m0 0-6 6m6-6 6 6" fill="none" stroke="#2f75a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function authBrand(){
  return `<div class="auth-brand"><img src="assets/dashboard-logo.png" alt="BAI logo"></div>`;
}


function isValidEmailAddress(value){
 const email=String(value||'').trim();
 return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
function validateLoginEmailInput(input){
 if(!input) return false;
 const wrapper=input.closest('.field');
 if(isValidEmailAddress(input.value)){
   wrapper?.classList.remove('invalid');
   wrapper?.querySelector('.field-error')?.remove();
   return true;
 }
 return false;
}

function loginVerify(){
 const email=esc(sessionStorage.getItem('baiPendingLoginEmail')||'');
 const sent=sessionStorage.getItem('baiLoginOtpSent')==='true';
 return `<div class="auth-screen terminal-auth"><div class="auth-card verify-card">
   <div class="message-screen verify-message">
     <button class="auth-back back-btn" onclick="go('login')" aria-label="Back to login">← Back</button>
     <h1>EMAIL VERIFICATION</h1>
     ${sent ? `<p>A verification <b>One-Time Password (OTP)</b> has been sent<br>to <b>${email||'your email address'}</b>. Enter the code below.</p>` : `<p>We'll send a 7-digit verification code<br>to <b>${email||'your email address'}</b>.</p>`}
     ${sent ? `<div class="field verify-code-field"><label>Verification Code</label><input id="loginOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" pattern="[0-9]{7}" oninput="sanitizeOtp(this)"></div>` : `<button class="primary otp-send-btn" onclick="sendOtp('login')">Send Code</button>`}
     ${sent ? `<p class="verify-warning">do not share the verification code with anyone else</p><button class="primary" onclick="loginUser()">Continue</button><button class="resend-btn" id="loginResend" onclick="sendOtp('login')">Resend Code</button>` : ''}
     ${sent ? `<p class="otp-status" id="loginOtpStatus"></p>` : ''}
   </div>
 </div></div>`;
}

function signup(){
 return `<div class="auth-screen terminal-auth"><div class="auth-choice-card">
   <button class="auth-back auth-back-choice back-btn" onclick="go('login')" aria-label="Back to login">← Back</button>
   <div class="choice-icon"><img src="assets/passport-icon.png" alt="Passport"></div>
   <h1 class="auth-heading">CREATE YOUR MYBAI ACCOUNT</h1>
   <p class="auth-sub">Please select the age group of the person being registered<br>to view the appropriate registration requirements.</p>
   <button class="primary" onclick="go('adult-register')">I am registering an Adult</button>
   <button class="primary" style="margin-top:20px" onclick="go('minor-register')">I am registering a Little Gremlin</button>
   <p class="choice-note">If you are a Minor, please seek out your Parent or<br>Guardian for Help</p>
 </div></div>`;
}

function adultRegister(){
 return `<div class="auth-screen terminal-auth"><div class="registration-card">
   <button class="auth-back auth-back-form back-btn" onclick="go('signup')" aria-label="Back to account type">← Back</button>
   <div class="form-title-row"><div class="choice-icon small"><img src="assets/passport-icon.png" alt="Passport"></div><div><h1>REGISTRATION REQUIREMENTS</h1><p>Please fill out the form to create an Account</p></div></div>
   <p class="id-match-note"><b>Note:</b> The information entered must be the same as the information shown on the valid ID you submit.</p>
   <div class="photo-row">${uploadBox('adultPhoto','Recent<br>Photo','photo-box')}<div class="upload-note"><b>1:1 Recent Photo</b><br>on a white background<br>no facial expressions</div></div>
   <div class="form-grid adult-grid">
     <div class="field"><label>First Name</label><input id="adultFirstName" autocomplete="given-name" oninput="sanitizeName(this)" pattern="[A-Za-zÀ-ÖØ-öø-ÿ\s\'-]+"></div>
     <div class="field"><label>Last Name</label><input id="adultLastName" autocomplete="family-name" oninput="sanitizeName(this)" pattern="[A-Za-zÀ-ÖØ-öø-ÿ\s\'-]+"></div>
     <div class="field"><label>Gender</label><select id="adultGender"><option value="" disabled selected hidden>Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
     <div class="field"><label>Date of Birth</label><input id="adultDob" type="date" aria-label="Date of Birth"></div>
     <div class="field"><label>Civil Status</label><select id="adultCivil"><option value="" disabled selected hidden>Select</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option><option>Separated</option></select></div>
     <div class="field full"><label>E-Mail</label><input id="adultEmail" type="email" placeholder="example@example.com"></div>
   </div>
   ${uploadBox('adultGovernmentId','Valid Government ID','wide-upload')}
   <button class="primary" style="margin-top:10px" onclick="createAccount('adult')">Create Account</button>
   <label class="agreement"><input type="checkbox">Terms of Agreement</label>
   <label class="agreement"><input type="checkbox">Privacy Policy</label>
   <p class="agreement-note">By Creating an Account, you agree to the Bisaya Airlines<br>International’s Terms of Agreement, and Burgers</p>
 </div></div>`;
}

function renewalForm(){
 return `<div class="auth-screen terminal-auth"><div class="registration-card renewal-card">
   <button class="auth-back auth-back-form back-btn" onclick="go('dashboard')" aria-label="Back to dashboard">← Back</button>
   <div class="form-title-row"><div class="choice-icon small"><img src="assets/passport-icon.png" alt="Passport"></div><div><h1>PASSPORT RENEWAL</h1><p>Please fill out the form to renew your existing Passport</p></div></div>
   ${uploadBox('renewalLegalDeclaration','Legal Declaration','wide-upload')}
   <p class="renewal-note">A signed or downloaded statement affirming you are a Filipino<br>Citizen and that all information entered is true under penalty of law.</p>
   <fieldset class="renewal-reason"><legend>Renewal Reason</legend>
     <label class="agreement"><input type="radio" name="renewalReason" value="Passport is Expiring or Expired">Passport is Expiring or Expired</label>
     <label class="agreement"><input type="radio" name="renewalReason" value="Passport is Damaged">Passport is Damaged</label>
   </fieldset>
   ${uploadBox('renewalGovernmentId','Valid Government ID','wide-upload')}
   <div class="field" style="margin-top:10px"><label>DFA Consular Office / Site</label><select id="embassy"><option value="" selected disabled>Choose a DFA Consular Office / Site</option><option value="DFA Office of Consular Affairs - Aseana, Parañaque">DFA Office of Consular Affairs - Aseana, Parañaque</option><option value="DFA Consular Office NCR Central - Pasig">DFA Consular Office NCR Central - Pasig</option><option value="DFA Consular Office NCR East - Mandaluyong">DFA Consular Office NCR East - Mandaluyong</option><option value="DFA Consular Office NCR North - Quezon City">DFA Consular Office NCR North - Quezon City</option><option value="DFA Consular Office NCR Northeast - Quezon City">DFA Consular Office NCR Northeast - Quezon City</option><option value="DFA Consular Office NCR South - Muntinlupa">DFA Consular Office NCR South - Muntinlupa</option><option value="DFA Consular Office NCR West - Manila">DFA Consular Office NCR West - Manila</option></select></div>
   <p class="renewal-note">Please choose the nearest Philippine Embassy or Consulate to<br>proceed with your passport renewal application.</p>
   <button class="primary" onclick="submitRenewal()">Proceed</button>
 </div></div>`;
}
function submitRenewal(){
 const existing=getActiveApplication();
 if(existing){
   sessionStorage.setItem('baiCurrentApplicationId',existing.id);
   alert(`You already have an active ${existing.type} application. You can only have one active passport application at a time. Please check your existing application status before starting another application.`);
   go('status');
   return;
 }
 let ok=true;
 ['renewalLegalDeclaration','renewalGovernmentId'].forEach(id=>{ if(!validateUpload(id, id==='renewalLegalDeclaration'?'Please upload the legal declaration.':'Please upload a valid government ID.')) ok=false; });
 const reason=document.querySelector('input[name="renewalReason"]:checked');
 if(!reason){ alert('Please select a renewal reason.'); ok=false; }
 const embassy=document.getElementById('embassy');
 if(!embassy?.value.trim()){ showFieldError(embassy,'Please select a DFA Consular Office / Site.'); ok=false; }
 if(!ok) return;
 const apps=getApplications();
 const appId=`BAI-APP-${Date.now().toString().slice(-8)}`;
 const app={id:appId,type:'Passport Renewal',arn:'Pending',payment:'Pending',eReceipt:'Pending',email:accountEmail(),contactEmail:accountEmail(),status:'SUBMITTED',renewalReason:reason.value,embassy:embassy.value.trim()};
 apps.push(app); saveApplications(apps); sessionStorage.setItem('baiCurrentApplicationId',appId); sessionStorage.setItem('baiRenewalSubmitted','true');
 go('renewal-continue');
}

function lostPassportReplacement(){
 return `<div class="auth-screen terminal-auth"><div class="registration-card renewal-card">
   <button class="auth-back auth-back-form back-btn" onclick="go('dashboard')" aria-label="Back to dashboard">← Back</button>
   <div class="form-title-row"><div class="choice-icon small"><img src="assets/passport-icon.png" alt="Passport"></div><div><h1>LOST PASSPORT REPLACEMENT</h1><p>Please fill out the form to replace your lost Passport</p></div></div>
   <fieldset class="renewal-reason"><legend>Passport Status When Lost</legend>
     <label class="agreement"><input type="radio" name="lostPassportStatus" value="Valid when lost">Valid when lost</label>
     <label class="agreement"><input type="radio" name="lostPassportStatus" value="Expired when lost">Expired when lost</label>
   </fieldset>
   ${uploadBox('replacementAffidavit','Affidavit of Loss','wide-upload')}
   <p class="renewal-note">Signed, notarized legal document explaining when and how your<br>passport was lost.</p>
   ${uploadBox('replacementGovernmentId','Valid Government ID','wide-upload')}
   <div class="field" style="margin-top:10px"><label>DFA Consular Office / Site</label><select id="replacementEmbassy"><option value="" selected disabled>Choose a DFA Consular Office / Site</option><option value="DFA Office of Consular Affairs - Aseana, Parañaque">DFA Office of Consular Affairs - Aseana, Parañaque</option><option value="DFA Consular Office NCR Central - Pasig">DFA Consular Office NCR Central - Pasig</option><option value="DFA Consular Office NCR East - Mandaluyong">DFA Consular Office NCR East - Mandaluyong</option><option value="DFA Consular Office NCR North - Quezon City">DFA Consular Office NCR North - Quezon City</option><option value="DFA Consular Office NCR Northeast - Quezon City">DFA Consular Office NCR Northeast - Quezon City</option><option value="DFA Consular Office NCR South - Muntinlupa">DFA Consular Office NCR South - Muntinlupa</option><option value="DFA Consular Office NCR West - Manila">DFA Consular Office NCR West - Manila</option></select></div>
   <p class="renewal-note">Please choose the nearest Philippine Embassy or Consulate to<br>proceed with your passport replacement application.</p>
   <button class="primary" onclick="submitLostPassportReplacement()">Proceed</button>
 </div></div>`;
}
function submitLostPassportReplacement(){
 const existing=getActiveApplication();
 if(existing){
   sessionStorage.setItem('baiCurrentApplicationId',existing.id);
   alert(`You already have an active ${existing.type} application. You can only have one active passport application at a time. Please check your existing application status before starting another application.`);
   go('status');
   return;
 }
 let ok=true;
 const lostStatus=document.querySelector('input[name="lostPassportStatus"]:checked');
 if(!lostStatus){ alert('Please select whether the passport was valid or expired when it was lost.'); ok=false; }
 if(!validateUpload('replacementAffidavit','Please upload the affidavit of loss.')) ok=false;
 if(!validateUpload('replacementGovernmentId','Please upload a valid government ID.')) ok=false;
 const embassy=document.getElementById('replacementEmbassy');
 if(!embassy?.value.trim()){ showFieldError(embassy,'Please select a DFA Consular Office / Site.'); ok=false; }
 if(!ok) return;
 const apps=getApplications();
 const appId=`BAI-APP-${Date.now().toString().slice(-8)}`;
 const app={id:appId,type:'Lost Passport Replacement',arn:'Pending',payment:'Pending',eReceipt:'Pending',email:accountEmail(),contactEmail:accountEmail(),status:'SUBMITTED',lostPassportStatus:lostStatus.value,embassy:embassy.value.trim()};
 apps.push(app); saveApplications(apps); sessionStorage.setItem('baiCurrentApplicationId',appId); go('replacement-continue');
}
function replacementContinue(){
 return `<div class="auth-screen terminal-auth"><div class="auth-card renewal-continue-card">
   <div class="message-screen renewal-message">
     <h1>PASSPORT REPLACEMENT</h1>
     <p>Your lost passport replacement form has been submitted. We will email you as soon<br>as your appointment at the selected Philippine Embassy or Consulate is ready.</p>
     <button class="primary" onclick="go('dashboard')">Continue</button>
   </div>
 </div></div>`;
}

function renewalContinue(){
 return `<div class="auth-screen terminal-auth"><div class="auth-card renewal-continue-card">
   <div class="message-screen renewal-message">
     <h1>PASSPORT RENEWAL</h1>
     <p>Your form has been submitted. We will email you as soon<br>as your appointment at the selected Philippine Embassy<br>is ready.</p>
     <button class="primary" onclick="go('dashboard')">Continue</button>
   </div>
 </div></div>`;
}

function verify(){
 const email=esc(sessionStorage.getItem('baiAccountEmail')||'');
 const sent=sessionStorage.getItem('baiRegistrationOtpSent')==='true';
 const backPage=sessionStorage.getItem('baiAccountType')==='minor'?'minor-register':'adult-register';
 return `<div class="auth-screen terminal-auth"><div class="auth-card verify-card">
   <div class="message-screen verify-message">
     <button class="auth-back back-btn" onclick="go('${backPage}')" aria-label="Back to registration">← Back</button>
     <h1>EMAIL VERIFICATION</h1>
     ${sent ? `<p>A verification <b>One-Time Password (OTP)</b> has been sent<br>to <b>${email||'your email address'}</b>. Enter the code below.</p>` : `<p>We'll send a 7-digit verification code<br>to <b>${email||'your email address'}</b>.</p>`}
     ${sent ? `<div class="field verify-code-field"><label>Verification Code</label><input id="registrationOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" pattern="[0-9]{7}" oninput="sanitizeOtp(this)"></div>` : `<button class="primary otp-send-btn" onclick="sendOtp('registration')">Send Code</button>`}
     ${sent ? `<p class="verify-warning">do not share the verification code with anyone else</p><button class="primary" onclick="completeRegistrationVerification()">Continue</button><button class="resend-btn" id="registrationResend" onclick="sendOtp('registration')">Resend Code</button>` : ''}
     ${sent ? `<p class="otp-status" id="registrationOtpStatus"></p>` : ''}
   </div>
 </div></div>`;
}



function accountApplicationsKey(id){ return `baiApplications_${id}`; }
function getApplications(){ const id=sessionStorage.getItem('baiAccountId'); if(id){ try{ const raw=localStorage.getItem(accountApplicationsKey(id)); if(raw!==null){ const apps=JSON.parse(raw); sessionStorage.setItem('baiApplications',JSON.stringify(apps)); return Array.isArray(apps)?apps:[]; } }catch(e){} } return getApplicationsSafeForAccount(); }
function saveApplications(apps){ const list=Array.isArray(apps)?apps:[]; sessionStorage.setItem('baiApplications',JSON.stringify(list)); const id=sessionStorage.getItem('baiAccountId'); if(id){ localStorage.setItem(accountApplicationsKey(id),JSON.stringify(list)); const accounts=getAccountRegistry(); const idx=accounts.findIndex(a=>a.id===id); if(idx>=0){ accounts[idx].applications=list; saveAccountRegistry(accounts); } } }
function getCurrentApplication(){
 const apps=getApplications();
 const currentId=sessionStorage.getItem('baiCurrentApplicationId');
 return apps.find(a=>a.id===currentId) || apps[0] || {id:'No application linked',type:'No application',arn:'',payment:'',eReceipt:'',email:'',status:'NOT LINKED'};
}
function clearFormErrors(scope){
  (scope||document).querySelectorAll('.field-error').forEach(el=>el.remove());
  (scope||document).querySelectorAll('.field.invalid').forEach(el=>el.classList.remove('invalid'));
  (scope||document).querySelectorAll('.agreement.invalid').forEach(el=>el.classList.remove('invalid'));
}
function showFieldError(field,message){
  if(!field) return;
  const wrapper=field.closest('.field');
  if(wrapper){ wrapper.classList.add('invalid'); const err=document.createElement('div'); err.className='field-error'; err.textContent=message; wrapper.appendChild(err); }
}
function showAgreementError(checkbox,message){
  const label=checkbox?.closest('.agreement'); if(label){ label.classList.add('invalid'); const err=document.createElement('div'); err.className='field-error agreement-error'; err.textContent=message; label.appendChild(err); }
}
function sanitizeName(input){ input.value=input.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g,''); }





function formatPersonName(value){ return value.trim().toLowerCase().split(/(\s+)/).map(part=>/^\s+$/.test(part)?part:(part?part.charAt(0).toUpperCase()+part.slice(1):part)).join(''); }


function getActiveApplication(){
 const apps=getApplications();
 return apps.find(a=>!['COMPLETED','CANCELLED'].includes(String(a.status||'').toUpperCase())) || null;
}
function hasActiveApplication(){
 return !!getActiveApplication();
}
function newApplication(){
 const name=esc(accountName()); const dob=esc(formatDisplayDate(sessionStorage.getItem('baiAccountDob')||'')); const gender=esc(sessionStorage.getItem('baiAccountGender')||''); const email=esc(accountEmail());
 return `<div class="auth-screen terminal-auth"><div class="auth-card compact new-application-card"><button class="auth-back auth-back-form back-btn" onclick="go('dashboard')" aria-label="Back to dashboard">← Back</button>${authBrand()}<div class="message-screen"><h1>NEW PASSPORT APPLICATION</h1><p>Review your account information before submitting a new passport application.</p><div class="application-review"><div><span>Full Name</span><b>${name}</b></div><div><span>Date of Birth</span><b>${dob}</b></div><div><span>Gender</span><b>${gender}</b></div><div><span>Email Address</span><b>${email}</b></div></div><div class="field" style="width:100%;text-align:left"><label>DFA Consular Office / Site</label><select id="newApplicationLocation"><option value="" selected disabled>Choose a DFA Consular Office / Site</option><option value="DFA Office of Consular Affairs - Aseana, Parañaque">DFA Office of Consular Affairs - Aseana, Parañaque</option><option value="DFA Consular Office NCR Central - Pasig">DFA Consular Office NCR Central - Pasig</option><option value="DFA Consular Office NCR East - Mandaluyong">DFA Consular Office NCR East - Mandaluyong</option><option value="DFA Consular Office NCR North - Quezon City">DFA Consular Office NCR North - Quezon City</option><option value="DFA Consular Office NCR Northeast - Quezon City">DFA Consular Office NCR Northeast - Quezon City</option><option value="DFA Consular Office NCR South - Muntinlupa">DFA Consular Office NCR South - Muntinlupa</option><option value="DFA Consular Office NCR West - Manila">DFA Consular Office NCR West - Manila</option></select></div><button class="primary" onclick="submitNewApplication()">Submit New Passport Application</button></div></div></div>`;
}
function submitNewApplication(){
 const existing=getActiveApplication();
 if(existing){
   sessionStorage.setItem('baiCurrentApplicationId',existing.id);
   alert(`You already have an active ${existing.type} application. You can only have one active passport application at a time. Please check your existing application status before starting another application.`);
   go('status');
   return;
 }
 const location=document.getElementById('newApplicationLocation');
 if(!location?.value.trim()){ showFieldError(location,'Please select a DFA Consular Office / Site.'); return; }
 const apps=getApplications(); const appId=`BAI-APP-${Date.now().toString().slice(-8)}`;
 const app={id:appId,type:'New Passport',arn:'Pending',payment:'Pending',eReceipt:'Pending',email:accountEmail(),contactEmail:accountEmail(),status:'SUBMITTED',preferredLocation:location.value.trim()};
 apps.push(app); saveApplications(apps); sessionStorage.setItem('baiCurrentApplicationId',appId); sessionStorage.setItem('baiNewApplicationSubmitted','true'); go('status');
}

function linkApplication(){
 return memberShell(`<div class="page-panel" style="max-width:720px;margin:auto;text-align:center">
   <h1>LINK YOUR PASSPORT APPLICATION</h1><p>Enter the reference information provided by the DFA<br>to connect your passport application to your MyBAI account.</p>
   <div class="field" style="width:100%;text-align:left"><label>DFA Appointment Reference No. (ARN)</label><input id="dfaArn" inputmode="numeric" maxlength="17" placeholder="17-digit ARN" oninput="this.value=this.value.replace(/\D/g,'').slice(0,17)"></div>
   <div class="field" style="width:100%;text-align:left;margin-top:12px"><label>Application Type</label><select id="linkApplicationType"><option value="New Passport">New Passport</option><option value="Passport Renewal">Passport Renewal</option><option value="Lost Passport Replacement">Lost Passport Replacement</option></select></div>
   <button class="primary" style="margin-top:18px" onclick="linkPassportApplication()">LINK APPLICATION</button>
   <button class="secondary-action" style="margin-top:10px" onclick="go('status')">← Back to Check Status</button>
 </div>`,'help');
}
function showLinkApplicationMessage(message){
 const existing=document.getElementById('linkApplicationMessage');
 if(existing) existing.remove();
 const modal=document.createElement('div');
 modal.id='linkApplicationMessage';
 modal.className='link-application-modal';
 modal.innerHTML=`<div class="link-application-modal-card" role="dialog" aria-modal="true" aria-labelledby="linkApplicationMessageTitle"><h3 id="linkApplicationMessageTitle">Invalid ARN</h3><p>${esc(message)}</p><button type="button" class="primary" onclick="closeLinkApplicationMessage()">OK</button></div>`;
 document.body.appendChild(modal);
}
function closeLinkApplicationMessage(){ document.getElementById('linkApplicationMessage')?.remove(); }
function linkPassportApplication(){
 const arn=document.getElementById('dfaArn'), type=document.getElementById('linkApplicationType'); if(!arn||!type) return;
 const value=arn.value.trim();
 if(!value){ showLinkApplicationMessage('Please enter your 17-digit DFA Appointment Reference No. (ARN).'); return; }
 if(!/^\d{17}$/.test(value)){ showLinkApplicationMessage('Please enter a valid 17-digit DFA Appointment Reference No. (ARN). Example: 00282023010600141.'); return; }
 const apps=getApplications(); if(apps.some(a=>String(a.arn||'').toLowerCase()===value.toLowerCase())){ showLinkApplicationMessage('This DFA Appointment Reference No. is already linked.'); return; }
 const active=getActiveApplication();
 if(active){
   sessionStorage.setItem('baiCurrentApplicationId',active.id);
   showLinkApplicationMessage(`You already have an active ${active.type} application. You can only have one active passport application at a time. Please check your existing application status before linking another application.`);
   return;
 }
 const appId=`BAI-APP-${Date.now().toString().slice(-8)}`; const paymentRef=`DF${Math.random().toString(36).slice(2,10).toUpperCase()}`; const eReceipt=`ER-${Date.now().toString().slice(-10)}`;
 const application={id:appId,type:type.value,arn:value,payment:paymentRef,eReceipt:eReceipt,email:accountEmail(),contactEmail:accountEmail(),status:'PROCESSING'};
 apps.push(application); saveApplications(apps); sessionStorage.setItem('baiApplicationLinked','true'); sessionStorage.setItem('baiDfaArn',application.arn); sessionStorage.setItem('baiDfaPayment',application.payment); sessionStorage.setItem('baiCurrentApplicationId',application.id); go('application-linked');
}

function applicationLinked(){
 const app=getCurrentApplication();
 return `<div class="auth-screen terminal-auth"><div class="auth-card compact">${authBrand()}<div class="message-screen"><h1>APPLICATION LINKED</h1><p>Your DFA passport application has been successfully linked<br>to your BAI account.</p>
 <div class="reference-grid" style="margin:18px 0;text-align:left"><div><span>BAI Application ID</span><b>${esc(app.id)}</b></div><div><span>Application Type</span><b>${esc(app.type)}</b></div><div><span>DFA Appointment Reference No. (ARN)</span><b>${esc(app.arn||'')}</b></div><div><span>DFA Payment Reference</span><b>${esc(app.payment||'')}</b></div><div><span>eReceipt No.</span><b>${esc(app.eReceipt||'')}</b></div></div>
 <p>Your BAI Application ID can now be used to check your application status.</p><button class="primary" onclick="go('status')">View Application Status</button></div></div></div>`;
}


function submitComplaint(event){
 event.preventDefault();
 const email = document.getElementById('complaintEmail');
 if(email && !email.checkValidity()){
   email.reportValidity();
   return;
 }
 go('complaint-done');
}


function dashboard(){
 const apps=getApplications(), current=apps.length?getCurrentApplication():null;
 return `<div class="dashboard">
   <aside class="sidebar"><div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><nav class="nav">
     <button class="active" onclick="go('dashboard')">⌂ &nbsp;Dashboard</button><button onclick="go('profile')">● &nbsp;My Profile</button><button onclick="go('status')">⌕ &nbsp;Check Status</button><button onclick="go('settings')">Settings</button>
   </nav><div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('help-center')">Contact Support</button></div></aside>
   <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions">
     <button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${notificationBadgeHtml()}</button>
     <span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span>
     <div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)" aria-expanded="false"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile'); closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div>
   </div></header>
   <main class="content"><section class="hero"><h2>Fly with Pride,<br>Connect the World.</h2><p>BAI - Where Pride Takes Flight.</p></section>
   <div class="cards">
    <section class="panel"><h3>Recent Updates</h3>${current?`<div class="update"><span class="dot blue">i</span><span>${esc(current.type)} is currently ${esc(statusLabel(current.status).toLowerCase())}.<small style="display:block">Application ID: ${esc(current.id)}</small></span><time>Latest update<br>Today</time></div><div class="update"><span class="dot blue">i</span><span>${current.arn&&current.arn!=='Pending'?'Your DFA reference information is linked to this application.':'Your application record has been created and is ready for tracking.'}<small style="display:block">ARN: ${esc(current.arn||'Pending')}</small></span><time>Latest update<br>Today</time></div>`:`<div class="update"><span class="dot blue">i</span><span>Your MyBAI account is ready. No passport application is currently linked.<small style="display:block">You can start a new application or link an existing one.</small></span><time>Today</time></div>`}</section>
    <section class="panel"><h3>PASSPORT OVERVIEW</h3>${current?`<div class="passport"><strong>Application</strong><div class="name">${esc(current.type)}</div><strong>Application ID</strong><div class="id">${esc(current.id)}</div><div class="map">⌁</div></div><div class="trip"><div class="trip-head"><span>Application Status</span><span onclick="go('status')" style="cursor:pointer">View details</span></div><div class="route"><span>${esc(statusLabel(current.status))}</span></div><div class="trip-meta">DFA ARN <b>${esc(current.arn||'Pending')}</b><span class="status">ACTIVE</span></div></div>`:`<div class="passport"><strong>MyBAI Account</strong><div class="name">${esc(accountName())}</div><div class="map">⌁</div></div><div class="trip"><div class="trip-head"><span>No Passport Application Linked</span><span onclick="go('status')" style="cursor:pointer">Check Status</span></div><div class="route"><span>Start or link an application when you are ready.</span></div><div class="trip-meta">Your account can have multiple passport applications over time.</div></div>`}</section>
   </div>
   <section class="panel services-panel"><h3>PASSPORT SERVICES</h3><div class="service-actions"><button class="primary" onclick="go('new-application')">Apply for New Passport</button><button class="primary" onclick="go('renewal-form')">Renew Passport</button><button class="primary" onclick="go('replacement-form')">Replace Lost Passport</button><button class="link-btn service-link" onclick="go('link-application')">Link Existing Passport Application</button></div></section>
   </main><footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer>
 </div>`;
}

function status(){
 const apps=getApplications(); const current=apps.length?getCurrentApplication():null;
 const list=apps.map(a=>`<div class="application-list-item ${current&&a.id===current.id?'selected':''}"><div><span class="status-label">${esc(a.type)}</span><h3>${esc(a.id)}</h3><small>${esc(statusLabel(a.status))}</small></div><button class="primary" onclick="viewApplication('${esc(a.id)}')">View Status</button></div>`).join('');
 return `<div class="dashboard"><aside class="sidebar"><div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><nav class="nav"><button onclick="go('dashboard')">⌂ &nbsp;Dashboard</button><button onclick="go('profile')">● &nbsp;My Profile</button><button class="active" onclick="go('status')">⌕ &nbsp;Check Status</button><button onclick="go('settings')">Settings</button></nav><div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('help-center')">Contact Support</button></div></aside>
 <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions"><button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${notificationBadgeHtml()}</button><span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span><div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile');closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div></div></header>
 <main class="content"><div class="page-panel status-panel"><h2>Check Passport Application Status</h2><p class="status-intro">Select a passport application to view its current status and reference information.</p>
 ${apps.length?`<div class="application-list">${list}</div>`:`<div class="empty-status"><h3>No Passport Application Linked</h3><p>Your MyBAI account is ready, but there is no passport application linked yet.</p><div class="status-empty-actions"><button class="primary" onclick="go('new-application')">Apply for New Passport</button><button class="primary" onclick="go('link-application')">Link Existing Application</button></div></div>`}
 ${current?`<div id="statusResult" class="status-result visible"><div class="status-result-head"><div><span class="status-label">PASSPORT APPLICATION</span><h3>Application Details</h3></div><span class="current-status">${esc(statusLabel(current.status))}</span></div><div class="reference-grid"><div><span>Application Type</span><b>${esc(current.type)}</b></div><div><span>BAI Application ID</span><b>${esc(current.id)}</b></div><div><span>Appointment Reference No. (ARN)</span><b>${esc(current.arn||'Not linked')}</b></div><div><span>Payment Reference</span><b>${esc(current.payment||'Not linked')}</b></div><div><span>eReceipt No.</span><b>${esc(current.eReceipt||'Not linked')}</b></div></div><div class="status-timeline">${buildTimeline(current.status)}</div><p class="status-note">Your application references are associated with this passport application record.</p>${current && !['COMPLETED','CANCELLED'].includes(String(current.status||'').toUpperCase())?`<div class="status-actions" style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">${String(current.status||'').toUpperCase()==='READY FOR RELEASE'?`<button class="primary" onclick="confirmApplicationReceived('${esc(current.id)}')">Confirm Passport Received</button>`:''}<button class="secondary-action" onclick="cancelApplication('${esc(current.id)}')">Cancel Application</button></div>`:''}</div>`:''}
 </div></main><footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer></div>`;
}
function viewApplication(id){ if(!getApplications().some(a=>a.id===id)) return; sessionStorage.setItem('baiCurrentApplicationId',id); go('status'); }
function showApplicationStatus(){ const first=getApplications()[0]; if(first){sessionStorage.setItem('baiCurrentApplicationId',first.id);go('status');} }

function formatDisplayDate(value){
 const v=String(value||'').trim();
 if(!v) return '—';
 const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 return m ? `${m[2]}/${m[3]}/${m[1]}` : v;
}
function profile(){
 const email=esc(accountEmail()); const success=sessionStorage.getItem('baiEmailChangeSuccess')==='true'; if(success) sessionStorage.removeItem('baiEmailChangeSuccess');
 const civil=sessionStorage.getItem('baiAccountCivilStatus')||'Not applicable for minor accounts';
 return `<div class="dashboard"><aside class="sidebar"><div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><nav class="nav"><button onclick="go('dashboard')">⌂ &nbsp;Dashboard</button><button class="active">● &nbsp;My Profile</button><button onclick="go('status')">⌕ &nbsp;Check Status</button><button onclick="go('settings')">Settings</button></nav><div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('help-center')">Contact Support</button></div></aside>
 <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions"><button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${notificationBadgeHtml()}</button><span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span><div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile');closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div></div></header>
 <main class="content"><div class="page-panel profile-panel"><h2>My Profile</h2>${success?`<div class="profile-success">Email address updated successfully.</div>`:''}<div class="stat-grid profile-details-grid"><div class="stat"><b>${esc(accountName())}</b>Full Name</div><div class="stat"><b>${esc(sessionStorage.getItem('baiAccountGender')||'—')}</b>Gender</div><div class="stat"><b>${esc(civil)}</b>Civil Status</div><div class="stat"><b>${esc(formatDisplayDate(sessionStorage.getItem('baiAccountDob')||''))}</b>Date of Birth</div><div class="stat"><b>Active</b>Account Status</div></div><hr style="margin:30px 0;border:0;border-top:1px solid #ddd"><div class="email-account-section"><div><label>Email Address</label><div class="current-email">${email||'No email address on file'}</div><p class="profile-helper">Your email address is used to receive OTPs when signing in to your MyBAI account.</p></div><button class="primary change-email-btn" onclick="go('change-email')">Change Email Address</button></div></div></main><footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer></div>`;
}

function changeEmail(){
 const current=esc(sessionStorage.getItem('baiAccountEmail')||'');
 const sent=sessionStorage.getItem('baiEmailChangeOtpSent')==='true';
 const pending=esc(sessionStorage.getItem('baiPendingNewEmail')||'');
 return `<div class="dashboard">
   <aside class="sidebar">
     <div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div>
     <nav class="nav">
       <button onclick="go('dashboard')">⌂ &nbsp;Dashboard</button>
       <button class="active" onclick="go('profile')">● &nbsp;My Profile</button>
       <button onclick="go('status')">⌕ &nbsp;Check Status</button>
       <button onclick="go('settings')">Settings</button>
     </nav>
     <div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('help-center')">Contact Support</button></div>
   </aside>
   <header class="topbar">
     <div class="welcome">Good Day, ${esc(sessionStorage.getItem('baiAccountName')||'Juan Dela Cruz')}!<small>Welcome Back to BAI!</small></div>
     <div class="top-actions">
       <button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()">
         <svg viewBox="0 0 32 32" aria-hidden="true">
           <path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
           <path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
         </svg>
         ${notificationBadgeHtml()}
       </button>
       <span class="profile-avatar" aria-label="User profile">
         <svg viewBox="0 0 32 32" aria-hidden="true">
           <circle cx="16" cy="10" r="5" fill="white"/>
           <path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/>
         </svg>
       </span>
       <div class="user-menu" id="userMenu">
         <button class="user-menu-toggle" onclick="toggleUserMenu(event)" aria-expanded="false">
           <span>${esc(sessionStorage.getItem('baiAccountName')||'Juan Dela Cruz')}</span><span class="chevron">⌄</span>
         </button>
         <div class="user-dropdown">
           <button onclick="go('profile'); closeUserMenu()">My Profile</button>
           <button class="logout" onclick="logout()">Logout</button>
         </div>
       </div>
     </div>
   </header>
   <main class="content">
     <div class="page-panel email-change-panel">
       <button class="profile-back back-btn" onclick="go('profile')">← Back to My Profile</button>
       <h2>Change Email Address</h2>
       <p class="status-intro">Your current email address will remain active until the new email address is successfully verified.</p>
       <div class="email-change-current"><span>Current Email Address</span><b>${current||'No email address on file'}</b></div>
       ${sent ? `
         <div class="field"><label>New Email Address</label><input value="${pending}" type="email" readonly></div>
         <p class="email-verify-instruction">A 7-digit verification code has been sent to your new email address.</p>
         <div class="field email-change-otp"><label>Verification Code</label><input id="emailChangeOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" pattern="[0-9]{7}" oninput="sanitizeOtp(this)"></div>
         <p class="verify-warning">do not share the verification code with anyone else</p>
         <button class="primary" onclick="verifyEmailChange()">Verify and Update Email</button>
         <button class="resend-btn" id="emailChangeResend" onclick="sendEmailChangeOtp()">Resend Code</button>
         <p class="otp-status" id="emailChangeOtpStatus"></p>
       ` : `
         <div class="field"><label>New Email Address</label><input id="newEmailAddress" type="email" autocomplete="email" placeholder="Enter your new email address"></div>
         <button class="primary" onclick="sendEmailChangeOtp()">Send Verification Code</button>
       `}
     </div>
   </main>
   <footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer>
 </div>`;
}

function sendEmailChangeOtp(){
 const input=document.getElementById('newEmailAddress');
 const pending=sessionStorage.getItem('baiPendingNewEmail')||'';
 const value=(input?.value||pending).trim();
 input?.closest('.field')?.querySelector('.field-error')?.remove();
 input?.closest('.field')?.classList.remove('invalid');
 if(!value){
   showFieldError(input,'Please enter your new email address.');
   return;
 }
 if(!isValidEmailAddress(value)){
   showFieldError(input,'Please enter a valid email address.');
   return;
 }
 const current=(sessionStorage.getItem('baiAccountEmail')||'').trim().toLowerCase();
 if(value.toLowerCase()===current){
   showFieldError(input,'Please enter a different email address.');
   return;
 }
 if(findAccountByEmail(value)){
   showFieldError(input,'An account with this email address already exists. Please use a different email address.');
   return;
 }
 sessionStorage.setItem('baiPendingNewEmail',value);
 sessionStorage.setItem('baiEmailChangeOtp',String(Math.floor(1000000 + Math.random()*9000000)));
 sessionStorage.setItem('baiEmailChangeOtpSent','true');
 sessionStorage.setItem('baiEmailChangeOtpSentAt',String(Date.now()));
 render();
}

function startEmailChangeCooldown(){
 const btn=document.getElementById('emailChangeResend');
 const status=document.getElementById('emailChangeOtpStatus');
 const sentAt=Number(sessionStorage.getItem('baiEmailChangeOtpSentAt')||0);
 if(!btn || !sentAt) return;
 let timer;
 const update=()=>{
   const remaining=Math.max(0,60000-(Date.now()-sentAt));
   const seconds=Math.ceil(remaining/1000);
   if(remaining>0){
     btn.disabled=true;
     btn.textContent=`Resend Code in ${seconds}s`;
   }else{
     btn.disabled=false;
     btn.textContent='Resend Code';
     clearInterval(timer);
   }
 };
 update();
 timer=setInterval(update,1000);
 if(status) status.textContent='A verification code was sent to your new email address.';
}



function toggleUserMenu(event){
  event.stopPropagation();
  const menu=document.getElementById('userMenu');
  if(!menu) return;
  const open=menu.classList.toggle('open');
  const btn=menu.querySelector('.user-menu-toggle');
  if(btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function closeUserMenu(){
  const menu=document.getElementById('userMenu');
  if(menu){
    menu.classList.remove('open');
    const btn=menu.querySelector('.user-menu-toggle');
    if(btn) btn.setAttribute('aria-expanded','false');
  }
}
function sanitizeOtp(input){
  if(!input) return;
  input.value = input.value.replace(/\D/g,'').slice(0,7);
  const wrapper=input.closest('.field');
  if(input.value.length===7){
    wrapper?.classList.remove('invalid');
    wrapper?.querySelector('.field-error')?.remove();
  }
}
function validateOtp(inputId){
  const input=document.getElementById(inputId);
  if(!input) return false;
  const wrapper=input.closest('.field');
  wrapper?.classList.remove('invalid');
  wrapper?.querySelector('.field-error')?.remove();
  input.value=input.value.replace(/\D/g,'').slice(0,7);
  if(input.value.length!==7){
    showFieldError(input,'You must input a 7 digit code.');
    return false;
  }
  return true;
}
function otpStorageKey(kind){ return kind==='login' ? 'baiLoginOtp' : 'baiRegistrationOtp'; }
function otpSentKey(kind){ return kind==='login' ? 'baiLoginOtpSent' : 'baiRegistrationOtpSent'; }
function otpSentAtKey(kind){ return kind==='login' ? 'baiLoginOtpSentAt' : 'baiRegistrationOtpSentAt'; }
function sendOtp(kind){
  const code=String(Math.floor(1000000 + Math.random()*9000000));
  sessionStorage.setItem(otpStorageKey(kind),code);
  sessionStorage.setItem(otpSentKey(kind),'true');
  sessionStorage.setItem(otpSentAtKey(kind),String(Date.now()));
  render();
}
function startOtpCooldown(kind){
  const id=kind==='login'?'loginResend':'registrationResend';
  const statusId=kind==='login'?'loginOtpStatus':'registrationOtpStatus';
  const btn=document.getElementById(id);
  const status=document.getElementById(statusId);
  const sentAt=Number(sessionStorage.getItem(otpSentAtKey(kind))||0);
  if(!btn || !sentAt) return;
  let timer;
  const update=()=>{
    const remaining=Math.max(0,60000-(Date.now()-sentAt));
    const seconds=Math.ceil(remaining/1000);
    if(remaining>0){
      btn.disabled=true;
      btn.textContent=`Resend Code in ${seconds}s`;
    }else{
      btn.disabled=false;
      btn.textContent='Resend Code';
      clearInterval(timer);
    }
  };
  update();
  timer=setInterval(update,1000);
  if(status) status.textContent='A new verification code was requested.';
}

function logout(){
  closeUserMenu();
  sessionStorage.removeItem('baiLoggedIn');
  sessionStorage.removeItem('baiComplaintReturn');
  sessionStorage.removeItem('baiRegistrationPending');
  sessionStorage.removeItem('baiPendingRegistrationAccountId');
  sessionStorage.removeItem('baiPendingLoginEmail');
  sessionStorage.removeItem('baiPendingLoginAccountId');
  go('login');
}
document.addEventListener('click',function(e){
  const menu=document.getElementById('userMenu');
  if(menu && !menu.contains(e.target)) closeUserMenu();
});

function togglePassword(btn){
 const input=btn.parentElement.querySelector('input');
 input.type=input.type==='password'?'text':'password';
}


function settings(){
 return `<div class="dashboard"><aside class="sidebar"><div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><nav class="nav"><button onclick="go('dashboard')">⌂ &nbsp;Dashboard</button><button onclick="go('profile')">● &nbsp;My Profile</button><button onclick="go('status')">⌕ &nbsp;Check Status</button><button class="active">Settings</button></nav><div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('help-center')">Contact Support</button></div></aside>
 <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions"><button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${notificationBadgeHtml()}</button><span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span><div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile');closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div></div></header>
 <main class="content"><div class="page-panel settings-panel"><h2>Settings</h2>
 <section class="settings-section"><h3>Notifications</h3><label class="settings-row"><span><b>Application Status Updates</b><small>Receive updates when your passport application status changes.</small></span><input class="settings-toggle" type="checkbox" ${setting('statusUpdates',true)?'checked':''} aria-label="Application Status Updates" onchange="saveSetting('statusUpdates',this.checked)"></label><label class="settings-row"><span><b>Email Notifications</b><small>Receive important MyBAI notifications by email.</small></span><input class="settings-toggle" type="checkbox" ${setting('emailNotifications',true)?'checked':''} aria-label="Email Notifications" onchange="saveSetting('emailNotifications',this.checked)"></label></section>
 <section class="settings-section"><h3>Account Security</h3><button class="settings-action" onclick="go('change-email')"><span><b>Change Email Address</b><small>Update the email used to sign in and receive OTPs.</small></span><span class="settings-arrow">›</span></button><button class="settings-action" onclick="logout()"><span><b>Sign Out</b><small>Sign out of your current MyBAI session.</small></span><span class="settings-arrow">›</span></button></section>
 <section class="settings-section"><h3>Privacy</h3><button class="settings-action" onclick="alert('Privacy Policy')"><span><b>Privacy Policy</b><small>Review how your personal information is handled.</small></span><span class="settings-arrow">›</span></button></section>
 <section class="settings-section danger-section"><h3>Account</h3><button class="settings-action danger" onclick="deleteAccount()"><span><b>Delete Account</b><small>This will remove your MyBAI account and linked applications from this demo.</small></span><span class="settings-arrow">›</span></button></section>
 </div></main><footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer></div>`;
}


migrateLoggedInAccountToRegistry();

/* =========================
   MODULE 2: HELP CENTER + ENQUIRY SYSTEM
   Front-end prototype storage uses localStorage for support data so records persist
   across member logout/login and consumed by the separate BAI Personnel Portal application.
   ========================= */

const HELP_KB_KEY = 'baiHelpKnowledgeBase';
const HELP_ENQUIRIES_KEY = 'baiHelpEnquiries';
const HELP_CONVERSATIONS_KEY = 'baiHelpConversations';
const HELP_NOTIFICATION_KEY = 'baiHelpNotifications';

/* One-time cleanup of two old prototype enquiries requested for removal. */
const REMOVED_ENQUIRY_IDS = new Set(['ENQ-20260922-2627','ENQ-20260923-3116']);
function removeOldPrototypeEnquiries(){
  try{
    const enquiries=jsonGet(HELP_ENQUIRIES_KEY,[]);
    const filtered=enquiries.filter(e=>!REMOVED_ENQUIRY_IDS.has(String(e.id||'')));
    if(filtered.length!==enquiries.length) jsonSet(HELP_ENQUIRIES_KEY,filtered);
    const conversations=jsonGet(HELP_CONVERSATIONS_KEY,[]);
    const filteredConversations=conversations.filter(c=>!REMOVED_ENQUIRY_IDS.has(String(c.enquiryId||'')));
    if(filteredConversations.length!==conversations.length) jsonSet(HELP_CONVERSATIONS_KEY,filteredConversations);
    const notifications=jsonGet(HELP_NOTIFICATION_KEY,[]);
    const filteredNotifications=notifications.filter(n=>!REMOVED_ENQUIRY_IDS.has(String(n.enquiryId||'')));
    if(filteredNotifications.length!==notifications.length) jsonSet(HELP_NOTIFICATION_KEY,filteredNotifications);
  }catch(e){}
}

removeOldPrototypeEnquiries();

function nowIso(){ return new Date().toISOString(); }
function uid(prefix='ID'){ return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }
function memberId(){ return sessionStorage.getItem('baiAccountId') || `EMAIL-${(accountEmail()||'member').toLowerCase()}`; }
function memberDisplayName(){ return accountName(); }
function jsonGet(key,fallback){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch(e){ return fallback; } }
function jsonSet(key,value){ localStorage.setItem(key,JSON.stringify(value)); }
const BAI_ATTACHMENT_DB='baiSupportAttachments';
const BAI_ATTACHMENT_STORE='files';
function openAttachmentDb(){ return new Promise((resolve,reject)=>{ const req=indexedDB.open(BAI_ATTACHMENT_DB,1); req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(BAI_ATTACHMENT_STORE)) req.result.createObjectStore(BAI_ATTACHMENT_STORE,{keyPath:'id'}); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error||new Error('Unable to open attachment storage')); }); }
async function saveEnquiryAttachment(file){ if(!file) return null; const id=uid('ATT'); const db=await openAttachmentDb(); await new Promise((resolve,reject)=>{ const tx=db.transaction(BAI_ATTACHMENT_STORE,'readwrite'); tx.objectStore(BAI_ATTACHMENT_STORE).put({id,blob:file,name:file.name,type:file.type,size:file.size,createdAt:nowIso()}); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error||new Error('Unable to save attachment')); }); db.close(); return {id,name:file.name,type:file.type,size:file.size}; }
async function loadEnquiryAttachment(id){ if(!id)return null; try{ const db=await openAttachmentDb(); const item=await new Promise((resolve,reject)=>{ const req=db.transaction(BAI_ATTACHMENT_STORE,'readonly').objectStore(BAI_ATTACHMENT_STORE).get(id); req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error); }); db.close(); return item; }catch(e){ return null; } }
function enquiryAttachmentHtml(a,scope='member'){ if(!a)return ''; const safeName=esc(a.name||'Attachment'); const id=esc(a.id||''); const icon=(a.type||'').startsWith('image/')?'🖼️':'📎'; return `<div class="enquiry-attachment" data-attachment-id="${id}"><span class="attachment-icon">${icon}</span><div class="attachment-info"><b>${safeName}</b><small>${esc(formatAttachmentSize(a.size))}</small></div><button type="button" class="attachment-view-btn" onclick="viewEnquiryAttachment('${id}','${esc(a.type||'application/octet-stream')}','${safeName}')">View</button></div>`; }
function enquiryAttachmentsHtml(items,fallback=null,scope='member'){ const list=Array.isArray(items)?items.filter(Boolean):(items?[items]:[]); if(!list.length && fallback) return enquiryAttachmentHtml(fallback,scope); return list.map(a=>enquiryAttachmentHtml(a,scope)).join(''); }
function formatAttachmentSize(size){ const n=Number(size)||0; if(n<1024)return `${n} B`; if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`; return `${(n/1024/1024).toFixed(2)} MB`; }
async function viewEnquiryAttachment(id,type,name){ const item=await loadEnquiryAttachment(id); if(!item?.blob){ alert('This attachment is no longer available.'); return; } const url=URL.createObjectURL(item.blob); const win=window.open(url,'_blank'); if(!win){ const a=document.createElement('a'); a.href=url; a.download=name||item.name||'attachment'; a.click(); } setTimeout(()=>URL.revokeObjectURL(url),60000); }
function parseRouteHash(){
  const raw=(location.hash||'#login').slice(1);
  const [path,...queryParts]=raw.split('?');
  const params=new URLSearchParams(queryParts.join('?'));
  return {page:path||'login',params};
}
function goQuery(page,params={}){
  const qs=new URLSearchParams(params).toString();
  location.hash=qs?`${page}?${qs}`:page;
  render();
  window.scrollTo(0,0);
}

function seedKnowledgeBase(){
  const existing=jsonGet(HELP_KB_KEY,null);
  const additions=[
    {id:'KB-STATUS-002',type:'article',title:'Understanding passport application status',category:'Application Status',tags:['status','processing','approved','completed','cancelled'],body:'Your passport application status shows the current stage of processing. Review the status details and timeline in Check Status for the latest information available for that application.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-STATUS-003',type:'faq',title:'What does Processing mean?',category:'Application Status',tags:['processing','status','application'],body:'Processing means the passport application is still being handled and has not reached a final completed or cancelled state. Check the application timeline for the latest update.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-RENEW-002',type:'article',title:'How to apply for passport renewal',category:'Passport Renewal',tags:['renewal','apply','application','existing passport'],body:'Open Passport Renewal from your Dashboard, provide the requested passport and identification information, complete the applicable declarations, choose a DFA Consular Office / Site, and submit the renewal application.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-DOC-002',type:'article',title:'What identification documents can I submit?',category:'Documents / Requirements',tags:['documents','identification','id','requirements'],body:'Use the identification documents requested by the current application flow. Make sure the submitted document is valid, readable, and that the personal information matches the information entered in MyBAI.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-ACCOUNT-002',type:'faq',title:'How do I change my MyBAI email address?',category:'Account / OTP',tags:['email','change email','account','otp','login'],body:'Open Settings and choose Change Email. Enter the new email address, complete the verification step, and the updated email becomes the login identifier for the existing MyBAI account.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-ENQ-001',type:'article',title:'How do I submit an enquiry to support?',category:'Other',tags:['enquiry','support','help','contact','message'],body:'Open Help Center or Contact Support, choose the appropriate enquiry category, describe your concern clearly, and submit the enquiry. Your enquiry receives a unique Enquiry ID that can be used to follow the conversation and status.',createdAt:nowIso(),updatedAt:nowIso()}
  ];
  if(Array.isArray(existing) && existing.length){
    const ids=new Set(existing.map(a=>a.id));
    const merged=[...existing,...additions.filter(a=>!ids.has(a.id))];
    if(merged.length!==existing.length) jsonSet(HELP_KB_KEY,merged);
    return merged;
  }
  const seeded=[
    {id:'KB-STATUS-001',type:'article',title:'How do I check my passport application status?',category:'Application Status',tags:['status','application','tracking','check'],body:'Sign in to your MyBAI account and open Check Status. Select your passport application to view the current status, BAI Application ID, DFA Appointment Reference Number (ARN), payment reference, eReceipt number, and the processing timeline.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-NEW-001',type:'faq',title:'What is needed for a new passport application?',category:'New Passport',tags:['new passport','requirements','documents','id','photo'],body:'Start a New Passport Application from your Dashboard. Review your account information and choose the DFA Consular Office / Site where you want to process the application. Required supporting documents depend on the applicant and are shown during the registration or application flow.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-RENEW-001',type:'faq',title:'How does passport renewal work?',category:'Passport Renewal',tags:['renewal','requirements','expired','damaged'],body:'Use Passport Renewal when you already have an existing passport. The renewal flow asks for the applicable declaration and identification documents, the renewal reason, and a DFA Consular Office / Site.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-LOST-001',type:'faq',title:'What should I do if I lost my passport?',category:'Lost Passport Replacement',tags:['lost passport','replacement','affidavit','police'],body:'Use Lost Passport Replacement when you previously had a passport but no longer have it. The flow records whether the passport was valid or expired when it was lost and collects the required replacement documents before selecting a DFA Consular Office / Site.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-DOC-001',type:'article',title:'Why must my registration information match my valid ID?',category:'Documents / Requirements',tags:['valid id','registration','information','name','birthday'],body:'The personal information entered during account registration should match the information shown on the valid identification document submitted with the registration. Check your spelling, date of birth, and other details before submitting.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-PAY-001',type:'faq',title:'What is the payment reference?',category:'Payment',tags:['payment','payment reference','reference'],body:'The Payment Reference is associated with the passport application transaction. When an existing DFA application is linked to MyBAI, the payment reference is stored with that application record.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-APPT-001',type:'faq',title:'Where do I select my passport appointment location?',category:'Appointment / DFA Consular Office',tags:['appointment','location','dfa','consular office','site'],body:'New passport, renewal, and lost-passport replacement flows use a DFA Consular Office / Site selection. Choose the site where you want the passport service or appointment to take place.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-OTP-001',type:'faq',title:'How does MyBAI OTP login work?',category:'Account / OTP',tags:['otp','login','email','verification','7 digit'],body:'MyBAI uses your registered email address for login. After you request a code, enter the 7-digit numeric One-Time Password (OTP) sent to that email address. Never share your verification code with anyone else.',createdAt:nowIso(),updatedAt:nowIso()},
    {id:'KB-ADVISORY-001',type:'advisory',title:'Service Advisory: Passport support availability',category:'Service Advisory',tags:['advisory','service','support'],body:'Support availability may vary during scheduled maintenance or service interruptions. Check the Service Advisories section for the latest notices posted by support personnel.',createdAt:nowIso(),updatedAt:nowIso()}
  ];
  jsonSet(HELP_KB_KEY,seeded);
  return seeded;
}
function getKnowledgeBase(){ return seedKnowledgeBase(); }
function saveKnowledgeBase(items){ jsonSet(HELP_KB_KEY,items); }

function saveHelpEnquiries(items){ jsonSet(HELP_ENQUIRIES_KEY,items); }
function getHelpConversations(){ return jsonGet(HELP_CONVERSATIONS_KEY,[]); }
function saveHelpConversations(items){ jsonSet(HELP_CONVERSATIONS_KEY,items); }
function getHelpNotifications(){ return jsonGet(HELP_NOTIFICATION_KEY,[]); }
function saveHelpNotifications(items){ jsonSet(HELP_NOTIFICATION_KEY,items); }



function countUnreadMemberNotifications(){ return memberNotifications().filter(n=>!n.read).length; }
function supportCategoryOptions(selected=''){
  const cats=['Application Status','New Passport','Passport Renewal','Lost Passport Replacement','Documents / Requirements','Payment','Appointment / DFA Consular Office','Account / OTP','Other'];
  return `<option value="" disabled ${selected?'':'selected'} hidden>Select an enquiry type</option>`+cats.map(c=>`<option value="${esc(c)}" ${selected===c?'selected':''}>${esc(c)}</option>`).join('');
}
function relatedApplicationOptions(selected=''){
  const apps=getApplications();
  return `<option value="">No specific application</option>` + apps.map(a=>`<option value="${esc(a.id)}" ${selected===a.id?'selected':''}>${esc(a.type)} — ${esc(a.id)}</option>`).join('');
}
function enquiryStatusLabel(status){
  const s=String(status||'Pending');
  return s==='AI-Assisted'?'AI-Assisted':s;
}
function statusClass(status){ return String(status||'pending').toLowerCase().replace(/[^a-z]+/g,'-'); }
function truncateText(value,max=120){ const s=String(value||''); return s.length>max?s.slice(0,max-1)+'…':s; }
function formatDateTime(value){ try{ return new Date(value).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }catch(e){ return value||''; } }
function findApplicationById(id){ return getApplications().find(a=>a.id===id) || null; }
function visibleMemberEnquiries(){
  const mid=memberId();
  return getHelpEnquiries().filter(e=>e.memberId===mid);
}
function getEnquiryById(id){ return getHelpEnquiries().find(e=>e.id===id) || null; }
function createEnquiryId(){
  const existing=new Set(getHelpEnquiries().map(e=>e.id));
  let next=0n;
  try{ next=BigInt(localStorage.getItem('baiHelpEnquirySequence')||'0'); }catch(e){ next=0n; }
  do{
    next += 1n;
    const numeric=next.toString().padStart(9,'0');
    const id=`ENQ-${numeric}`;
    if(!existing.has(id)){ localStorage.setItem('baiHelpEnquirySequence',next.toString()); return id; }
  }while(true);
}
function articleTypeLabel(type){ return type==='advisory'?'Service Advisory':type==='faq'?'FAQ':'Knowledge Article'; }
function searchKnowledgeBase(query,category=''){
  const q=String(query||'').toLowerCase().trim();
  const qTokens=q.split(/[^a-z0-9]+/).filter(t=>t.length>1);
  if(!qTokens.length && !category) return [];
  return getKnowledgeBase().map(article=>{
    const hay=[article.title,article.body,article.category,(article.tags||[]).join(' ')].join(' ').toLowerCase();
    let score=0;
    if(category && article.category===category) score+=0.45;
    qTokens.forEach(t=>{ if(hay.includes(t)) score+=0.12; if(article.title.toLowerCase().includes(t)) score+=0.08; if((article.tags||[]).some(tag=>tag.toLowerCase().includes(t))) score+=0.1; });
    return {...article,score};
  }).filter(a=>a.score>0).sort((a,b)=>b.score-a.score);
}
function bestKnowledgeMatch(query){ return searchKnowledgeBase(query)[0] || null; }
function formatAiAnswer(article){
  return `According to the Knowledge Base article “${article.title}”: ${article.body}`;
}
function transcriptText(messages=[]){
  return messages.map(m=>`${m.sender==='member'?'Member':'AI'}: ${m.text}`).join('\n');
}
function ensureAiConversation(){
  const existingId=sessionStorage.getItem('baiHelpCurrentConversationId');
  const all=getHelpConversations();
  if(existingId){ const existing=all.find(c=>c.id===existingId && c.memberEmail===accountEmail()); if(existing) return existing; }
  const conv={id:uid('CHAT'),memberId:memberId(),memberEmail:accountEmail(),createdAt:nowIso(),updatedAt:nowIso(),status:'Active',messages:[]};
  all.push(conv); saveHelpConversations(all); sessionStorage.setItem('baiHelpCurrentConversationId',conv.id); return conv;
}
function currentAiConversation(){
  const id=sessionStorage.getItem('baiHelpCurrentConversationId');
  return id?getHelpConversations().find(c=>c.id===id && c.memberEmail===accountEmail())||null:null;
}
function updateAiConversation(id,mutator){
  const all=getHelpConversations(); const idx=all.findIndex(c=>c.id===id); if(idx<0)return null; const updated=mutator({...all[idx]}); updated.updatedAt=nowIso(); all[idx]=updated; saveHelpConversations(all); return updated;
}
function relatedAppText(appId){
  const a=findApplicationById(appId); return a?`${a.type} — ${a.id}`:'No specific application';
}

function memberShell(inner,active='help'){
  const unread=countUnreadMemberNotifications();
  const navStatus=active==='status'?'active':'';
  const navProfile=active==='profile'?'active':'';
  const navSettings=active==='settings'?'active':'';
  return `<div class="dashboard"><aside class="sidebar"><div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><nav class="nav"><button onclick="go('dashboard')">⌂ &nbsp;Dashboard</button><button class="${navProfile}" onclick="go('profile')">● &nbsp;My Profile</button><button class="${navStatus}" onclick="go('status')">⌕ &nbsp;Check Status</button><button class="${navSettings}" onclick="go('settings')">Settings</button></nav><div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('help-center')">Contact Support</button></div></aside>
 <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions"><button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${unread?`<span class="badge">${Math.min(unread,9)}</span>`:`${notificationBadgeHtml()}`}</button><span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span><div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile');closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div></div></header>
 <main class="content">${inner}</main><footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer></div>`;
}

function helpCenter(){
  const articles=getKnowledgeBase();
  const rec=articles.filter(a=>a.type!=='advisory').slice(0,5);
  const advisories=articles.filter(a=>a.type==='advisory');
  return memberShell(`<div class="page-panel help-center-panel"><div class="help-center-head"><div><span class="eyebrow">BAI SUPPORT</span><h2>Help Center</h2><p>Search for passport information, browse common questions, or get help from the AI Assistant and support personnel.</p></div><div class="help-center-actions"><button class="primary" onclick="go('ai-chat')">Ask an AI Assistant</button><button class="secondary-action" onclick="go('enquiry-form')">Submit an Enquiry</button><button class="secondary-action" onclick="go('enquiries')">My Enquiries</button></div></div>
 <div class="help-search"><div class="field"><label for="helpSearch">Search the Knowledge Base</label><div class="search-line"><input id="helpSearch" placeholder="e.g. renewal requirements, application status" onkeydown="if(event.key==='Enter'){searchHelpCenter()}"/><button class="primary" onclick="searchHelpCenter()">Search</button></div></div></div>
 <div id="helpSearchResults" class="help-search-results"></div>
 <div class="help-grid"><section class="help-section"><div class="help-section-head"><h3>Browse Categories</h3></div><div class="category-grid">${['Application Status','New Passport','Passport Renewal','Lost Passport Replacement','Documents / Requirements','Payment','Appointment / DFA Consular Office','Account / OTP'].map(c=>`<button class="category-card" onclick="browseHelpCategory('${esc(c)}')"><span>${esc(c)}</span><small>View related information</small></button>`).join('')}</div></section>
 <section class="help-section"><div class="help-section-head"><h3>Recommended Articles</h3><button class="link-btn" onclick="browseAllArticles()">View all</button></div><div class="article-list">${rec.map(article=>articleListItem(article)).join('')}</div></section></div>
 <section class="help-section"><div class="help-section-head"><h3>Service Advisories</h3></div><div class="advisory-list">${advisories.map(a=>`<button class="advisory-card" onclick="openArticle('${esc(a.id)}')"><strong>${esc(a.title)}</strong><span>${esc(truncateText(a.body,180))}</span><small>${formatDateTime(a.updatedAt)}</small></button>`).join('')}</div></section>
 <div class="help-center-bottom"><div><b>Need more support?</b><span>Submit a formal enquiry and a support personnel can respond.</span></div><button class="primary" onclick="go('enquiry-form')">Submit an Enquiry</button></div><div class="help-contact-strip"><div><b>Call Us</b><span>0987 654 3210</span></div><div><b>Visit Us</b><span>BAI Support Center, Bazinga City, Palawan</span></div></div></div>`,'help');
}
function articleListItem(article){
  return `<button class="article-card" onclick="openArticle('${esc(article.id)}')"><span class="article-type">${esc(articleTypeLabel(article.type))}</span><strong>${esc(article.title)}</strong><span>${esc(truncateText(article.body,150))}</span><small>${esc(article.category)} · Updated ${formatDateTime(article.updatedAt)}</small></button>`;
}
function searchHelpCenter(){
  const input=document.getElementById('helpSearch'); const q=(input?.value||'').trim();
  const host=document.getElementById('helpSearchResults'); if(!host)return;
  if(!q){ host.innerHTML=`<div class="inline-note">Enter a keyword or question to search the Knowledge Base.</div>`; return; }
  const results=searchKnowledgeBase(q).slice(0,8);
  host.innerHTML=`<div class="search-result-head"><b>Search results for “${esc(q)}”</b><span>${results.length} result${results.length===1?'':'s'}</span></div>${results.length?`<div class="article-list">${results.map(articleListItem).join('')}</div>`:`<div class="empty-inline"><b>No matching article found.</b><span>Ask the AI Assistant or submit an enquiry to support personnel.</span><div><button class="primary" onclick="go('ai-chat')">Ask AI</button><button class="secondary-action" onclick="go('enquiry-form')">Submit an Enquiry</button></div></div>`}`;
}
function browseHelpCategory(category){
  const results=searchKnowledgeBase('',category);
  const host=document.getElementById('helpSearchResults');
  if(!host){ goQuery('help-center',{category}); return; }
  host.innerHTML=`<div class="search-result-head"><b>${esc(category)}</b><span>${results.length} article${results.length===1?'':'s'}</span></div>${results.length?`<div class="article-list">${results.map(articleListItem).join('')}</div>`:`<div class="empty-inline">No articles are currently published in this category.</div>`}`;
  host.scrollIntoView({behavior:'smooth',block:'start'});
}
function browseAllArticles(){
  const articles=getKnowledgeBase().filter(a=>a.type!=='advisory');
  const body=`<div class="page-panel help-articles-panel"><div class="subpage-top"><button class="link-btn back-btn" onclick="go('help-center')">← Back to Help Center</button><h2>Knowledge Base</h2><p>Searchable information used by the Help Center and AI Assistant.</p></div><div class="article-list large-list">${articles.map(articleListItem).join('')}</div></div>`;
  return go('knowledge-base');
}
function knowledgeBase(){
  const articles=getKnowledgeBase().filter(a=>a.type!=='advisory');
  return memberShell(`<div class="page-panel help-articles-panel"><div class="subpage-top"><button class="link-btn back-btn" onclick="go('help-center')">← Back to Help Center</button><h2>Knowledge Base</h2><p>Browse the information available to the Help Center and AI Assistant.</p></div><div class="article-list large-list">${articles.map(articleListItem).join('')}</div></div>`,'help');
}
function openArticle(id){ goQuery('knowledge-article',{id}); }


function aiChat(){
  const conv=ensureAiConversation();
  const messages=conv.messages||[];
  return memberShell(`<div class="page-panel ai-chat-panel"><div class="subpage-top ai-chat-head"><div><button class="link-btn back-btn" onclick="go('help-center')">← Back to Help Center</button><h2>AI Assistant</h2><p>The assistant searches the BAI Knowledge Base first and only answers from published information.</p></div><button class="secondary-action" onclick="newAiChat()">New Chat</button></div><div class="ai-chat-layout"><div class="ai-chat-window" id="aiChatWindow">${messages.length?messages.map(aiMessageHtml).join(''):`<div class="chat-empty"><b>How can I help?</b><span>Ask about passport applications, renewal, lost passports, documents, payment, appointments, or account OTP.</span><div class="suggested-prompts"><button onclick="useAiPrompt(this.textContent)">What are the requirements for renewal?</button><button onclick="useAiPrompt(this.textContent)">How do I check my application status?</button><button onclick="useAiPrompt(this.textContent)">I lost my passport. What should I do?</button></div></div>`}</div><form class="ai-composer" onsubmit="sendAiMessage(event)"><input id="aiMessageInput" autocomplete="off" placeholder="Type your question..." required><button class="primary" type="submit">Send</button></form></div></div>`,'help');
}
function aiMessageHtml(m){
  const source=m.sourceArticleId?getKnowledgeBase().find(a=>a.id===m.sourceArticleId):null;
  const actions=m.sender==='ai' && m.askFeedback ? `<div class="ai-feedback" data-conv="${esc(m.conversationId||'')}"><span>Was this helpful?</span><button onclick="markAiHelpful(true)">Yes, this helped</button><button onclick="markAiHelpful(false)">No, I still need help</button></div>`:'';
  const escalate=m.sender==='ai' && m.escalationSuggested ? `<button class="escalate-btn" onclick="escalateAi()">Escalate to Support Personnel</button>`:'';
  return `<div class="chat-message ${m.sender==='member'?'from-member':'from-ai'}"><div class="chat-bubble">${esc(m.text).replace(/\n/g,'<br>')}</div>${source?`<button class="source-link" onclick="openArticle('${esc(source.id)}')">Source: ${esc(source.title)}</button>`:''}${actions}${escalate}<small>${formatDateTime(m.createdAt)}</small></div>`;
}
function newAiChat(){
  sessionStorage.removeItem('baiHelpCurrentConversationId'); go('ai-chat');
}
function useAiPrompt(text){ const input=document.getElementById('aiMessageInput'); if(input){ input.value=text; input.focus(); } }
function sendAiMessage(event){
  event.preventDefault();
  const input=document.getElementById('aiMessageInput'); const text=(input?.value||'').trim(); if(!text)return;
  let conv=currentAiConversation()||ensureAiConversation();
  const memberMsg={sender:'member',text,createdAt:nowIso()};
  updateAiConversation(conv.id,c=>({...c,messages:[...(c.messages||[]),memberMsg],status:'AI-Assisted'}));
  const article=bestKnowledgeMatch(text);
  const all=getHelpConversations();
  const current=all.find(c=>c.id===conv.id);
  let aiMsg;
  if(article && article.score>=0.45){
    aiMsg={sender:'ai',text:formatAiAnswer(article),createdAt:nowIso(),sourceArticleId:article.id,askFeedback:true,conversationId:conv.id};
  }else{
    aiMsg={sender:'ai',text:'I could not find a Knowledge Base article that matches your question closely enough to give a reliable answer. I can help you send this to a support personnel instead.',createdAt:nowIso(),askFeedback:false,escalationSuggested:true,conversationId:conv.id};
  }
  updateAiConversation(conv.id,c=>({...c,messages:[...(c.messages||[]),aiMsg],status:'AI-Assisted'}));
  render();
  setTimeout(()=>document.getElementById('aiChatWindow')?.scrollTo({top:document.getElementById('aiChatWindow').scrollHeight,behavior:'smooth'}),20);
}
function markAiHelpful(helpful){
  const conv=currentAiConversation(); if(!conv)return;
  updateAiConversation(conv.id,c=>({...c,feedback:helpful?'helpful':'not-helpful',status:helpful?'Resolved by AI':'AI-Assisted'}));
  if(!helpful){
    updateAiConversation(conv.id,c=>({...c,messages:[...(c.messages||[]),{sender:'ai',text:'I can transfer this conversation to support personnel so you do not need to repeat your question.',createdAt:nowIso(),escalationSuggested:true,conversationId:conv.id}]}));
    render();
  }else{
    updateAiConversation(conv.id,c=>({...c,messages:[...(c.messages||[]),{sender:'ai',text:'Glad I could help. You can return to the Help Center anytime if you need more information.',createdAt:nowIso(),askFeedback:false,conversationId:conv.id}]}));
    render();
  }
}
function escalateAi(){
  const conv=currentAiConversation();
  if(!conv)return;
  sessionStorage.setItem('baiHelpPendingConversationId',conv.id);
  updateAiConversation(conv.id,c=>({...c,status:'Escalated'}));
  go('enquiry-form');
}

let selectedEnquiryFiles=[];
function syncEnquiryFileInput(input){
  try{ const dt=new DataTransfer(); selectedEnquiryFiles.forEach(f=>dt.items.add(f)); input.files=dt.files; }catch(e){}
}
function renderEnquiryAttachmentSelection(){
  const host=document.getElementById('enquiryAttachmentList'); if(!host)return;
  host.innerHTML=selectedEnquiryFiles.map((f,i)=>`<div class="selected-enquiry-file"><span>📎</span><div><b>${esc(f.name)}</b><small>${esc(formatAttachmentSize(f.size))}</small></div><button type="button" onclick="removeEnquiryAttachment(${i})">Remove</button></div>`).join('');
  const count=document.getElementById('enquiryAttachmentCount'); if(count) count.textContent=`${selectedEnquiryFiles.length} / 5 files`;
}
function removeEnquiryAttachment(index){ selectedEnquiryFiles.splice(index,1); const input=document.getElementById('enquiryAttachment'); if(input)syncEnquiryFileInput(input); renderEnquiryAttachmentSelection(); const host=document.getElementById('enquiryAttachmentError'); if(host)host.innerHTML=''; }
function validateEnquiryAttachment(input){
  const host=document.getElementById('enquiryAttachmentError'); if(host)host.innerHTML='';
  const incoming=Array.from(input?.files||[]); if(!incoming.length)return true;
  const allowed=['image/png','image/jpeg','image/webp','application/pdf']; const max=10*1024*1024;
  const combined=[...selectedEnquiryFiles];
  for(const f of incoming){
    if(!allowed.includes(f.type)){ if(host)host.innerHTML=`<div class="field-error">Please upload only PNG, JPG, WEBP, or PDF files.</div>`; input.value=''; return false; }
    if(f.size>max){ if(host)host.innerHTML=`<div class="field-error">Each attachment must be 10 MB or smaller.</div>`; input.value=''; return false; }
    if(!combined.some(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified)) combined.push(f);
  }
  if(combined.length>5){ if(host)host.innerHTML=`<div class="field-error">You can attach up to 5 files per enquiry.</div>`; input.value=''; return false; }
  selectedEnquiryFiles=combined; syncEnquiryFileInput(input); renderEnquiryAttachmentSelection(); return true;
}

function enquirySubmitted(){
  const id=sessionStorage.getItem('baiLastEnquiryId'); const e=id?getEnquiryById(id):null;
  return memberShell(`<div class="page-panel enquiry-success-panel"><div class="success-icon">✓</div><h2>Enquiry Submitted</h2><p>Your enquiry has been submitted successfully and a unique Enquiry ID has been created.</p>${e?`<div class="enquiry-success-meta"><div><span>Enquiry ID</span><b>${esc(e.id)}</b></div><div><span>Status</span><b>${esc(e.status)}</b></div><div><span>Enquiry Type</span><b>${esc(e.category)}</b></div></div>`:''}<div class="enquiry-actions centered"><button class="primary" onclick="go('enquiries')">View My Enquiries</button><button class="secondary-action" onclick="go('help-center')">Back to Help Center</button></div></div>`,'help');
}
function enquiries(){
  const list=visibleMemberEnquiries().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  markMemberNotificationsRead();
  return memberShell(`<div class="page-panel enquiries-panel"><div class="subpage-top"><button class="link-btn back-btn" onclick="go('help-center')">← Back to Help Center</button><h2>My Enquiries</h2><p>View your enquiry history and replies from support personnel.</p></div>${list.length?`<div class="enquiry-list">${list.map(enquiryListItem).join('')}</div>`:`<div class="empty-status"><h3>No enquiries yet</h3><p>You have not submitted any formal enquiries.</p><button class="primary" onclick="go('enquiry-form')">Submit an Enquiry</button></div>`}</div>`,'help');
}
function enquiryListItem(e){
  return `<button class="enquiry-card" onclick="openEnquiry('${esc(e.id)}')"><div class="enquiry-card-main"><span class="status-pill ${statusClass(e.status)}">${esc(enquiryStatusLabel(e.status))}</span><h3>${esc(e.id)}</h3><b>${esc(e.category)}</b><p>${esc(truncateText(e.description,150))}</p></div><div class="enquiry-card-side"><span>${formatDateTime(e.updatedAt)}</span><strong>${e.messages?.length||0} message${(e.messages?.length||0)===1?'':'s'}</strong></div></button>`;
}
function openEnquiry(id){ goQuery('enquiry-view',{id}); }
function enquiryView(){
  const id=parseRouteHash().params.get('id'); const e=getEnquiryById(id); const mine=e && e.memberId===memberId();
  if(!e || !mine) return memberShell(`<div class="page-panel"><h2>Enquiry Not Found</h2><p>The requested enquiry is not available to this account.</p><button class="primary" onclick="go('enquiries')">Back to My Enquiries</button></div>`,'help');
  const app=e.applicationId?findApplicationById(e.applicationId):null;
  const hasPersonnelReply=(e.messages||[]).some(m=>m.senderType==='personnel');
  const canReply=hasPersonnelReply && e.status!=='Closed';
  const actions=e.status==='Resolved'?`<button class="primary" onclick="closeMemberEnquiry('${esc(e.id)}')">Close Enquiry</button>`:'';
  return memberShell(`<div class="page-panel enquiry-view-panel"><div class="subpage-top"><button class="link-btn back-btn" onclick="go('enquiries')">← Back to My Enquiries</button><div class="enquiry-view-title"><div><span id="memberEnquiryStatus" class="status-pill ${statusClass(e.status)}">${esc(e.status)}</span><h2>${esc(e.id)}</h2><p>${esc(e.category)}</p></div>${e.escalationFlag?'<span class="escalation-badge">Escalated from AI Assistant</span>':''}</div></div><div class="enquiry-detail-grid"><div><span>Email Address</span><b>${esc(e.memberEmail)}</b></div><div><span>Related Application</span><b>${esc(app?`${app.type} — ${app.id}`:'None')}</b></div><div><span>Created</span><b>${formatDateTime(e.createdAt)}</b></div><div><span>Last Updated</span><b id="memberEnquiryUpdated">${formatDateTime(e.updatedAt)}</b></div></div>${e.chatTranscript?.length?`<div class="chat-context"><div class="chat-context-head"><b>Original AI Chat</b><span>${e.chatTranscript.length} messages</span></div><div class="chat-transcript">${e.chatTranscript.map(m=>`<div><b>${m.sender==='member'?'You':'AI'}:</b> ${esc(m.text)}</div>`).join('')}</div></div>`:''}<div class="thread-header"><h3>Conversation</h3><span id="memberEnquiryMessageCount">${e.messages?.length||0} message${(e.messages?.length||0)===1?'':'s'}</span></div><div class="enquiry-thread" id="memberEnquiryThread">${(e.messages||[]).map((m,i)=>enquiryMessageHtml(m, i===0 ? (e.attachments||e.attachment) : null, i===0)).join('')}</div><div id="memberEnquiryReplyHost">${canReply?`<form class="enquiry-member-reply" onsubmit="sendMemberEnquiryReply(event,'${esc(e.id)}')"><div class="field"><label for="memberReplyText">Reply to Support Personnel</label><textarea id="memberReplyText" required placeholder="Write your reply..."></textarea><small class="field-help">Your reply will reopen the enquiry for further assistance.</small><div id="memberReplyError"></div></div><div class="enquiry-actions"><button class="primary" type="submit">Send Reply</button></div></form>`:''}</div><div class="enquiry-view-actions" id="memberEnquiryViewActions">${actions}<button class="secondary-action" onclick="go('help-center')">Help Center</button></div></div>`,'help');
}
function enquiryMessageHtml(m,fallbackAttachment=null,allowMessageAttachment=true){ const isMember=String(m.senderType||'').trim().toLowerCase()==='member'; const attachmentHtml=(isMember&&allowMessageAttachment)?(m.attachments?.length?enquiryAttachmentsHtml(m.attachments):m.attachment?enquiryAttachmentHtml(m.attachment):(Array.isArray(fallbackAttachment)?enquiryAttachmentsHtml(fallbackAttachment):fallbackAttachment?enquiryAttachmentHtml(fallbackAttachment):'')):''; return `<div class="thread-message ${isMember?'member-message':'personnel-message'}"><div><b>${esc(m.senderName||m.senderType)}</b><small>${formatDateTime(m.createdAt)}</small></div><p>${esc(m.text||'').replace(/\n/g,'<br>')}</p>${attachmentHtml}</div>`; }
function sendMemberEnquiryReply(event,id){
  event.preventDefault();
  const text=(document.getElementById('memberReplyText')?.value||'').trim();
  const err=document.getElementById('memberReplyError');
  if(!text){ if(err) err.innerHTML='<div class="field-error">Please enter your reply.</div>'; return; }
  const all=getHelpEnquiries();
  const idx=all.findIndex(e=>e.id===id);
  if(idx<0)return;
  const e=all[idx];
  if(e.memberId!==memberId() || e.status==='Closed')return;
  e.messages=e.messages||[];
  e.messages.push({id:uid('MSG'),senderType:'member',senderId:memberId(),senderName:memberDisplayName(),text,attachment:null,attachments:[],createdAt:nowIso()});
  e.status=e.personnelId?'In Progress':'Pending';
  e.updatedAt=nowIso();
  all[idx]=e;
  saveHelpEnquiries(all);
  goQuery('enquiry-view',{id});
}
function memberEnquiryReplyMarkup(e){
  const hasPersonnelReply=(e.messages||[]).some(m=>m.senderType==='personnel');
  const canReply=hasPersonnelReply && e.status!=='Closed';
  if(!canReply) return '';
  return `<form class="enquiry-member-reply" onsubmit="sendMemberEnquiryReply(event,'${esc(e.id)}')"><div class="field"><label for="memberReplyText">Reply to Support Personnel</label><textarea id="memberReplyText" required placeholder="Write your reply..."></textarea><small class="field-help">Your reply will reopen the enquiry for further assistance.</small><div id="memberReplyError"></div></div><div class="enquiry-actions"><button class="primary" type="submit">Send Reply</button></div></form>`;
}
function memberEnquiryActionsMarkup(e){
  return `${e.status==='Resolved'?`<button class="primary" onclick="closeMemberEnquiry('${esc(e.id)}')">Close Enquiry</button>`:''}<button class="secondary-action" onclick="go('help-center')">Help Center</button>`;
}
function refreshMemberEnquiryView(force=false){
  const route=parseRouteHash();
  if(route.page!=='enquiry-view') return;
  const id=route.params.get('id')||''; const e=getEnquiryById(id);
  if(!e) return;
  const signature=JSON.stringify({updatedAt:e.updatedAt,status:e.status,messages:e.messages?.map(m=>({id:m.id,s:m.senderType,t:m.text,at:m.createdAt}))||[]});
  if(!force && signature===enquiryRealtimeSignature) return;
  const thread=document.getElementById('memberEnquiryThread');
  const count=document.getElementById('memberEnquiryMessageCount');
  const status=document.getElementById('memberEnquiryStatus');
  const updated=document.getElementById('memberEnquiryUpdated');
  const replyHost=document.getElementById('memberEnquiryReplyHost');
  const actions=document.getElementById('memberEnquiryViewActions');
  const wasAtBottom=thread?thread.scrollHeight-thread.scrollTop-thread.clientHeight<40:false;
  const hadReplyForm=!!replyHost?.querySelector('.enquiry-member-reply');
  const hasPersonnelReply=(e.messages||[]).some(m=>m.senderType==='personnel');
  const canReply=hasPersonnelReply && e.status!=='Closed';
  if(thread) thread.innerHTML=(e.messages||[]).map((m,i)=>enquiryMessageHtml(m, i===0 ? (e.attachments||e.attachment) : null, i===0)).join('');
  if(wasAtBottom && thread) thread.scrollTop=thread.scrollHeight;
  if(count){const n=e.messages?.length||0;count.textContent=`${n} message${n===1?'':'s'}`;}
  if(status){status.className=`status-pill ${statusClass(e.status)}`;status.textContent=e.status;}
  if(updated) updated.textContent=formatDateTime(e.updatedAt);
  if(replyHost && hadReplyForm!==canReply) replyHost.innerHTML=memberEnquiryReplyMarkup(e);
  if(actions) actions.innerHTML=memberEnquiryActionsMarkup(e);
  enquiryRealtimeSignature=signature;
}
function refreshMemberEnquiryList(){
  const route=parseRouteHash();
  if(route.page!=='enquiries') return;
  const signature=JSON.stringify(visibleMemberEnquiries().map(e=>({id:e.id,updatedAt:e.updatedAt,status:e.status,count:e.messages?.length||0})));
  if(signature===enquiryRealtimeSignature) return;
  const wrap=document.querySelector('.enquiries-panel .enquiry-list');
  if(wrap){wrap.innerHTML=visibleMemberEnquiries().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).map(enquiryListItem).join('');}
  enquiryRealtimeSignature=signature;
}
function stopEnquiryRealtime(){
  if(enquiryRealtimeTimer){clearInterval(enquiryRealtimeTimer);enquiryRealtimeTimer=null;}
  if(enquiryRealtimeStorageHandler){window.removeEventListener('storage',enquiryRealtimeStorageHandler);enquiryRealtimeStorageHandler=null;}
  enquiryRealtimeSignature='';
}
function startEnquiryRealtime(page){
  stopEnquiryRealtime();
  if(!['enquiries','enquiry-view'].includes(page)) return;
  if(page==='enquiry-view') refreshMemberEnquiryView(true); else refreshMemberEnquiryList();
  const refresh=()=>page==='enquiry-view'?refreshMemberEnquiryView():refreshMemberEnquiryList();
  enquiryRealtimeTimer=setInterval(refresh,1500);
  enquiryRealtimeStorageHandler=(event)=>{if(event.key===HELP_ENQUIRIES_KEY || event.key===HELP_NOTIFICATION_KEY) refresh();};
  window.addEventListener('storage',enquiryRealtimeStorageHandler);
}
function closeMemberEnquiry(id){
  const all=getHelpEnquiries(); const idx=all.findIndex(e=>e.id===id); if(idx<0)return; const e=all[idx]; if(e.memberId!==memberId())return; if(e.status!=='Resolved')return;
  e.status='Closed'; e.updatedAt=nowIso(); all[idx]=e; saveHelpEnquiries(all); goQuery('enquiry-view',{id});
}


/* Keep the legacy complaint route as a compatibility alias for old hashes/bookmarks. */
function complaint(){ return helpCenter(); }
function complaintDone(){ return enquirySubmitted(); }

/* Keep the account data and Help Desk records consistent when an email changes. */


/* Extend account deletion so support records belonging to the member are removed from the prototype store. */


/* New render registry with Module 2 routes. */

function wireEnquiryLiveValidation(){
  const fields=['enquiryEmail','enquiryCategory','enquiryBody']; fields.forEach(id=>{ const el=document.getElementById(id); if(!el)return; const event=el.tagName==='SELECT'?'change':'input'; el.addEventListener(event,()=>{ const w=el.closest('.field'); w?.classList.remove('invalid'); w?.querySelector('.field-error')?.remove(); }); });
}


/* Login stays focused on authentication; support is accessed from the member Help Center. */
function login(){
 return `<div class="login-screen">
   <section class="login-visual" aria-label="BAI Passport Tracking System"></section>
   <section class="login-panel"><div class="login-box">
     <h1>LOG IN TO MYBAI</h1><p class="subtitle">Enter your email address to access your account</p>
     <div class="field"><label>Email Address</label><input id="loginEmail" type="email" inputmode="email" autocomplete="email" placeholder="Enter your email address" oninput="validateLoginEmailInput(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();startLogin();}"></div>
     <p class="otp-hint">A One-Time Password (OTP) will be sent to the email address<br>associated with your MyBAI account.</p>
     <div class="auth-actions"><button class="primary" onclick="startLogin()">Sign in</button></div>
     <div class="divider">OR</div>
     <button class="primary" onclick="go('signup')">Create Account</button>
     <div class="terms">By signing in, you agree to our <a href="#" onclick="return false">Terms of Use</a> and <a href="#" onclick="return false">Privacy Policy</a>.</div>
   </div></section>
 </div>`;
}

/* Correct email migration: capture the old address before changing it. */
function verifyEmailChange(){
  if(!validateOtp('emailChangeOtp')) return;
  const newEmail=(sessionStorage.getItem('baiPendingNewEmail')||'').trim(); if(!isValidEmailAddress(newEmail)) return;
  const oldEmail=(sessionStorage.getItem('baiAccountEmail')||'').trim(); const oldLower=oldEmail.toLowerCase(); const newLower=newEmail.toLowerCase();
  const account=findAccountByEmail(oldEmail); if(!account) return;
  const conflict=findAccountByEmail(newEmail); if(conflict && conflict.id!==account.id){ showFieldError(document.getElementById('emailChangeOtp'),'An account with this email address already exists. Please use a different email address.'); return; }
  account.email=newEmail; account.applications=getApplications().map(a=>({...a,email:newEmail,contactEmail:newEmail})); saveAccountRegistry(getAccountRegistry().map(a=>a.id===account.id?account:a));
  sessionStorage.setItem('baiAccountEmail',newEmail); saveApplications(account.applications);
  if(oldLower!==newLower){ saveHelpEnquiries(getHelpEnquiries().map(e=>e.memberId===account.id?{...e,memberEmail:newEmail}:e)); saveHelpConversations(getHelpConversations().map(c=>c.memberId===account.id?{...c,memberEmail:newEmail}:c)); saveHelpNotifications(getHelpNotifications().map(n=>String(n.email||'').toLowerCase()===oldLower?{...n,email:newLower}:n)); }
  sessionStorage.setItem('baiEmailChangeSuccess','true'); sessionStorage.removeItem('baiPendingNewEmail'); sessionStorage.removeItem('baiEmailChangeOtp'); sessionStorage.removeItem('baiEmailChangeOtpSent'); sessionStorage.removeItem('baiEmailChangeOtpSentAt'); go('profile');
}


/* ===== v57 consistency and data-flow fixes ===== */
function accountSettingKey(key){ return `baiSetting_${memberId()}_${key}`; }
function setting(key,fallback=true){
  const scoped=accountSettingKey(key);
  const value=localStorage.getItem(scoped);
  if(value!==null) return value==='true';
  const legacy=localStorage.getItem(`baiSetting_${key}`);
  if(legacy!==null){ localStorage.setItem(scoped,legacy); localStorage.removeItem(`baiSetting_${key}`); return legacy==='true'; }
  return fallback;
}
function saveSetting(key,value){ localStorage.setItem(accountSettingKey(key), value?'true':'false'); }
function notificationBadgeHtml(){ const unread=countUnreadMemberNotifications(); return unread?`<span class="badge">${Math.min(unread,99)}</span>`:''; }
let memberNotificationDropdownOpen = false;
let memberNotificationOutsideHandler = null;
let memberNotificationResizeHandler = null;

function notificationCreatedLabel(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
}

function notificationBellButton(){
  return document.querySelector('.notification-btn');
}

function positionMemberNotificationDropdown(){
  const panel=document.getElementById('memberNotificationDropdown');
  const bell=notificationBellButton();
  if(!panel || !bell) return;
  const r=bell.getBoundingClientRect();
  const width=Math.min(390,window.innerWidth-24);
  let left=r.right-width;
  if(left<12) left=12;
  if(left+width>window.innerWidth-12) left=window.innerWidth-width-12;
  panel.style.width=width+'px';
  panel.style.left=left+'px';
  panel.style.top=(r.bottom+10)+'px';
}

function renderMemberNotificationDropdown(){
  let panel=document.getElementById('memberNotificationDropdown');
  if(!panel){
    panel=document.createElement('div');
    panel.id='memberNotificationDropdown';
    panel.className='member-notification-dropdown';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Notifications');
    document.body.appendChild(panel);
  }

  const notes=memberNotifications().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const unread=notes.filter(n=>!n.read).length;
  const items=notes.length ? notes.slice(0,12).map(n=>{
    const id=String(n.id||'');
    const enquiryId=String(n.enquiryId||'');
    const isUnread=!n.read;
    return `<button class="notification-item ${isUnread?'unread':''}" type="button" onclick="handleMemberNotificationClick('${esc(id)}','${esc(enquiryId)}')">
      <span class="notification-item-dot" aria-hidden="true"></span>
      <span class="notification-item-body"><b>${esc(n.message||'New notification')}</b><small>${esc(notificationCreatedLabel(n.createdAt))}</small></span>
      ${isUnread?'<span class="notification-item-new">New</span>':''}
    </button>`;
  }).join('') : '<div class="notification-empty"><b>No notifications</b><span>You are all caught up.</span></div>';

  panel.innerHTML=`<div class="notification-dropdown-head"><div><b>Notifications</b><small>${unread} unread</small></div><button type="button" class="notification-text-action" onclick="markAllMemberNotificationsRead()" ${unread?'':'disabled'}>Mark all as read</button></div><div class="notification-list">${items}</div><div class="notification-dropdown-foot"><button type="button" class="notification-clear-action" onclick="clearAllMemberNotifications()" ${notes.length?'':'disabled'}>Clear all</button></div>`;
  positionMemberNotificationDropdown();
}

function showMemberNotifications(){
  if(memberNotificationDropdownOpen){ closeMemberNotificationDropdown(); return; }
  renderMemberNotificationDropdown();
  const panel=document.getElementById('memberNotificationDropdown');
  if(!panel) return;
  panel.classList.add('open');
  memberNotificationDropdownOpen=true;
  const bell=notificationBellButton();
  bell?.setAttribute('aria-expanded','true');
  if(!memberNotificationOutsideHandler){
    memberNotificationOutsideHandler=(event)=>{
      const target=event.target;
      if(target?.closest?.('#memberNotificationDropdown') || target?.closest?.('.notification-btn')) return;
      closeMemberNotificationDropdown();
    };
    document.addEventListener('click',memberNotificationOutsideHandler);
  }
  if(!memberNotificationResizeHandler){
    memberNotificationResizeHandler=()=>positionMemberNotificationDropdown();
    window.addEventListener('resize',memberNotificationResizeHandler);
  }
  setTimeout(()=>panel.classList.add('visible'),0);
}

function closeMemberNotificationDropdown(){
  const panel=document.getElementById('memberNotificationDropdown');
  if(panel) panel.remove();
  memberNotificationDropdownOpen=false;
  document.querySelectorAll('.notification-btn').forEach(b=>b.setAttribute('aria-expanded','false'));
  if(memberNotificationOutsideHandler){ document.removeEventListener('click',memberNotificationOutsideHandler); memberNotificationOutsideHandler=null; }
  if(memberNotificationResizeHandler){ window.removeEventListener('resize',memberNotificationResizeHandler); memberNotificationResizeHandler=null; }
}

function refreshNotificationBadges(){
  const unread=countUnreadMemberNotifications();
  document.querySelectorAll('.notification-btn').forEach(btn=>{
    const existing=btn.querySelector('.badge');
    if(existing) existing.remove();
    if(unread){
      btn.insertAdjacentHTML('beforeend',`<span class="badge">${Math.min(unread,99)}</span>`);
    }
  });
}

function markMemberNotificationRead(id){
  const all=getHelpNotifications();
  let changed=false;
  all.forEach(n=>{
    if(String(n.id||'')===String(id||'') && !n.read){ n.read=true; changed=true; }
  });
  if(changed) saveHelpNotifications(all);
  refreshNotificationBadges();
  if(memberNotificationDropdownOpen) renderMemberNotificationDropdown();
}

function markAllMemberNotificationsRead(){
  const id=memberId();
  const email=(currentAccount()?.email || sessionStorage.getItem('baiEmail') || '').trim().toLowerCase();
  const all=getHelpNotifications();
  let changed=false;
  all.forEach(n=>{
    const mine=(n.memberId && id && n.memberId===id) || (!n.memberId && n.email && n.email===email);
    if(mine && !n.read){ n.read=true; changed=true; }
  });
  if(changed) saveHelpNotifications(all);
  refreshNotificationBadges();
  if(memberNotificationDropdownOpen) renderMemberNotificationDropdown();
}

function clearAllMemberNotifications(){
  const id=memberId();
  const email=(currentAccount()?.email || sessionStorage.getItem('baiEmail') || '').trim().toLowerCase();
  const all=getHelpNotifications();
  const kept=all.filter(n=>{
    const mine=(n.memberId && id && n.memberId===id) || (!n.memberId && n.email && n.email===email);
    return !mine;
  });
  if(kept.length!==all.length) saveHelpNotifications(kept);
  refreshNotificationBadges();
  if(memberNotificationDropdownOpen) renderMemberNotificationDropdown();
}

function handleMemberNotificationClick(notificationId,enquiryId){
  markMemberNotificationRead(notificationId);
  closeMemberNotificationDropdown();
  if(enquiryId){ goQuery('enquiry-view',{id:enquiryId}); }
}
function deleteAccount(){
  if(!confirm('Are you sure you want to delete your MyBAI account?')) return;
  const id=sessionStorage.getItem('baiAccountId'); const email=normalizeAccountEmail(accountEmail());
  if(id){
    saveHelpEnquiries(getHelpEnquiries().filter(e=>e.memberId!==id));
    saveHelpConversations(getHelpConversations().filter(c=>c.memberId!==id));
    saveHelpNotifications(getHelpNotifications().filter(n=>!(id&&n.memberId===id) && String(n.email||'').toLowerCase()!==email));
    localStorage.removeItem(accountApplicationsKey(id));
    saveAccountRegistry(getAccountRegistry().filter(a=>a.id!==id));
    Object.keys(localStorage).filter(k=>k.startsWith(`baiSetting_${id}_`)).forEach(k=>localStorage.removeItem(k));
  }
  Object.keys(localStorage).filter(k=>k.startsWith('baiSetting_')).forEach(k=>{
    if(id && k.startsWith(`baiSetting_${id}_`)) localStorage.removeItem(k);
  });
  Object.keys(sessionStorage).filter(k=>k.startsWith('bai')).forEach(k=>sessionStorage.removeItem(k));
  window.baiUploadFiles={};
  go('login');
}
function hydrateAccountSession(account){
  if(!account) return false;
  sessionStorage.setItem('baiAccountEmail',account.email||'');
  sessionStorage.setItem('baiAccountName',account.name||'MyBAI User');
  sessionStorage.setItem('baiAccountFirstName',account.firstName||'');
  sessionStorage.setItem('baiAccountLastName',account.lastName||'');
  sessionStorage.setItem('baiAccountGender',account.gender||'');
  sessionStorage.setItem('baiAccountDob',account.dob||'');
  sessionStorage.setItem('baiAccountCivilStatus',account.civilStatus||'');
  sessionStorage.setItem('baiGuardianEmail',account.guardianEmail||'');
  sessionStorage.setItem('baiAccountType',account.type||'adult');
  sessionStorage.setItem('baiAccountId',account.id);
  sessionStorage.setItem('baiApplications',JSON.stringify(account.applications||[]));
  sessionStorage.removeItem('baiCurrentApplicationId');
  return true;
}
function saveCurrentAccountToRegistry(){
  const id=sessionStorage.getItem('baiAccountId'); const email=accountEmail();
  if(!id || !email) return null;
  const accounts=getAccountRegistry();
  const record={id,email,name:accountName(),firstName:sessionStorage.getItem('baiAccountFirstName')||'',lastName:sessionStorage.getItem('baiAccountLastName')||'',gender:sessionStorage.getItem('baiAccountGender')||'',dob:sessionStorage.getItem('baiAccountDob')||'',civilStatus:sessionStorage.getItem('baiAccountCivilStatus')||'',guardianEmail:sessionStorage.getItem('baiGuardianEmail')||'',type:sessionStorage.getItem('baiAccountType')||'adult',applications:getApplicationsSafeForAccount()};
  const idx=accounts.findIndex(a=>a.id===id);
  if(idx>=0) accounts[idx]={...accounts[idx],...record}; else accounts.push(record);
  saveAccountRegistry(accounts); return record;
}
function minorRegister(){
  return `<div class="auth-screen terminal-auth"><div class="registration-card minor-card">
   <button class="auth-back auth-back-form back-btn" onclick="go('signup')" aria-label="Back to account type">← Back</button>
   <div class="form-title-row"><div class="choice-icon small"><img src="assets/passport-icon.png" alt="Passport"></div><div><h1><span>FOR MINORS</span><br>REGISTRATION REQUIREMENTS</h1><p>Please fill out the form to create an account!</p></div></div>
   <p class="id-match-note"><b>Note:</b> The information entered must be the same as the information shown on the valid ID you submit.</p>
   <div class="minor-upload-row">${uploadBox('minorPhoto','Recent<br>Photo','photo-box')}<div class="upload-note"><b>1:1 Recent Photo</b><br>on a white background<br>no facial expressions</div>${uploadBox('minorSchoolId','School ID','school-box')}</div>
   <div class="form-grid minor-grid">
     <div class="field"><label>First Name</label><input id="minorFirstName" autocomplete="given-name" oninput="sanitizeName(this)" pattern="[A-Za-zÀ-ÖØ-öø-ÿ\s\'-]+"></div>
     <div class="field"><label>Last Name</label><input id="minorLastName" autocomplete="family-name" oninput="sanitizeName(this)" pattern="[A-Za-zÀ-ÖØ-öø-ÿ\s\'-]+"></div>
     <div class="field"><label>Gender</label><select id="minorGender"><option value="" disabled selected hidden>Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
     <div class="field"><label>Date of Birth</label><input id="minorDob" type="date" aria-label="Date of Birth"></div>
     <div class="field"><label>E-Mail</label><input id="minorEmail" type="email" placeholder="example@example.com" autocomplete="email"></div>
     <div class="field full"><label>Guardian E-Mail</label><input id="guardianEmail" type="email" placeholder="example@example.com" autocomplete="email"></div>
   </div>
   ${uploadBox('minorAffiliationId','Proof of Affiliation ID','wide-upload')}
   <button class="primary" style="margin-top:10px" onclick="createAccount('minor')">Create Account</button>
   <label class="agreement"><input type="checkbox">Terms of Agreement</label>
   <label class="agreement"><input type="checkbox">Privacy Policy</label>
   <p class="agreement-note">By Creating an Account, you agree to the Bisaya Airlines<br>International’s Terms of Agreement, and Burgers</p>
 </div></div>`;
}
function validateCreateAccount(type){
  const form=document.querySelector('.registration-card'); clearFormErrors(form);
  const fields=type==='adult' ? [['adultFirstName','Please enter your first name.'],['adultLastName','Please enter your last name.'],['adultGender','Please select your gender.'],['adultDob','Please enter your date of birth.'],['adultCivil','Please select your civil status.'],['adultEmail','Please enter your email address.']] : [['minorFirstName','Please enter your first name.'],['minorLastName','Please enter your last name.'],['minorGender','Please select your gender.'],['minorDob','Please enter your date of birth.'],['minorEmail','Please enter your email address.'],['guardianEmail','Please enter the guardian email address.']];
  let valid=true;
  fields.forEach(([id,msg])=>{ const field=document.getElementById(id); if(!field || !String(field.value||'').trim()){ showFieldError(field,msg); valid=false; } });
  const names=type==='adult'?['adultFirstName','adultLastName']:['minorFirstName','minorLastName'];
  names.forEach(id=>{ const field=document.getElementById(id); if(field && field.value.trim() && !/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(field.value.trim())){ field.closest('.field')?.querySelector('.field-error')?.remove(); showFieldError(field,'Please use letters only for names.'); valid=false; } });
  const emailIds=type==='adult'?['adultEmail']:['minorEmail','guardianEmail'];
  emailIds.forEach(id=>{ const field=document.getElementById(id); if(field && field.value.trim() && !isValidEmailAddress(field.value)){ field.closest('.field')?.querySelector('.field-error')?.remove(); showFieldError(field,'Please enter a valid email address.'); valid=false; } });
  if(type==='minor'){
    const minorEmail=document.getElementById('minorEmail')?.value.trim().toLowerCase(); const guardianEmail=document.getElementById('guardianEmail')?.value.trim().toLowerCase();
    if(minorEmail && guardianEmail && minorEmail===guardianEmail){ showFieldError(document.getElementById('guardianEmail'),'Please use a different email address for the guardian.'); valid=false; }
  }
  const dob=document.getElementById(type==='adult'?'adultDob':'minorDob');
  if(dob?.value){ const age=calculateAge(dob.value); if(age===null || age<0){ showFieldError(dob,'Please enter a valid date of birth.'); valid=false; } else if(type==='adult' && age<18){ showFieldError(dob,'Adult registration is for users 18 years old or older.'); valid=false; } else if(type==='minor' && age>=18){ showFieldError(dob,'Minor registration is for users under 18 years old.'); valid=false; } }
  const uploadIds=type==='adult'?[['adultPhoto','Please upload a recent photo.'],['adultGovernmentId','Please upload a valid government ID.']]:[['minorPhoto','Please upload a recent photo.'],['minorSchoolId','Please upload your school ID.'],['minorAffiliationId','Please upload proof of affiliation.']];
  uploadIds.forEach(([id,msg])=>{ if(!validateUpload(id,msg)) valid=false; });
  const agreements=form?Array.from(form.querySelectorAll('.agreement input[type="checkbox"]')):[]; agreements.forEach(cb=>{ if(!cb.checked){ showAgreementError(cb,'Please accept this to continue.'); valid=false; } });
  return valid;
}
function registrationDraftKey(type){ return type==='adult'?'baiAdultDraft':'baiMinorDraft'; }
function saveRegistrationDraft(type){
  const ids=type==='adult'?['adultFirstName','adultLastName','adultGender','adultDob','adultCivil','adultEmail']:['minorFirstName','minorLastName','minorGender','minorDob','minorEmail','guardianEmail'];
  const draft={}; ids.forEach(id=>{const el=document.getElementById(id); if(el) draft[id]=el.value;});
  const form=document.querySelector('.registration-card'); if(form){ draft.agreements=Array.from(form.querySelectorAll('.agreement input[type="checkbox"]')).map(cb=>cb.checked); }
  draft.uploads=(type==='adult'?['adultPhoto','adultGovernmentId']:['minorPhoto','minorSchoolId','minorAffiliationId']).reduce((o,id)=>{if(window.baiUploadFiles[id]?.name)o[id]=window.baiUploadFiles[id].name;return o;},{});
  sessionStorage.setItem(registrationDraftKey(type),JSON.stringify(draft));
}
function wireCreateAccountValidation(){
  const form=document.querySelector('.registration-card'); if(!form) return; const type=form.classList.contains('minor-card')?'minor':'adult';
  form.querySelectorAll('input, select').forEach(field=>{ const evt=field.type==='file'?'change':field.type==='checkbox'?'change':(field.tagName==='SELECT'||field.type==='date'?'change':'input'); field.addEventListener(evt,()=>{ const wrapper=field.closest('.field'); if(wrapper&&String(field.value||'').trim()) wrapper.classList.remove('invalid'); wrapper?.querySelector('.field-error')?.remove(); if(field.type==='checkbox'){const label=field.closest('.agreement'); if(label&&field.checked){label.classList.remove('invalid');label.querySelector('.field-error')?.remove();}} saveRegistrationDraft(type); }); });
  restoreRegistrationDraft(type); wireUploadInputs(form);
}

function startEnquiryFromArticle(id){ sessionStorage.setItem('baiHelpSourceArticleId',id); sessionStorage.removeItem('baiHelpPendingConversationId'); go('enquiry-form'); }
function knowledgeArticle(){
  const id=parseRouteHash().params.get('id'); const article=getKnowledgeBase().find(a=>a.id===id);
  if(!article) return memberShell(`<div class="page-panel"><h2>Article Not Found</h2><p>The requested Knowledge Base article could not be found.</p><button class="primary" onclick="go('help-center')">Back to Help Center</button></div>`,'help');
  return memberShell(`<div class="page-panel article-view-panel"><div class="subpage-top"><button class="link-btn back-btn" onclick="go('help-center')">← Back to Help Center</button><span class="article-type article-view-type">${esc(articleTypeLabel(article.type))}</span><h2>${esc(article.title)}</h2><div class="article-meta">${esc(article.category)} · Updated ${formatDateTime(article.updatedAt)}</div></div><div class="article-body">${esc(article.body)}</div><div class="article-actions"><button class="primary" onclick="go('ai-chat')">Ask AI about this</button><button class="secondary-action" onclick="startEnquiryFromArticle('${esc(article.id)}')">Still need help?</button></div></div>`,'help');
}
function enquiryForm(){
  selectedEnquiryFiles=[];
  const pendingId=sessionStorage.getItem('baiHelpPendingConversationId'); const conv=pendingId?getHelpConversations().find(c=>c.id===pendingId && c.memberId===memberId()):null; const transcript=conv?.messages||[]; const sourceArticleId=sessionStorage.getItem('baiHelpSourceArticleId')||''; const sourceArticle=sourceArticleId?getKnowledgeBase().find(a=>a.id===sourceArticleId):null; const defaultDescription=transcript.filter(m=>m.sender==='member').at(-1)?.text||'';
  return memberShell(`<div class="page-panel enquiry-form-panel"><div class="subpage-top"><button class="link-btn back-btn" onclick="go('${conv?'ai-chat':'help-center'}')">← Back</button><h2>Submit an Enquiry</h2><p>${conv?'Your AI Assistant conversation will be included so support personnel can see what you already asked.':'Send your question directly to a support personnel.'}</p></div><form class="enquiry-form" onsubmit="submitEnquiry(event)"><div class="form-grid enquiry-grid"><div class="field"><label for="enquiryEmail">Email Address</label><input id="enquiryEmail" value="${esc(accountEmail())}" readonly></div><div class="field"><label for="enquiryCategory">Enquiry Type</label><select id="enquiryCategory" required>${supportCategoryOptions('')}</select></div><div class="field full"><label for="enquiryApplication">Related Application (optional)</label><select id="enquiryApplication">${relatedApplicationOptions('')}</select><small class="field-help">Select an application only when your question is about a specific passport application.</small></div><div class="field full"><label for="enquiryBody">Message</label><textarea id="enquiryBody" required placeholder="Describe your enquiry...">${esc(defaultDescription)}</textarea></div><div class="field full"><label for="enquiryAttachment">Attachment (optional)</label><input id="enquiryAttachment" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" onchange="validateEnquiryAttachment(this)"><small class="field-help">Optional PNG, JPG, WEBP, or PDF. Up to 5 files, 10 MB each.</small><div id="enquiryAttachmentCount" class="attachment-count">0 / 5 files</div><div id="enquiryAttachmentList"></div><div id="enquiryAttachmentError"></div></div></div>${sourceArticle?`<div class="chat-context article-context"><div class="chat-context-head"><b>Article Referenced</b><span>${esc(articleTypeLabel(sourceArticle.type))}</span></div><div class="chat-transcript"><div><b>${esc(sourceArticle.title)}</b><br>${esc(truncateText(sourceArticle.body,300))}</div></div></div>`:''}${conv?`<div class="chat-context"><div class="chat-context-head"><b>AI Chat Transcript</b><span>${transcript.length} message${transcript.length===1?'':'s'}</span></div><div class="chat-transcript">${transcript.map(m=>`<div><b>${m.sender==='member'?'You':'AI'}:</b> ${esc(m.text)}</div>`).join('')}</div></div>`:''}<div class="enquiry-actions"><button class="secondary-action" type="button" onclick="go('${conv?'ai-chat':'help-center'}')">Cancel</button><button class="primary" type="submit">Submit Enquiry</button></div></form></div>`,'help');
}

function updateApplicationStatus(id,status,message){ const apps=getApplications(); const idx=apps.findIndex(a=>a.id===id); if(idx<0)return false; const old=apps[idx].status; apps[idx]={...apps[idx],status,updatedAt:nowIso()}; saveApplications(apps); sessionStorage.setItem('baiCurrentApplicationId',id); if(old!==status && message && setting('statusUpdates',true)) addHelpNotification(accountEmail(),message,id,memberId()); return true; }
function confirmApplicationReceived(id){ const app=findApplicationById(id); if(!app || String(app.status||'').toUpperCase()!=='READY FOR RELEASE') return; if(confirm('Confirm that you have received your passport?')){ updateApplicationStatus(id,'COMPLETED',`Your ${app.type} application ${app.id} has been marked as completed.`); go('status'); } }
function cancelApplication(id){ const app=findApplicationById(id); if(!app || ['COMPLETED','CANCELLED'].includes(String(app.status||'').toUpperCase())) return; if(confirm('Cancel this passport application?')){ updateApplicationStatus(id,'CANCELLED',`Your ${app.type} application ${app.id} has been cancelled.`); go('status'); } }


/* v57 consistency fixes */
function restoreRegistrationDraft() {
  const key = registrationDraftKey();
  const draft = JSON.parse(localStorage.getItem(key) || 'null');
  if (!draft) return;
  const ids = ['firstName','lastName','gender','dob','civilStatus','email','minorEmail','guardianEmail','terms','privacy'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el || draft[id] === undefined) return;
    if (el.type === 'checkbox') el.checked = !!draft[id];
    else el.value = draft[id] || '';
  });
  document.querySelectorAll('input[type=file]').forEach(input => { input.value = ''; });
  wireCreateAccountValidation();
}

function addHelpNotification(email, message, enquiryId, memberIdValue) {
  const list = jsonGet(HELP_NOTIFICATION_KEY, []);
  const id = memberIdValue || memberId() || null;
  list.push({
    id: 'NTF-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    memberId: id,
    email: String(email || '').trim().toLowerCase(),
    message,
    enquiryId: enquiryId || null,
    createdAt: new Date().toISOString(),
    read: false
  });
  jsonSet(HELP_NOTIFICATION_KEY, list);
}

function memberNotifications() {
  const id = memberId();
  const email = (currentAccount()?.email || sessionStorage.getItem('baiEmail') || '').trim().toLowerCase();
  const all = jsonGet(HELP_NOTIFICATION_KEY, []);
  return all.filter(n => (n.memberId && id ? n.memberId === id : false) || (!n.memberId && n.email && n.email === email));
}

function markMemberNotificationsRead() {
  const id = memberId();
  const email = (currentAccount()?.email || sessionStorage.getItem('baiEmail') || '').trim().toLowerCase();
  const all = jsonGet(HELP_NOTIFICATION_KEY, []);
  let changed = false;
  all.forEach(n => {
    const mine = (n.memberId && id && n.memberId === id) || (!n.memberId && n.email && n.email === email);
    if (mine && !n.read) { n.read = true; changed = true; }
  });
  if (changed) jsonSet(HELP_NOTIFICATION_KEY, all);
}

function normalizeFormalEnquiryStatuses() {
  const all = jsonGet(HELP_ENQUIRIES_KEY, []);
  let changed = false;
  all.forEach(e => {
    if (e.status === 'AI-Assisted') {
      e.status = e.escalationFlag ? 'Escalated' : 'Pending';
      changed = true;
    }
  });
  if (changed) jsonSet(HELP_ENQUIRIES_KEY, all);
}

function getHelpEnquiries() {
  normalizeFormalEnquiryStatuses();
  return jsonGet(HELP_ENQUIRIES_KEY, []);
}


async function submitEnquiry(event) {
  if (event && event.preventDefault) event.preventDefault();
  const email = (currentAccount()?.email || sessionStorage.getItem('baiEmail') || '').trim().toLowerCase();
  const id = memberId();
  if (!email || !id) { alert('Please sign in to submit an enquiry.'); return; }
  const type = document.getElementById('enquiryCategory')?.value || document.getElementById('enquiryType')?.value || '';
  const message = (document.getElementById('enquiryMessage')?.value || document.getElementById('enquiryBody')?.value || '').trim();
  const relatedId = document.getElementById('relatedApplication')?.value || '';
  const attachments = Array.isArray(selectedEnquiryFiles) ? selectedEnquiryFiles : Array.from(document.getElementById('enquiryAttachment')?.files || []);
  let storedAttachments = [];
  if (attachments.length) {
    try { storedAttachments = (await Promise.all(attachments.map(saveEnquiryAttachment))).filter(Boolean); }
    catch (err) { alert('One or more attachments could not be saved. Please try the upload again.'); return; }
  }
  const storedAttachment = storedAttachments[0] || null;
  const articleId = localStorage.getItem('baiHelpSourceArticleId') || null;
  const article = articleId ? getKnowledgeBase().find(a => a.id === articleId) : null;
  const convId = localStorage.getItem('baiHelpEscalationConversationId') || null;
  const conversations = jsonGet(HELP_CONVERSATIONS_KEY, []);
  const conv = convId ? conversations.find(c => c.id === convId && c.memberId === id) : null;
  const relatedApp = relatedId ? getApplications().find(a => a.id === relatedId) : null;
  const record = {
    id: createEnquiryId(),
    memberId: id,
    email,
    memberEmail: email,
    memberName: memberDisplayName(),
    applicationId: relatedApp?.id || null,
    applicationSnapshot: relatedApp ? JSON.parse(JSON.stringify(relatedApp)) : null,
    category: type,
    description: message,
    attachment: storedAttachment,
    attachments: storedAttachments,
    chatHistory: conv ? JSON.parse(JSON.stringify(conv.messages || [])) : [],
    sourceArticleId: article?.id || null,
    sourceArticleTitle: article?.title || null,
    matchedKnowledgeArticleId: conv?.lastMatchedArticleId || null,
    escalationFlag: !!conv,
    escalationTimestamp: conv ? new Date().toISOString() : null,
    status: conv ? 'Escalated' : 'Pending',
    personnelId: null,
    personnelName: null,
    personnelReply: '',
    auditTrail: [{ action: 'Created', actorType: 'Member', actorId: id, at: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [{ senderType: 'Member', senderId: id, senderName: memberDisplayName(), text: message, attachment: storedAttachment, attachments: storedAttachments, createdAt: new Date().toISOString() }]
  };
  const all = jsonGet(HELP_ENQUIRIES_KEY, []);
  all.push(record);
  jsonSet(HELP_ENQUIRIES_KEY, all);
  localStorage.removeItem('baiHelpSourceArticleId');
  localStorage.removeItem('baiHelpEscalationConversationId');
  selectedEnquiryFiles=[];
  go('enquiry-submitted');
}

/* =========================
   OTP FLOW STABILITY FIXES (v60)
   Keeps registration/login verification state available long enough to complete
   the demo flow, while preserving the existing 7-digit numeric validation.
   ========================= */
const BAI_PENDING_REGISTRATION_KEY = 'baiPendingRegistrationData';
const BAI_PENDING_LOGIN_KEY = 'baiPendingLoginData';
const BAI_PENDING_STATE_MAX_AGE = 30 * 60 * 1000;

function savePendingRegistrationData(data){
  const payload={...data,createdAt:Date.now()};
  localStorage.setItem(BAI_PENDING_REGISTRATION_KEY,JSON.stringify(payload));
  sessionStorage.setItem('baiPendingRegistrationAccountId',data.id||'');
  sessionStorage.setItem('baiRegistrationPending','true');
}
function getPendingRegistrationData(){
  try{
    const raw=localStorage.getItem(BAI_PENDING_REGISTRATION_KEY);
    if(!raw) return null;
    const data=JSON.parse(raw);
    if(!data || !data.id || !data.email) return null;
    if(data.createdAt && Date.now()-Number(data.createdAt)>BAI_PENDING_STATE_MAX_AGE){
      localStorage.removeItem(BAI_PENDING_REGISTRATION_KEY);
      return null;
    }
    return data;
  }catch(e){ return null; }
}
function clearPendingRegistrationData(){
  localStorage.removeItem(BAI_PENDING_REGISTRATION_KEY);
  sessionStorage.removeItem('baiPendingRegistrationAccountId');
  sessionStorage.removeItem('baiRegistrationPending');
}
function savePendingLoginData(data){
  const payload={...data,createdAt:Date.now()};
  localStorage.setItem(BAI_PENDING_LOGIN_KEY,JSON.stringify(payload));
  sessionStorage.setItem('baiPendingLoginEmail',data.email||'');
  sessionStorage.setItem('baiPendingLoginAccountId',data.accountId||'');
}
function getPendingLoginData(){
  try{
    const raw=localStorage.getItem(BAI_PENDING_LOGIN_KEY);
    if(!raw) return null;
    const data=JSON.parse(raw);
    if(!data || !data.email || !data.accountId) return null;
    if(data.createdAt && Date.now()-Number(data.createdAt)>BAI_PENDING_STATE_MAX_AGE){
      localStorage.removeItem(BAI_PENDING_LOGIN_KEY);
      return null;
    }
    return data;
  }catch(e){ return null; }
}
function clearPendingLoginData(){
  localStorage.removeItem(BAI_PENDING_LOGIN_KEY);
  sessionStorage.removeItem('baiPendingLoginEmail');
  sessionStorage.removeItem('baiPendingLoginAccountId');
}

/* New-account creation: use a persistent pending record so verification is not
   incorrectly treated as an expired registration when the page rerenders. */
function createAccount(type){
  const emailId=type==='adult'?'adultEmail':'guardianEmail';
  if(!validateCreateAccount(type)) return;
  const emailField=document.getElementById(emailId);
  const email=(emailField?.value||'').trim();
  if(findAccountByEmail(email)){
    showFieldError(emailField,'An account with this email address already exists. Please sign in using this email address.');
    return;
  }
  const firstName=(document.getElementById(type==='adult'?'adultFirstName':'minorFirstName')?.value||'').trim();
  const lastName=(document.getElementById(type==='adult'?'adultLastName':'minorLastName')?.value||'').trim();
  const gender=(document.getElementById(type==='adult'?'adultGender':'minorGender')?.value||'').trim();
  const dob=(document.getElementById(type==='adult'?'adultDob':'minorDob')?.value||'').trim();
  const civilStatus=type==='adult'?(document.getElementById('adultCivil')?.value||'').trim():'';
  const guardianEmail=type==='minor'?(document.getElementById('guardianEmail')?.value||'').trim():'';
  const accountId=`BAI-MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const data={id:accountId,email:normalizeAccountEmail(email),name:`${formatPersonName(firstName)} ${formatPersonName(lastName)}`.trim(),firstName:formatPersonName(firstName),lastName:formatPersonName(lastName),gender,dob,civilStatus,guardianEmail,type,applications:[]};
  hydrateAccountSession(data);
  sessionStorage.setItem('baiRegistrationOtpSent','false');
  sessionStorage.setItem('baiRegistrationPending','true');
  localStorage.removeItem('baiRegistrationOtp');
  sessionStorage.setItem('baiPendingRegistrationSnapshot',JSON.stringify(data));
  savePendingRegistrationData(data);
  go('verify');
}

/* Registration OTP verification: any exactly 7-digit code is accepted in this
   prototype; verification state comes from the persistent pending record. */


/* Login: keep pending account identity outside sessionStorage as well, so the
   Continue button still works after a render/reopen. */



/* Unified render registry retains Module 2 routes while using the stable OTP
   handlers above. */
function render(){
  closeMemberNotificationDropdown();
  restorePendingAuthContext();
  migrateLoggedInAccountToRegistry();
  stopEnquiryRealtime?.();
  const parsed=parseRouteHash();
  const page=parsed.page;
  const pages={login,'login-verify':loginVerify,signup,'adult-register':adultRegister,'minor-register':minorRegister,'renewal-form':renewalForm,'renewal-continue':renewalContinue,'replacement-form':lostPassportReplacement,'replacement-continue':replacementContinue,verify,created,'new-application':newApplication,'link-application':linkApplication,'application-linked':applicationLinked,complaint,'complaint-done':complaintDone,dashboard,profile,'change-email':changeEmail,status,settings,'help-center':helpCenter,'knowledge-base':knowledgeBase,'knowledge-article':knowledgeArticle,'ai-chat':aiChat,'enquiry-form':enquiryForm,'enquiry-submitted':enquirySubmitted,enquiries,'enquiry-view':enquiryView};
  const protectedPages=new Set(['dashboard','profile','status','settings','change-email','renewal-form','renewal-continue','replacement-form','replacement-continue','new-application','link-application','application-linked','help-center','knowledge-base','knowledge-article','ai-chat','enquiry-form','enquiry-submitted','enquiries','enquiry-view','complaint','complaint-done']);
  if(protectedPages.has(page) && sessionStorage.getItem('baiLoggedIn')!=='true'){
    location.hash='login';
    return;
  }
  app.innerHTML=(pages[page]||login)();
  if(page==='adult-register'||page==='minor-register') wireCreateAccountValidation();
  if(page==='renewal-form'||page==='replacement-form') wireUploadInputs(document.querySelector('.renewal-card'));
  if(page==='verify'&&sessionStorage.getItem('baiRegistrationOtpSent')==='true') startOtpCooldown('registration');
  if(page==='login-verify'&&sessionStorage.getItem('baiLoginOtpSent')==='true') startOtpCooldown('login');
  if(page==='change-email'&&sessionStorage.getItem('baiEmailChangeOtpSent')==='true') startEmailChangeCooldown();
  if(page==='enquiry-form') wireEnquiryLiveValidation();
  startEnquiryRealtime?.(page);
}

/* v61 OTP/account flow hardening: restore pending identities if a render/page reload
   temporarily loses sessionStorage, and make the post-registration dashboard step
   recoverable without changing the member-facing flow. */
function restorePendingAuthContext(){
  try{
    if(location.hash==='#login-verify' || location.hash.startsWith('#login-verify?')){
      const p=getPendingLoginData();
      if(p){
        sessionStorage.setItem('baiPendingLoginEmail',p.email||'');
        sessionStorage.setItem('baiPendingLoginAccountId',p.accountId||'');
        if(p.accountSnapshot) sessionStorage.setItem('baiPendingLoginAccountSnapshot',JSON.stringify(p.accountSnapshot));
      }
    }
    if(location.hash==='#verify' || location.hash.startsWith('#verify?')){
      const p=getPendingRegistrationData();
      if(p){
        hydrateAccountSession(p);
        sessionStorage.setItem('baiRegistrationPending','true');
        sessionStorage.setItem('baiPendingRegistrationAccountId',p.id||'');
        sessionStorage.setItem('baiPendingRegistrationSnapshot',JSON.stringify(p));
      }
    }
  }catch(e){}
}

function created(){
  return `<div class="auth-screen terminal-auth"><div class="auth-card created-card">
   <div class="message-screen created-message">
     <h1>ACCOUNT CREATED!</h1>
     <p>Welcome! your account has been created,<br>you will be Emailed an <b>One Time Password (OTP)</b><br>everytime you want to log in</p>
     <p>Do not share your One-Time Password (OTP) with anyone</p>
     <button class="primary" onclick="proceedAfterCreated()">Proceed to Dashboard</button>
   </div>
 </div></div>`;
}

// Patch the renderer to restore pending OTP context before it builds the page.


/* v62 auth flow hardening: keep registration/login identities recoverable and
   make OTP Continue deterministic for the member-facing site. */
function v62PendingRegistration(){
  try{
    const p=getPendingRegistrationData?.();
    if(p?.id && p?.email) return p;
  }catch(e){}
  try{
    const raw=sessionStorage.getItem('baiPendingRegistrationSnapshot');
    const p=raw?JSON.parse(raw):null;
    if(p?.id && p?.email && sessionStorage.getItem('baiRegistrationPending')==='true') return p;
  }catch(e){}
  return null;
}
function v62PendingLogin(){
  try{
    const p=getPendingLoginData?.();
    if(p?.email) return p;
  }catch(e){}
  try{
    const raw=sessionStorage.getItem('baiPendingLoginAccountSnapshot');
    const snapshot=raw?JSON.parse(raw):null;
    const email=normalizeAccountEmail(sessionStorage.getItem('baiPendingLoginEmail')||snapshot?.email||'');
    const accountId=sessionStorage.getItem('baiPendingLoginAccountId')||snapshot?.id||'';
    if(email && accountId) return {email,accountId,accountSnapshot:snapshot};
  }catch(e){}
  return null;
}
function completeRegistrationVerification(){
  const input=document.getElementById('registrationOtp');
  if(!validateOtp('registrationOtp')) return;
  let pending=v62PendingRegistration();
  if(!pending){
    showFieldError(input,'Your registration session has expired. Please start again.');
    return;
  }
  const email=normalizeAccountEmail(pending.email);
  let accounts=getAccountRegistry();
  let account=accounts.find(a=>a.id===pending.id)||null;
  const conflicting=accounts.find(a=>normalizeAccountEmail(a.email)===email && a.id!==pending.id)||null;
  if(conflicting){
    showFieldError(input,'An account with this email address already exists. Please sign in using this email address.');
    clearPendingRegistrationData();
    sessionStorage.removeItem('baiPendingRegistrationSnapshot');
    return;
  }
  if(!account){
    account={
      id:pending.id,
      email,
      name:pending.name||`${pending.firstName||''} ${pending.lastName||''}`.trim()||'MyBAI User',
      firstName:pending.firstName||'',
      lastName:pending.lastName||'',
      gender:pending.gender||'',
      dob:pending.dob||'',
      civilStatus:pending.civilStatus||'',
      guardianEmail:pending.guardianEmail||'',
      type:pending.type||'adult',
      applications:Array.isArray(pending.applications)?pending.applications:[]
    };
    accounts.push(account);
  }else{
    account={...account,email,name:pending.name||account.name,firstName:pending.firstName||account.firstName||'',lastName:pending.lastName||account.lastName||'',gender:pending.gender||account.gender||'',dob:pending.dob||account.dob||'',civilStatus:pending.civilStatus||account.civilStatus||'',guardianEmail:pending.guardianEmail||account.guardianEmail||'',type:pending.type||account.type||'adult',applications:Array.isArray(account.applications)?account.applications:[]};
    accounts=accounts.map(a=>a.id===account.id?account:a);
  }
  saveAccountRegistry(accounts);
  hydrateAccountSession(account);
  sessionStorage.setItem('baiLoggedIn','true');
  clearPendingRegistrationData();
  sessionStorage.removeItem('baiPendingRegistrationSnapshot');
  sessionStorage.removeItem('baiRegistrationPending');
  sessionStorage.removeItem('baiRegistrationOtpSent');
  sessionStorage.removeItem('baiRegistrationOtp');
  sessionStorage.removeItem('baiRegistrationOtpSentAt');
  sessionStorage.removeItem('baiPendingLoginEmail');
  sessionStorage.removeItem('baiPendingLoginAccountId');
  if(account.type) sessionStorage.removeItem(registrationDraftKey(account.type));
  go('created');
}
function startLogin(){
  const email=document.getElementById('loginEmail');
  email?.closest('.field')?.querySelector('.field-error')?.remove();
  if(!email || !email.value.trim()){ showFieldError(email,'Please enter your email address.'); return; }
  if(!isValidEmailAddress(email.value)){ showFieldError(email,'Please enter a valid email address.'); return; }
  const normalized=normalizeAccountEmail(email.value);
  let account=findAccountByEmail(normalized);
  /* Recover the currently known account from this browser if its registry was
     temporarily unavailable, without turning an unknown email into an account. */
  if(!account && normalizeAccountEmail(sessionStorage.getItem('baiAccountEmail')||'')===normalized && sessionStorage.getItem('baiAccountId')){
    account={
      id:sessionStorage.getItem('baiAccountId'),
      email:normalized,
      name:sessionStorage.getItem('baiAccountName')||'MyBAI User',
      firstName:sessionStorage.getItem('baiAccountFirstName')||'',
      lastName:sessionStorage.getItem('baiAccountLastName')||'',
      gender:sessionStorage.getItem('baiAccountGender')||'',
      dob:sessionStorage.getItem('baiAccountDob')||'',
      civilStatus:sessionStorage.getItem('baiAccountCivilStatus')||'',
      guardianEmail:sessionStorage.getItem('baiGuardianEmail')||'',
      type:sessionStorage.getItem('baiAccountType')||'adult',
      applications:getApplicationsSafeForAccount()
    };
    const accounts=getAccountRegistry();
    if(!accounts.some(a=>a.id===account.id)) saveAccountRegistry([...accounts,account]);
  }
  if(!account){ showFieldError(email,'No MyBAI account was found with this email address. Please create an account first.'); return; }
  email.closest('.field')?.classList.remove('invalid');
  savePendingLoginData({email:normalized,accountId:account.id,accountSnapshot:account});
  sessionStorage.setItem('baiPendingLoginAccountSnapshot',JSON.stringify(account));
  sessionStorage.setItem('baiLoginOtpSent','false');
  sessionStorage.removeItem('baiLoginOtp');
  sessionStorage.removeItem('baiLoginOtpSentAt');
  go('login-verify');
}
function loginUser(){
  const input=document.getElementById('loginOtp');
  if(!validateOtp('loginOtp')) return;
  const pending=v62PendingLogin();
  if(!pending){ showFieldError(input,'Your login session has expired. Please start again.'); return; }
  const accounts=getAccountRegistry();
  let account=(pending.accountId?accounts.find(a=>a.id===pending.accountId):null)||findAccountByEmail(pending.email);
  if(!account && pending.accountSnapshot){
    const snapshot=pending.accountSnapshot;
    if(snapshot.id && normalizeAccountEmail(snapshot.email)===normalizeAccountEmail(pending.email)){
      account=snapshot;
      saveAccountRegistry([...accounts, snapshot]);
    }
  }
  if(!account){ showFieldError(input,'No MyBAI account was found with this email address. Please create an account first.'); return; }
  hydrateAccountSession(account);
  sessionStorage.setItem('baiLoggedIn','true');
  sessionStorage.removeItem('baiLoginOtpSent');
  sessionStorage.removeItem('baiLoginOtp');
  sessionStorage.removeItem('baiLoginOtpSentAt');
  sessionStorage.removeItem('baiPendingLoginAccountSnapshot');
  clearPendingLoginData();
  sessionStorage.removeItem('baiComplaintReturn');
  go('dashboard');
}
function proceedAfterCreated(){
  let account=null;
  try{
    const id=sessionStorage.getItem('baiAccountId')||'';
    const accounts=getAccountRegistry();
    account=id?accounts.find(a=>a.id===id):null;
    if(!account){ account=findAccountByEmail(sessionStorage.getItem('baiAccountEmail')||''); }
    const pending=v62PendingRegistration();
    if(!account && pending){
      account={
        id:pending.id,
        email:normalizeAccountEmail(pending.email),
        name:pending.name||`${pending.firstName||''} ${pending.lastName||''}`.trim()||'MyBAI User',
        firstName:pending.firstName||'',lastName:pending.lastName||'',gender:pending.gender||'',dob:pending.dob||'',civilStatus:pending.civilStatus||'',guardianEmail:pending.guardianEmail||'',type:pending.type||'adult',applications:Array.isArray(pending.applications)?pending.applications:[]
      };
      saveAccountRegistry([...accounts.filter(a=>a.id!==account.id),account]);
    }
  }catch(e){}
  if(account){
    hydrateAccountSession(account);
    sessionStorage.setItem('baiLoggedIn','true');
    clearPendingRegistrationData();
    sessionStorage.removeItem('baiPendingRegistrationSnapshot');
    go('dashboard');
  }else{
    sessionStorage.removeItem('baiLoggedIn');
    location.hash='login';
    render();
  }
}

window.addEventListener('hashchange',render);
render();
