/**
 * Background Service Worker
 * Handles data fetching from Supabase and storage management
 */

// Supabase Configuration - UPDATE THESE
const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_KEY = '__SUPABASE_KEY__';

/**
 * Fetch packing list data from Supabase
 * Calls get_nested_inventory function with optional item IDs
 * @param {Array<number>} itemIds - Optional array of item IDs to filter
 * @returns {Promise<Object>} Packing list data organized by collection
 */
async function fetchPackingListData(itemIds = null) {
  try {
    console.log('📡 Fetching packing list data from Supabase...');

    // Build the RPC call URL
    const url = `${SUPABASE_URL}/rest/v1/rpc/get_nested_inventory`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        target_ids: itemIds // Pass null or array of IDs
      })
    });

    if (!response.ok) {
      throw new Error(`Supabase request failed: ${response.status}`);
    }

    const collections = await response.json();

    // Flatten the collections structure into a simple items array
    const allItems = [];
    
    collections.forEach(collectionObj => {
      if (collectionObj.items) {
        collectionObj.items.forEach(item => {
          allItems.push({
            collection: collectionObj.collection,
            name: item.item,
            id: item.id,
            boxes: item.boxes || []
          });
        });
      }
    });

    console.log(`✅ Fetched ${allItems.length} items from Supabase`);

    return {
      items: allItems,
      lastUpdated: new Date().toISOString(),
      totalItems: allItems.length
    };
  } catch (error) {
    console.error('❌ Error fetching from Supabase:', error);
    throw error;
  }
}

/**
 * Save data to chrome storage
 * @param {Object} data - Data to save
 */
async function saveToStorage(data) {
  try {
    await chrome.storage.local.set({ packingListData: data });
    console.log('✅ Data saved to storage');
  } catch (error) {
    console.error('❌ Error saving to storage:', error);
    throw error;
  }
}

/**
 * Handle refresh request from popup
 */
async function handleRefreshRequest() {
  try {
    // Fetch all items (pass null for target_ids to get everything)
    const data = await fetchPackingListData(null);
    await saveToStorage(data);
    
    return {
      success: true,
      message: 'Data refreshed successfully',
      itemCount: data.totalItems,
      lastUpdated: data.lastUpdated
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to refresh data'
    };
  }
}

/**
 * Get current storage status
 */
async function getStorageStatus() {
  try {
    const result = await chrome.storage.local.get(['packingListData']);
    
    if (!result.packingListData) {
      return {
        hasData: false,
        message: 'No data in storage'
      };
    }

    return {
      hasData: true,
      itemCount: result.packingListData.totalItems,
      lastUpdated: result.packingListData.lastUpdated
    };
  } catch (error) {
    return {
      hasData: false,
      message: 'Error reading storage'
    };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refreshData') {
    handleRefreshRequest().then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'getStatus') {
    getStorageStatus().then(sendResponse);
    return true;
  }

  return false;
});

console.log('✅ Background service worker loaded');