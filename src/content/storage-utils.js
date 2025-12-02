/**
 * Chrome Storage Utilities
 * Simple helpers for reading from chrome.storage
 */

/**
 * Get packing list data from chrome storage
 * @returns {Promise<Object|null>} Packing list data or null if empty
 */
export async function getPackingListData() {
  try {
    const result = await chrome.storage.local.get(['packingListData']);
    
    if (!result.packingListData) {
      console.log('📦 No packing list data in storage');
      return null;
    }

    console.log('✅ Loaded packing list data from storage:', result.packingListData);
    return result.packingListData;
  } catch (error) {
    console.error('❌ Error reading from storage:', error);
    return null;
  }
}

/**
 * Find packing list for a specific item by name
 * @param {Object} data - Full packing list data
 * @param {string} itemName - Name of the item to find
 * @returns {Object|null} Packing list for the item or null
 */
export function findPackingListByName(data, itemName) {
  if (!data || !data.items) {
    return null;
  }

  const cleanName = (name) => name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const searchName = cleanName(itemName);

  const match = data.items.find(item => cleanName(item.name) === searchName);
  
  if (match) {
    console.log(`✅ Found packing list for "${itemName}":`, match);
    return match;
  }

  console.log(`⚠️ No packing list found for "${itemName}"`);
  return null;
}