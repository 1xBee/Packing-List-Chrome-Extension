/**
 * Packing List Component (Vanilla JS)
 * Creates and manages packing list UI elements
 */

import { filterItems } from './item-filter.js';

/**
 * Create a packing list component
 * @param {Object} options - Component options
 * @returns {HTMLElement} The component wrapper element
 */
export function createPackingListComponent({
  collection,
  itemName,
  itemNameOnPakingList,
  itemId,
  itemQty,
  packingList,
  uniqueKey,
  onReady
}) {
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'packing-list-wrapper';
  wrapper.dataset.uniqueKey = uniqueKey;

  // Display name from packing list data
  const displayName = `${collection} - ${itemNameOnPakingList}`;

  // Create header (always visible)
  const header = document.createElement('div');
  header.className = 'packing-list-header';

  const headerText = document.createElement('span');
  headerText.className = 'packing-list-header-text';
  headerText.textContent = displayName;

  const actions = document.createElement('div');
  actions.className = 'packing-list-actions';

  // Clear button
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-sm btn-outline-danger';
  clearBtn.textContent = '×';
  clearBtn.title = 'Clear and search';

  // Search container (hidden initially)
  const searchContainer = document.createElement('div');
  searchContainer.className = 'packing-list-search';
  searchContainer.style.display = 'none';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'packing-list-search-input';
  searchInput.placeholder = 'Search items...';

  const dropdown = document.createElement('div');
  dropdown.className = 'packing-list-dropdown';
  dropdown.style.display = 'none';

  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(dropdown);

  // Undo button (hidden initially)
  const undoBtn = document.createElement('button');
  undoBtn.className = 'btn btn-sm btn-outline-secondary';
  undoBtn.textContent = '↶';
  undoBtn.title = 'Undo';
  undoBtn.style.display = 'none';

  actions.appendChild(clearBtn);
  actions.appendChild(searchContainer);
  actions.appendChild(undoBtn);

  header.appendChild(headerText);
  header.appendChild(actions);

  // Create content with <details> for show/hide
  const details = document.createElement('details');
  details.className = 'packing-list-details';
  details.open = true; // Open by default

  const summary = document.createElement('summary');
  summary.textContent = 'Packing List';
  details.appendChild(summary);

  const list = document.createElement('ul');
  
  // Build list items with badges
  function buildList(boxes, qty) {
    list.innerHTML = '';
    boxes.forEach((box) => {
      const li = document.createElement('li');
      
      // Calculate badge: box.qty * itemQty
      const boxQty = box.qty || 1; // Default to 1 if not specified
      const badgeCount = boxQty * qty;
      
      const badge = document.createElement('span');
      badge.className = 'badge bg-secondary';
      badge.textContent = badgeCount;
      
      const text = box.contents || box.description || 'No description';
      const weight = box.weight ? ` (${box.weight})` : '';
      
      li.appendChild(badge);
      li.appendChild(document.createTextNode(' ' + text + weight));
      list.appendChild(li);
    });
  }

  buildList(packingList, itemQty);
  details.appendChild(list);

  wrapper.appendChild(header);
  wrapper.appendChild(details);

  // State management
  let isCleared = false;
  let clearedData = null; // Store what was cleared for undo

  // Event handlers
  clearBtn.addEventListener('click', () => {
    // Save current state for undo
    clearedData = {
      collection,
      itemName,
      itemNameOnPakingList,
      itemId,
      itemQty,
      packingList
    };

    isCleared = true;
    details.style.display = 'none'; // Hide the packing list
    clearBtn.style.display = 'none';
    searchContainer.style.display = 'block';
    undoBtn.style.display = 'inline-block';
    searchInput.focus();
  });

  undoBtn.addEventListener('click', () => {
    if (!clearedData) return;

    // Restore what was cleared
    isCleared = false;
    details.style.display = 'block';
    headerText.textContent = `${clearedData.collection} - ${clearedData.itemNameOnPakingList}`;
    buildList(clearedData.packingList, clearedData.itemQty);
    
    // Reset UI
    searchInput.value = '';
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    clearBtn.style.display = 'inline-block';
    searchContainer.style.display = 'none';
    undoBtn.style.display = 'none';
  });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    
    if (query.length === 0) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    const results = filterItems(query);
    
    if (results.length === 0) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    // Show dropdown with results
    dropdown.innerHTML = '';
    dropdown.style.display = 'block';

    results.forEach((item) => {
      const dropdownItem = document.createElement('div');
      dropdownItem.className = 'packing-list-dropdown-item';
      
      const strong = document.createElement('strong');
      strong.textContent = item.collection;
      dropdownItem.appendChild(strong);
      dropdownItem.appendChild(document.createTextNode(` - ${item.name}`));
      
      dropdownItem.addEventListener('click', () => {
        // Replace with selected item
        headerText.textContent = `${item.collection} - ${item.name}`;
        buildList(item.boxes, itemQty);
        
        // Update state - no more undo to previous
        collection = item.collection;
        itemNameOnPakingList = item.name;
        itemId = item.id;
        packingList = item.boxes;
        clearedData = null; // Clear undo data
        
        // Show the list and reset UI
        details.style.display = 'block';
        isCleared = false;
        searchInput.value = '';
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        clearBtn.style.display = 'inline-block';
        searchContainer.style.display = 'none';
        undoBtn.style.display = 'none';
      });
      
      dropdown.appendChild(dropdownItem);
    });
  });

  // Click outside to close dropdown
  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Call onReady after a small delay
  if (onReady) {
    setTimeout(() => {
      onReady(uniqueKey);
    }, 50);
  }

  return wrapper;
}