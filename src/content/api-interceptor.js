/**
 * API Interceptor (Content Script Side)
 * Reads delivery data cached by early content script
 */

let deliveryData = null;

/**
 * Get the cached delivery data from sessionStorage
 * @returns {Object|null} Delivery data with furniture items
 */
export function getDeliveryData() {
  if (deliveryData) {
    return deliveryData;
  }

  // Try to read from sessionStorage
  try {
    const cached = sessionStorage.getItem('_packingList_deliveryData');
    if (cached) {
      const parsed = JSON.parse(cached);
      deliveryData = processDeliveryResponse(parsed.url, parsed.data);
      console.log('✅ Loaded delivery data from session cache');
      return deliveryData;
    }
  } catch (e) {
    console.warn('⚠️ Could not read cached delivery data:', e);
  }

  return null;
}

/**
 * Process delivery API JSON payload and extract furniture items
 * @param {string} url - API URL
 * @param {Object} data - API response data
 * @returns {Object|null} Processed delivery data
 */
function processDeliveryResponse(url, data) {
  try {
    if (!data) return null;

    // Filter furniture items with qty > 0
    if (data.items && Array.isArray(data.items)) {
      const furnitureItems = data.items.filter(item => {
        const isFurniture = item.path && item.path.toLowerCase().startsWith('furniture');
        const hasQty = item.qty && item.qty > 0;
        return isFurniture && hasQty;
      });

      const result = {
        items: furnitureItems.map(item => ({
          name: item.name,
          id: item.id,
          qty: item.qty
        })),
        deliveryId: extractDeliveryId(url)
      };

      console.log(`✅ Processed ${furnitureItems.length} furniture items from delivery API`);
      return result;
    }
  } catch (error) {
    console.error('❌ Error processing delivery API response:', error);
  }

  return null;
}

/**
 * Extract delivery ID from URL
 * @param {string} url - API URL
 * @returns {string|null} Delivery ID
 */
function extractDeliveryId(url) {
  const match = url.match(/\/deliveries\/([^\/]+)/i);
  return match ? match[1] : null;
}

/**
 * Find item ID by name from cached delivery data
 * @param {string} itemName - Item name to search for
 * @returns {Object|null} Item object with id, name, qty or null
 */
export function findItemByName(itemName) {
  const data = getDeliveryData();
  
  if (!data || !data.items) {
    console.warn('⚠️ No delivery data available');
    return null;
  }

  const cleanName = (name) => name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const searchName = cleanName(itemName);

  const match = data.items.find(item => cleanName(item.name) === searchName);

  if (match) {
    console.log(`✅ Found item in delivery data: "${itemName}" -> ID: ${match.id}`);
    return match;
  }

  console.warn(`⚠️ Item not found in delivery data: "${itemName}"`);
  return null;
}