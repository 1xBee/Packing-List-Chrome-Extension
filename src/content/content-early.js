/**
 * Early Content Script
 * Runs at document_start to inject critical scripts into page context
 */

(function() {
  'use strict';

  console.log('🚀 Early content script starting...');

  /**
   * Inject print override script into page context
   */
  function injectPrintOverride() {
    try {
      const script = document.createElement('script');
      script.id = 'packing-list-print-override';
      script.src = chrome.runtime.getURL('print-override.js');
      script.onload = () => {
        console.log('✅ Print override injected');
        try { script.remove(); } catch (e) {}
      };
      script.onerror = () => {
        console.error('❌ Failed to load print override');
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.error('❌ Failed to inject print override:', e);
    }
  }

  /**
   * Inject API interceptor script into page context
   */
  function injectAPIInterceptor() {
    try {
      const script = document.createElement('script');
      script.id = 'packing-list-api-interceptor';
      script.src = chrome.runtime.getURL('inpage-api-interceptor.js');
      script.onload = () => {
        console.log('✅ API interceptor injected');
        try { script.remove(); } catch (e) {}
      };
      script.onerror = () => {
        console.error('❌ Failed to load API interceptor');
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.error('❌ Failed to inject API interceptor:', e);
    }
  }

  // Inject both scripts immediately
  injectPrintOverride();
  injectAPIInterceptor();

  // Listen for messages from the page context (API data)
  window.addEventListener('message', (event) => {
    if (!event || event.source !== window) return;
    const msg = event.data;
    
    // Forward delivery API data to storage for main content script
    if (msg && msg.source === 'packing-list-extension' && msg.type === 'delivery-api-response') {
      console.log('📨 Received delivery API data from page context');
      
      // Store in sessionStorage so main content can access it
      try {
        const cacheData = {
          url: msg.url,
          data: msg.data,
          timestamp: Date.now()
        };
        
        sessionStorage.setItem('_packingList_deliveryData', JSON.stringify(cacheData));
        console.log('✅ Cached delivery data in sessionStorage');
        
        // Also dispatch a custom event so main.js can react immediately
        window.dispatchEvent(new CustomEvent('packinglist-delivery-data-ready', {
          detail: cacheData
        }));
        console.log('📢 Dispatched delivery-data-ready event');
      } catch (e) {
        console.error('❌ Failed to cache delivery data:', e);
      }
    }
  });

  console.log('✅ Early content script initialized');
})();