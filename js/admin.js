/**
 * IEEE i-COSTE 2026 Organizer Admin Dashboard Logic
 * Responsive table and mobile cards, bento metrics, photo previews,
 * dossier modal, and CSV export.
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
async function loadSubmissions() {
  const icon = document.getElementById('refresh-icon');
  if (icon) icon.classList.add('animate-spin');

  try {
    const res = await Api.getResponses(sessionToken);
    if (res && res.success) {
      allSubmissions = res.submissions || [];
      updateBentoMetrics(allSubmissions);
      applyFilters();
      // Slide session timer forward on active request
      sessionRemainingSeconds = 20 * 60;
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

  // Count cloud media assets
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
 * Render Desktop Table View
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
    const avatarUrl = (sub.ppPhoto && (sub.ppPhoto.preferred || sub.ppPhoto.imgbb || sub.ppPhoto.postimage)) || '';
    const initial = (sub.fullName ? sub.fullName.charAt(0).toUpperCase() : 'A');

    html += `
      <tr class="hover:bg-surface-container-low transition-colors">
        <td class="py-3 px-4 font-black text-primary whitespace-nowrap">
          #${escapeHtml(sub.sl || (idx + 1))}
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2.5">
            ${avatarUrl ? 
              `<img src="${escapeHtml(avatarUrl)}" class="w-8 h-8 rounded-full object-cover shrink-0 border border-surface-container-high cursor-pointer" onclick="openLightbox('${escapeHtml(avatarUrl)}', '${escapeHtml(sub.fullName || '')} - Passport Photo')">` :
              `<div class="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">${initial}</div>`
            }
            <div class="min-w-0">
              <span class="font-bold text-on-surface block truncate max-w-[160px]">${escapeHtml(sub.fullName || '-')}</span>
              <span class="text-[10px] text-on-surface-variant block truncate">${escapeHtml(sub.email || '-')}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 font-semibold text-on-surface whitespace-nowrap">
          ${escapeHtml(sub.studentId || '-')}
        </td>
        <td class="py-3 px-4">
          <div class="min-w-0 max-w-[180px]">
            <span class="font-semibold text-on-surface block truncate">${escapeHtml(sub.universityName || '-')}</span>
            <span class="text-[10px] text-on-surface-variant block truncate">${escapeHtml(sub.departmentName || '-')}</span>
          </div>
        </td>
        <td class="py-3 px-4 whitespace-nowrap">
          <span class="font-medium text-on-surface block">${escapeHtml(sub.primaryPhone || '-')}</span>
        </td>
        <td class="py-3 px-4 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px]">
            ${escapeHtml(sub.presentDivision || '-')}
          </span>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5">
            ${renderMiniDocBadge('PP', sub.ppPhoto)}
            ${renderMiniDocBadge('ID', sub.studentIdCard)}
            ${renderMiniDocBadge('Reg', sub.regCard)}
            ${renderMiniDocBadge('Sign', sub.signature)}
          </div>
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            <button class="px-2.5 py-1 rounded-lg bg-primary-fixed text-primary hover:bg-primary hover:text-white transition-colors text-[11px] font-bold cursor-pointer" onclick="viewDetail(${idx})">
              Details
            </button>
            <button class="p-1 rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors cursor-pointer" title="Delete" onclick="promptDelete(${idx})">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

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
    const avatarUrl = (sub.ppPhoto && (sub.ppPhoto.preferred || sub.ppPhoto.imgbb || sub.ppPhoto.postimage)) || '';
    const initial = (sub.fullName ? sub.fullName.charAt(0).toUpperCase() : 'A');

    html += `
      <div class="bg-surface-container-low rounded-xl p-4 border border-surface-container-high flex flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            ${avatarUrl ? 
              `<img src="${escapeHtml(avatarUrl)}" class="w-11 h-11 rounded-xl object-cover shrink-0 border border-surface-container-high cursor-pointer" onclick="openLightbox('${escapeHtml(avatarUrl)}', '${escapeHtml(sub.fullName || '')}')">` :
              `<div class="w-11 h-11 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">${initial}</div>`
            }
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-black text-primary text-xs">#${escapeHtml(sub.sl || (idx + 1))}</span>
                <h4 class="font-bold text-sm text-on-surface leading-tight">${escapeHtml(sub.fullName || '-')}</h4>
              </div>
              <p class="text-[11px] text-on-surface-variant">${escapeHtml(sub.studentId || '-')} • ${escapeHtml(sub.universityName || '-')}</p>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-semibold">
            ${escapeHtml(sub.presentDivision || '-')}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] bg-surface-container-lowest p-2.5 rounded-lg border border-surface-container-high/60">
          <div>
            <span class="text-on-surface-variant block text-[10px]">Email</span>
            <span class="font-medium text-on-surface truncate block">${escapeHtml(sub.email || '-')}</span>
          </div>
          <div>
            <span class="text-on-surface-variant block text-[10px]">Phone</span>
            <span class="font-medium text-on-surface block">${escapeHtml(sub.primaryPhone || '-')}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <div class="flex items-center gap-1">
            ${renderMiniDocBadge('PP', sub.ppPhoto)}
            ${renderMiniDocBadge('ID', sub.studentIdCard)}
            ${renderMiniDocBadge('Reg', sub.regCard)}
            ${renderMiniDocBadge('Sign', sub.signature)}
          </div>
          <div class="flex items-center gap-2">
            <button class="px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-xs" onclick="viewDetail(${idx})">
              View Dossier
            </button>
            <button class="p-1.5 rounded-lg bg-surface-container text-outline hover:text-error" onclick="promptDelete(${idx})">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderMiniDocBadge(label, imgObj) {
  if (!imgObj || (!imgObj.imgbb && !imgObj.postimage && !imgObj.preferred)) {
    return `<span class="px-1.5 py-0.5 rounded bg-surface-container text-outline text-[9px] font-semibold">${label}</span>`;
  }
  const url = imgObj.preferred || imgObj.imgbb || imgObj.postimage;
  return `
    <button type="button" class="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-bold flex items-center gap-0.5 cursor-pointer" onclick="openLightbox('${escapeHtml(url)}', '${label} Preview')">
      <span class="material-symbols-outlined text-[10px]">visibility</span>
      <span>${label}</span>
    </button>
  `;
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
 * Initialize Modals (Detail, Delete, Lightbox)
 */
function initModals() {
  // Detail Modal Controls
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
        closeDetail();
        promptDelete(currentDetailSubmission);
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
 * View Detailed Dossier Modal
 */
window.viewDetail = function(index) {
  const sub = allSubmissions[index];
  if (!sub) return;
  currentDetailSubmission = index;

  document.getElementById('modal-sl-badge').textContent = `SL #${sub.sl || (index + 1)}`;
  document.getElementById('modal-heading-title').textContent = sub.fullName || 'Candidate Record';

  const body = document.getElementById('modal-content-body');
  body.innerHTML = `
    <!-- Target Paper Title -->
    <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high">
      <span class="text-[10px] uppercase font-bold text-primary block mb-1">Target Accepted Manuscript</span>
      <h4 class="font-extrabold text-sm text-on-surface leading-snug">
        "${escapeHtml(sub.paperTitle || 'MediNet_XG: An Explainable Deep Learning Framework for Medicinal Plant Leaf Identification using Grad-CAM')}"
      </h4>
    </div>

    <!-- Personal & Academic 2-Column Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
        <span class="text-[10px] uppercase font-bold text-on-surface-variant block pb-1 border-b border-surface-container-high">Personal Info</span>
        <div><strong class="text-on-surface-variant">Full Name:</strong> <span class="font-bold text-on-surface">${escapeHtml(sub.fullName || '-')}</span></div>
        <div><strong class="text-on-surface-variant">DOB:</strong> ${escapeHtml(sub.dob || '-')}</div>
        <div><strong class="text-on-surface-variant">Gender:</strong> ${escapeHtml(sub.gender || '-')} | <strong class="text-on-surface-variant">Blood:</strong> ${escapeHtml(sub.bloodGroup || '-')}</div>
        <div><strong class="text-on-surface-variant">Nationality:</strong> ${escapeHtml(sub.nationality || '-')}</div>
        <div><strong class="text-on-surface-variant">NID:</strong> ${escapeHtml(sub.nidNumber || '-')}</div>
      </div>

      <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
        <span class="text-[10px] uppercase font-bold text-on-surface-variant block pb-1 border-b border-surface-container-high">Academic Credentials</span>
        <div><strong class="text-on-surface-variant">University:</strong> <span class="font-bold text-on-surface">${escapeHtml(sub.universityName || '-')}</span></div>
        <div><strong class="text-on-surface-variant">Department:</strong> ${escapeHtml(sub.departmentName || '-')}</div>
        <div><strong class="text-on-surface-variant">Program:</strong> ${escapeHtml(sub.programDegree || '-')}</div>
        <div><strong class="text-on-surface-variant">Batch / Intake:</strong> ${escapeHtml(sub.batch || '-')}</div>
        <div><strong class="text-on-surface-variant">Student ID:</strong> ${escapeHtml(sub.studentId || '-')} | <strong class="text-on-surface-variant">Level:</strong> ${escapeHtml(sub.levelTerm || '-')}</div>
      </div>
    </div>

    <!-- Contact & Geography -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
        <span class="text-[10px] uppercase font-bold text-on-surface-variant block pb-1 border-b border-surface-container-high">Contact Details</span>
        <div><strong class="text-on-surface-variant">Phone:</strong> ${escapeHtml(sub.primaryPhone || '-')}</div>
        <div><strong class="text-on-surface-variant">Alt Phone:</strong> ${escapeHtml(sub.altPhone || '-')}</div>
        <div><strong class="text-on-surface-variant">Email:</strong> ${escapeHtml(sub.email || '-')}</div>
        <div><strong class="text-on-surface-variant">LinkedIn:</strong> ${sub.linkedInProfile ? `<a href="${escapeHtml(sub.linkedInProfile)}" target="_blank" class="text-primary hover:underline">Profile Link</a>` : '-'}</div>
        <div><strong class="text-on-surface-variant">Facebook:</strong> ${sub.fbProfile ? `<a href="${escapeHtml(sub.fbProfile)}" target="_blank" class="text-primary hover:underline">Profile Link</a>` : '-'}</div>
      </div>

      <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
        <span class="text-[10px] uppercase font-bold text-on-surface-variant block pb-1 border-b border-surface-container-high">Addresses</span>
        <div><strong class="text-on-surface-variant">Present:</strong> ${escapeHtml(sub.presentAddress || '-')} (${escapeHtml(sub.presentDistrict || '')}, ${escapeHtml(sub.presentDivision || '')})</div>
        <div><strong class="text-on-surface-variant">Permanent:</strong> ${escapeHtml(sub.permanentAddress || '-')} (${escapeHtml(sub.permanentDistrict || '')}, ${escapeHtml(sub.permanentDivision || '')})</div>
      </div>
    </div>

    <!-- 4 Document Previews -->
    <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high">
      <span class="text-[10px] uppercase font-bold text-on-surface-variant block mb-3 pb-1 border-b border-surface-container-high">Uploaded Cloud Documents</span>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${renderModalDocSlot('1. Passport Photo', sub.ppPhoto)}
        ${renderModalDocSlot('2. Student ID', sub.studentIdCard)}
        ${renderModalDocSlot('3. Reg Card', sub.regCard)}
        ${renderModalDocSlot('4. Signature', sub.signature)}
      </div>
    </div>
  `;

  const modal = document.getElementById('detail-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

function renderModalDocSlot(label, imgObj) {
  const url = (imgObj && (imgObj.preferred || imgObj.imgbb || imgObj.postimage)) || '';
  if (!url) {
    return `
      <div class="p-2.5 rounded-lg bg-surface-container text-center flex flex-col items-center justify-center min-h-[90px]">
        <span class="material-symbols-outlined text-[20px] text-outline mb-1">image_not_supported</span>
        <span class="text-[10px] text-on-surface-variant">${label}</span>
      </div>
    `;
  }
  return `
    <div class="p-2 rounded-lg bg-surface-container-lowest border border-surface-container-high flex flex-col items-center">
      <img src="${escapeHtml(url)}" class="w-full h-20 object-cover rounded mb-1.5 cursor-pointer" onclick="openLightbox('${escapeHtml(url)}', '${label}')">
      <span class="text-[10px] font-bold text-on-surface truncate w-full text-center">${label}</span>
      <div class="flex items-center gap-1.5 mt-1 text-[9px]">
        ${imgObj.imgbb ? `<a href="${escapeHtml(imgObj.imgbb)}" target="_blank" class="text-primary hover:underline">ImgBB</a>` : ''}
        ${imgObj.imgbb && imgObj.postimage ? `•` : ''}
        ${imgObj.postimage ? `<a href="${escapeHtml(imgObj.postimage)}" target="_blank" class="text-primary hover:underline">PostImg</a>` : ''}
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
    alert('No submissions available to export.');
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
  link.setAttribute('download', `IEEE_i-COSTE_2026_Submissions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
 * Universal Lightbox function
 */
window.openLightbox = function(imgSrc, caption = '') {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const link = document.getElementById('lightbox-link');
  if (!modal || !img) return;

  img.src = imgSrc;
  if (link) link.href = imgSrc;
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
