
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
function accountEmail(){ return (sessionStorage.getItem('baiAccountEmail')||'').trim(); }
function accountName(){ return sessionStorage.getItem('baiAccountName') || 'MyBAI User'; }
function accountExists(email){ return !!accountEmail() && accountEmail().toLowerCase()===String(email||'').trim().toLowerCase(); }
function setting(key, fallback=true){ const v=localStorage.getItem('baiSetting_'+key); return v===null?fallback:v==='true'; }
function saveSetting(key,value){ localStorage.setItem('baiSetting_'+key, value?'true':'false'); }
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
     <div class="small-center" style="margin-top:34px"><button class="link-btn" onclick="go('help-center')">Having issues? Write a Complaint Form</button></div>
     <div class="terms">By signing in, you agree to our <a href="#" onclick="return false">Terms of Use</a> and <a href="#" onclick="return false">Privacy Policy</a>.</div>
   </div></section>
 </div>`;
}
function loginVerify(){
 const email=esc(sessionStorage.getItem('baiPendingLoginEmail')||'');
 const sent=sessionStorage.getItem('baiLoginOtpSent')==='true';
 return `<div class="auth-screen terminal-auth"><div class="auth-card verify-card">
   <div class="message-screen verify-message">
     <button class="auth-back" onclick="go('login')" aria-label="Back to login">← Back</button>
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
   <button class="auth-back auth-back-choice" onclick="go('login')" aria-label="Back to login">← Back</button>
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
   <button class="auth-back auth-back-form" onclick="go('signup')" aria-label="Back to account type">← Back</button>
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
function minorRegister(){
 return `<div class="auth-screen terminal-auth"><div class="registration-card minor-card">
   <button class="auth-back auth-back-form" onclick="go('signup')" aria-label="Back to account type">← Back</button>
   <div class="form-title-row"><div class="choice-icon small"><img src="assets/passport-icon.png" alt="Passport"></div><div><h1><span>FOR MINORS</span><br>REGISTRATION REQUIREMENTS</h1><p>Please fill out the form to create an account!</p></div></div>
   <p class="id-match-note"><b>Note:</b> The information entered must be the same as the information shown on the valid ID you submit.</p>
   <div class="minor-upload-row">${uploadBox('minorPhoto','Recent<br>Photo','photo-box')}<div class="upload-note"><b>1:1 Recent Photo</b><br>on a white background<br>no facial expressions</div>${uploadBox('minorSchoolId','School ID','school-box')}</div>
   <div class="form-grid minor-grid">
     <div class="field"><label>First Name</label><input id="minorFirstName" autocomplete="given-name" oninput="sanitizeName(this)" pattern="[A-Za-zÀ-ÖØ-öø-ÿ\s\'-]+"></div>
     <div class="field"><label>Last Name</label><input id="minorLastName" autocomplete="family-name" oninput="sanitizeName(this)" pattern="[A-Za-zÀ-ÖØ-öø-ÿ\s\'-]+"></div>
     <div class="field"><label>Gender</label><select id="minorGender"><option value="" disabled selected hidden>Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
     <div class="field"><label>Date of Birth</label><input id="minorDob" type="date" aria-label="Date of Birth"></div>
     <div class="field full"><label>Guardian E-Mail</label><input id="guardianEmail" type="email" placeholder="example@example.com"></div>
   </div>
   ${uploadBox('minorAffiliationId','Proof of Affiliation ID','wide-upload')}
   <button class="primary" style="margin-top:10px" onclick="createAccount('minor')">Create Account</button>
   <label class="agreement"><input type="checkbox">Terms of Agreement</label>
   <label class="agreement"><input type="checkbox">Privacy Policy</label>
   <p class="agreement-note">By Creating an Account, you agree to the Bisaya Airlines<br>International’s Terms of Agreement, and Burgers</p>
 </div></div>`;
}
function renewalForm(){
 return `<div class="auth-screen terminal-auth"><div class="registration-card renewal-card">
   <button class="auth-back auth-back-form" onclick="go('dashboard')" aria-label="Back to dashboard">← Back</button>
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
 apps.push(app); sessionStorage.setItem('baiApplications',JSON.stringify(apps)); sessionStorage.setItem('baiCurrentApplicationId',appId); sessionStorage.setItem('baiRenewalSubmitted','true');
 go('renewal-continue');
}

function lostPassportReplacement(){
 return `<div class="auth-screen terminal-auth"><div class="registration-card renewal-card">
   <button class="auth-back auth-back-form" onclick="go('dashboard')" aria-label="Back to dashboard">← Back</button>
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
     <button class="auth-back" onclick="go('${backPage}')" aria-label="Back to registration">← Back</button>
     <h1>EMAIL VERIFICATION</h1>
     ${sent ? `<p>A verification <b>One-Time Password (OTP)</b> has been sent<br>to <b>${email||'your email address'}</b>. Enter the code below.</p>` : `<p>We'll send a 7-digit verification code<br>to <b>${email||'your email address'}</b>.</p>`}
     ${sent ? `<div class="field verify-code-field"><label>Verification Code</label><input id="registrationOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" pattern="[0-9]{7}" oninput="sanitizeOtp(this)"></div>` : `<button class="primary otp-send-btn" onclick="sendOtp('registration')">Send Code</button>`}
     ${sent ? `<p class="verify-warning">do not share the verification code with anyone else</p><button class="primary" onclick="completeRegistrationVerification()">Continue</button><button class="resend-btn" id="registrationResend" onclick="sendOtp('registration')">Resend Code</button>` : ''}
     ${sent ? `<p class="otp-status" id="registrationOtpStatus"></p>` : ''}
   </div>
 </div></div>`;
}

function completeRegistrationVerification(){
 if(!validateOtp('registrationOtp')) return;
 sessionStorage.setItem('baiLoggedIn','true');
 sessionStorage.removeItem('baiPendingLoginEmail');
 const type=sessionStorage.getItem('baiAccountType');
 if(type) sessionStorage.removeItem(registrationDraftKey(type));
 sessionStorage.removeItem('baiRegistrationOtpSent');
 sessionStorage.removeItem('baiRegistrationOtp');
 sessionStorage.removeItem('baiRegistrationOtpSentAt');
 go('created');
}
function created(){
 return `<div class="auth-screen terminal-auth"><div class="auth-card created-card">
   <div class="message-screen created-message">
     <h1>ACCOUNT CREATED!</h1>
     <p>Welcome! your account has been created,<br>you will be Emailed an <b>One Time Password (OTP)</b><br>everytime you want to log in</p>
     <p>Do not share your One-Time Password (OTP) with anyone</p>
     <button class="primary" onclick="go('dashboard')">Proceed to Dashboard</button>
   </div>
 </div></div>`;
}

function getApplications(){
 try{return JSON.parse(sessionStorage.getItem('baiApplications')||'[]');}catch(e){return [];} }
function saveApplications(apps){ sessionStorage.setItem('baiApplications',JSON.stringify(apps)); }
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
function validateCreateAccount(type){
  const form=document.querySelector('.registration-card'); clearFormErrors(form);
  const fields=type==='adult' ? [
    ['adultFirstName','Please enter your first name.'],['adultLastName','Please enter your last name.'],['adultGender','Please select your gender.'],['adultDob','Please enter your date of birth.'],['adultCivil','Please select your civil status.'],['adultEmail','Please enter your email address.']
  ] : [
    ['minorFirstName','Please enter your first name.'],['minorLastName','Please enter your last name.'],['minorGender','Please select your gender.'],['minorDob','Please enter your date of birth.'],['guardianEmail','Please enter the guardian email address.']
  ];
  let valid=true;
  fields.forEach(([id,msg])=>{ const field=document.getElementById(id); if(!field || !field.value.trim()){ showFieldError(field,msg); valid=false; } });
  const names=type==='adult'?['adultFirstName','adultLastName']:['minorFirstName','minorLastName'];
  names.forEach(id=>{ const field=document.getElementById(id); if(field && field.value.trim() && !/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(field.value.trim())){ field.closest('.field')?.querySelector('.field-error')?.remove(); showFieldError(field,'Please use letters only for names.'); valid=false; } });
  const emailId=type==='adult'?'adultEmail':'guardianEmail'; const email=document.getElementById(emailId);
  if(email && email.value.trim() && !isValidEmailAddress(email.value)){ email.closest('.field')?.querySelector('.field-error')?.remove(); showFieldError(email,'Please enter a valid email address.'); valid=false; }
  const dob=document.getElementById(type==='adult'?'adultDob':'minorDob');
  if(dob?.value){ const age=calculateAge(dob.value); if(age===null || age<0){ showFieldError(dob,'Please enter a valid date of birth.'); valid=false; } else if(type==='adult' && age<18){ showFieldError(dob,'Adult registration is for users 18 years old or older.'); valid=false; } else if(type==='minor' && age>=18){ showFieldError(dob,'Minor registration is for users under 18 years old.'); valid=false; } }
  const uploadIds=type==='adult' ? [['adultPhoto','Please upload a recent photo.'],['adultGovernmentId','Please upload a valid government ID.']] : [['minorPhoto','Please upload a recent photo.'],['minorSchoolId','Please upload your school ID.'],['minorAffiliationId','Please upload proof of affiliation.']];
  uploadIds.forEach(([id,msg])=>{ if(!validateUpload(id,msg)) valid=false; });
  const agreements=form?Array.from(form.querySelectorAll('.agreement input[type="checkbox"]')):[]; agreements.forEach(cb=>{ if(!cb.checked){ showAgreementError(cb,'Please accept this to continue.'); valid=false; } });
  return valid;
}
function registrationDraftKey(type){ return type==='adult'?'baiAdultDraft':'baiMinorDraft'; }
function saveRegistrationDraft(type){
  const ids=type==='adult'?['adultFirstName','adultLastName','adultGender','adultDob','adultCivil','adultEmail']:['minorFirstName','minorLastName','minorGender','minorDob','guardianEmail'];
  const draft={}; ids.forEach(id=>{const el=document.getElementById(id); if(el) draft[id]=el.value;});
  const form=document.querySelector('.registration-card'); if(form){ draft.agreements=Array.from(form.querySelectorAll('.agreement input[type="checkbox"]')).map(cb=>cb.checked); }
  draft.uploads=(type==='adult'?['adultPhoto','adultGovernmentId']:['minorPhoto','minorSchoolId','minorAffiliationId']).reduce((o,id)=>{if(window.baiUploadFiles[id]?.name)o[id]=window.baiUploadFiles[id].name;return o;},{});
  sessionStorage.setItem(registrationDraftKey(type),JSON.stringify(draft));
}
function restoreRegistrationDraft(type){
  try{ const draft=JSON.parse(sessionStorage.getItem(registrationDraftKey(type))||'{}'); Object.entries(draft).forEach(([id,value])=>{ if(id==='agreements'||id==='uploads') return; const el=document.getElementById(id); if(el&&typeof value==='string')el.value=value; });
    if(Array.isArray(draft.agreements)){ const form=document.querySelector('.registration-card'); Array.from(form?.querySelectorAll('.agreement input[type="checkbox"]')||[]).forEach((cb,i)=>cb.checked=!!draft.agreements[i]); }
    (['adultPhoto','adultGovernmentId','minorPhoto','minorSchoolId','minorAffiliationId']).forEach(id=>{ const input=document.getElementById(id); const name=window.baiUploadFiles[id]?.name; if(input&&name){ let n=input.closest('.upload-box')?.querySelector('.upload-file-name'); if(n)n.textContent=name; input.closest('.upload-box')?.classList.add('has-file'); } });
  }catch(e){}
}
function wireCreateAccountValidation(){
  const form=document.querySelector('.registration-card'); if(!form) return; const type=form.classList.contains('minor-card')?'minor':'adult';
  form.querySelectorAll('input, select').forEach(field=>{ const evt=field.type==='file'?'change':field.type==='checkbox'?'change':(field.tagName==='SELECT'||field.type==='date'?'change':'input'); field.addEventListener(evt,()=>{ const wrapper=field.closest('.field'); if(wrapper&&field.value.trim()) wrapper.classList.remove('invalid'); wrapper?.querySelector('.field-error')?.remove(); if(field.type==='checkbox'){const label=field.closest('.agreement'); if(label&&field.checked){label.classList.remove('invalid');label.querySelector('.field-error')?.remove();}} saveRegistrationDraft(type); }); });
  restoreRegistrationDraft(type); wireUploadInputs(form);
}
function formatPersonName(value){ return value.trim().toLowerCase().split(/(\s+)/).map(part=>/^\s+$/.test(part)?part:(part?part.charAt(0).toUpperCase()+part.slice(1):part)).join(''); }
function createAccount(type){
 const emailField=document.getElementById(type==='adult'?'adultEmail':'guardianEmail'); if(!validateCreateAccount(type)) return;
 const email=emailField.value.trim(); const firstName=document.getElementById(type==='adult'?'adultFirstName':'minorFirstName')?.value.trim()||''; const lastName=document.getElementById(type==='adult'?'adultLastName':'minorLastName')?.value.trim()||'';
 const gender=document.getElementById(type==='adult'?'adultGender':'minorGender')?.value||''; const dob=document.getElementById(type==='adult'?'adultDob':'minorDob')?.value||''; const civilStatus=type==='adult'?(document.getElementById('adultCivil')?.value||''):'';
 const accountName=`${formatPersonName(firstName)} ${formatPersonName(lastName)}`.trim();
 sessionStorage.setItem('baiAccountEmail',email); sessionStorage.setItem('baiAccountName',accountName); sessionStorage.setItem('baiAccountFirstName',formatPersonName(firstName)); sessionStorage.setItem('baiAccountLastName',formatPersonName(lastName)); sessionStorage.setItem('baiAccountGender',gender); sessionStorage.setItem('baiAccountDob',dob); sessionStorage.setItem('baiAccountCivilStatus',civilStatus); sessionStorage.setItem('baiAccountType',type); sessionStorage.setItem('baiAccountId',`BAI-ACC-${Date.now().toString().slice(-8)}`); sessionStorage.setItem('baiRegistrationOtpSent','false');
 go('verify');
}
function startLogin(){
 const email=document.getElementById('loginEmail'); email?.closest('.field')?.querySelector('.field-error')?.remove();
 if(!email||!email.value.trim()){ showFieldError(email,'Please enter your email address.'); return; }
 if(!isValidEmailAddress(email.value)){ showFieldError(email,'Please enter a valid email address.'); return; }
 if(!accountExists(email.value)){ showFieldError(email,'No MyBAI account was found with this email address. Please create an account first.'); return; }
 email.closest('.field')?.classList.remove('invalid');
 sessionStorage.setItem('baiPendingLoginEmail',email.value.trim()); sessionStorage.setItem('baiLoginOtpSent','false');
 go('login-verify');
}
function getActiveApplication(){
 const apps=getApplications();
 return apps.find(a=>!['COMPLETED','CANCELLED'].includes(String(a.status||'').toUpperCase())) || null;
}
function hasActiveApplication(){
 return !!getActiveApplication();
}
function newApplication(){
 const name=esc(accountName()); const dob=esc(formatDisplayDate(sessionStorage.getItem('baiAccountDob')||'')); const gender=esc(sessionStorage.getItem('baiAccountGender')||''); const email=esc(accountEmail());
 return `<div class="auth-screen terminal-auth"><div class="auth-card compact new-application-card"><button class="auth-back auth-back-form" onclick="go('dashboard')" aria-label="Back to dashboard">← Back</button>${authBrand()}<div class="message-screen"><h1>NEW PASSPORT APPLICATION</h1><p>Review your account information before submitting a new passport application.</p><div class="application-review"><div><span>Full Name</span><b>${name}</b></div><div><span>Date of Birth</span><b>${dob}</b></div><div><span>Gender</span><b>${gender}</b></div><div><span>Email Address</span><b>${email}</b></div></div><div class="field" style="width:100%;text-align:left"><label>DFA Consular Office / Site</label><select id="newApplicationLocation"><option value="" selected disabled>Choose a DFA Consular Office / Site</option><option value="DFA Office of Consular Affairs - Aseana, Parañaque">DFA Office of Consular Affairs - Aseana, Parañaque</option><option value="DFA Consular Office NCR Central - Pasig">DFA Consular Office NCR Central - Pasig</option><option value="DFA Consular Office NCR East - Mandaluyong">DFA Consular Office NCR East - Mandaluyong</option><option value="DFA Consular Office NCR North - Quezon City">DFA Consular Office NCR North - Quezon City</option><option value="DFA Consular Office NCR Northeast - Quezon City">DFA Consular Office NCR Northeast - Quezon City</option><option value="DFA Consular Office NCR South - Muntinlupa">DFA Consular Office NCR South - Muntinlupa</option><option value="DFA Consular Office NCR West - Manila">DFA Consular Office NCR West - Manila</option></select></div><button class="primary" onclick="submitNewApplication()">Submit New Passport Application</button></div></div></div>`;
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
 return `<div class="auth-screen terminal-auth"><div class="auth-card compact">${authBrand()}<div class="message-screen">
   <h1>LINK YOUR PASSPORT APPLICATION</h1><p>Enter the reference information provided by the DFA<br>to connect your passport application to your MyBAI account.</p>
   <div class="field" style="width:100%;text-align:left"><label>DFA Appointment Reference No. (ARN)</label><input id="dfaArn" placeholder="Enter your ARN"></div>
   <div class="field" style="width:100%;text-align:left;margin-top:12px"><label>Application Type</label><select id="linkApplicationType"><option value="New Passport">New Passport</option><option value="Passport Renewal">Passport Renewal</option></select></div>
   <button class="primary" style="margin-top:18px" onclick="linkPassportApplication()">LINK APPLICATION</button>
   <button class="link-btn" style="margin-top:14px" onclick="go('status')">← Back to Check Status</button>
 </div></div></div>`;
}

function linkPassportApplication(){
 const arn=document.getElementById('dfaArn'), type=document.getElementById('linkApplicationType'); if(!arn||!type) return;
 const value=arn.value.trim(); if(!value){ alert('Please enter your DFA Appointment Reference No. (ARN).'); return; }
 if(!/^[A-Za-z0-9-]+$/.test(value)){ alert('Please enter a valid DFA Appointment Reference No. (ARN).'); return; }
 const apps=getApplications(); if(apps.some(a=>String(a.arn||'').toLowerCase()===value.toLowerCase())){ alert('This DFA Appointment Reference No. is already linked.'); return; }
 const active=getActiveApplication();
 if(active){
   sessionStorage.setItem('baiCurrentApplicationId',active.id);
   alert(`You already have an active ${active.type} application. You can only have one active passport application at a time. Please check your existing application status before linking another application.`);
   go('status');
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
function complaint(){
 const loggedIn = sessionStorage.getItem('baiLoggedIn') === 'true';
 const accountEmail = sessionStorage.getItem('baiAccountEmail') || '';
 sessionStorage.setItem('baiComplaintReturn', loggedIn ? 'dashboard' : 'login');
 return `<div class="complaint-bg"><div class="complaint-card">
   <div class="complaint-header">
     <h1>Complaint Form</h1>
     <p>Having problems? Write a complaint and we will help you</p>
   </div>
   <form onsubmit="submitComplaint(event)">
     <div class="field"><label for="complaintEmail">Email Address</label><input id="complaintEmail" type="email" value="${esc(accountEmail)}" ${loggedIn ? 'readonly' : ''} required placeholder="Enter your email address"></div>
     <div class="field"><label for="complaintType">Complaint Type</label>
       <select id="complaintType" required>
         <option value="">Select a complaint type</option>
         <option>Flight Operations & Departure Services</option>
         <option>Baggage Services</option>
         <option>Security & Immigration (TSA/Border Control)</option>
         <option>Facility & Cleanliness</option>
         <option>Airport Staff & Customer Service</option>
         <option>Accessibility & Mobility Services (PRM)</option>
       </select>
     </div>
     <div class="field"><label for="complaintBody">Body</label><textarea id="complaintBody" required placeholder="Describe your concern..."></textarea></div>
     <button class="primary complaint-submit" type="submit">Submit</button>
   </form>
 </div></div>`;
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

function complaintDone(){
 const returnPage = sessionStorage.getItem('baiComplaintReturn') === 'dashboard' &&
                    sessionStorage.getItem('baiLoggedIn') === 'true' ? 'dashboard' : 'login';
 const returnLabel = returnPage === 'dashboard' ? 'Return to Dashboard' : 'Return to Login';
 return `<div class="complaint-bg"><div class="complaint-card complaint-success-card">
   <div class="complaint-success">
     <h1>Complaint Form</h1>
     <p>Thankyou for your feedback, we will try to reach<br>out to your email as soon as we can</p>
     <button class="primary" onclick="go('${returnPage}')">${returnLabel}</button>
   </div>
 </div></div>`;
}

function dashboard(){
 const apps=getApplications(), current=apps.length?getCurrentApplication():null;
 return `<div class="dashboard">
   <aside class="sidebar"><div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><nav class="nav">
     <button class="active" onclick="go('dashboard')">⌂ &nbsp;Dashboard</button><button onclick="go('profile')">● &nbsp;My Profile</button><button onclick="go('status')">⌕ &nbsp;Check Status</button><button onclick="go('settings')">Settings</button>
   </nav><div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('help-center')">Contact Support</button></div></aside>
   <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions">
     <button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="badge">3</span></button>
     <span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span>
     <div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)" aria-expanded="false"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile'); closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div>
   </div></header>
   <main class="content"><section class="hero"><h2>Fly with Pride,<br>Connect the World.</h2><p>BAI - Where Pride Takes Flight.</p></section>
   <div class="cards">
    <section class="panel"><h3>Recent Updates</h3>${current?`<div class="update"><span class="dot blue">i</span><span>${esc(current.type)} is currently ${esc(statusLabel(current.status).toLowerCase())}.<small style="display:block">Application ID: ${esc(current.id)}</small></span><time>Latest update<br>Today</time></div><div class="update"><span class="dot blue">i</span><span>${current.arn&&current.arn!=='Pending'?'Your DFA reference information is linked to this application.':'Your application record has been created and is ready for tracking.'}<small style="display:block">ARN: ${esc(current.arn||'Pending')}</small></span><time>Latest update<br>Today</time></div>`:`<div class="update"><span class="dot blue">i</span><span>Your MyBAI account is ready. No passport application is currently linked.<small style="display:block">You can start a new application or link an existing one.</small></span><time>Today</time></div>`}</section>
    <section class="panel"><h3>PASSPORT OVERVIEW</h3>${current?`<div class="passport"><strong>Application</strong><div class="name">${esc(current.type)}</div><strong>Application ID</strong><div class="id">${esc(current.id)}</div><div class="map">⌁</div></div><div class="trip"><div class="trip-head"><span>Application Status</span><span onclick="go('status')" style="cursor:pointer">View details</span></div><div class="route"><span>${esc(statusLabel(current.status))}</span></div><div class="trip-meta">DFA ARN <b>${esc(current.arn||'Pending')}</b><span class="status">ACTIVE</span></div></div>`:`<div class="passport"><strong>MyBAI Account</strong><div class="name">${esc(accountName())}</div><div class="map">⌁</div></div><div class="trip"><div class="trip-head"><span>No Passport Application Linked</span><span onclick="go('status')" style="cursor:pointer">Check Status</span></div><div class="route"><span>Start or link an application when you are ready.</span></div><div class="trip-meta">Your account can have multiple passport applications.</div></div>`}</section>
   </div>
   <section class="panel services-panel"><h3>PASSPORT SERVICES</h3><div class="service-actions"><button class="primary" onclick="go('new-application')">Apply for New Passport</button><button class="primary" onclick="go('renewal-form')">Renew Passport</button><button class="primary" onclick="go('replacement-form')">Replace Lost Passport</button><button class="link-btn service-link" onclick="go('link-application')">Link Existing Passport Application</button></div></section>
   </main><footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer>
 </div>`;
}

function status(){
 const apps=getApplications(); const current=apps.length?getCurrentApplication():null;
 const list=apps.map(a=>`<div class="application-list-item ${current&&a.id===current.id?'selected':''}"><div><span class="status-label">${esc(a.type)}</span><h3>${esc(a.id)}</h3><small>${esc(statusLabel(a.status))}</small></div><button class="primary" onclick="viewApplication('${esc(a.id)}')">View Status</button></div>`).join('');
 return `<div class="dashboard"><aside class="sidebar"><div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div><nav class="nav"><button onclick="go('dashboard')">⌂ &nbsp;Dashboard</button><button onclick="go('profile')">● &nbsp;My Profile</button><button class="active" onclick="go('status')">⌕ &nbsp;Check Status</button><button onclick="go('settings')">Settings</button></nav><div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('help-center')">Contact Support</button></div></aside>
 <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions"><button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="badge">3</span></button><span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span><div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile');closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div></div></header>
 <main class="content"><div class="page-panel status-panel"><h2>Check Passport Application Status</h2><p class="status-intro">Select a passport application to view its current status and reference information.</p>
 ${apps.length?`<div class="application-list">${list}</div>`:`<div class="empty-status"><h3>No Passport Application Linked</h3><p>Your MyBAI account is ready, but there is no passport application linked yet.</p><div class="status-empty-actions"><button class="primary" onclick="go('new-application')">Apply for New Passport</button><button class="primary" onclick="go('link-application')">Link Existing Application</button></div></div>`}
 ${current?`<div id="statusResult" class="status-result visible"><div class="status-result-head"><div><span class="status-label">PASSPORT APPLICATION</span><h3>Application Details</h3></div><span class="current-status">${esc(statusLabel(current.status))}</span></div><div class="reference-grid"><div><span>Application Type</span><b>${esc(current.type)}</b></div><div><span>BAI Application ID</span><b>${esc(current.id)}</b></div><div><span>Appointment Reference No. (ARN)</span><b>${esc(current.arn||'Not linked')}</b></div><div><span>Payment Reference</span><b>${esc(current.payment||'Not linked')}</b></div><div><span>eReceipt No.</span><b>${esc(current.eReceipt||'Not linked')}</b></div></div><div class="status-timeline">${buildTimeline(current.status)}</div><p class="status-note">Your application references are associated with this passport application record.</p></div>`:''}
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
 <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions"><button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="badge">3</span></button><span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span><div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile');closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div></div></header>
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
         <span class="badge">3</span>
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
       <button class="profile-back" onclick="go('profile')">← Back to My Profile</button>
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
 sessionStorage.setItem('baiPendingNewEmail',value);
 sessionStorage.setItem('baiEmailChangeOtp',String(Math.floor(1000000 + Math.random()*9000000)));
 sessionStorage.setItem('baiEmailChangeOtpSent','true');
 sessionStorage.setItem('baiEmailChangeOtpSentAt',String(Date.now()));
 render();
}
function verifyEmailChange(){
 if(!validateOtp('emailChangeOtp')) return;
 const newEmail=sessionStorage.getItem('baiPendingNewEmail')||'';
 if(!isValidEmailAddress(newEmail)) return;
 const oldEmail=sessionStorage.getItem('baiAccountEmail')||'';
 sessionStorage.setItem('baiAccountEmail',newEmail);
 const apps=getApplications().map(a=>({...a,email:newEmail,contactEmail:newEmail}));
 saveApplications(apps);
 sessionStorage.setItem('baiEmailChangeSuccess','true');
 sessionStorage.removeItem('baiPendingNewEmail');
 sessionStorage.removeItem('baiEmailChangeOtp');
 sessionStorage.removeItem('baiEmailChangeOtpSent');
 sessionStorage.removeItem('baiEmailChangeOtpSentAt');
 go('profile');
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
function loginUser(){
  if(!validateOtp('loginOtp')) return;
  const pending=sessionStorage.getItem('baiPendingLoginEmail');
  if(pending && !sessionStorage.getItem('baiAccountEmail')) sessionStorage.setItem('baiAccountEmail',pending);
  sessionStorage.setItem('baiLoggedIn','true');
  sessionStorage.removeItem('baiLoginOtpSent');
  sessionStorage.removeItem('baiLoginOtp');
  sessionStorage.removeItem('baiLoginOtpSentAt');
  sessionStorage.removeItem('baiComplaintReturn');
  go('dashboard');
}
function logout(){
  closeUserMenu();
  sessionStorage.removeItem('baiLoggedIn');
  sessionStorage.removeItem('baiComplaintReturn');
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
 <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions"><button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="badge">3</span></button><span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span><div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile');closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div></div></header>
 <main class="content"><div class="page-panel settings-panel"><h2>Settings</h2>
 <section class="settings-section"><h3>Notifications</h3><label class="settings-row"><span><b>Application Status Updates</b><small>Receive updates when your passport application status changes.</small></span><input class="settings-toggle" type="checkbox" ${setting('statusUpdates',true)?'checked':''} aria-label="Application Status Updates" onchange="saveSetting('statusUpdates',this.checked)"></label><label class="settings-row"><span><b>Email Notifications</b><small>Receive important MyBAI notifications by email.</small></span><input class="settings-toggle" type="checkbox" ${setting('emailNotifications',true)?'checked':''} aria-label="Email Notifications" onchange="saveSetting('emailNotifications',this.checked)"></label></section>
 <section class="settings-section"><h3>Account Security</h3><button class="settings-action" onclick="go('change-email')"><span><b>Change Email Address</b><small>Update the email used to sign in and receive OTPs.</small></span><span class="settings-arrow">›</span></button><button class="settings-action" onclick="logout()"><span><b>Sign Out</b><small>Sign out of your current MyBAI session.</small></span><span class="settings-arrow">›</span></button></section>
 <section class="settings-section"><h3>Privacy</h3><button class="settings-action" onclick="alert('Privacy Policy')"><span><b>Privacy Policy</b><small>Review how your personal information is handled.</small></span><span class="settings-arrow">›</span></button></section>
 <section class="settings-section danger-section"><h3>Account</h3><button class="settings-action danger" onclick="deleteAccount()"><span><b>Delete Account</b><small>This will remove your MyBAI account and linked applications from this demo.</small></span><span class="settings-arrow">›</span></button></section>
 </div></main><footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer></div>`;
}

function deleteAccount(){
 if(!confirm('Are you sure you want to delete your MyBAI account?')) return;
 Object.keys(sessionStorage).filter(k=>k.startsWith('bai')).forEach(k=>sessionStorage.removeItem(k));
 Object.keys(localStorage).filter(k=>k.startsWith('baiSetting_')).forEach(k=>localStorage.removeItem(k));
 window.baiUploadFiles={};
 go('login');
}

function render(){
 const page=(location.hash||'#login').slice(1);
 const pages={login,'login-verify':loginVerify,signup,'adult-register':adultRegister,'minor-register':minorRegister,'renewal-form':renewalForm,'renewal-continue':renewalContinue,'replacement-form':lostPassportReplacement,'replacement-continue':replacementContinue,verify,created,'new-application':newApplication,'link-application':linkApplication,'application-linked':applicationLinked,complaint,'complaint-done':complaintDone,dashboard,profile,'change-email':changeEmail,status,settings};
 const protectedPages=new Set(['dashboard','profile','status','settings','change-email','renewal-form','renewal-continue','replacement-form','replacement-continue','new-application','link-application','application-linked']);
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
}
window.addEventListener('hashchange',render);
render();

/* =========================
   MODULE 2: HELP CENTER + ENQUIRY SYSTEM
   Front-end prototype storage uses localStorage for support data so records persist
   across member logout/login and consumed by the separate BAI Personnel Portal application.
   ========================= */

const HELP_KB_KEY = 'baiHelpKnowledgeBase';
const HELP_ENQUIRIES_KEY = 'baiHelpEnquiries';
const HELP_CONVERSATIONS_KEY = 'baiHelpConversations';
const HELP_NOTIFICATION_KEY = 'baiHelpNotifications';

function nowIso(){ return new Date().toISOString(); }
function uid(prefix='ID'){ return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }
function memberId(){ return sessionStorage.getItem('baiAccountId') || `EMAIL-${(accountEmail()||'member').toLowerCase()}`; }
function memberDisplayName(){ return accountName(); }
function jsonGet(key,fallback){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch(e){ return fallback; } }
function jsonSet(key,value){ localStorage.setItem(key,JSON.stringify(value)); }
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
  if(Array.isArray(existing) && existing.length) return existing;
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
function getHelpEnquiries(){ return jsonGet(HELP_ENQUIRIES_KEY,[]); }
function saveHelpEnquiries(items){ jsonSet(HELP_ENQUIRIES_KEY,items); }
function getHelpConversations(){ return jsonGet(HELP_CONVERSATIONS_KEY,[]); }
function saveHelpConversations(items){ jsonSet(HELP_CONVERSATIONS_KEY,items); }
function getHelpNotifications(){ return jsonGet(HELP_NOTIFICATION_KEY,[]); }
function saveHelpNotifications(items){ jsonSet(HELP_NOTIFICATION_KEY,items); }
function addHelpNotification(email,message,enquiryId){
  const items=getHelpNotifications();
  items.push({id:uid('NTF'),email:String(email||'').toLowerCase(),message,enquiryId,createdAt:nowIso(),read:false});
  saveHelpNotifications(items);
}
function memberNotifications(){
  const email=accountEmail().toLowerCase();
  return getHelpNotifications().filter(n=>n.email===email);
}
function markMemberNotificationsRead(){
  const email=accountEmail().toLowerCase();
  if(!email) return;
  const items=getHelpNotifications().map(n=>n.email===email?{...n,read:true}:n);
  saveHelpNotifications(items);
}
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
 <header class="topbar"><div class="welcome">Good Day, ${esc(accountName())}!<small>Welcome Back to BAI!</small></div><div class="top-actions"><button class="notification-btn" aria-label="Notifications" onclick="showMemberNotifications()"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13a8 8 0 0 1 16 0v7l3 3H5l3-3v-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 26c.7 1.3 1.7 2 3 2s2.3-.7 3-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${unread?`<span class="badge">${Math.min(unread,9)}</span>`:`<span class="badge">3</span>`}</button><span class="profile-avatar" aria-label="User profile"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5" fill="white"/><path d="M7 27c.7-5.3 4-8 9-8s8.3 2.7 9 8" fill="white"/></svg></span><div class="user-menu" id="userMenu"><button class="user-menu-toggle" onclick="toggleUserMenu(event)"><span>${esc(accountName())}</span><span class="chevron">⌄</span></button><div class="user-dropdown"><button onclick="go('profile');closeUserMenu()">My Profile</button><button class="logout" onclick="logout()">Logout</button></div></div></div></header>
 <main class="content">${inner}</main><footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer></div>`;
}

function helpCenter(){
  markMemberNotificationsRead();
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
  const body=`<div class="page-panel help-articles-panel"><div class="subpage-top"><button class="link-btn" onclick="go('help-center')">← Back to Help Center</button><h2>Knowledge Base</h2><p>Searchable information used by the Help Center and AI Assistant.</p></div><div class="article-list large-list">${articles.map(articleListItem).join('')}</div></div>`;
  return go('knowledge-base');
}
function knowledgeBase(){
  const articles=getKnowledgeBase().filter(a=>a.type!=='advisory');
  return memberShell(`<div class="page-panel help-articles-panel"><div class="subpage-top"><button class="link-btn" onclick="go('help-center')">← Back to Help Center</button><h2>Knowledge Base</h2><p>Browse the information available to the Help Center and AI Assistant.</p></div><div class="article-list large-list">${articles.map(articleListItem).join('')}</div></div>`,'help');
}
function openArticle(id){ goQuery('knowledge-article',{id}); }
function knowledgeArticle(){
  const id=parseRouteHash().params.get('id'); const article=getKnowledgeBase().find(a=>a.id===id);
  if(!article) return memberShell(`<div class="page-panel"><h2>Article Not Found</h2><p>The requested Knowledge Base article could not be found.</p><button class="primary" onclick="go('help-center')">Back to Help Center</button></div>`,'help');
  return memberShell(`<div class="page-panel article-view-panel"><div class="subpage-top"><button class="link-btn" onclick="go('help-center')">← Back to Help Center</button><span class="article-type article-view-type">${esc(articleTypeLabel(article.type))}</span><h2>${esc(article.title)}</h2><div class="article-meta">${esc(article.category)} · Updated ${formatDateTime(article.updatedAt)}</div></div><div class="article-body">${esc(article.body)}</div><div class="article-actions"><button class="primary" onclick="go('ai-chat')">Ask AI about this</button><button class="secondary-action" onclick="go('enquiry-form')">Still need help?</button></div></div>`,'help');
}

function aiChat(){
  const conv=ensureAiConversation();
  const messages=conv.messages||[];
  return memberShell(`<div class="page-panel ai-chat-panel"><div class="subpage-top ai-chat-head"><div><button class="link-btn" onclick="go('help-center')">← Back to Help Center</button><h2>AI Assistant</h2><p>The assistant searches the BAI Knowledge Base first and only answers from published information.</p></div><button class="secondary-action" onclick="newAiChat()">New Chat</button></div><div class="ai-chat-layout"><div class="ai-chat-window" id="aiChatWindow">${messages.length?messages.map(aiMessageHtml).join(''):`<div class="chat-empty"><b>How can I help?</b><span>Ask about passport applications, renewal, lost passports, documents, payment, appointments, or account OTP.</span><div class="suggested-prompts"><button onclick="useAiPrompt(this.textContent)">What are the requirements for renewal?</button><button onclick="useAiPrompt(this.textContent)">How do I check my application status?</button><button onclick="useAiPrompt(this.textContent)">I lost my passport. What should I do?</button></div></div>`}</div><form class="ai-composer" onsubmit="sendAiMessage(event)"><input id="aiMessageInput" autocomplete="off" placeholder="Type your question..." required><button class="primary" type="submit">Send</button></form></div></div>`,'help');
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
  if(article && article.score>=0.32){
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
function enquiryForm(){
  const pendingId=sessionStorage.getItem('baiHelpPendingConversationId');
  const conv=pendingId?getHelpConversations().find(c=>c.id===pendingId && c.memberEmail===accountEmail()):null;
  const transcript=conv?.messages||[];
  const defaultCategory='';
  const defaultDescription=transcript.filter(m=>m.sender==='member').at(-1)?.text||'';
  return memberShell(`<div class="page-panel enquiry-form-panel"><div class="subpage-top"><button class="link-btn" onclick="go('${conv?'ai-chat':'help-center'}')">← Back</button><h2>Submit an Enquiry</h2><p>${conv?'Your AI Assistant conversation will be included so support personnel can see what you already asked.':'Send your question directly to a support personnel.'}</p></div><form class="enquiry-form" onsubmit="submitEnquiry(event)"><div class="form-grid enquiry-grid"><div class="field"><label for="enquiryEmail">Email Address</label><input id="enquiryEmail" value="${esc(accountEmail())}" readonly></div><div class="field"><label for="enquiryCategory">Enquiry Type</label><select id="enquiryCategory" required>${supportCategoryOptions(defaultCategory)}</select></div><div class="field full"><label for="enquiryApplication">Related Application (optional)</label><select id="enquiryApplication">${relatedApplicationOptions('')}</select><small class="field-help">Select an application only when your question is about a specific passport application.</small></div><div class="field full"><label for="enquiryBody">Message</label><textarea id="enquiryBody" required placeholder="Describe your enquiry...">${esc(defaultDescription)}</textarea></div><div class="field full"><label for="enquiryAttachment">Attachment (optional)</label><input id="enquiryAttachment" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onchange="validateEnquiryAttachment(this)"><small class="field-help">Optional PNG, JPG, WEBP, or PDF up to 5 MB.</small><div id="enquiryAttachmentError"></div></div></div>${conv?`<div class="chat-context"><div class="chat-context-head"><b>AI Chat Transcript</b><span>${transcript.length} message${transcript.length===1?'':'s'}</span></div><div class="chat-transcript">${transcript.map(m=>`<div><b>${m.sender==='member'?'You':'AI'}:</b> ${esc(m.text)}</div>`).join('')}</div></div>`:''}<div class="enquiry-actions"><button class="secondary-action" type="button" onclick="go('${conv?'ai-chat':'help-center'}')">Cancel</button><button class="primary" type="submit">Submit Enquiry</button></div></form></div>`,'help');
}
function validateEnquiryAttachment(input){
  const host=document.getElementById('enquiryAttachmentError'); if(!host)return true; host.innerHTML=''; const f=input?.files?.[0]; if(!f)return true;
  const allowed=['image/png','image/jpeg','image/webp','application/pdf']; const max=5*1024*1024;
  if(!allowed.includes(f.type)){ host.innerHTML=`<div class="field-error">Please upload a PNG, JPG, WEBP, or PDF file.</div>`; input.value=''; return false; }
  if(f.size>max){ host.innerHTML=`<div class="field-error">Attachment must be 5 MB or smaller.</div>`; input.value=''; return false; }
  return true;
}
function submitEnquiry(event){
  event.preventDefault();
  const email=document.getElementById('enquiryEmail'); const category=document.getElementById('enquiryCategory'); const body=document.getElementById('enquiryBody'); const related=document.getElementById('enquiryApplication'); const file=document.getElementById('enquiryAttachment');
  if(!isValidEmailAddress(email?.value)){ showFieldError(email,'Please enter a valid email address.'); return; }
  if(!category?.value){ showFieldError(category,'Please select an enquiry type.'); return; }
  if(!body?.value.trim()){ showFieldError(body,'Please describe your enquiry before submitting.'); return; }
  if(file && file.files?.length && !validateEnquiryAttachment(file)) return;
  const pendingId=sessionStorage.getItem('baiHelpPendingConversationId');
  const conv=pendingId?getHelpConversations().find(c=>c.id===pendingId && c.memberEmail===accountEmail()):null;
  const enquiryId=createEnquiryId();
  const attachment=file?.files?.[0]?{name:file.files[0].name,type:file.files[0].type,size:file.files[0].size}:null;
  const enquiry={id:enquiryId,memberId:memberId(),memberEmail:accountEmail(),memberName:memberDisplayName(),applicationId:related?.value||'',applicationSnapshot:related?{...related}:null,category:category.value,description:body.value.trim(),attachment,chatConversationId:conv?.id||'',chatTranscript:conv?.messages||[],escalationFlag:!!conv,escalatedAt:conv?nowIso():'',personnelId:'',status:conv?'Escalated':'Pending',messages:[{id:uid('MSG'),senderType:'member',senderId:memberId(),senderName:memberDisplayName(),text:body.value.trim(),createdAt:nowIso()}],createdAt:nowIso(),updatedAt:nowIso()};
  const all=getHelpEnquiries(); all.push(enquiry); saveHelpEnquiries(all);
  if(conv) updateAiConversation(conv.id,c=>({...c,status:'Escalated',enquiryId}));
  sessionStorage.removeItem('baiHelpPendingConversationId'); sessionStorage.setItem('baiLastEnquiryId',enquiryId);
  go('enquiry-submitted');
}
function enquirySubmitted(){
  const id=sessionStorage.getItem('baiLastEnquiryId'); const e=id?getEnquiryById(id):null;
  return memberShell(`<div class="page-panel enquiry-success-panel"><div class="success-icon">✓</div><h2>Enquiry Submitted</h2><p>Your enquiry has been submitted successfully and a unique Enquiry ID has been created.</p>${e?`<div class="enquiry-success-meta"><div><span>Enquiry ID</span><b>${esc(e.id)}</b></div><div><span>Status</span><b>${esc(e.status)}</b></div><div><span>Enquiry Type</span><b>${esc(e.category)}</b></div></div>`:''}<div class="enquiry-actions centered"><button class="primary" onclick="go('enquiries')">View My Enquiries</button><button class="secondary-action" onclick="go('help-center')">Back to Help Center</button></div></div>`,'help');
}
function enquiries(){
  const list=visibleMemberEnquiries().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  markMemberNotificationsRead();
  return memberShell(`<div class="page-panel enquiries-panel"><div class="subpage-top"><button class="link-btn" onclick="go('help-center')">← Back to Help Center</button><h2>My Enquiries</h2><p>View your enquiry history and replies from support personnel.</p></div>${list.length?`<div class="enquiry-list">${list.map(enquiryListItem).join('')}</div>`:`<div class="empty-status"><h3>No enquiries yet</h3><p>You have not submitted any formal enquiries.</p><button class="primary" onclick="go('enquiry-form')">Submit an Enquiry</button></div>`}</div>`,'help');
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
  return memberShell(`<div class="page-panel enquiry-view-panel"><div class="subpage-top"><button class="link-btn" onclick="go('enquiries')">← Back to My Enquiries</button><div class="enquiry-view-title"><div><span id="memberEnquiryStatus" class="status-pill ${statusClass(e.status)}">${esc(e.status)}</span><h2>${esc(e.id)}</h2><p>${esc(e.category)}</p></div>${e.escalationFlag?'<span class="escalation-badge">Escalated from AI Assistant</span>':''}</div></div><div class="enquiry-detail-grid"><div><span>Email Address</span><b>${esc(e.memberEmail)}</b></div><div><span>Related Application</span><b>${esc(app?`${app.type} — ${app.id}`:'None')}</b></div><div><span>Created</span><b>${formatDateTime(e.createdAt)}</b></div><div><span>Last Updated</span><b id="memberEnquiryUpdated">${formatDateTime(e.updatedAt)}</b></div></div>${e.chatTranscript?.length?`<div class="chat-context"><div class="chat-context-head"><b>Original AI Chat</b><span>${e.chatTranscript.length} messages</span></div><div class="chat-transcript">${e.chatTranscript.map(m=>`<div><b>${m.sender==='member'?'You':'AI'}:</b> ${esc(m.text)}</div>`).join('')}</div></div>`:''}<div class="thread-header"><h3>Conversation</h3><span id="memberEnquiryMessageCount">${e.messages?.length||0} message${(e.messages?.length||0)===1?'':'s'}</span></div><div class="enquiry-thread" id="memberEnquiryThread">${(e.messages||[]).map(enquiryMessageHtml).join('')}</div><div id="memberEnquiryReplyHost">${canReply?`<form class="enquiry-member-reply" onsubmit="sendMemberEnquiryReply(event,'${esc(e.id)}')"><div class="field"><label for="memberReplyText">Reply to Support Personnel</label><textarea id="memberReplyText" required placeholder="Write your reply..."></textarea><small class="field-help">Your reply will reopen the enquiry for further assistance.</small><div id="memberReplyError"></div></div><div class="enquiry-actions"><button class="primary" type="submit">Send Reply</button></div></form>`:''}</div><div class="enquiry-view-actions" id="memberEnquiryViewActions">${actions}<button class="secondary-action" onclick="go('help-center')">Help Center</button></div></div>`,'help');
}
function enquiryMessageHtml(m){ return `<div class="thread-message ${m.senderType==='member'?'member-message':'personnel-message'}"><div><b>${esc(m.senderName||m.senderType)}</b><small>${formatDateTime(m.createdAt)}</small></div><p>${esc(m.text).replace(/\n/g,'<br>')}</p></div>`; }
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
  e.messages.push({id:uid('MSG'),senderType:'member',senderId:memberId(),senderName:memberDisplayName(),text,createdAt:nowIso()});
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
  if(thread) thread.innerHTML=(e.messages||[]).map(enquiryMessageHtml).join('');
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
function showMemberNotifications(){
  const notes=memberNotifications().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(!notes.length){ alert('You have 3 notifications.'); return; }
  const unread=notes.filter(n=>!n.read).length;
  markMemberNotificationsRead();
  const lines=notes.slice(0,5).map(n=>`• ${n.message}`).join('\n');
  alert(`You have 3 notifications.${unread?`\n\n${unread} new support notification${unread===1?'':'s'}:`:''}\n${lines}`);
}

/* Keep the legacy complaint route as a compatibility alias for old hashes/bookmarks. */
function complaint(){ return helpCenter(); }
function complaintDone(){ return enquirySubmitted(); }

/* Keep the account data and Help Desk records consistent when an email changes. */
function verifyEmailChange(){
  if(!validateOtp('emailChangeOtp')) return;
  const newEmail=sessionStorage.getItem('baiPendingNewEmail')||''; if(!isValidEmailAddress(newEmail)) return;
  sessionStorage.setItem('baiAccountEmail',newEmail); saveApplications(getApplications().map(a=>({...a,email:newEmail,contactEmail:newEmail})));
  const oldEmail=accountEmail();
  const oldLower=String(oldEmail||'').toLowerCase(); const newLower=newEmail.toLowerCase();
  if(oldLower!==newLower){
    const enquiries=getHelpEnquiries().map(e=>String(e.memberEmail||'').toLowerCase()===oldLower?{...e,memberEmail:newEmail}:e); saveHelpEnquiries(enquiries);
    const convs=getHelpConversations().map(c=>String(c.memberEmail||'').toLowerCase()===oldLower?{...c,memberEmail:newEmail}:c); saveHelpConversations(convs);
    const notes=getHelpNotifications().map(n=>String(n.email||'').toLowerCase()===oldLower?{...n,email:newEmail}:n); saveHelpNotifications(notes);
  }
  sessionStorage.setItem('baiEmailChangeSuccess','true'); sessionStorage.removeItem('baiPendingNewEmail'); sessionStorage.removeItem('baiEmailChangeOtp'); sessionStorage.removeItem('baiEmailChangeOtpSent'); sessionStorage.removeItem('baiEmailChangeOtpSentAt'); go('profile');
}

/* Extend account deletion so support records belonging to the member are removed from the prototype store. */
function deleteAccount(){
  if(!confirm('Are you sure you want to delete your MyBAI account?')) return;
  const email=accountEmail().toLowerCase();
  saveHelpEnquiries(getHelpEnquiries().filter(e=>String(e.memberEmail||'').toLowerCase()!==email));
  saveHelpConversations(getHelpConversations().filter(c=>String(c.memberEmail||'').toLowerCase()!==email));
  saveHelpNotifications(getHelpNotifications().filter(n=>String(n.email||'').toLowerCase()!==email));
  Object.keys(sessionStorage).filter(k=>k.startsWith('bai')).forEach(k=>sessionStorage.removeItem(k));
  Object.keys(localStorage).filter(k=>k.startsWith('baiSetting_')).forEach(k=>localStorage.removeItem(k));
  window.baiUploadFiles={};
  go('login');
}

/* New render registry with Module 2 routes. */
function render(){
  stopEnquiryRealtime();
  const {page}=parseRouteHash();
  const pages={login,'login-verify':loginVerify,signup,'adult-register':adultRegister,'minor-register':minorRegister,'renewal-form':renewalForm,'renewal-continue':renewalContinue,'replacement-form':lostPassportReplacement,'replacement-continue':replacementContinue,verify,created,'new-application':newApplication,'link-application':linkApplication,'application-linked':applicationLinked,complaint, 'complaint-done':complaintDone, dashboard, profile, 'change-email':changeEmail, status, settings,
    'help-center':helpCenter,'knowledge-base':knowledgeBase,'knowledge-article':knowledgeArticle,'ai-chat':aiChat,'enquiry-form':enquiryForm,'enquiry-submitted':enquirySubmitted,enquiries,'enquiry-view':enquiryView};
  const protectedPages=new Set(['dashboard','profile','status','settings','change-email','renewal-form','renewal-continue','replacement-form','replacement-continue','new-application','link-application','application-linked','help-center','knowledge-base','knowledge-article','ai-chat','enquiry-form','enquiry-submitted','enquiries','enquiry-view','complaint','complaint-done']);
  if(protectedPages.has(page) && sessionStorage.getItem('baiLoggedIn')!=='true'){ location.hash='login'; return; }
  const pageFn=pages[page]||login;
  app.innerHTML=pageFn()||'';
  if(page==='adult-register'||page==='minor-register') wireCreateAccountValidation();
  if(page==='renewal-form'||page==='replacement-form') wireUploadInputs(document.querySelector('.renewal-card'));
  if(page==='verify'&&sessionStorage.getItem('baiRegistrationOtpSent')==='true') startOtpCooldown('registration');
  if(page==='login-verify'&&sessionStorage.getItem('baiLoginOtpSent')==='true') startOtpCooldown('login');
  if(page==='change-email'&&sessionStorage.getItem('baiEmailChangeOtpSent')==='true') startEmailChangeCooldown();
  if(page==='enquiry-form') wireEnquiryLiveValidation();
  startEnquiryRealtime(page);
}
function wireEnquiryLiveValidation(){
  const fields=['enquiryEmail','enquiryCategory','enquiryBody']; fields.forEach(id=>{ const el=document.getElementById(id); if(!el)return; const event=el.tagName==='SELECT'?'change':'input'; el.addEventListener(event,()=>{ const w=el.closest('.field'); w?.classList.remove('invalid'); w?.querySelector('.field-error')?.remove(); }); });
}

window.addEventListener('hashchange',render);
render();

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
  const newEmail=(sessionStorage.getItem('baiPendingNewEmail')||'').trim();
  if(!isValidEmailAddress(newEmail)) return;
  const oldEmail=(sessionStorage.getItem('baiAccountEmail')||'').trim();
  const oldLower=oldEmail.toLowerCase(); const newLower=newEmail.toLowerCase();
  sessionStorage.setItem('baiAccountEmail',newEmail);
  saveApplications(getApplications().map(a=>({...a,email:newEmail,contactEmail:newEmail})));
  if(oldLower!==newLower){
    saveHelpEnquiries(getHelpEnquiries().map(e=>String(e.memberEmail||'').toLowerCase()===oldLower?{...e,memberEmail:newEmail}:e));
    saveHelpConversations(getHelpConversations().map(c=>String(c.memberEmail||'').toLowerCase()===oldLower?{...c,memberEmail:newEmail}:c));
    saveHelpNotifications(getHelpNotifications().map(n=>String(n.email||'').toLowerCase()===oldLower?{...n,email:newEmail}:n));
  }
  sessionStorage.setItem('baiEmailChangeSuccess','true');
  sessionStorage.removeItem('baiPendingNewEmail'); sessionStorage.removeItem('baiEmailChangeOtp'); sessionStorage.removeItem('baiEmailChangeOtpSent'); sessionStorage.removeItem('baiEmailChangeOtpSentAt');
  go('profile');
}
