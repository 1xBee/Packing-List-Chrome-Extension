/**
 * Item Filter Function
 * Centralized filtering logic for packing list items
 */

let allItemsCache = null;

/**
 * Initialize the filter with all available items
 * @param {Array} items - Array of all packing list items
 */
export function initializeFilter(items) {
  allItemsCache = items;
  console.log(`✅ Filter initialized with ${items.length} items`);
}

/**
 * Filter items by query string
 * Searches in both collection and item name
 * @param {string} query - Search query
 * @returns {Array} Filtered items (max 10 results)
 */
export function filterItems(query) {
  if (!allItemsCache || allItemsCache.length === 0) {
    console.warn('⚠️ Filter not initialized with items');
    return [];
  }

  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();

  const results = allItemsCache.filter(item => {
    const collectionMatch = item.collection.toLowerCase().includes(normalizedQuery);
    const nameMatch = item.name.toLowerCase().includes(normalizedQuery);
    return collectionMatch || nameMatch;
  });

  
  return results;
}

/**
 * Get an item by ID
 * @param {number} id - Item ID
 * @returns {Object|null} Item or null if not found
 */
export function getItemById(id) {
  if (!allItemsCache) {
    return null;
  }
  return allItemsCache.find(item => item.id === id);
}