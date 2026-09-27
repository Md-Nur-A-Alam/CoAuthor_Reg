/**
 * IEEE i-COSTE 2026 Public Registration Form Logic
 * Responsive handling, cascading BD geography, live file previews,
 * dual-cloud upload sequencing, and confirmation dossier rendering.
 */

// Bangladesh Divisions & 64 Districts Mapping
const BD_DIVISIONS = {
  "Barishal": ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  "Chattogram": ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"],
  "Dhaka": ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
  "Khulna": ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
  "Mymensingh": ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
  "Rajshahi": ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"],
  "Rangpur": ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
  "Sylhet": ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"]
};

// Image Files State (storing base64 DataURL and file meta for client upload)
const selectedFiles = {
  ppPhoto: null,
  studentIdCard: null,
  regCard: null,
  signature: null
};

// Server Cloud Upload Results
const uploadedMedia = {
  ppPhoto: null,
  studentIdCard: null,
  regCard: null,
  signature: null
};

let fullNameManuallyEdited = false;

document.addEventListener('DOMContentLoaded', () => {
  initPaperShowcase();
  initDateConstraints();
  initCascadingDropdowns();
  initNameSync();
  initAddressCopy();
  initFormSubmission();
  initNavTabs();
});

/**
 * Sync showcase paper title with CONFIG
 */
function initPaperShowcase() {
  const paperTitleEl = document.getElementById('showcase-paper-title');
  const receiptTitleEl = document.getElementById('receipt-paper-title');
  const title = (window.CONFIG && window.CONFIG.PAPER_TITLE) || 'MediNet_XG: An Explainable Deep Learning Framework for Medicinal Plant Leaf Identification using Grad-CAM';
  if (paperTitleEl) paperTitleEl.textContent = `"${title}"`;
  if (receiptTitleEl) receiptTitleEl.textContent = `"${title}"`;
}

/**
 * Set max date of birth to today
 */
function initDateConstraints() {
  const dobInput = document.getElementById('dob');
  if (dobInput) {
    const today = new Date().toISOString().split('T')[0];
    dobInput.setAttribute('max', today);
  }
}

/**
 * Setup cascading divisions & districts
 */
function initCascadingDropdowns() {
  const presentDiv = document.getElementById('presentDivision');
  const presentDist = document.getElementById('presentDistrict');
  const permDiv = document.getElementById('permanentDivision');
  const permDist = document.getElementById('permanentDistrict');

  function bindCascading(divEl, distEl) {
    if (!divEl || !distEl) return;
    divEl.addEventListener('change', function() {
      populateDistricts(this.value, distEl);
    });
  }

  bindCascading(presentDiv, presentDist);
  bindCascading(permDiv, permDist);
}

function populateDistricts(divName, distEl, selectedDistrict = '') {
  distEl.innerHTML = '<option value="" disabled selected>Select District</option>';
  if (BD_DIVISIONS[divName]) {
    BD_DIVISIONS[divName].forEach(dist => {
      const opt = document.createElement('option');
      opt.value = dist;
      opt.textContent = dist;
      if (dist === selectedDistrict) opt.selected = true;
      distEl.appendChild(opt);
    });
    distEl.disabled = false;
  } else {
    distEl.disabled = true;
  }
}

/**
 * Auto-generate Certificate Full Name from First + Last Name
 */
function initNameSync() {
  const firstEl = document.getElementById('firstName');
  const lastEl = document.getElementById('lastName');
  const fullEl = document.getElementById('fullName');

  function update() {
    if (!fullNameManuallyEdited && fullEl) {
      const fn = (firstEl ? firstEl.value.trim() : '');
      const ln = (lastEl ? lastEl.value.trim() : '');
      fullEl.value = `${fn} ${ln}`.trim();
    }
  }

  if (firstEl) firstEl.addEventListener('input', update);
  if (lastEl) lastEl.addEventListener('input', update);
  if (fullEl) {
    fullEl.addEventListener('input', () => {
      fullNameManuallyEdited = fullEl.value.trim().length > 0;
    });
  }
}

/**
 * "Same as Present" Address Copy
 */
function initAddressCopy() {
  const btnCopy = document.getElementById('btn-copy-address');
  if (!btnCopy) return;

  btnCopy.addEventListener('click', () => {
    const presentAddr = document.getElementById('presentAddress').value.trim();
    const presentDiv = document.getElementById('presentDivision').value;
    const presentDist = document.getElementById('presentDistrict').value;

    const permAddr = document.getElementById('permanentAddress');
    const permDiv = document.getElementById('permanentDivision');
    const permDist = document.getElementById('permanentDistrict');

    if (!presentDiv || !presentAddr) {
      alert('Please fill in your Present Division and Present Address first.');
      return;
    }

    permAddr.value = presentAddr;
    permDiv.value = presentDiv;
    populateDistricts(presentDiv, permDist, presentDist);
  });
}

/**
 * Handle File Selection with Real-time Thumbnail Preview & Client Optimization
 */
window.handleFileSelected = function(inputEl, key) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;

  // Max 10MB check
  if (file.size > 10 * 1024 * 1024) {
    alert(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select an image under 10MB.`);
    inputEl.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawDataUrl = e.target.result;
    
    // Optimize image (max dimension 1280px, quality 0.85) to prevent network lag & memory issues
    optimizeImage(rawDataUrl, file.type, (optimizedDataUrl) => {
      selectedFiles[key] = {
        file: file,
        base64: optimizedDataUrl,
        fileName: file.name,
        mimeType: 'image/jpeg'
      };

      // Update UI Preview
      const previewBox = document.getElementById(`preview-box-${key}`);
      const thumbImg = document.getElementById(`thumb-${key}`);
      const labelEl = document.getElementById(`label-${key}`);

      if (previewBox && thumbImg) {
        thumbImg.src = optimizedDataUrl;
        previewBox.classList.remove('hidden');
      }
      if (labelEl) {
        labelEl.textContent = 'Change File';
      }
    });
  };
  reader.readAsDataURL(file);
};

function optimizeImage(dataUrl, mimeType, callback) {
  const img = new Image();
  img.onload = function() {
    const maxDim = 1280;
    let width = img.width;
    let height = img.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    try {
      const compressed = canvas.toDataURL('image/jpeg', 0.85);
      callback(compressed);
    } catch (err) {
      callback(dataUrl);
    }
  };
  img.onerror = function() {
    callback(dataUrl);
  };
  img.src = dataUrl;
};

/**
 * Remove an uploaded image
 */
window.removeImage = function(key) {
  selectedFiles[key] = null;
  uploadedMedia[key] = null;

  const fileInput = document.getElementById(`file-${key}`);
  if (fileInput) fileInput.value = '';

  const previewBox = document.getElementById(`preview-box-${key}`);
  const thumbImg = document.getElementById(`thumb-${key}`);
  const labelEl = document.getElementById(`label-${key}`);

  if (previewBox) previewBox.classList.add('hidden');
  if (thumbImg) thumbImg.src = '';
  if (labelEl) labelEl.textContent = 'Select File';
};

/**
 * Navigation tabs (Form vs Confirmation view)
 */
function initNavTabs() {
  const tabForm = document.getElementById('nav-tab-form');
  const tabConf = document.getElementById('nav-tab-confirmation');
  const formView = document.getElementById('registration-view');
  const confView = document.getElementById('confirmation-view');
  const btnSubmitAnother = document.getElementById('btn-submit-another');

  function showForm() {
    formView.classList.remove('hidden');
    confView.classList.add('hidden');
    if (tabForm) {
      tabForm.className = "px-3.5 py-2 rounded-lg text-sm font-semibold transition-all bg-primary-container text-on-primary shadow-xs";
    }
    if (tabConf) {
      tabConf.className = "px-3.5 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all";
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showConf() {
    formView.classList.add('hidden');
    confView.classList.remove('hidden');
    if (tabConf) {
      tabConf.className = "px-3.5 py-2 rounded-lg text-sm font-semibold transition-all bg-primary-container text-on-primary shadow-xs";
    }
    if (tabForm) {
      tabForm.className = "px-3.5 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all";
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (tabForm) tabForm.addEventListener('click', showForm);
  if (tabConf) tabConf.addEventListener('click', showConf);
  if (btnSubmitAnother) {
    btnSubmitAnother.addEventListener('click', () => {
      document.getElementById('coauthor-reg-form').reset();
      Object.keys(selectedFiles).forEach(k => removeImage(k));
      fullNameManuallyEdited = false;
      showForm();
    });
  }
}

/**
 * Primary Form Submission Pipeline
 */
function initFormSubmission() {
  const form = document.getElementById('coauthor-reg-form');
  const btnSubmit = document.getElementById('btn-submit');
  const btnText = document.getElementById('btn-submit-text');
  const btnIcon = document.getElementById('btn-submit-icon');
  const btnSpinner = document.getElementById('btn-submit-spinner');
  const statusBanner = document.getElementById('submit-status-banner');

  function showStatus(msg, isError = false) {
    if (!statusBanner) return;
    statusBanner.classList.remove('hidden', 'bg-error-container', 'text-on-error-container', 'bg-surface-container-high', 'text-primary');
    if (isError) {
      statusBanner.classList.add('bg-error-container', 'text-on-error-container');
    } else {
      statusBanner.classList.add('bg-surface-container-high', 'text-primary');
    }
    statusBanner.innerHTML = msg;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // 1. Check all required text fields
    const requiredInputs = form.querySelectorAll('[required]');
    let firstInvalid = null;
    requiredInputs.forEach(input => {
      if (!input.checkValidity() || !input.value.trim()) {
        input.classList.add('ring-2', 'ring-error');
        if (!firstInvalid) firstInvalid = input;
      } else {
        input.classList.remove('ring-2', 'ring-error');
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      showStatus('Please complete all required fields highlighted in red.', true);
      return;
    }

    // 2. Validate Bangladeshi phone numbers
    const primaryPhone = document.getElementById('primaryPhone').value.trim();
    const phoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;
    if (!phoneRegex.test(primaryPhone)) {
      document.getElementById('primaryPhone').focus();
      showStatus('Primary Phone must be a valid Bangladeshi number (e.g. 017xxxxxxxx or +88017xxxxxxxx).', true);
      return;
    }

    // 3. Validate Email
    const email = document.getElementById('email').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      document.getElementById('email').focus();
      showStatus('Please enter a valid email address.', true);
      return;
    }

    // 4. Validate NID
    const nidNumber = document.getElementById('nidNumber').value.trim();
    const nidRegex = /^(\d{10}|\d{13}|\d{17})$/;
    if (!nidRegex.test(nidNumber)) {
      document.getElementById('nidNumber').focus();
      showStatus('National ID must be 10, 13, or 17 digits.', true);
      return;
    }

    // 5. Check all 4 files are selected
    const missingDocs = [];
    if (!selectedFiles.ppPhoto) missingDocs.push('Passport Photo');
    if (!selectedFiles.studentIdCard) missingDocs.push('Student ID Card');
    if (!selectedFiles.regCard) missingDocs.push('SSC/HSC Registration Card');
    if (!selectedFiles.signature) missingDocs.push("Applicant's Signature");

    if (missingDocs.length > 0) {
      showStatus(`Please select all 4 required document files: ${missingDocs.join(', ')}.`, true);
      return;
    }

    // 6. Check declaration checkbox
    const declaration = document.getElementById('declaration').checked;
    if (!declaration) {
      showStatus('You must check and agree to the declaration statement.', true);
      return;
    }

    // Begin Submission Process
    btnSubmit.disabled = true;
    btnSpinner.classList.remove('hidden');
    btnIcon.classList.add('hidden');

    try {
      // Step A: Dual-Cloud Upload of 4 Documents
      const fileUploadTasks = [
        { key: 'ppPhoto', label: 'Passport Photo' },
        { key: 'studentIdCard', label: 'Student ID Card' },
        { key: 'regCard', label: 'Registration Card' },
        { key: 'signature', label: "Applicant's Signature" }
      ];

      for (let i = 0; i < fileUploadTasks.length; i++) {
        const item = fileUploadTasks[i];
        btnText.textContent = `Uploading ${item.label} (${i + 1}/4)...`;
        showStatus(`Archiving ${item.label} to cloud vault...`);

        const f = selectedFiles[item.key];
        try {
          const res = await Api.uploadImage(f.base64, f.fileName, f.mimeType, item.key);
          if (res && res.success) {
            uploadedMedia[item.key] = res;
          } else {
            throw new Error((res && res.error) || 'Upload failed');
          }
        } catch (uploadErr) {
          console.warn(`Direct upload notice for ${item.label}:`, uploadErr);
          // Fallback: pass the base64 and file metadata directly so server archives it during submit
          uploadedMedia[item.key] = {
            base64: f.base64,
            fileName: f.fileName,
            mimeType: f.mimeType,
            preferredUrl: f.base64
          };
        }
      }

      // Step B: Submit Form Data to Google Sheets API
      btnText.textContent = 'Saving to Conference Database...';
      showStatus('Registering co-author record into Google Sheets...');

      const paperTitle = (window.CONFIG && window.CONFIG.PAPER_TITLE) || 'MediNet_XG: An Explainable Deep Learning Framework for Medicinal Plant Leaf Identification using Grad-CAM';

      const payload = {
        paperId: '', // intentionally empty as requested
        paperTitle: paperTitle,
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        fullName: document.getElementById('fullName').value.trim(),
        dob: document.getElementById('dob').value.trim(),
        gender: document.getElementById('gender').value,
        nationality: document.getElementById('nationality').value.trim(),
        bloodGroup: document.getElementById('bloodGroup').value,
        nidNumber: nidNumber,
        universityName: document.getElementById('universityName').value.trim(),
        departmentName: document.getElementById('departmentName').value.trim(),
        programDegree: document.getElementById('programDegree').value.trim(),
        batch: document.getElementById('batch').value.trim(),
        studentId: document.getElementById('studentId').value.trim(),
        levelTerm: document.getElementById('levelTerm').value.trim(),
        primaryPhone: primaryPhone,
        altPhone: document.getElementById('altPhone').value.trim(),
        email: email,
        fbProfile: document.getElementById('fbProfile').value.trim(),
        linkedInProfile: document.getElementById('linkedInProfile').value.trim(),
        presentAddress: document.getElementById('presentAddress').value.trim(),
        presentDivision: document.getElementById('presentDivision').value,
        presentDistrict: document.getElementById('presentDistrict').value,
        permanentAddress: document.getElementById('permanentAddress').value.trim(),
        permanentDivision: document.getElementById('permanentDivision').value,
        permanentDistrict: document.getElementById('permanentDistrict').value,
        declaration: true,
        ppPhoto: uploadedMedia.ppPhoto,
        studentIdCard: uploadedMedia.studentIdCard,
        regCard: uploadedMedia.regCard,
        signature: uploadedMedia.signature
      };

      const submitRes = await Api.submitForm(payload);
      if (!submitRes || !submitRes.success) {
        throw new Error(submitRes ? submitRes.error : 'Submission failed on server.');
      }

      // Populate Confirmation Receipt
      document.getElementById('receipt-sl').textContent = `SL #${submitRes.sl || '--'}`;
      document.getElementById('receipt-timestamp').textContent = submitRes.timestamp || new Date().toLocaleString();
      document.getElementById('receipt-name').textContent = payload.fullName;
      document.getElementById('receipt-student-id').textContent = payload.studentId;
      document.getElementById('receipt-university').textContent = `${payload.universityName} (${payload.departmentName})`;
      document.getElementById('receipt-email').textContent = payload.email;
      document.getElementById('receipt-phone').textContent = payload.primaryPhone;
      document.getElementById('receipt-nid').textContent = payload.nidNumber;

      // Update Media Thumbnails & Links in Receipt
      function setMediaReceipt(prefix, mediaObj) {
        const thumb = document.getElementById(`receipt-thumb-${prefix}`);
        const linkImgbb = document.getElementById(`receipt-link-${prefix}-imgbb`);
        const linkPost = document.getElementById(`receipt-link-${prefix}-postimage`);
        const url = (mediaObj && (mediaObj.preferredUrl || mediaObj.imgbbUrl || mediaObj.postimageUrl || mediaObj.catboxUrl || mediaObj.driveUrl)) || (typeof mediaObj === 'string' ? mediaObj : '') || '';

        if (thumb && url) thumb.src = url;
        if (linkImgbb) {
          linkImgbb.href = (mediaObj && mediaObj.imgbbUrl) || url || '#';
        }
        if (linkPost) {
          linkPost.href = (mediaObj && (mediaObj.postimageUrl || mediaObj.catboxUrl)) || url || '#';
        }
      }

      setMediaReceipt('pp', uploadedMedia.ppPhoto);
      setMediaReceipt('student', uploadedMedia.studentIdCard);
      setMediaReceipt('reg', uploadedMedia.regCard);
      setMediaReceipt('sign', uploadedMedia.signature);

      // Switch view to Confirmation Dossier
      document.getElementById('registration-view').classList.add('hidden');
      document.getElementById('confirmation-view').classList.remove('hidden');

      const tabConf = document.getElementById('nav-tab-confirmation');
      const tabForm = document.getElementById('nav-tab-form');
      if (tabConf) tabConf.className = "px-3.5 py-2 rounded-lg text-sm font-semibold transition-all bg-primary-container text-on-primary shadow-xs";
      if (tabForm) tabForm.className = "px-3.5 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all";

      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Submission Error:', err);
      showStatus(`Error: ${err.message || 'Unable to submit registration. Please check your network and try again.'}`, true);
    } finally {
      btnSubmit.disabled = false;
      btnSpinner.classList.add('hidden');
      btnIcon.classList.remove('hidden');
      btnText.textContent = 'Submit Co-Author Registration';
    }
  });
}

/**
 * Universal Lightbox modal for research figures & photos
 */
window.openLightbox = function(imgSrc, caption = '') {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (!modal || !img) return;

  img.src = imgSrc;
  if (cap) cap.textContent = caption;
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
