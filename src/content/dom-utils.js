/**
 * DOM Utilities
 * Functions for finding and manipulating DOM elements
 */

// Configuration
const HEADER_CELL_SELECTOR = 'td[style="font-size: 17px; font-style: italic; font-weight: 600; color: rgb(228, 228, 228); background: rgb(53, 53, 53); print-color-adjust: exact;"]';
const TARGET_TEXT = '- Furniture -';

/**
 * Clean text for comparison (removes non-breaking spaces and trims whitespace)
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export const cleanText = (text) => text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Find all data rows under the target furniture heading
 * @returns {Array<HTMLTableRowElement>} Array of table rows
 */
export function getRowsUnderTargetHeading() {
  // Find the specific heading cell
  const cells = document.querySelectorAll(HEADER_CELL_SELECTOR);
  let startCell = null;

  for (const cell of cells) {
    if (cleanText(cell.textContent) === cleanText(TARGET_TEXT)) {
      startCell = cell;
      break;
    }
  }

  if (!startCell) {
    console.warn(`⚠️ Heading not found: "${TARGET_TEXT}"`);
    return [];
  }

  const startRow = startCell.closest('tr');
  const extractedRows = [];
  let currentRow = startRow.nextElementSibling;

  // Collect rows until next heading or end of table
  while (currentRow) {
    // Stop at next heading
    if (currentRow.querySelector(HEADER_CELL_SELECTOR)) {
      break;
    }

    // Only collect valid table rows
    if (currentRow.tagName === 'TR' && currentRow.cells.length > 0) {
      extractedRows.push(currentRow);
    }

    currentRow = currentRow.nextElementSibling;
  }

  console.log(`✅ Found ${extractedRows.length} furniture rows`);
  return extractedRows;
}

/**
 * Extract item name from a table row
 * Goes to tr -> second td -> first span -> first text node
 * @param {HTMLTableRowElement} row - Table row element
 * @returns {string} Item name
 */
export function getItemNameFromRow(row) {
  if (!row || !row.cells || row.cells.length < 2) {
    console.warn('⚠️ Row does not have at least 2 cells', row);
    return '';
  }

  // Get the second td (index 1)
  const secondCell = row.cells[1];
  
  // Get the first span in that td
  const firstSpan = secondCell.querySelector('span');
  
  if (!firstSpan) {
    console.warn('⚠️ No span found in second cell', secondCell);
    return '';
  }

  // Get the first text node (plain text, not nested elements)
  const textNode = Array.from(firstSpan.childNodes).find(
    node => node.nodeType === Node.TEXT_NODE && cleanText(node.textContent).length > 0
  );

  if (!textNode) {
    console.warn('⚠️ No text node found in span', firstSpan);
    return '';
  }

  const itemName = cleanText(textNode.textContent);
  console.log(`✅ Extracted item name: "${itemName}"`);
  return itemName;
}

/**
 * Find the target cell where the packing list component should be injected
 * Appends to the second td (where the item name is) at the end
 * @param {HTMLTableRowElement} row - Table row element
 * @returns {HTMLTableCellElement|null} Target cell or null
 */
export function getTargetCellForPackingList(row) {
  if (!row || !row.cells || row.cells.length < 2) {
    console.error('❌ Row does not have at least 2 cells');
    return null;
  }

  // Return the second td where we'll append the component
  const targetCell = row.cells[1];
  console.log('✅ Target cell for packing list:', targetCell);
  return targetCell;
}

/**
 * Wait for the Furniture header to render within #rootApp
 * @returns {Promise<void>}
 */
export function waitForFurnitureGrid() {
  return new Promise((resolve) => {
    const root = document.getElementById('rootApp') || document.body;

    // Helper to check for header without logging errors
    const isHeaderPresent = () => {
      const cells = document.querySelectorAll(HEADER_CELL_SELECTOR);
      return Array.from(cells).some(cell => cleanText(cell.textContent) === cleanText(TARGET_TEXT));
    };

    // 1. Check if already rendered
    if (isHeaderPresent()) return resolve();

    // 2. Observe #rootApp for changes
    const observer = new MutationObserver(() => {
      if (isHeaderPresent()) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  });
}