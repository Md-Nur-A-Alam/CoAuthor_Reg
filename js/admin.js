/**
 * IEEE i-COSTE 2026 Organizer Admin Dashboard Logic
 * Interactive responsive dashboard, bento metrics, photo downloads,
 * individual/bulk CSV exports, and executive dossier modal.
 */

let sessionToken = sessionStorage.getItem('icoste_admin_token') || null;
let currentRole = sessionStorage.getItem('icoste_admin_role') || null;
let currentUsername = sessionStorage.getItem('icoste_admin_username') || null;

let allSubmissions = [];
let currentDetailSubmission = null;
let pendingDelete = null;
let countdownInterval = null;
let sessionRemainingSeconds = 20 * 60; // 20-min sliding cache

document.addEventListener('DOMContentLoaded', () => {
  if (sessionToken) {
    showDashboardView();
    loadSubmissions();
    startCountdown();
  } else {
    showLoginView();
  }

  initLogin();
  initLogout();
  initSearchAndFilter();
  initModals();
  initSyncAndExport();
});

/**
 * Toast Notification System
 */
window.showToast = function(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-5 right-5 z-[99999] flex flex-col gap-2 max-w-sm';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-error text-white' : (type === 'info' ? 'bg-primary text-white' : 'bg-emerald-600 text-white');
  const icon = type === 'error' ? 'error' : (type === 'info' ? 'info' : 'check_circle');

  toast.className = `${bgClass} px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold transform transition-all duration-300 translate-y-4 opacity-0`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">${icon}</span>
    <span class="flex-1">${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger smooth entrance animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

function showLoginView() {
  sessionToken = null;
  sessionStorage.removeItem('icoste_admin_token');
  sessionStorage.removeItem('icoste_admin_role');
  sessionStorage.removeItem('icoste_admin_username');

  document.getElementById('login-container').classList.remove('hidden');
  document.getElementById('dashboard-container').classList.add('hidden');
  if (countdownInterval) clearInterval(countdownInterval);
}

function showDashboardView() {
  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('dashboard-container').classList.remove('hidden');

  if (currentUsername) {
    document.getElementById('admin-user-display').textContent = currentUsername;
  }
  if (currentRole) {
    document.getElementById('admin-role-badge').textContent = currentRole;
  }
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  sessionRemainingSeconds = 20 * 60;

  const timerEl = document.getElementById('cache-countdown');
  countdownInterval = setInterval(() => {
    sessionRemainingSeconds--;
    if (sessionRemainingSeconds <= 0) {
      clearInterval(countdownInterval);
      alert('Your 20-minute admin session has expired. Please log in again.');
      showLoginView();
      return;
    }
    const mins = Math.floor(sessionRemainingSeconds / 60);
    const secs = sessionRemainingSeconds % 60;
    if (timerEl) {
      timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs} remaining`;
    }
  }, 1000);
}

/**
 * Admin Login Handler
 */
function initLogin() {
  const form = document.getElementById('admin-login-form');
  const btn = document.getElementById('btn-login');
  const btnText = document.getElementById('btn-login-text');
  const btnSpinner = document.getElementById('btn-login-spinner');
  const errBox = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('hidden');

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
      errBox.textContent = 'Please enter both username and password.';
      errBox.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btnSpinner.classList.remove('hidden');
    btnText.textContent = 'Authenticating...';

    try {
      const res = await Api.adminLogin(username, password);
      if (res && res.success && res.token) {
        sessionToken = res.token;
        currentRole = res.role || 'super_admin';
        currentUsername = res.username || username;

        sessionStorage.setItem('icoste_admin_token', sessionToken);
        sessionStorage.setItem('icoste_admin_role', currentRole);
        sessionStorage.setItem('icoste_admin_username', currentUsername);

        showDashboardView();
        loadSubmissions();
        startCountdown();
        showToast(`Welcome back, ${currentUsername}!`, 'success');
      } else {
        errBox.textContent = (res && res.error) || 'Invalid login credentials.';
        errBox.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Login error:', err);
      errBox.textContent = 'Failed to connect to admin server. Please try again.';
      errBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Sign In to Dashboard';
    }
  });
}

/**
 * Logout Handler
 */
function initLogout() {
  const btn = document.getElementById('btn-logout');
  if (btn) {
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to end your admin session?')) {
        if (sessionToken) Api.adminLogout(sessionToken).catch(() => {});
        showLoginView();
      }
    });
  }
}

/**
 * Fetch and Render Submissions
 */
async function loadSubmissions(silent = false) {
  const icon = document.getElementById('refresh-icon');
  if (icon) icon.classList.add('animate-spin');

  try {
    const res = await Api.getResponses(sessionToken);
    if (res && res.success) {
      allSubmissions = res.submissions || [];
      updateBentoMetrics(allSubmissions);
      applyFilters();
      sessionRemainingSeconds = 20 * 60; // Refresh sliding session
      if (!silent) showToast(`Synced ${allSubmissions.length} submissions with Google Sheet.`, 'info');
    } else {
      if (res && res.error && res.error.toLowerCase().includes('token')) {
        alert('Session expired. Please log in again.');
        showLoginView();
      } else {
        console.warn('Could not load submissions:', res);
      }
    }
  } catch (err) {
    console.error('Load submissions error:', err);
    if (!silent) showToast('Failed to sync sheet data: ' + err.message, 'error');
  } finally {
    if (icon) icon.classList.remove('animate-spin');
  }
}

/**
 * Calculate and Display Bento Metrics
 */
function updateBentoMetrics(data) {
  const metricTotal = document.getElementById('metric-total');
  const metricVerified = document.getElementById('metric-verified');
  const metricAssets = document.getElementById('metric-assets');

  const total = data.length;
  if (metricTotal) metricTotal.textContent = total;

  let assetsCount = 0;
  let completeCredentials = 0;

  data.forEach(item => {
    let imagesPresent = 0;
    ['ppPhoto', 'studentIdCard', 'regCard', 'signature'].forEach(k => {
      const obj = item[k];
      if (obj && (obj.imgbb || obj.postimage || obj.preferred)) {
        imagesPresent++;
        if (obj.imgbb) assetsCount++;
        if (obj.postimage) assetsCount++;
      }
    });
    if (imagesPresent === 4) completeCredentials++;
  });

  if (metricAssets) metricAssets.textContent = assetsCount;
  if (metricVerified) {
    const pct = total > 0 ? Math.round((completeCredentials / total) * 100) : 100;
    metricVerified.textContent = `${pct}%`;
  }
}

/**
 * Filter & Search Submissions
 */
function applyFilters() {
  const searchInput = document.getElementById('admin-search-input');
  const divisionFilter = document.getElementById('admin-division-filter');
  const q = (searchInput ? searchInput.value.trim().toLowerCase() : '');
  const div = (divisionFilter ? divisionFilter.value : '');

  const filtered = allSubmissions.filter(sub => {
    if (div && sub.presentDivision !== div && sub.permanentDivision !== div) {
      return false;
    }
    if (q) {
      const searchable = [
        sub.fullName, sub.firstName, sub.lastName, sub.studentId,
        sub.email, sub.primaryPhone, sub.universityName, sub.departmentName, sub.sl
      ].map(v => String(v || '').toLowerCase()).join(' ');

      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const countBadge = document.getElementById('results-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} Registration${filtered.length === 1 ? '' : 's'}`;
  }

  renderDesktopTable(filtered);
  renderMobileCards(filtered);

  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
  }
}

/**
 * Render Desktop Table View with Interactive Row Clicking
 */
function renderDesktopTable(data) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = '';
    return;
  }

  let html = '';
  data.forEach((sub, idx) => {
    const originalIndex = allSubmissions.indexOf(sub);
    const avatarUrl = (sub.ppPhoto && (sub.ppPhoto.preferred || sub.ppPhoto.imgbb || sub.ppPhoto.postimage)) || '';
    const initial = (sub.fullName ? sub.fullName.charAt(0).toUpperCase() : 'A');

    html += `
      <tr class="table-row-hover transition-all border-b border-surface-container-high group" onclick="handleRowClick(event, ${originalIndex})">
        <td class="py-3 px-4 font-black text-primary whitespace-nowrap">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-xs">
            #${escapeHtml(sub.sl || (idx + 1))}
          </span>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2.5">
            ${avatarUrl ? 
              `<img src="${escapeHtml(avatarUrl)}" class="w-9 h-9 rounded-full object-cover shrink-0 border border-surface-container-high shadow-xs cursor-pointer hover:scale-110 transition-transform" onclick="event.stopPropagation(); openLightbox('${escapeHtml(avatarUrl)}', '${escapeHtml(sub.fullName || '')} - Passport Photo')">` :
              `<div class="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">${initial}</div>`
            }
            <div class="min-w-0">
              <span class="font-bold text-on-surface block truncate max-w-[170px] group-hover:text-primary transition-colors">${escapeHtml(sub.fullName || '-')}</span>
              <span class="text-[11px] text-on-surface-variant block truncate">${escapeHtml(sub.email || '-')}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 font-semibold text-on-surface whitespace-nowrap">
          <code class="px-1.5 py-0.5 rounded bg-surface-container text-xs font-mono">${escapeHtml(sub.studentId || '-')}</code>
        </td>
        <td class="py-3 px-4">
          <div class="min-w-0 max-w-[180px]">
            <span class="font-semibold text-on-surface block truncate">${escapeHtml(sub.universityName || '-')}</span>
            <span class="text-[10px] text-on-surface-variant block truncate">${escapeHtml(sub.departmentName || '-')}</span>
          </div>
        </td>
        <td class="py-3 px-4 whitespace-nowrap">
          <span class="font-medium text-on-surface block text-xs">${escapeHtml(sub.primaryPhone || '-')}</span>
        </td>
        <td class="py-3 px-4 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[11px] font-medium">
            ${escapeHtml(sub.presentDivision || '-')}
          </span>
        </td>
        <td class="py-3 px-4" onclick="event.stopPropagation()">
          <div class="flex items-center gap-1">
            ${renderMiniDocBadge('PP', sub.ppPhoto, sub.fullName, 'Passport')}
            ${renderMiniDocBadge('ID', sub.studentIdCard, sub.fullName, 'StudentID')}
            ${renderMiniDocBadge('Reg', sub.regCard, sub.fullName, 'RegCard')}
            ${renderMiniDocBadge('Sign', sub.signature, sub.fullName, 'Signature')}
          </div>
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap" onclick="event.stopPropagation()">
          <div class="flex items-center justify-end gap-1.5">
            <button class="px-2.5 py-1 rounded-lg bg-primary-fixed text-primary hover:bg-primary hover:text-white transition-all text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer" onclick="viewDetail(${originalIndex})" title="View Complete Dossier">
              <span class="material-symbols-outlined text-[14px]">visibility</span>
              <span>Details</span>
            </button>
            <button class="p-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-white text-on-surface-variant transition-colors cursor-pointer" title="Export this User to CSV" onclick="exportSingleUserCSV(${originalIndex})">
              <span class="material-symbols-outlined text-[15px]">download</span>
            </button>
            <button class="p-1 rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors cursor-pointer" title="Delete Submission" onclick="promptDelete(${originalIndex})">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

window.handleRowClick = function(e, index) {
  // If user clicked a button or link inside row, don't open modal
  if (e.target.closest('button') || e.target.closest('a')) return;
  viewDetail(index);
};

/**
 * Render Mobile Cards View
 */
function renderMobileCards(data) {
  const container = document.getElementById('mobile-cards-container');
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  data.forEach((sub, idx) => {
    const originalIndex = allSubmissions.indexOf(sub);
    const avatarUrl = (sub.ppPhoto && (sub.ppPhoto.preferred || sub.ppPhoto.imgbb || sub.ppPhoto.postimage)) || '';
    const initial = (sub.fullName ? sub.fullName.charAt(0).toUpperCase() : 'A');

    html += `
      <div class="interactive-card bg-surface-container-low rounded-2xl p-4 border border-surface-container-high flex flex-col gap-3 shadow-xs cursor-pointer" onclick="viewDetail(${originalIndex})">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            ${avatarUrl ? 
              `<img src="${escapeHtml(avatarUrl)}" class="w-12 h-12 rounded-xl object-cover shrink-0 border border-surface-container-high shadow-xs cursor-pointer" onclick="event.stopPropagation(); openLightbox('${escapeHtml(avatarUrl)}', '${escapeHtml(sub.fullName || '')}')">` :
              `<div class="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">${initial}</div>`
            }
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-black text-primary text-xs">#${escapeHtml(sub.sl || (idx + 1))}</span>
                <h4 class="font-bold text-sm text-on-surface leading-tight">${escapeHtml(sub.fullName || '-')}</h4>
              </div>
              <p class="text-[11px] text-on-surface-variant">${escapeHtml(sub.studentId || '-')} • ${escapeHtml(sub.universityName || '-')}</p>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold">
            ${escapeHtml(sub.presentDivision || '-')}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] bg-surface-container-lowest p-2.5 rounded-xl border border-surface-container-high/60">
          <div>
            <span class="text-on-surface-variant block text-[10px]">Email</span>
            <span class="font-medium text-on-surface truncate block">${escapeHtml(sub.email || '-')}</span>
          </div>
          <div>
            <span class="text-on-surface-variant block text-[10px]">Phone</span>
            <span class="font-medium text-on-surface block">${escapeHtml(sub.primaryPhone || '-')}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1" onclick="event.stopPropagation()">
          <div class="flex items-center gap-1">
            ${renderMiniDocBadge('PP', sub.ppPhoto, sub.fullName, 'Passport')}
            ${renderMiniDocBadge('ID', sub.studentIdCard, sub.fullName, 'StudentID')}
            ${renderMiniDocBadge('Reg', sub.regCard, sub.fullName, 'RegCard')}
            ${renderMiniDocBadge('Sign', sub.signature, sub.fullName, 'Signature')}
          </div>
          <div class="flex items-center gap-1.5">
            <button class="p-1.5 rounded-lg bg-surface-container-high hover:bg-primary hover:text-white text-on-surface transition-colors" title="Export User CSV" onclick="exportSingleUserCSV(${originalIndex})">
              <span class="material-symbols-outlined text-[16px]">download</span>
            </button>
            <button class="px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-xs" onclick="viewDetail(${originalIndex})">
              Dossier
            </button>
            <button class="p-1.5 rounded-lg bg-surface-container text-outline hover:text-error" onclick="promptDelete(${originalIndex})">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderMiniDocBadge(label, imgObj, fullName = 'User', docType = 'Doc') {
  if (!imgObj || (!imgObj.imgbb && !imgObj.postimage && !imgObj.preferred)) {
    return `<span class="px-1.5 py-0.5 rounded bg-surface-container text-outline text-[9px] font-semibold">${label}</span>`;
  }
  const url = imgObj.preferred || imgObj.imgbb || imgObj.postimage;
  const filename = `${fullName.replace(/\s+/g, '_')}_${docType}.jpg`;

  return `
    <div class="inline-flex items-center rounded-lg bg-emerald-100 text-emerald-800 text-[9px] font-bold overflow-hidden shadow-2xs">
      <button type="button" class="px-1.5 py-0.5 hover:bg-emerald-200 transition-colors flex items-center gap-0.5 cursor-pointer" onclick="openLightbox('${escapeHtml(url)}', '${label} Preview - ${escapeHtml(fullName)}')">
        <span class="material-symbols-outlined text-[11px]">visibility</span>
        <span>${label}</span>
      </button>
      <button type="button" class="px-1 py-0.5 bg-emerald-200/80 hover:bg-emerald-300 transition-colors cursor-pointer border-l border-emerald-300" title="Download ${label}" onclick="downloadPicture('${escapeHtml(url)}', '${escapeHtml(filename)}')">
        <span class="material-symbols-outlined text-[11px]">download</span>
      </button>
    </div>
  `;
}

/**
 * Universal Picture Downloader
 */
window.downloadPicture = async function(url, filename = 'document.jpg') {
  if (!url) return;
  showToast(`Initiating download for ${filename}...`, 'info');

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    showToast(`Downloaded: ${filename}`, 'success');
  } catch (err) {
    console.warn('Cross-origin direct download blocked, opening in new tab:', err);
    window.open(url, '_blank');
  }
};

/**
 * Download All 4 Photos of a Candidate
 */
window.downloadAllCandidatePhotos = async function(index) {
  const sub = allSubmissions[index];
  if (!sub) return;

  const nameSlug = (sub.fullName || 'Candidate').replace(/\s+/g, '_');
  const sl = sub.sl || (index + 1);

  const photos = [
    { label: 'Passport', obj: sub.ppPhoto },
    { label: 'StudentID', obj: sub.studentIdCard },
    { label: 'RegCard', obj: sub.regCard },
    { label: 'Signature', obj: sub.signature }
  ];

  showToast(`Downloading all available photos for ${sub.fullName}...`, 'info');

  let downloadedCount = 0;
  for (const p of photos) {
    const url = p.obj && (p.obj.preferred || p.obj.imgbb || p.obj.postimage);
    if (url) {
      await downloadPicture(url, `SL${sl}_${nameSlug}_${p.label}.jpg`);
      downloadedCount++;
      // Small pause between downloads to prevent browser throttling
      await new Promise(r => setTimeout(r, 600));
    }
  }

  if (downloadedCount === 0) {
    showToast('No photos found for this candidate.', 'error');
  }
};

/**
 * Export Individual User to CSV
 */
window.exportSingleUserCSV = function(index) {
  const sub = allSubmissions[index];
  if (!sub) return;

  const headers = [
    "Timestamp", "SL", "First Name", "Last Name", "Full Name",
    "Date of Birth", "Gender", "Nationality", "Blood Group",
    "University Name", "Department Name", "Program / Degree", "Batch",
    "Student ID", "Level-Term", "Primary Phone Number", "Alternative Phone Number",
    "Email Address", "Facebook Profile Link", "LinkedIn Profile Link",
    "Present Address", "Present_Division", "Present_District",
    "Permanent Address", "Permanent_Division", "Permanent_District",
    "PP Size Photo", "NID Number", "Declaration", "Paper ID", "Paper Title",
    "PP Size Photo (ImgBB)", "PP Size Photo (PostImage)",
    "Student ID Card Picture (ImgBB)", "Student ID Card Picture (PostImage)",
    "(SSC/HSC) Registration Card Picture (ImgBB)", "(SSC/HSC) Registration Card Picture (PostImage)",
    "Applicant's Signature (ImgBB)", "Applicant's Signature (PostImage)"
  ];

  const row = [
    sub.timestamp || '',
    sub.sl || (index + 1),
    sub.firstName || '',
    sub.lastName || '',
    sub.fullName || '',
    sub.dob || '',
    sub.gender || '',
    sub.nationality || '',
    sub.bloodGroup || '',
    sub.universityName || '',
    sub.departmentName || '',
    sub.programDegree || '',
    sub.batch || '',
    sub.studentId || '',
    sub.levelTerm || '',
    sub.primaryPhone || '',
    sub.altPhone || '',
    sub.email || '',
    sub.fbProfile || '',
    sub.linkedInProfile || '',
    sub.presentAddress || '',
    sub.presentDivision || '',
    sub.presentDistrict || '',
    sub.permanentAddress || '',
    sub.permanentDivision || '',
    sub.permanentDistrict || '',
    (sub.ppPhoto && (sub.ppPhoto.preferred || sub.ppPhoto.imgbb || sub.ppPhoto.postimage)) || '',
    sub.nidNumber || '',
    sub.declaration || 'Agreed',
    sub.paperId || '',
    sub.paperTitle || '',
    (sub.ppPhoto && sub.ppPhoto.imgbb) || '',
    (sub.ppPhoto && sub.ppPhoto.postimage) || '',
    (sub.studentIdCard && sub.studentIdCard.imgbb) || '',
    (sub.studentIdCard && sub.studentIdCard.postimage) || '',
    (sub.regCard && sub.regCard.imgbb) || '',
    (sub.regCard && sub.regCard.postimage) || '',
    (sub.signature && sub.signature.imgbb) || '',
    (sub.signature && sub.signature.postimage) || ''
  ].map(escapeCsvCell);

  const csvContent = "\uFEFF" + [headers.join(','), row.join(',')].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nameSlug = (sub.fullName || 'Candidate').replace(/\s+/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `IEEE_iCOSTE_SL${sub.sl || (index + 1)}_${nameSlug}_Dossier.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported CSV for ${sub.fullName}`, 'success');
};

/**
 * View Detailed Dossier Modal ("In a Good Manner")
 */
window.viewDetail = function(index) {
  const sub = allSubmissions[index];
  if (!sub) return;
  currentDetailSubmission = index;

  document.getElementById('modal-sl-badge').textContent = `SL #${sub.sl || (index + 1)}`;
  document.getElementById('modal-heading-title').textContent = sub.fullName || 'Candidate Dossier';

  const avatarUrl = (sub.ppPhoto && (sub.ppPhoto.preferred || sub.ppPhoto.imgbb || sub.ppPhoto.postimage)) || '';
  const initial = (sub.fullName ? sub.fullName.charAt(0).toUpperCase() : 'A');

  const body = document.getElementById('modal-content-body');
  body.innerHTML = `
    <!-- Executive Profile Top Banner -->
    <div class="p-5 rounded-2xl bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-low border border-primary/20 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 shadow-sm">
      <div class="flex items-center gap-4 text-center sm:text-left">
        ${avatarUrl ? 
          `<img src="${escapeHtml(avatarUrl)}" class="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform" onclick="openLightbox('${escapeHtml(avatarUrl)}', '${escapeHtml(sub.fullName || '')} - Passport Photo')">` :
          `<div class="w-16 h-16 rounded-2xl bg-primary text-white font-extrabold flex items-center justify-center text-xl shadow-md">${initial}</div>`
        }
        <div>
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 class="text-xl font-extrabold text-on-surface">${escapeHtml(sub.fullName || '-')}</h3>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">Verified Co-Author</span>
          </div>
          <p class="text-xs text-on-surface-variant mt-0.5">
            <strong>ID:</strong> ${escapeHtml(sub.studentId || '-')} • <strong>Dept:</strong> ${escapeHtml(sub.departmentName || '-')} • ${escapeHtml(sub.universityName || '-')}
          </p>
          <span class="inline-flex items-center gap-1 text-[11px] text-primary font-semibold mt-1">
            <span class="material-symbols-outlined text-[14px]">calendar_today</span>
            Submitted: ${escapeHtml(sub.timestamp || 'Recorded')}
          </span>
        </div>
      </div>

      <!-- Quick Action Toolbar in Modal -->
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button type="button" class="btn-interactive px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer" onclick="downloadAllCandidatePhotos(${index})">
          <span class="material-symbols-outlined text-[16px]">cloud_download</span>
          <span>Download 4 Photos</span>
        </button>
        <button type="button" class="btn-interactive px-3 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-container text-primary text-xs font-bold flex items-center gap-1 cursor-pointer" onclick="exportSingleUserCSV(${index})">
          <span class="material-symbols-outlined text-[16px]">table_chart</span>
          <span>Export User CSV</span>
        </button>
      </div>
    </div>

    <!-- Target Paper Information -->
    <div class="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
          <span class="material-symbols-outlined text-[15px]">science</span>
          Target Accepted Manuscript
        </span>
        <span class="text-[10px] text-on-surface-variant font-semibold">IEEE i-COSTE 2026</span>
      </div>
      <h4 class="font-extrabold text-sm sm:text-base text-on-surface leading-snug">
        "${escapeHtml(sub.paperTitle || 'MediNet_XG: An Explainable Deep Learning Framework for Medicinal Plant Leaf Identification using Grad-CAM')}"
      </h4>
    </div>

    <!-- Personal & Academic Credentials Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      <!-- Personal Info Card -->
      <div class="p-4 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
        <div class="flex items-center gap-2 pb-2 border-b border-surface-container-high text-on-surface font-bold text-xs">
          <span class="material-symbols-outlined text-primary text-[18px]">person</span>
          <span>Personal Details</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><strong class="text-on-surface-variant block text-[10px] uppercase">First Name</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.firstName || '-')}</span></div>
          <div><strong class="text-on-surface-variant block text-[10px] uppercase">Last Name</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.lastName || '-')}</span></div>
          <div><strong class="text-on-surface-variant block text-[10px] uppercase">Date of Birth</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.dob || '-')}</span></div>
          <div><strong class="text-on-surface-variant block text-[10px] uppercase">Gender</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.gender || '-')}</span></div>
          <div><strong class="text-on-surface-variant block text-[10px] uppercase">Blood Group</strong> <span class="px-2 py-0.5 rounded bg-error/10 text-error font-bold text-xs inline-block">${escapeHtml(sub.bloodGroup || '-')}</span></div>
          <div><strong class="text-on-surface-variant block text-[10px] uppercase">Nationality</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.nationality || '-')}</span></div>
        </div>
        <div class="pt-2 border-t border-surface-container-high text-xs">
          <strong class="text-on-surface-variant block text-[10px] uppercase">National ID (NID)</strong>
          <code class="px-2 py-1 rounded bg-surface-container font-mono text-xs font-semibold text-primary inline-block mt-0.5">${escapeHtml(sub.nidNumber || '-')}</code>
        </div>
      </div>

      <!-- Academic Credentials Card -->
      <div class="p-4 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
        <div class="flex items-center gap-2 pb-2 border-b border-surface-container-high text-on-surface font-bold text-xs">
          <span class="material-symbols-outlined text-primary text-[18px]">school</span>
          <span>Academic Affiliation</span>
        </div>
        <div class="space-y-1.5 text-xs">
          <div><strong class="text-on-surface-variant block text-[10px] uppercase">University / Institution</strong> <span class="font-bold text-on-surface">${escapeHtml(sub.universityName || '-')}</span></div>
          <div><strong class="text-on-surface-variant block text-[10px] uppercase">Department</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.departmentName || '-')}</span></div>
          <div class="grid grid-cols-2 gap-2 pt-1">
            <div><strong class="text-on-surface-variant block text-[10px] uppercase">Program / Degree</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.programDegree || '-')}</span></div>
            <div><strong class="text-on-surface-variant block text-[10px] uppercase">Batch / Intake</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.batch || '-')}</span></div>
            <div><strong class="text-on-surface-variant block text-[10px] uppercase">Student ID / Roll</strong> <span class="font-bold text-primary">${escapeHtml(sub.studentId || '-')}</span></div>
            <div><strong class="text-on-surface-variant block text-[10px] uppercase">Level / Term</strong> <span class="font-medium text-on-surface">${escapeHtml(sub.levelTerm || '-')}</span></div>
          </div>
        </div>
      </div>

    </div>

    <!-- Contact & Geography Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      <!-- Contact Details -->
      <div class="p-4 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
        <div class="flex items-center gap-2 pb-2 border-b border-surface-container-high text-on-surface font-bold text-xs">
          <span class="material-symbols-outlined text-primary text-[18px]">contact_phone</span>
          <span>Contact Coordinates</span>
        </div>
        <div class="space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-on-surface-variant">Primary BD Phone:</span>
            <a href="tel:${escapeHtml(sub.primaryPhone || '')}" class="font-bold text-primary hover:underline flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">call</span>
              ${escapeHtml(sub.primaryPhone || '-')}
            </a>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-on-surface-variant">Alternative Phone:</span>
            <span class="font-medium text-on-surface">${escapeHtml(sub.altPhone || '-')}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-on-surface-variant">Official Email:</span>
            <a href="mailto:${escapeHtml(sub.email || '')}" class="font-bold text-primary hover:underline flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">mail</span>
              ${escapeHtml(sub.email || '-')}
            </a>
          </div>
          <div class="flex items-center justify-between pt-1 border-t border-surface-container-high">
            <span class="text-on-surface-variant">LinkedIn:</span>
            ${sub.linkedInProfile ? 
              `<a href="${escapeHtml(sub.linkedInProfile)}" target="_blank" class="px-2 py-0.5 rounded bg-primary-fixed text-primary font-bold text-[11px] hover:underline flex items-center gap-1">
                <span>View Profile</span>
                <span class="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>` : '-'
            }
          </div>
          <div class="flex items-center justify-between">
            <span class="text-on-surface-variant">Facebook:</span>
            ${sub.fbProfile ? 
              `<a href="${escapeHtml(sub.fbProfile)}" target="_blank" class="text-primary hover:underline text-[11px] flex items-center gap-1">
                <span>View Profile</span>
                <span class="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>` : '-'
            }
          </div>
        </div>
      </div>

      <!-- Address Comparison -->
      <div class="p-4 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
        <div class="flex items-center gap-2 pb-2 border-b border-surface-container-high text-on-surface font-bold text-xs">
          <span class="material-symbols-outlined text-primary text-[18px]">home_pin</span>
          <span>Residential Addresses</span>
        </div>
        <div class="space-y-3 text-xs">
          <div>
            <div class="flex items-center justify-between mb-0.5">
              <strong class="text-primary text-[11px] uppercase">Present Address</strong>
              <span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-semibold">
                ${escapeHtml(sub.presentDistrict || '')}, ${escapeHtml(sub.presentDivision || '')}
              </span>
            </div>
            <p class="text-on-surface bg-surface-container-lowest p-2 rounded-lg border border-surface-container-high/60 leading-relaxed">
              ${escapeHtml(sub.presentAddress || '-')}
            </p>
          </div>
          <div>
            <div class="flex items-center justify-between mb-0.5">
              <strong class="text-secondary text-[11px] uppercase">Permanent Address</strong>
              <span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-semibold">
                ${escapeHtml(sub.permanentDistrict || '')}, ${escapeHtml(sub.permanentDivision || '')}
              </span>
            </div>
            <p class="text-on-surface bg-surface-container-lowest p-2 rounded-lg border border-surface-container-high/60 leading-relaxed">
              ${escapeHtml(sub.permanentAddress || '-')}
            </p>
          </div>
        </div>
      </div>

    </div>

    <!-- Document Media Vault (4 Pictures with Direct Download) -->
    <div class="p-4 bg-surface-container-low rounded-xl border border-surface-container-high">
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-surface-container-high">
        <span class="text-xs font-bold text-on-surface flex items-center gap-1.5">
          <span class="material-symbols-outlined text-primary text-[18px]">photo_library</span>
          Uploaded Cloud Media Documents (4 Pictures)
        </span>
        <button type="button" class="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer" onclick="downloadAllCandidatePhotos(${index})">
          <span class="material-symbols-outlined text-[15px]">download</span>
          Download All 4
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        ${renderModalDocSlot('1. Passport Photo', sub.ppPhoto, sub.fullName, 'Passport')}
        ${renderModalDocSlot('2. Student ID Card', sub.studentIdCard, sub.fullName, 'StudentID')}
        ${renderModalDocSlot('3. SSC/HSC Reg Card', sub.regCard, sub.fullName, 'RegCard')}
        ${renderModalDocSlot('4. Signature Scan', sub.signature, sub.fullName, 'Signature')}
      </div>
    </div>
  `;

  const modal = document.getElementById('detail-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

function renderModalDocSlot(label, imgObj, fullName = 'User', docType = 'Doc') {
  const url = (imgObj && (imgObj.preferred || imgObj.imgbb || imgObj.postimage)) || '';
  const filename = `SL_${fullName.replace(/\s+/g, '_')}_${docType}.jpg`;

  if (!url) {
    return `
      <div class="p-4 rounded-xl bg-surface-container-lowest border border-dashed border-surface-container-high text-center flex flex-col items-center justify-center min-h-[140px]">
        <span class="material-symbols-outlined text-[24px] text-outline mb-1">image_not_supported</span>
        <span class="text-[11px] font-semibold text-on-surface-variant">${label}</span>
        <span class="text-[10px] text-error mt-0.5">Not Uploaded</span>
      </div>
    `;
  }

  return `
    <div class="interactive-card p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high flex flex-col justify-between shadow-2xs group">
      <div>
        <div class="relative overflow-hidden rounded-lg bg-surface-container-low mb-2 border border-surface-container-high cursor-pointer" onclick="openLightbox('${escapeHtml(url)}', '${label} - ${escapeHtml(fullName)}')">
          <img src="${escapeHtml(url)}" class="w-full h-28 object-contain p-1 group-hover:scale-105 transition-transform">
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-[11px] font-bold backdrop-blur-[2px]">
            <span class="material-symbols-outlined text-[16px]">zoom_in</span>
            <span>Enlarge</span>
          </div>
        </div>
        <span class="text-xs font-bold text-on-surface block truncate mb-1">${label}</span>
      </div>

      <div class="space-y-1.5 pt-2 border-t border-surface-container-high/60">
        <!-- Direct Download Button -->
        <button type="button" class="btn-interactive w-full py-1.5 px-2 rounded-lg bg-primary text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer" onclick="downloadPicture('${escapeHtml(url)}', '${escapeHtml(filename)}')">
          <span class="material-symbols-outlined text-[14px]">download</span>
          <span>Download Picture</span>
        </button>

        <!-- Cloud Direct Links -->
        <div class="flex items-center justify-between text-[10px] text-on-surface-variant pt-0.5">
          ${imgObj.imgbb ? `<a href="${escapeHtml(imgObj.imgbb)}" target="_blank" class="text-primary hover:underline flex items-center gap-0.5"><span>ImgBB</span><span class="material-symbols-outlined text-[11px]">open_in_new</span></a>` : '<span class="text-outline">ImgBB: -</span>'}
          <span class="text-outline-variant">•</span>
          ${imgObj.postimage ? `<a href="${escapeHtml(imgObj.postimage)}" target="_blank" class="text-primary hover:underline flex items-center gap-0.5"><span>PostImage</span><span class="material-symbols-outlined text-[11px]">open_in_new</span></a>` : '<span class="text-outline">PostImg: -</span>'}
        </div>
      </div>
    </div>
  `;
}

/**
 * Trigger Delete Dialog
 */
window.promptDelete = function(index) {
  pendingDelete = index;
  const sub = allSubmissions[index];
  const desc = document.getElementById('delete-modal-desc');
  if (desc && sub) {
    desc.innerHTML = `Are you sure you want to permanently delete registration <strong>SL #${escapeHtml(sub.sl || (index + 1))}</strong> for <strong>${escapeHtml(sub.fullName || '')}</strong> from Google Sheets?`;
  }
  const modal = document.getElementById('delete-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

/**
 * Initialize Modals (Detail, Delete, Lightbox)
 */
function initModals() {
  const btnClose = document.getElementById('btn-modal-close');
  const btnDone = document.getElementById('btn-modal-done');
  const btnPrint = document.getElementById('btn-modal-print');
  const btnModalDel = document.getElementById('btn-modal-delete');
  const detailModal = document.getElementById('detail-modal');

  function closeDetail() {
    detailModal.classList.add('hidden');
    detailModal.classList.remove('flex');
    currentDetailSubmission = null;
  }

  if (btnClose) btnClose.addEventListener('click', closeDetail);
  if (btnDone) btnDone.addEventListener('click', closeDetail);
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
  if (btnModalDel) {
    btnModalDel.addEventListener('click', () => {
      if (currentDetailSubmission !== null) {
        const idx = currentDetailSubmission;
        closeDetail();
        promptDelete(idx);
      }
    });
  }

  // Delete Modal Controls
  const btnCancelDel = document.getElementById('btn-cancel-delete');
  const btnConfirmDel = document.getElementById('btn-confirm-delete');
  const deleteModal = document.getElementById('delete-modal');

  if (btnCancelDel) {
    btnCancelDel.addEventListener('click', () => {
      deleteModal.classList.add('hidden');
      deleteModal.classList.remove('flex');
      pendingDelete = null;
    });
  }

  if (btnConfirmDel) {
    btnConfirmDel.addEventListener('click', async () => {
      if (pendingDelete === null) return;
      const sub = allSubmissions[pendingDelete];
      if (!sub) return;

      btnConfirmDel.disabled = true;
      btnConfirmDel.textContent = 'Deleting...';

      try {
        const res = await Api.deleteSubmission(sessionToken, sub.sheetRowIndex, sub.sl);
        if (res && res.success) {
          allSubmissions.splice(pendingDelete, 1);
          updateBentoMetrics(allSubmissions);
          applyFilters();
          deleteModal.classList.add('hidden');
          deleteModal.classList.remove('flex');
          pendingDelete = null;
          showToast(`Deleted registration SL #${sub.sl}`, 'success');
        } else {
          alert((res && res.error) || 'Failed to delete row from Google Sheet.');
        }
      } catch (err) {
        alert('Network error while deleting row: ' + err.message);
      } finally {
        btnConfirmDel.disabled = false;
        btnConfirmDel.textContent = 'Confirm Delete';
      }
    });
  }
}

/**
 * Initialize Search & Filter Listeners
 */
function initSearchAndFilter() {
  const searchInput = document.getElementById('admin-search-input');
  const divisionFilter = document.getElementById('admin-division-filter');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (divisionFilter) divisionFilter.addEventListener('change', applyFilters);
}

/**
 * Sync & Export CSV Handlers
 */
function initSyncAndExport() {
  const btnRefresh = document.getElementById('btn-refresh');
  const btnExport = document.getElementById('btn-export-csv');

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadSubmissions();
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      exportSubmissionsCSV();
    });
  }
}

/**
 * Export All 39 Columns to CSV
 */
function exportSubmissionsCSV() {
  if (allSubmissions.length === 0) {
    showToast('No submissions available to export.', 'error');
    return;
  }

  const headers = [
    "Timestamp", "SL", "First Name", "Last Name", "Full Name",
    "Date of Birth", "Gender", "Nationality", "Blood Group",
    "University Name", "Department Name", "Program / Degree", "Batch",
    "Student ID", "Level-Term", "Primary Phone Number", "Alternative Phone Number",
    "Email Address", "Facebook Profile Link", "LinkedIn Profile Link",
    "Present Address", "Present_Division", "Present_District",
    "Permanent Address", "Permanent_Division", "Permanent_District",
    "PP Size Photo", "NID Number", "Declaration", "Paper ID", "Paper Title",
    "PP Size Photo (ImgBB)", "PP Size Photo (PostImage)",
    "Student ID Card Picture (ImgBB)", "Student ID Card Picture (PostImage)",
    "(SSC/HSC) Registration Card Picture (ImgBB)", "(SSC/HSC) Registration Card Picture (PostImage)",
    "Applicant's Signature (ImgBB)", "Applicant's Signature (PostImage)"
  ];

  const rows = allSubmissions.map(s => {
    return [
      s.timestamp || '',
      s.sl || '',
      s.firstName || '',
      s.lastName || '',
      s.fullName || '',
      s.dob || '',
      s.gender || '',
      s.nationality || '',
      s.bloodGroup || '',
      s.universityName || '',
      s.departmentName || '',
      s.programDegree || '',
      s.batch || '',
      s.studentId || '',
      s.levelTerm || '',
      s.primaryPhone || '',
      s.altPhone || '',
      s.email || '',
      s.fbProfile || '',
      s.linkedInProfile || '',
      s.presentAddress || '',
      s.presentDivision || '',
      s.presentDistrict || '',
      s.permanentAddress || '',
      s.permanentDivision || '',
      s.permanentDistrict || '',
      (s.ppPhoto && (s.ppPhoto.preferred || s.ppPhoto.imgbb || s.ppPhoto.postimage)) || '',
      s.nidNumber || '',
      s.declaration || 'Agreed',
      s.paperId || '',
      s.paperTitle || '',
      (s.ppPhoto && s.ppPhoto.imgbb) || '',
      (s.ppPhoto && s.ppPhoto.postimage) || '',
      (s.studentIdCard && s.studentIdCard.imgbb) || '',
      (s.studentIdCard && s.studentIdCard.postimage) || '',
      (s.regCard && s.regCard.imgbb) || '',
      (s.regCard && s.regCard.postimage) || '',
      (s.signature && s.signature.imgbb) || '',
      (s.signature && s.signature.postimage) || ''
    ].map(escapeCsvCell);
  });

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `IEEE_iCOSTE_2026_All_Submissions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported all ${allSubmissions.length} records to CSV.`, 'success');
}

function escapeCsvCell(cell) {
  const str = String(cell === null || cell === undefined ? '' : cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Universal Lightbox function with Direct Download Button
 */
window.openLightbox = function(imgSrc, caption = '') {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const link = document.getElementById('lightbox-link');
  const btnDownload = document.getElementById('lightbox-download-btn');

  if (!modal || !img) return;

  img.src = imgSrc;
  if (link) link.href = imgSrc;
  if (btnDownload) {
    btnDownload.onclick = () => downloadPicture(imgSrc, `${caption.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`);
  }
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeLightbox = function(e) {
  if (e && e.target && e.target.id === 'lightbox-img') return;
  const modal = document.getElementById('lightbox-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};
