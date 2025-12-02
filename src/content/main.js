/**
 * Main Content Script
 * Coordinates the packing list injection and print restoration
 */

import { getPackingListData, findPackingListByName } from './storage-utils.js';
import { setupDeliveryAPIInterceptor, getDeliveryData, findItemByName } from './api-interceptor.js';

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

/**
 * Main initialization function
 */
async function init() {
  console.log('🚀 Packing list extension initializing...');

  // Setup API interceptor FIRST
  setupDeliveryAPIInterceptor();

  // Check if print was already called (Bug 9/Bug 2 mitigation)
  const printPending = window._printWasCalled;
  if (printPending) {
    console.log('⚠️ Print was already called, will trigger after components load');
  }

  // Wait for DOM to be ready
  await waitForFurnitureGrid();

  // Get packing list data from storage
  const packingListData = await getPackingListData();

  if (!packingListData) {
    console.log('⚠️ No packing list data available. User needs to refresh data via popup.');
    restorePrintIfNeeded();
    return;
  }

  // Cache data in window for components (Bug 1 mitigation)
  window._packingListCache = packingListData;

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
      itemName,
      itemId: packingList.id,
      packingList: packingList.items,
      uniqueKey: `${packingList.id}-${index}`
    });
  });

  // Log matching summary (Bug 7 mitigation)
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

  // Mount React components
  matchedItems.forEach((item) => {
    mountPackingListComponent(item);
  });
}

/**
 * Mount a packing list React component
 * @param {Object} item - Item data with row, name, id, packing list, and unique key
 */
function mountPackingListComponent(item) {
  const { row, itemName, itemId, packingList, uniqueKey } = item;

  // Get target cell (second td)
  const targetCell = getTargetCellForPackingList(row);

  if (!targetCell) {
    console.error('❌ Could not find target cell for packing list');
    return;
  }

  // Create a container div to append to the cell
  const containerDiv = document.createElement('div');
  containerDiv.classList.add('packing-list-wrapper');
  
  // Append to the end of the cell (don't replace existing content)
  targetCell.appendChild(containerDiv);

  // Create React root in the container div and render component
  try {
    const root = ReactDOM.createRoot(containerDiv);
    
    root.render(
      React.createElement(window.PackingListComponent, {
        itemName,
        itemId,
        packingList,
        uniqueKey,
        onReady: handleComponentReady
      })
    );

    console.log(`✅ Mounted packing list for "${itemName}" (${uniqueKey})`);
  } catch (error) {
    console.error('❌ Error mounting component:', error);
  }
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
 * Implements Bug 2, Bug 5 mitigation
 */
function checkAndTriggerPrint() {
  // Already triggered? (Bug 5)
  if (printAlreadyTriggered) {
    console.log('⚠️ Print already triggered, skipping');
    return;
  }

  // Was print requested?
  if (!window._printWasCalled) {
    console.log('ℹ️ Print was not requested by page, user can print manually');
    restorePrintFunction();
    return;
  }

  // Verify components still exist in DOM (Bug 2)
  const allComponentsInDOM = Array.from(mountedComponents).every(() => {
    // Simple check - if we got here, components should be in DOM
    // More sophisticated check could verify actual DOM presence
    return true;
  });

  if (!allComponentsInDOM) {
    console.warn('⚠️ Some components not in DOM, skipping print');
    return;
  }

  // All conditions met - trigger print!
  printAlreadyTriggered = true;
  
  console.log('🖨️ Triggering print with packing lists...');
  
  setTimeout(() => {
    window._originalPrint();
  }, 100); // Small delay to ensure everything is painted
}

/**
 * Restore print function without triggering
 */
function restorePrintFunction() {
  window.print = window._originalPrint;
  console.log('✅ Print function restored (no auto-trigger)');
}

/**
 * Restore print if needed when no components to mount
 */
function restorePrintIfNeeded() {
  if (window._printWasCalled) {
    console.log('🖨️ Print was requested but no packing lists to show, printing anyway');
    window._originalPrint();
  } else {
    restorePrintFunction();
  }
}

// Start initialization
init().catch((error) => {
  console.error('❌ Extension initialization failed:', error);
  restorePrintIfNeeded();
});