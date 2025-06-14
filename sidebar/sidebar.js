// Sidebar script for GD Recruit Assistant

// Import modules
import { sidebarComms } from './communications.js';
import boldAttributesConfig from '../modules/bold-attributes-config.js';
import { getFullVersionString } from '../lib/version.js';

// Position mapping for converting position codes to full names
const POSITION_MAP = {
  'QB': 'quarterback',
  'RB': 'runningBack',
  'WR': 'wideReceiver',
  'TE': 'tightEnd',
  'OL': 'offensiveLine',
  'DL': 'defensiveLine',
  'LB': 'linebacker',
  'DB': 'defensiveBack',
  'K': 'kicker',
  'P': 'punter'
};

// DOM elements
const elements = {
  // Tab navigation
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabSections: document.querySelectorAll('.tab-content'),  // Dashboard elements
  schoolName: document.getElementById('schoolName'),
  dashboardSchoolName: document.getElementById('dashboardSchoolName'),
  teamDivision: document.getElementById('team-division'),
  teamWorld: document.getElementById('team-world'),
  recruitCount: document.getElementById('recruit-count'),
  watchlistCount: document.getElementById('watchlist-count'),
  lastUpdated: document.getElementById('last-updated'),
  currentSeason: document.getElementById('current-season'),
  btnScrapeRecruits: document.getElementById('btn-scrape-recruits'),
  btnUpdateConsidering: document.getElementById('btn-update-considering'),
  statusMessage: document.getElementById('status-message'),
  // Recruits tab elements
  filterName: document.getElementById('filter-name'),
  filterPosition: document.getElementById('filter-position'),
  filterWatched: document.getElementById('filter-watched'),  filterPotential: document.getElementById('filter-potential'),
  filterPriority: document.getElementById('filter-priority'),
  filterDistance: document.getElementById('filter-distance'),
  filterHideSigned: document.getElementById('filter-hide-signed'),
  recruitsList: document.getElementById('recruits-list'),
  prevPageBtn: document.getElementById('prev-page'),
  nextPageBtn: document.getElementById('next-page'),
  pageInfo: document.getElementById('page-info'),  pageSizeSelect: document.getElementById('page-size-select'),
  
  // Column visibility elements
  btnColumnVisibility: document.getElementById('btn-column-visibility'),
  columnVisibilityModal: document.getElementById('column-visibility-modal'),
  columnVisibilityGrid: document.getElementById('column-visibility-grid'),
  columnVisibilitySave: document.getElementById('column-visibility-save'),
  columnVisibilityReset: document.getElementById('column-visibility-reset'),
  columnVisibilityCancel: document.getElementById('column-visibility-cancel'),

  // Settings tab elementsbtnExportData: document.getElementById('btn-export-data'),
  btnImportData: document.getElementById('btn-import-data'),
  btnClearData: document.getElementById('btn-clear-data'),
  btnRefreshData: document.getElementById('btn-refresh-data'),
  btnEditRoleRatings: document.getElementById('btn-edit-role-ratings'),
  btnResetRoleRatings: document.getElementById('btn-reset-role-ratings'),
  btnEditBoldAttributes: document.getElementById('btn-edit-bold-attributes'),
  btnResetBoldAttributes: document.getElementById('btn-reset-bold-attributes'),  // Role ratings modal elements
  roleRatingsModal: document.getElementById('role-ratings-modal'),
  roleRatingsModalClose: document.getElementById('role-ratings-modal-close'),
  positionTabs: document.getElementById('position-tabs'),
  positionContent: document.getElementById('position-content'),
  roleResetPosition: document.getElementById('role-reset-position'),
  roleRecalculate: document.getElementById('role-recalculate'),
  roleDebug: document.getElementById('role-debug'),
  roleRatingsSave: document.getElementById('role-ratings-save'),
  roleRatingsCancel: document.getElementById('role-ratings-cancel')
};

// State management
let state = {
  recruits: [],
  filteredRecruits: [],
  currentPage: 1,
  itemsPerPage: 10, // Default value
  showAllResults: false, // Track if showing all results
  sorting: {
    column: null,
    direction: 'asc' // 'asc' or 'desc'
  },
  filters: {
    name: '',
    position: '',
    watched: '',
    potential: '',
    priority: '',
    distance: '',
    hideSigned: false
  },  // Role ratings modal state
  roleRatings: {
    data: null,
    currentPosition: null,
    activeRoles: {},
    hasChanges: false
  },
  // Column visibility state
  columnVisibility: {
    name: true,
    pos: true,
    watched: true,
    potential: true,
    priority: true,
    height: true,
    weight: true,
    rating: true,
    rank: true,
    hometown: true,
    division: true,
    miles: true,
    signed: true,
    gpa: true,
    ath: true,
    spd: true,
    dur: true,
    we: true,
    sta: true,
    str: true,
    blk: true,
    tkl: true,
    han: true,
    gi: true,
    elu: true,
    tec: true,
    r1: true,
    r2: true,
    r3: true,
    r4: true,
    r5: true,
    r6: true,
    considering: true
  }
};

// Configuration constants
const PAGE_SIZE_OPTIONS = {
  SMALL: 10,
  MEDIUM: 25,
  LARGE: 50,
  EXTRA_LARGE: 100
};

const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS.SMALL;
const PAGE_SIZE_STORAGE_KEY = 'preferredPageSize';
const COLUMN_VISIBILITY_STORAGE_KEY = 'columnVisibility';

// Column configuration
const COLUMNS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'pos', label: 'Pos', sortable: true },
  { key: 'watched', label: 'Watched', sortable: true },
  { key: 'potential', label: 'Pot', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'height', label: 'Height', sortable: true },
  { key: 'weight', label: 'Weight', sortable: true },
  { key: 'rating', label: 'Rating', sortable: true },
  { key: 'rank', label: 'Rank', sortable: true },
  { key: 'hometown', label: 'Hometown', sortable: true },
  { key: 'division', label: 'Division', sortable: true },
  { key: 'miles', label: 'Miles', sortable: true },
  { key: 'signed', label: 'Signed', sortable: true },
  { key: 'gpa', label: 'GPA', sortable: true },
  { key: 'ath', label: 'Ath', sortable: true },
  { key: 'spd', label: 'Spd', sortable: true },
  { key: 'dur', label: 'Dur', sortable: true },
  { key: 'we', label: 'WE', sortable: true },
  { key: 'sta', label: 'Sta', sortable: true },
  { key: 'str', label: 'Str', sortable: true },
  { key: 'blk', label: 'Blk', sortable: true },
  { key: 'tkl', label: 'Tkl', sortable: true },
  { key: 'han', label: 'Han', sortable: true },
  { key: 'gi', label: 'GI', sortable: true },
  { key: 'elu', label: 'Elu', sortable: true },
  { key: 'tec', label: 'Tec', sortable: true },
  { key: 'r1', label: 'R1', sortable: true },
  { key: 'r2', label: 'R2', sortable: true },
  { key: 'r3', label: 'R3', sortable: true },
  { key: 'r4', label: 'R4', sortable: true },
  { key: 'r5', label: 'R5', sortable: true },
  { key: 'r6', label: 'R6', sortable: true },
  { key: 'considering', label: 'Considering Schools', sortable: true }
];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  // Load and display version
  try {
    const versionString = await getFullVersionString();
    const versionElement = document.getElementById('version-display');
    if (versionElement) {
      versionElement.textContent = versionString;
    }
  } catch (error) {
    console.error('Failed to load version:', error);
  }
    // Initialize bold attributes configuration
  try {
    await boldAttributesConfig.init();
    console.log('Bold attributes configuration initialized successfully');
  } catch (error) {
    console.error('Failed to initialize bold attributes configuration:', error);
    setStatusMessage('Warning: Attribute styling configuration failed to load', 'warning');
  }
     
  // Set initial loading state for school name
  const schoolNameElements = [elements.schoolName, elements.dashboardSchoolName];
  schoolNameElements.forEach(element => {
    if (element) element.textContent = 'Loading...';
  });
  
  // Set initial loading state for team info
  if (elements.teamDivision) elements.teamDivision.textContent = 'Loading...';
  if (elements.teamWorld) elements.teamWorld.textContent = 'Loading...';
    await loadData();
  updateDashboardStats();
  await updateButtonState();
  // Load column visibility preferences
  await loadColumnVisibility();

  // Set up table sorting after data
  setupTableSorting();

  // Apply column visibility after everything is set up
  applyColumnVisibility();
  // Set up sidebar visibility listener
  sidebarComms.setupSidebarListeners();
  
  // Request current team info on initialization
  try {
    const teamResponse = await sendMessageToBackground({ action: 'getCurrentTeamInfo' });
    if (teamResponse.success && teamResponse.teamInfo) {
      handleTeamChange(teamResponse.teamInfo);
    }
  } catch (error) {
    console.error('Error getting initial team info:', error);
  }
  
  // Listen for sidebar visibility events
  document.addEventListener('sidebar-visible', async () => {
    console.log('Sidebar became visible, refreshing data');
    await loadData();
    updateDashboardStats();
    await updateButtonState();
    
    // Reload column visibility preferences
    await loadColumnVisibility();
    
    // Re-setup sorting after data refresh
    setupTableSorting();
    
    // Apply column visibility after everything is refreshed
    applyColumnVisibility();
  });
    // Enhanced UI Refresh Mechanism - Setup data update listeners
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'dataUpdated') {
      handleDataUpdate(message);
    }
    if (message.action === 'teamChanged') {
      console.log('Received team change notification:', message);
      handleTeamChange(message.teamInfo);
    }
    return false; // Don't keep the message channel open
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
  elements.btnUpdateConsidering.addEventListener('click', handleUpdateConsidering);

  // Recruit filtering
  if (elements.filterName) {
    elements.filterName.addEventListener('input', applyFilters);
  }
  if (elements.filterPosition) {
    elements.filterPosition.addEventListener('change', applyFilters);
  }

  if (elements.filterWatched) {
    elements.filterWatched.addEventListener('change', applyFilters);
  }

  if (elements.filterPotential) {
    elements.filterPotential.addEventListener('change', applyFilters);
  }

  if (elements.filterPriority) {
    elements.filterPriority.addEventListener('change', applyFilters);
  }

  if (elements.filterDistance) {
    elements.filterDistance.addEventListener('change', applyFilters);
  }

  if (elements.filterHideSigned) {
    elements.filterHideSigned.addEventListener('change', applyFilters);
  }
  // Pagination
  if (elements.prevPageBtn) {
    elements.prevPageBtn.addEventListener('click', () => changePage(-1));
  }

  if (elements.nextPageBtn) {
    elements.nextPageBtn.addEventListener('click', () => changePage(1));
  }
  
  // Page size selection
  if (elements.pageSizeSelect) {
    elements.pageSizeSelect.addEventListener('change', handlePageSizeChange);
  }
  // Settings actions
  if (elements.btnExportData) {
    elements.btnExportData.addEventListener('click', handleExportData);
  }

  if (elements.btnImportData && !elements.btnImportData.disabled) {
    elements.btnImportData.addEventListener('click', handleImportData);
  }
  if (elements.btnClearData) {
    elements.btnClearData.addEventListener('click', handleClearData);
  }

  // Enhanced Manual Refresh Function
  if (elements.btnRefreshData) {
    elements.btnRefreshData.addEventListener('click', refreshAllData);
  }

  if (elements.btnEditRoleRatings) {
    elements.btnEditRoleRatings.addEventListener('click', handleEditRoleRatings);
  }

  if (elements.btnResetRoleRatings) {
    elements.btnResetRoleRatings.addEventListener('click', handleResetRoleRatings);
  }
  // Role ratings modal event listeners
  if (elements.roleRatingsModalClose) {
    elements.roleRatingsModalClose.addEventListener('click', closeRoleRatingsModal);
  }

  if (elements.roleResetPosition) {
    elements.roleResetPosition.addEventListener('click', handleResetCurrentPosition);
  }
  
  if (elements.roleRecalculate) {
    elements.roleRecalculate.addEventListener('click', handleRecalculateAllRatings);
  }
  
  if (elements.roleDebug) {
    elements.roleDebug.addEventListener('click', handleDebugRoleRatings);
  }

  if (elements.roleRatingsSave) {
    elements.roleRatingsSave.addEventListener('click', handleSaveRoleRatings);
  }

  if (elements.roleRatingsCancel) {
    elements.roleRatingsCancel.addEventListener('click', closeRoleRatingsModal);
  }

  // Bold attributes configuration
  if (elements.btnEditBoldAttributes) {
    elements.btnEditBoldAttributes.addEventListener('click', handleEditBoldAttributes);
  }

  if (elements.btnResetBoldAttributes) {
    elements.btnResetBoldAttributes.addEventListener('click', handleResetBoldAttributes);
  }
  // Add event listener for database check button
  const btnCheckDb = document.getElementById('btn-check-db');
  if (btnCheckDb) {
    btnCheckDb.addEventListener('click', handleCheckDatabase);
  }
  // Column visibility event listeners
  if (elements.btnColumnVisibility) {
    elements.btnColumnVisibility.addEventListener('click', openColumnVisibilityModal);
  }

  if (elements.columnVisibilityCancel) {
    elements.columnVisibilityCancel.addEventListener('click', closeColumnVisibilityModal);
  }

  if (elements.columnVisibilitySave) {
    elements.columnVisibilitySave.addEventListener('click', saveColumnVisibility);
  }

  if (elements.columnVisibilityReset) {
    elements.columnVisibilityReset.addEventListener('click', resetColumnVisibility);
  }
  // Close modal when clicking outside
  if (elements.columnVisibilityModal) {
    elements.columnVisibilityModal.addEventListener('click', (e) => {
      if (e.target === elements.columnVisibilityModal) {
        closeColumnVisibilityModal();
      }
    });

    // Also handle the close button in modal header
    const closeBtn = elements.columnVisibilityModal.querySelector('.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeColumnVisibilityModal);
    }  }
}

// Handle team change updates
function handleTeamChange(teamInfo) {
  console.log('Handling team change in sidebar:', teamInfo);
  
  // Update school name display
  const schoolNameElement = document.getElementById('schoolName');
  const dashboardSchoolNameElement = document.getElementById('dashboardSchoolName');
  
  if (teamInfo && !teamInfo.error) {
    // Update school name elements
    const schoolName = teamInfo.schoolLong || teamInfo.schoolShort || 'Unknown School';
    
    if (schoolNameElement) {
      schoolNameElement.textContent = schoolName;
    }
    
    if (dashboardSchoolNameElement) {
      dashboardSchoolNameElement.textContent = schoolName;
    }
    
    // Update team info elements
    const teamDivisionElement = document.getElementById('team-division');
    const teamWorldElement = document.getElementById('team-world');
    
    if (teamDivisionElement) {
      teamDivisionElement.textContent = teamInfo.division || 'Unknown Division';
    }
    
    if (teamWorldElement) {
      teamWorldElement.textContent = `World ${teamInfo.world || '?'}`;    }
    
    // Update any other UI elements that depend on team info
    updateDashboardStats();
    
    // Show a notification about the team change
    showNotification(`Switched to ${schoolName}`, 'info');
    
  } else {
    // Handle error or cleared team info
    const errorText = teamInfo?.error ? 'Error Loading School' : 'No School Selected';
    
    if (schoolNameElement) {
      schoolNameElement.textContent = errorText;
    }
    
    if (dashboardSchoolNameElement) {
      dashboardSchoolNameElement.textContent = errorText;
    }
    
    if (teamInfo?.error) {
      showNotification(`Error: ${teamInfo.error}`, 'error');
    }
  }
}

// Show notification to user
function showNotification(message, type = 'info') {
  // Create or update a notification element
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    document.body.appendChild(notification);
  }
  
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.display = 'block';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
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
    // Get recruits from storage and load page size preference in parallel
    const [response] = await Promise.all([
      sendMessageToBackground({ action: 'getRecruits' }),
      loadPageSizePreference()
    ]);

    if (response.error) {
      throw new Error(response.error);
    }

    state.recruits = response.recruits || [];
    console.log(`Loaded ${state.recruits.length} recruits from storage`);

    // Populate position filter if it exists
    if (elements.filterPosition) {
      populatePositionFilter();
    }
    
    // Populate potential filter if it exists
    if (elements.filterPotential) {
      populatePotentialFilter();
    }
    
    // Populate priority filter if it exists
    if (elements.filterPriority) {
      populatePriorityFilter();
    }

    // Populate distance filter if it exists
    if (elements.filterDistance) {
      populateDistanceFilter();
    }

    // Apply filters and update list
    applyFilters();
    
    // Set up table sorting after data is loaded
    setupTableSorting();
  } catch (error) {
    console.error('Error loading data:', error);
    setStatusMessage(`Error loading data: ${error.message}`, 'error');
      // Reset to safe defaults
    state.recruits = [];
    state.filteredRecruits = [];
    updateRecruitsList().catch(err => console.error('Error updating recruits list:', err));
  }
}

// Update dashboard statistics
function updateDashboardStats() {
  sendMessageToBackground({ action: 'getStats' })
    .then(stats => {
      // Update school name displays
      updateSchoolNameDisplay(stats.schoolName, stats.teamInfo);

      // Update team information displays
      if (elements.teamDivision) {
        elements.teamDivision.textContent = stats.teamInfo?.division || 'Unknown';
      }
      if (elements.teamWorld) {
        elements.teamWorld.textContent = stats.teamInfo?.world || 'Unknown';
      }

      // Update other stats
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
    })    .catch(error => {
      console.error('Error getting stats:', error);
      
      // Set fallback values for school name elements
      const schoolNameElements = [elements.schoolName, elements.dashboardSchoolName];
      schoolNameElements.forEach(element => {
        if (element) element.textContent = 'Error loading school';
      });
      
      // Set fallback values for team info elements
      if (elements.teamDivision) elements.teamDivision.textContent = 'Error';
      if (elements.teamWorld) elements.teamWorld.textContent = 'Error';
    });
}

// Helper function to update school name elements safely
function updateSchoolNameDisplay(schoolName, teamInfo) {
  const schoolNameElements = [elements.schoolName, elements.dashboardSchoolName];
  const displayName = schoolName || 'Unknown School';
  
  // Build tooltip with available team information
  let tooltip = '';
  if (displayName) {
    tooltip = displayName;
  }
  if (teamInfo?.division) {
    tooltip += (tooltip ? ', ' : '') + `Division: ${teamInfo.division}`;
  }
  if (teamInfo?.world) {
    tooltip += (tooltip ? ', ' : '') + `World: ${teamInfo.world}`;
  }
  if (teamInfo?.conference) {
    tooltip += (tooltip ? ', ' : '') + `Conference: ${teamInfo.conference}`;
  }
  if (!tooltip) {
    tooltip = 'Team information not available';
  }
    
  schoolNameElements.forEach(element => {
    if (element) {
      element.textContent = displayName;
      element.title = tooltip;
    }
  });
}

// Apply filters to recruits list
function applyFilters() {
  // Update filter values
  state.filters.name = elements.filterName ? elements.filterName.value.toLowerCase() : '';
  state.filters.position = elements.filterPosition ? elements.filterPosition.value : '';
  state.filters.watched = elements.filterWatched ? elements.filterWatched.checked : false;
  state.filters.potential = elements.filterPotential ? elements.filterPotential.value : '';
  state.filters.priority = elements.filterPriority ? elements.filterPriority.value : '';
  state.filters.distance = elements.filterDistance ? elements.filterDistance.value : '';
  state.filters.hideSigned = elements.filterHideSigned ? elements.filterHideSigned.checked : false;

  // Apply filters to recruits
  state.filteredRecruits = state.recruits.filter(recruit => {
    // Position filter
    if (state.filters.position && recruit.pos !== state.filters.position) {
      return false;
    }

    // Watched filter (changed to checkbox)
    if (state.filters.watched && recruit.watched !== 1) {
      return false;
    }

    // Potential filter
    if (state.filters.potential && recruit.potential !== state.filters.potential) {
      return false;
    }

    // Priority filter
    if (state.filters.priority && parseInt(recruit.priority) !== parseInt(state.filters.priority)) {
      return false;
    }

    // Distance filter
    if (state.filters.distance) {
      const miles = recruit.miles || 0;
      switch (state.filters.distance) {
        case '< 180 miles':
          if (miles >= 180) return false;
          break;
        case '< 360 miles':
          if (miles >= 360) return false;
          break;
        case '< 1400 miles':
          if (miles >= 1400) return false;
          break;
        // 'Any' doesn't filter anything
      }
    }

    // Hide signed filter - if checked, only show unsigned recruits (signed=0)
    if (state.filters.hideSigned && recruit.signed === 1) {
      return false;
    }

    return true;
  });

  // Update state based on current display mode
  if (state.showAllResults) {
    state.itemsPerPage = Math.max(state.filteredRecruits.length, 1);
  }
  // Apply existing sorting if there is one
  if (state.sorting.column) {
    applySorting();
  }
  // Reset to first page when filters change
  state.currentPage = 1;

  // Update the list
  updateRecruitsList().catch(err => console.error('Error updating recruits list:', err));
  console.log(`Applied filters: ${state.filteredRecruits.length} recruits match criteria`);
}

// Column visibility functions
async function loadColumnVisibility() {
  try {
    const response = await sendMessageToBackground({ action: 'getConfig', key: COLUMN_VISIBILITY_STORAGE_KEY });
    if (response && response.success && response.value) {
      console.log('Loading column visibility preferences:', response.value);
      state.columnVisibility = { ...state.columnVisibility, ...response.value };
    } else {
      console.log('No saved column visibility preferences found, using defaults');
    }
  } catch (error) {
    console.error('Error loading column visibility preferences:', error);
  }
}

async function saveColumnVisibilityToStorage() {
  try {
    console.log('Saving column visibility preferences:', state.columnVisibility);
    await sendMessageToBackground({ 
      action: 'saveConfig', 
      key: COLUMN_VISIBILITY_STORAGE_KEY, 
      value: state.columnVisibility 
    });
    console.log('Column visibility preferences saved successfully');
  } catch (error) {
    console.error('Error saving column visibility preferences:', error);
  }
}

function openColumnVisibilityModal() {
  // Ensure we have the latest column visibility state before populating the modal
  console.log('Opening column visibility modal');
  populateColumnVisibilityModal();
  elements.columnVisibilityModal.style.display = 'flex';
}

function closeColumnVisibilityModal() {
  elements.columnVisibilityModal.style.display = 'none';
}

function populateColumnVisibilityModal() {
  const grid = elements.columnVisibilityGrid;
  grid.innerHTML = '';

  console.log('Populating column visibility modal with state:', state.columnVisibility);

  COLUMNS.forEach(column => {
    const label = document.createElement('label');
    label.className = 'column-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = state.columnVisibility[column.key];
    checkbox.dataset.column = column.key;

    const span = document.createElement('span');
    span.textContent = column.label;

    label.appendChild(checkbox);
    label.appendChild(span);
    grid.appendChild(label);
  });
}

async function saveColumnVisibility() {
  const checkboxes = elements.columnVisibilityGrid.querySelectorAll('input[type="checkbox"]');
  
  console.log('Saving column visibility from modal...');
  
  checkboxes.forEach(checkbox => {
    const columnKey = checkbox.dataset.column;
    const oldValue = state.columnVisibility[columnKey];
    state.columnVisibility[columnKey] = checkbox.checked;
    
    if (oldValue !== checkbox.checked) {
      console.log(`Column '${columnKey}' visibility changed from ${oldValue} to ${checkbox.checked}`);
    }
  });

  await saveColumnVisibilityToStorage();
  applyColumnVisibility();
  closeColumnVisibilityModal();
}

async function resetColumnVisibility() {
  // Reset all columns to visible
  COLUMNS.forEach(column => {
    state.columnVisibility[column.key] = true;
  });

  await saveColumnVisibilityToStorage();
  populateColumnVisibilityModal();
  applyColumnVisibility();
}

function applyColumnVisibility() {
  console.log('Applying column visibility with state:', state.columnVisibility);
  
  // Remove any existing column hiding styles
  const existingStyle = document.getElementById('column-visibility-styles');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with nth-child selectors
  const styleElement = document.createElement('style');
  styleElement.id = 'column-visibility-styles';
  
  let css = '';
  let hiddenColumns = [];
  
  COLUMNS.forEach((column, index) => {
    if (!state.columnVisibility[column.key]) {
      const nthChild = index + 1; // nth-child is 1-based
      css += `#recruits-table th:nth-child(${nthChild}), #recruits-table td:nth-child(${nthChild}) { display: none !important; }\n`;
      hiddenColumns.push(column.label);
    }
  });
  
  if (hiddenColumns.length > 0) {
    console.log('Hiding columns:', hiddenColumns);
  } else {
    console.log('All columns are visible');
  }
  
  styleElement.textContent = css;
  document.head.appendChild(styleElement);
}

/**
 * Check if current school is in the considering schools list
 * 
 * This function analyzes the "Considering Schools" text to determine if the current
 * school (based on team ID) is included in the recruit's consideration list.
 * 
 * Formatting Rules:
 * - Green background: Current school is the ONLY school being considered
 * - Yellow background: Current school is among multiple schools being considered
 * - No highlighting: Current school is not being considered or status is "undecided"
 * 
 * @param {string} considering - The considering schools text (e.g., "54006 (Howard Payne University), 54448 (Greensboro College)")
 * @param {string} currentTeamId - The current school's team ID (5-digit string)
 * @returns {string} 'only' if current school is the only one, 'included' if current school is among others, 'not_included' if not present
 */
function checkCurrentSchoolInConsidering(considering, currentTeamId) {
  if (!considering || considering === 'undecided' || !currentTeamId) {
    return 'not_included';
  }

  // Extract all school IDs from the considering text
  // Pattern: digits followed by space and parentheses with school name
  const schoolIdMatches = considering.match(/\b\d{5}\b/g);
  
  if (!schoolIdMatches) {
    return 'not_included';
  }

  const isCurrentSchoolIncluded = schoolIdMatches.includes(currentTeamId);
  
  if (!isCurrentSchoolIncluded) {
    return 'not_included';
  }
  
  // Debug logging for development
  console.log(`School ${currentTeamId} found in considering: ${considering} (${schoolIdMatches.length} total schools)`);
  
  // If current school is included, check if it's the only one
  if (schoolIdMatches.length === 1) {
    return 'only';
  } else {
    return 'included';
  }
}

/**
 * Determine the signed status of a recruit relative to the current school
 * 
 * This function checks if a recruit is signed and whether they signed with the current school
 * or elsewhere, enabling appropriate row-level formatting.
 * 
 * Formatting Rules:
 * - Gray background: Recruit is signed but not to current school
 * - Green background: Recruit is signed to current school
 * - No special formatting: Recruit is not signed
 * 
 * @param {Object} recruit - The recruit object containing signed status and considering schools
 * @param {string} currentTeamId - The current school's team ID (5-digit string)
 * @returns {string} 'signed_to_school' if signed to current school, 'signed_elsewhere' if signed to another school, 'not_signed' if not signed
 */
function checkSignedStatus(recruit, currentTeamId) {
  // Check if recruit is signed
  if (!recruit.signed || recruit.signed !== 1) {
    return 'not_signed';
  }

  // If signed, check if they signed with the current school
  const considering = recruit.considering || 'undecided';
  
  // For signed recruits, the considering field typically shows the school they signed with
  if (considering === 'undecided' || !currentTeamId) {
    return 'signed_elsewhere';
  }

  const currentSchoolStatus = checkCurrentSchoolInConsidering(considering, currentTeamId);
  
  // If current school is in the considering list, they likely signed with us
  if (currentSchoolStatus === 'only' || currentSchoolStatus === 'included') {
    return 'signed_to_school';
  } else {
    return 'signed_elsewhere';
  }
}

// Update recruits list in the UI
async function updateRecruitsList() {
  if (!elements.recruitsList) return;

  // Update itemsPerPage if showing all results and filtered recruits changed
  if (state.showAllResults) {
    state.itemsPerPage = Math.max(state.filteredRecruits.length, 1);
  }

  // Calculate pagination
  const totalItems = state.filteredRecruits.length;
  const totalPages = state.showAllResults ? 1 : Math.ceil(totalItems / state.itemsPerPage);
  
  // Ensure current page is valid
  if (state.currentPage > totalPages && totalPages > 0) {
    state.currentPage = totalPages;
  } else if (state.currentPage < 1) {
    state.currentPage = 1;
  }

  const startIndex = state.showAllResults ? 0 : (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = state.showAllResults ? totalItems : startIndex + state.itemsPerPage;
  const pageRecruits = state.filteredRecruits.slice(startIndex, endIndex);

  // Get team info for hometown links
  let teamInfo = null;
  try {
    const stats = await sendMessageToBackground({ action: 'getStats' });
    teamInfo = stats.teamInfo;
  } catch (error) {
    console.error('Error getting team info for hometown links:', error);
  }

  // Clear current list
  elements.recruitsList.innerHTML = '';
  // Add recruits to list
  if (pageRecruits.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    // Use total columns count since CSS will handle hiding
    emptyCell.colSpan = COLUMNS.length;
    emptyCell.textContent = 'No recruits found matching your filters';
    emptyCell.style.textAlign = 'center';
    emptyRow.appendChild(emptyCell);
    elements.recruitsList.appendChild(emptyRow);
  } else {
    pageRecruits.forEach(recruit => {
      const row = document.createElement('tr');
        // Helper function to create a cell with text content and conditional styling
      const createCell = (text, isNumeric = false, attributeName = null, position = null) => {
        const cell = document.createElement('td');
        if (text === null || text === undefined || text === '') {
          cell.textContent = 'N/A';
        } else if (isNumeric && typeof text === 'number') {
          cell.textContent = text.toString();
        } else {
          cell.textContent = text.toString();
        }
        
        if (isNumeric) {
          cell.style.textAlign = 'center';
        }

        // Apply bold styling if this is an attribute cell and should be bold for this position
        if (attributeName && position && boldAttributesConfig.shouldBoldAttribute(position, attributeName)) {
          cell.classList.add('recruit-attribute-bold');
        }

        return cell;
      };// Helper function to format priority value
      const formatPriority = (priority) => {
        if (priority === null || priority === undefined) return 'N/A';
        switch (parseInt(priority)) {
          case 0: return 'Unprioritized';
          case 1: return '1st';
          case 2: return '2nd';
          case 3: return '3rd';
          case 4: return '4th';
          case 5: return '5th';
          default: return 'Unprioritized';
        }
      };

      // Helper function to format hometown for URL (remove space before state abbreviation)
      const formatHometownForUrl = (hometown) => {
        if (!hometown) return '';
        // Remove space before state abbreviation (e.g., "City, ST" -> "City,ST")
        return hometown.replace(/,\s+([A-Z]{2})$/, ',$1');
      };

      // Helper function to create hometown cell with hyperlink
      const createHometownCell = (recruit, teamInfo) => {
        const cell = document.createElement('td');
        
        if (!recruit.hometown || recruit.hometown === 'N/A') {
          cell.textContent = 'N/A';
          return cell;
        }

        // If we have team info, create a hyperlink
        if (teamInfo && teamInfo.world && teamInfo.division) {
          const link = document.createElement('a');
          const formattedHometown = formatHometownForUrl(recruit.hometown);
          link.href = `https://www.thenextguess.com/gdanalyst/${teamInfo.world}/${teamInfo.division}/mapLocation?town=${encodeURIComponent(formattedHometown)}`;
          link.target = '_blank';
          link.textContent = recruit.hometown;
          link.style.color = '#007bff';
          link.style.textDecoration = 'none';
          link.addEventListener('mouseover', () => {
            link.style.textDecoration = 'underline';
          });
          link.addEventListener('mouseout', () => {
            link.style.textDecoration = 'none';
          });
          cell.appendChild(link);
        } else {
          // Fallback to plain text if no team info
          cell.textContent = recruit.hometown;
        }
        
        return cell;      };// Helper function to add cell (simplified - no visibility logic needed)
      const addCell = (cellElement) => {
        row.appendChild(cellElement);
      };      // Create name cell with hyperlink to recruit profile
      const nameCell = document.createElement('td');
      const nameLink = document.createElement('a');
      nameLink.href = `https://www.whatifsports.com/gd/RecruitProfile/Ratings.aspx?rid=${recruit.id}&section=Ratings`;
      nameLink.target = '_blank';
      nameLink.textContent = recruit.name || 'N/A';
      nameLink.style.color = '#007bff';
      nameLink.style.textDecoration = 'none';
      nameLink.addEventListener('mouseover', () => {
        nameLink.style.textDecoration = 'underline';
      });
      nameLink.addEventListener('mouseout', () => {
        nameLink.style.textDecoration = 'none';
      });
      nameCell.appendChild(nameLink);      // Check signed status first for row-level formatting
      const signedStatus = teamInfo && teamInfo.teamId ? checkSignedStatus(recruit, teamInfo.teamId) : 'not_signed';
      
      // Apply signed status formatting to the entire row
      if (signedStatus === 'signed_to_school') {
        row.classList.add('signed-recruit-to-school');
        nameCell.classList.add('signed-recruit-to-school');
      } else if (signedStatus === 'signed_elsewhere') {
        row.classList.add('signed-recruit-elsewhere');
        nameCell.classList.add('signed-recruit-elsewhere');
      }

      // Apply considering status formatting to name cell (unless overridden by signed status)
      const recruitConsidering = recruit.considering || 'undecided';
      if (teamInfo && teamInfo.teamId && recruitConsidering !== 'undecided' && signedStatus === 'not_signed') {
        const nameCurrentSchoolStatus = checkCurrentSchoolInConsidering(recruitConsidering, teamInfo.teamId);
        if (nameCurrentSchoolStatus === 'only') {
          nameCell.classList.add('considering-school-only');
        } else if (nameCurrentSchoolStatus === 'included') {
          nameCell.classList.add('considering-school-included');
        }
      }

      // Add all cells (CSS will handle visibility)
      addCell(nameCell);
      addCell(createCell(recruit.pos));
      addCell(createCell(recruit.watched === 1 ? 'Yes' : 'No'));
      addCell(createCell(recruit.potential));
      addCell(createCell(formatPriority(recruit.priority)));
      addCell(createCell(recruit.height));
      addCell(createCell(recruit.weight, true));
      addCell(createCell(recruit.rating, true));
      addCell(createCell(recruit.rank === 999 ? 'NR' : recruit.rank, true));
      addCell(createHometownCell(recruit, teamInfo));
      addCell(createCell(recruit.division));
      addCell(createCell(recruit.miles, true));
      addCell(createCell(recruit.signed === 1 ? 'Yes' : 'No'));
      addCell(createCell(recruit.gpa ? recruit.gpa.toFixed(1) : 'N/A'));
      
      // Update attribute cells with bold styling
      addCell(createCell(recruit.ath, true, 'ath', recruit.pos));
      addCell(createCell(recruit.spd, true, 'spd', recruit.pos));
      addCell(createCell(recruit.dur, true, 'dur', recruit.pos));
      addCell(createCell(recruit.we, true, 'we', recruit.pos));
      addCell(createCell(recruit.sta, true, 'sta', recruit.pos));
      addCell(createCell(recruit.str, true, 'str', recruit.pos));
      addCell(createCell(recruit.blk, true, 'blk', recruit.pos));
      addCell(createCell(recruit.tkl, true, 'tkl', recruit.pos));
      addCell(createCell(recruit.han, true, 'han', recruit.pos));
      addCell(createCell(recruit.gi, true, 'gi', recruit.pos));
      addCell(createCell(recruit.elu, true, 'elu', recruit.pos));
      addCell(createCell(recruit.tec, true, 'tec', recruit.pos));
      addCell(createCell(recruit.r1, true));
      addCell(createCell(recruit.r2, true));
      addCell(createCell(recruit.r3, true));
      addCell(createCell(recruit.r4, true));
      addCell(createCell(recruit.r5, true));
      addCell(createCell(recruit.r6, true));      // Considering schools cell - truncate if too long and apply formatting based on current school
      const consideringCell = document.createElement('td');
      const considering = recruit.considering || 'undecided';
      consideringCell.textContent = considering.length > 50 ? considering.substring(0, 47) + '...' : considering;
      
      // Build enhanced tooltip with status information
      let tooltip = considering;
      if (teamInfo && teamInfo.teamId && considering !== 'undecided') {
        const currentSchoolStatus = checkCurrentSchoolInConsidering(considering, teamInfo.teamId);
        
        // Add status-specific CSS classes and tooltips
        if (signedStatus === 'signed_to_school') {
          // Already signed to our school - different messaging
          consideringCell.classList.add('considering-school-only');
          tooltip += '\n\n✓ This recruit SIGNED with your school!';
        } else if (signedStatus === 'signed_elsewhere') {
          // Signed elsewhere - show as neutral/grayed out
          if (currentSchoolStatus === 'only' || currentSchoolStatus === 'included') {
            consideringCell.classList.add('considering-school-included');
            tooltip += '\n\n❌ This recruit signed elsewhere despite considering your school';
          } else {
            tooltip += '\n\n❌ This recruit signed with another school';
          }
        } else {
          // Not signed yet - normal considering logic
          if (currentSchoolStatus === 'only') {
            consideringCell.classList.add('considering-school-only');
            tooltip += '\n\n✓ Your school is the ONLY school this recruit is considering';
          } else if (currentSchoolStatus === 'included') {
            consideringCell.classList.add('considering-school-included');
            tooltip += '\n\n⚠ Your school is among the schools this recruit is considering';
          }
        }
      }
      consideringCell.title = tooltip;
      
      addCell(consideringCell);

      // Add row to table
      elements.recruitsList.appendChild(row);
    });
  }
  
  // Update pagination display
  updatePaginationDisplay(totalItems, totalPages, startIndex, endIndex);
  
  // Update table headers to show sort indicators
  updateTableHeaders();
}

// Change page for pagination
function changePage(direction) {
  // Don't paginate if showing all results
  if (state.showAllResults) {
    return;
  }
  
  const totalPages = Math.ceil(state.filteredRecruits.length / state.itemsPerPage);
  const newPage = state.currentPage + direction;
    // Validate new page number
  if (newPage >= 1 && newPage <= totalPages) {
    state.currentPage = newPage;
    updateRecruitsList().catch(err => console.error('Error updating recruits list:', err));
  }
}

// Handle page size changes
async function handlePageSizeChange() {
  const selectedValue = elements.pageSizeSelect.value;
  
  try {
    if (selectedValue === 'all') {
      state.showAllResults = true;
      state.itemsPerPage = state.filteredRecruits.length || 1; // Avoid division by zero
    } else {
      state.showAllResults = false;
      state.itemsPerPage = parseInt(selectedValue, 10);
      
      // Validate the parsed value
      if (isNaN(state.itemsPerPage) || state.itemsPerPage <= 0) {
        console.warn('Invalid page size selected, using default');
        state.itemsPerPage = DEFAULT_PAGE_SIZE;
      }
    }
    
    // Save user preference
    await savePageSizePreference(selectedValue);
      // Reset to first page when changing page size
    state.currentPage = 1;
    
    // Update the display
    updateRecruitsList().catch(err => console.error('Error updating recruits list:', err));
    
    console.log(`Page size changed to: ${selectedValue} (${state.itemsPerPage} items)`);
    
  } catch (error) {
    console.error('Error handling page size change:', error);
    setStatusMessage(`Error changing page size: ${error.message}`, 'error');
      // Reset to default on error
    state.itemsPerPage = DEFAULT_PAGE_SIZE;
    state.showAllResults = false;
    elements.pageSizeSelect.value = DEFAULT_PAGE_SIZE.toString();
    updateRecruitsList().catch(err => console.error('Error updating recruits list:', err));
  }
}

// Function to save page size preference
async function savePageSizePreference(pageSize) {
  try {
    await sendMessageToBackground({
      action: 'saveConfig',
      key: PAGE_SIZE_STORAGE_KEY,
      value: pageSize
    });
  } catch (error) {
    console.warn('Could not save page size preference:', error);
    // Non-critical error, continue operation
  }
}

// Function to load page size preference
async function loadPageSizePreference() {
  try {
    const response = await sendMessageToBackground({
      action: 'getConfig',
      key: PAGE_SIZE_STORAGE_KEY
    });
    
    if (response && response.value) {
      const savedPageSize = response.value;
      
      // Set the select element value
      if (elements.pageSizeSelect) {
        elements.pageSizeSelect.value = savedPageSize;
      }
      
      // Update state based on saved preference
      if (savedPageSize === 'all') {
        state.showAllResults = true;
        state.itemsPerPage = state.filteredRecruits.length || DEFAULT_PAGE_SIZE;
      } else {
        state.showAllResults = false;
        const parsedSize = parseInt(savedPageSize, 10);
        state.itemsPerPage = isNaN(parsedSize) ? DEFAULT_PAGE_SIZE : parsedSize;
      }
      
      console.log(`Loaded page size preference: ${savedPageSize}`);
    } else {
      // No saved preference, use default
      state.itemsPerPage = DEFAULT_PAGE_SIZE;
      state.showAllResults = false;
      if (elements.pageSizeSelect) {
        elements.pageSizeSelect.value = DEFAULT_PAGE_SIZE.toString();
      }
    }
  } catch (error) {
    console.warn('Could not load page size preference, using default:', error);
    state.itemsPerPage = DEFAULT_PAGE_SIZE;
    state.showAllResults = false;
  }
}

// Function to update pagination display
function updatePaginationDisplay(totalItems, totalPages, startIndex, endIndex) {
  if (!elements.pageInfo || !elements.prevPageBtn || !elements.nextPageBtn) return;

  if (state.showAllResults) {
    // Show all results mode
    elements.pageInfo.innerHTML = `
      <span class="results-summary">Showing all ${totalItems} results</span>
    `;
    elements.prevPageBtn.disabled = true;
    elements.nextPageBtn.disabled = true;
    elements.prevPageBtn.style.display = 'none';
    elements.nextPageBtn.style.display = 'none';
  } else {
    // Paginated mode
    const displayStart = totalItems === 0 ? 0 : startIndex + 1;
    const displayEnd = Math.min(endIndex, totalItems);
    
    elements.pageInfo.innerHTML = `
      <span class="results-summary">Showing ${displayStart}-${displayEnd} of ${totalItems}</span>
      <span>Page ${state.currentPage} of ${totalPages || 1}</span>
    `;
    
    elements.prevPageBtn.disabled = state.currentPage <= 1;
    elements.nextPageBtn.disabled = state.currentPage >= totalPages;
    elements.prevPageBtn.style.display = '';
    elements.nextPageBtn.style.display = '';
  }
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

// Populate priority filter
function populatePriorityFilter() {
  if (!elements.filterPriority) return;

  // Clear current options
  elements.filterPriority.innerHTML = '';

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Any Priority';
  elements.filterPriority.appendChild(defaultOption);

  // Add priority options
  const priorityLabels = {
    '0': 'Unprioritized',
    '1': '1st',
    '2': '2nd',
    '3': '3rd',
    '4': '4th',
    '5': '5th'
  };
  
  // Create options for 0-5
  for (let i = 0; i <= 5; i++) {
    const option = document.createElement('option');
    option.value = i.toString();
    option.textContent = priorityLabels[i];
    elements.filterPriority.appendChild(option);
  }
}

// Populate distance filter
function populateDistanceFilter() {
  if (!elements.filterDistance) return;

  // Clear current options
  elements.filterDistance.innerHTML = '';

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Any Distance';
  elements.filterDistance.appendChild(defaultOption);

  // Add distance options
  const distances = ['< 180 miles', '< 360 miles', '< 1400 miles'];
  distances.forEach(distance => {
    const option = document.createElement('option');
    option.value = distance;
    option.textContent = distance;
    elements.filterDistance.appendChild(option);
  });
}

// Populate signed filter
function populateSignedFilter() {
  if (!elements.filterSigned) return;

  // Clear current options
  elements.filterSigned.innerHTML = '';

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Any Signed Status';
  elements.filterSigned.appendChild(defaultOption);

  // Add signed options
  const signedOptions = ['No', 'Yes'];
  signedOptions.forEach(signedOption => {
    const option = document.createElement('option');
    option.value = signedOption;
    option.textContent = signedOption;
    elements.filterSigned.appendChild(option);
  });
}

// Unified sorting function
function applySorting() {
  if (!state.sorting.column) return;
    state.filteredRecruits.sort((a, b) => {
    const getValue = (recruit, col) => {
      switch (col) {case 'name': return recruit.name ? recruit.name.toLowerCase() : '';
        case 'pos': return recruit.pos || '';
        case 'watched': return recruit.watched || 0;
        case 'potential': return recruit.potential || '';
        case 'priority': return recruit.priority || 0;
        case 'height': return recruit.height || '';
        case 'weight': return recruit.weight || 0;
        case 'rating': return recruit.rating || 0;
        case 'rank': return recruit.rank === 999 ? 999 : (recruit.rank || 999);
        case 'hometown': return recruit.hometown ? recruit.hometown.toLowerCase() : '';
        case 'division': return recruit.division || '';
        case 'miles': return recruit.miles || 0;
        case 'signed': return recruit.signed || 0;
        case 'gpa': return recruit.gpa || 0;
        case 'ath': return recruit.ath || 0;
        case 'spd': return recruit.spd || 0;
        case 'dur': return recruit.dur || 0;
        case 'we': return recruit.we || 0;
        case 'sta': return recruit.sta || 0;
        case 'str': return recruit.str || 0;
        case 'blk': return recruit.blk || 0;
        case 'tkl': return recruit.tkl || 0;
        case 'han': return recruit.han || 0;
        case 'gi': return recruit.gi || 0;
        case 'elu': return recruit.elu || 0;
        case 'tec': return recruit.tec || 0;
        case 'r1': return recruit.r1 || 0;
        case 'r2': return recruit.r2 || 0;
        case 'r3': return recruit.r3 || 0;
        case 'r4': return recruit.r4 || 0;
        case 'r5': return recruit.r5 || 0;
        case 'r6': return recruit.r6 || 0;
        case 'considering': return recruit.considering ? recruit.considering.toLowerCase() : '';
        default: return '';
      }
    };

    const aValue = getValue(a, state.sorting.column);
    const bValue = getValue(b, state.sorting.column);

    // Handle numeric vs string comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const result = state.sorting.direction === 'asc' ? aValue - bValue : bValue - aValue;
      if (Math.random() < 0.01) { // Log 1% of numeric comparisons
        console.log(`Numeric comparison: ${aValue} vs ${bValue}, direction: ${state.sorting.direction}, result: ${result}`);
      }
      return result;
    } else {
      const aStr = aValue.toString();
      const bStr = bValue.toString();
      if (state.sorting.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    }
  });
}

// Sorting functionality
function sortRecruits(column) {
  // Toggle sorting direction if clicking the same column
  if (state.sorting.column === column) {
    state.sorting.direction = state.sorting.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.sorting.column = column;
    state.sorting.direction = 'asc';
  }

  // Apply the sorting
  applySorting();
  // Reset to first page after sorting
  state.currentPage = 1;

  // Update the display
  updateRecruitsList().catch(err => console.error('Error updating recruits list:', err));
  updateTableHeaders();
}

// Update table headers to show sort indicators
function updateTableHeaders() {
  const headers = document.querySelectorAll('#recruits-table thead th');

  headers.forEach((header, index) => {
    // Remove existing sort classes
    header.classList.remove('sort-asc', 'sort-desc');

    const column = COLUMNS[index];
    if (!column) return;

    // Add sort class if this is the active sort column
    if (state.sorting.column === column.key) {
      header.classList.add(`sort-${state.sorting.direction}`);
    }
  });
}

// Make headers clickable for sorting
function setupTableSorting() {
  const headers = document.querySelectorAll('#recruits-table thead th');

  headers.forEach((header, index) => {
    const column = COLUMNS[index];
    if (!column) return;
    
    // Skip if already set up (prevent duplicate event listeners)
    if (header.dataset.sortingSetup === 'true') return;

    // Make header clickable for all sortable columns
    if (column.sortable) {
      header.style.cursor = 'pointer';
      header.style.userSelect = 'none';
      header.addEventListener('click', () => sortRecruits(column.key));
    }
    
    // Mark as set up
    header.dataset.sortingSetup = 'true';
  });
}

// Enhanced status display with progress indicator for scraping operations
function setScrapingStatus(message, showProgress = true) {
  if (!elements.statusMessage) return;
  
  // Create or update progress overlay
  let overlay = document.getElementById('scraping-overlay');
  if (showProgress && !overlay) {
    overlay = createScrapingOverlay();
    document.body.appendChild(overlay);
  }
  
  if (overlay) {
    const messageEl = overlay.querySelector('.scraping-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }
  
  // Also update the regular status message
  setStatusMessage(message, 'info');
}

// Create scraping overlay with spinner and progress feedback
function createScrapingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'scraping-overlay';
  overlay.innerHTML = `
    <div class="scraping-content">
      <div class="spinner"></div>
      <div class="scraping-message">Initializing scraping process...</div>
      <div class="scraping-details">
        <small>A background tab is processing recruit data. This may take a moment.</small>
      </div>
    </div>
  `;
  
  // Add styles if not already present
  if (!document.getElementById('scraping-overlay-styles')) {
    const style = document.createElement('style');
    style.id = 'scraping-overlay-styles';
    style.textContent = `
      #scraping-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        color: white;
      }

      .scraping-content {
        text-align: center;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid #fff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .scraping-message {
        font-size: 1.2rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
      }

      .scraping-details {
        opacity: 0.8;
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(style);
  }
  
  return overlay;
}

// Hide scraping overlay
function hideScrapingOverlay() {
  const overlay = document.getElementById('scraping-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Handle scrape recruits action with support for refresh mode
async function handleScrapeRecruits(options = {}) {
  const isRefreshOnly = options.isRefreshOnly || false;
  const fieldsToUpdate = options.fieldsToUpdate || [];
  
  // Set appropriate status message based on mode
  if (isRefreshOnly) {
    setStatusMessage('Preparing to refresh recruit data...');
  } else {
    setStatusMessage('Preparing to fetch recruit data...');
  }

  try {
    // Check if the user is logged in first
    const loginCheck = await sendMessageToBackground({
      action: 'checkLogin'
    });

    if (!loginCheck.loggedIn) {
      setStatusMessage('Error: Not authenticated. Please log in to WhatifsIports.com in another tab first.', 'error');
      return;
    }

    // If this is a refresh, we don't need to do season initialization steps
    if (!isRefreshOnly) {
      // Check if this is an initialization or a new season
      const stats = await sendMessageToBackground({ action: 'getStats' });
      const recruitCount = stats.recruitCount || 0;
      const hasSeason = stats.currentSeason !== null && stats.currentSeason !== undefined;
      const isNewSeason = recruitCount > 0 || hasSeason;

      // If this is a new season, confirm with the user
      if (isNewSeason) {
        const confirmed = confirm(
          "You are about to initialize a new season. This will delete all existing recruit data. Are you sure you want to proceed?"
        );

        if (!confirmed) {
          setStatusMessage('New season initialization cancelled');
          return;
        }

        // Clear all data
        setStatusMessage('Clearing existing data...');
        await sendMessageToBackground({ action: 'clearAllData' });

        // Reset local state
        state.currentSeason = null;

        // Disable watchlist buttons immediately
        if (elements.btnUpdateWatchlist) {
          elements.btnUpdateWatchlist.disabled = true;
        }

        if (elements.btnUpdateConsidering) {
          elements.btnUpdateConsidering.disabled = true;
        }

        // Update the UI to reflect cleared data
        if (elements.currentSeason) {
          elements.currentSeason.textContent = 'N/A';
        }

        if (elements.lastUpdated) {
          elements.lastUpdated.textContent = 'Never';
        }

        if (elements.recruitCount) {
          elements.recruitCount.textContent = '0';
        }

        if (elements.watchlistCount) {
          elements.watchlistCount.textContent = '0';
        }
      }      // Now proceed with season initialization (for both new season and first-time init)
      let seasonNumber = null;
      let selectedDivisions = [];

      try {
        const modalResult = await showSeasonInputModal();
        seasonNumber = modalResult.seasonNumber;
        selectedDivisions = modalResult.selectedDivisions || [];
        console.log('Season number from modal:', seasonNumber);
        console.log('Selected divisions from modal:', selectedDivisions);

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
      }      // Send request to background script to fetch and scrape recruits
      setScrapingStatus('Opening recruit page in background...');
      console.log('Sending fetchAndScrapeRecruits with seasonNumber:', seasonNumber, 'and selectedDivisions:', selectedDivisions);
      const result = await sendMessageToBackground({
        action: 'fetchAndScrapeRecruits',
        seasonNumber: seasonNumber,
        selectedDivisions: selectedDivisions
      });

      if (!result.success) {
        console.error('Error in fetch and scrape process:', result.error);
        throw new Error(result.error || 'Unknown error occurred');
      }    } else {
      // This is just a refresh of existing data
      setScrapingStatus('Refreshing recruit data for specific fields...');
      const result = await sendMessageToBackground({
        action: 'fetchAndScrapeRecruits',
        isRefreshOnly: true,
        fieldsToUpdate: fieldsToUpdate
      });

      if (!result.success) {
        console.error('Error in refresh process:', result.error);
        throw new Error(result.error || 'Unknown error occurred');
      }
    }    setScrapingStatus(isRefreshOnly ? 
      'Processing recruit data in background tab...' :
      'Processing recruit data in background tab...');

    // Set up a listener for the scraped data
    const handleScrapeComplete = (message) => {
      if (message.action === 'scrapeComplete') {
        // Remove this listener and hide overlay
        chrome.runtime.onMessage.removeListener(handleScrapeComplete);
        hideScrapingOverlay();

        // Reload data
        loadData().then(() => {
          // Make sure to update the dashboard stats to reflect the new season
          updateDashboardStats();
          updateButtonState();

          // Show success message with recruit count
          // Get the actual recruit count from state.recruits which was updated by loadData()
          if (isRefreshOnly) {
            setStatusMessage(`Refresh completed successfully for ${state.recruits.length} recruits`, 'success');
          } else if (state.currentSeason) {
            setStatusMessage(`Scrape completed successfully with ${state.recruits.length} recruits for Season ${state.currentSeason}`, 'success');
          } else {
            setStatusMessage(`Scrape completed successfully with ${state.recruits.length} recruits`, 'success');
          }
        });
      }
    };

    // Add the listener
    chrome.runtime.onMessage.addListener(handleScrapeComplete);    // Set a timeout to remove the listener if no response within 2 minutes
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(handleScrapeComplete);
      hideScrapingOverlay();
      setStatusMessage('Scraping timed out. Please try again.', 'warning');
    }, 120000); // 2 minutes
  } catch (error) {
    hideScrapingOverlay();
    console.error('Error scraping recruits:', error);

    // Check for common error types and provide better messages
    if (error.message.includes('403')) {
      setStatusMessage('Error: Not authenticated. Please log in to WhatifsIports.com in another tab first.', 'error');
    } else if (error.message.includes('Failed to fetch')) {
      setStatusMessage('Error connecting to WhatifsIports.com. Check your internet connection and login status.', 'error');
    } else {
      setStatusMessage('Error scraping recruits: ' + error.message, 'error');
    }
  }
}

// Handle refresh recruit data action
async function handleUpdateConsidering() {
  setStatusMessage('Starting recruit data refresh...');

  try {
    // Call the scrape recruits function but with a special parameter
    // to indicate we're only updating existing recruits
    await handleScrapeRecruits({
      isRefreshOnly: true,
      fieldsToUpdate: ['watched', 'potential', 'priority', 'signed', 'considering']
    });
  } catch (error) {
    console.error('Error refreshing recruit data:', error);
    setStatusMessage('Error refreshing recruit data: ' + error.message, 'error');
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
  // Check if import functionality is disabled
  const importBtn = document.getElementById('btn-import-data');
  if (importBtn && importBtn.disabled) {
    setStatusMessage('Import functionality is not yet implemented', 'warning');
    return;
  }

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

// Handle clear data action with enhanced error handling
async function handleClearData() {
  if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    return;
  }

  setStatusMessage('Clearing all data...');

  try {
    // Clear data with enhanced error handling
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
      setStatusMessage(`Data cleared with warnings: ${result.warning}`, 'warning');
    } else {
      setStatusMessage('All data cleared successfully', 'success');
    }

    // Reset local state for season
    state.currentSeason = null;

    // Reload data regardless of warnings
    await loadData();
    updateDashboardStats();
    await updateButtonState();

    // If there were no warnings, show a more positive message
    if (!result.warning) {
      setStatusMessage('All data and season information cleared successfully', 'success');
    }

  } catch (error) {
    console.error('Error clearing data:', error);
    
    // Enhanced error message handling
    let errorMessage;
    let errorType = 'error';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = 'Unknown error occurred';
    }

    // Provide user-friendly suggestions based on error type
    if (errorMessage.includes('connection')) {
      errorMessage += '\n\nTry refreshing the extension or restarting your browser.';
    } else if (errorMessage.includes('timeout')) {
      errorMessage += '\n\nThe operation may still be processing. Wait a moment and try again.';
    } else if (errorMessage.includes('transaction')) {
      errorMessage += '\n\nTry using the "Check Database" button to diagnose the issue.';
    }

    setStatusMessage('Error clearing data: ' + errorMessage, errorType);
  }
}

// Handle edit role ratings action
async function handleEditRoleRatings() {
  try {
    setStatusMessage('Loading role ratings configuration...');
    await showRoleRatingsModal();
  } catch (error) {
    console.error('Error opening role ratings editor:', error);
    setStatusMessage('Error loading role ratings: ' + error.message, 'error');
  }
}

// Handle check database action
async function handleCheckDatabase() {
  setStatusMessage('Checking database status...', 'info');

  try {
    // Request diagnostic data from background script
    const diagnosticResult = await sendMessageToBackground({
      action: 'checkDatabaseStatus'
    });

    // Display diagnostic information
    if (diagnosticResult && diagnosticResult.success) {
      const dbInfo = diagnosticResult.dbInfo;
      const message = `
Database name: ${dbInfo.name || 'Unknown'}
Database version: ${dbInfo.version || 'Unknown'}
Object stores: ${dbInfo.objectStores ? dbInfo.objectStores.join(', ') : 'None'}
Recruit count: ${dbInfo.recruitCount || 0}
Last error: ${dbInfo.lastError || 'None'}
IndexedDB supported: ${dbInfo.idbDetails ? dbInfo.idbDetails.supported : 'Unknown'}
      `;

      // Create a modal to display the information
      showDiagnosticModal('Database Diagnostic Results', message);

      setStatusMessage('Database check completed successfully', 'success');
    } else {
      const errorMsg = diagnosticResult?.error || 'Unknown error checking database';
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Error checking database:', error);
    let errorMessage = 'Error checking database: ';
    
    if (error.message.includes('timeout')) {
      errorMessage += 'Database check timed out. The database may be busy or locked.';
    } else if (error.message.includes('port closed')) {
      errorMessage += 'Connection to background script was lost. Try reloading the extension.';
    } else {
      errorMessage += error.message;
       }
    
    setStatusMessage(errorMessage, 'error');
    
    // Show basic diagnostic modal even on error
    showDiagnosticModal('Database Check Error', `
Error: ${error.message}

Possible solutions:
- Reload the extension
- Check if the browser has enough memory
- Try clearing browser cache
- Restart the browser if issues persist
    `);
  }
}

// Function to initialize division checkboxes based on current team division
async function initializeDivisionCheckboxes() {
  try {
    // Get current team info
    const stats = await sendMessageToBackground({ action: 'getStats' });
    const currentDivision = stats?.teamInfo?.division;
    
    console.log('Initializing division checkboxes, current division:', currentDivision);

    // Division mapping: checkbox ID -> {division name, value, element}
    const divisionMapping = {
      'division-d1a': { division: 'D-IA', value: '1' },
      'division-d1aa': { division: 'D-IAA', value: '2' },
      'division-d2': { division: 'D-II', value: '3' },
      'division-d3': { division: 'D-III', value: '4' }
    };

    // Reset all checkboxes and containers
    Object.keys(divisionMapping).forEach(checkboxId => {
      const checkbox = document.getElementById(checkboxId);
      const container = checkbox?.closest('.division-checkbox-item');
      
      if (checkbox && container) {
        // Reset checkbox state
        checkbox.checked = false;
        checkbox.disabled = false;
        
        // Reset container styling
        container.classList.remove('required');
        
        // Reset checkbox label styling
        const labelText = container.querySelector('.checkbox-label-text');
        if (labelText) {
          labelText.style.color = '';
          labelText.style.fontWeight = '';
        }
      }
    });

    // Find and configure the current school's division
    if (currentDivision) {
      const currentDivisionEntry = Object.entries(divisionMapping).find(
        ([, config]) => config.division === currentDivision
      );

      if (currentDivisionEntry) {
        const [checkboxId, config] = currentDivisionEntry;
        const checkbox = document.getElementById(checkboxId);
        const container = checkbox?.closest('.division-checkbox-item');

        if (checkbox && container) {
          // Check and disable the current school's division
          checkbox.checked = true;
          checkbox.disabled = true;
          
          // Add visual styling to indicate it's required
          container.classList.add('required');
          
          console.log(`Auto-selected and disabled ${config.division} (current school's division)`);
        }
      } else {
        console.warn('Unknown division format:', currentDivision);
      }
    } else {
      console.warn('No current division found in team info');
    }

  } catch (error) {
    console.error('Error initializing division checkboxes:', error);
    // If there's an error, don't prevent the modal from showing
    // Just log the error and continue
  }
}

// Function to show the season input modal
function showSeasonInputModal() {  return new Promise(async (resolve, reject) => {
    const modal = document.getElementById('season-modal');
    const closeBtn = document.getElementById('season-modal-close');
    const confirmBtn = document.getElementById('season-confirm');
    const cancelBtn = document.getElementById('season-cancel');
    const seasonInput = document.getElementById('season-number');
    const errorText = document.getElementById('season-input-error');

    // Clear previous errors and reset input
    errorText.textContent = '';
    seasonInput.value = '1';

    // Initialize division checkboxes based on current team division
    await initializeDivisionCheckboxes();

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
    };    // Handle confirm button click
    confirmBtn.onclick = () => {
      const seasonNumber = parseInt(seasonInput.value);
      console.log('Confirm button clicked, parsed season number:', seasonNumber, 'from input value:', seasonInput.value);

      if (!seasonNumber || seasonNumber < 1 || !Number.isInteger(seasonNumber)) {
        errorText.textContent = 'Please enter a valid season number (positive integer)';
        return;
      }

      // Collect selected divisions
      const selectedDivisions = [];
      const divisionCheckboxes = [
        { element: document.getElementById('division-d1a'), value: '1' },
        { element: document.getElementById('division-d1aa'), value: '2' },
        { element: document.getElementById('division-d2'), value: '3' },
        { element: document.getElementById('division-d3'), value: '4' }
      ];

      divisionCheckboxes.forEach(({ element, value }) => {
        if (element && element.checked) {
          selectedDivisions.push(value);
        }
      });

      if (selectedDivisions.length === 0) {
        errorText.textContent = 'Please select at least one division';
        return;
      }

      modal.style.display = 'none';
      resolve({
        seasonNumber,
        selectedDivisions
      });
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
        recruitCount > 0 ? "Initialize New Season" : "Initialize Season";
    }

    // Enable/disable Update Considering button
    if (elements.btnUpdateConsidering) {
      elements.btnUpdateConsidering.disabled = recruitCount === 0;
    }
  } catch (error) {
    console.error('Error updating button state:', error);
  }
}

// Enhanced UI Data Refresh System
let isRefreshing = false;
let lastDataUpdateTimestamp = 0;

// Function to handle automatic UI refresh when data is updated
async function handleDataUpdate(updateInfo) {
  try {
    // Prevent overlapping refreshes
    if (isRefreshing) {
      console.log('Refresh already in progress, skipping');
      return;
    }
    
    // Avoid duplicate refreshes for the same update
    if (updateInfo.timestamp && updateInfo.timestamp <= lastDataUpdateTimestamp) {
      console.log('Update already processed, skipping');
      return;
    }
    
    console.log('Handling data update:', updateInfo.updateType);
    isRefreshing = true;
    lastDataUpdateTimestamp = updateInfo.timestamp || Date.now();
    
    // Show brief status message
    setStatusMessage(`Data updated: ${updateInfo.updateType}`, 'success');
    
    // Refresh the UI data
    await loadData();
    updateDashboardStats();
    
    // Update recruits list if on recruits tab
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'recruits') {
      updateRecruitsList();
    }
    
    console.log('UI refresh completed for:', updateInfo.updateType);
    
  } catch (error) {
    console.error('Error during UI refresh:', error);
    setStatusMessage('Error refreshing UI data', 'error');
  } finally {
    isRefreshing = false;
  }
}

// Function to manually refresh all data with user feedback
async function refreshAllData() {
  try {
    if (isRefreshing) {
      setStatusMessage('Refresh already in progress...', 'warning');
      return;
    }
    
    isRefreshing = true;
    setStatusMessage('Refreshing data...', 'info');
    
    // Refresh all data
    await loadData();
    updateDashboardStats();
    await updateButtonState();
    
    // Update current tab display
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'recruits') {
      updateRecruitsList();
      setupTableSorting();
    }
    
    setStatusMessage('Data refreshed successfully', 'success');
    
  } catch (error) {
    console.error('Error during manual refresh:', error);
    setStatusMessage('Error refreshing data', 'error');
  } finally {
    isRefreshing = false;
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

// Make setStatusMessage globally available for error-handler.js
window.setStatusMessage = setStatusMessage;

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

// Role Ratings Configuration Functions

/**
 * Show role ratings configuration modal
 */
async function showRoleRatingsModal() {
  try {
    // Load current role ratings data
    const response = await sendMessageToBackground({ action: 'getRoleRatings' });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to load role ratings');
    }

    state.roleRatings.data = response.ratings;
    state.roleRatings.hasChanges = false;
    state.roleRatings.activeRoles = {};

    // Setup position tabs and content
    setupPositionTabs();
    
    // Show modal
    if (elements.roleRatingsModal) {
      elements.roleRatingsModal.classList.remove('hidden');
    }

    // Select first position by default
    const firstTab = elements.positionTabs?.querySelector('.position-tab');
    if (firstTab) {
      firstTab.click();
    }

    setStatusMessage('Role ratings configuration loaded', 'success');

  } catch (error) {
    console.error('Error showing role ratings modal:', error);
    setStatusMessage('Error loading role ratings: ' + error.message, 'error');
  }
}

/**
 * Close role ratings modal with change confirmation
 */
function closeRoleRatingsModal() {
  if (state.roleRatings.hasChanges) {
    if (!confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
      return;
    }
  }

  if (elements.roleRatingsModal) {
    elements.roleRatingsModal.classList.add('hidden');
  }

  // Reset state
  state.roleRatings.data = null;
  state.roleRatings.currentPosition = null;
  state.roleRatings.activeRoles = {};
  state.roleRatings.hasChanges = false;
}

/**
 * Setup position tabs for the role ratings modal
 */
function setupPositionTabs() {
  if (!elements.positionTabs || !state.roleRatings.data) return;

  // Clear existing tabs
  elements.positionTabs.innerHTML = '';

  // Create tabs for each position
  for (const [positionKey, positionData] of Object.entries(state.roleRatings.data)) {
    // Skip positions with no active roles
    const hasActiveRoles = Object.values(positionData).some(role => role.isActive);
    if (!hasActiveRoles) continue;

    const tab = document.createElement('div');
    tab.className = 'position-tab';
    tab.textContent = getPositionDisplayName(positionKey);
    tab.dataset.position = positionKey;
    
    tab.addEventListener('click', () => {
      selectPosition(positionKey);
    });

    elements.positionTabs.appendChild(tab);
  }
}

/**
 * Select a position and update the content area
 */
function selectPosition(positionKey) {
  if (!state.roleRatings.data || !state.roleRatings.data[positionKey]) return;

  // Update active tab
  const tabs = elements.positionTabs?.querySelectorAll('.position-tab');
  tabs?.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.position === positionKey);
  });

  // Update current position
  state.roleRatings.currentPosition = positionKey;

  // Generate content for this position
  generatePositionContent(positionKey);
}

/**
 * Generate content for a specific position
 */
function generatePositionContent(positionKey) {
  if (!elements.positionContent || !state.roleRatings.data[positionKey]) return;

  const positionData = state.roleRatings.data[positionKey];
  const activeRoles = Object.entries(positionData).filter(([, roleData]) => roleData.isActive);

  let html = `
    <div class="position-header">
      <h3>${getPositionDisplayName(positionKey)} Roles</h3>
      <p>Configure attribute weights for each role. Values must total 100 for each role.</p>
    </div>
    <div class="roles-grid">
  `;

  // Create role cards
  activeRoles.forEach(([roleKey, roleData]) => {
    const roleId = `${positionKey}.${roleKey}`;
    const total = calculateRoleTotal(roleData.attributes);
    const isValid = Math.abs(total - 100) < 0.1;

    html += `
      <div class="role-card ${isValid ? 'valid' : 'invalid'}" data-role="${roleId}">
        <div class="role-header">
          <h4>${roleData.roleLabel}</h4>
          <div class="role-total ${isValid ? 'valid' : 'invalid'}">
            Total: <span class="total-value">${total.toFixed(1)}</span>
          </div>
        </div>
        <div class="attribute-inputs">
          ${generateAttributeInputs(roleId, roleData.attributes)}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  elements.positionContent.innerHTML = html;

  // Add event listeners to the inputs
  addAttributeInputListeners();
}

/**
 * Generate HTML for attribute inputs
 */
function generateAttributeInputs(roleId, attributes) {
  const attributeLabels = {
    'ath': 'Ath',
    'spd': 'Spd',
    'dur': 'Dur',
    'we': 'WE',
    'sta': 'Sta',
    'str': 'Str',
    'blk': 'Blk',
    'tkl': 'Tkl',
    'han': 'Han',
    'gi': 'GI',
    'elu': 'Elu',
    'tec': 'Tec'
  };

  let html = '';
  
  Object.entries(attributes).forEach(([attr, value]) => {
    if (attr === 'total') return; // Skip total if present

    const numValue = Number(value) || 0;
    const validationClass = numValue > 80 ? 'high' : numValue > 40 ? 'medium' : 'low';
    
    html += `
      <div class="attribute-input-group">
        <label for="${roleId}-${attr}">${attributeLabels[attr] || attr.toUpperCase()}</label>        <input 
          type="number" 
          id="${roleId}-${attr}" 
          class="attribute-input ${validationClass}" 
          min="0" 
          max="100" 
          step="1" 
          value="${numValue}"
          data-role="${roleId}"
          data-attribute="${attr}"
        />
      </div>
    `;
  });

  return html;
}

/**
 * Add event listeners to attribute inputs
 */
function addAttributeInputListeners() {
  const inputs = elements.positionContent?.querySelectorAll('.attribute-input');
  
  inputs?.forEach(input => {
    input.addEventListener('input', handleAttributeChange);
    input.addEventListener('blur', validateAttributeInput);
  });
}

/**
 * Handle attribute value changes
 */
function handleAttributeChange(event) {
  const input = event.target;
  const roleId = input.dataset.role;
  const attribute = input.dataset.attribute;
  const newValue = Number(input.value) || 0;

  // Update the data
  const [positionKey, roleKey] = roleId.split('.');
  if (state.roleRatings.data[positionKey] && state.roleRatings.data[positionKey][roleKey]) {
    state.roleRatings.data[positionKey][roleKey].attributes[attribute] = newValue;
    state.roleRatings.hasChanges = true;

    // Update visual styling based on value
    input.className = input.className.replace(/\b(high|medium|low)\b/, '');
    const validationClass = newValue > 80 ? 'high' : newValue > 40 ? 'medium' : 'low';
    input.classList.add(validationClass);

    // Update role total and validation
    updateRoleCardValidation(roleId);
  }
}

/**
 * Validate attribute input values
 */
function validateAttributeInput(event) {
  const input = event.target;
  let value = Number(input.value);
  
  // Clamp value between 0 and 100
  if (value < 0) value = 0;
  if (value > 100) value = 100;
  
  // Ensure whole numbers only
  value = Math.round(value);
  input.value = value;
  
  // Trigger change event to update data
  input.dispatchEvent(new Event('input'));
}

/**
 * Update role card validation styling and total
 */
function updateRoleCardValidation(roleId) {
  const [positionKey, roleKey] = roleId.split('.');
  const roleData = state.roleRatings.data[positionKey]?.[roleKey];
  
  if (!roleData) return;

  const card = elements.positionContent?.querySelector(`[data-role="${roleId}"]`);
  const totalElement = card?.querySelector('.total-value');
  
  if (!card || !totalElement) return;

  const total = calculateRoleTotal(roleData.attributes);
  const isValid = Math.abs(total - 100) < 0.1;

  // Update total display
  totalElement.textContent = total.toFixed(1);

  // Update validation classes
  card.classList.toggle('valid', isValid);
  card.classList.toggle('invalid', !isValid);
  
  const totalContainer = card.querySelector('.role-total');
  totalContainer?.classList.toggle('valid', isValid);
  totalContainer?.classList.toggle('invalid', !isValid);

  // Update save button state
  updateSaveButtonState();
}

/**
 * Calculate total for role attributes
 */
function calculateRoleTotal(attributes) {
  return Object.entries(attributes).reduce((sum, [attr, value]) => {
    if (attr === 'total') return sum; // Skip total if present
    const numVal = Number(value);
    return sum + (isNaN(numVal) ? 0 : numVal);
  }, 0);
}

/**
 * Update save button state based on all role validations
 */
function updateSaveButtonState() {
  if (!elements.roleRatingsSave || !state.roleRatings.data) return;

  let allValid = true;
  
  // Check all active roles
  for (const [positionKey, positionData] of Object.entries(state.roleRatings.data)) {
    for (const [roleKey, roleData] of Object.entries(positionData)) {
      if (roleData.isActive) {
        const total = calculateRoleTotal(roleData.attributes);
        if (Math.abs(total - 100) > 0.1) {
          allValid = false;
          break;
        }
      }
    }
    if (!allValid) break;
  }

  elements.roleRatingsSave.disabled = !allValid;
  elements.roleRatingsSave.classList.toggle('disabled', !allValid);
}

/**
 * Get display name for position key
 */
function getPositionDisplayName(positionKey) {
  const displayNames = {
    'quarterback': 'QB',
    'runningBack': 'RB',
    'wideReceiver': 'WR',
    'tightEnd': 'TE',
    'offensiveLine': 'OL',
    'defensiveLine': 'DL',
    'linebacker': 'LB',
    'defensiveBack': 'DB',
    'kicker': 'K',
    'punter': 'P'
  };
  return displayNames[positionKey] || positionKey;
}

/**
 * Handle reset current position to defaults
 */
async function handleResetCurrentPosition() {
  if (!state.roleRatings.currentPosition) {
    setStatusMessage('No position selected', 'error');
    return;
  }

  if (!confirm('Are you sure you want to reset all roles in this position to default values?')) {
    return;
  }

  try {
    setStatusMessage('Resetting position to defaults...');

    // Get the original default data
    const response = await fetch(chrome.runtime.getURL('data/role_ratings_defaults.json'));
    if (!response.ok) {
      throw new Error('Failed to load default role ratings');
    }

    const defaultData = await response.json();
    const defaultPositionData = defaultData.roleRatings[state.roleRatings.currentPosition];

    if (!defaultPositionData) {
      throw new Error('Default position data not found');
    }

    // Update the position data with defaults
    state.roleRatings.data[state.roleRatings.currentPosition] = JSON.parse(JSON.stringify(defaultPositionData));
    state.roleRatings.hasChanges = true;

    // Regenerate the position content
    generatePositionContent(state.roleRatings.currentPosition);
    addAttributeInputListeners();

    setStatusMessage('Position reset to default values', 'success');

  } catch (error) {
    console.error('Error resetting position:', error);
    setStatusMessage('Error resetting position: ' + error.message, 'error');
  }
}

// Function removed - replaced by position-based validation system

// Function removed - replaced by generateAttributeInputs() in position-based design

// Function removed - replaced by handleResetCurrentPosition() for position-based design

/**
 * Handle recalculate all ratings
 */
async function handleRecalculateAllRatings() {
  if (!confirm('This will recalculate role ratings for all recruits using current settings. This may take a moment. Continue?')) {
    return;
  }

  try {
    setStatusMessage('Recalculating all role ratings...');

    const response = await sendMessageToBackground({ 
      action: 'recalculateRoleRatings'
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to recalculate ratings');
    }

    setStatusMessage(
      `Successfully recalculated ratings for ${response.recalculated} of ${response.totalRecruits} recruits`,
      'success'
    );

   
    // Refresh recruits list if we're on that tab
    if (document.querySelector('.tab-btn.active')?.id === 'tab-recruits') {
      await updateRecruitsList();
    }

  } catch (error) {
    console.error('Error recalculating ratings:', error);
    setStatusMessage('Error recalculating ratings: ' + error.message, 'error');
  }
}

/**
 * Handle save role ratings
 */
async function handleSaveRoleRatings() {
  if (!state.roleRatings.hasChanges) {
    setStatusMessage('No changes to save', 'info');
    return;
  }

  try {
    setStatusMessage('Validating role ratings...');

    // Validate all active roles have totals of 100
    const validationErrors = [];
    let isCurrentRoleValid = true;
    
    // Track which positions have been modified for targeted recalculation
    const changedPositions = new Set();
    
    // Check all roles, including the currently edited one
    for (const [positionKey, positionData] of Object.entries(state.roleRatings.data)) {
      for (const [roleKey, roleData] of Object.entries(positionData)) {
        if (roleData.isActive && roleData.attributes) {
          const total = Object.values(roleData.attributes).reduce((sum, val) => {
            return sum + (Number(val) || 0);
          }, 0);
            // Check if total is exactly 100 (with small margin for floating point precision)
          if (Math.abs(total - 100) > 0.1) {
            validationErrors.push(`${getPositionDisplayName(positionKey)} - ${roleData.roleLabel}: total is ${total.toFixed(1)}, should be 100`);
          }
          
          // Track position changes for targeted recalculation
          // Find the short position code (e.g., QB, RB) for the position
          const shortPos = Object.keys(POSITION_MAP || {}).find(key => 
            POSITION_MAP[key] === positionKey
          );
          
          if (shortPos) {
            changedPositions.add(shortPos);
          }
        }
      }
    }

    // If current role is invalid, focus back on the modal
    if (!isCurrentRoleValid) {
      setStatusMessage('Current role attributes must total exactly 100', 'error');
      return;
    }
    
    // If any validation errors exist, show them
    if (validationErrors.length > 0) {
      const message = 'The following roles have invalid totals:\n\n' + validationErrors.join('\n') + '\n\nPlease fix these before saving.';
      alert(message);
      return;
               }
    
    // Deep clone the data to avoid reference issues
    const ratingsToSave = JSON.parse(JSON.stringify(state.roleRatings.data));
    
    setStatusMessage('Saving role ratings...');

    const response = await sendMessageToBackground({
      action: 'saveRoleRatings',
      ratings: ratingsToSave,
      changedPositions: Array.from(changedPositions) // Convert Set to Array
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to save role ratings');
    }

    state.roleRatings.hasChanges = false;

    setStatusMessage(
      `Role ratings saved successfully. Recalculated ${response.recalculated} of ${response.totalRecruits} recruits.`,
      'success'
    );

    // Close modal
    closeRoleRatingsModal();

    // Refresh recruits list if we're on that tab
    if (document.querySelector('.tab-btn.active')?.id === 'tab-recruits') {
      await updateRecruitsList();
    }

  } catch (error) {
    console.error('Error saving role ratings:', error);
    setStatusMessage('Error saving role ratings: ' + error.message, 'error');
  }
}

/**
 * Handle reset role ratings to defaults
 */
async function handleResetRoleRatings() {
  if (!confirm('Are you sure you want to reset ALL role ratings to default values? This will remove all your customizations and recalculate all recruit ratings.')) {
    return;
  }

  try {
    setStatusMessage('Resetting role ratings to defaults...');

    const response = await sendMessageToBackground({ 
      action: 'resetRoleRatings' 
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to reset role ratings');
    }

    setStatusMessage(
      `Role ratings reset to defaults. Recalculated ${response.recalculated} of ${response.totalRecruits} recruits.`,
      'success'
    );

    // Refresh recruits list if we're on that tab
    if (document.querySelector('.tab-btn.active')?.id === 'tab-recruits') {
      await updateRecruitsList();
    }

  } catch (error) {
    console.error('Error resetting role ratings:', error);
    setStatusMessage('Error resetting role ratings: ' + error.message, 'error');
  }
}

// Bold attributes configuration handlers
async function handleEditBoldAttributes() {
  try {
    setStatusMessage('Opening attribute styling configuration...');
    const result = await showBoldAttributesModal();
    
    if (result === 'cancelled') {
      // User cancelled - no message needed
      return;
    }
    
    setStatusMessage('Attribute styling configuration updated successfully', 'success');
  } catch (error) {
    console.error('Error with bold attributes configuration:', error);
    setStatusMessage('Error with configuration: ' + error.message, 'error');
  }
}

async function handleResetBoldAttributes() {
  if (!confirm('Are you sure you want to reset all attribute styling to defaults? This will remove all your customizations.')) {
    return;
  }

  try {
    setStatusMessage('Resetting attribute styling to defaults...');
    
    // Clear user configuration
    boldAttributesConfig.resetAllToDefault();
    const success = await boldAttributesConfig.saveUserConfig();
    
    if (success) {
      // Refresh the recruits list to apply new styling
      await updateRecruitsList();
      setStatusMessage('Attribute styling reset to defaults successfully', 'success');
    } else {
      throw new Error('Failed to save reset configuration');
    }
  } catch (error) {
    console.error('Error resetting bold attributes:', error);
    setStatusMessage('Error resetting configuration: ' + error.message, 'error');
  }
}

/**
 * Show bold attributes configuration modal
 * Provides an interactive interface for customizing position-based attribute styling
 */
function showBoldAttributesModal() {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('bold-attributes-modal');
    const closeBtn = document.getElementById('bold-attributes-modal-close');
    const saveBtn = document.getElementById('bold-attributes-save');
    const resetPositionBtn = document.getElementById('bold-attributes-reset-position');
    const cancelBtn = document.getElementById('bold-attributes-cancel');
    const positionSelect = document.getElementById('position-select');
    const attributesGrid = document.getElementById('attributes-grid');
    const attributePreview = document.getElementById('attribute-preview');

    if (!modal || !positionSelect || !attributesGrid || !attributePreview) {
      reject(new Error('Required modal elements not found'));
      return;
    }

    let current_changes = {};
    let selected_position = '';

    /**
     * Populate position selector dropdown
     */
    function populatePositions() {
      positionSelect.innerHTML = '';
      const positions = boldAttributesConfig.getAvailablePositions();
      
      if (positions.length === 0) {
        console.warn('No positions available for configuration');
        return;
      }
      
      positions.forEach(position => {
        const option = document.createElement('option');
        option.value = position.key;
        option.textContent = `${position.name} (${position.key.toUpperCase()})`;
        positionSelect.appendChild(option);
      });

      selected_position = positions[0].key;
      positionSelect.value = selected_position;
      updateAttributesGrid();
    }

    /**
     * Update attributes grid for selected position
     */
    function updateAttributesGrid() {
      const positionConfig = boldAttributesConfig.getPositionConfig(selected_position);
      const attributes = boldAttributesConfig.getAvailableAttributes();
      
      attributesGrid.innerHTML = '';

      attributes.forEach(attr => {
        const wrapper = document.createElement('div');
        wrapper.className = 'attribute-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `attr-${attr}`;
        checkbox.value = attr;
          // Check if attribute should be bold for this position
        // First check if there are pending changes, then fall back to saved config
        let should_be_bold = false;
        if (current_changes[selected_position] && current_changes[selected_position].hasOwnProperty(attr)) {
          should_be_bold = current_changes[selected_position][attr] === 1;
        } else if (positionConfig) {
          should_be_bold = positionConfig.boldAttributes[attr] === 1;
        }
        
        checkbox.checked = should_be_bold;
        
        if (should_be_bold) {
          wrapper.classList.add('checked');
        }

        const label = document.createElement('label');
        label.htmlFor = `attr-${attr}`;
        label.textContent = attr.toUpperCase();

        // Handle checkbox changes
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            wrapper.classList.add('checked');
          } else {
            wrapper.classList.remove('checked');
          }
          
          // Track changes
          if (!current_changes[selected_position]) {
            current_changes[selected_position] = {};
          }
          current_changes[selected_position][attr] = checkbox.checked ? 1 : 0;
          
          updatePreview();
        });

        // Handle wrapper clicks for better UX
        wrapper.addEventListener('click', (e) => {
          if (e.target !== checkbox) {
            checkbox.click();
          }
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        attributesGrid.appendChild(wrapper);
      });

      updatePreview();
    }

    /**
     * Update preview of how attributes will look
     */
    function updatePreview() {
      const attributes = boldAttributesConfig.getAvailableAttributes();
      const positionConfig = boldAttributesConfig.getPositionConfig(selected_position);
      
      attributePreview.innerHTML = '';

      attributes.forEach(attr => {
        const previewElement = document.createElement('div');
        previewElement.className = 'preview-attribute';
        previewElement.textContent = attr.toUpperCase();

        // Check if this attribute should be bold (considering current changes)
        let should_be_bold = false;
        if (current_changes[selected_position] && current_changes[selected_position].hasOwnProperty(attr)) {
          should_be_bold = current_changes[selected_position][attr] === 1;
        } else if (positionConfig) {
          should_be_bold = positionConfig.boldAttributes[attr] === 1;
        }

        if (should_be_bold) {
          previewElement.classList.add('bold');
        }

        attributePreview.appendChild(previewElement);
      });
    }

    // Position change handler
    positionSelect.addEventListener('change', () => {
      selected_position = positionSelect.value;
      updateAttributesGrid();
    });

    // Initialize modal content
    try {
      populatePositions();
      modal.classList.remove('hidden');
      
      // Focus management for accessibility
      positionSelect.focus();
    } catch (error) {
      reject(error);
      return;
    }    // Event handlers
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve('cancelled');
      }
    };

    const handleOutsideClick = (event) => {
      if (event.target === modal) {
        cleanup();
        resolve('cancelled');
      }
    };

    const cleanup = () => {
      modal.classList.add('hidden');
      
      // Reset save button state
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      
      // Remove event listeners to prevent memory leaks
      window.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
      
      // Clear any existing onclick handlers to prevent memory leaks
      closeBtn.onclick = null;
      cancelBtn.onclick = null;
      saveBtn.onclick = null;
      resetPositionBtn.onclick = null;
      positionSelect.onchange = null;
    };

    closeBtn.onclick = () => {
      cleanup();
      resolve('cancelled');
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve('cancelled');
    };    resetPositionBtn.onclick = () => {
      if (confirm(`Reset ${selected_position.toUpperCase()} to default configuration?`)) {
        // Reset position to default in the configuration
        boldAttributesConfig.resetPositionToDefault(selected_position);
        
        // Remove any pending changes for this position
        delete current_changes[selected_position];
        
        // Update the grid to show the default values
        updateAttributesGrid();
        
        // Update the preview to show the reset state
        updatePreview();
      }
    };

    positionSelect.onchange = () => {
      selected_position = positionSelect.value;
      updateAttributesGrid();
    };

    saveBtn.onclick = async () => {
      try {
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        // Apply all changes
        for (const [position, changes] of Object.entries(current_changes)) {
          boldAttributesConfig.updatePositionConfig(position, changes);
        }

        // Save to storage
        const success = await boldAttributesConfig.saveUserConfig();
        
        if (success) {
          cleanup();
          
          // Refresh the recruits list to apply new styling
          await updateRecruitsList();
          
          resolve();
        } else {
          throw new Error('Failed to save configuration');
        }
      } catch (error) {
        console.error('Error saving bold attributes configuration:', error);
        alert('Error saving configuration: ' + error.message);
        
        // Reset button state        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    };

    // Add event listeners
    window.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
  });
}

// Export functions needed for error handler
export { handleScrapeRecruits, setStatusMessage };

/**
 * Run diagnostics on role ratings
 * @param {HTMLElement} outputElement Element to display results in
 */
async function runRoleRatingsDiagnostics(outputElement) {
  if (!outputElement) return;
  
  outputElement.innerHTML = 'Running diagnostics...';
  
  try {
    // Request diagnostic data from background script
    const response = await sendMessageToBackground({
      action: 'checkRoleRatingsStatus'
    });
    
    if (!response.success) {
      outputElement.innerHTML = `<div class="status-error">Error: ${response.error || 'Unknown error'}</div>`;
      return;
    }
    
    const { customRatings, defaultRatings, currentSeason } = response;
    
    // Format the diagnostic information
    let html = `
      <div class="debug-section">
        <h3>Role Ratings Status</h3>
        <p><strong>Current Season:</strong> ${currentSeason || 'Not set'}</p>
      </div>
      
      <div class="debug-section">
        <h3>Custom Role Ratings</h3>
        <p class="${customRatings.exists ? 'status-ok' : 'status-warning'}">
          <strong>Status:</strong> ${customRatings.exists ? 'Found' : 'Not Found'}
        </p>
        ${customRatings.exists ? `
          <p class="${customRatings.valid ? 'status-ok' : 'status-error'}">
            <strong>Format Valid:</strong> ${customRatings.valid ? 'Yes' : 'No'}
          </p>
          <p><strong>Size:</strong> ${(customRatings.size / 1024).toFixed(2)} KB</p>
          <p><strong>Positions:</strong> ${customRatings.positions.join(', ') || 'None'}</p>
        ` : ''}
      </div>
      
      <div class="debug-section">
        <h3>Default Role Ratings</h3>
        <p class="${defaultRatings.exists ? 'status-ok' : 'status-error'}">
          <strong>Status:</strong> ${defaultRatings.exists ? 'Found' : 'Not Found'}
        </p>
        ${defaultRatings.exists ? `
          <p class="${defaultRatings.valid ? 'status-ok' : 'status-error'}">
            <strong>Format Valid:</strong> ${defaultRatings.valid ? 'Yes' : 'No'}
          </p>
          <p><strong>Size:</strong> ${(defaultRatings.size / 1024).toFixed(2)} KB</p>
        ` : ''}
      </div>
        <div class="debug-section">
        <h3>Current Cache Status</h3>
        <p><strong>State has changes:</strong> ${state.roleRatings.hasChanges ? 'Yes' : 'No'}</p>
        <p><strong>Current position:</strong> ${state.roleRatings.currentPosition || 'None'}</p>
      </div>
    `;
    
    outputElement.innerHTML = html;
    
  } catch (error) {
    console.error('Error running diagnostics:', error);
    outputElement.innerHTML = `<div class="status-error">Error: ${error.message}</div>`;
  }
}

/**
 * Compare custom and default role ratings
 * @param {HTMLElement} outputElement Element to display results in
 */
async function compareRoleRatingsDiagnostics(outputElement) {
  if (!outputElement) return;
  
  outputElement.innerHTML = 'Comparing role ratings...';
  
  try {
    // Request comparison data from background script
    const response = await sendMessageToBackground({
      action: 'compareRoleRatings'
    });
    
    if (!response.success) {
      outputElement.innerHTML = `<div class="status-error">Error: ${response.error || 'Unknown error'}</div>`;
      return;
    }
    
    const { hasDifferences, differences } = response;
    
    // Format the comparison information
    let html = `
      <div class="debug-section">
        <h3>Role Ratings Comparison</h3>
        <p class="${hasDifferences ? 'status-ok' : 'status-warning'}">
          <strong>Differences Found:</strong> ${hasDifferences ? 'Yes' : 'No'}
        </p>
      </div>
    `;
    
    if (hasDifferences) {
      html += `<div class="debug-section"><h3>Differences</h3><pre>${JSON.stringify(differences, null, 2)}</pre></div>`;
    }
    
    outputElement.innerHTML = html;
    
  } catch (error) {
    console.error('Error comparing role ratings:', error);
    outputElement.innerHTML = `<div class="status-error">Error: ${error.message}</div>`;
  }
}

/**
 * Handle debug button click in role ratings modal
 * Creates a debug modal with diagnostic information
 */
async function handleDebugRoleRatings() {
  console.log('Opening role ratings debug modal');
  
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-container';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content debug-info';
  
  // Create header with close button
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <h2>Role Ratings Debug</h2>
    <button class="close-btn">&times;</button>
  `;
  
  // Create body content
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.innerHTML = '<p>Loading diagnostic information...</p>';
  
  // Create footer with action buttons
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  footer.innerHTML = `
    <button class="action-btn" id="debug-compare">Compare Custom vs Default</button>
    <button class="action-btn close-modal">Close</button>
  `;
  
  // Assemble modal
  modalContent.appendChild(header);
  modalContent.appendChild(body);
  modalContent.appendChild(footer);
  modalContainer.appendChild(modalContent);
  
  // Add to document
  document.body.appendChild(modalContainer);
  
  // Add event listeners
  const closeBtn = header.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modalContainer);
  });
  
  const closeModalBtn = footer.querySelector('.close-modal');
  closeModalBtn.addEventListener('click', () => {
    document.body.removeChild(modalContainer);
  });
  
  const compareBtn = footer.querySelector('#debug-compare');
  compareBtn.addEventListener('click', () => {
    compareRoleRatingsDiagnostics(body);
  });
  
  // Run initial diagnostics
  await runRoleRatingsDiagnostics(body);
}
