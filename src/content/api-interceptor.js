/**
 * API Interceptor
 * Intercepts the delivery API call to extract furniture items as a "phonebook"
 */

let deliveryData = null;

/**
 * Get the cached delivery data
 * @returns {Object|null} Delivery data with furniture items
 */
export function getDeliveryData() {
  return deliveryData;
}

/**
 * Internal: process delivery API JSON payload and cache furniture items
 */
function processDeliveryResponse(url, data) {
  try {
    if (!data) return;

    // Filter furniture items with qty > 0
    if (data.items && Array.isArray(data.items)) {
      const furnitureItems = data.items.filter(item => {
        const isFurniture = item.path && item.path.toLowerCase().startsWith('furniture');
        const hasQty = item.qty && item.qty > 0;
        return isFurniture && hasQty;
      });

      // Store filtered data
      deliveryData = {
        items: furnitureItems.map(item => ({
          name: item.name,
          id: item.id,
          qty: item.qty
        })),
        deliveryId: extractDeliveryId(url)
      };

      console.log(`✅ Cached ${furnitureItems.length} furniture items from delivery API`);
      console.log('📋 Delivery data:', deliveryData);
    }
  } catch (error) {
    console.error('❌ Error processing delivery API response:', error);
  }
}

/**
 * Setup delivery API interceptor by injecting an in-page script (runs in page
 * context) and listening for messages forwarded via window.postMessage.
 */
export function setupDeliveryAPIInterceptor() {
  console.log('🔧 Setting up delivery API interceptor (in-page)...');

  // Inject the in-page script only once
  try {
    if (!document.getElementById('packing-list-inpage-interceptor')) {
      const script = document.createElement('script');
      script.id = 'packing-list-inpage-interceptor';
      script.src = chrome.runtime.getURL('inpage-api-interceptor.js');
      script.onload = () => {
        try { script.remove(); } catch (e) {}
      };
      (document.head || document.documentElement).appendChild(script);
      console.log('🔌 Injected in-page interceptor script');
    } else {
      console.log('🔁 In-page interceptor already injected');
    }
  } catch (e) {
    console.error('❌ Failed to inject in-page interceptor:', e);
  }

  // Listen for messages posted from the page context
  window.addEventListener('message', (event) => {
    // We only accept messages from the same window
    if (!event || event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== 'packing-list-extension' || msg.type !== 'delivery-api-response') return;

    // Process the payload
    processDeliveryResponse(msg.url, msg.data);
  });

  console.log('✅ Delivery API message listener installed');
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
  if (!deliveryData || !deliveryData.items) {
    console.warn('⚠️ No delivery data available');
    return null;
  }

  const cleanName = (name) => name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const searchName = cleanName(itemName);

  const match = deliveryData.items.find(item => cleanName(item.name) === searchName);

  if (match) {
    console.log(`✅ Found item in delivery data: "${itemName}" -> ID: ${match.id}`);
    return match;
  }

  console.warn(`⚠️ Item not found in delivery data: "${itemName}"`);
  return null;
}