/**
 * Main Content Script
 * Runs at document_idle to inject packing lists into the page
 */

import { getPackingListData } from './storage-utils.js';
import { getDeliveryData, findItemByName } from './api-interceptor.js';
import { initializeFilter } from './item-filter.js';
import { createPackingListComponent } from './packing-list-component.js';

import { 
  waitForFurnitureGrid, 
  getRowsUnderTargetHeading, 
  getItemNameFromRow, 
  getTargetCellForPackingList 
} from './dom-utils.js';

// Track mounted components
let mountedComponents = new Set();
let expectedComponentCount = 0;
let printAlreadyTriggered = false;
let printWasRequested = false;

/**
 * Wait for delivery data to be cached (with timeout)
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<Object|null>} Delivery data or null if timeout
 */
async function waitForDeliveryData(timeout = 10000) {
  const startTime = Date.now();

  // First, check if data is already available
  const existingData = getDeliveryData();
  if (existingData) {
    console.log('✅ Delivery data already available!');
    return existingData;
  }

  console.log('⏳ Waiting for delivery data...');

  // Wait for either:
  // 1. Custom event from early content script
  // 2. Polling finds the data
  // 3. Timeout
  return new Promise((resolve) => {
    let resolved = false;

    // Listen for custom event
    const eventListener = (event) => {
      if (!resolved) {
        resolved = true;
        console.log('✅ Delivery data received via event!');
        clearInterval(pollInterval);
        clearTimeout(timeoutHandle);
        resolve(getDeliveryData());
      }
    };

    window.addEventListener('packinglist-delivery-data-ready', eventListener, { once: true });

    // Also poll as backup
    const pollInterval = setInterval(() => {
      const data = getDeliveryData();
      if (data && !resolved) {
        resolved = true;
        console.log('✅ Delivery data received via polling!');
        window.removeEventListener('packinglist-delivery-data-ready', eventListener);
        clearTimeout(timeoutHandle);
        clearInterval(pollInterval);
        resolve(data);
      }
    }, 200);

    // Timeout
    const timeoutHandle = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('⏰ Timeout waiting for delivery data');
        window.removeEventListener('packinglist-delivery-data-ready', eventListener);
        clearInterval(pollInterval);
        resolve(null);
      }
    }, timeout);
  });
}

/**
 * Main initialization function
 */
async function init() {
  console.log('🚀 Main content script initializing...');

  // Listen for print intercept messages from page context
  window.addEventListener('message', (event) => {
    if (!event || event.source !== window) return;
    const msg = event.data;
    
    if (msg && msg.source === 'packing-list-extension' && msg.type === 'print-intercepted') {
      console.log('📨 Print was intercepted by page context');
      printWasRequested = true;
    }
  });

  // Wait for DOM to be ready
  await waitForFurnitureGrid();

  // Get packing list data from storage
  const packingListData = await getPackingListData();

  if (!packingListData) {
    console.log('⚠️ No packing list data available. User needs to refresh data via popup.');
    restorePrintIfNeeded();
    return;
  }

  // Initialize the filter with all items
  initializeFilter(packingListData.items);

  // Wait for delivery data to be available (with timeout)
  const deliveryData = await waitForDeliveryData(10000); // Wait up to 10 seconds

  if (!deliveryData) {
    console.log('⚠️ No delivery data received after waiting. Cannot match items.');
    restorePrintIfNeeded();
    return;
  }

  // Find furniture rows in the DOM
  const rows = getRowsUnderTargetHeading();

  if (rows.length === 0) {
    console.log('⚠️ No furniture rows found');
    restorePrintIfNeeded();
    return;
  }

  // Process each row
  const matchedItems = [];
  
  rows.forEach((row, index) => {
    const itemName = getItemNameFromRow(row);
    
    if (!itemName) {
      console.warn('⚠️ Row has no item name, skipping', row);
      return;
    }

    // First, find the item ID from delivery data
    const deliveryItem = findItemByName(itemName);

    if (!deliveryItem) {
      console.log(`⚠️ Item "${itemName}" not found in delivery data, skipping`);
      return;
    }

    // Then find packing list using the ID
    const packingList = packingListData.items.find(item => item.id === deliveryItem.id);

    if (!packingList) {
      console.log(`⚠️ No packing list data for ID ${deliveryItem.id} (${itemName}), skipping`);
      return;
    }

    // Found a match!
    matchedItems.push({
      row,
      collection: packingList.collection,
      itemName,
      itemNameOnPakingList: packingList.name,
      itemId: packingList.id,
      itemQty: deliveryItem.qty, // From delivery API
      packingList: packingList.boxes,
      uniqueKey: `${packingList.id}-${index}`
    });
  });

  // Log matching summary
  console.log(`📊 Matching Summary:
    - Total furniture rows: ${rows.length}
    - Rows with packing list data: ${matchedItems.length}
    - Rows skipped (no data): ${rows.length - matchedItems.length}
  `);

  if (matchedItems.length === 0) {
    console.log('⚠️ No items matched with packing list data');
    restorePrintIfNeeded();
    return;
  }

  // Set expected count for completion tracking
  expectedComponentCount = matchedItems.length;

  // Mount components
  matchedItems.forEach((item) => {
    mountPackingListComponent(item);
  });
}

/**
 * Mount a packing list component
 * @param {Object} item - Item data with row, name, id, qty, packing list, and unique key
 */
function mountPackingListComponent(item) {
  const { row, collection, itemName, itemNameOnPakingList, itemId, itemQty, packingList, uniqueKey } = item;

  // Get target cell (second td)
  const targetCell = getTargetCellForPackingList(row);

  if (!targetCell) {
    console.error('❌ Could not find target cell for packing list');
    return;
  }

  // Create component
  const component = createPackingListComponent({
    collection,
    itemName,
    itemNameOnPakingList,
    itemId,
    itemQty,
    packingList,
    uniqueKey,
    onReady: handleComponentReady
  });

  // Append to the end of the cell
  targetCell.appendChild(component);

  console.log(`✅ Mounted packing list for "${itemName}" (${uniqueKey})`);
}

/**
 * Handle component ready callback
 * @param {string} uniqueKey - Unique identifier for the component
 */
function handleComponentReady(uniqueKey) {
  mountedComponents.add(uniqueKey);
  
  console.log(`✅ Component ready: ${uniqueKey} (${mountedComponents.size}/${expectedComponentCount})`);

  // Check if all components are ready
  if (mountedComponents.size === expectedComponentCount) {
    console.log('✅ All packing list components ready!');
    checkAndTriggerPrint();
  }
}

/**
 * Check conditions and trigger print if appropriate
 */
function checkAndTriggerPrint() {
  // Already triggered?
  if (printAlreadyTriggered) {
    console.log('⚠️ Print already triggered, skipping');
    return;
  }

  // Was print requested?
  if (!printWasRequested) {
    console.log('ℹ️ Print was not requested by page, user can print manually');
    return;
  }

  // All conditions met - trigger print!
  printAlreadyTriggered = true;
  
  console.log('🖨️ Triggering print with packing lists...');
  
  // Post message to page context to trigger print
  window.postMessage({
    source: 'packing-list-extension',
    type: 'trigger-print'
  }, '*');
}

/**
 * Restore print if needed when no components to mount
 */
function restorePrintIfNeeded() {
  if (printWasRequested) {
    console.log('🖨️ Print was requested but no packing lists to show, printing anyway');
    
    // Trigger print via page context
    window.postMessage({
      source: 'packing-list-extension',
      type: 'trigger-print'
    }, '*');
  }
}

// Start initialization
init().catch((error) => {
  console.error('❌ Extension initialization failed:', error);
  restorePrintIfNeeded();
});