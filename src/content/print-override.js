/**
 * Print Override Script
 * Runs at document_start to intercept print calls before page loads
 * This is the ONLY code that runs before the page loads - keep it minimal!
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
  };

  // Initialize cache for packing list data (Bug 1 mitigation)
  window._packingListCache = null;

  console.log('✅ Print override installed');
})();