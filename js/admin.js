/**
 * IEEE i-COSTE 2026 Organizer Admin Dashboard Logic
 */
(function() {
  var sessionToken = sessionStorage.getItem('icoste_admin_token') || null;
  var currentRole = sessionStorage.getItem('icoste_admin_role') || null;
  var currentUsername = sessionStorage.getItem('icoste_admin_username') || null;

  var allSubmissions = [];
  var currentDetailSubmission = null;
  var pendingDelete = null;

  // DOM Elements
  var loginContainer = document.getElementById('login-container');
  var dashboardContainer = document.getElementById('dashboard-container');
  var adminLoginForm = document.getElementById('admin-login-form');
  var btnLogin = document.getElementById('btn-login');
  var btnLoginText = document.getElementById('btn-login-text');
  var btnLoginSpinner = document.getElementById('btn-login-spinner');
  var btnLogout = document.getElementById('btn-logout');

  var adminUserDisplay = document.getElementById('admin-user-display');
  var adminRoleBadge = document.getElementById('admin-role-badge');

  var searchInput = document.getElementById('admin-search-input');
  var divisionFilter = document.getElementById('admin-division-filter');
  var btnRefresh = document.getElementById('btn-refresh');
  var btnExportCsv = document.getElementById('btn-export-csv');

  var tableBody = document.getElementById('table-body');
  var tableFooterCount = document.getElementById('table-footer-count');

  // Modal elements
  var detailModal = document.getElementById('detail-modal');
  var btnModalClose = document.getElementById('btn-modal-close');
  var btnModalDone = document.getElementById('btn-modal-done');
  var btnModalPrint = document.getElementById('btn-modal-print');
  var btnModalDelete = document.getElementById('btn-modal-delete');
  var modalContentBody = document.getElementById('modal-content-body');
  var modalSlBadge = document.getElementById('modal-sl-badge');
  var modalHeadingTitle = document.getElementById('modal-heading-title');

  // Delete modal
  var deleteModal = document.getElementById('delete-modal');
  var btnCancelDelete = document.getElementById('btn-cancel-delete');
  var btnConfirmDelete = document.getElementById('btn-confirm-delete');
  var deleteModalDesc = document.getElementById('delete-modal-desc');

  // Lightbox
  var lightboxModal = document.getElementById('lightbox-modal');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxLink = document.getElementById('lightbox-link');
  var btnLightboxClose = document.getElementById('btn-lightbox-close');

  window.addEventListener('DOMContentLoaded', function() {
    if (sessionToken) {
      showDashboardView();
      loadSubmissions();
    } else {
      showLoginView();
    }
  });

  function showLoginView() {
    sessionToken = null;
    sessionStorage.removeItem('icoste_admin_token');
    sessionStorage.removeItem('icoste_admin_role');
    sessionStorage.removeItem('icoste_admin_username');

    loginContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
    btnLogout.style.display = 'none';
  }

  function showDashboardView() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    btnLogout.style.display = 'inline-flex';

    if (currentUsername) adminUserDisplay.textContent = currentUsername;
    if (currentRole) adminRoleBadge.textContent = currentRole;
  }

  // 1. Admin Login
  adminLoginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
      showToast('Please enter both username and password.', 'error');
      return;
    }

    btnLogin.disabled = true;
    btnLoginText.textContent = 'Authenticating...';
    btnLoginSpinner.style.display = 'block';

    try {
      var response = await Api.adminLogin(username, password);
      btnLogin.disabled = false;
      btnLoginText.textContent = 'Sign In to Dashboard';
      btnLoginSpinner.style.display = 'none';

      if (response && response.success) {
        sessionToken = response.token;
        currentRole = response.role;
        currentUsername = response.username;

        sessionStorage.setItem('icoste_admin_token', sessionToken);
        sessionStorage.setItem('icoste_admin_role', currentRole);
        sessionStorage.setItem('icoste_admin_username', currentUsername);

        showToast('Login successful! Loading submissions...', 'success');
        showDashboardView();
        loadSubmissions();
      } else {
        showToast((response && response.error) ? response.error : 'Invalid credentials.', 'error');
      }
    } catch (err) {
      btnLogin.disabled = false;
      btnLoginText.textContent = 'Sign In to Dashboard';
      btnLoginSpinner.style.display = 'none';
      showToast(err.message || 'Error connecting to Apps Script API.', 'error');
    }
  });

  // Logout
  btnLogout.addEventListener('click', async function() {
    if (sessionToken) {
      try {
        await Api.adminLogout(sessionToken);
      } catch (e) {}
    }
    showToast('Logged out successfully.', 'info');
    showLoginView();
  });

  // 2. Load Submissions
  async function loadSubmissions() {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 3rem; color: #94A3B8;"><div class="spinner" style="margin: 0 auto 0.8rem;"></div>Fetching submissions from Google Sheets...</td></tr>';

    try {
      var response = await Api.getResponses(sessionToken);

      if (response && response.error === 'SESSION_EXPIRED') {
        showToast('Session expired. Please log in again.', 'error');
        showLoginView();
        return;
      }

      if (response && response.success) {
        allSubmissions = response.responses || [];
        updateStats();
        renderTable();
      } else {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #DC2626;">Failed to load data.</td></tr>';
        showToast('Failed to load submissions.', 'error');
      }
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #DC2626;">Error connecting to API.</td></tr>';
      showToast(err.message || 'Network error fetching submissions.', 'error');
    }
  }

  // 3. Compute KPI Metrics
  function updateStats() {
    var total = allSubmissions.length;
    var papersSet = {};
    var uniSet = {};
    var todayCount = 0;
    var todayStr = new Date().toISOString().split('T')[0];

    allSubmissions.forEach(function(sub) {
      if (sub.paperId) papersSet[sub.paperId.trim().toLowerCase()] = true;
      if (sub.universityName) uniSet[sub.universityName.trim().toLowerCase()] = true;
      if (sub.timestamp && sub.timestamp.indexOf(todayStr) > -1) todayCount++;
    });

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-papers').textContent = Object.keys(papersSet).length;
    document.getElementById('stat-universities').textContent = Object.keys(uniSet).length;
    document.getElementById('stat-today').textContent = todayCount;
  }

  // 4. Render Submissions Table
  function getFilteredSubmissions() {
    var query = searchInput.value.trim().toLowerCase();
    var selectedDivision = divisionFilter.value;

    return allSubmissions.filter(function(sub) {
      var matchDivision = (selectedDivision === 'ALL' || sub.presentDivision === selectedDivision || sub.permanentDivision === selectedDivision);
      if (!matchDivision) return false;

      if (!query) return true;

      var searchString = [
        sub.sl, sub.paperId, sub.paperTitle, sub.fullName, sub.firstName, sub.lastName,
        sub.universityName, sub.departmentName, sub.studentId, sub.email, sub.primaryPhone,
        sub.nidNumber, sub.presentDistrict, sub.permanentDistrict
      ].join(' ').toLowerCase();

      return searchString.indexOf(query) > -1;
    });
  }

  function renderTable() {
    var filtered = getFilteredSubmissions();
    tableFooterCount.textContent = 'Showing ' + filtered.length + ' of ' + allSubmissions.length + ' submissions';

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 3rem; color: #94A3B8;">No submissions match your search or filter.</td></tr>';
      return;
    }

    var html = '';
    filtered.forEach(function(sub) {
      html += '<tr>';
      html += '<td style="font-weight: 700; color: #475569;">#' + (sub.sl || '-') + '</td>';
      html += '<td style="white-space: nowrap; color: #64748B; font-size: 0.78rem;">' + (sub.timestamp || '-') + '</td>';
      html += '<td><span class="nav-badge" style="color: #2563EB; background: #EFF6FF; border-color: #BFDBFE;">' + escapeHtml(sub.paperId || '-') + '</span></td>';
      html += '<td><div style="font-weight: 700; color: #1E293B;">' + escapeHtml(sub.fullName || '-') + '</div><div style="font-size: 0.75rem; color: #64748B;">NID: ' + escapeHtml(sub.nidNumber || '-') + '</div></td>';
      html += '<td><div style="font-weight: 600; color: #334155;">' + escapeHtml(sub.universityName || '-') + '</div><div style="font-size: 0.75rem; color: #64748B;">' + escapeHtml(sub.departmentName || '-') + '</div></td>';
      html += '<td><div style="font-size: 0.8rem; font-weight: 500;">' + escapeHtml(sub.primaryPhone || '-') + '</div><div style="font-size: 0.75rem; color: #64748B;">' + escapeHtml(sub.email || '-') + '</div></td>';

      // 4 Photos Thumbnails
      html += '<td><div class="thumb-strip">';
      html += renderMiniThumb(sub.ppPhoto, 'PP Photo');
      html += renderMiniThumb(sub.studentIdCard, 'ID Card');
      html += renderMiniThumb(sub.regCard, 'Reg Card');
      html += renderMiniThumb(sub.signature, 'Signature');
      html += '</div></td>';

      // Actions
      html += '<td style="text-align: right; white-space: nowrap;">';
      html += '<button class="action-btn" title="View Full Details" onclick="window.viewSubmissionDetails(' + sub.sl + ')">';
      html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      html += '</button>';

      if (currentRole === 'super_admin') {
        html += '<button class="action-btn action-btn-danger" style="margin-left: 0.4rem;" title="Delete Submission" onclick="window.confirmDeleteSubmission(' + sub.sheetRowIndex + ', ' + sub.sl + ', \'' + escapeQuotes(sub.fullName) + '\')">';
        html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        html += '</button>';
      }
      html += '</td>';

      html += '</tr>';
    });

    tableBody.innerHTML = html;
  }

  function renderMiniThumb(imgObj, label) {
    var url = imgObj ? (imgObj.preferred || imgObj.imgbb || imgObj.postimage) : null;
    if (url) {
      return '<img src="' + escapeHtml(url) + '" class="thumb-mini" title="' + label + '" onclick="window.openLightbox(\'' + escapeQuotes(url) + '\')">';
    }
    return '<span class="no-img-badge" title="No ' + label + '">No</span>';
  }

  // 5. Search & Filters Event Listeners
  searchInput.addEventListener('input', renderTable);
  divisionFilter.addEventListener('change', renderTable);
  btnRefresh.addEventListener('click', function() {
    loadSubmissions();
    showToast('Refreshing data...', 'info');
  });

  // 6. View Submission Full Record Modal
  window.viewSubmissionDetails = function(sl) {
    var sub = allSubmissions.find(function(s) { return s.sl === sl; });
    if (!sub) return;
    currentDetailSubmission = sub;

    modalSlBadge.textContent = 'SL #' + sub.sl;
    modalHeadingTitle.textContent = sub.fullName || 'Co-Author Record';

    var html = '';

    // Section 1: Paper Details
    html += '<div class="modal-section-title">1. Accepted Paper Details</div>';
    html += '<div class="modal-grid-2">';
    html += '<div class="modal-field-item"><span class="modal-field-label">Paper ID</span><span class="modal-field-value">' + escapeHtml(sub.paperId || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Paper Title</span><span class="modal-field-value">' + escapeHtml(sub.paperTitle || '-') + '</span></div>';
    html += '</div>';

    // Section 2: Personal Details
    html += '<div class="modal-section-title">2. Personal Information</div>';
    html += '<div class="modal-grid-2">';
    html += '<div class="modal-field-item"><span class="modal-field-label">Full Name</span><span class="modal-field-value">' + escapeHtml(sub.fullName || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">First / Last Name</span><span class="modal-field-value">' + escapeHtml(sub.firstName || '-') + ' ' + escapeHtml(sub.lastName || '') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Date of Birth</span><span class="modal-field-value">' + escapeHtml(sub.dob || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Gender</span><span class="modal-field-value">' + escapeHtml(sub.gender || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Nationality</span><span class="modal-field-value">' + escapeHtml(sub.nationality || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Blood Group</span><span class="modal-field-value">' + escapeHtml(sub.bloodGroup || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">NID Number</span><span class="modal-field-value">' + escapeHtml(sub.nidNumber || '-') + '</span></div>';
    html += '</div>';

    // Section 3: Academic Details
    html += '<div class="modal-section-title">3. Academic &amp; Institutional Affiliation</div>';
    html += '<div class="modal-grid-2">';
    html += '<div class="modal-field-item"><span class="modal-field-label">University / Institution</span><span class="modal-field-value">' + escapeHtml(sub.universityName || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Department</span><span class="modal-field-value">' + escapeHtml(sub.departmentName || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Program / Degree</span><span class="modal-field-value">' + escapeHtml(sub.programDegree || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Batch</span><span class="modal-field-value">' + escapeHtml(sub.batch || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Student ID</span><span class="modal-field-value">' + escapeHtml(sub.studentId || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Level-Term</span><span class="modal-field-value">' + escapeHtml(sub.levelTerm || '-') + '</span></div>';
    html += '</div>';

    // Section 4: Contact & Addresses
    html += '<div class="modal-section-title">4. Contact &amp; Address Information</div>';
    html += '<div class="modal-grid-2">';
    html += '<div class="modal-field-item"><span class="modal-field-label">Primary Phone</span><span class="modal-field-value">' + escapeHtml(sub.primaryPhone || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Alternative Phone</span><span class="modal-field-value">' + escapeHtml(sub.altPhone || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Email Address</span><span class="modal-field-value"><a href="mailto:' + escapeHtml(sub.email) + '" style="color: var(--color-primary);">' + escapeHtml(sub.email || '-') + '</a></span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Present Division &amp; District</span><span class="modal-field-value">' + escapeHtml(sub.presentDistrict || '-') + ', ' + escapeHtml(sub.presentDivision || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Permanent Division &amp; District</span><span class="modal-field-value">' + escapeHtml(sub.permanentDistrict || '-') + ', ' + escapeHtml(sub.permanentDivision || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Facebook Profile</span><span class="modal-field-value"><a href="' + escapeHtml(sub.fbProfile) + '" target="_blank" rel="noopener" style="color: var(--color-primary);">' + escapeHtml(sub.fbProfile || '-') + '</a></span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">LinkedIn Profile</span><span class="modal-field-value"><a href="' + escapeHtml(sub.linkedInProfile) + '" target="_blank" rel="noopener" style="color: var(--color-primary);">' + escapeHtml(sub.linkedInProfile || '-') + '</a></span></div>';
    html += '<div class="modal-field-item" style="grid-column: span 2;"><span class="modal-field-label">Present Address</span><span class="modal-field-value">' + escapeHtml(sub.presentAddress || '-') + '</span></div>';
    html += '<div class="modal-field-item" style="grid-column: span 2;"><span class="modal-field-label">Permanent Address</span><span class="modal-field-value">' + escapeHtml(sub.permanentAddress || '-') + '</span></div>';
    html += '</div>';

    // Section 5: Uploaded Documents (4 photos)
    html += '<div class="modal-section-title">5. Uploaded Documents &amp; Photos</div>';
    html += '<div class="modal-photo-grid">';
    html += renderModalPhotoBox(sub.ppPhoto, 'PP Size Photo');
    html += renderModalPhotoBox(sub.studentIdCard, 'Student ID Card');
    html += renderModalPhotoBox(sub.regCard, '(SSC/HSC) Reg Card');
    html += renderModalPhotoBox(sub.signature, "Applicant's Signature");
    html += '</div>';

    // Section 6: Audit metadata
    html += '<div class="modal-section-title">6. Audit &amp; Verification</div>';
    html += '<div class="modal-grid-2">';
    html += '<div class="modal-field-item"><span class="modal-field-label">Submission Timestamp</span><span class="modal-field-value">' + escapeHtml(sub.timestamp || '-') + '</span></div>';
    html += '<div class="modal-field-item"><span class="modal-field-label">Declaration Agreement</span><span class="modal-field-value" style="color: #059669; font-weight: 700;">&#10003; ' + escapeHtml(sub.declaration || 'Agreed') + '</span></div>';
    html += '</div>';

    modalContentBody.innerHTML = html;
    detailModal.style.display = 'flex';
  };

  function renderModalPhotoBox(imgObj, title) {
    var preferred = imgObj ? (imgObj.preferred || imgObj.imgbb || imgObj.postimage) : null;
    var imgbb = imgObj ? imgObj.imgbb : null;
    var postimage = imgObj ? imgObj.postimage : null;

    var html = '<div class="modal-photo-box">';
    if (preferred) {
      html += '<img src="' + escapeHtml(preferred) + '" class="modal-photo-img" onclick="window.openLightbox(\'' + escapeQuotes(preferred) + '\')">';
    } else {
      html += '<div style="height: 140px; display: flex; align-items: center; justify-content: center; background: #E2E8F0; border-radius: 8px; color: #94A3B8; font-size: 0.8rem;">No Image</div>';
    }
    html += '<div class="modal-photo-title">' + title + '</div>';
    html += '<div class="modal-photo-links">';
    if (imgbb) html += '<a href="' + escapeHtml(imgbb) + '" target="_blank" rel="noopener">ImgBB</a>';
    if (postimage) html += '<a href="' + escapeHtml(postimage) + '" target="_blank" rel="noopener">PostImage</a>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  btnModalClose.addEventListener('click', function() { detailModal.style.display = 'none'; });
  btnModalDone.addEventListener('click', function() { detailModal.style.display = 'none'; });

  btnModalPrint.addEventListener('click', function() {
    window.print();
  });

  btnModalDelete.addEventListener('click', function() {
    if (currentDetailSubmission) {
      detailModal.style.display = 'none';
      window.confirmDeleteSubmission(currentDetailSubmission.sheetRowIndex, currentDetailSubmission.sl, currentDetailSubmission.fullName);
    }
  });

  // 7. Delete Submission
  window.confirmDeleteSubmission = function(sheetRowIndex, sl, fullName) {
    pendingDelete = { sheetRowIndex: sheetRowIndex, sl: sl };
    deleteModalDesc.textContent = 'Are you sure you want to permanently delete the submission for ' + (fullName || 'SL #' + sl) + ' (SL #' + sl + ')? This will remove the row from the Google Sheet.';
    deleteModal.style.display = 'flex';
  };

  btnCancelDelete.addEventListener('click', function() {
    pendingDelete = null;
    deleteModal.style.display = 'none';
  });

  btnConfirmDelete.addEventListener('click', async function() {
    if (!pendingDelete) return;

    btnConfirmDelete.disabled = true;
    btnConfirmDelete.textContent = 'Deleting...';

    try {
      var res = await Api.deleteSubmission(sessionToken, pendingDelete.sheetRowIndex, pendingDelete.sl);
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = 'Confirm Delete';
      deleteModal.style.display = 'none';

      if (res && res.error === 'SESSION_EXPIRED') {
        showToast('Session expired. Please log in again.', 'error');
        showLoginView();
        return;
      }

      if (res && res.success) {
        allSubmissions = allSubmissions.filter(function(s) { return s.sl !== pendingDelete.sl; });
        pendingDelete = null;
        updateStats();
        renderTable();
        showToast('Submission deleted successfully.', 'success');
      } else {
        showToast((res && res.error) ? res.error : 'Failed to delete row.', 'error');
      }
    } catch (err) {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = 'Confirm Delete';
      deleteModal.style.display = 'none';
      showToast(err.message || 'Error executing delete.', 'error');
    }
  });

  // 8. Export CSV
  btnExportCsv.addEventListener('click', function() {
    var data = getFilteredSubmissions();
    if (data.length === 0) {
      showToast('No submissions available to export.', 'info');
      return;
    }

    var headers = [
      "Timestamp", "SL", "First Name", "Last Name", "Full Name",
      "Date of Birth", "Gender", "Nationality", "Blood Group", "University Name",
      "Department Name", "Program / Degree", "Batch", "Student ID", "Level-Term",
      "Primary Phone Number", "Alternative Phone Number", "Email Address",
      "Facebook Profile Link", "LinkedIn Profile Link",
      "Present Address", "Present_Division", "Present_District",
      "Permanent Address", "Permanent_Division", "Permanent_District",
      "PP Size Photo", "NID Number", "Declaration", "Paper ID", "Paper Title",
      "PP Size Photo (ImgBB)", "PP Size Photo (PostImage)",
      "Student ID Card Picture (ImgBB)", "Student ID Card Picture (PostImage)",
      "(SSC/HSC) Registration Card Picture (ImgBB)", "(SSC/HSC) Registration Card Picture (PostImage)",
      "Applicant's Signature (ImgBB)", "Applicant's Signature (PostImage)"
    ];

    var csvRows = [];
    csvRows.push(headers.map(escapeCsvValue).join(','));

    data.forEach(function(sub) {
      var row = [
        sub.timestamp, sub.sl, sub.firstName, sub.lastName, sub.fullName,
        sub.dob, sub.gender, sub.nationality, sub.bloodGroup, sub.universityName,
        sub.departmentName, sub.programDegree, sub.batch, sub.studentId, sub.levelTerm,
        sub.primaryPhone, sub.altPhone, sub.email,
        sub.fbProfile, sub.linkedInProfile,
        sub.presentAddress, sub.presentDivision, sub.presentDistrict,
        sub.permanentAddress, sub.permanentDivision, sub.permanentDistrict,
        (sub.ppPhoto && sub.ppPhoto.preferred) || '',
        sub.nidNumber, sub.declaration, sub.paperId, sub.paperTitle,
        (sub.ppPhoto && sub.ppPhoto.imgbb) || '', (sub.ppPhoto && sub.ppPhoto.postimage) || '',
        (sub.studentIdCard && sub.studentIdCard.imgbb) || '', (sub.studentIdCard && sub.studentIdCard.postimage) || '',
        (sub.regCard && sub.regCard.imgbb) || '', (sub.regCard && sub.regCard.postimage) || '',
        (sub.signature && sub.signature.imgbb) || '', (sub.signature && sub.signature.postimage) || ''
      ];
      csvRows.push(row.map(escapeCsvValue).join(','));
    });

    var csvString = csvRows.join('\r\n');
    var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'icoste_2026_coauthors_export_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Submissions exported to CSV successfully!', 'success');
  });

  function escapeCsvValue(val) {
    if (val === null || val === undefined) return '""';
    var str = String(val).replace(/"/g, '""');
    return '"' + str + '"';
  }

  // 9. Lightbox Modal
  window.openLightbox = function(url) {
    if (!url) return;
    lightboxImg.src = url;
    lightboxLink.href = url;
    lightboxModal.style.display = 'flex';
  };

  btnLightboxClose.addEventListener('click', function() {
    lightboxModal.style.display = 'none';
  });

  lightboxModal.addEventListener('click', function(e) {
    if (e.target === lightboxModal) {
      lightboxModal.style.display = 'none';
    }
  });

  // Utilities
  function escapeHtml(text) {
    if (!text) return '';
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  function showToast(message, type) {
    var container = document.getElementById('toast-container');
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4500);
  }

})();
