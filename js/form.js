/**
 * IEEE i-COSTE 2026 Public Registration Form Logic
 */
(function() {
  // 1. Bangladesh Divisions & 64 Districts Data Mapping
  var BD_DIVISIONS = {
    "Barishal": ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
    "Chattogram": ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"],
    "Dhaka": ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
    "Khulna": ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
    "Mymensingh": ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
    "Rajshahi": ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"],
    "Rangpur": ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
    "Sylhet": ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"]
  };

  // State of uploaded images: { imgbbUrl, postimageUrl, preferredUrl }
  var uploadedImages = {
    ppPhoto: null,
    studentIdCard: null,
    regCard: null,
    signature: null
  };

  var fullNameManuallyEdited = false;

  // DOM Elements
  var form = document.getElementById('coauthor-form');
  var btnSubmit = document.getElementById('btn-submit');
  var btnSubmitText = document.getElementById('btn-submit-text');
  var btnSubmitSpinner = document.getElementById('btn-submit-spinner');
  var submitNoticeBanner = document.getElementById('submit-notice-banner');

  var firstNameInput = document.getElementById('firstName');
  var lastNameInput = document.getElementById('lastName');
  var fullNameInput = document.getElementById('fullName');
  var dobInput = document.getElementById('dob');

  // Address elements
  var presentAddressInput = document.getElementById('presentAddress');
  var presentDivisionSelect = document.getElementById('presentDivision');
  var presentDistrictSelect = document.getElementById('presentDistrict');

  var sameAsPresentCheck = document.getElementById('sameAsPresent');
  var permanentAddressInput = document.getElementById('permanentAddress');
  var permanentDivisionSelect = document.getElementById('permanentDivision');
  var permanentDistrictSelect = document.getElementById('permanentDistrict');

  var declarationCheckbox = document.getElementById('declaration');

  var successScreen = document.getElementById('success-screen');
  var btnSubmitAnother = document.getElementById('btn-submit-another');
  var btnNewForm = document.getElementById('btn-new-form');

  window.addEventListener('DOMContentLoaded', function() {
    var today = new Date().toISOString().split('T')[0];
    dobInput.setAttribute('max', today);
  });

  // 2. Cascading Divisions & Districts Setup Helper
  function setupCascadingDropdown(divSelect, distSelect) {
    divSelect.addEventListener('change', function() {
      var selDiv = this.value;
      distSelect.innerHTML = '<option value="" disabled selected>Select District</option>';
      if (BD_DIVISIONS[selDiv]) {
        BD_DIVISIONS[selDiv].forEach(function(district) {
          var opt = document.createElement('option');
          opt.value = district;
          opt.textContent = district;
          distSelect.appendChild(opt);
        });
        distSelect.disabled = false;
      } else {
        distSelect.disabled = true;
      }
      validateField(divSelect);
      validateField(distSelect);

      if (sameAsPresentCheck && sameAsPresentCheck.checked && divSelect === presentDivisionSelect) {
        syncPermanentAddress();
      }
      checkFormValidity();
    });

    distSelect.addEventListener('change', function() {
      validateField(this);
      if (sameAsPresentCheck && sameAsPresentCheck.checked && distSelect === presentDistrictSelect) {
        syncPermanentAddress();
      }
      checkFormValidity();
    });
  }

  setupCascadingDropdown(presentDivisionSelect, presentDistrictSelect);
  setupCascadingDropdown(permanentDivisionSelect, permanentDistrictSelect);

  // Sync Present Address to Permanent Address when checkbox is ticked
  function syncPermanentAddress() {
    permanentAddressInput.value = presentAddressInput.value;
    var selDiv = presentDivisionSelect.value;
    permanentDivisionSelect.value = selDiv;

    permanentDistrictSelect.innerHTML = '<option value="" disabled selected>Select District</option>';
    if (BD_DIVISIONS[selDiv]) {
      BD_DIVISIONS[selDiv].forEach(function(district) {
        var opt = document.createElement('option');
        opt.value = district;
        opt.textContent = district;
        permanentDistrictSelect.appendChild(opt);
      });
      permanentDistrictSelect.disabled = false;
      permanentDistrictSelect.value = presentDistrictSelect.value;
    } else {
      permanentDistrictSelect.disabled = true;
    }

    validateField(permanentAddressInput);
    validateField(permanentDivisionSelect);
    validateField(permanentDistrictSelect);
  }

  if (sameAsPresentCheck) {
    sameAsPresentCheck.addEventListener('change', function() {
      if (this.checked) {
        syncPermanentAddress();
      }
      checkFormValidity();
    });

    presentAddressInput.addEventListener('input', function() {
      if (sameAsPresentCheck.checked) {
        permanentAddressInput.value = this.value;
        validateField(permanentAddressInput);
      }
      validateField(this);
      checkFormValidity();
    });
  }

  // 3. Auto-suggest Full Name
  function updateFullNameSuggestion() {
    if (!fullNameManuallyEdited) {
      var first = firstNameInput.value.trim();
      var last = lastNameInput.value.trim();
      var full = (first + ' ' + last).trim();
      fullNameInput.value = full;
      if (full) {
        validateField(fullNameInput);
      }
    }
  }

  firstNameInput.addEventListener('input', function() {
    updateFullNameSuggestion();
    validateField(this);
    checkFormValidity();
  });

  lastNameInput.addEventListener('input', function() {
    updateFullNameSuggestion();
    validateField(this);
    checkFormValidity();
  });

  fullNameInput.addEventListener('input', function() {
    fullNameManuallyEdited = true;
    validateField(this);
    checkFormValidity();
  });

  // 4. Validation Rules & Realtime Feedback
  var phoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var nidRegex = /^(\d{10}|\d{13}|\d{17})$/;

  function validateField(el) {
    if (!el) return true;
    var id = el.id;
    var val = el.value ? el.value.trim() : '';
    var isValid = true;
    var errEl = document.getElementById('err-' + id);

    switch(id) {
      case 'paperId':
      case 'paperTitle':
      case 'firstName':
      case 'lastName':
      case 'fullName':
      case 'gender':
      case 'nationality':
      case 'bloodGroup':
      case 'universityName':
      case 'departmentName':
      case 'programDegree':
      case 'batch':
      case 'studentId':
      case 'levelTerm':
      case 'presentAddress':
      case 'presentDivision':
      case 'presentDistrict':
      case 'permanentAddress':
      case 'permanentDivision':
      case 'permanentDistrict':
        isValid = val.length > 0;
        break;

      case 'primaryPhone':
      case 'altPhone':
        isValid = phoneRegex.test(val);
        break;

      case 'email':
        isValid = emailRegex.test(val);
        break;

      case 'nidNumber':
        isValid = nidRegex.test(val);
        break;

      case 'fbProfile':
        isValid = /^https?:\/\//i.test(val) && val.toLowerCase().indexOf('facebook.com') > -1;
        break;

      case 'linkedInProfile':
        isValid = /^https?:\/\//i.test(val) && val.toLowerCase().indexOf('linkedin.com') > -1;
        break;

      case 'dob':
        if (!val) {
          isValid = false;
        } else {
          var dobDate = new Date(val);
          var now = new Date();
          var age = (now - dobDate) / (365.25 * 24 * 60 * 60 * 1000);
          isValid = !isNaN(dobDate.getTime()) && dobDate < now && age >= 15 && age <= 100;
        }
        break;

      case 'declaration':
        isValid = el.checked;
        break;
    }

    if (isValid) {
      el.classList.remove('is-invalid');
      el.classList.add('is-valid');
      if (errEl) errEl.classList.remove('show');
    } else {
      el.classList.remove('is-valid');
      el.classList.add('is-invalid');
      if (errEl) errEl.classList.add('show');
    }

    return isValid;
  }

  // All tracked inputs
  var trackedInputs = [
    'paperId', 'paperTitle', 'firstName', 'lastName', 'fullName', 'dob',
    'gender', 'nationality', 'bloodGroup', 'universityName', 'departmentName',
    'programDegree', 'batch', 'studentId', 'levelTerm',
    'primaryPhone', 'altPhone', 'email', 'fbProfile', 'linkedInProfile',
    'presentAddress', 'presentDivision', 'presentDistrict',
    'permanentAddress', 'permanentDivision', 'permanentDistrict',
    'nidNumber', 'declaration'
  ];

  trackedInputs.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function() {
        validateField(this);
        checkFormValidity();
      });
      el.addEventListener('blur', function() {
        validateField(this);
        checkFormValidity();
      });
      el.addEventListener('change', function() {
        validateField(this);
        checkFormValidity();
      });
    }
  });

  // 5. Image Upload Handling (4 slots)
  var imageKeys = ['ppPhoto', 'studentIdCard', 'regCard', 'signature'];

  imageKeys.forEach(function(key) {
    var fileInput = document.getElementById('file-' + key);
    var changeInput = document.getElementById('change-' + key);

    if (fileInput) {
      fileInput.addEventListener('change', function() {
        handleImageSelection(this.files[0], key);
      });
    }

    if (changeInput) {
      changeInput.addEventListener('change', function() {
        handleImageSelection(this.files[0], key);
      });
    }
  });

  async function handleImageSelection(file, key) {
    if (!file) return;

    var validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (validTypes.indexOf(file.type) === -1) {
      showToast('Only JPG, JPEG, and PNG images are allowed.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be less than 5 MB.', 'error');
      return;
    }

    var card = document.getElementById('dropzone-' + key);
    var idleState = document.getElementById('idle-' + key);
    var spinnerState = document.getElementById('spinner-' + key);
    var previewState = document.getElementById('preview-' + key);
    var thumbImg = document.getElementById('thumb-' + key);
    var errEl = document.getElementById('err-' + key);

    card.classList.remove('has-file');
    card.classList.add('is-uploading');
    idleState.style.display = 'none';
    previewState.style.display = 'none';
    spinnerState.style.display = 'flex';
    if (errEl) errEl.classList.remove('show');

    var reader = new FileReader();
    reader.onload = async function(e) {
      var base64Data = e.target.result;

      try {
        var response = await Api.uploadImage(base64Data, file.name, file.type, key);

        if (response && response.success) {
          uploadedImages[key] = {
            imgbbUrl: response.imgbbUrl,
            postimageUrl: response.postimageUrl,
            preferredUrl: response.preferredUrl
          };

          card.classList.remove('is-uploading');
          card.classList.add('has-file');
          spinnerState.style.display = 'none';
          idleState.style.display = 'none';
          previewState.style.display = 'flex';

          thumbImg.src = response.preferredUrl || base64Data;
          if (errEl) errEl.classList.remove('show');

          showToast('Image uploaded successfully!', 'success');
        } else {
          throw new Error((response && response.error) ? response.error : 'Upload failed.');
        }
      } catch (err) {
        uploadedImages[key] = null;
        resetUploadCard(key);
        showToast(err.message || 'Image upload error.', 'error');
      }

      checkFormValidity();
    };

    reader.onerror = function() {
      showToast('Failed to read image file.', 'error');
      resetUploadCard(key);
    };

    reader.readAsDataURL(file);
  }

  function resetUploadCard(key) {
    var card = document.getElementById('dropzone-' + key);
    var idleState = document.getElementById('idle-' + key);
    var spinnerState = document.getElementById('spinner-' + key);
    var previewState = document.getElementById('preview-' + key);

    card.classList.remove('is-uploading');
    card.classList.remove('has-file');
    spinnerState.style.display = 'none';
    previewState.style.display = 'none';
    idleState.style.display = 'block';
  }

  // 6. Check Overall Form Validity
  function checkFormValidity() {
    var allInputsValid = true;

    trackedInputs.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        var val = el.value ? el.value.trim() : '';
        if (id === 'declaration') {
          if (!el.checked) allInputsValid = false;
        } else if (!val) {
          allInputsValid = false;
        } else {
          if ((id === 'primaryPhone' || id === 'altPhone') && !phoneRegex.test(val)) allInputsValid = false;
          if (id === 'email' && !emailRegex.test(val)) allInputsValid = false;
          if (id === 'nidNumber' && !nidRegex.test(val)) allInputsValid = false;
        }
      }
    });

    var allImagesUploaded = true;
    imageKeys.forEach(function(k) {
      if (!uploadedImages[k] || (!uploadedImages[k].imgbbUrl && !uploadedImages[k].postimageUrl)) {
        allImagesUploaded = false;
      }
    });

    if (allInputsValid && allImagesUploaded) {
      btnSubmit.disabled = false;
      submitNoticeBanner.innerHTML = '<span style="color: #059669; font-weight: 600;">&#10003; All fields verified and 4 documents uploaded. You can now submit!</span>';
    } else {
      btnSubmit.disabled = true;
      if (!allImagesUploaded) {
        submitNoticeBanner.innerHTML = 'Please upload all 4 required documents (photos/scans) to enable submission.';
      } else {
        submitNoticeBanner.innerHTML = 'Please fill in all mandatory fields with valid information to enable submission.';
      }
    }

    return allInputsValid && allImagesUploaded;
  }

  // 7. Form Submission Handler
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    var firstInvalidEl = null;
    trackedInputs.forEach(function(id) {
      var el = document.getElementById(id);
      if (el && !validateField(el)) {
        if (!firstInvalidEl) firstInvalidEl = el;
      }
    });

    var missingImg = false;
    imageKeys.forEach(function(k) {
      if (!uploadedImages[k] || (!uploadedImages[k].imgbbUrl && !uploadedImages[k].postimageUrl)) {
        var errEl = document.getElementById('err-' + k);
        if (errEl) errEl.classList.add('show');
        missingImg = true;
      }
    });

    if (firstInvalidEl) {
      firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalidEl.focus();
      showToast('Please correct the highlighted fields before submitting.', 'error');
      return;
    }

    if (missingImg) {
      document.getElementById('dropzone-ppPhoto').scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Please upload all 4 required images before submitting.', 'error');
      return;
    }

    // Build payload matching all 39 columns
    var payload = {
      paperId: document.getElementById('paperId').value.trim(),
      paperTitle: document.getElementById('paperTitle').value.trim(),
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      fullName: document.getElementById('fullName').value.trim(),
      dob: document.getElementById('dob').value.trim(),
      gender: document.getElementById('gender').value,
      nationality: document.getElementById('nationality').value.trim(),
      bloodGroup: document.getElementById('bloodGroup').value,
      nidNumber: document.getElementById('nidNumber').value.trim(),
      universityName: document.getElementById('universityName').value.trim(),
      departmentName: document.getElementById('departmentName').value.trim(),
      programDegree: document.getElementById('programDegree').value.trim(),
      batch: document.getElementById('batch').value.trim(),
      studentId: document.getElementById('studentId').value.trim(),
      levelTerm: document.getElementById('levelTerm').value.trim(),
      primaryPhone: document.getElementById('primaryPhone').value.trim(),
      altPhone: document.getElementById('altPhone').value.trim(),
      email: document.getElementById('email').value.trim(),
      fbProfile: document.getElementById('fbProfile').value.trim(),
      linkedInProfile: document.getElementById('linkedInProfile').value.trim(),
      presentAddress: document.getElementById('presentAddress').value.trim(),
      presentDivision: document.getElementById('presentDivision').value,
      presentDistrict: document.getElementById('presentDistrict').value,
      permanentAddress: document.getElementById('permanentAddress').value.trim(),
      permanentDivision: document.getElementById('permanentDivision').value,
      permanentDistrict: document.getElementById('permanentDistrict').value,
      declaration: document.getElementById('declaration').checked,
      ppPhoto: uploadedImages.ppPhoto,
      studentIdCard: uploadedImages.studentIdCard,
      regCard: uploadedImages.regCard,
      signature: uploadedImages.signature
    };

    btnSubmit.disabled = true;
    btnSubmitText.textContent = 'Submitting Registration Data...';
    btnSubmitSpinner.style.display = 'block';

    try {
      var res = await Api.submitForm(payload);

      btnSubmit.disabled = false;
      btnSubmitText.textContent = 'Submit Co-Author Registration';
      btnSubmitSpinner.style.display = 'none';

      if (res && res.success) {
        document.getElementById('receipt-sl').textContent = res.sl || 'Recorded';
        document.getElementById('receipt-paper-id').textContent = res.paperId || '-';
        document.getElementById('receipt-name').textContent = res.fullName || '-';
        document.getElementById('receipt-timestamp').textContent = res.timestamp || new Date().toLocaleString();

        form.style.display = 'none';
        successScreen.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Registration submitted successfully!', 'success');
      } else {
        var msg = (res && res.error) ? res.error : 'Submission failed. Please check your inputs.';
        showToast(msg, 'error');
      }
    } catch (err) {
      btnSubmit.disabled = false;
      btnSubmitText.textContent = 'Submit Co-Author Registration';
      btnSubmitSpinner.style.display = 'none';
      showToast(err.message || 'Error communicating with Google Apps Script backend.', 'error');
    }
  });

  // 8. Register Another Co-Author (Same Paper)
  btnSubmitAnother.addEventListener('click', function() {
    var savedPaperId = document.getElementById('paperId').value;
    var savedPaperTitle = document.getElementById('paperTitle').value;

    form.reset();
    document.getElementById('paperId').value = savedPaperId;
    document.getElementById('paperTitle').value = savedPaperTitle;
    document.getElementById('nationality').value = 'Bangladeshi';

    imageKeys.forEach(function(k) {
      uploadedImages[k] = null;
      resetUploadCard(k);
    });

    fullNameManuallyEdited = false;
    presentDistrictSelect.disabled = true;
    presentDistrictSelect.innerHTML = '<option value="" disabled selected>Select Division First</option>';
    permanentDistrictSelect.disabled = true;
    permanentDistrictSelect.innerHTML = '<option value="" disabled selected>Select Division First</option>';

    var validatedEls = document.querySelectorAll('.is-valid, .is-invalid');
    validatedEls.forEach(function(el) {
      el.classList.remove('is-valid');
      el.classList.remove('is-invalid');
    });

    successScreen.style.display = 'none';
    form.style.display = 'block';
    checkFormValidity();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 9. Submit New Paper Registration
  btnNewForm.addEventListener('click', function() {
    form.reset();
    document.getElementById('nationality').value = 'Bangladeshi';
    imageKeys.forEach(function(k) {
      uploadedImages[k] = null;
      resetUploadCard(k);
    });

    fullNameManuallyEdited = false;
    presentDistrictSelect.disabled = true;
    presentDistrictSelect.innerHTML = '<option value="" disabled selected>Select Division First</option>';
    permanentDistrictSelect.disabled = true;
    permanentDistrictSelect.innerHTML = '<option value="" disabled selected>Select Division First</option>';

    var validatedEls = document.querySelectorAll('.is-valid, .is-invalid');
    validatedEls.forEach(function(el) {
      el.classList.remove('is-valid');
      el.classList.remove('is-invalid');
    });

    successScreen.style.display = 'none';
    form.style.display = 'block';
    checkFormValidity();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Toast Notification Helper
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
