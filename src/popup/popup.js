/**
 * Popup Script
 * Handles UI interactions in the extension popup
 */

const statusEl = document.getElementById('status');
const messageEl = document.getElementById('message');
const refreshBtn = document.getElementById('refreshBtn');

/**
 * Display status information
 */
async function displayStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

    if (response.hasData) {
      const lastUpdated = new Date(response.lastUpdated).toLocaleString();
      statusEl.innerHTML = `
        <p class="status-good">✅ Data loaded</p>
        <p class="status-detail">Items: ${response.itemCount}</p>
        <p class="status-detail">Last updated: ${lastUpdated}</p>
      `;
    } else {
      statusEl.innerHTML = `
        <p class="status-warning">⚠️ No data</p>
        <p class="status-detail">Click refresh to load packing list data</p>
      `;
    }
  } catch (error) {
    statusEl.innerHTML = `
      <p class="status-error">❌ Error</p>
      <p class="status-detail">${error.message}</p>
    `;
  }
}

/**
 * Show temporary message
 */
function showMessage(text, type = 'info') {
  messageEl.textContent = text;
  messageEl.className = `message message-${type}`;
  messageEl.style.display = 'block';

  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

/**
 * Handle refresh button click
 */
async function handleRefresh() {
  try {
    // Disable button and show loading state
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<span class="btn-icon">⏳</span> Refreshing...';

    // Send refresh request to background script
    const response = await chrome.runtime.sendMessage({ action: 'refreshData' });

    if (response.success) {
      showMessage(`✅ ${response.message} (${response.itemCount} items)`, 'success');
      await displayStatus();
    } else {
      showMessage(`❌ ${response.message}`, 'error');
    }
  } catch (error) {
    showMessage(`❌ Error: ${error.message}`, 'error');
  } finally {
    // Re-enable button
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<span class="btn-icon">🔄</span> Refresh Packing List Data';
  }
}

// Event listeners
refreshBtn.addEventListener('click', handleRefresh);

// Initialize
displayStatus();