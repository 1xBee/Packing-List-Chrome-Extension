/**
 * Print Override Script (runs in page context)
 * Intercepts window.print() calls and listens for trigger from content script
 */

(function() {
  'use strict';

  // Save the original print function
  window._originalPrint = window.print;

  // Track if print was called
  window._printWasCalled = false;

  // Override print to just track the call
  window.print = function() {
    console.log('🖨️ Print intercepted - will trigger after packing lists load');
    window._printWasCalled = true;
    
    // Post message to content script
    window.postMessage({
      source: 'packing-list-extension',
      type: 'print-intercepted'
    }, '*');
  };

  // Listen for trigger from content script
  window.addEventListener('message', (event) => {
    if (!event || event.source !== window) return;
    const msg = event.data;
    
    if (msg && msg.source === 'packing-list-extension' && msg.type === 'trigger-print') {
      console.log('🖨️ Triggering actual print now');
      
      // Small delay to ensure everything is rendered
      setTimeout(() => {
        window._originalPrint();
      }, 100);
    }
  });

  console.log('✅ Print override installed in page context');
})();