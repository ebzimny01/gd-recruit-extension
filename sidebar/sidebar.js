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
  schoolName: document.getElementById('schoolName'),
  dashboardSchoolName: document.getElementById('dashboardSchoolName'),
  recruitCount: document.getElementById('recruit-count'),
  watchlistCount: document.getElementById('watchlist-count'),
  lastUpdated: document.getElementById('last-updated'),
  currentSeason: document.getElementById('current-season'),
  btnScrapeRecruits: document.getElementById('btn-scrape-recruits'),
  btnUpdateWatchlist: document.getElementById('btn-update-watchlist'),
  btnUpdateConsidering: document.getElementById('btn-update-considering'),
  statusMessage: document.getElementById('status-message'),
  // Recruits tab elements
  filterName: document.getElementById('filter-name'),
  filterPosition: document.getElementById('filter-position'),
  filterWatched: document.getElementById('filter-watched'),
  filterMinRating: document.getElementById('filter-min-rating'),
  filterPotential: document.getElementById('filter-potential'),
  filterPriority: document.getElementById('filter-priority'),
  filterDistance: document.getElementById('filter-distance'),
  filterHideSigned: document.getElementById('filter-hide-signed'),
  recruitsList: document.getElementById('recruits-list'),
  prevPageBtn: document.getElementById('prev-page'),
  nextPageBtn: document.getElementById('next-page'),
  pageInfo: document.getElementById('page-info'),
  pageSizeSelect: document.getElementById('page-size-select'),
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
    minRating: 0,
    potential: '',
    priority: '',
    distance: '',
    hideSigned: false
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

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  // Set initial loading state for school name
  const schoolNameElements = [elements.schoolName, elements.dashboardSchoolName];
  schoolNameElements.forEach(element => {
    if (element) element.textContent = 'Loading...';
  });
  
  await loadData();
  updateDashboardStats();
  await updateButtonState();

  // Set up table sorting after data is loaded
  setupTableSorting();

  // Set up sidebar visibility listener
  sidebarComms.setupSidebarListeners();

  // Listen for sidebar visibility events
  document.addEventListener('sidebar-visible', async () => {
    console.log('Sidebar became visible, refreshing data');
    await loadData();
    updateDashboardStats();
    await updateButtonState();
    // Re-setup sorting after data refresh
    setupTableSorting();
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

  if (elements.filterWatched) {
    elements.filterWatched.addEventListener('change', applyFilters);
  }

  if (elements.filterMinRating) {
    elements.filterMinRating.addEventListener('input', applyFilters);
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
    updateRecruitsList();
  }
}

// Update dashboard statistics
function updateDashboardStats() {
  sendMessageToBackground({ action: 'getStats' })
    .then(stats => {
      // Update school name displays
      updateSchoolNameDisplay(stats.schoolName, stats.teamInfo);

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
    })
    .catch(error => {
      console.error('Error getting stats:', error);
      
      // Set fallback values for school name elements
      const schoolNameElements = [elements.schoolName, elements.dashboardSchoolName];
      schoolNameElements.forEach(element => {
        if (element) element.textContent = 'Error loading school';
      });
    });
}

// Helper function to update school name elements safely
function updateSchoolNameDisplay(schoolName, teamInfo) {
  const schoolNameElements = [elements.schoolName, elements.dashboardSchoolName];
  const displayName = schoolName || 'Unknown School';
  const tooltip = teamInfo?.division ? 
    `Division: ${teamInfo.division}` : 
    'Division information not available';
    
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
  state.filters.minRating = elements.filterMinRating ? parseFloat(elements.filterMinRating.value) || 0 : 0;
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

    // Rating filter
    if (state.filters.minRating > 0) {
      const rating = recruit.rating || 0;
      if (rating < state.filters.minRating) {
        return false;
      }
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
  updateRecruitsList();

  console.log(`Applied filters: ${state.filteredRecruits.length} recruits match criteria`);
}

// Update recruits list in the UI
function updateRecruitsList() {
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

  // Clear current list
  elements.recruitsList.innerHTML = '';
  // Add recruits to list
  if (pageRecruits.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 34; // Updated to match number of columns
    emptyCell.textContent = 'No recruits found matching your filters';
    emptyCell.style.textAlign = 'center';
    emptyRow.appendChild(emptyCell);
    elements.recruitsList.appendChild(emptyRow);
  } else {
    pageRecruits.forEach(recruit => {
      const row = document.createElement('tr');      // Helper function to create a cell with text content
      const createCell = (text, isNumeric = false) => {
        const cell = document.createElement('td');
        if (text === null || text === undefined || text === '') {
          cell.textContent = 'N/A';
        } else if (isNumeric && typeof text === 'number') {
          cell.textContent = text.toString();
        } else {
          cell.textContent = text.toString();
        }
        return cell;
      };

      // Helper function to format priority value
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
      };      // Create cells for all recruit data
      row.appendChild(createCell(recruit.name));
      row.appendChild(createCell(recruit.pos));
      row.appendChild(createCell(recruit.watched === 1 ? 'Yes' : 'No'));
      row.appendChild(createCell(recruit.potential));
      row.appendChild(createCell(formatPriority(recruit.priority)));
      row.appendChild(createCell(recruit.height));
      row.appendChild(createCell(recruit.weight, true));
      row.appendChild(createCell(recruit.rating, true));
      row.appendChild(createCell(recruit.rank === 999 ? 'NR' : recruit.rank, true));
      row.appendChild(createCell(recruit.hometown));
      row.appendChild(createCell(recruit.division));
      row.appendChild(createCell(recruit.miles, true));
      row.appendChild(createCell(recruit.signed === 1 ? 'Yes' : 'No'));
      row.appendChild(createCell(recruit.gpa ? recruit.gpa.toFixed(1) : 'N/A'));
      row.appendChild(createCell(recruit.ath, true));
      row.appendChild(createCell(recruit.spd, true));
      row.appendChild(createCell(recruit.dur, true));
      row.appendChild(createCell(recruit.we, true));
      row.appendChild(createCell(recruit.sta, true));
      row.appendChild(createCell(recruit.str, true));
      row.appendChild(createCell(recruit.blk, true));
      row.appendChild(createCell(recruit.tkl, true));
      row.appendChild(createCell(recruit.han, true));
      row.appendChild(createCell(recruit.gi, true));
      row.appendChild(createCell(recruit.elu, true));
      row.appendChild(createCell(recruit.tec, true));
      row.appendChild(createCell(recruit.r1, true));
      row.appendChild(createCell(recruit.r2, true));
      row.appendChild(createCell(recruit.r3, true));
      row.appendChild(createCell(recruit.r4, true));
      row.appendChild(createCell(recruit.r5, true));
      row.appendChild(createCell(recruit.r6, true));
      
      // Considering schools cell - truncate if too long
      const consideringCell = document.createElement('td');
      const considering = recruit.considering || 'undecided';
      consideringCell.textContent = considering.length > 50 ? considering.substring(0, 47) + '...' : considering;
      consideringCell.title = considering; // Show full text on hover
      row.appendChild(consideringCell);

      // Actions cell
      const actionsCell = document.createElement('td');
      const viewButton = document.createElement('button');
      viewButton.textContent = 'View';
      viewButton.className = 'view-btn';
      viewButton.addEventListener('click', () => handleViewRecruit(recruit.id));
      actionsCell.appendChild(viewButton);
      row.appendChild(actionsCell);

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
    updateRecruitsList();
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
    updateRecruitsList();
    
    console.log(`Page size changed to: ${selectedValue} (${state.itemsPerPage} items)`);
    
  } catch (error) {
    console.error('Error handling page size change:', error);
    setStatusMessage(`Error changing page size: ${error.message}`, 'error');
    
    // Reset to default on error
    state.itemsPerPage = DEFAULT_PAGE_SIZE;
    state.showAllResults = false;
    elements.pageSizeSelect.value = DEFAULT_PAGE_SIZE.toString();
    updateRecruitsList();
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
  updateRecruitsList();
  updateTableHeaders();
}

// Update table headers to show sort indicators
function updateTableHeaders() {
  const headers = document.querySelectorAll('#recruits-table thead th');
  const columnMapping = [
    'name', 'pos', 'watched', 'potential', 'priority', 'height', 'weight', 'rating', 'rank',
    'hometown', 'division', 'miles', 'signed', 'gpa', 'ath', 'spd', 'dur',
    'we', 'sta', 'str', 'blk', 'tkl', 'han', 'gi', 'elu', 'tec', 'r1', 'r2',
    'r3', 'r4', 'r5', 'r6', 'considering', 'actions'
  ];

  headers.forEach((header, index) => {
    // Remove existing sort classes
    header.classList.remove('sort-asc', 'sort-desc');

    const columnName = columnMapping[index];
    
    // Skip actions column
    if (columnName === 'actions') return;

    // Add sort class if this is the active sort column
    if (state.sorting.column === columnName) {
      header.classList.add(`sort-${state.sorting.direction}`);
    }
  });
}

// Make headers clickable for sorting
function setupTableSorting() {
  const headers = document.querySelectorAll('#recruits-table thead th');
  const columnMapping = [
    'name', 'pos', 'watched', 'potential', 'priority', 'height', 'weight', 'rating', 'rank',
    'hometown', 'division', 'miles', 'signed', 'gpa', 'ath', 'spd', 'dur',
    'we', 'sta', 'str', 'blk', 'tkl', 'han', 'gi', 'elu', 'tec', 'r1', 'r2',
    'r3', 'r4', 'r5', 'r6', 'considering', 'actions'
  ];

  headers.forEach((header, index) => {
    const columnName = columnMapping[index];
    
    // Skip actions column
    if (columnName === 'actions') return;

    // Skip if already set up (prevent duplicate event listeners)
    if (header.dataset.sortingSetup === 'true') return;

    // Make header clickable
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.addEventListener('click', () => sortRecruits(columnName));
    
    // Mark as set up
    header.dataset.sortingSetup = 'true';
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
    }

    // Now proceed with season initialization (for both new season and first-time init)
    let seasonNumber = null;
    let includeLowerDivisions = false;

    try {
      const modalResult = await showSeasonInputModal();
      seasonNumber = modalResult.seasonNumber;
      includeLowerDivisions = modalResult.includeLowerDivisions;
      console.log('Season number from modal:', seasonNumber);
      console.log('Include lower divisions from modal:', includeLowerDivisions);

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

          // Show success message with season number
          // Get the actual recruit count from state.recruits which was updated by loadData()
          if (seasonNumber) {
            setStatusMessage(`Scrape completed successfully with ${state.recruits.length} recruits for Season ${seasonNumber}`, 'success');
          } else {
            setStatusMessage(`Scrape completed successfully with ${state.recruits.length} recruits`, 'success');
          }
        });
      }
    };

    // Add the listener
    chrome.runtime.onMessage.addListener(handleScrapeComplete);

    // Set a timeout to remove the listener if no response within 2 minutes
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(handleScrapeComplete);
      setStatusMessage('Scraping timed out. Please try again.', 'warning');
    }, 120000); // 2 minutes
  } catch (error) {
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
    const includeLowerDivisions = document.getElementById('include-lower-divisions');

    // Clear previous errors and reset input
    errorText.textContent = '';
    seasonInput.value = '1';
    includeLowerDivisions.checked = false;

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
      resolve({
        seasonNumber,
        includeLowerDivisions: includeLowerDivisions.checked
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
