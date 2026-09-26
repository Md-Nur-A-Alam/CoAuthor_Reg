/**
 * IEEE i-COSTE 2026 API Client Wrapper
 * Handles communication with Google Apps Script backend using CORS-safe POST requests.
 */
var Api = (function() {
  /**
   * Dispatches an action with payload to the Apps Script Web App API.
   * Sending 'text/plain;charset=utf-8' is a "simple request" that bypasses CORS preflight (OPTIONS).
   */
  async function call(action, payload) {
    var apiUrl = window.CONFIG && window.CONFIG.API_URL;
    if (!apiUrl || apiUrl.indexOf('/exec') === -1) {
      throw new Error('API_URL is not properly configured in js/config.js. It must be a valid Google Apps Script /exec URL.');
    }

    var bodyData = Object.assign({ action: action }, payload || {});
    var requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(bodyData)
    };

    try {
      var response = await fetch(apiUrl, requestOptions);
      if (!response.ok) {
        throw new Error('HTTP network error ' + response.status + ': ' + response.statusText);
      }
      var json = await response.json();
      return json;
    } catch (err) {
      console.error('API call error [' + action + ']:', err);
      throw err;
    }
  }

  return {
    call: call,

    // Convenience API methods
    uploadImage: function(base64Data, fileName, mimeType, fieldKey) {
      return call('uploadImage', {
        base64Data: base64Data,
        fileName: fileName,
        mimeType: mimeType,
        fieldKey: fieldKey
      });
    },

    submitForm: function(formData) {
      return call('submitForm', { formData: formData });
    },

    adminLogin: function(username, password) {
      return call('adminLogin', { username: username, password: password });
    },

    getResponses: function(token) {
      return call('getResponses', { token: token });
    },

    deleteSubmission: function(token, sheetRowIndex, sl) {
      return call('deleteSubmission', { token: token, sheetRowIndex: sheetRowIndex, sl: sl });
    },

    adminLogout: function(token) {
      return call('adminLogout', { token: token });
    },

    ping: function() {
      return call('ping', {});
    }
  };
})();
