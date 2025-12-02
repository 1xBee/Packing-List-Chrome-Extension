/*
 * In-Page API Interceptor
 * Runs in the page's main world and intercepts `fetch` and `XMLHttpRequest`
 * responses for delivery API calls, then forwards the data via
 * `window.postMessage` so the content script can read it.
 */
(function() {
  'use strict';

  const POST_SOURCE = 'packing-list-extension';
  const DELIVERY_PATH_FRAGMENT = '/api/deliveries/';

  // --- fetch interception ---
  try {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const [url] = args;
      const response = await originalFetch.apply(this, args);

      try {
        if (typeof url === 'string' && url.includes(DELIVERY_PATH_FRAGMENT)) {
          const cloned = response.clone();
          const data = await cloned.json().catch(() => null);
          window.postMessage({ source: POST_SOURCE, type: 'delivery-api-response', url, data }, '*');
        }
      } catch (e) {
        // Swallow errors to avoid breaking page
        try { console.error('inpage fetch interceptor error', e); } catch(_) {}
      }

      return response;
    };
  } catch (e) {
    try { console.error('Failed to install fetch interceptor', e); } catch(_) {}
  }

  // --- XHR interception ---
  try {
    const OriginalXHR = window.XMLHttpRequest;
    function XHRProxy() {
      const xhr = new OriginalXHR();
      const open = xhr.open;

      xhr.open = function(method, url, ...rest) {
        this._interceptUrl = url;
        return open.call(this, method, url, ...rest);
      };

      xhr.addEventListener('readystatechange', function() {
        try {
          if (this.readyState === 4 && this._interceptUrl && this._interceptUrl.includes(DELIVERY_PATH_FRAGMENT)) {
            let data = null;
            try { data = JSON.parse(this.responseText); } catch (err) { data = null; }
            window.postMessage({ source: POST_SOURCE, type: 'delivery-api-response', url: this._interceptUrl, data }, '*');
          }
        } catch (e) {
          try { console.error('inpage xhr handler error', e); } catch(_) {}
        }
      });

      return xhr;
    }

    XHRProxy.prototype = OriginalXHR.prototype;
    window.XMLHttpRequest = XHRProxy;
  } catch (e) {
    try { console.error('Failed to install XHR interceptor', e); } catch(_) {}
  }

  // Signal installed
  try { console.log('✅ In-page API interceptor installed'); } catch(_) {}
})();
