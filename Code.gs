/**
 * IEEE i-COSTE 2026 Co-Author Registration System — Backend API
 * Conference: 12th IEEE International Conference on Sustainable Technology and Engineering
 * Theme: "Sustainable Technology for Humanity & Global Impact"
 * Dates: 1–3 November 2026 | Best Western Heritage, Cox's Bazar, Bangladesh
 * Host: Bangladesh University of Business and Technology (BUBT)
 * 
 * Standalone Google Apps Script API endpoint.
 * Serves static frontends hosted on GitHub Pages, Netlify, or custom domains.
 */

var SPREADSHEET_ID = '1SL8JUzc88AAaOzQABn49JfF9d6omrmAQ_qgIthiokZo';

// Target 39 headers aligned with the updated Responses sheet
var TARGET_HEADERS = [
  "Timestamp",
  "SL",
  "First Name",
  "Last Name",
  "Full Name",
  "Date of Birth",
  "Gender",
  "Nationality",
  "Blood Group",
  "University Name",
  "Department Name",
  "Program / Degree",
  "Batch",
  "Student ID",
  "Level-Term",
  "Primary Phone Number",
  "Alternative Phone Number",
  "Email Address",
  "Facebook Profile Link",
  "LinkedIn Profile Link",
  "Present Address",
  "Present_Division",
  "Present_District",
  "Permanent Address",
  "Permanent_Division",
  "Permanent_District",
  "PP Size Photo",
  "NID Number",
  "Declaration",
  "Paper ID",
  "Paper Title",
  "PP Size Photo (ImgBB)",
  "PP Size Photo (PostImage)",
  "Student ID Card Picture (ImgBB)",
  "Student ID Card Picture (PostImage)",
  "(SSC/HSC) Registration Card Picture (ImgBB)",
  "(SSC/HSC) Registration Card Picture (PostImage)",
  "Applicant's Signature (ImgBB)",
  "Applicant's Signature (PostImage)"
];

/**
 * Handle HTTP GET requests (health checks & lightweight queries).
 */
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action) {
      var action = e.parameter.action;
      if (action === 'getResponses') {
        return createJsonResponse_(getAdminResponses(e.parameter.token));
      }
      if (action === 'ping') {
        return createJsonResponse_({
          success: true,
          status: 'ONLINE',
          message: 'IEEE i-COSTE 2026 Registration API is running.'
        });
      }
    }

    return createJsonResponse_({
      status: 'ONLINE',
      system: 'IEEE i-COSTE 2026 Co-Author Registration Backend API',
      spreadsheetId: SPREADSHEET_ID,
      version: '2.0.0',
      description: 'API endpoint for GitHub Pages / Netlify static frontend',
      supportedActions: [
        'uploadImage',
        'submitForm',
        'adminLogin',
        'getResponses',
        'deleteSubmission',
        'adminLogout'
      ]
    });
  } catch (err) {
    return createJsonResponse_({ success: false, error: err.message });
  }
}

/**
 * Handle HTTP POST requests from external frontends (GitHub Pages, Netlify, etc.)
 * Note: Payload sent as text/plain from fetch() bypasses CORS preflight restrictions.
 */
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    if (!raw) {
      return createJsonResponse_({ success: false, error: 'Empty request payload.' });
    }

    var data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      return createJsonResponse_({ success: false, error: 'Invalid JSON payload: ' + parseErr.message });
    }

    var action = data.action;

    switch (action) {
      case 'uploadImage':
        return createJsonResponse_(uploadImage(data.base64Data, data.fileName, data.mimeType, data.fieldKey));

      case 'submitForm':
        return createJsonResponse_(submitCoAuthorForm(data.formData));

      case 'adminLogin':
        return createJsonResponse_(adminLogin(data.username, data.password));

      case 'getResponses':
        return createJsonResponse_(getAdminResponses(data.token));

      case 'deleteSubmission':
        return createJsonResponse_(deleteSubmission(data.token, data.sheetRowIndex, data.sl));

      case 'adminLogout':
        return createJsonResponse_(adminLogout(data.token));

      case 'ensureSchema':
        return createJsonResponse_({ success: true, added: ensureResponsesSchema() });

      case 'ping':
        return createJsonResponse_({ success: true, message: 'pong' });

      default:
        return createJsonResponse_({ success: false, error: 'Unknown API action: ' + action });
    }
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return createJsonResponse_({ success: false, error: 'Server exception: ' + err.message });
  }
}

/**
 * Creates a CORS-friendly JSON text output.
 */
function createJsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Safe accessor for the target spreadsheet.
 */
function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Add custom menu to Google Spreadsheet for manual management.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('IEEE i-COSTE 2026')
    .addItem('Ensure Responses Schema', 'ensureResponsesSchema')
    .addItem('Authorize Google Drive & Services', 'authorizeServices')
    .addItem('Test Third-Party API Keys', 'testApiKeys_')
    .addToUi();
}

/**
 * One-click helper to prompt and grant OAuth permissions for Drive, Sheets, and UrlFetch.
 */
function authorizeServices() {
  DriveApp.getRootFolder();
  SpreadsheetApp.getActiveSpreadsheet();
  UrlFetchApp.fetch('https://www.google.com');
  Logger.log('Services authorized successfully.');
  try {
    SpreadsheetApp.getUi().alert('Authorization Status', 'Google Drive, Spreadsheets, and Network services are successfully authorized!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Public wrapper for schema setup callable from Apps Script IDE or menu.
 */
function ensureResponsesSchema() {
  var count = ensureResponsesSchema_();
  Logger.log('Schema ensured. Newly added headers: ' + count);
  return count;
}

/**
 * Ensures the API sheet tab exists for third-party keys.
 */
function ensureApiSheet_() {
  try {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName('API');
    if (!sheet) {
      sheet = ss.insertSheet('API');
      sheet.getRange(1, 1, 1, 2).setValues([['Server', 'API_KEY']]);
      sheet.getRange(2, 1, 1, 2).setValues([['IMGBB', '']]);
      sheet.getRange(3, 1, 1, 2).setValues([['Post_Image', '']]);
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#F1F5F9');
    }
    return sheet;
  } catch (e) {
    Logger.log('ensureApiSheet_ note: ' + e.message);
    return null;
  }
}

/**
 * Ensures the Responses sheet has all 39 target headers in row 1.
 * Appends any missing headers without mutating existing column order.
 * Returns the number of newly added headers.
 */
function ensureResponsesSchema_() {
  ensureApiSheet_();
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Responses');
  if (!sheet) {
    sheet = ss.insertSheet('Responses');
  }

  var lastCol = sheet.getLastColumn();
  var currentHeaders = [];
  if (lastCol > 0) {
    currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h).trim();
    });
  }

  // Normalize existing headers for case-insensitive lookup
  var existingNormalized = {};
  currentHeaders.forEach(function(h) {
    if (h) existingNormalized[h.toLowerCase()] = true;
  });

  var missingHeaders = [];
  TARGET_HEADERS.forEach(function(target) {
    if (!existingNormalized[target.toLowerCase()]) {
      missingHeaders.push(target);
    }
  });

  if (missingHeaders.length > 0) {
    var startCol = currentHeaders.length + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    var newLastCol = sheet.getLastColumn();
    var headerRange = sheet.getRange(1, 1, 1, newLastCol);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#F1F5F9');
  }

  return missingHeaders.length;
}

/**
 * Cleans up and extracts raw HTTP/HTTPS URLs from cell content,
 * stripping extra quotes, whitespace, or =HYPERLINK("...", ...) formulas.
 */
function cleanUrl_(val) {
  if (!val) return '';
  var str = String(val).trim();
  if (!str) return '';
  var match = str.match(/https?:\/\/[^\s"',)]+/i);
  if (match) return match[0];
  if (/^https?:\/\//i.test(str)) return str;
  return str;
}

/**
 * Builds a normalized lookup map of header names to 0-based column indices.
 */
function getHeaderMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function(h, idx) {
    if (h !== null && h !== undefined) {
      var key = String(h).trim().toLowerCase();
      map[key] = idx;
    }
  });
  return map;
}

/**
 * Reads API key for a specified server from the "API" tab.
/**
 * Optional default API keys if not configured in the spreadsheet's "API" tab.
 * You can paste an ImgBB or PostImage API key here, or enter it in the "API" sheet tab.
 */
var CONFIG_API_KEYS = {
  IMGBB: '',
  POSTIMAGE: ''
};

/**
 * Reads API key for a specified server from the "API" tab or fallback configuration.
 * Always safe; never throws an exception if the tab does not exist.
 */
function getApiKey_(serverName) {
  try {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName('API');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var target = String(serverName).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        for (var i = 1; i < data.length; i++) {
          var s = String(data[i][0]).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (s === target) {
            var val = String(data[i][1]).trim();
            if (val) return val;
          }
        }
      }
    }
  } catch (err) {
    Logger.log('getApiKey_ lookup note: ' + err.message);
  }

  // Fallback to CONFIG_API_KEYS if defined
  var upper = String(serverName).toUpperCase().replace(/[^A-Z]/g, '');
  if (CONFIG_API_KEYS[upper]) {
    return CONFIG_API_KEYS[upper];
  }
  return null;
}

/**
 * Multi-cloud image upload proxy.
 * Prioritizes ImgBB & PostImage when keys exist, includes zero-config Catbox CDN,
 * and natively backs up to Google Drive so submissions NEVER fail.
 */
function uploadImage(base64Data, fileName, mimeType, fieldKey) {
  try {
    if (!base64Data) {
      return { success: false, error: 'No image data provided for ' + (fieldKey || 'file') };
    }

    // Strip data URL prefix if present
    var cleanBase64 = base64Data;
    if (cleanBase64.indexOf(',') > -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    var safeFileName = fileName || ('icoste_' + (fieldKey || 'img') + '_' + new Date().getTime() + '.jpg');
    var safeMimeType = mimeType || 'image/jpeg';

    var imgbbUrl = null;
    var postimageUrl = null;
    var catboxUrl = null;
    var driveUrl = null;
    var driveThumbnailUrl = null;
    var errors = [];

    // 1. Try ImgBB (if key configured)
    var imgbbKey = getApiKey_('IMGBB');
    if (imgbbKey) {
      try {
        imgbbUrl = uploadToImgbb_(cleanBase64, safeFileName, imgbbKey);
      } catch (e) {
        Logger.log('ImgBB upload note for ' + fieldKey + ': ' + e.message);
        errors.push('ImgBB: ' + e.message);
      }
    }

    // 2. Try PostImage (if key configured)
    var postimageKey = getApiKey_('Post_Image') || getApiKey_('PostImage');
    if (postimageKey) {
      try {
        postimageUrl = uploadToPostimage_(cleanBase64, safeFileName, safeMimeType, postimageKey);
      } catch (e) {
        Logger.log('PostImage upload note for ' + fieldKey + ': ' + e.message);
        errors.push('PostImage: ' + e.message);
      }
    }

    // 3. Try Catbox Cloud Storage (Zero-Configuration, Free, Unlimited)
    try {
      catboxUrl = uploadToCatbox_(cleanBase64, safeFileName, safeMimeType);
    } catch (e) {
      Logger.log('Catbox upload note for ' + fieldKey + ': ' + e.message);
      errors.push('Catbox: ' + e.message);
    }

    // 4. Native Google Drive Cloud Vault
    try {
      var driveRes = uploadToGoogleDrive_(cleanBase64, safeFileName, safeMimeType, fieldKey);
      if (driveRes) {
        driveUrl = driveRes.viewUrl;
        driveThumbnailUrl = driveRes.thumbnailUrl;
      }
    } catch (e) {
      Logger.log('Google Drive upload error for ' + fieldKey + ': ' + e.message);
      errors.push('Drive: ' + e.message);
    }

    // Determine primary and secondary display URLs
    var preferredUrl = imgbbUrl || postimageUrl || catboxUrl || driveThumbnailUrl || driveUrl;
    var fallbackUrl = catboxUrl || driveUrl || driveThumbnailUrl || postimageUrl || imgbbUrl;

    if (!preferredUrl && !fallbackUrl) {
      return {
        success: false,
        error: 'Image upload failed for ' + fieldKey + '. Details: ' + (errors.join('; ') || 'Storage error')
      };
    }

    return {
      success: true,
      imgbbUrl: imgbbUrl || catboxUrl || driveThumbnailUrl || driveUrl,
      postimageUrl: postimageUrl || catboxUrl || driveUrl || driveThumbnailUrl,
      catboxUrl: catboxUrl,
      driveUrl: driveUrl,
      preferredUrl: preferredUrl || fallbackUrl
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Uploads an image to Catbox (free, reliable image hosting, no key needed).
 */
function uploadToCatbox_(base64Data, fileName, mimeType) {
  var cleanBase64 = base64Data;
  if (cleanBase64.indexOf(',') > -1) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  var bytes = Utilities.base64Decode(cleanBase64);
  var safeMime = mimeType || 'image/jpeg';
  var safeName = fileName || ('icoste_upload_' + new Date().getTime() + '.jpg');
  var blob = Utilities.newBlob(bytes, safeMime, safeName);

  var payload = {
    reqtype: 'fileupload',
    fileToUpload: blob
  };

  var options = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://catbox.moe/user/api.php', options);
  var code = response.getResponseCode();
  var text = response.getContentText().trim();

  if (code >= 200 && code < 300 && text.indexOf('http') === 0) {
    return text;
  }

  throw new Error('Catbox returned status ' + code + ': ' + text);
}

/**
 * Uploads an image natively to Google Drive in the IEEE_iCOSTE_2026_Uploads folder.
 * Zero-configuration and completely reliable.
 */
function uploadToGoogleDrive_(base64Data, fileName, mimeType, fieldKey) {
  var cleanBase64 = base64Data;
  if (cleanBase64.indexOf(',') > -1) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  var bytes = Utilities.base64Decode(cleanBase64);
  var safeMime = mimeType || 'image/jpeg';
  var safeName = fileName || ('icoste_' + (fieldKey || 'upload') + '_' + new Date().getTime() + '.jpg');
  var blob = Utilities.newBlob(bytes, safeMime, safeName);

  var folderName = 'IEEE_iCOSTE_2026_Uploads';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log('Drive setSharing note: ' + e.message);
  }

  var fileId = file.getId();
  var driveThumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
  var driveViewUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;

  return {
    fileId: fileId,
    viewUrl: driveViewUrl,
    thumbnailUrl: driveThumbnailUrl
  };
}

/**
 * Uploads an image to ImgBB REST API.
 */
function uploadToImgbb_(base64Data, fileName, apiKey) {
  var key = apiKey || getApiKey_('IMGBB');
  if (!key) {
    throw new Error('ImgBB API key is not configured.');
  }

  var payload = {
    key: key,
    image: base64Data,
    name: fileName
  };

  var options = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://api.imgbb.com/1/upload', options);
  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code >= 200 && code < 300) {
    var json = JSON.parse(text);
    if (json && json.data) {
      return json.data.url || json.data.display_url;
    }
  }

  throw new Error('ImgBB returned status ' + code + ': ' + text);
}

/**
 * Uploads an image to PostImage API with defensive error handling.
 */
function uploadToPostimage_(base64Data, fileName, mimeType, apiKey) {
  var key = apiKey || getApiKey_('Post_Image') || getApiKey_('PostImage');
  if (!key) {
    return null;
  }

  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', fileName || 'upload.jpg');

  var payload = {
    key: key,
    image: blob,
    version: '1.0.1',
    name: fileName || 'upload.jpg',
    portable: '1'
  };

  var options = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://api.postimage.org/1/upload', options);
  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code >= 200 && code < 300) {
    try {
      var json = JSON.parse(text);
      if (json && json.url) return json.url;
      if (json && json.data && json.data.url) return json.data.url;
    } catch (err) {
      var urlMatch = text.match(/<url>([^<]+)<\/url>/i) ||
                     text.match(/https?:\/\/i\.postimg\.cc\/[^\s<"']+/i) ||
                     text.match(/https?:\/\/postimg\.cc\/[^\s<"']+/i);
      if (urlMatch) {
        return urlMatch[1] || urlMatch[0];
      }
    }
  }

  Logger.log('PostImage upload non-2xx or unparseable: ' + code + ' ' + text);
  return null;
}

/**
 * Server-side validation of registration form data.
 */
function validateFormData_(data) {
  var errors = [];

  function req(val, name) {
    if (!val || String(val).trim() === '') {
      errors.push(name + ' is required.');
    }
  }

  req(data.firstName, 'First Name');
  req(data.lastName, 'Last Name');
  req(data.fullName, 'Full Name');
  req(data.dob, 'Date of Birth');
  req(data.gender, 'Gender');
  req(data.nationality, 'Nationality');
  req(data.bloodGroup, 'Blood Group');
  req(data.universityName, 'University Name');
  req(data.departmentName, 'Department Name');
  req(data.programDegree, 'Program / Degree');
  req(data.batch, 'Batch');
  req(data.studentId, 'Student ID');
  req(data.levelTerm, 'Level-Term');
  req(data.primaryPhone, 'Primary Phone Number');
  req(data.email, 'Email Address');
  req(data.linkedInProfile, 'LinkedIn Profile Link');
  req(data.presentAddress, 'Present Address');
  req(data.presentDivision, 'Present Division');
  req(data.presentDistrict, 'Present District');
  req(data.permanentAddress, 'Permanent Address');
  req(data.permanentDivision, 'Permanent Division');
  req(data.permanentDistrict, 'Permanent District');
  req(data.nidNumber, 'NID Number');

  // BD Phone Regex: ^(\+?880|0)1[3-9]\d{8}$
  var phoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;
  if (data.primaryPhone && !phoneRegex.test(String(data.primaryPhone).trim())) {
    errors.push('Primary Phone Number must be a valid Bangladeshi mobile number (e.g. 017xxxxxxxx or +88017xxxxxxxx).');
  }
  if (data.altPhone && String(data.altPhone).trim() !== '' && !phoneRegex.test(String(data.altPhone).trim())) {
    errors.push('Alternative Phone Number must be a valid Bangladeshi mobile number.');
  }

  // Email format
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(String(data.email).trim())) {
    errors.push('A valid Email Address is required.');
  }

  // BD NID format: 10, 13, or 17 digits
  var nidRegex = /^(\d{10}|\d{13}|\d{17})$/;
  if (data.nidNumber && !nidRegex.test(String(data.nidNumber).trim())) {
    errors.push('NID Number must be 10, 13, or 17 digits.');
  }

  // Social URLs
  if (data.fbProfile) {
    var fb = String(data.fbProfile).trim().toLowerCase();
    if (!/^https?:\/\//i.test(fb) || fb.indexOf('facebook.com') === -1) {
      errors.push('Facebook Profile Link must start with http/https and contain facebook.com.');
    }
  }
  if (data.linkedInProfile) {
    var li = String(data.linkedInProfile).trim().toLowerCase();
    if (!/^https?:\/\//i.test(li) || li.indexOf('linkedin.com') === -1) {
      errors.push('LinkedIn Profile Link must start with http/https and contain linkedin.com.');
    }
  }

  // Date of Birth: reasonable age range (15–100 yrs)
  if (data.dob) {
    var dobDate = new Date(data.dob);
    var now = new Date();
    if (isNaN(dobDate.getTime()) || dobDate >= now) {
      errors.push('Date of Birth must be a valid past date.');
    } else {
      var ageYears = (now - dobDate) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears < 15 || ageYears > 100) {
        errors.push('Date of Birth indicates an age outside the acceptable range (15–100 years).');
      }
    }
  }

  // Declaration
  if (!data.declaration || data.declaration === false || data.declaration === 'false') {
    errors.push('You must agree to the declaration statement.');
  }

  // 4 Images validation (must have at least one URL or base64 data per image)
  function checkImg(obj, label) {
    if (!obj) {
      errors.push(label + ' is required. Please upload the image.');
      return;
    }
    var hasValidUrl = obj.imgbbUrl || obj.postimageUrl || obj.driveUrl || obj.catboxUrl || obj.preferredUrl || obj.preferred || obj.base64 || (typeof obj === 'string' && obj.trim().length > 5);
    if (!hasValidUrl) {
      errors.push(label + ' is required. Please upload the image.');
    }
  }

  checkImg(data.ppPhoto, 'PP Size Photo');
  checkImg(data.studentIdCard, 'Student ID Card Picture');
  checkImg(data.regCard, '(SSC/HSC) Registration Card Picture');
  checkImg(data.signature, "Applicant's Signature");

  return errors;
}

/**
 * Public Form Submission endpoint.
 * Validates, computes next SL, records timestamp, and appends to Responses sheet.
 */
function submitCoAuthorForm(formData) {
  try {
    if (!formData) {
      return { success: false, error: 'No submission data received.' };
    }

    // 1. Server-side validation
    var validationErrors = validateFormData_(formData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join(' ')
      };
    }

    // 2. Ensure schema exists
    ensureResponsesSchema_();

    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName('Responses');
    var headerMap = getHeaderMap_(sheet);

    // 3. Compute next SL
    var slColIdx = headerMap['sl'];
    var nextSL = 1;
    var lastRow = sheet.getLastRow();

    if (lastRow > 1 && slColIdx !== undefined) {
      var slValues = sheet.getRange(2, slColIdx + 1, lastRow - 1, 1).getValues();
      var maxSL = 0;
      for (var r = 0; r < slValues.length; r++) {
        var num = parseInt(slValues[r][0], 10);
        if (!isNaN(num) && num > maxSL) {
          maxSL = num;
        }
      }
      nextSL = maxSL > 0 ? (maxSL + 1) : lastRow;
    }

    // 4. Server-generated Timestamp
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss');

    // 5. Construct row array aligned with column indices
    var maxIdx = -1;
    for (var k in headerMap) {
      if (headerMap[k] > maxIdx) maxIdx = headerMap[k];
    }
    var rowArray = new Array(maxIdx + 1).fill('');

    function setField(headerTitle, value) {
      var key = headerTitle.trim().toLowerCase();
      if (headerMap[key] !== undefined) {
        rowArray[headerMap[key]] = (value !== null && value !== undefined) ? value : '';
      }
    }

    // Map all fields by exact header names
    setField("Timestamp", timestamp);
    setField("SL", nextSL);
    setField("First Name", String(formData.firstName).trim());
    setField("Last Name", String(formData.lastName).trim());
    setField("Full Name", String(formData.fullName).trim());
    setField("Date of Birth", String(formData.dob).trim());
    setField("Gender", String(formData.gender).trim());
    setField("Nationality", String(formData.nationality).trim());
    setField("Blood Group", String(formData.bloodGroup).trim());
    setField("University Name", String(formData.universityName).trim());
    setField("Department Name", String(formData.departmentName).trim());
    setField("Program / Degree", String(formData.programDegree).trim());
    setField("Batch", String(formData.batch).trim());
    setField("Student ID", String(formData.studentId).trim());
    setField("Level-Term", String(formData.levelTerm).trim());
    setField("Primary Phone Number", String(formData.primaryPhone).trim());
    setField("Alternative Phone Number", String(formData.altPhone).trim());
    setField("Email Address", String(formData.email).trim());
    setField("Facebook Profile Link", String(formData.fbProfile).trim());
    setField("LinkedIn Profile Link", String(formData.linkedInProfile).trim());
    setField("Present Address", String(formData.presentAddress).trim());
    setField("Present_Division", String(formData.presentDivision).trim());
    setField("Present_District", String(formData.presentDistrict).trim());
    setField("Permanent Address", String(formData.permanentAddress).trim());
    setField("Permanent_Division", String(formData.permanentDivision).trim());
    setField("Permanent_District", String(formData.permanentDistrict).trim());

    // Helper to resolve or lazily upload image if needed
    function resolveImage(imgObj, fieldKey) {
      if (!imgObj) return { preferred: '', imgbb: '', postimage: '', drive: '', catbox: '' };
      if (typeof imgObj === 'string') {
        var clean = cleanUrl_(imgObj);
        return { preferred: clean, imgbb: clean, postimage: clean, drive: clean, catbox: clean };
      }
      // If image came with base64 but wasn't yet uploaded to cloud
      if (imgObj.base64 && !imgObj.preferredUrl && !imgObj.imgbbUrl && !imgObj.catboxUrl && !imgObj.driveUrl) {
        try {
          var uploadRes = uploadImage(imgObj.base64, imgObj.fileName, imgObj.mimeType, fieldKey);
          if (uploadRes && uploadRes.success) {
            return {
              preferred: uploadRes.preferredUrl || '',
              imgbb: uploadRes.imgbbUrl || '',
              postimage: uploadRes.postimageUrl || '',
              drive: uploadRes.driveUrl || '',
              catbox: uploadRes.catboxUrl || ''
            };
          }
        } catch (uErr) {
          Logger.log('Lazy upload error for ' + fieldKey + ': ' + uErr.message);
        }
      }
      var pref = cleanUrl_(imgObj.preferredUrl || imgObj.preferred || imgObj.imgbbUrl || imgObj.postimageUrl || imgObj.catboxUrl || imgObj.driveUrl || '');
      return {
        preferred: pref,
        imgbb: cleanUrl_(imgObj.imgbbUrl || pref),
        postimage: cleanUrl_(imgObj.postimageUrl || pref),
        drive: cleanUrl_(imgObj.driveUrl || pref),
        catbox: cleanUrl_(imgObj.catboxUrl || pref)
      };
    }

    var ppMedia = resolveImage(formData.ppPhoto, 'ppPhoto');
    var idMedia = resolveImage(formData.studentIdCard, 'studentIdCard');
    var regMedia = resolveImage(formData.regCard, 'regCard');
    var sigMedia = resolveImage(formData.signature, 'signature');

    setField("PP Size Photo", ppMedia.preferred);
    setField("NID Number", String(formData.nidNumber).trim());
    setField("Declaration", "Agreed");
    setField("Paper ID", (formData.paperId ? String(formData.paperId).trim() : ''));
    setField("Paper Title", (formData.paperTitle ? String(formData.paperTitle).trim() : ''));

    // Specific host URLs
    setField("PP Size Photo (ImgBB)", ppMedia.imgbb);
    setField("PP Size Photo (PostImage)", ppMedia.postimage);

    setField("Student ID Card Picture (ImgBB)", idMedia.imgbb);
    setField("Student ID Card Picture (PostImage)", idMedia.postimage);

    setField("(SSC/HSC) Registration Card Picture (ImgBB)", regMedia.imgbb);
    setField("(SSC/HSC) Registration Card Picture (PostImage)", regMedia.postimage);

    setField("Applicant's Signature (ImgBB)", sigMedia.imgbb);
    setField("Applicant's Signature (PostImage)", sigMedia.postimage);

    // Append to sheet
    sheet.appendRow(rowArray);

    return {
      success: true,
      sl: nextSL,
      timestamp: timestamp,
      paperId: formData.paperId || '',
      fullName: formData.fullName
    };
  } catch (err) {
    Logger.log('submitCoAuthorForm exception: ' + err.toString());
    return {
      success: false,
      error: 'Server error: ' + err.message
    };
  }
}

/**
 * Admin Login Authentication.
 * Compares credentials against Admin tab (case-sensitive username, exact passwrod).
 * On success, generates a 20-minute sliding session token.
 */
function adminLogin(username, password) {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required.' };
    }

    var ss = getSpreadsheet_();
    var adminSheet = ss.getSheetByName('Admin');
    if (!adminSheet) {
      return { success: false, error: 'Admin credentials sheet not found.' };
    }

    var data = adminSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, error: 'No admin accounts configured.' };
    }

    var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var userCol = headers.indexOf('username');
    var passCol = headers.indexOf('passwrod'); // Preserving existing typo
    var roleCol = headers.indexOf('role');

    if (userCol === -1 || passCol === -1) {
      return { success: false, error: 'Admin table headers invalid.' };
    }

    var inputUser = String(username).trim();
    var inputPass = String(password).trim();

    var matchedRole = null;
    for (var i = 1; i < data.length; i++) {
      var rowUser = String(data[i][userCol]).trim();
      var rowPass = String(data[i][passCol]).trim();
      if (rowUser === inputUser && rowPass === inputPass) {
        matchedRole = roleCol !== -1 ? String(data[i][roleCol]).trim() : 'admin';
        break;
      }
    }

    if (!matchedRole) {
      return { success: false, error: 'Invalid username or password.' };
    }

    var token = Utilities.getUuid();
    var sessionData = {
      username: inputUser,
      role: matchedRole,
      loginTime: new Date().toISOString()
    };

    var cache = CacheService.getScriptCache();
    cache.put(token, JSON.stringify(sessionData), 1200);

    return {
      success: true,
      token: token,
      role: matchedRole,
      username: inputUser
    };
  } catch (err) {
    Logger.log('adminLogin error: ' + err.toString());
    return { success: false, error: 'Authentication service error: ' + err.message };
  }
}

/**
 * Helper to verify and refresh (sliding expiration) the admin session token.
 */
function verifyAdminSession_(token) {
  if (!token) return null;
  var cache = CacheService.getScriptCache();
  var raw = cache.get(token);
  if (!raw) return null;

  try {
    var session = JSON.parse(raw);
    cache.put(token, raw, 1200);
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch all Responses records for the Admin Dashboard.
 * Requires valid admin session token.
 */
function getAdminResponses(token) {
  var session = verifyAdminSession_(token);
  if (!session) {
    return { error: 'SESSION_EXPIRED' };
  }

  ensureResponsesSchema_();

  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Responses');
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    return {
      success: true,
      responses: [],
      submissions: [],
      role: session.role,
      username: session.username
    };
  }

  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var results = [];

  function getVal(row, headerName) {
    var key = headerName.trim().toLowerCase();
    var idx = headerMap[key];
    if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
      return row[idx];
    }
    return '';
  }

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var sheetRowIndex = i + 2;

    var ppImgbb = cleanUrl_(getVal(row, "PP Size Photo (ImgBB)"));
    var ppPost = cleanUrl_(getVal(row, "PP Size Photo (PostImage)"));
    var ppDirect = cleanUrl_(getVal(row, "PP Size Photo") || getVal(row, "PP Photo") || getVal(row, "Photo"));

    var idImgbb = cleanUrl_(getVal(row, "Student ID Card Picture (ImgBB)"));
    var idPost = cleanUrl_(getVal(row, "Student ID Card Picture (PostImage)"));
    var idDirect = cleanUrl_(getVal(row, "Student ID Card Picture") || getVal(row, "Student ID Card") || getVal(row, "Student ID Photo"));

    var regImgbb = cleanUrl_(getVal(row, "(SSC/HSC) Registration Card Picture (ImgBB)"));
    var regPost = cleanUrl_(getVal(row, "(SSC/HSC) Registration Card Picture (PostImage)"));
    var regDirect = cleanUrl_(getVal(row, "(SSC/HSC) Registration Card Picture") || getVal(row, "Registration Card Picture") || getVal(row, "Registration Card"));

    var sigImgbb = cleanUrl_(getVal(row, "Applicant's Signature (ImgBB)"));
    var sigPost = cleanUrl_(getVal(row, "Applicant's Signature (PostImage)"));
    var sigDirect = cleanUrl_(getVal(row, "Applicant's Signature") || getVal(row, "Signature"));

    var rawTs = getVal(row, "Timestamp");
    var formattedTs = rawTs instanceof Date ?
      Utilities.formatDate(rawTs, 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss') : String(rawTs);

    results.push({
      sheetRowIndex: sheetRowIndex,
      sl: getVal(row, "SL"),
      timestamp: formattedTs,
      paperId: getVal(row, "Paper ID"),
      paperTitle: getVal(row, "Paper Title"),
      firstName: getVal(row, "First Name"),
      lastName: getVal(row, "Last Name"),
      fullName: getVal(row, "Full Name"),
      dob: getVal(row, "Date of Birth"),
      gender: getVal(row, "Gender"),
      nationality: getVal(row, "Nationality"),
      bloodGroup: getVal(row, "Blood Group"),
      universityName: getVal(row, "University Name"),
      departmentName: getVal(row, "Department Name"),
      programDegree: getVal(row, "Program / Degree"),
      batch: getVal(row, "Batch"),
      studentId: getVal(row, "Student ID"),
      levelTerm: getVal(row, "Level-Term"),
      primaryPhone: getVal(row, "Primary Phone Number"),
      altPhone: getVal(row, "Alternative Phone Number"),
      email: getVal(row, "Email Address"),
      fbProfile: getVal(row, "Facebook Profile Link"),
      linkedInProfile: getVal(row, "LinkedIn Profile Link"),
      presentAddress: getVal(row, "Present Address"),
      presentDivision: getVal(row, "Present_Division"),
      presentDistrict: getVal(row, "Present_District"),
      permanentAddress: getVal(row, "Permanent Address"),
      permanentDivision: getVal(row, "Permanent_Division"),
      permanentDistrict: getVal(row, "Permanent_District"),
      nidNumber: getVal(row, "NID Number"),
      declaration: getVal(row, "Declaration"),
      ppPhoto: {
        imgbb: ppImgbb,
        postimage: ppPost,
        preferred: ppDirect || ppImgbb || ppPost || null
      },
      studentIdCard: {
        imgbb: idImgbb,
        postimage: idPost,
        preferred: idDirect || idImgbb || idPost || null
      },
      regCard: {
        imgbb: regImgbb,
        postimage: regPost,
        preferred: regDirect || regImgbb || regPost || null
      },
      signature: {
        imgbb: sigImgbb,
        postimage: sigPost,
        preferred: sigDirect || sigImgbb || sigPost || null
      }
    });
  }

  return {
    success: true,
    responses: results,
    submissions: results,
    role: session.role,
    username: session.username
  };
}

/**
 * Delete a submission row. Restricted to super_admin.
 */
function deleteSubmission(token, sheetRowIndex, expectedSl) {
  var session = verifyAdminSession_(token);
  if (!session) {
    return { error: 'SESSION_EXPIRED' };
  }

  if (session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: super_admin privilege required to delete.' };
  }

  var rowIdx = parseInt(sheetRowIndex, 10);
  if (isNaN(rowIdx) || rowIdx <= 1) {
    return { success: false, error: 'Invalid row index.' };
  }

  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Responses');
  var headerMap = getHeaderMap_(sheet);
  var slIdx = headerMap['sl'];

  if (slIdx !== undefined) {
    var actualSl = sheet.getRange(rowIdx, slIdx + 1).getValue();
    if (expectedSl !== undefined && expectedSl !== null && String(actualSl) !== String(expectedSl)) {
      return { success: false, error: 'Row concurrency mismatch. Please refresh and try again.' };
    }
  }

  sheet.deleteRow(rowIdx);
  return { success: true };
}

/**
 * Admin Logout. Invalidates session token.
 */
function adminLogout(token) {
  if (token) {
    CacheService.getScriptCache().remove(token);
  }
  return { success: true };
}

/**
 * Diagnostic tool to verify API keys in API tab.
 */
function testApiKeys_() {
  var imgbb = getApiKey_('IMGBB');
  var postimage = getApiKey_('Post_Image') || getApiKey_('PostImage');
  var ui = SpreadsheetApp.getUi();
  ui.alert('API Key Status',
    'IMGBB: ' + (imgbb ? ('Configured (Length: ' + imgbb.length + ')') : 'MISSING') + '\n' +
    'Post_Image: ' + (postimage ? ('Configured (Length: ' + postimage.length + ')') : 'MISSING'),
    ui.ButtonSet.OK
  );
}
