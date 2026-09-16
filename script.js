
const app = document.getElementById('app');

function go(page){ location.hash = page; render(); window.scrollTo(0,0); }
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function authBrand(){
  return `<div class="auth-brand"><img src="assets/dashboard-logo.png" alt="BAI logo"></div>`;
}


function forgot(){
 return `<div class="auth-screen"><div class="auth-card compact">
   ${authBrand()}
   <div class="message-screen" style="justify-content:flex-start;padding-top:35px">
     <h1>FORGOT PASSWORD</h1>
     <p>Enter your Application ID and the email associated with your account. We will send password reset instructions to your email.</p>
     <div class="field" style="width:min(100%,390px);text-align:left">
       <label>Application ID</label>
       <input id="resetAppId" placeholder="Enter your Application ID">
     </div>
     <div class="field" style="width:min(100%,390px);text-align:left">
       <label>Email Address</label>
       <input id="resetEmail" type="email" placeholder="Enter your email address">
     </div>
     <button class="primary" style="max-width:390px;margin-top:12px" onclick="go('reset-sent')">Send Reset Link</button>
     <div class="small-center"><button class="link-btn" onclick="go('login')">Return to Login</button></div>
   </div>
 </div></div>`;
}

function resetSent(){
 return `<div class="auth-screen"><div class="auth-card compact">
   ${authBrand()}
   <div class="message-screen">
     <h1>RESET LINK SENT</h1>
     <p>If the Application ID and Email match an existing account, password reset instructions have been sent to your email inbox.</p>
     <p style="font-size:14px">Please check your inbox and follow the reset link to create a new password.</p>
     <button class="primary" onclick="go('login')">Return to Login</button>
   </div>
 </div></div>`;
}

function login(){
 return `<div class="login-screen">
   <section class="login-visual" aria-label="BAI Passport Tracking System"></section>
   <section class="login-panel"><div class="login-box">
     <h1>LOG IN TO MYBAI</h1><p class="subtitle">Enter credentials to access your account</p>
     <div class="field"><label>Application ID</label><input id="appId" placeholder=""></div>
     <div class="field"><label>Password</label><div class="password-wrap"><input type="password" value="demopassword"><button class="eye" onclick="togglePassword(this)">◉</button></div></div>
     <div class="small-center"><button class="link-btn" onclick="go('forgot')">Forgot Password?</button></div>
     <div class="auth-actions"><button class="primary" onclick="loginUser()">Sign in</button></div>
     <label class="remember"><input type="checkbox" checked> Remember me</label>
     <div class="divider">OR</div>
     <button class="primary" onclick="go('signup')">Create Account</button>
     <div class="small-center" style="margin-top:22px"><button class="link-btn" onclick="go('complaint')">Having issues? Write a Complaint Form</button></div>
     <div class="terms">By signing in, you agree to our <a href="#" onclick="return false">Terms of Use</a> and <a href="#" onclick="return false">Privacy Policy</a>.</div>
   </div></section>
 </div>`;
}

function signup(){
 return `<div class="auth-screen"><div class="auth-card">
   ${authBrand()}
   <h1 class="auth-heading">CREATE YOUR MYBAI ACCOUNT</h1>
   <p class="auth-sub">Join us today and start to explore the world of BAI with<br>your personalized account.</p>
   <div class="form-grid">
     <div class="field"><label>Last Name</label><input id="lastName"></div>
     <div class="field"><label>First Name</label><input id="firstName"></div>
     <div class="field full"><label>Email Address</label><input type="email" id="email"></div>
     <div class="field"><label>Password</label><div class="password-wrap"><input type="password" value="demopassword"><button class="eye" onclick="togglePassword(this)">◉</button></div></div>
     <div class="field"><label>Confirm Password</label><div class="password-wrap"><input type="password" value="demopassword"><button class="eye" onclick="togglePassword(this)">◉</button></div></div>
   </div>
   <div class="auth-actions"><button class="primary" onclick="go('verify')">Create Account</button></div>
   <div class="small-center"><button class="link-btn" onclick="go('forgot')">Forgot Password?</button></div>
 </div></div>`;
}

function verify(){
 return `<div class="auth-screen"><div class="auth-card compact">
   ${authBrand()}
   <div class="message-screen">
     <h1>EMAIL VERIFICATION</h1>
     <p>A verification code has been sent to your Email inbox,<br>insert the code below.</p>
     <div class="field" style="width:200px;text-align:left"><label>Verification Code</label><input placeholder="A B C D E F G"></div>
     <p style="font-size:14px;margin-top:12px">This is to verify that you own the account,<br><b>do not share the verification code with anyone else</b></p>
     <button class="primary" onclick="go('created')">Continue</button>
   </div>
 </div></div>`;
}

function created(){
 return `<div class="auth-screen"><div class="auth-card compact">
   ${authBrand()}
   <div class="message-screen">
     <h1>ACCOUNT CREATED</h1>
     <p>Congratulations! your account has been created,<br>an <b>Account ID has been sent to your Email</b>, use it<br>for logging in</p>
     <p>Do not share your Account ID and Password with anyone</p>
     <p>Please note that this does NOT create you a passport,<br>visit the <a href="#" onclick="return false">Department Of Foreign Affairs</a> to do so</p>
     <button class="primary" onclick="go('link-application')">Link Passport Application</button>
     <div class="small-center" style="margin-top:14px"><button class="link-btn" onclick="go('login')">Proceed to Login</button></div>
   </div>
 </div></div>`;
}

function linkApplication(){
 return `<div class="auth-screen"><div class="auth-card compact">
   ${authBrand()}
   <div class="message-screen">
     <h1>LINK YOUR PASSPORT APPLICATION</h1>
     <p>Enter the reference information provided by the DFA<br>to connect your passport application to your BAI account.</p>
     <div class="field" style="width:100%;text-align:left"><label>DFA Appointment Reference No. (ARN)</label><input id="dfaArn" placeholder="Enter your ARN"></div>
     <div class="field" style="width:100%;text-align:left;margin-top:12px"><label>Email Address</label><input id="linkEmail" type="email" placeholder="Enter your registered email"></div>
     <button class="primary" style="margin-top:18px" onclick="linkPassportApplication()">LINK APPLICATION</button>
   </div>
 </div></div>`;
}

function linkPassportApplication(){
 const arn=document.getElementById('dfaArn');
 const email=document.getElementById('linkEmail');
 if(!arn || !email) return;
 if(!arn.value.trim() || !email.value.trim()){
   alert('Please enter your DFA ARN and Email Address.');
   return;
 }
 sessionStorage.setItem('baiApplicationLinked','true');
 sessionStorage.setItem('baiDfaArn',arn.value.trim());
 sessionStorage.setItem('baiDfaPayment','DF3WPI4HPE');
 sessionStorage.setItem('baiLinkEmail',email.value.trim());
 go('application-linked');
}

function applicationLinked(){
 return `<div class="auth-screen"><div class="auth-card compact">
   ${authBrand()}
   <div class="message-screen">
     <h1>APPLICATION LINKED</h1>
     <p>Your DFA passport application has been successfully linked<br>to your BAI account.</p>
     <div class="reference-grid" style="margin:18px 0;text-align:left">
       <div><span>BAI Application ID</span><b>BAI-123-4567890</b></div>
       <div><span>DFA Appointment Reference No. (ARN)</span><b id="linkedArn">${esc(sessionStorage.getItem('baiDfaArn')||'')}</b></div>
       <div><span>DFA Payment Reference</span><b id="linkedPayment">${esc(sessionStorage.getItem('baiDfaPayment')||'')}</b></div>
     </div>
     <p>Your BAI Application ID can now be used to check your application status.</p>
     <button class="primary" onclick="go('login')">Proceed to Login</button>
   </div>
 </div></div>`;
}

function complaint(){
 const loggedIn = sessionStorage.getItem('baiLoggedIn') === 'true';
 return `<div class="complaint-bg"><div class="complaint-card">
   <div class="complaint-header">
     <h1>Complaint Form</h1>
     <p>Having problems? Write a complaint and we will help you</p>
   </div>
   <form onsubmit="submitComplaint(event)">
     <div class="field"><label for="complaintId">Application ID</label><input id="complaintId" required></div>
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
 const loggedIn = sessionStorage.getItem('baiLoggedIn') === 'true';
 sessionStorage.setItem('baiComplaintReturn', loggedIn ? 'dashboard' : 'login');
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
 return `<div class="dashboard">
   <aside class="sidebar">
     <div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div>
     <nav class="nav">
       <button class="active" onclick="go('dashboard')">⌂ &nbsp;Dashboard</button>
       <button onclick="go('profile')">● &nbsp;My Profile</button>
       <button onclick="alert('Demo: Bookings page')">▣ &nbsp;Bookings</button>
       <button onclick="go('status')">⌕ &nbsp;Check Status</button>
       <button onclick="alert('Demo: Travel History page')">✈ &nbsp;Travel History</button>
       <button onclick="alert('Demo: Settings page')">Settings</button>
     </nav>
     <div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('complaint')">Contact Support</button></div>
   </aside>
   <header class="topbar">
     <div class="welcome">Good Day, Juan Dela Cruz!<small>Welcome Back to BAI!</small></div>
     <div class="top-actions">
       <button class="notification-btn" aria-label="Notifications" onclick="alert('You have 3 notifications')">
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
           <span>Juan Dela Cruz</span><span class="chevron">⌄</span>
         </button>
         <div class="user-dropdown">
           <button onclick="go('profile'); closeUserMenu()">My Profile</button>
           <button class="logout" onclick="logout()">Logout</button>
         </div>
       </div>
     </div>
   </header>
   <main class="content">
     <section class="hero"><h2>Fly with Pride,<br>Connect the World.</h2><p>BAI - Where Pride Takes Flight.</p></section>
     <div class="cards">
       <section class="panel">
         <h3>Recent Updates</h3>
         <div class="update"><span class="dot green">✓</span><span>Your renewal application has been approved.<small style="display:block">Reference No. RWN-123-4567890</small></span><time>December 10, 2025<br>10:30 AM</time></div>
         <div class="update"><span class="dot blue">i</span><span>Your document has been received and is now being reviewed.<small style="display:block">Reference No. RWN-123-4567890</small></span><time>December 10, 2025<br>10:30 AM</time></div>
         <div class="update"><span class="dot orange">◷</span><span>Your renewal application is pending payment.<small style="display:block">Reference No. RWN-123-4567890</small></span><time>December 10, 2025<br>10:30 AM</time></div>
       </section>
       <section class="panel">
         <h3>PASSPORT OVERVIEW</h3>
         <div class="passport"><strong>Passport</strong><div class="name">Juan Dela Cruz</div><strong>Passport ID</strong><div class="id">BAI-123-4567890</div><div class="map">⌁</div></div>
         <div class="trip"><div class="trip-head"><span>Upcoming Trip</span><span>View all</span></div><div class="route"><span>CEB<br><small>Cebu</small></span><span class="plane">✈</span><span>MNL<br><small>Manila</small></span></div><div class="trip-meta">Flight No. <b>BAI 123</b><span class="status">CONFIRMED</span></div></div>
       </section>
     </div>
   </main>
   <footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer>
 </div>`;
}

function status(){
 return `<div class="dashboard">
   <aside class="sidebar">
     <div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div>
     <nav class="nav">
       <button onclick="go('dashboard')">⌂ &nbsp;Dashboard</button>
       <button onclick="go('profile')">● &nbsp;My Profile</button>
       <button onclick="alert('Demo: Bookings page')">▣ &nbsp;Bookings</button>
       <button class="active" onclick="go('status')">⌕ &nbsp;Check Status</button>
       <button onclick="alert('Demo: Travel History page')">✈ &nbsp;Travel History</button>
       <button onclick="alert('Demo: Settings page')">Settings</button>
     </nav>
     <div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('complaint')">Contact Support</button></div>
   </aside>
   <header class="topbar">
     <div class="welcome">Good Day, Juan Dela Cruz!<small>Welcome Back to BAI!</small></div>
     <div class="top-actions">
       <button class="notification-btn" aria-label="Notifications" onclick="alert('You have 3 notifications')">
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
           <span>Juan Dela Cruz</span><span class="chevron">⌄</span>
         </button>
         <div class="user-dropdown">
           <button onclick="go('profile'); closeUserMenu()">My Profile</button>
           <button class="logout" onclick="logout()">Logout</button>
         </div>
       </div>
     </div>
   </header>
   <main class="content">
     <div class="page-panel status-panel">
       <h2>Check Passport Application Status</h2>
       <p class="status-intro">Use your BAI Application ID and registered email address to view your passport application details.</p>
       <div class="status-lookup">
         <div class="field"><label>Application ID</label><input id="statusAppId" value="BAI-123-4567890" placeholder="BAI-123-4567890"></div>
         <div class="field"><label>Email Address</label><input id="statusEmail" value="juan.delacruz@example.com" type="email" placeholder="Enter your email address"></div>
         <button class="primary" onclick="showApplicationStatus()">Check Status</button>
       </div>
       <div id="statusResult" class="status-result">
         <div class="status-result-head">
           <div><span class="status-label">PASSPORT APPLICATION</span><h3>Application Details</h3></div>
           <span class="current-status">PROCESSING</span>
         </div>
         <div class="reference-grid">
           <div><span>Application Type</span><b>Passport Renewal</b></div>
           <div><span>Application ID</span><b>BAI-123-4567890</b></div>
           <div><span>Appointment Reference No. (ARN)</span><b>${esc(sessionStorage.getItem('baiDfaArn')||'Not linked')}</b></div>
           <div><span>Payment Reference</span><b>${esc(sessionStorage.getItem('baiDfaPayment')||'Not linked')}</b></div>
           <div><span>eReceipt No.</span><b>ER-2026-0703-000123</b></div>
         </div>
         <div class="status-timeline">
           <div class="timeline-step done"><span>✓</span><div><b>Application Submitted</b><small>Application was successfully submitted.</small></div></div>
           <div class="timeline-step done"><span>✓</span><div><b>Documents Received</b><small>Required documents have been received.</small></div></div>
           <div class="timeline-step current"><span>●</span><div><b>Processing</b><small>Your application is currently being processed.</small></div></div>
           <div class="timeline-step"><span>○</span><div><b>Passport Printed</b><small>Waiting for passport production.</small></div></div>
           <div class="timeline-step"><span>○</span><div><b>Ready for Release</b><small>Passport will be available for release or delivery.</small></div></div>
         </div>
         <p class="status-note">Your DFA reference information is linked to your BAI Application ID for this prototype.</p>
       </div>
     </div>
   </main>
   <footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer>
 </div>`;
}

function showApplicationStatus(){
 const id=document.getElementById('statusAppId');
 const email=document.getElementById('statusEmail');
 const result=document.getElementById('statusResult');
 if(!id || !email || !result) return;
 if(!id.value.trim() || !email.value.trim()){
   alert('Please enter your Application ID and Email Address.');
   return;
 }
 result.classList.add('visible');
 result.scrollIntoView({behavior:'smooth',block:'start'});
}

function profile(){
 return `<div class="dashboard">
   <aside class="sidebar">
     <div class="sidebar-logo"><img src="assets/dashboard-logo.png" alt="BAI logo"></div>
     <nav class="nav">
       <button onclick="go('dashboard')">⌂ &nbsp;Dashboard</button>
       <button class="active">● &nbsp;My Profile</button>
       <button onclick="alert('Demo: Bookings page')">▣ &nbsp;Bookings</button>
       <button onclick="go('status')">⌕ &nbsp;Check Status</button>
       <button onclick="alert('Demo: Travel History page')">✈ &nbsp;Travel History</button>
       <button onclick="alert('Demo: Settings page')">Settings</button>
     </nav>
     <div class="help"><strong>Need Help?</strong><br>We're here for you!<br><button onclick="go('complaint')">Contact Support</button></div>
   </aside>
   <header class="topbar">
     <div class="welcome">Good Day, Juan Dela Cruz!<small>Welcome Back to BAI!</small></div>
     <div class="top-actions">
       <button class="notification-btn" aria-label="Notifications" onclick="alert('You have 3 notifications')">
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
           <span>Juan Dela Cruz</span><span class="chevron">⌄</span>
         </button>
         <div class="user-dropdown">
           <button onclick="go('profile'); closeUserMenu()">My Profile</button>
           <button class="logout" onclick="logout()">Logout</button>
         </div>
       </div>
     </div>
   </header>
   <main class="content">
     <div class="page-panel">
       <h2>My Profile</h2>
       <div class="stat-grid">
         <div class="stat"><b>Juan Dela Cruz</b>Full Name</div>
         <div class="stat"><b>BAI-123-4567890</b>Passport ID</div>
         <div class="stat"><b>Active</b>Account Status</div>
       </div>
       <hr style="margin:30px 0;border:0;border-top:1px solid #ddd">
       <label>Email Address</label>
       <input value="juan.delacruz@example.com" style="max-width:500px;margin:6px 0 20px">
       <br>
       <button class="primary" style="max-width:300px" onclick="alert('Demo: profile saved')">Save Changes</button>
     </div>
   </main>
   <footer class="footer"><span>© 2026 Bisaya Airlines International (BAI). All rights reserved.</span><span>Privacy Policy　|　Terms & Conditions</span></footer>
 </div>`;
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
function loginUser(){
  sessionStorage.setItem('baiLoggedIn','true');
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

function render(){
 const page=(location.hash||'#login').slice(1);
 const pages={login,signup,verify,created,'link-application':linkApplication,'application-linked':applicationLinked,forgot,'reset-sent':resetSent,complaint,'complaint-done':complaintDone,dashboard,profile,status};
 app.innerHTML=(pages[page]||login)();
}
window.addEventListener('hashchange',render);
render();
