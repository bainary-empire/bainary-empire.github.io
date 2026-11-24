/**
 * BAI Passport Tracking System — Admin Portal (admin.js)
 *
 * Responsibilities:
 *  1. Administrator authentication (sessionStorage: `baiAdminPortalLoggedIn`)
 *  2. Personnel account management (localStorage: `baiPersonnelAccounts`)
 *  3. Support enquiry oversight, replies & real-time thread sync (`baiHelpEnquiries`)
 *  4. Passport Renewal & New Passport Application review (`baiApplications_<memberId>`)
 *  5. Viewing member-uploaded enquiry attachments from IndexedDB (`baiSupportAttachments`)
 */

/* ==========================================================================
   1. Constants, Default Seed Data & Runtime State
   ========================================================================== */
const ACCOUNTS_KEY = 'baiPersonnelAccounts';
const ADMIN_SESSION = 'baiAdminPortalLoggedIn';
const ADMIN_EMAIL = 'admin@bai.local';
const ADMIN_PASSWORD = 'BAI-admin';

const ENQ_KEY = 'baiHelpEnquiries';
const NOTIF_KEY = 'baiHelpNotifications';

const BAI_ATTACHMENT_DB = 'baiSupportAttachments';
const BAI_ATTACHMENT_STORE = 'files';

const DEFAULT_ACCOUNTS = [
  {
    id: 'PERS-0001',
    email: 'support@bai.local',
    password: 'BAI-support',
    name: 'BAI Support Personnel',
    role: 'Personnel',
    status: 'Active',
    mustChangePassword: false,
    contact: ''
  },
  {
    id: 'PERS-0002',
    email: 'maria.santos@bai.local',
    password: 'BAI-support2',
    name: 'Maria Santos',
    role: 'Personnel',
    status: 'Active',
    mustChangePassword: false,
    contact: ''
  }
];

const app = document.getElementById('app');

let enquiryTimer = null;
let enquirySignature = '';
let enquiryStorageHandler = null;

/* ==========================================================================
   2. Storage Helpers & String / Date Utilities
   ========================================================================== */

/** Reads the shared personnel accounts registry, seeding defaults if missing. */
function getAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // Fall back to seeding defaults below
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
  return DEFAULT_ACCOUNTS.slice();
}

/** Saves personnel accounts and records an update timestamp for cross-tab listeners. */
function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  localStorage.setItem('baiPersonnelAccountsUpdatedAt', String(Date.now()));
}

// Ensure default personnel accounts exist on initial load
getAccounts();

/** Escapes user-supplied strings before interpolating into HTML templates. */
function esc(v) {
  return String(v ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));
}

/** Capitalizes the first letter of each whitespace-separated name part. */
function displayPersonName(v) {
  return String(v ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function jsonGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function jsonSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = 'ID') {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function formatDateTime(v) {
  try {
    return new Date(v).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return v || '';
  }
}

function statusClass(v) {
  return String(v || 'pending').toLowerCase().replace(/[^a-z]+/g, '-');
}

/* ==========================================================================
   3. Hash Router, Authentication & Portal Shell
   ========================================================================== */

function go(page, params) {
  const query = params ? new URLSearchParams(params).toString() : '';
  location.hash = query ? `${page}?${query}` : page;
  render();
}

function parseRoute() {
  const raw = (location.hash || '#login').slice(1);
  const parts = raw.split('?');
  return {
    page: parts[0] || 'login',
    params: new URLSearchParams(parts[1] || '')
  };
}

function logged() {
  return sessionStorage.getItem(ADMIN_SESSION) === 'true';
}

function login() {
  if (logged()) {
    go('dashboard');
    return '';
  }
  return `
    <div class="login-screen">
      <div class="login-card">
        <div class="brand"><img src="assets/dashboard-logo.png" alt="BAI logo"></div>
        <h2>BAI ADMIN PORTAL</h2>
        <p>Authorized administrators only.</p>
        <form onsubmit="adminSignIn(event)" novalidate>
          <div class="field">
            <label for="adminEmail">Admin Email</label>
            <input id="adminEmail" type="text" autocomplete="username" placeholder="Enter admin email">
          </div>
          <div class="field">
            <label for="adminPassword">Password</label>
            <input id="adminPassword" type="password" autocomplete="current-password" placeholder="Enter password">
          </div>
          <div id="loginError" class="error"></div>
          <button class="primary" type="submit">Sign In</button>
        </form>
      </div>
    </div>`;
}

/** Presentation-friendly sign-in: accepts any credentials (or blank to skip) without checking registration. */
function adminSignIn(e) {
  e.preventDefault();
  const email = (document.getElementById('adminEmail')?.value || '').trim().toLowerCase() || ADMIN_EMAIL;
  sessionStorage.setItem(ADMIN_SESSION, 'true');
  sessionStorage.setItem('baiAdminEmail', email);
  go('dashboard');
}

function logout() {
  sessionStorage.removeItem(ADMIN_SESSION);
  go('login');
}

/** Shared authenticated page layout with top navigation bar. */
function shell(inner, active = 'dashboard') {
  return `
    <div class="page">
      <header class="top">
        <div class="brand">
          <img src="assets/dashboard-logo.png" alt="BAI logo">
          <div>
            <h1>BAI Admin Portal</h1>
            <p>Personnel Account Management</p>
          </div>
        </div>
        <nav>
          <button class="${active === 'dashboard' ? 'active' : ''}" onclick="go('dashboard')">Personnel</button>
          <button class="${active === 'enquiries' ? 'active' : ''}" onclick="go('enquiries')">Enquiries</button>
          <button class="${active === 'renewals' ? 'active' : ''}" onclick="go('renewals')">Renewals</button>
          <button class="${active === 'new-applications' ? 'active' : ''}" onclick="go('new-applications')">New Passports</button>
          <button onclick="logout()">Logout</button>
        </nav>
      </header>
      <main>${inner}</main>
    </div>`;
}

/* ==========================================================================
   4. IndexedDB Support Attachment Viewer
   ========================================================================== */

function openAttachmentDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BAI_ATTACHMENT_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(BAI_ATTACHMENT_STORE)) {
        req.result.createObjectStore(BAI_ATTACHMENT_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Unable to open attachment storage'));
  });
}

async function loadEnquiryAttachment(id) {
  if (!id) return null;
  try {
    const db = await openAttachmentDb();
    const item = await new Promise((resolve, reject) => {
      const req = db.transaction(BAI_ATTACHMENT_STORE, 'readonly').objectStore(BAI_ATTACHMENT_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return item;
  } catch {
    return null;
  }
}

function formatAttachmentSize(size) {
  const n = Number(size) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function enquiryAttachmentHtml(a) {
  if (!a) return '';
  const safeName = esc(a.name || 'Attachment');
  const id = esc(a.id || '');
  const icon = (a.type || '').startsWith('image/') ? '🖼️' : '📎';
  return `
    <div class="admin-enquiry-attachment" data-attachment-id="${id}">
      <span class="attachment-icon">${icon}</span>
      <div class="attachment-info">
        <b>${safeName}</b>
        <small>${esc(formatAttachmentSize(a.size))}</small>
      </div>
      <button type="button" class="attachment-view-btn" onclick="viewEnquiryAttachment('${id}','${esc(a.type || 'application/octet-stream')}','${safeName}')">View</button>
    </div>`;
}

function enquiryAttachmentsHtml(items, fallback = null) {
  const list = Array.isArray(items) ? items.filter(Boolean) : (items ? [items] : []);
  if (!list.length && fallback) return enquiryAttachmentHtml(fallback);
  return list.map(a => enquiryAttachmentHtml(a)).join('');
}

async function viewEnquiryAttachment(id, type, name) {
  const item = await loadEnquiryAttachment(id);
  if (!item?.blob) {
    alert('This attachment is no longer available.');
    return;
  }
  const url = URL.createObjectURL(item.blob);
  const win = window.open(url, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || item.name || 'attachment';
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ==========================================================================
   5. Enquiry Oversight, Replies & Real-Time Polling
   ========================================================================== */

function getEnquiries() {
  return jsonGet(ENQ_KEY, []);
}

function saveEnquiries(v) {
  jsonSet(ENQ_KEY, v);
}

function statusOptions(selected = '') {
  const statuses = [['', 'All Statuses'], ...['Pending', 'Escalated', 'In Progress', 'Resolved', 'Closed'].map(x => [x, x])];
  return statuses
    .map(([v, t]) => `<option value="${esc(v)}" ${selected === v ? 'selected' : ''}>${esc(t)}</option>`)
    .join('');
}

function categoryOptions(selected = '') {
  const cats = [
    'Application Status',
    'New Passport',
    'Passport Renewal',
    'Lost Passport Replacement',
    'Documents / Requirements',
    'Payment',
    'Appointment / DFA Consular Office',
    'Account / OTP',
    'Other'
  ];
  return `<option value="">All Categories</option>` +
    cats.map(c => `<option value="${esc(c)}" ${selected === c ? 'selected' : ''}>${esc(c)}</option>`).join('');
}

/** Pushes an unread notification for the member who owns the enquiry. */
function adminAddMemberNotification(e, message) {
  const raw = jsonGet(NOTIF_KEY, []);
  raw.push({
    id: uid('NTF'),
    memberId: e.memberId || null,
    email: String(e.memberEmail || e.email || '').toLowerCase(),
    message,
    enquiryId: e.id,
    createdAt: nowIso(),
    read: false
  });
  jsonSet(NOTIF_KEY, raw);
}

function enquiryDashboard() {
  const { params } = parseRoute();
  const sf = params.get('status') || '';
  const cf = params.get('category') || '';
  const all = getEnquiries();
  const filtered = all.filter(e => (!sf || e.status === sf) && (!cf || e.category === cf));
  const attention = all.filter(e => ['Pending', 'Escalated', 'In Progress'].includes(e.status));

  return shell(`
    <section class="admin-enquiry-stats">
      <div class="admin-enquiry-stat"><b>${all.length}</b><span>All Enquiries</span></div>
      <div class="admin-enquiry-stat"><b>${attention.length}</b><span>Needs Attention</span></div>
      <div class="admin-enquiry-stat"><b>${all.filter(e => e.status === 'Resolved').length}</b><span>Resolved</span></div>
      <div class="admin-enquiry-stat"><b>${all.filter(e => e.status === 'Closed').length}</b><span>Closed</span></div>
    </section>
    <section class="card">
      <div class="head">
        <div>
          <h2>Enquiry Management</h2>
          <p>Review, reply to, and manage all member enquiries.</p>
        </div>
        <button class="secondary" onclick="go('enquiries')">Clear Filters</button>
      </div>
      <div class="filters">
        <select onchange="adminFilterStatus(this.value)">${statusOptions(sf)}</select>
        <select onchange="adminFilterCategory(this.value)">${categoryOptions(cf)}</select>
      </div>
      ${filtered.length
        ? `<div class="admin-enquiry-list" id="adminEnquiryList">${filtered.map(adminEnquiryItem).join('')}</div>`
        : `<div class="admin-empty">No enquiries match the selected filters.</div>`}
    </section>`, 'enquiries');
}

function adminEnquiryItem(e) {
  return `
    <button class="admin-enquiry-item" onclick="go('admin-enquiry',{id:'${esc(e.id)}'})">
      <div>
        <span class="admin-status ${statusClass(e.status)}">${esc(e.status)}</span>
        <h3>${esc(e.id)}</h3>
        <b>${esc(e.category || 'Other')}</b>
        <p>${esc(e.description || '')}</p>
      </div>
      <div class="admin-enquiry-meta">
        <span>${esc(e.memberName || 'Member')}</span>
        <span>${formatDateTime(e.updatedAt || e.createdAt)}</span>
      </div>
    </button>`;
}

function adminFilterStatus(v) {
  const { params } = parseRoute();
  const cat = params.get('category') || '';
  go('enquiries', v ? { status: v, ...(cat ? { category: cat } : {}) } : cat ? { category: cat } : {});
}

function adminFilterCategory(v) {
  const { params } = parseRoute();
  const st = params.get('status') || '';
  go('enquiries', v ? { category: v, ...(st ? { status: st } : {}) } : st ? { status: st } : {});
}

function adminMessageHtml(m, fallbackAttachment = null) {
  const isMember = String(m.senderType || '').toLowerCase() === 'member';
  let attachmentHtml = '';
  if (isMember) {
    if (m.attachments?.length) attachmentHtml = enquiryAttachmentsHtml(m.attachments);
    else if (m.attachment) attachmentHtml = enquiryAttachmentHtml(m.attachment);
    else if (Array.isArray(fallbackAttachment)) attachmentHtml = enquiryAttachmentsHtml(fallbackAttachment);
    else if (fallbackAttachment) attachmentHtml = enquiryAttachmentHtml(fallbackAttachment);
  }
  return `
    <div class="admin-message ${isMember ? 'member-message' : 'admin-message-own'}">
      <div>
        <b>${esc(m.senderName || m.senderType)}</b>
        <small>${formatDateTime(m.createdAt)}</small>
      </div>
      <p>${esc(m.text || '')}</p>
      ${attachmentHtml}
    </div>`;
}

function adminEnquiry() {
  const id = parseRoute().params.get('id') || '';
  const e = getEnquiries().find(x => x.id === id);
  if (!e) {
    return shell(`
      <section class="card">
        <h2>Enquiry Not Found</h2>
        <button class="secondary" onclick="go('enquiries')">← Back to Enquiries</button>
      </section>`, 'enquiries');
  }

  const rel = e.applicationSnapshot;
  const closed = e.status === 'Closed';
  const transcript = e.chatTranscript?.length ? e.chatTranscript : (e.chatHistory || []);

  return shell(`
    <section class="admin-detail-grid">
      <div class="admin-detail-main">
        <div class="admin-detail-title">
          <div>
            <button class="secondary" onclick="go('enquiries')">← Back to Enquiries</button>
            <h2>${esc(e.id)}</h2>
            <span id="adminEnquiryStatus" class="admin-status ${statusClass(e.status)}">${esc(e.status)}</span>
          </div>
          ${closed
            ? '<div class="admin-closed-note">Closed — this enquiry is view-only.</div>'
            : `<div class="admin-detail-actions" id="adminDetailActions">
                 <button onclick="adminChangeStatus('${esc(e.id)}','In Progress')">In Progress</button>
                 <button onclick="adminChangeStatus('${esc(e.id)}','Resolved')">Resolved</button>
                 <button onclick="adminChangeStatus('${esc(e.id)}','Closed')">Closed</button>
               </div>`}
        </div>
        <div class="admin-detail-info">
          <div><span>Member</span><b>${esc(e.memberName || 'Member')}</b></div>
          <div><span>Email</span><b>${esc(e.memberEmail || e.email || 'Not provided')}</b></div>
          <div><span>Related Application</span><b>${esc(rel ? `${rel.type || 'Application'} — ${rel.id || ''}` : 'None')}</b></div>
          <div><span>Category</span><b>${esc(e.category || 'Other')}</b></div>
          ${e.sourceArticleId ? `<div><span>Source Article</span><b>${esc(e.sourceArticleTitle || e.sourceArticleId)}</b></div>` : ''}
        </div>
        ${transcript.length
          ? `<div class="admin-context">
               <h3>Original AI Chat Transcript</h3>
               ${transcript.map(m => `<div><b>${m.sender === 'member' ? 'Member' : 'AI'}:</b> ${esc(m.text)}</div>`).join('')}
             </div>`
          : ''}
        <div class="admin-thread" id="adminEnquiryThread">
          ${(e.messages || []).map((m, i) => adminMessageHtml(m, i === 0 ? (e.attachments || e.attachment) : null)).join('')}
        </div>
        ${closed
          ? ''
          : `<form class="admin-reply" id="adminReplyForm" onsubmit="adminSendReply(event,'${esc(e.id)}')">
               <div class="field">
                 <label>Reply to Member</label>
                 <textarea id="adminReplyText" required placeholder="Write your response..."></textarea>
               </div>
               <div class="actions">
                 <select id="adminReplyStatus">
                   <option value="In Progress">In Progress</option>
                   <option value="Resolved">Resolved</option>
                   <option value="Closed">Closed</option>
                 </select>
                 <button class="primary" type="submit">Send Reply</button>
               </div>
             </form>`}
      </div>
      <aside class="admin-detail-side">
        <h3>Enquiry Details</h3>
        <div><span>Enquiry ID</span><b>${esc(e.id)}</b></div>
        <div><span>Created</span><b>${formatDateTime(e.createdAt)}</b></div>
        <div><span>Updated</span><b id="adminEnquiryUpdated">${formatDateTime(e.updatedAt)}</b></div>
        <div><span>Escalated</span><b>${e.escalationFlag ? 'Yes' : 'No'}</b></div>
        <div><span>Personnel</span><b>${esc(displayPersonName(e.personnelName || e.personnelId || 'Unassigned'))}</b></div>
        <div><span>Messages</span><b id="adminEnquiryMessageCount">${e.messages?.length || 0}</b></div>
      </aside>
    </section>`, 'enquiries');
}

function adminChangeStatus(id, status) {
  const allowed = ['Pending', 'Escalated', 'In Progress', 'Resolved', 'Closed'];
  if (!logged() || !allowed.includes(status)) return;

  const all = getEnquiries();
  const i = all.findIndex(e => e.id === id);
  if (i < 0) return;

  const e = all[i];
  if (e.status === 'Closed' || e.status === status) return;

  e.status = status;
  e.updatedAt = nowIso();
  e.adminId = ADMIN_EMAIL;
  e.adminName = 'BAI Administrator';
  e.auditTrail = [
    ...(e.auditTrail || []),
    { actorType: 'admin', actorId: ADMIN_EMAIL, action: `Changed status to ${status}`, createdAt: e.updatedAt }
  ];

  all[i] = e;
  saveEnquiries(all);
  adminAddMemberNotification(e, `Your enquiry ${e.id} is now ${status}.`);
  go('admin-enquiry', { id });
}

function adminSendReply(event, id) {
  event.preventDefault();
  if (!logged()) return;

  const text = (document.getElementById('adminReplyText')?.value || '').trim();
  if (!text) return;

  const status = document.getElementById('adminReplyStatus')?.value || 'In Progress';
  const all = getEnquiries();
  const i = all.findIndex(e => e.id === id);
  if (i < 0) return;

  const e = all[i];
  if (e.status === 'Closed') return;

  const now = nowIso();
  e.messages = e.messages || [];
  e.messages.push({
    id: uid('MSG'),
    senderType: 'personnel',
    senderId: ADMIN_EMAIL,
    senderName: 'BAI Administrator',
    text,
    createdAt: now
  });
  e.status = status;
  e.adminId = ADMIN_EMAIL;
  e.adminName = 'BAI Administrator';
  e.updatedAt = now;
  e.auditTrail = [
    ...(e.auditTrail || []),
    { actorType: 'admin', actorId: ADMIN_EMAIL, action: 'Replied to member', createdAt: now }
  ];

  all[i] = e;
  saveEnquiries(all);
  adminAddMemberNotification(
    e,
    status === 'Resolved'
      ? `Support administration replied to enquiry ${e.id} and marked it Resolved.`
      : `Support administration replied to enquiry ${e.id}.`
  );
  go('admin-enquiry', { id });
}

/** Polls every 1.5s + listens to `storage` events to keep enquiry views live across tabs. */
function startEnquiryRealtime(page) {
  stopEnquiryRealtime();
  if (!['enquiries', 'admin-enquiry'].includes(page)) return;
  const refresh = () => {
    if (page === 'admin-enquiry') refreshAdminEnquiry();
    else refreshAdminEnquiries();
  };
  enquiryTimer = setInterval(refresh, 1500);
  enquiryStorageHandler = refresh;
  window.addEventListener('storage', enquiryStorageHandler);
}

function stopEnquiryRealtime() {
  if (enquiryTimer) {
    clearInterval(enquiryTimer);
    enquiryTimer = null;
  }
  if (enquiryStorageHandler) {
    window.removeEventListener('storage', enquiryStorageHandler);
    enquiryStorageHandler = null;
  }
  enquirySignature = '';
}

function refreshAdminEnquiries() {
  if ((location.hash || '#login').slice(1).split('?')[0] !== 'enquiries') return;
  const sig = JSON.stringify(
    getEnquiries().map(e => ({ id: e.id, u: e.updatedAt, s: e.status, c: e.messages?.length || 0 }))
  );
  if (sig === enquirySignature) return;
  app.innerHTML = enquiryDashboard();
  enquirySignature = sig;
}

function refreshAdminEnquiry() {
  const route = (location.hash || '#login').slice(1).split('?');
  if (route[0] !== 'admin-enquiry') return;

  const id = new URLSearchParams(route[1] || '').get('id') || '';
  const e = getEnquiries().find(x => x.id === id);
  if (!e) return;

  const sig = JSON.stringify({
    u: e.updatedAt,
    s: e.status,
    a: e.attachment?.id || null,
    m: e.messages?.map(m => ({ id: m.id, t: m.text, a: m.attachment?.id || null, at: m.createdAt })) || []
  });
  if (sig === enquirySignature) return;

  const thread = document.getElementById('adminEnquiryThread');
  const count = document.getElementById('adminEnquiryMessageCount');
  const status = document.getElementById('adminEnquiryStatus');
  const updated = document.getElementById('adminEnquiryUpdated');

  if (thread) {
    thread.innerHTML = (e.messages || [])
      .map((m, i) => adminMessageHtml(m, i === 0 ? (e.attachments || e.attachment) : null))
      .join('');
  }
  if (count) count.textContent = String(e.messages?.length || 0);
  if (status) {
    status.className = `admin-status ${statusClass(e.status)}`;
    status.textContent = e.status;
  }
  if (updated) updated.textContent = formatDateTime(e.updatedAt);

  const actions = document.getElementById('adminDetailActions');
  const form = document.getElementById('adminReplyForm');
  if (e.status === 'Closed') {
    if (actions) actions.style.display = 'none';
    if (form) form.style.display = 'none';
  }
  enquirySignature = sig;
}

/* ==========================================================================
   6. Personnel Account Management
   ========================================================================== */

function dashboard() {
  const accounts = getAccounts();
  return shell(`
    <section class="head">
      <div>
        <h2>Personnel Management</h2>
        <p>Create and manage authorized Personnel Portal accounts.</p>
      </div>
      <button class="primary" onclick="go('create')">+ Create Personnel Account</button>
    </section>
    <section class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Personnel ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${accounts.map(row).join('')}</tbody>
        </table>
      </div>
    </section>`);
}

function row(p) {
  return `
    <tr>
      <td><b>${esc(p.id)}</b></td>
      <td>${esc(displayPersonName(p.name))}</td>
      <td>${esc(p.email)}</td>
      <td>${esc(p.role)}</td>
      <td><span class="badge ${String(p.status).toLowerCase()}">${esc(p.status)}</span></td>
      <td>
        <button class="small" onclick="toggleStatus('${esc(p.id)}')">
          ${p.status === 'Active' ? 'Disable' : 'Enable'}
        </button>
      </td>
    </tr>`;
}

function create() {
  return shell(`
    <section class="card form-card">
      <div class="back">
        <button class="secondary" onclick="go('dashboard')">← Back to Personnel</button>
      </div>
      <h2>Create Personnel Account</h2>
      <p class="sub">Create an authorized account for the BAI Personnel Portal.</p>
      <form onsubmit="createAccount(event)">
        <h3>Personal Information</h3>
        <div class="grid">
          <div class="field">
            <label>First Name</label>
            <input id="firstName" required placeholder="Enter first name">
          </div>
          <div class="field">
            <label>Last Name</label>
            <input id="lastName" required placeholder="Enter last name">
          </div>
          <div class="field">
            <label>Work Email Address</label>
            <input id="email" type="email" required placeholder="example@bai.com">
          </div>
          <div class="field">
            <label>Contact Number <span>(optional)</span></label>
            <input id="contact" placeholder="09XXXXXXXXX">
          </div>
        </div>
        <h3>Account Information</h3>
        <div class="grid">
          <div class="field">
            <label>Personnel ID</label>
            <input value="Automatically generated" disabled>
          </div>
          <div class="field">
            <label>Role</label>
            <select id="role">
              <option value="Personnel">Personnel</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>
          <div class="field">
            <label>Account Status</label>
            <input value="Active" disabled>
          </div>
        </div>
        <h3>Initial Access</h3>
        <div class="field">
          <label>Temporary Password</label>
          <div class="password-row">
            <input id="tempPassword" value="${esc(generatePassword())}" readonly>
            <button type="button" class="secondary" onclick="document.getElementById('tempPassword').value=generatePassword()">Regenerate</button>
          </div>
          <p class="hint">The personnel must change this password after their first successful login.</p>
        </div>
        <div id="formError" class="error"></div>
        <div class="actions">
          <button type="button" class="secondary" onclick="go('dashboard')">Cancel</button>
          <button class="primary" type="submit">Create Personnel Account</button>
        </div>
      </form>
    </section>`);
}

function generatePassword() {
  const partA = Math.random().toString(36).slice(2, 6).toUpperCase();
  const partB = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BAI-${partA}-${partB}`;
}

function createAccount(e) {
  e.preventDefault();
  const first = document.getElementById('firstName').value.trim();
  const last = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const contact = document.getElementById('contact').value.trim();
  const role = document.getElementById('role').value;
  const password = document.getElementById('tempPassword').value;

  const accounts = getAccounts();
  if (accounts.some(a => a.email.toLowerCase() === email)) {
    document.getElementById('formError').textContent = 'A personnel account already uses this email address.';
    return;
  }

  const nextNum = accounts.reduce((max, a) => {
    const match = /^PERS-(\d+)$/.exec(a.id);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;

  const id = 'PERS-' + String(nextNum).padStart(4, '0');
  const record = {
    id,
    email,
    password,
    name: `${displayPersonName(first)} ${displayPersonName(last)}`,
    role,
    status: 'Active',
    mustChangePassword: true,
    contact
  };

  accounts.push(record);
  saveAccounts(accounts);
  showCreated(record);
}

function showCreated(p) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal">
      <div class="success">✓</div>
      <h3>Personnel Account Created</h3>
      <p>The personnel account for <b>${esc(displayPersonName(p.name))}</b> has been successfully created.</p>
      <div class="credentials">
        <div><span>Personnel ID</span><b>${esc(p.id)}</b></div>
        <div><span>Email</span><b>${esc(p.email)}</b></div>
        <div><span>Role</span><b>${esc(p.role)}</b></div>
        <div><span>Temporary Password</span><b id="createdPass">${esc(p.password)}</b></div>
      </div>
      <div class="actions">
        <button class="secondary" onclick="copyCredentials('${esc(p.email)}','${esc(p.password)}')">Copy Credentials</button>
        <button class="primary" onclick="this.closest('.modal-overlay').remove();go('dashboard')">Done</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function copyCredentials(email, password) {
  try {
    await navigator.clipboard.writeText(`BAI Personnel Portal\nEmail: ${email}\nTemporary Password: ${password}`);
  } catch {
    // Clipboard access may be restricted in non-HTTPS contexts
  }
}

function toggleStatus(id) {
  const accounts = getAccounts();
  const target = accounts.find(x => x.id === id);
  if (!target) return;
  target.status = target.status === 'Active' ? 'Disabled' : 'Active';
  saveAccounts(accounts);
  render();
}

/* ==========================================================================
   7. Passport Renewal Application Review
   ========================================================================== */

/** Scans all `baiApplications_<memberId>` keys (and `baiAccountRegistry` fallback) for Passport Renewal records. */
function getAllRenewals() {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('baiApplications_')) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(arr)) continue;
      arr.forEach((a, index) => {
        if (a.type === 'Passport Renewal' && a.id && !seen.has(a.id)) {
          seen.add(a.id);
          out.push({ app: a, key, index });
        }
      });
    } catch {
      // Ignore malformed storage entries
    }
  }
  const registry = jsonGet('baiAccountRegistry', []);
  if (Array.isArray(registry)) {
    registry.forEach(acct => {
      if (!acct?.id || !Array.isArray(acct.applications)) return;
      const key = `baiApplications_${acct.id}`;
      acct.applications.forEach((a, index) => {
        if (a.type === 'Passport Renewal' && a.id && !seen.has(a.id)) {
          seen.add(a.id);
          if (!localStorage.getItem(key)) jsonSet(key, acct.applications);
          out.push({ app: a, key, index });
        }
      });
    });
  }
  return out.sort((a, b) => String(b.app.createdAt || '').localeCompare(String(a.app.createdAt || '')));
}

function renewals() {
  const { params } = parseRoute();
  const status = params.get('status') || '';
  const items = getAllRenewals().filter(x => !status || (x.app.renewalStatus || x.app.status || 'Pending') === status);

  return shell(`
    <section class="head">
      <div>
        <h2>Passport Renewal Management</h2>
        <p>Review renewal requests, verify document details, and record a decision.</p>
      </div>
      <div class="filters" style="margin:0">
        <select onchange="go('renewals',this.value?{status:this.value}:{})">
          <option value="">All statuses</option>
          ${['Pending', 'Under Review', 'Approved', 'Processing', 'Ready for Release', 'COMPLETED', 'Rejected'].map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s === 'COMPLETED' ? 'Completed' : s}</option>`).join('')}
        </select>
      </div>
    </section>
    <section class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Renewal ID</th>
              <th>Applicant</th>
              <th>Reason</th>
              <th>DFA Site</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.length
              ? items.map(x => {
                  const a = x.app;
                  const d = a.renewalDetails || {};
                  return `
                    <tr>
                      <td>
                        <b>${esc(a.renewalId || a.id)}</b><br>
                        <small>Account: ${esc(a.applicationId || a.memberId || '—')}</small>
                      </td>
                      <td>
                        ${esc(`${d.renewalFirstName || ''} ${d.renewalLastName || ''}`.trim() || a.email || 'Member')}<br>
                        <small>${esc(a.contactEmail || a.email || '')}</small>
                      </td>
                      <td>${esc(a.renewalReason || '—')}</td>
                      <td>${esc(a.embassy || '—')}</td>
                      <td><span class="badge">${esc(a.renewalStatus || a.status || 'Pending')}</span></td>
                      <td><button class="small" onclick="go('renewal-detail',{id:'${esc(a.id)}'})">Review</button></td>
                    </tr>`;
                }).join('')
              : `<tr><td colspan="6">No renewal applications found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`, 'renewals');
}

function renewalDetail() {
  const id = parseRoute().params.get('id') || '';
  const item = getAllRenewals().find(x => x.app.id === id);
  if (!item) {
    return shell(`
      <section class="card">
        <h2>Renewal not found</h2>
        <button class="secondary" onclick="go('renewals')">Back to renewals</button>
      </section>`, 'renewals');
  }

  const a = item.app;
  const d = a.renewalDetails || {};
  const docs = a.renewalDocuments || {};
  const curStatus = a.renewalStatus || a.status;

  const fields = [
    ['Name', `${d.renewalFirstName || ''} ${d.renewalMiddleName || ''} ${d.renewalLastName || ''}`],
    ['Application ID / Member ID', a.applicationId || a.memberId],
    ['Renewal ID', a.renewalId || a.id],
    ['Renewal reason', a.renewalReason],
    ['Sex', d.renewalSex],
    ['Date of birth', d.renewalDob],
    ['Place of birth', d.renewalBirthPlace],
    ['Civil status', d.renewalCivilStatus],
    ['Passport number', d.renewalPassportNumber],
    ['Passport issue date', d.renewalPassportIssueDate],
    ['Passport issue place', d.renewalPassportIssuePlace],
    ['DFA Site', a.embassy],
    ['Present address', d.renewalPresentAddress],
    ['Permanent address', d.renewalPermanentAddress],
    ['Mobile', d.renewalMobile],
    ['Email', d.renewalEmail],
    ['Occupation', d.renewalOccupation],
    ['Employer / school', d.renewalEmployer],
    ['Emergency contact', d.renewalEmergencyName],
    ['Emergency contact address', d.renewalEmergencyAddress],
    ['Emergency contact number', d.renewalEmergencyPhone],
    ['Processing', a.processingType],
    ['Courier', a.courier],
    ['Total fee', `PHP ${Number(a.totalFee || 0).toLocaleString('en-PH')}`]
  ];

  const conditionalDocs = [
    ...(a.renewalReason === 'Citizen Status Changed' || docs.statusChangeCertificate
      ? [['Proof of Status Change Certificate', docs.statusChangeCertificate]]
      : []),
    ...(a.renewalReason === 'Passport is Lost' || docs.affidavitOfLoss
      ? [['Proof of Lost Passport (Affidavit of Loss)', docs.affidavitOfLoss]]
      : []),
    ...(a.renewalReason === 'Passport is Damaged' || docs.damagedPassportProof
      ? [['Proof of Damaged Passport (Affidavit of Loss / Mutilation)', docs.damagedPassportProof]]
      : [])
  ];

  return shell(`
    <section class="head">
      <div>
        <button class="secondary" onclick="go('renewals')">← Back to renewals</button>
        <h2>Renewal ${esc(a.renewalId || a.id)}</h2>
        <p>Verify applicant information and record a decision.</p>
      </div>
    </section>
    <section class="card">
      <h3>Applicant & Passport Details</h3>
      <div class="admin-renewal-detail-grid">
        ${fields.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v || 'Not provided')}</b></div>`).join('')}
      </div>
      <h3>Uploaded Documents</h3>
      <div class="admin-renewal-docs">
        <div><b>Legal Declaration</b><span>${esc(docs.legalDeclaration || 'No filename recorded')}</span></div>
        <div><b>Valid Government ID</b><span>${esc(docs.governmentId || 'No filename recorded')}</span></div>
        ${conditionalDocs.map(([label, filename]) => `<div><b>${esc(label)}</b><span>${esc(filename || 'No filename recorded')}</span></div>`).join('')}
        <p>Document names are recorded in this prototype. Secure file viewing requires connected file storage.</p>
      </div>
      <form onsubmit="saveRenewalDecision(event,'${esc(a.id)}','${esc(item.key)}')" class="admin-renewal-decision">
        <div class="field">
          <label>Review Decision</label>
          <select id="renewalAdminStatus">
            <option ${curStatus === 'Pending' ? 'selected' : ''}>Pending</option>
            <option ${curStatus === 'Under Review' ? 'selected' : ''}>Under Review</option>
            <option ${curStatus === 'Approved' ? 'selected' : ''}>Approved</option>
            <option ${curStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
          <p class="hint">Only review decisions are managed here. Processing and passport release updates belong to authorized downstream personnel or connected systems.</p>
        </div>
        <div class="field">
          <label>Administrator Remarks</label>
          <textarea id="renewalAdminRemarks" rows="4" placeholder="Add review notes; explain the reason if rejecting">${esc(a.administratorRemarks || '')}</textarea>
        </div>
        <button class="primary" type="submit">Save Status & Remarks</button>
      </form>
    </section>`, 'renewals');
}

function saveRenewalDecision(e, id, key) {
  e.preventDefault();
  if (!logged()) return;

  const list = jsonGet(key, []);
  const i = list.findIndex(a => a.id === id && a.type === 'Passport Renewal');
  if (i < 0) return;

  const status = document.getElementById('renewalAdminStatus').value;
  const remarks = document.getElementById('renewalAdminRemarks').value.trim();

  if (status === 'Rejected' && !remarks) {
    alert('Please add remarks explaining why the renewal was rejected.');
    return;
  }

  const existing = String(list[i].renewalStatus || list[i].status || 'Pending');
  if (['Processing', 'Ready for Release', 'Released / Collected'].includes(existing) && status !== existing) {
    alert('This application has moved beyond the review stage. Later processing and release statuses must be updated by authorized downstream personnel or connected systems.');
    return;
  }

  const now = new Date().toISOString();
  list[i].renewalStatus = status;
  list[i].status = status;
  list[i].administratorRemarks = remarks;
  list[i].updatedAt = now;
  jsonSet(key, list);
  go('renewal-detail', { id });
}

/* ==========================================================================
   8. New Passport Application Review
   ========================================================================== */

/** Scans all `baiApplications_<memberId>` keys (and `baiAccountRegistry` fallback) for New Passport records. */
function getAllNewApplications() {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('baiApplications_')) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(arr)) continue;
      arr.forEach((a, index) => {
        if (a.type === 'New Passport' && a.id && !seen.has(a.id)) {
          seen.add(a.id);
          out.push({ app: a, key, index });
        }
      });
    } catch {
      // Ignore malformed storage entries
    }
  }
  const registry = jsonGet('baiAccountRegistry', []);
  if (Array.isArray(registry)) {
    registry.forEach(acct => {
      if (!acct?.id || !Array.isArray(acct.applications)) return;
      const key = `baiApplications_${acct.id}`;
      acct.applications.forEach((a, index) => {
        if (a.type === 'New Passport' && a.id && !seen.has(a.id)) {
          seen.add(a.id);
          if (!localStorage.getItem(key)) jsonSet(key, acct.applications);
          out.push({ app: a, key, index });
        }
      });
    });
  }
  return out.sort((a, b) => String(b.app.createdAt || '').localeCompare(String(a.app.createdAt || '')));
}

function newAppStatus(a) {
  const s = String(a.status || 'Pending');
  return s.toUpperCase() === 'SUBMITTED' ? 'Pending' : s;
}

function newApplications() {
  const { params } = parseRoute();
  const status = params.get('status') || '';
  const items = getAllNewApplications().filter(x => !status || newAppStatus(x.app) === status);

  return shell(`
    <section class="head">
      <div>
        <h2>New Passport Application Management</h2>
        <p>Review new passport applications, verify documents, and record a decision.</p>
      </div>
      <div class="filters" style="margin:0">
        <select onchange="go('new-applications',this.value?{status:this.value}:{})">
          <option value="">All statuses</option>
          ${['Pending', 'Under Review', 'Approved', 'Processing', 'Ready for Release', 'COMPLETED', 'Rejected'].map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s === 'COMPLETED' ? 'Completed' : s}</option>`).join('')}
        </select>
      </div>
    </section>
    <section class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Application ID</th>
              <th>Applicant</th>
              <th>Applicant Type</th>
              <th>DFA Site</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.length
              ? items.map(x => {
                  const a = x.app;
                  const d = a.applicationDetails || {};
                  return `
                    <tr>
                      <td>
                        <b>${esc(a.id)}</b><br>
                        <small>Account: ${esc(a.applicationId || a.memberId || '—')}</small>
                      </td>
                      <td>
                        ${esc(`${d.npFirstName || ''} ${d.npLastName || ''}`.trim() || a.email || 'Member')}<br>
                        <small>${esc(a.contactEmail || a.email || '')}</small>
                      </td>
                      <td>${esc(a.applicantType || '—')}</td>
                      <td>${esc(a.embassy || a.preferredLocation || '—')}</td>
                      <td><span class="badge">${esc(newAppStatus(a))}</span></td>
                      <td><button class="small" onclick="go('new-application-detail',{id:'${esc(a.id)}'})">Review</button></td>
                    </tr>`;
                }).join('')
              : `<tr><td colspan="6">No new passport applications found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`, 'new-applications');
}

function newApplicationDetail() {
  const id = parseRoute().params.get('id') || '';
  const item = getAllNewApplications().find(x => x.app.id === id);
  if (!item) {
    return shell(`
      <section class="card">
        <h2>Application not found</h2>
        <button class="secondary" onclick="go('new-applications')">Back to new applications</button>
      </section>`, 'new-applications');
  }

  const a = item.app;
  const d = a.applicationDetails || {};
  const docs = a.applicationDocuments || {};
  const minor = String(a.applicantType || '').startsWith('Minor');
  const cur = newAppStatus(a);

  const fields = [
    ['Name', `${d.npFirstName || ''} ${d.npMiddleName || ''} ${d.npLastName || ''}`.replace(/\s+/g, ' ').trim()],
    ['Account ID / Member ID', a.applicationId || a.memberId],
    ['Application ID', a.id],
    ['Applicant type', a.applicantType],
    ['DFA Site', a.embassy || a.preferredLocation],
    ['Sex', d.npSex],
    ['Date of birth', d.npDob],
    ['Place of birth', d.npBirthPlace],
    ['Civil status', d.npCivilStatus],
    ['Father', d.npFatherName],
    ['Mother', d.npMotherName],
    ['Spouse', d.npSpouseName],
    ['Present address', d.npPresentAddress],
    ['Permanent address', d.npPermanentAddress],
    ['Mobile', d.npMobile],
    ['Email', d.npEmail],
    ['Occupation', d.npOccupation],
    ['Employer / school', d.npEmployer],
    ['Emergency contact', d.npEmergencyName],
    ['Emergency contact address', d.npEmergencyAddress],
    ['Emergency contact number', d.npEmergencyPhone],
    ['Processing', a.processingType],
    ['Courier', a.courier],
    ['Total fee', a.totalFee != null ? `PHP ${Number(a.totalFee || 0).toLocaleString('en-PH')}` : '']
  ];

  const docRows = [
    ['PSA Birth Certificate', docs.birthCertificate],
    ...(minor
      ? [['Parent / Guardian Consent', docs.parentConsent], ['Parent / Guardian ID', docs.parentId]]
      : [['Valid Government ID', docs.governmentId]])
  ];

  return shell(`
    <section class="head">
      <div>
        <button class="secondary" onclick="go('new-applications')">← Back to new applications</button>
        <h2>New Passport ${esc(a.id)}</h2>
        <p>Verify applicant information and record a decision.</p>
      </div>
    </section>
    <section class="card">
      <h3>Applicant Details</h3>
      <div class="admin-renewal-detail-grid">
        ${fields.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v || 'Not provided')}</b></div>`).join('')}
      </div>
      <h3>Uploaded Documents</h3>
      <div class="admin-renewal-docs">
        ${docRows.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v || 'No filename recorded')}</span></div>`).join('')}
        <p>Document names are recorded in this prototype. Secure file viewing requires connected file storage.</p>
      </div>
      <form onsubmit="saveNewApplicationDecision(event,'${esc(a.id)}','${esc(item.key)}')" class="admin-renewal-decision">
        <div class="field">
          <label>Review Decision</label>
          <select id="newAppAdminStatus">
            ${['Pending', 'Under Review', 'Approved', 'Rejected'].map(s => `<option ${cur === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <p class="hint">Only review decisions are managed here. Processing and passport release updates belong to authorized downstream personnel or connected systems.</p>
        </div>
        <div class="field">
          <label>Administrator Remarks</label>
          <textarea id="newAppAdminRemarks" rows="4" placeholder="Add review notes; explain the reason if rejecting">${esc(a.administratorRemarks || '')}</textarea>
        </div>
        <button class="primary" type="submit">Save Status & Remarks</button>
      </form>
    </section>`, 'new-applications');
}

function saveNewApplicationDecision(e, id, key) {
  e.preventDefault();
  if (!logged()) return;

  const list = jsonGet(key, []);
  const i = list.findIndex(a => a.id === id && a.type === 'New Passport');
  if (i < 0) return;

  const status = document.getElementById('newAppAdminStatus').value;
  const remarks = document.getElementById('newAppAdminRemarks').value.trim();

  if (status === 'Rejected' && !remarks) {
    alert('Please add remarks explaining why the application was rejected.');
    return;
  }

  const existing = newAppStatus(list[i]);
  if (['Processing', 'Ready for Release', 'Released / Collected', 'Completed', 'Passport Printed'].includes(existing) && status !== existing) {
    alert('This application has moved beyond the review stage. Later processing and release statuses must be updated by authorized downstream personnel or connected systems.');
    return;
  }

  list[i].status = status;
  list[i].administratorRemarks = remarks;
  list[i].updatedAt = new Date().toISOString();
  jsonSet(key, list);
  go('new-application-detail', { id });
}

/* ==========================================================================
   9. Master View Router & Bootstrap
   ========================================================================== */

function render() {
  stopEnquiryRealtime();
  const page = (location.hash || '#login').slice(1).split('?')[0];

  if (!logged()) {
    app.innerHTML = login();
    return;
  }

  const views = {
    create,
    enquiries: enquiryDashboard,
    'admin-enquiry': adminEnquiry,
    renewals,
    'renewal-detail': renewalDetail,
    'new-applications': newApplications,
    'new-application-detail': newApplicationDetail
  };

  app.innerHTML = (views[page] || dashboard)();
  startEnquiryRealtime(page);
}

window.addEventListener('hashchange', render);
window.addEventListener('storage', e => {
  if (!e.key || e.key.startsWith('baiApplications_') || e.key === 'baiAccountRegistry') {
    const page = (location.hash || '#login').slice(1).split('?')[0];
    if (['renewals', 'new-applications'].includes(page)) render();
  }
});
render();
