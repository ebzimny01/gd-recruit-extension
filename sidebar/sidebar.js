// Sidebar script for GD Recruit Assistant

// Import modules
import { calculator } from '../lib/calculator.js';
import { sidebarComms } from './communications.js';

// DOM elements
const elements = {
  // Tab navigation
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabSections: document.querySelectorAll('.tab-content'),
    // Dashboard elements
  recruitCount: document.getElementById('recruit-count'),
  watchlistCount: document.getElementById('watchlist-count'),
  lastUpdated: document.getElementById('last-updated'),
  currentSeason: document.getElementById('current-season'),
  btnScrapeRecruits: document.getElementById('btn-scrape-recruits'),
  btnUpdateWatchlist: document.getElementById('btn-update-watchlist'),
  btnUpdateConsidering: document.getElementById('btn-update-considering'),
  statusMessage: document.getElementById('status-message'),
  includeLowerDivisions: document.getElementById('include-lower-divisions'),
  
  // Recruits tab elements
  filterName: document.getElementById('filter-name'),
  filterPosition: document.getElementById('filter-position'),
  filterMinRating: document.getElementById('filter-min-rating'),
  filterPotential: document.getElementById('filter-potential'),
  recruitsList: document.getElementById('recruits-list'),
  prevPageBtn: document.getElementById('prev-page'),
  nextPageBtn: document.getElementById('next-page'),
  pageInfo: document.getElementById('page-info'),
  
  // Settings tab elements
  btnExportData: document.getElementById('btn-export-data'),
  btnImportData: document.getElementById('btn-import-data'),
  btnClearData: document.getElementById('btn-clear-data'),
  btnEditRoleRatings: document.getElementById('btn-edit-role-ratings')
};

// State management
let state = {
  recruits: [],
  filteredRecruits: [],
  currentPage: 1,
  itemsPerPage: 10,
  filters: {
    name: '',
    position: '',
    minRating: 0,
    potential: ''
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadData();
  updateDashboardStats();
  await updateButtonState();
  
  // Set up sidebar visibility listener
  sidebarComms.setupSidebarListeners();
  
  // Listen for sidebar visibility events
  document.addEventListener('sidebar-visible', async () => {
    console.log('Sidebar became visible, refreshing data');
    await loadData();
    updateDashboardStats();
    await updateButtonState();
  });
});

// Set up event listeners
function setupEventListeners() {
  // Tab switching
  elements.tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.id.replace('tab-', '');
      switchTab(tabId);
    });
  });
  
  // Dashboard actions
  elements.btnScrapeRecruits.addEventListener('click', handleScrapeRecruits);
  elements.btnUpdateWatchlist.addEventListener('click', handleUpdateWatchlist);
  elements.btnUpdateConsidering.addEventListener('click', handleUpdateConsidering);
  
  // Recruit filtering
  if (elements.filterName) {
    elements.filterName.addEventListener('input', applyFilters);
  }
  
  if (elements.filterPosition) {
    elements.filterPosition.addEventListener('change', applyFilters);
  }
  
  if (elements.filterMinRating) {
    elements.filterMinRating.addEventListener('input', applyFilters);
  }
  
  if (elements.filterPotential) {
    elements.filterPotential.addEventListener('change', applyFilters);
  }
  
  // Pagination
  if (elements.prevPageBtn) {
    elements.prevPageBtn.addEventListener('click', () => changePage(-1));
  }
  
  if (elements.nextPageBtn) {
    elements.nextPageBtn.addEventListener('click', () => changePage(1));
  }
  
  // Settings actions
  if (elements.btnExportData) {
    elements.btnExportData.addEventListener('click', handleExportData);
  }
  
  if (elements.btnImportData) {
    elements.btnImportData.addEventListener('click', handleImportData);
  }
  
  if (elements.btnClearData) {
    elements.btnClearData.addEventListener('click', handleClearData);
  }
  
  if (elements.btnEditRoleRatings) {
    elements.btnEditRoleRatings.addEventListener('click', handleEditRoleRatings);
  }
  
  // Add event listener for database check button
  const btnCheckDb = document.getElementById('btn-check-db');
  if (btnCheckDb) {
    btnCheckDb.addEventListener('click', handleCheckDatabase);
  }
}

// Tab switching
function switchTab(tabId) {
  // Update active tab button
  elements.tabButtons.forEach(button => {
    button.classList.toggle('active', button.id === `tab-${tabId}`);
  });
  
  // Show active tab section
  elements.tabSections.forEach(section => {
    section.classList.toggle('active', section.id === `${tabId}-section`);
  });
}

// Load data from background script
async function loadData() {
  try {
    // Get recruits from storage
    const response = await sendMessageToBackground({ action: 'getRecruits' });
    state.recruits = response.recruits || [];
    
    // Populate position filter if it exists
    if (elements.filterPosition) {
      populatePositionFilter();
    }
    
    // Populate potential filter if it exists
    if (elements.filterPotential) {
      populatePotentialFilter();
    }
    
    // Apply filters and update list
    applyFilters();
  } catch (error) {
    console.error('Error loading data:', error);
    setStatusMessage('Error loading data');
  }
}

// Update dashboard statistics
function updateDashboardStats() {
  sendMessageToBackground({ action: 'getStats' })
    .then(stats => {
      elements.recruitCount.textContent = state.recruits.length;
      elements.watchlistCount.textContent = stats.watchlistCount || 0;
      elements.lastUpdated.textContent = formatDate(stats.lastUpdated) || 'Never';
      
      // Store and display season number if available
      if (stats.currentSeason) {
        state.currentSeason = stats.currentSeason;
        console.log('Setting current season display to:', stats.currentSeason);
        elements.currentSeason.textContent = stats.currentSeason;
      } else {
        console.log('No current season available, displaying N/A');
        elements.currentSeason.textContent = 'N/A';
      }
    })
    .catch(error => {
      console.error('Error getting stats:', error);
    });
}

// Apply filters to recruits list
function applyFilters() {
  // Update filter values
  state.filters.name = elements.filterName ? elements.filterName.value.toLowerCase() : '';
  state.filters.position = elements.filterPosition ? elements.filterPosition.value : '';
  state.filters.minRating = elements.filterMinRating ? parseFloat(elements.filterMinRating.value) || 0 : 0;
  state.filters.potential = elements.filterPotential ? elements.filterPotential.value : '';
  
  // Apply filters to recruits
  state.filteredRecruits = state.recruits.filter(recruit => {
    // Name filter
    if (state.filters.name && !recruit.name.toLowerCase().includes(state.filters.name)) {
      return false;
    }
    
    // Position filter
    if (state.filters.position && recruit.pos !== state.filters.position) {
      return false;
    }
    
    // Rating filter
    if (state.filters.minRating > 0) {
      const rating = recruit.ovr || 0;
      if (rating < state.filters.minRating) {
        return false;
      }
    }
    
    // Potential filter
    if (state.filters.potential && recruit.potential !== state.filters.potential) {
      return false;
    }
    
    return true;
  });
  
  // Reset to first page
  state.currentPage = 1;
  
  // Update the list
  updateRecruitsList();
}

// Update recruits list in the UI
function updateRecruitsList() {
  if (!elements.recruitsList) return;
  
  // Calculate pagination
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageRecruits = state.filteredRecruits.slice(startIndex, endIndex);
  
  // Clear current list
  elements.recruitsList.innerHTML = '';
  
  // Add recruits to list
  if (pageRecruits.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.textContent = 'No recruits found matching your filters';
    emptyCell.style.textAlign = 'center';
    emptyRow.appendChild(emptyCell);
    elements.recruitsList.appendChild(emptyRow);
  } else {
    pageRecruits.forEach(recruit => {
      const row = document.createElement('tr');
      
      // Create cells for recruit data
      const nameCell = document.createElement('td');
      nameCell.textContent = recruit.name;
      
      const positionCell = document.createElement('td');
      positionCell.textContent = recruit.pos;
      
      const ratingCell = document.createElement('td');
      ratingCell.textContent = recruit.ovr || 'N/A';
      
      const potentialCell = document.createElement('td');
      potentialCell.textContent = recruit.potential || 'N/A';
      
      const actionsCell = document.createElement('td');
      const viewButton = document.createElement('button');
      viewButton.textContent = 'View';
      viewButton.className = 'view-btn';
      viewButton.addEventListener('click', () => handleViewRecruit(recruit.id));
      actionsCell.appendChild(viewButton);
      
      // Add cells to row
      row.appendChild(nameCell);
      row.appendChild(positionCell);
      row.appendChild(ratingCell);
      row.appendChild(potentialCell);
      row.appendChild(actionsCell);
      
      // Add row to table
      elements.recruitsList.appendChild(row);
    });
  }
  
  // Update pagination controls
  const totalPages = Math.ceil(state.filteredRecruits.length / state.itemsPerPage);
  elements.pageInfo.textContent = `Page ${state.currentPage} of ${totalPages || 1}`;
  elements.prevPageBtn.disabled = state.currentPage <= 1;
  elements.nextPageBtn.disabled = state.currentPage >= totalPages;
}

// Change page for pagination
function changePage(direction) {
  const totalPages = Math.ceil(state.filteredRecruits.length / state.itemsPerPage);
  state.currentPage = Math.max(1, Math.min(totalPages, state.currentPage + direction));
  updateRecruitsList();
}

// Populate position filter
function populatePositionFilter() {
  // Get unique positions
  const positions = [...new Set(state.recruits.map(recruit => recruit.pos))].sort();
  
  // Clear current options
  elements.filterPosition.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'All Positions';
  elements.filterPosition.appendChild(defaultOption);
  
  // Add position options
  positions.forEach(position => {
    const option = document.createElement('option');
    option.value = position;
    option.textContent = position;
    elements.filterPosition.appendChild(option);
  });
}

// Populate potential filter
function populatePotentialFilter() {
  // Clear current options
  elements.filterPotential.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'All Potentials';
  elements.filterPotential.appendChild(defaultOption);
  
  // Add potential options
  const potentials = ['0-VL', '1-L', '2-A', '3-H', '4-VH'];
  potentials.forEach(potential => {
    const option = document.createElement('option');
    option.value = potential;
    option.textContent = potential;
    elements.filterPotential.appendChild(option);
  });
}

// Handle view recruit details
function handleViewRecruit(recruitId) {
  // Find recruit by ID
  const recruit = state.recruits.find(r => r.id === recruitId);
  
  if (!recruit) {
    console.error('Recruit not found:', recruitId);
    return;
  }
  
  // Open a modal or navigate to a detailed view
  // For now, just log the recruit
  console.log('Viewing recruit:', recruit);
  
  // In a real implementation, you would show a detailed view here
}

// Handle scrape recruits action
async function handleScrapeRecruits() {
  setStatusMessage('Preparing to fetch recruit data...');
  
  try {
    // Check if the user is logged in first
    const loginCheck = await sendMessageToBackground({
      action: 'checkLogin'
    });
    
    if (!loginCheck.loggedIn) {
      setStatusMessage('Error: Not authenticated. Please log in to WhatifsIports.com in another tab first.', 'error');
      return;
    }
      // Check if this is an initialization or a regular scrape
    const stats = await sendMessageToBackground({ action: 'getStats' });
    const recruitCount = stats.recruitCount || 0;
    const isInitializing = recruitCount === 0;    // If this is an initialization, get the season number
    let seasonNumber = null;
    if (isInitializing) {
      try {
        seasonNumber = await showSeasonInputModal();
        console.log('Season number from modal:', seasonNumber);
        
        // If we have a valid season number, update the dashboard immediately
        if (seasonNumber) {
          // Manually update the current season in the UI right away
          state.currentSeason = seasonNumber;
          if (elements.currentSeason) {
            elements.currentSeason.textContent = seasonNumber;
          }
        }
      } catch (error) {
        // User cancelled the season input
        setStatusMessage('Initialization cancelled');
        return;
      }
    }
    
    // Check if user wants to include lower divisions
    const includeLowerDivisions = elements.includeLowerDivisions.checked;
    console.log(`Scraping recruits with includeLowerDivisions: ${includeLowerDivisions}`);
      // Send request to background script to fetch and scrape recruits
    setStatusMessage('Opening recruit page and starting scrape...');
    console.log('Sending fetchAndScrapeRecruits with seasonNumber:', seasonNumber);
    const result = await sendMessageToBackground({
      action: 'fetchAndScrapeRecruits',
      includeLowerDivisions: includeLowerDivisions,
      seasonNumber: seasonNumber
    });
    
    if (!result.success) {
      console.error('Error in fetch and scrape process:', result.error);
      throw new Error(result.error || 'Unknown error occurred');
    }
    
    setStatusMessage('Scraping in progress. A new tab will open briefly and close when done...');
      // Set up a listener for the scraped data
    const handleScrapeComplete = (message) => {
      if (message.action === 'scrapeComplete') {
        // Remove this listener
        chrome.runtime.onMessage.removeListener(handleScrapeComplete);
          // Reload data
        loadData().then(() => {
          // Make sure to update the dashboard stats to reflect the new season
          updateDashboardStats();
          updateButtonState();
          
          // If we have a season number from initialization, show it in the status message
          if (seasonNumber && isInitializing) {
            setStatusMessage(`Scrape completed successfully with ${message.count} recruits for Season ${seasonNumber}`);
          } else {
            setStatusMessage(`Scrape completed successfully with ${message.count} recruits`);
          }
        });
      }
    };
    
    // Add the listener
    chrome.runtime.onMessage.addListener(handleScrapeComplete);
    
    // Set a timeout to remove the listener if no response within 2 minutes
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(handleScrapeComplete);
      setStatusMessage('Scraping timed out. Please try again.');
    }, 120000); // 2 minutes
  } catch (error) {
    console.error('Error scraping recruits:', error);
    
    // Check for common error types and provide better messages
    if (error.message.includes('403')) {
      setStatusMessage('Error: Not authenticated. Please log in to WhatifsIports.com in another tab first.');
    } else if (error.message.includes('Failed to fetch')) {
      setStatusMessage('Error connecting to WhatifsIports.com. Check your internet connection and login status.');
    } else {
      setStatusMessage('Error scraping recruits: ' + error.message);
    }
  }
}

// Handle update watchlist action
async function handleUpdateWatchlist() {
  setStatusMessage('Checking for recruiting summary page...');
  
  try {
    // Check if we're on a recruiting page
    const isOnRecruitingPage = await sidebarComms.isOnRecruitingPage();
    
    if (!isOnRecruitingPage) {
      setStatusMessage('Please navigate to the Recruiting Summary page first');
      return;
    }
    
    // Check if we're not on the Advanced page
    const isOnAdvancedPage = await sidebarComms.isOnAdvancedRecruitingPage();
    
    if (isOnAdvancedPage) {
      setStatusMessage('Please navigate to the Recruiting Summary page, not Advanced');
      return;
    }
    
    // Get the active tab
    const activeTab = await sidebarComms.getActiveTab();
    
    if (!activeTab) {
      setStatusMessage('No active tab found');
      return;
    }
    
    // Send message to content script to trigger watchlist scrape
    setStatusMessage('Updating watchlist...');
    await sendMessageToBackground({
      action: 'sendToContentScript',
      tabId: activeTab.id,
      message: { action: 'triggerWatchlistScrape' }
    });
    
    // Wait a bit for scraping to complete
    setTimeout(async () => {
      // Reload data
      await loadData();
      updateDashboardStats();
      setStatusMessage('Watchlist updated successfully');
    }, 2000);
  } catch (error) {
    console.error('Error updating watchlist:', error);
    setStatusMessage('Error updating watchlist: ' + error.message);
  }
}

// Handle update considering action
async function handleUpdateConsidering() {
  setStatusMessage('Starting considering status update...');
  
  try {
    // Request background script to update considering status
    const result = await sendMessageToBackground({
      action: 'updateConsideringStatus'
    });
    
    // Reload data
    await loadData();
    updateDashboardStats();
    
    setStatusMessage(`Updated considering status for ${result.count} recruits`);
  } catch (error) {
    console.error('Error updating considering status:', error);
    setStatusMessage('Error updating considering status: ' + error.message);
  }
}

// Handle export data action
async function handleExportData() {
  setStatusMessage('Exporting data...');
  
  try {
    // Request data from background script
    const data = await sendMessageToBackground({
      action: 'exportAllData'
    });
    
    // Convert to JSON string
    const jsonData = JSON.stringify(data, null, 2);
    
    // Create blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `gd_recruit_data_${formatDateForFile(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    setStatusMessage('Data exported successfully');
  } catch (error) {
    console.error('Error exporting data:', error);
    setStatusMessage('Error exporting data: ' + error.message);
  }
}

// Handle import data action
function handleImportData() {
  setStatusMessage('Select a JSON file to import...');
  
  // Create file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  
  fileInput.addEventListener('change', async (event) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    
    try {
      // Read file
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Import data
      await sendMessageToBackground({
        action: 'importData',
        data
      });
        // Reload data
      await loadData();
      updateDashboardStats();
      await updateButtonState();
      
      setStatusMessage('Data imported successfully');
    } catch (error) {
      console.error('Error importing data:', error);
      setStatusMessage('Error importing data: ' + error.message);
    }
  });
  
  // Trigger file selection
  fileInput.click();
}

// Handle clear data action
async function handleClearData() {
  if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    return;
  }
  
  setStatusMessage('Clearing all data...');
  
  try {
    // Clear data
    const result = await sendMessageToBackground({
      action: 'clearAllData'
    });
    
    console.log('Clear data result:', result);
    
    // Check for error in the response
    if (result && result.error) {
      throw new Error(result.error);
    }
      // Check for warning
    if (result && result.warning) {
      console.warn('Warning during clear operation:', result.warning);
      setStatusMessage(`Data cleared with warning: ${result.warning}`);
    } else {
      // Reset local state for season
      state.currentSeason = null;
      
      // Reload data
      await loadData();
      updateDashboardStats();
      await updateButtonState();
      
      setStatusMessage('All data and season information cleared successfully');
    }
  } catch (error) {
    console.error('Error clearing data:', error);
    // Format error message properly to avoid [object Object]
    let errorMessage;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = 'Unknown error';
    }
    
    setStatusMessage('Error clearing data: ' + errorMessage);
  }
}

// Handle edit role ratings action
function handleEditRoleRatings() {
  // This would open a modal or navigate to a role ratings editor
  setStatusMessage('Role ratings editor not implemented yet');
}

// Handle check database action
async function handleCheckDatabase() {
  setStatusMessage('Checking database status...');
  
  try {
    // Request diagnostic data from background script
    const diagnosticResult = await sendMessageToBackground({
      action: 'checkDatabaseStatus'
    });
    
    // Display diagnostic information
    if (diagnosticResult.success) {
      const dbInfo = diagnosticResult.dbInfo;
      const message = `
Database name: ${dbInfo.name}
Database version: ${dbInfo.version}
Object stores: ${dbInfo.objectStores.join(', ')}
Recruit count: ${dbInfo.recruitCount}
Last error: ${dbInfo.lastError || 'None'}
      `;
      
      // Create a modal to display the information
      showDiagnosticModal('Database Diagnostic Results', message);
      
      setStatusMessage('Database check completed');
    } else {
      throw new Error(diagnosticResult.error || 'Unknown error checking database');
    }
  } catch (error) {
    console.error('Error checking database:', error);
    setStatusMessage('Error checking database: ' + error.message);
  }
}

// Function to show the season input modal
function showSeasonInputModal() {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('season-modal');
    const closeBtn = document.getElementById('season-modal-close');
    const confirmBtn = document.getElementById('season-confirm');
    const cancelBtn = document.getElementById('season-cancel');
    const seasonInput = document.getElementById('season-number');
    const errorText = document.getElementById('season-input-error');
    
    // Clear previous errors and reset input
    errorText.textContent = '';
    seasonInput.value = '1';
    
    // Show the modal
    modal.style.display = 'block';
    
    // Focus the input field
    seasonInput.focus();
    
    // Handle close button click
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      reject(new Error('Season input cancelled'));
    };
    
    // Handle cancel button click
    cancelBtn.onclick = () => {
      modal.style.display = 'none';
      reject(new Error('Season input cancelled'));
    };
      // Handle confirm button click
    confirmBtn.onclick = () => {
      const seasonNumber = parseInt(seasonInput.value);
      console.log('Confirm button clicked, parsed season number:', seasonNumber, 'from input value:', seasonInput.value);
      
      if (!seasonNumber || seasonNumber < 1 || !Number.isInteger(seasonNumber)) {
        errorText.textContent = 'Please enter a valid season number (positive integer)';
        return;
      }
      
      modal.style.display = 'none';
      resolve(seasonNumber);
    };
    
    // Handle Enter key in input
    seasonInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        confirmBtn.click();
      }
    });
    
    // Handle click outside the modal to close
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
        reject(new Error('Season input cancelled'));
      }
    };
  });
}

// Function to update the buttons based on whether recruits exist
async function updateButtonState() {
  try {
    // Get stats from background
    const stats = await sendMessageToBackground({ action: 'getStats' });
    const recruitCount = stats.recruitCount || 0;
    
    // Change button text based on whether recruits exist
    if (elements.btnScrapeRecruits) {
      elements.btnScrapeRecruits.textContent = 
        recruitCount > 0 ? "Scrape Recruits" : "Initialize Recruits";
    }
    
    // Disable/enable Update Watchlist and Update Considering buttons
    if (elements.btnUpdateWatchlist) {
      elements.btnUpdateWatchlist.disabled = recruitCount === 0;
    }
    
    if (elements.btnUpdateConsidering) {
      elements.btnUpdateConsidering.disabled = recruitCount === 0;
    }
  } catch (error) {
    console.error('Error updating button state:', error);
  }
}

// Helper function to show a diagnostic modal
function showDiagnosticModal(title, message) {
  // Create modal elements
  const modal = document.createElement('div');
  modal.classList.add('modal');
  
  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');
  
  const modalHeader = document.createElement('div');
  modalHeader.classList.add('modal-header');
  
  const modalTitle = document.createElement('h2');
  modalTitle.textContent = title;
  
  const closeButton = document.createElement('span');
  closeButton.classList.add('close-button');
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  const modalBody = document.createElement('div');
  modalBody.classList.add('modal-body');
  
  const preElement = document.createElement('pre');
  preElement.textContent = message;
  
  // Assemble modal
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  
  modalBody.appendChild(preElement);
  
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  
  modal.appendChild(modalContent);
  
  // Add modal to page
  document.body.appendChild(modal);
  
  // Add modal styles if they don't exist
  if (!document.getElementById('modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal {
        display: block;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.4);
      }
      
      .modal-content {
        background-color: #fefefe;
        margin: 15% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 600px;
        border-radius: 5px;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #ddd;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      
      .close-button {
        color: #aaa;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
      }
      
      .close-button:hover {
        color: #000;
      }
      
      .modal-body pre {
        white-space: pre-wrap;
        background-color: #f5f5f5;
        padding: 10px;
        border-radius: 5px;
        max-height: 300px;
        overflow-y: auto;
      }
    `;
    document.head.appendChild(style);
  }
}

// Helper function to send messages to background script
function sendMessageToBackground(message) {
  return sidebarComms.sendMessageToBackground(message);
}

// Helper function to set status message
function setStatusMessage(message, type = 'info') {
  if (!elements.statusMessage) return;
  
  // Reset all status classes
  elements.statusMessage.classList.remove('status-success', 'status-error', 'status-warning');
  
  // Set appropriate class based on message type
  if (type === 'success') {
    elements.statusMessage.classList.add('status-success');
  } else if (type === 'error') {
    elements.statusMessage.classList.add('status-error');
  } else if (type === 'warning') {
    elements.statusMessage.classList.add('status-warning');
  }
  
  elements.statusMessage.textContent = message;
}

// Helper function to format date
function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  
  const date = new Date(dateStr);
  return date.toLocaleString();
}

// Helper function to format date for filenames
function formatDateForFile(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}`;
}

// Export functions needed for error handler
export { handleScrapeRecruits, setStatusMessage };
