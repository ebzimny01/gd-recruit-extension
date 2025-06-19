// Popup script for GD Recruit Assistant
// Migrated from sidebar implementation with popup-specific optimizations

// Import modules
import { popupComms, sidebarComms } from './communications.js';
import boldAttributesConfig from '../modules/bold-attributes-config.js';
import { getFullVersionString } from '../lib/version.js';

// Configuration constants - snake_case for constants as per guidelines
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

const PAGE_SIZE_OPTIONS = {
  SMALL: 10,
  MEDIUM: 25,
  LARGE: 50,
  EXTRA_LARGE: 100
};

const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS.SMALL;
const PAGE_SIZE_STORAGE_KEY = 'preferredPageSize';
const COLUMN_VISIBILITY_STORAGE_KEY = 'columnVisibility';

// Custom position order for dropdown - modify this array to change the order
const POSITION_DROPDOWN_ORDER = [
  'QB',  // Quarterback first
  'RB',  // Running Back
  'WR',  // Wide Receiver  
  'TE',  // Tight End
  'OL',  // Offensive Line
  'DL',  // Defensive Line
  'LB',  // Linebacker
  'DB',  // Defensive Back
  'K',   // Kicker
  'P'    // Punter last
];

// Custom position groups for special filtering
const CUSTOM_POSITION_GROUPS = {
  'Ret': {
    label: 'Returner',
    positions: ['RB', 'WR', 'TE', 'DB']
  }
  // Future custom groups can be added here
  // 'OFF': { label: 'Offense', positions: ['QB', 'RB', 'WR', 'TE', 'OL'] }
  // 'DEF': { label: 'Defense', positions: ['DL', 'LB', 'DB'] }
};

// Column configuration for recruit table
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

// DOM elements cache - organized by functional area
const elements = {
  // Tab navigation - convert NodeLists to Arrays for better error handling
  tab_buttons: Array.from(document.querySelectorAll('.tab-btn') || []),
  tab_sections: Array.from(document.querySelectorAll('.tab-content') || []),

  // Dashboard elements
  school_name: document.getElementById('schoolName'),
  dashboard_school_name: document.getElementById('dashboardSchoolName'),
  team_division: document.getElementById('team-division'),
  team_world: document.getElementById('team-world'),
  recruit_count: document.getElementById('recruit-count'),
  watchlist_count: document.getElementById('watchlist-count'),
  last_updated: document.getElementById('last-updated'),
  current_season: document.getElementById('current-season'),
  btn_scrape_recruits: document.getElementById('btn-scrape-recruits'),
  btn_update_considering: document.getElementById('btn-update-considering'),
  status_message: document.getElementById('status-message'),

  // Recruits tab elements
  filter_position: document.getElementById('filter-position'),
  filter_watched: document.getElementById('filter-watched'),
  filter_potential: document.getElementById('filter-potential'),
  filter_division: document.getElementById('filter-division'),
  filter_priority: document.getElementById('filter-priority'),
  filter_distance: document.getElementById('filter-distance'),
  filter_hide_signed: document.getElementById('filter-hide-signed'),
  recruits_list: document.getElementById('recruits-list'),
  prev_page_btn: document.getElementById('prev-page'),
  next_page_btn: document.getElementById('next-page'),
  page_info: document.getElementById('page-info'),
  page_size_select: document.getElementById('page-size-select'),

  // Column visibility elements
  btn_column_visibility: document.getElementById('btn-column-visibility'),
  column_visibility_modal: document.getElementById('column-visibility-modal'),
  column_visibility_grid: document.getElementById('column-visibility-grid'),
  column_visibility_save: document.getElementById('column-visibility-save'),
  column_visibility_reset: document.getElementById('column-visibility-reset'),
  column_visibility_cancel: document.getElementById('column-visibility-cancel'),

  // Settings tab elements
  btn_export_data: document.getElementById('btn-export-data'),
  btn_import_data: document.getElementById('btn-import-data'),
  btn_clear_data: document.getElementById('btn-clear-data'),
  btn_refresh_data: document.getElementById('btn-refresh-data'),
  btn_check_db: document.getElementById('btn-check-db'),
  btn_edit_role_ratings: document.getElementById('btn-edit-role-ratings'),
  btn_reset_role_ratings: document.getElementById('btn-reset-role-ratings'),
  btn_edit_bold_attributes: document.getElementById('btn-edit-bold-attributes'),
  btn_reset_bold_attributes: document.getElementById('btn-reset-bold-attributes'),

  // Season modal elements
  season_modal: document.getElementById('season-modal'),
  season_modal_close: document.getElementById('season-modal-close'),
  season_number: document.getElementById('season-number'),
  season_confirm: document.getElementById('season-confirm'),
  season_cancel: document.getElementById('season-cancel'),

  // Role ratings modal elements
  role_ratings_modal: document.getElementById('role-ratings-modal'),
  role_ratings_modal_close: document.getElementById('role-ratings-modal-close'),
  position_tabs: document.getElementById('position-tabs'),
  position_content: document.getElementById('position-content'),
  role_reset_position: document.getElementById('role-reset-position'),
  role_recalculate: document.getElementById('role-recalculate'),
  role_debug: document.getElementById('role-debug'),
  role_ratings_save: document.getElementById('role-ratings-save'),
  role_ratings_cancel: document.getElementById('role-ratings-cancel'),

  // Bold attributes modal elements
  bold_attributes_modal: document.getElementById('bold-attributes-modal'),
  bold_attributes_modal_close: document.getElementById('bold-attributes-modal-close'),
  position_select: document.getElementById('position-select'),
  attributes_grid: document.getElementById('attributes-grid'),
  attribute_preview: document.getElementById('attribute-preview'),
  bold_attributes_save: document.getElementById('bold-attributes-save'),
  bold_attributes_reset_position: document.getElementById('bold-attributes-reset-position'),
  bold_attributes_cancel: document.getElementById('bold-attributes-cancel')
};

// Application state management - centralized state for better debugging
let state = {
  // Core data
  recruits: [],
  filtered_recruits: [],
  
  // Team information
  currentTeamId: null,
  currentSeason: null,
  
  // Pagination state
  current_page: 1,
  items_per_page: DEFAULT_PAGE_SIZE,
  show_all_results: false,
  
  // Sorting state
  sorting: {
    column: null,
    direction: 'asc'
  },
  
  // Filter state
  filters: {
    name: '',
    position: '',
    watched: '',
    potential: '',
    division: '',
    priority: '',
    distance: '',
    hide_signed: false
  },
  
  // Modal states
  role_ratings: {
    data: null,
    current_position: null,
    active_roles: {},
    has_changes: false
  },
  
  // Column visibility state
  column_visibility: {
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
  },
    // Popup specific state
  is_popup_focused: true,
  last_data_refresh: null,
  popup_lifecycle: 'initializing', // initializing, ready, closing
    // Performance optimization state
  performance: {
    last_render_time: null,
    render_batch_size: 50,
    virtual_scrolling_threshold: 200,
    debounce_timers: new Map(),
    handling_resize: false, // Prevent resize handler cascades
    cache: {
      filtered_results_hash: null,
      rendered_rows: new Map()
    }
  }
};

// Error handling and validation utilities
function validateElement(element, elementName) {
  if (!element) {
    console.warn(`Element not found: ${elementName}`);
    return false;
  }
  return true;
}

function handleError(error, context = 'operation') {
  console.error(`Error during ${context}:`, error);
  hideScrapingOverlay(); // Hide overlay on any error
  
  // Provide user-friendly error messages
  let message = `Error during ${context}`;
  if (error?.message) {
    if (error.message.includes('403')) {
      message = 'Error: Not authenticated. Please log in to WhatifsIports.com in another tab first.';
    } else if (error.message.includes('Failed to fetch')) {
      message = 'Error: Network connection failed. Please check your internet connection.';
    } else {
      message = error.message;
    }
  }
  
  setStatusMessage(message, 'error');
}

// Performance optimization utilities
function debounce(func, wait, key) {
  // Clear existing timer for this key
  if (state.performance.debounce_timers.has(key)) {
    clearTimeout(state.performance.debounce_timers.get(key));
  }
  
  // Set new timer
  const timeoutId = setTimeout(func, wait);
  state.performance.debounce_timers.set(key, timeoutId);
}

function throttle(func, limit, key) {
  if (!state.performance.debounce_timers.has(key)) {
    func();
    state.performance.debounce_timers.set(key, setTimeout(() => {
      state.performance.debounce_timers.delete(key);
    }, limit));
  }
}

function generateDataHash(data) {
  // Simple hash function for caching
  return JSON.stringify(data).split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
}

function measurePerformance(operationName, operation) {
  const startTime = performance.now();
  const result = operation();
  const endTime = performance.now();
  
  if (endTime - startTime > 100) { // Log operations taking more than 100ms
    console.log(`Performance: ${operationName} took ${(endTime - startTime).toFixed(2)}ms`);
  }
  
  return result;
}

// Status message handler with type support
function setStatusMessage(message, type = 'info') {
  const statusElement = elements.status_message;
  if (!validateElement(statusElement, 'status-message')) return;
  
  statusElement.textContent = message;
  statusElement.className = `status-${type}`;
  
  // Clear message after delay for non-error messages
  if (type !== 'error') {
    setTimeout(() => {
      if (statusElement.textContent === message) {
        statusElement.textContent = 'Ready';
        statusElement.className = '';
      }
    }, 5000);
  }
}

// Make setStatusMessage globally available for error-handler.js
window.setStatusMessage = setStatusMessage;

// Enhanced status display with progress indicator for scraping operations
function setScrapingStatus(message, showProgress = true) {
  if (!elements.status_message) return;
  
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

// Initialize popup application
async function initializePopup() {
  try {
    state.popup_lifecycle = 'initializing';
    setStatusMessage('Initializing extension...', 'info');
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup popup-specific listeners
    setupPopupLifecycleListeners();
    
    // Load and display version
    await loadVersionInfo();
      // Load saved preferences
    await loadSavedPreferences();
    
    // Initialize bold attributes configuration
    try {
      await boldAttributesConfig.init();
      console.log('Bold attributes configuration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize bold attributes configuration:', error);
    }
    
    // Initialize UI components
    initializeUIComponents();
    
    // Load initial data
    await loadInitialData();
    
    state.popup_lifecycle = 'ready';
    setStatusMessage('Extension ready', 'success');
    
  } catch (error) {
    handleError(error, 'popup initialization');
    state.popup_lifecycle = 'error';
  }
}

// Setup event listeners for all interactive elements
function setupEventListeners() {
  try {
    // Tab navigation
    setupTabNavigation();
    
    // Dashboard buttons
    setupDashboardListeners();
    
    // Filter controls
    setupFilterListeners();
    
    // Pagination controls
    setupPaginationListeners();
    
    // Settings buttons
    setupSettingsListeners();
    
    // Modal controls
    setupModalListeners();
    
  } catch (error) {
    handleError(error, 'event listener setup');
  }
}

// Setup popup-specific lifecycle listeners
function setupPopupLifecycleListeners() {
  // Setup communication listeners
  popupComms.setupPopupListeners();
  popupComms.handlePopupResize();
  
  // Listen for popup focus events
  document.addEventListener('popup-focus', () => {
    state.is_popup_focused = true;
    refreshDataIfStale();  });
  
  document.addEventListener('popup-blur', () => {
    state.is_popup_focused = false;
  });
  // Listen for popup resize events
  document.addEventListener('popup-resize', (event) => {
    console.log('popup-resize event received with detail:', event.detail);
    try {
      console.log('Calling handlePopupResize with dimensions:', event.detail);
      handlePopupResize(event.detail);
      console.log('handlePopupResize completed successfully');
    } catch (error) {
      console.error('Error handling popup resize event:', error);
      console.error('Error type:', typeof error, 'Error value:', error);
      
      // Don't call handleError to prevent cascading - just log the error
      setStatusMessage(`Resize error: ${error && error.message ? error.message : error}`, 'warning');
    }
  });
  
  // Setup keyboard accessibility
  setupKeyboardAccessibility();
}

// Setup keyboard accessibility and navigation
function setupKeyboardAccessibility() {
  document.addEventListener('keydown', (event) => {
    // Handle global keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          switchTab('tab-dashboard');
          break;
        case '2':
          event.preventDefault();
          switchTab('tab-recruits');
          break;
        case '3':
          event.preventDefault();
          switchTab('tab-settings');
          break;
        case 'f':
          event.preventDefault();
          focusFilterControls();
          break;
      }
    }
    
    // Handle escape key for closing modals
    if (event.key === 'Escape') {
      closeAllModals();
    }
    
    // Handle arrow keys for table navigation
    if (event.target.closest('.recruits-table')) {
      handleTableNavigation(event);
    }
  });
  
  // Add focus indicators for better accessibility
  document.addEventListener('focusin', (event) => {
    if (event.target.matches('button, input, select, textarea')) {
      event.target.classList.add('keyboard-focused');
    }
  });
  
  document.addEventListener('focusout', (event) => {
    event.target.classList.remove('keyboard-focused');
  });
}

// Focus filter controls for keyboard accessibility
function focusFilterControls() {
  if (elements.filter_position) {
    elements.filter_position.focus();
  }
}

// Close all open modals
function closeAllModals() {
  const modals = document.querySelectorAll('.modal:not(.hidden)');
  modals.forEach(modal => {
    modal.classList.add('hidden');
  });
}

// Handle table navigation with keyboard
function handleTableNavigation(event) {
  const currentRow = event.target.closest('tr');
  if (!currentRow) return;
  
  let targetRow = null;
  
  switch (event.key) {
    case 'ArrowUp':
      targetRow = currentRow.previousElementSibling;
      break;
    case 'ArrowDown':
      targetRow = currentRow.nextElementSibling;
      break;
    case 'Home':
      targetRow = currentRow.parentElement.firstElementChild;
      break;
    case 'End':
      targetRow = currentRow.parentElement.lastElementChild;
      break;
  }
  
  if (targetRow && targetRow.tagName === 'TR') {
    event.preventDefault();
    targetRow.focus();
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Tab navigation setup
function setupTabNavigation() {
  if (!elements.tab_buttons || !Array.isArray(elements.tab_buttons)) {
    console.warn('tab_buttons not available for navigation setup');
    return;
  }
  
  elements.tab_buttons.forEach(button => {
    if (!button || !button.addEventListener) {
      console.warn('Invalid button element found, skipping');
      return;
    }
    
    button.addEventListener('click', (event) => {
      try {
        switchTab(event.target.id);
      } catch (error) {
        console.error('Error in tab navigation click handler:', error);
        // Don't use handleError to prevent cascades
        setStatusMessage(`Tab navigation error: ${error.message || error}`, 'error');
      }
    });
  });
}

// Switch between tabs with proper state management
function switchTab(tabId) {
  try {
    const tabMapping = {
      'tab-dashboard': 'dashboard-section',
      'tab-recruits': 'recruits-section',
      'tab-settings': 'settings-section'
    };
    
    const targetSection = tabMapping[tabId];
    if (!targetSection) {
      console.warn(`Unknown tab: ${tabId}`);
      return;
    }      // Update button states
    if (elements.tab_buttons && Array.isArray(elements.tab_buttons) && elements.tab_buttons.length > 0) {
      elements.tab_buttons.forEach(btn => {
        if (btn && btn.classList) {
          btn.classList.toggle('active', btn.id === tabId);
        }
      });
    } else {
      console.warn('tab_buttons not properly initialized or empty');
    }
    
    // Update section visibility
    if (elements.tab_sections && Array.isArray(elements.tab_sections) && elements.tab_sections.length > 0) {
      elements.tab_sections.forEach(section => {
        if (section && section.classList) {
          section.classList.toggle('active', section.id === targetSection);
        }
      });
    } else {
      console.warn('tab_sections not properly initialized or empty');
    }
      // Perform tab-specific initialization
    if (targetSection === 'recruits-section') {
      console.log('Switching to recruits section, refreshing display...');
      try {
        refreshRecruitsDisplay();
        console.log('refreshRecruitsDisplay completed successfully');
      } catch (error) {
        console.error('Error in refreshRecruitsDisplay during tab switch:', error);
        console.error('Error type:', typeof error, 'Error value:', error);
        
        if (error === null) {
          console.error('CAUGHT NULL ERROR in refreshRecruitsDisplay!');
        }
        
        // Don't propagate the error to prevent cascades
        setStatusMessage(`Error loading recruits: ${error && error.message ? error.message : 'Unknown error'}`, 'error');
      }
    }
    
  } catch (error) {
    console.error('Error in switchTab:', error);
    handleError(error, 'switching tab');
  }
}

// Load version information
async function loadVersionInfo() {
  try {
    const versionString = await getFullVersionString();
    const versionElement = document.getElementById('version-display');
    if (versionElement) {
      versionElement.textContent = versionString;
    }
  } catch (error) {
    console.warn('Could not load version info:', error);
  }
}

// Load saved user preferences
async function loadSavedPreferences() {
  try {
    // Load page size preference
    const savedPageSize = await chrome.storage.local.get(PAGE_SIZE_STORAGE_KEY);
    if (savedPageSize[PAGE_SIZE_STORAGE_KEY]) {
      state.items_per_page = parseInt(savedPageSize[PAGE_SIZE_STORAGE_KEY], 10);
      if (elements.page_size_select) {
        elements.page_size_select.value = state.items_per_page.toString();
      }
    }
    
    // Load column visibility preferences
    const savedColumns = await chrome.storage.local.get(COLUMN_VISIBILITY_STORAGE_KEY);
    if (savedColumns[COLUMN_VISIBILITY_STORAGE_KEY]) {
      Object.assign(state.column_visibility, savedColumns[COLUMN_VISIBILITY_STORAGE_KEY]);
    }
    
  } catch (error) {
    console.warn('Could not load saved preferences:', error);
  }
}

// Initialize UI components
function initializeUIComponents() {
  // Initialize page size selector
  if (elements.page_size_select) {
    elements.page_size_select.value = state.items_per_page.toString();
  }
  
  // Setup initial filter options
  setupFilterOptions();
  
  // Apply column visibility
  applyColumnVisibility();
}

// Load initial data from background script
async function loadInitialData() {
  setStatusMessage('Loading data...', 'info');
  
  try {
    // Get basic stats and school info
    await refreshDashboardData();
    
    // Load recruits data
    await loadRecruitsData();
    
    setStatusMessage('Data loaded successfully', 'success');
    
  } catch (error) {
    handleError(error, 'initial data loading');
  }
}

// Handle popup resize events
function handlePopupResize(dimensions) {
  try {
    if (!dimensions) {
      console.debug('handlePopupResize called with null/undefined dimensions - skipping');
      return;
    }
    
    const { width, height } = dimensions;
    
    if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
      console.debug('handlePopupResize called with invalid dimensions:', dimensions, '- skipping');
      return;
    }
    
    // Adjust table container if needed
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
      // Recalculate table height based on popup size
      const maxTableHeight = Math.max(200, height - 400); // Reserve space for other UI
      tableWrapper.style.maxHeight = `${maxTableHeight}px`;
    }
    
    // Adjust modal sizes if any are open
    const openModals = document.querySelectorAll('.modal:not(.hidden)');
    if (openModals && openModals.length > 0) {
      openModals.forEach(modal => {
        try {
          const modalContent = modal.querySelector('.modal-content');
          if (modalContent) {
            const maxModalHeight = height * 0.9;
            modalContent.style.maxHeight = `${maxModalHeight}px`;
          }
        } catch (modalError) {
          console.warn('Error adjusting modal during resize:', modalError);
        }
      });
    }
    
  } catch (error) {
    // Log error but don't propagate it to prevent cascades
    console.warn('Non-critical error in handlePopupResize:', error);
  }
}

// Check if data needs refreshing
function refreshDataIfStale() {
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();
  
  if (!state.last_data_refresh || (now - state.last_data_refresh) > staleThreshold) {
    console.log('Data is stale, refreshing...');
    loadInitialData();
  }
}

// Update dashboard button states based on season initialization status
function updateDashboardButtonStates(stats) {
  console.log('Updating dashboard button states with stats:', stats);
  
  const isSeasonInitialized = checkIfSeasonInitialized(stats);
  console.log('Season initialized status:', isSeasonInitialized);
  
  // Get button references
  const initializeSeasonBtn = elements.btn_scrape_recruits;
  const refreshDataBtn = elements.btn_update_considering;
  
  if (isSeasonInitialized) {
    // Season is initialized - enable refresh button, keep initialize button enabled but change text
    if (initializeSeasonBtn) {
      initializeSeasonBtn.disabled = false;
      initializeSeasonBtn.textContent = 'Initialize New Season';
      initializeSeasonBtn.title = 'Start a new season (will clear existing data)';
      initializeSeasonBtn.classList.remove('btn-disabled');
    }
    
    if (refreshDataBtn) {
      refreshDataBtn.disabled = false;
      refreshDataBtn.classList.remove('btn-disabled');
      refreshDataBtn.title = 'Re-scrape recruit data from stored recruiting URL';
    }
  } else {
    // Season not initialized - only enable initialize button, disable refresh button
    if (initializeSeasonBtn) {
      initializeSeasonBtn.disabled = false;
      initializeSeasonBtn.textContent = 'Initialize Season';
      initializeSeasonBtn.title = 'Initialize the first season with recruit data';
      initializeSeasonBtn.classList.remove('btn-disabled');
    }
    
    if (refreshDataBtn) {
      refreshDataBtn.disabled = true;
      refreshDataBtn.classList.add('btn-disabled');
      refreshDataBtn.title = 'Season must be initialized first';
    }
  }
}

// Check if a season has been initialized based on stats
function checkIfSeasonInitialized(stats) {
  // A season is considered initialized if:
  // 1. Current season is not null/undefined AND not 'N/A'
  // 2. OR there are existing recruits (recruit count > 0)
  // 3. OR there are watchlist entries (watchlist count > 0)
  
  const hasValidSeason = stats.currentSeason && 
                        stats.currentSeason !== null && 
                        stats.currentSeason !== 'N/A' && 
                        stats.currentSeason !== '';
  
  const hasRecruits = (state.recruits && state.recruits.length > 0) || 
                     (stats.recruitCount && stats.recruitCount > 0);
  
  const hasWatchlist = stats.watchlistCount && stats.watchlistCount > 0;
  
  console.log('Season initialization check:', {
    hasValidSeason,
    hasRecruits,
    hasWatchlist,
    currentSeason: stats.currentSeason,
    recruitCount: stats.recruitCount || state.recruits?.length || 0,
    watchlistCount: stats.watchlistCount || 0
  });
  
  return hasValidSeason || hasRecruits || hasWatchlist;
}

// Setup dashboard event listeners and functionality
function setupDashboardListeners() {
  // Initialize Season button
  if (elements.btn_scrape_recruits) {
    elements.btn_scrape_recruits.addEventListener('click', handleScrapeRecruits);
  }
  
  // Refresh Recruit Data button
  if (elements.btn_update_considering) {
    elements.btn_update_considering.addEventListener('click', handleUpdateConsidering);
  }
    // Listen for data update messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'dataUpdated') {
      handleDataUpdate(message);
    }
    if (message.action === 'teamChanged') {
      console.log('Received team change notification:', message);
      handleTeamChange(message.teamInfo);
    }
    if (message.action === 'scrapeComplete') {
      console.log('Received scrape complete notification:', message);
      handleScrapeComplete(message);
    }
    return false; // Don't keep the message channel open
  });
}

// Handle Initialize Season button click
async function handleScrapeRecruits() {
  try {
    setStatusMessage('Opening season initialization...', 'info');
    
    // Show season modal
    showSeasonModal();
    
  } catch (error) {
    handleError(error, 'season initialization');
  }
}

// Handle Refresh Recruit Data button click
async function handleUpdateConsidering() {
  try {
    // Check if season is initialized before allowing refresh
    const statsResponse = await popupComms.sendMessageToBackground({
      action: 'getStats'
    });
    
    if (!checkIfSeasonInitialized(statsResponse)) {
      setStatusMessage('Please initialize a season first before refreshing recruit data', 'warning');
      return;
    }
    
    // Show scraping overlay for refresh
    setScrapingStatus('Refreshing recruit data ...');
    console.log('Starting recruit data refresh from stored URL...');

    // Set up a listener for the scraped data
    const handleScrapeComplete = (message) => {
      if (message.action === 'scrapeComplete') {
        // Remove this listener and hide overlay
        chrome.runtime.onMessage.removeListener(handleScrapeComplete);
        hideScrapingOverlay();

        // Reload data to show refreshed results
        Promise.all([loadRecruitsData(), refreshDashboardData()]).then(() => {
          // Show success message with recruit count
          setStatusMessage(`Refresh completed successfully for ${state.recruits?.length || 0} recruits`, 'success');
        });
      }
    };

    // Add the listener
    chrome.runtime.onMessage.addListener(handleScrapeComplete);
    
    // Call fetchAndScrapeRecruits with refresh parameters
    const response = await popupComms.sendMessageToBackground({
      action: 'fetchAndScrapeRecruits',
      isRefreshOnly: true,
      fieldsToUpdate: ['watched', 'potential', 'priority', 'signed', 'considering']
    });
    
    if (response.error) {
      // Remove listener on error
      chrome.runtime.onMessage.removeListener(handleScrapeComplete);
      hideScrapingOverlay();
      throw new Error(response.error);
    }

    // Set a timeout to remove the listener if no response within 2 minutes
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(handleScrapeComplete);
      hideScrapingOverlay();
      setStatusMessage('Refresh timed out. Please try again.', 'warning');
    }, 120000); // 2 minutes
    
  } catch (error) {
    console.error('Error during recruit data refresh:', error);
    setStatusMessage(`Error refreshing recruit data: ${error.message}`, 'error');
    handleError(error, 'recruit data refresh');
  }
}

// Show season initialization modal
function showSeasonModal() {
  if (!validateElement(elements.season_modal, 'season-modal')) return;
  
  elements.season_modal.classList.remove('hidden');
  
  // Setup season modal if not already done
  if (!elements.season_modal.dataset.initialized) {
    setupSeasonModalListeners();
    elements.season_modal.dataset.initialized = 'true';
  }
  
  // Auto-select team's division
  const teamDivision = elements.team_division?.textContent?.trim();
  const divisionMap = { 'D-IA': 'division-d1a', 'D-IAA': 'division-d1aa', 'D-II': 'division-d2', 'D-III': 'division-d3' };
  
  if (teamDivision && divisionMap[teamDivision]) {
    const checkbox = document.getElementById(divisionMap[teamDivision]);
    if (checkbox) {
      checkbox.checked = true;
      checkbox.disabled = true;
    }
  }
}

// Setup season modal event listeners
function setupSeasonModalListeners() {
  // Close button
  if (elements.season_modal_close) {
    elements.season_modal_close.addEventListener('click', closeSeasonModal);
  }
  
  // Cancel button
  if (elements.season_cancel) {
    elements.season_cancel.addEventListener('click', closeSeasonModal);
  }
  
  // Confirm button
  if (elements.season_confirm) {
    elements.season_confirm.addEventListener('click', handleSeasonConfirm);
  }
  
  // Close on backdrop click
  elements.season_modal.addEventListener('click', (event) => {
    if (event.target === elements.season_modal) {
      closeSeasonModal();
    }
  });
}

// Close season modal
function closeSeasonModal() {
  if (elements.season_modal) {
    elements.season_modal.classList.add('hidden');
    
    // Reset division checkboxes
    ['division-d1a', 'division-d1aa', 'division-d2', 'division-d3'].forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.checked = false;
        checkbox.disabled = false;
      }
    });
  }
}

// Handle season confirmation
async function handleSeasonConfirm() {
  try {
    const seasonNumber = elements.season_number?.value;
    if (!seasonNumber || seasonNumber < 1) {
      throw new Error('Please enter a valid season number');
    }
    
    // Get selected divisions
    const selectedDivisions = [];
    const divisionCheckboxes = [
      { id: 'division-d1a', value: 1 },
      { id: 'division-d1aa', value: 2 },
      { id: 'division-d2', value: 3 },
      { id: 'division-d3', value: 4 }
    ];
    
    divisionCheckboxes.forEach(({ id, value }) => {
      const checkbox = document.getElementById(id);
      if (checkbox && checkbox.checked) {
        selectedDivisions.push(value);
      }
    });
    
    if (selectedDivisions.length === 0) {
      throw new Error('Please select at least one division');
    }
    
    // Show scraping overlay
    setScrapingStatus('Preparing to fetch recruit data...');
    closeSeasonModal();

    // Set up a listener for the scraped data
    const handleScrapeComplete = (message) => {
      if (message.action === 'scrapeComplete') {
        // Remove this listener and hide overlay
        chrome.runtime.onMessage.removeListener(handleScrapeComplete);
        hideScrapingOverlay();

        // Reload data
        Promise.all([loadRecruitsData(), refreshDashboardData()]).then(() => {
          // Show success message with recruit count
          setStatusMessage(`Season ${seasonNumber} initialized successfully with ${state.recruits?.length || 0} recruits`, 'success');
        });
      }
    };

    // Add the listener
    chrome.runtime.onMessage.addListener(handleScrapeComplete);

    const response = await popupComms.sendMessageToBackground({
      action: 'fetchAndScrapeRecruits',
      seasonNumber: parseInt(seasonNumber, 10),
      selectedDivisions: selectedDivisions
    });
    
    if (response.error) {
      // Remove listener on error
      chrome.runtime.onMessage.removeListener(handleScrapeComplete);
      throw new Error(response.error);
    }

    // Set a timeout to remove the listener if no response within 2 minutes
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(handleScrapeComplete);
      hideScrapingOverlay();
      setStatusMessage('Scraping timed out. Please try again.', 'warning');
    }, 120000); // 2 minutes
    
  } catch (error) {
    handleError(error, 'season confirmation');
  }
}

// Refresh dashboard data from background script
async function refreshDashboardData() {
  try {
    const response = await popupComms.sendMessageToBackground({
      action: 'getStats'
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    updateDashboardDisplay(response);
    state.last_data_refresh = Date.now();
    
  } catch (error) {
    console.warn('Could not refresh dashboard data:', error);
  }
}

// Update dashboard display with fresh data
function updateDashboardDisplay(stats) {
  console.log('Updating dashboard display with stats:', stats);
  
  // Store team information in state for use in conditional formatting
  if (stats.teamInfo) {
    state.currentTeamId = stats.teamInfo.teamId;
    console.log('Updated current team ID in state:', state.currentTeamId);
  }
  
  // Update school name displays
  updateSchoolNameDisplay(stats.schoolName, stats.teamInfo);
  
  // Update team information
  if (elements.team_division) {
    elements.team_division.textContent = stats.teamInfo?.division || 'Unknown';
  }
  
  if (elements.team_world) {
    elements.team_world.textContent = stats.teamInfo?.world || 'Unknown';
  }
  
  // Update recruit counts
  if (elements.recruit_count) {
    elements.recruit_count.textContent = state.recruits.length || 0;
  }
  
  if (elements.watchlist_count) {
    elements.watchlist_count.textContent = stats.watchlistCount || 0;
  }
  
  // Update last updated timestamp
  if (elements.last_updated) {
    elements.last_updated.textContent = formatDate(stats.lastUpdated) || 'Never';
  }
  
  // Update current season
  if (elements.current_season) {
    if (stats.currentSeason) {
      state.currentSeason = stats.currentSeason;
      elements.current_season.textContent = stats.currentSeason;
    } else {
      elements.current_season.textContent = 'N/A';
    }
  }
  
  // Update button states based on season initialization status
  updateDashboardButtonStates(stats);
}

// Update school name displays with proper fallbacks
function updateSchoolNameDisplay(schoolName, teamInfo) {
  const displayName = schoolName || teamInfo?.schoolName || 'Unknown School';
  
  if (elements.school_name) {
    elements.school_name.textContent = displayName;
  }
  
  if (elements.dashboard_school_name) {
    elements.dashboard_school_name.textContent = displayName;
  }
}

// Handle data update messages from background
function handleDataUpdate(message) {
  console.log('Handling data update:', message);
  
  // Refresh relevant data based on update type
  if (message.recruitsUpdated) {
    loadRecruitsData();
  }
  
  if (message.statsUpdated) {
    refreshDashboardData();
  }
  
  // Update status if provided
  if (message.status) {
    setStatusMessage(message.status, message.statusType || 'info');
  }
}

// Handle team change notifications
function handleTeamChange(teamInfo) {
  console.log('Team changed:', teamInfo);
  
  // Update displays immediately
  updateSchoolNameDisplay(null, teamInfo);
  
  // Reload all data for new team
  setTimeout(() => {
    loadInitialData();
  }, 1000);
}

// Utility function to format dates consistently
function formatDate(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'Invalid Date';
  }
}

// Helper function to format hometown for URL (remove space before state abbreviation)
const formatHometownForUrl = (hometown) => {
  if (!hometown) return '';
  // Remove space before state abbreviation (e.g., "City, ST" -> "City,ST")
  return hometown.replace(/,\s+([A-Z]{2})$/, ',$1');
};


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

// Setup filter event listeners
function setupFilterListeners() {
  // Position filter
  if (elements.filter_position) {
    elements.filter_position.addEventListener('change', (event) => {
      state.filters.position = event.target.value;
      applyFilters();
    });
  }
  
  // Potential filter
  if (elements.filter_potential) {
    elements.filter_potential.addEventListener('change', (event) => {
      state.filters.potential = event.target.value;
      applyFilters();
    });
  }
  
  // Division filter
  if (elements.filter_division) {
    elements.filter_division.addEventListener('change', (event) => {
      state.filters.division = event.target.value;
      applyFilters();
    });
  }
    // Priority filter
  if (elements.filter_priority) {
    elements.filter_priority.addEventListener('change', (event) => {
      state.filters.priority = event.target.value;
      console.log(`Priority filter changed to: "${state.filters.priority}" (type: ${typeof state.filters.priority})`);
      applyFilters();
    });
  }
  
  // Distance filter
  if (elements.filter_distance) {
    elements.filter_distance.addEventListener('change', (event) => {
      state.filters.distance = event.target.value;
      applyFilters();
    });
  }
  // Watched only checkbox
  if (elements.filter_watched) {
    elements.filter_watched.addEventListener('change', (event) => {
      try {
        console.log('Watched filter changing, checked:', event.target.checked);
        state.filters.watched = event.target.checked ? 'true' : '';
        console.log('New filter state:', state.filters.watched);
        applyFilters();
        console.log('Filters applied successfully');
      } catch (error) {
        console.error('Error handling watched filter change:', error);
        handleError(error, 'watched filter');
      }
    });
  }
  
  // Hide signed checkbox
  if (elements.filter_hide_signed) {
    elements.filter_hide_signed.addEventListener('change', (event) => {
      state.filters.hide_signed = event.target.checked;
      applyFilters();
    });
  }
}

// Setup pagination event listeners
function setupPaginationListeners() {
  // Previous page button
  if (elements.prev_page_btn) {
    elements.prev_page_btn.addEventListener('click', () => {
      changePage(-1);
    });
  }
  
  // Next page button
  if (elements.next_page_btn) {
    elements.next_page_btn.addEventListener('click', () => {
      changePage(1);
    });
  }
  
  // Page size selector
  if (elements.page_size_select) {
    elements.page_size_select.addEventListener('change', handlePageSizeChange);
  }
}

// Handle page navigation
function changePage(direction) {
  if (state.show_all_results) return;
  
  const totalPages = Math.ceil(state.filtered_recruits.length / state.items_per_page);
  const newPage = state.current_page + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    state.current_page = newPage;
    updateRecruitsList();
    updatePaginationDisplay();
  }
}

// Handle page size change
async function handlePageSizeChange(event) {
  try {
    const newPageSize = event.target.value;
    
    if (newPageSize === 'all') {
      state.show_all_results = true;
      state.items_per_page = state.filtered_recruits.length;
    } else {
      state.show_all_results = false;
      state.items_per_page = parseInt(newPageSize, 10);
      
      // Save preference to storage
      await chrome.storage.local.set({
        [PAGE_SIZE_STORAGE_KEY]: state.items_per_page
      });
    }
    
    // Reset to first page and update display
    state.current_page = 1;
    updateRecruitsList();
    updatePaginationDisplay();
    
  } catch (error) {
    handleError(error, 'page size change');
  }
}

// Setup settings event listeners
function setupSettingsListeners() {
  // Data management buttons
  if (elements.btn_export_data) {
    elements.btn_export_data.addEventListener('click', handleExportData);
  }
  
  if (elements.btn_import_data) {
    elements.btn_import_data.addEventListener('click', handleImportData);
  }
  
  if (elements.btn_clear_data) {
    elements.btn_clear_data.addEventListener('click', handleClearData);
  }
  
  if (elements.btn_refresh_data) {
    elements.btn_refresh_data.addEventListener('click', handleRefreshAllData);
  }
  
  if (elements.btn_check_db) {
    elements.btn_check_db.addEventListener('click', handleCheckDatabase);
  }
  
  // Role ratings configuration
  if (elements.btn_edit_role_ratings) {
    elements.btn_edit_role_ratings.addEventListener('click', handleEditRoleRatings);
  }
  
  if (elements.btn_reset_role_ratings) {
    elements.btn_reset_role_ratings.addEventListener('click', handleResetRoleRatings);
  }
  
  // Bold attributes configuration
  if (elements.btn_edit_bold_attributes) {
    elements.btn_edit_bold_attributes.addEventListener('click', handleEditBoldAttributes);
  }
  
  if (elements.btn_reset_bold_attributes) {
    elements.btn_reset_bold_attributes.addEventListener('click', handleResetBoldAttributes);
  }
  
  // Column visibility
  if (elements.btn_column_visibility) {
    elements.btn_column_visibility.addEventListener('click', openColumnVisibilityModal);
  }
}

// Setup modal event listeners
function setupModalListeners() {
  // Column visibility modal
  setupColumnVisibilityModalListeners();
  
  // Role ratings modal
  setupRoleRatingsModalListeners();
  
  // Bold attributes modal
  setupBoldAttributesModalListeners();
  
  // Season modal is setup in showSeasonModal()
}

// Handle export data functionality
async function handleExportData() {
  try {
    setStatusMessage('Preparing data export...', 'info');
    
    // Get all data from background script
    const response = await popupComms.sendMessageToBackground({
      action: 'exportData'
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Create export data structure
    const exportData = {
      exportDate: new Date().toISOString(),
      version: await getFullVersionString(),
      recruits: response.recruits || [],
      settings: {
        roleRatings: response.roleRatings || {},
        boldAttributes: response.boldAttributes || {},
        columnVisibility: state.column_visibility,
        pageSize: state.items_per_page
      },
      metadata: {
        totalRecruits: response.recruits ? response.recruits.length : 0,
        currentSeason: response.currentSeason || null
      }
    };
    
    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gd-recruit-data-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setStatusMessage('Data exported successfully', 'success');
    
  } catch (error) {
    handleError(error, 'data export');
  }
}

// Handle import data functionality
async function handleImportData() {
  try {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        setStatusMessage('Processing import file...', 'info');
        
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Validate import data structure
        if (!importData.recruits || !Array.isArray(importData.recruits)) {
          throw new Error('Invalid import file: missing or invalid recruits data');
        }
        
        // Confirm import
        const confirmMessage = `Import ${importData.recruits.length} recruits from ${importData.exportDate || 'unknown date'}?\n\nThis will replace existing data.`;
        if (!confirm(confirmMessage)) {
          setStatusMessage('Import cancelled', 'info');
          return;
        }
        
        // Send import data to background script
        const response = await popupComms.sendMessageToBackground({
          action: 'importData',
          data: importData
        });
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        // Update local state with imported settings
        if (importData.settings) {
          if (importData.settings.columnVisibility) {
            Object.assign(state.column_visibility, importData.settings.columnVisibility);
            await chrome.storage.local.set({
              [COLUMN_VISIBILITY_STORAGE_KEY]: state.column_visibility
            });
          }
          
          if (importData.settings.pageSize) {
            state.items_per_page = importData.settings.pageSize;
            await chrome.storage.local.set({
              [PAGE_SIZE_STORAGE_KEY]: state.items_per_page
            });
            if (elements.page_size_select) {
              elements.page_size_select.value = state.items_per_page.toString();
            }
          }
        }
        
        // Reload all data
        await loadInitialData();
        setStatusMessage(`Successfully imported ${importData.recruits.length} recruits`, 'success');
        
      } catch (error) {
        console.error('Import error:', error);
        setStatusMessage('Import failed: ' + error.message, 'error');
      }
    };
    
    // Trigger file selection
    input.click();
    
  } catch (error) {
    handleError(error, 'data import');
  }
}

// Handle clear data functionality
async function handleClearData() {
  try {
    const confirmed = confirm('Are you sure you want to clear all recruit data? This action cannot be undone.');
    if (!confirmed) return;
    
    setStatusMessage('Clearing data...', 'info');
      const response = await popupComms.sendMessageToBackground({
      action: 'clearAllData'
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Reset local state
    state.recruits = [];
    state.filtered_recruits = [];
    state.current_page = 1;
    
    // Update displays
    updateRecruitsList();
    updatePaginationDisplay();
    await refreshDashboardData();
    
    setStatusMessage('Data cleared successfully', 'success');
    
  } catch (error) {
    handleError(error, 'data clearing');
  }
}

// Handle refresh all data functionality
async function handleRefreshAllData() {
  try {
    setStatusMessage('Refreshing all data...', 'info');
    
    // Reload everything
    await loadInitialData();
    
    setStatusMessage('All data refreshed successfully', 'success');
    
  } catch (error) {
    handleError(error, 'data refresh');
  }
}

// Handle database check functionality
async function handleCheckDatabase() {
  try {
    setStatusMessage('Checking database...', 'info');
      const response = await popupComms.sendMessageToBackground({
      action: 'checkDatabaseStatus'
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    setStatusMessage(response.message || 'Database check completed', 'success');
    
  } catch (error) {
    handleError(error, 'database check');
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
    console.log('Starting reset of role ratings to defaults');

    const response = await sendMessageToBackground({ 
      action: 'resetRoleRatings' 
    });

    console.log('Reset role ratings response:', response);

    if (!response.success) {
      throw new Error(response.error || 'Failed to reset role ratings');
    }

    const successMessage = `Role ratings reset to defaults. Recalculated ${response.recalculated} of ${response.totalRecruits} recruits.`;
    setStatusMessage(successMessage, 'success');
    console.log('Reset completed:', successMessage);

    // Force a complete data refresh to show updated ratings
    setStatusMessage('Refreshing recruit data...', 'info');
    
    // Clear current data to force fresh load
    state.recruits = [];
    state.filtered_recruits = [];
    
    // Refresh recruits data completely
    await loadRecruitsData();
    
    // If we're on the recruits tab, update the display
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab?.id === 'tab-recruits') {
      applyFilters();
      updateRecruitsList();
      console.log('Recruits list refreshed after role ratings reset');
    }
    
    setStatusMessage('Role ratings reset and data refreshed successfully', 'success');

  } catch (error) {
    console.error('Error resetting role ratings:', error);
    setStatusMessage('Error resetting role ratings: ' + error.message, 'error');
  }
}



// Helper function for background communication - matches sidebar implementation
function sendMessageToBackground(message) {
  return popupComms.sendMessageToBackground(message);
}

// Setup column visibility modal listeners
function setupColumnVisibilityModalListeners() {
  if (elements.column_visibility_save) {
    elements.column_visibility_save.addEventListener('click', handleSaveColumnVisibility);
  }
  
  if (elements.column_visibility_reset) {
    elements.column_visibility_reset.addEventListener('click', handleResetColumnVisibility);
  }
  
  if (elements.column_visibility_cancel) {
    elements.column_visibility_cancel.addEventListener('click', closeColumnVisibilityModal);
  }
  
  // Close button
  const closeButton = elements.column_visibility_modal?.querySelector('.close');
  if (closeButton) {
    closeButton.addEventListener('click', closeColumnVisibilityModal);
  }
  
  // Close on backdrop click
  if (elements.column_visibility_modal) {
    elements.column_visibility_modal.addEventListener('click', (event) => {
      if (event.target === elements.column_visibility_modal) {
        closeColumnVisibilityModal();
      }
    });
  }
}

// Open column visibility modal
function openColumnVisibilityModal() {
  if (!validateElement(elements.column_visibility_modal, 'column-visibility-modal')) return;
  
  populateColumnVisibilityGrid();
  elements.column_visibility_modal.classList.remove('hidden');
}

// Close column visibility modal
function closeColumnVisibilityModal() {
  if (elements.column_visibility_modal) {
    elements.column_visibility_modal.classList.add('hidden');
  }
}

// Populate column visibility grid
function populateColumnVisibilityGrid() {
  if (!elements.column_visibility_grid) return;
  
  elements.column_visibility_grid.innerHTML = '';
  
  COLUMNS.forEach(column => {
    const item = document.createElement('div');
    item.className = 'column-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `col-${column.key}`;
    checkbox.checked = state.column_visibility[column.key] !== false;
    
    const label = document.createElement('label');
    label.htmlFor = `col-${column.key}`;
    label.textContent = column.label;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    elements.column_visibility_grid.appendChild(item);
  });
}

// Handle save column visibility
async function handleSaveColumnVisibility() {
  try {
    // Collect checkbox states
    const newVisibility = {};
    COLUMNS.forEach(column => {
      const checkbox = document.getElementById(`col-${column.key}`);
      newVisibility[column.key] = checkbox ? checkbox.checked : true;
    });
    
    // Update state
    Object.assign(state.column_visibility, newVisibility);
    
    // Save to storage
    await chrome.storage.local.set({
      [COLUMN_VISIBILITY_STORAGE_KEY]: state.column_visibility
    });
    
    // Apply changes
    applyColumnVisibility();
    closeColumnVisibilityModal();
    
    setStatusMessage('Column visibility updated', 'success');
    
  } catch (error) {
    handleError(error, 'column visibility save');
  }
}

// Handle reset column visibility
async function handleResetColumnVisibility() {
  try {
    // Reset all to visible
    Object.keys(state.column_visibility).forEach(key => {
      state.column_visibility[key] = true;
    });
    
    // Save to storage
    await chrome.storage.local.set({
      [COLUMN_VISIBILITY_STORAGE_KEY]: state.column_visibility
    });
    
    // Repopulate grid and apply changes
    populateColumnVisibilityGrid();
    applyColumnVisibility();
    
    setStatusMessage('Column visibility reset to default', 'success');
    
  } catch (error) {
    handleError(error, 'column visibility reset');
  }
}

// Setup role ratings modal event listeners
function setupRoleRatingsModalListeners() {
  // Close button
  if (elements.role_ratings_modal_close) {
    elements.role_ratings_modal_close.addEventListener('click', closeRoleRatingsModal);
  }
  
  // Cancel button
  if (elements.role_ratings_cancel) {
    elements.role_ratings_cancel.addEventListener('click', closeRoleRatingsModal);
  }
  
  // Save button
  if (elements.role_ratings_save) {
    elements.role_ratings_save.addEventListener('click', handleSaveRoleRatings);
  }
  
  // Reset position button
  if (elements.role_reset_position) {
    elements.role_reset_position.addEventListener('click', handleResetCurrentPosition);
  }
  
  // Recalculate button
  if (elements.role_recalculate) {
    elements.role_recalculate.addEventListener('click', handleRecalculateAllRatings);
  }
  
  // Debug button (if enabled)
  if (elements.role_debug) {
    elements.role_debug.addEventListener('click', handleDebugRoleRatings);
  }
  
  // Close on backdrop click
  if (elements.role_ratings_modal) {
    elements.role_ratings_modal.addEventListener('click', (event) => {
      if (event.target === elements.role_ratings_modal) {
        closeRoleRatingsModal();
      }
    });
  }
}

// Handle edit role ratings - enhanced implementation
async function handleEditRoleRatings() {
  try {
    setStatusMessage('Loading role ratings configuration...', 'info');
    await showRoleRatingsModal();
  } catch (error) {
    handleError(error, 'role ratings editor');
  }
}

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

    state.role_ratings.data = response.ratings;
    state.role_ratings.has_changes = false;
    state.role_ratings.active_roles = {};

    // Setup position tabs and content
    setupPositionTabs();
    
    // Show modal
    if (elements.role_ratings_modal) {
      elements.role_ratings_modal.classList.remove('hidden');
    }

    // Select first position by default
    const firstTab = elements.position_tabs?.querySelector('.position-tab');
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
 * Setup position tabs for the role ratings modal
 */
function setupPositionTabs() {
  if (!elements.position_tabs || !state.role_ratings.data) return;

  // Clear existing tabs
  elements.position_tabs.innerHTML = '';

  // Create tabs for each position
  for (const [positionKey, positionData] of Object.entries(state.role_ratings.data)) {
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

    elements.position_tabs.appendChild(tab);
  }
}

/**
 * Select a position and update the content area
 */
function selectPosition(positionKey) {
  if (!state.role_ratings.data || !state.role_ratings.data[positionKey]) return;

  // Update active tab
  const tabs = elements.position_tabs?.querySelectorAll('.position-tab');
  tabs?.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.position === positionKey);
  });

  // Update current position
  state.role_ratings.current_position = positionKey;

  // Generate content for this position
  generatePositionContent(positionKey);
}

/**
 * Generate content for a specific position
 */
function generatePositionContent(positionKey) {
  if (!elements.position_content || !state.role_ratings.data[positionKey]) return;

  const positionData = state.role_ratings.data[positionKey];
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
  elements.position_content.innerHTML = html;

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
        <label for="${roleId}-${attr}">${attributeLabels[attr] || attr.toUpperCase()}</label>
        <input 
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
  const inputs = elements.position_content?.querySelectorAll('.attribute-input');
  
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
  if (state.role_ratings.data[positionKey] && state.role_ratings.data[positionKey][roleKey]) {
    state.role_ratings.data[positionKey][roleKey].attributes[attribute] = newValue;
    state.role_ratings.has_changes = true;

    // Update visual styling based on value with smooth transitions
    const currentClasses = input.className.split(' ').filter(cls => !['high', 'medium', 'low'].includes(cls));
    let validationClass = 'low';
    if (newValue > 80) validationClass = 'high';
    else if (newValue > 40) validationClass = 'medium';
    
    input.className = [...currentClasses, validationClass].join(' ');

    // Add a subtle visual feedback for the change
    input.style.transform = 'scale(1.05)';
    setTimeout(() => {
      input.style.transform = '';
    }, 150);

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
  const roleData = state.role_ratings.data[positionKey]?.[roleKey];
  
  if (!roleData) return;

  const card = elements.position_content?.querySelector(`[data-role="${roleId}"]`);
  const totalElement = card?.querySelector('.total-value');
  
  if (!card || !totalElement) return;

  const total = calculateRoleTotal(roleData.attributes);
  const isValid = Math.abs(total - 100) < 0.1;
  const wasValid = card.classList.contains('valid');

  // Update total display
  totalElement.textContent = total.toFixed(1);

  // Update validation classes
  card.classList.toggle('valid', isValid);
  card.classList.toggle('invalid', !isValid);
  
  const totalContainer = card.querySelector('.role-total');
  totalContainer?.classList.toggle('valid', isValid);
  totalContainer?.classList.toggle('invalid', !isValid);

  // Add visual feedback animation if validation state changed
  if (wasValid !== isValid) {
    card.classList.add('validation-changed');
    setTimeout(() => {
      card.classList.remove('validation-changed');
    }, 300);
  }

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
  if (!elements.role_ratings_save || !state.role_ratings.data) return;

  let allValid = true;
  
  // Check all active roles
  for (const [positionKey, positionData] of Object.entries(state.role_ratings.data)) {
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

  elements.role_ratings_save.disabled = !allValid;
  elements.role_ratings_save.classList.toggle('disabled', !allValid);
}

/**
 * Handle save role ratings
 */
async function handleSaveRoleRatings() {
  if (!state.role_ratings.has_changes) {
    setStatusMessage('No changes to save', 'info');
    return;
  }

  try {
    setStatusMessage('Validating role ratings...');

    // Validate all active roles have totals of 100
    const validationErrors = [];
    
    // Track which positions have been modified for targeted recalculation
    const changedPositions = new Set();
    
    // Check all roles, including the currently edited one
    for (const [positionKey, positionData] of Object.entries(state.role_ratings.data)) {
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
    
    // If any validation errors exist, show them
    if (validationErrors.length > 0) {
      const message = 'The following roles have invalid totals:\n\n' + validationErrors.join('\n') + '\n\nPlease fix these before saving.';
      alert(message);
      return;
    }
    
    // Deep clone the data to avoid reference issues
    const ratingsToSave = JSON.parse(JSON.stringify(state.role_ratings.data));
    
    setStatusMessage('Saving role ratings...');
    console.log('Saving role ratings with changed positions:', Array.from(changedPositions));

    const response = await sendMessageToBackground({
      action: 'saveRoleRatings',
      ratings: ratingsToSave,
      changedPositions: Array.from(changedPositions) // Convert Set to Array
    });

    console.log('Save role ratings response:', response);

    if (!response.success) {
      throw new Error(response.error || 'Failed to save role ratings');
    }

    state.role_ratings.has_changes = false;

    // Show detailed feedback about recalculation
    const recalcMessage = response.recalculated > 0 
      ? `Role ratings saved successfully. Recalculated ${response.recalculated} of ${response.totalRecruits} recruits.`
      : 'Role ratings saved successfully. No recruits needed recalculation.';
    
    setStatusMessage(recalcMessage, 'success');
    console.log('Role ratings save completed:', recalcMessage);

    // Close modal
    closeRoleRatingsModal();

    // Force a complete data refresh to ensure updated role ratings are visible
    setStatusMessage('Refreshing recruit data...', 'info');
    
    // Clear current data to force fresh load
    state.recruits = [];
    state.filtered_recruits = [];
    
    // Refresh recruits data completely
    await loadRecruitsData();
    
    // If we're on the recruits tab, also update the display
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab?.id === 'tab-recruits') {
      // Apply current filters and update display
      applyFilters();
      updateRecruitsList();
      console.log('Recruits list refreshed after role ratings save');
    }
    
    setStatusMessage('Role ratings applied and data refreshed successfully', 'success');

  } catch (error) {
    console.error('Error saving role ratings:', error);
    setStatusMessage('Error saving role ratings: ' + error.message, 'error');
  }
}

/**
 * Handle reset current position to defaults
 */
async function handleResetCurrentPosition() {
  if (!state.role_ratings.current_position) {
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
    const defaultPositionData = defaultData.roleRatings[state.role_ratings.current_position];

    if (!defaultPositionData) {
      throw new Error('Default position data not found');
    }

    // Update the position data with defaults
    state.role_ratings.data[state.role_ratings.current_position] = JSON.parse(JSON.stringify(defaultPositionData));
    state.role_ratings.has_changes = true;

    // Regenerate the position content
    generatePositionContent(state.role_ratings.current_position);

    setStatusMessage('Position reset to default values', 'success');

  } catch (error) {
    console.error('Error resetting position:', error);
    setStatusMessage('Error resetting position: ' + error.message, 'error');
  }
}

/**
 * Handle recalculate all ratings
 */
async function handleRecalculateAllRatings() {
  if (!confirm('This will recalculate role ratings for all recruits using current settings. This may take a moment. Continue?')) {
    return;
  }

  try {
    setStatusMessage('Recalculating all role ratings...');
    console.log('Starting recalculation of all role ratings');

    const response = await sendMessageToBackground({ 
      action: 'recalculateRoleRatings'
    });

    console.log('Recalculate response:', response);

    if (!response.success) {
      throw new Error(response.error || 'Failed to recalculate ratings');
    }

    const successMessage = `Successfully recalculated ratings for ${response.recalculated} of ${response.totalRecruits} recruits`;
    setStatusMessage(successMessage, 'success');
    console.log('Recalculation completed:', successMessage);

    // Force a complete data refresh to show updated ratings
    setStatusMessage('Refreshing recruit data...', 'info');
    
    // Clear current data to force fresh load
    state.recruits = [];
    state.filtered_recruits = [];
    
    // Refresh recruits data completely
    await loadRecruitsData();
    
    // If we're on the recruits tab, update the display
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab?.id === 'tab-recruits') {
      applyFilters();
      updateRecruitsList();
      console.log('Recruits list refreshed after recalculation');
    }
    
    setStatusMessage('Role ratings recalculated and data refreshed successfully', 'success');

  } catch (error) {
    console.error('Error recalculating ratings:', error);
    setStatusMessage('Error recalculating ratings: ' + error.message, 'error');
  }
}

// Handle debug role ratings (developer feature)
function handleDebugRoleRatings() {
  console.log('=== ROLE RATINGS DEBUG INFO ===');
  console.log('Current role ratings state:', state.role_ratings);
  console.log('Role ratings data:', state.role_ratings.data);
  
  // Show detailed information about current configuration
  if (state.role_ratings.data) {
    console.log('=== POSITION ANALYSIS ===');
    for (const [positionKey, positionData] of Object.entries(state.role_ratings.data)) {
      console.log(`\n${getPositionDisplayName(positionKey)} (${positionKey}):`);
      
      for (const [roleKey, roleData] of Object.entries(positionData)) {
        if (roleData.isActive) {
          const total = calculateRoleTotal(roleData.attributes);
          const isValid = Math.abs(total - 100) < 0.1;
          console.log(`  - ${roleData.roleLabel}: total=${total.toFixed(1)} (${isValid ? 'VALID' : 'INVALID'})`);
          console.log(`    Attributes:`, roleData.attributes);
        }
      }
    }
  }
  
  // Show sample recruit role ratings if available
  if (state.recruits && state.recruits.length > 0) {
    console.log('\n=== SAMPLE RECRUIT ROLE RATINGS ===');
    const sampleRecruits = state.recruits.slice(0, 3);
    sampleRecruits.forEach(recruit => {
      console.log(`${recruit.name} (${recruit.pos}):`);
      if (recruit.r1 !== undefined) console.log(`  R1: ${recruit.r1}`);
      if (recruit.r2 !== undefined) console.log(`  R2: ${recruit.r2}`);
      if (recruit.r3 !== undefined) console.log(`  R3: ${recruit.r3}`);
      if (recruit.r4 !== undefined) console.log(`  R4: ${recruit.r4}`);
      if (recruit.r5 !== undefined) console.log(`  R5: ${recruit.r5}`);
      if (recruit.r6 !== undefined) console.log(`  R6: ${recruit.r6}`);
    });
  }
  
  console.log('=== END DEBUG INFO ===');
  
  const debugSummary = `Debug information logged to console. Check browser developer tools.
  
Configuration Status: ${state.role_ratings.data ? 'Loaded' : 'Not loaded'}
Has Changes: ${state.role_ratings.has_changes ? 'Yes' : 'No'}
Current Position: ${state.role_ratings.current_position || 'None'}
Total Recruits: ${state.recruits ? state.recruits.length : 0}`;

  alert(debugSummary);
}

/**
 * Close role ratings modal with change confirmation
 */
function closeRoleRatingsModal() {
  if (state.role_ratings.has_changes) {
    if (!confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
      return;
    }
  }

  if (elements.role_ratings_modal) {
    elements.role_ratings_modal.classList.add('hidden');
  }

  // Reset state
  state.role_ratings.data = null;
  state.role_ratings.current_position = null;
  state.role_ratings.active_roles = {};
  state.role_ratings.has_changes = false;
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

// Apply column visibility to recruits table
function applyColumnVisibility() {
  try {
    const table = document.getElementById('recruits-table');
    if (!table) {
      console.warn('Recruits table not found for column visibility');
      return;
    }
    
    const headerRow = table.querySelector('thead tr');
    const dataRows = table.querySelectorAll('tbody tr');
    
    if (!headerRow) {
      console.warn('Table header row not found');
      return;
    }
      // Ensure COLUMNS array exists
    if (!COLUMNS || !Array.isArray(COLUMNS)) {
      console.warn('COLUMNS array not found or invalid');
      return;
    }
    
    // Ensure column visibility state exists
    if (!state.column_visibility) {
      console.warn('Column visibility state not initialized');
      return;
    }
    
    // Apply to header
    const headerCells = headerRow.querySelectorAll('th');
    headerCells.forEach((cell, index) => {
      try {
        if (index < COLUMNS.length) {
          const column = COLUMNS[index];
          const isVisible = state.column_visibility[column.key] !== false;
          cell.style.display = isVisible ? '' : 'none';
        }
      } catch (cellError) {
        console.warn(`Error applying visibility to header cell ${index}:`, cellError);
      }
    });
    
    // Apply to data rows
    dataRows.forEach((row, rowIndex) => {
      try {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
          try {
            if (index < COLUMNS.length) {
              const column = COLUMNS[index];
              const isVisible = state.column_visibility[column.key] !== false;
              cell.style.display = isVisible ? '' : 'none';
            }
          } catch (cellError) {
            console.warn(`Error applying visibility to cell ${rowIndex},${index}:`, cellError);
          }
        });
      } catch (rowError) {
        console.warn(`Error processing row ${rowIndex}:`, rowError);
      }
    });
    
  } catch (error) {
    console.error('Error in applyColumnVisibility:', error);
    handleError(error, 'applying column visibility');
  }
}

// Setup filter dropdown options
function setupFilterOptions() {
  // Initialize empty dropdowns
  if (elements.filter_position) {
    elements.filter_position.innerHTML = '<option value="">All Positions</option>';
  }
  
  if (elements.filter_potential) {
    elements.filter_potential.innerHTML = '<option value="">All Potentials</option>';
  }
  
  if (elements.filter_division) {
    elements.filter_division.innerHTML = '<option value="">All Divisions</option>';
  }
  
  if (elements.filter_priority) {
    elements.filter_priority.innerHTML = '<option value="">All Priorities</option>';
  }
  
  if (elements.filter_distance) {
    elements.filter_distance.innerHTML = '<option value="">All Distances</option>';
  }
}

// Refresh recruits display when tab becomes active
function refreshRecruitsDisplay() {
  console.log('=== refreshRecruitsDisplay START ===');
  try {
    console.log('refreshRecruitsDisplay called, current state.recruits:', state.recruits);
    
    // Ensure state.recruits exists and is an array
    if (!state.recruits || !Array.isArray(state.recruits)) {
      console.warn('state.recruits is not initialized or not an array, initializing...');
      state.recruits = [];
    }
    
    // Ensure filtered_recruits exists  
    if (!state.filtered_recruits || !Array.isArray(state.filtered_recruits)) {
      console.warn('state.filtered_recruits is not initialized, initializing...');
      state.filtered_recruits = [];
    }
    
    if (state.recruits.length === 0) {
      console.log('No recruits data, attempting to load...');
      // Try to load data if not already loaded
      loadRecruitsData().catch(error => {
        console.error('Error loading recruits data:', error);
        if (error === null) {
          console.error('CAUGHT NULL ERROR in loadRecruitsData!');
        }
        // Don't call handleError to prevent cascades
        setStatusMessage(`Error loading data: ${error && error.message ? error.message : 'Unknown error'}`, 'error');
      });
    } else {
      console.log(`Refreshing display with ${state.recruits.length} recruits`);
      // Just refresh the display
      console.log('Calling updateRecruitsList...');
      updateRecruitsList();
      console.log('Calling updatePaginationDisplay...');
      updatePaginationDisplay();
      console.log('Display refresh completed');
    }
    console.log('=== refreshRecruitsDisplay END ===');
  } catch (error) {
    console.error('Error in refreshRecruitsDisplay:', error);
    console.error('Error type:', typeof error, 'Error value:', error);
    
    if (error === null) {
      console.error('CAUGHT NULL ERROR in refreshRecruitsDisplay main block!');
    }
    
    // Don't call handleError to prevent cascades
    setStatusMessage(`Error refreshing display: ${error && error.message ? error.message : 'Unknown error'}`, 'error');
    
    // Fallback: ensure we have basic state
    if (!state.recruits) {
      state.recruits = [];
    }
    if (!state.filtered_recruits) {
      state.filtered_recruits = [];
    }
    try {
      updateRecruitsList();
    } catch (fallbackError) {
      console.error('Error in fallback updateRecruitsList:', fallbackError);
    }
  }
}

// Setup basic table sorting functionality
function setupTableSorting() {
  const table = document.getElementById('recruits-table');
  if (!table) return;
  
  const headerCells = table.querySelectorAll('thead th');
  headerCells.forEach((header, index) => {
    if (index < COLUMNS.length && COLUMNS[index].sortable) {
      header.style.cursor = 'pointer';
      header.title = `Click to sort by ${COLUMNS[index].label}`;
      
      header.addEventListener('click', () => {
        sortTable(COLUMNS[index].key);
      });
    }
  });
}

// Sort table by column
function sortTable(columnKey) {
  // Toggle sort direction if same column, otherwise default to ascending
  if (state.sorting.column === columnKey) {
    state.sorting.direction = state.sorting.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.sorting.column = columnKey;
    state.sorting.direction = 'asc';
  }
  
  // Sort the filtered recruits
  state.filtered_recruits.sort((a, b) => {
    let valueA = a[columnKey] || '';
    let valueB = b[columnKey] || '';
    
    // Handle numeric columns
    if (isNumericColumn(columnKey)) {
      valueA = parseFloat(valueA) || 0;
      valueB = parseFloat(valueB) || 0;
    } else {
      // String comparison
      valueA = valueA.toString().toLowerCase();
      valueB = valueB.toString().toLowerCase();
    }
    
    let comparison = 0;
    if (valueA > valueB) {
      comparison = 1;
    } else if (valueA < valueB) {
      comparison = -1;
    }
    
    return state.sorting.direction === 'desc' ? -comparison : comparison;
  });
  
  // Update display
  updateRecruitsList();
  updateSortIndicators();
}

// Check if column contains numeric data
function isNumericColumn(columnKey) {
  const numericColumns = [
    'height', 'weight', 'rating', 'rank', 'miles', 'gpa',
    'ath', 'spd', 'dur', 'we', 'sta', 'str', 'blk', 'tkl',
    'han', 'gi', 'elu', 'tec', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'
  ];
  return numericColumns.includes(columnKey);
}

// Update sort indicators in table headers
function updateSortIndicators() {
  const table = document.getElementById('recruits-table');
  if (!table) return;
  
  const headerCells = table.querySelectorAll('thead th');
  headerCells.forEach((header, index) => {
    // Remove existing sort indicators
    header.classList.remove('sort-asc', 'sort-desc');
    
    if (index < COLUMNS.length && COLUMNS[index].key === state.sorting.column) {
      header.classList.add(`sort-${state.sorting.direction}`);
    }
  });
}



// Load recruits data from background script
async function loadRecruitsData() {
  try {
    setStatusMessage('Loading recruits...', 'info');
    
    // Load recruits and page size preference in parallel
    const [recruitsResponse] = await Promise.all([
      popupComms.sendMessageToBackground({ action: 'getRecruits' }),
      loadPageSizePreference()
    ]);
    
    if (recruitsResponse.error) {
      throw new Error(recruitsResponse.error);
    }
    
    state.recruits = recruitsResponse.recruits || [];
    console.log(`Loaded ${state.recruits.length} recruits from storage`);
    
    // Debug: Log watched recruits count
    const watchedCount = state.recruits.filter(recruit => recruit.watched === 1).length;
    console.log(`Found ${watchedCount} watched recruits`);
    
    // Populate filter options
    populateFilterOptions();
    
    // Apply filters and update display
    applyFilters();
    
    // Setup table sorting after data is loaded
    setupTableSorting();
    
    state.last_data_refresh = Date.now();
    
  } catch (error) {
    handleError(error, 'recruits data loading');
    
    // Reset to safe defaults
    state.recruits = [];
    state.filtered_recruits = [];
    updateRecruitsList();
  }
}

// Load page size preference from storage
async function loadPageSizePreference() {
  try {
    const result = await chrome.storage.local.get(PAGE_SIZE_STORAGE_KEY);
    if (result[PAGE_SIZE_STORAGE_KEY]) {
      const pageSize = parseInt(result[PAGE_SIZE_STORAGE_KEY], 10);
      if (pageSize > 0) {
        state.items_per_page = pageSize;
        if (elements.page_size_select) {
          elements.page_size_select.value = pageSize.toString();
        }
      }
    }
  } catch (error) {
    console.warn('Could not load page size preference:', error);
  }
}

// Populate all filter dropdown options
function populateFilterOptions() {
  populatePositionFilter();
  populatePotentialFilter();
  populateDivisionFilter();
  populatePriorityFilter();
  populateDistanceFilter();
}

// Populate position filter dropdown
function populatePositionFilter() {
  if (!elements.filter_position) return;
  
  // Get unique positions from recruits
  const availablePositions = [...new Set(state.recruits.map(r => r.pos).filter(Boolean))];
  
  // Sort positions according to custom order, with unknown positions at the end
  const sortedPositions = availablePositions.sort((a, b) => {
    const indexA = POSITION_DROPDOWN_ORDER.indexOf(a);
    const indexB = POSITION_DROPDOWN_ORDER.indexOf(b);
    
    // If both positions are in the custom order, sort by their index
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one position is in the custom order, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // If neither position is in the custom order, sort alphabetically
    return a.localeCompare(b);
  });
  
  // Clear existing options except "All"
  elements.filter_position.innerHTML = '<option value="">All Positions</option>';
  
  // Add positions in custom order with counts
  sortedPositions.forEach(position => {
    const count = state.recruits.filter(r => r.pos === position).length;
    const option = document.createElement('option');
    option.value = position;
    option.textContent = `${position} (${count})`;
    elements.filter_position.appendChild(option);
  });
  
  // Add custom groups with counts
  Object.entries(CUSTOM_POSITION_GROUPS).forEach(([groupKey, groupData]) => {
    const count = state.recruits.filter(r => groupData.positions.includes(r.pos)).length;
    const option = document.createElement('option');
    option.value = groupKey;
    option.textContent = `${groupData.label} (${count})`;
    if (count === 0) {
      option.style.color = '#888'; // Gray out if no recruits
    }
    elements.filter_position.appendChild(option);
  });
}

// Populate potential filter dropdown
function populatePotentialFilter() {
  if (!elements.filter_potential) return;
  
  const potentials = [...new Set(state.recruits.map(r => r.potential).filter(Boolean))].sort();
  
  elements.filter_potential.innerHTML = '<option value="">All Potentials</option>';
  
  potentials.forEach(potential => {
    const count = state.recruits.filter(r => r.potential === potential).length;
    const option = document.createElement('option');
    option.value = potential;
    option.textContent = `${potential} (${count})`;
    elements.filter_potential.appendChild(option);
  });
}

// Populate division filter dropdown
function populateDivisionFilter() {
  if (!elements.filter_division) return;
  
  const divisions = [...new Set(state.recruits.map(r => r.division).filter(Boolean))].sort();
  
  elements.filter_division.innerHTML = '<option value="">All Divisions</option>';
  
  divisions.forEach(division => {
    const count = state.recruits.filter(r => r.division === division).length;
    const option = document.createElement('option');
    option.value = division;
    option.textContent = `${division} (${count})`;
    elements.filter_division.appendChild(option);
  });
}

// Populate priority filter dropdown
function populatePriorityFilter() {
  if (!elements.filter_priority) return;
  
  // Priority levels in GD are typically 0-5, so show all possible values
  // Even if no recruits currently have certain priority levels
  const allPriorities = [0, 1, 2, 3, 4, 5];
  
  // Get unique priorities actually present in data
  const actualPriorities = [...new Set(state.recruits.map(r => r.priority)
    .filter(p => p !== null && p !== undefined && p !== ''))]
    .sort((a, b) => a - b);
  
  elements.filter_priority.innerHTML = '<option value="">All Priorities</option>';
  
  // Show all standard priority levels, but indicate which ones have data
  allPriorities.forEach(priority => {
    const option = document.createElement('option');
    option.value = priority;
    
    // Count how many recruits have this priority
    const count = state.recruits.filter(r => r.priority === priority).length;
    
    if (count > 0) {
      option.textContent = `${priority} (${count})`;
    } else {
      option.textContent = `${priority} (0)`;
      option.style.color = '#888'; // Gray out options with no data
    }
    
    elements.filter_priority.appendChild(option);
  });
}

// Populate distance filter dropdown
function populateDistanceFilter() {
  if (!elements.filter_distance) return;
  
  // Create distance ranges - updated to match requirements
  const distanceRanges = [
    { value: '< 180', label: '< 180' },
    { value: '< 360', label: '< 360' },
    { value: '< 1400', label: '< 1400' }
  ];
  
  elements.filter_distance.innerHTML = '<option value="">Any Distance</option>';
  
  distanceRanges.forEach(range => {
    // Calculate count for this distance range
    let count = 0;
    switch (range.value) {
      case '< 180':
        count = state.recruits.filter(r => r.miles && r.miles < 180).length;
        break;
      case '< 360':
        count = state.recruits.filter(r => r.miles && r.miles < 360).length;
        break;
      case '< 1400':
        count = state.recruits.filter(r => r.miles && r.miles < 1400).length;
        break;
    }
    
    const option = document.createElement('option');
    option.value = range.value;
    option.textContent = `${range.label} (${count})`;
    
    if (count === 0) {
      option.style.color = '#888'; // Gray out if no recruits in this range
    }
    
    elements.filter_distance.appendChild(option);
  });
}

// Apply filters to recruit data with performance optimization
function applyFilters() {
  try {
    if (!state.recruits) {
      state.filtered_recruits = [];
      updateRecruitsList();
      return;
    }
    
    // Generate hash of current filters to check if we can use cached results
    const filtersHash = generateDataHash(state.filters);
    if (state.performance.cache.filtered_results_hash === filtersHash) {
      // Filters haven't changed, no need to re-filter
      return;
    }
    
    const startTime = performance.now();
    
    state.filtered_recruits = state.recruits.filter(recruit => {
      // Ensure recruit object exists
      if (!recruit) {
        console.warn('Null recruit found in array, skipping');
        return false;
      }
        // Position filter - handle both regular positions and custom groups
      if (state.filters.position) {
        let positionMatch = false;
        
        // Check if it's a custom group
        if (CUSTOM_POSITION_GROUPS[state.filters.position]) {
          // Check if recruit's position is in the custom group
          positionMatch = CUSTOM_POSITION_GROUPS[state.filters.position].positions.includes(recruit.pos);
        } else {
          // Regular position match
          positionMatch = recruit.pos === state.filters.position;
        }
        
        if (!positionMatch) {
          return false;
        }
      }
      
      // Potential filter
      if (state.filters.potential && recruit.potential !== state.filters.potential) {
        return false;
      }
      
      // Division filter
      if (state.filters.division && recruit.division !== state.filters.division) {
        return false;
      }      // Priority filter - convert filter value to number for comparison
      if (state.filters.priority) {
        const filterPriority = parseInt(state.filters.priority);
        const recruitPriority = parseInt(recruit.priority);
        
        if (recruitPriority !== filterPriority) {
          console.log(`Filtering out recruit ${recruit.name}: priority ${recruitPriority} !== ${filterPriority}`);
          return false;
        }
      }
        // Distance filter
      if (state.filters.distance && !matchesDistanceFilter(recruit.miles, state.filters.distance)) {
        return false;
      }
      
      // Watched filter
      if (state.filters.watched === 'true' && recruit.watched !== 1) {
        return false;
      }
      
      // Hide signed filter
      if (state.filters.hide_signed && recruit.signed === 'Yes') {
        return false;
      }
      
      return true;
    });
    
    // Cache the results
    state.performance.cache.filtered_results_hash = filtersHash;
    
    const endTime = performance.now();
    if (endTime - startTime > 50) {
      console.log(`Filter performance: ${state.filtered_recruits.length} results in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    // Reset to first page when filters change
    state.current_page = 1;
    
    updateRecruitsList();
    updatePaginationDisplay();
    
  } catch (error) {
    console.error('Error in applyFilters:', error);
    handleError(error, 'applying filters');
    
    // Fallback: ensure we have valid state
    if (!state.filtered_recruits) {
      state.filtered_recruits = [];
    }
    updateRecruitsList();
  }
}

// Check if recruit miles matches distance filter
function matchesDistanceFilter(miles, distanceFilter) {
  if (!miles || !distanceFilter) return true;
  
  const numMiles = parseFloat(miles);
  if (isNaN(numMiles)) return true;
  
  switch (distanceFilter) {
    case '< 180':
      return numMiles < 180;
    case '< 360':
      return numMiles < 360;
    case '< 1400':
      return numMiles < 1400;
    default:
      return true; // 'Any Distance' case
  }
}

// Update recruits list display with virtual scrolling for performance
function updateRecruitsList() {
  console.log('=== updateRecruitsList START ===');
  try {
    if (!elements.recruits_list) {
      console.warn('Recruits list element not found');
      return;
    }
    console.log('Found recruits_list element');
    
    // Ensure filtered_recruits exists
    if (!state.filtered_recruits) {
      console.warn('No filtered recruits data available');
      state.filtered_recruits = [];
    }
    console.log(`Working with ${state.filtered_recruits.length} filtered recruits`);
    
    // Calculate pagination
    const startIndex = (state.current_page - 1) * state.items_per_page;
    const endIndex = state.show_all_results ? 
      state.filtered_recruits.length : 
      Math.min(startIndex + state.items_per_page, state.filtered_recruits.length);
    
    const pageRecruits = state.show_all_results ? 
      state.filtered_recruits : 
      state.filtered_recruits.slice(startIndex, endIndex);
    
    console.log(`Displaying ${pageRecruits.length} recruits for current page`);
    
    // Performance optimization: use virtual scrolling for large datasets
    const useVirtualScrolling = pageRecruits.length > state.performance.virtual_scrolling_threshold;
    console.log(`Using virtual scrolling: ${useVirtualScrolling}`);
    
    if (useVirtualScrolling) {
      console.log('Calling updateRecruitsListVirtual...');
      updateRecruitsListVirtual(pageRecruits);
    } else {
      console.log('Calling updateRecruitsListStandard...');
      updateRecruitsListStandard(pageRecruits);
    }
    
    // Apply column visibility
    console.log('Applying column visibility...');

    applyColumnVisibility();
    
    console.log('=== updateRecruitsList END ===');
  } catch (error) {
    console.error('Error in updateRecruitsList:', error);
    console.error('Error type:', typeof error, 'Error value:', error);
    
    if (error === null) {
      console.error('CAUGHT NULL ERROR in updateRecruitsList!');
    }
    
    // Don't call handleError to prevent cascades
    setStatusMessage(`Error updating list: ${error && error.message ? error.message : 'Unknown error'}`, 'error');
    
    // Fallback: clear the list and show error message
    if (elements.recruits_list) {
      try {
        elements.recruits_list.innerHTML = '<tr><td colspan="33" style="text-align: center; padding: 20px; color: red;">Error loading recruits</td></tr>';
      } catch (fallbackError) {
        console.error('Error in fallback innerHTML update:', fallbackError);
      }
    }
  }
}

// Standard list rendering for smaller datasets
function updateRecruitsListStandard(pageRecruits) {
  // Clear existing rows
  elements.recruits_list.innerHTML = '';
  
  if (pageRecruits.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="33" style="text-align: center; padding: 20px;">No recruits found</td>';
    elements.recruits_list.appendChild(row);
    return;
  }
  
  // Get team info from the current dashboard state
  const teamInfo = {
    teamId: state.currentTeamId || null,
    schoolName: elements.school_name?.textContent || null,
    division: elements.team_division?.textContent || null,
    world: elements.team_world?.textContent || null
  };
  
  // Create rows for recruits
  pageRecruits.forEach((recruit, index) => {
    try {
      if (!recruit) {
        console.warn(`Null recruit found at index ${index}, skipping`);
        return;
      }
      
      const row = createRecruitRow(recruit, teamInfo);
      if (!row) {
        console.warn(`createRecruitRow returned null for recruit ${recruit.id || index}`);
        return;
      }
      
      elements.recruits_list.appendChild(row);
    } catch (error) {
      console.error(`Error creating row for recruit ${recruit?.id || index}:`, error);
      // Continue with other recruits
    }
  });
}

// Virtual scrolling for large datasets
function updateRecruitsListVirtual(pageRecruits) {
  // Implementation of virtual scrolling would go here
  // For now, fall back to standard rendering but with batching
  const batchSize = state.performance.render_batch_size;
  elements.recruits_list.innerHTML = '';
  
  if (pageRecruits.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="33" style="text-align: center; padding: 20px;">No recruits found</td>';
    elements.recruits_list.appendChild(row);
    return;
  }
  
  // Render in batches to prevent UI blocking
  let currentIndex = 0;
  
  function renderBatch() {
    const startTime = performance.now();
    const endIndex = Math.min(currentIndex + batchSize, pageRecruits.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      const row = createRecruitRow(pageRecruits[i]);
      elements.recruits_list.appendChild(row);
    }
    
    currentIndex = endIndex;
    
    // Continue rendering if there are more items and we haven't spent too much time
    if (currentIndex < pageRecruits.length && (performance.now() - startTime) < 16) {
      renderBatch();
    } else if (currentIndex < pageRecruits.length) {
      // Schedule next batch on next frame
      requestAnimationFrame(renderBatch);
    }
  }
  
  renderBatch();
}

// Create a table row for a recruit
function createRecruitRow(recruit, teamInfo) {
  try {
    if (!recruit) {
      console.error('createRecruitRow called with null/undefined recruit');
      return null;
    }
    
    const row = document.createElement('tr');
    
    // Add ARIA attributes for accessibility
    row.setAttribute('role', 'row');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `Recruit: ${recruit.name || 'Unknown'}, Position: ${recruit.pos || 'Unknown'}, Rating: ${recruit.rating || 'N/A'}`);
    
    // Check signed status first for row-level formatting
    const signedStatus = teamInfo && teamInfo.teamId ? checkSignedStatus(recruit, teamInfo.teamId) : 'not_signed';
    
    // Apply signed status formatting to the entire row
    if (signedStatus === 'signed_to_school') {
      row.classList.add('signed-recruit-to-school');
      row.setAttribute('aria-label', row.getAttribute('aria-label') + ', Signed to Your School');
    } else if (signedStatus === 'signed_elsewhere') {
      row.classList.add('signed-recruit-elsewhere');
      row.setAttribute('aria-label', row.getAttribute('aria-label') + ', Signed Elsewhere');
    }
    
    // Add legacy row-level classes for backward compatibility
    if (recruit.watched === 1) {
      row.classList.add('watched-recruit');
      row.setAttribute('aria-label', row.getAttribute('aria-label') + ', On Watchlist');
    }
    
    if (recruit.signed === 'Y' || recruit.signed === 'Yes') {
      row.classList.add('signed-recruit');
      row.setAttribute('aria-label', row.getAttribute('aria-label') + ', Signed');
    }
    
    // Add priority-based styling
    if (recruit.priority) {
      const priority = parseInt(recruit.priority, 10);
      if (priority <= 2) {
        row.classList.add('high-priority');
        row.setAttribute('aria-label', row.getAttribute('aria-label') + ', High Priority');
      } else if (priority <= 4) {
        row.classList.add('medium-priority');
        row.setAttribute('aria-label', row.getAttribute('aria-label') + ', Medium Priority');
      }
    }
    
    // Get position for bold attribute checking
    const position = recruit.pos ? recruit.pos.toLowerCase() : '';
  // Column data mapping with attribute names for bold styling and enhanced features
  const columnData = [
    { key: 'name', content: recruit.name || '', attribute: null, isLink: true,
      linkUrl: recruit.id ? `https://www.whatifsports.com/gd/RecruitProfile/Ratings.aspx?rid=${recruit.id}&section=Ratings` : null,
      tooltip: recruit.name ? `${recruit.name} - ${recruit.pos || 'No Position'}` : null,
      isWatched: recruit.watched === 1
    },
    { key: 'pos', content: recruit.pos || '', attribute: null, isLink: false,
      tooltip: recruit.pos ? `Position: ${recruit.pos}` : null
    },
    { key: 'watched', content: recruit.watched === 1 ? '👁' : '', attribute: null, isLink: false,
      tooltip: recruit.watched === 1 ? 'On Watchlist' : 'Not Watched',
      classes: recruit.watched === 1 ? ['watched-indicator'] : []
    },
    { key: 'potential', content: recruit.potential || '', attribute: null, isLink: false,
      tooltip: recruit.potential ? `Potential: ${recruit.potential}` : null
    },
    { key: 'priority', content: recruit.priority || '', attribute: null, isLink: false,
      tooltip: recruit.priority ? `Priority: ${recruit.priority}` : null
    },
    { key: 'height', content: recruit.height || '', attribute: null, isLink: false,
      tooltip: recruit.height ? `Height: ${recruit.height}` : null
    },
    { key: 'weight', content: recruit.weight || '', attribute: null, isLink: false,
      tooltip: recruit.weight ? `Weight: ${recruit.weight} lbs` : null
    },
    { key: 'rating', content: recruit.rating || '', attribute: null, isLink: false,
      tooltip: recruit.rating ? `Overall Rating: ${recruit.rating}` : null
    },
    { key: 'rank', content: recruit.rank || '', attribute: null, isLink: false,
      tooltip: recruit.rank ? `National Rank: ${recruit.rank}` : null
    },    { key: 'hometown', content: recruit.hometown || '', attribute: null, isLink: recruit.hometown && recruit.hometown !== 'N/A',
      linkUrl: (recruit.hometown && recruit.hometown !== 'N/A') ? (() => {
        const teamWorld = elements.team_world?.textContent?.trim();
        const teamDivision = elements.team_division?.textContent?.trim();
        if (teamWorld && teamDivision) {
          const formattedHometown = formatHometownForUrl(recruit.hometown);
          return `https://www.thenextguess.com/gdanalyst/${teamWorld}/${teamDivision}/mapLocation?town=${encodeURIComponent(formattedHometown)}`;
        }
        return null;
      })() : null,
      tooltip: recruit.hometown ? `Hometown: ${recruit.hometown}` : null
    },
    { key: 'division', content: recruit.division || '', attribute: null, isLink: false,
      tooltip: recruit.division ? `High School Division: ${recruit.division}` : null
    },
    { key: 'miles', content: recruit.miles || '', attribute: null, isLink: false,
      tooltip: recruit.miles ? `Distance: ${recruit.miles} miles from campus` : null
    },
    { key: 'signed', content: recruit.signed || '', attribute: null, isLink: false,
      tooltip: recruit.signed ? `Signed Status: ${recruit.signed}` : null,
      classes: recruit.signed === 'Y' || recruit.signed === 'Yes' ? ['signed-status'] : []
    },
    { key: 'gpa', content: recruit.gpa || '', attribute: null, isLink: false,
      tooltip: recruit.gpa ? `GPA: ${recruit.gpa}` : null
    },
    { key: 'ath', content: recruit.ath || '', attribute: 'ath', tooltip: recruit.ath ? `Athleticism: ${recruit.ath}` : null },
    { key: 'spd', content: recruit.spd || '', attribute: 'spd', tooltip: recruit.spd ? `Speed: ${recruit.spd}` : null },
    { key: 'dur', content: recruit.dur || '', attribute: 'dur', tooltip: recruit.dur ? `Durability: ${recruit.dur}` : null },
    { key: 'we', content: recruit.we || '', attribute: 'we', tooltip: recruit.we ? `Work Ethic: ${recruit.we}` : null },
    { key: 'sta', content: recruit.sta || '', attribute: 'sta', tooltip: recruit.sta ? `Stamina: ${recruit.sta}` : null },
    { key: 'str', content: recruit.str || '', attribute: 'str', tooltip: recruit.str ? `Strength: ${recruit.str}` : null },
    { key: 'blk', content: recruit.blk || '', attribute: 'blk', tooltip: recruit.blk ? `Blocking: ${recruit.blk}` : null },
    { key: 'tkl', content: recruit.tkl || '', attribute: 'tkl', tooltip: recruit.tkl ? `Tackling: ${recruit.tkl}` : null },
    { key: 'han', content: recruit.han || '', attribute: 'han', tooltip: recruit.han ? `Hands: ${recruit.han}` : null },
    { key: 'gi', content: recruit.gi || '', attribute: 'gi', tooltip: recruit.gi ? `Game Intelligence: ${recruit.gi}` : null },
    { key: 'elu', content: recruit.elu || '', attribute: 'elu', tooltip: recruit.elu ? `Elusiveness: ${recruit.elu}` : null },
    { key: 'tec', content: recruit.tec || '', attribute: 'tec', tooltip: recruit.tec ? `Technique: ${recruit.tec}` : null },
    { key: 'r1', content: recruit.r1 || '', attribute: null, tooltip: recruit.r1 ? `Rating 1: ${recruit.r1}` : null },
    { key: 'r2', content: recruit.r2 || '', attribute: null, tooltip: recruit.r2 ? `Rating 2: ${recruit.r2}` : null },
    { key: 'r3', content: recruit.r3 || '', attribute: null, tooltip: recruit.r3 ? `Rating 3: ${recruit.r3}` : null },
    { key: 'r4', content: recruit.r4 || '', attribute: null, tooltip: recruit.r4 ? `Rating 4: ${recruit.r4}` : null },
    { key: 'r5', content: recruit.r5 || '', attribute: null, tooltip: recruit.r5 ? `Rating 5: ${recruit.r5}` : null },
    { key: 'r6', content: recruit.r6 || '', attribute: null, tooltip: recruit.r6 ? `Rating 6: ${recruit.r6}` : null },
    { 
      key: 'considering',
      content: recruit.considering || '', 
      attribute: null, 
      isLink: false,
      tooltip: recruit.considering ? `Considering Schools: ${recruit.considering}` : null,
      classes: (() => {
        const baseClasses = recruit.considering ? ['considering-schools'] : [];
        
        // Add conditional formatting based on current school status
        if (teamInfo && teamInfo.teamId && recruit.considering) {
          const consideringStatus = checkCurrentSchoolInConsidering(recruit.considering, teamInfo.teamId);
          switch (consideringStatus) {
            case 'only':
              baseClasses.push('considering-only-school');
              break;
            case 'included':
              baseClasses.push('considering-among-schools');
              break;
            case 'not_included':
              // No special formatting for not included
              break;
          }
        }
        
        return baseClasses;
      })()
    }
  ];  columnData.forEach(({ content, attribute, tooltip, classes = [], isLink, linkUrl, isWatched }, index) => {
    const cell = document.createElement('td');
    
    // Create link or plain text content
    if (isLink && linkUrl && content) {
      const link = document.createElement('a');
      link.href = linkUrl;
      link.target = '_blank';
      link.textContent = content;
      link.style.color = '#007bff';
      link.style.textDecoration = 'none';
      
      // Add hover effects
      link.addEventListener('mouseover', () => {
        link.style.textDecoration = 'underline';
      });
      link.addEventListener('mouseout', () => {
        link.style.textDecoration = 'none';
      });
      
      cell.appendChild(link);
      
      // Add watched indicator for name column (index 0) if recruit is watched
      if (index === 0 && isWatched) {
        const indicatorContainer = document.createElement('span');
        indicatorContainer.className = 'watched-indicator';
        indicatorContainer.title = 'This recruit is being watched';
        indicatorContainer.style.marginLeft = '5px';
        
        // Try to use the eyeball icon image
        const eyeballIcon = document.createElement('img');
        let iconLoaded = false;
        
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            eyeballIcon.src = chrome.runtime.getURL('icons/eyeball-icon-png-eye-icon-1.png');
            eyeballIcon.alt = 'Watched recruit';
            eyeballIcon.style.width = '16px';
            eyeballIcon.style.height = '16px';
            
            // Handle image load error by replacing with symbol
            eyeballIcon.onerror = function() {
              indicatorContainer.innerHTML = '👁';
              indicatorContainer.className = 'watched-indicator-symbol';
            };
            
            // Handle successful load
            eyeballIcon.onload = function() {
              iconLoaded = true;
            };
            
            indicatorContainer.appendChild(eyeballIcon);
            
            // Fallback timeout in case the image doesn't load quickly
            setTimeout(() => {
              if (!iconLoaded && indicatorContainer.querySelector('img')) {
                indicatorContainer.innerHTML = '👁';
                indicatorContainer.className = 'watched-indicator-symbol';
              }
            }, 500);
            
          } else {
            // No chrome.runtime available, use symbol directly
            indicatorContainer.innerHTML = '👁';
            indicatorContainer.className = 'watched-indicator-symbol';
          }
        } catch (error) {
          console.log('Error loading watched icon, using symbol fallback:', error);
          indicatorContainer.innerHTML = '👁';
          indicatorContainer.className = 'watched-indicator-symbol';
        }
        
        cell.appendChild(indicatorContainer);
      }
    } else {
      cell.textContent = content;
    }
    
    // Add ARIA attributes for accessibility
    cell.setAttribute('role', 'gridcell');
    if (index < COLUMNS.length) {
      cell.setAttribute('aria-describedby', `column-${COLUMNS[index].key}`);
    }
    
    // Apply bold styling if this is an attribute cell and should be bold for this position
    if (attribute && position && boldAttributesConfig.shouldBoldAttribute(position, attribute)) {
      cell.style.fontWeight = 'bold';
      cell.classList.add('bold-attribute');
      cell.setAttribute('aria-label', `${content} (highlighted for ${position.toUpperCase()})`);
    }
    
    // Add tooltip if available
    if (tooltip) {
      cell.title = tooltip;
      cell.classList.add('has-tooltip');
      cell.setAttribute('aria-describedby', cell.getAttribute('aria-describedby') + ` tooltip-${index}`);
    }
    
    // Add custom classes
    classes.forEach(className => {
      cell.classList.add(className);
    });
    
    row.appendChild(cell);  });
  
  return row;
  
  } catch (error) {
    console.error('Error in createRecruitRow:', error, 'Recruit:', recruit);
    handleError(error, 'creating recruit row');
    
    // Return a basic error row instead of null
    const errorRow = document.createElement('tr');
    errorRow.innerHTML = '<td colspan="33" style="text-align: center; color: red;">Error rendering recruit</td>';
    return errorRow;
  }
}

// Update pagination display
function updatePaginationDisplay() {
  try {
    if (!elements.page_info) {
      console.warn('Page info element not found');
      return;
    }
    
    // Ensure filtered_recruits exists
    if (!state.filtered_recruits) {
      console.warn('No filtered recruits data for pagination');
      state.filtered_recruits = [];
    }
    
    const totalFiltered = state.filtered_recruits.length;
    const totalAll = state.recruits ? state.recruits.length : 0;
    const totalPages = Math.ceil(totalFiltered / state.items_per_page);
    
    // Check if filters are active
    const filtersActive = totalFiltered !== totalAll;
    
    if (state.show_all_results) {
      // Show total filtered count when showing all results
      let displayText = `Showing all ${totalFiltered} results`;
      if (filtersActive) {
        displayText += ` (filtered from ${totalAll} total)`;
      }
      elements.page_info.textContent = displayText;
    } else {
      // Calculate start and end indices for current page
      const startIndex = (state.current_page - 1) * state.items_per_page + 1;
      const endIndex = Math.min(state.current_page * state.items_per_page, totalFiltered);
      
      if (totalFiltered === 0) {
        let displayText = 'No results found';
        if (filtersActive) {
          displayText += ` (${totalAll} total available)`;
        }
        elements.page_info.textContent = displayText;
      } else {
        // Show detailed pagination info with filter indication
        let displayText = `Showing ${startIndex}-${endIndex} of ${totalFiltered}`;
        if (filtersActive) {
          displayText += ` (filtered from ${totalAll})`;
        }
        displayText += ` | Page ${state.current_page} of ${totalPages}`;
        elements.page_info.textContent = displayText;
      }
    }
    
    // Update button states
    if (elements.prev_page_btn) {
      elements.prev_page_btn.disabled = state.current_page <= 1 || state.show_all_results;
    }
    
    if (elements.next_page_btn) {
      elements.next_page_btn.disabled = state.current_page >= totalPages || state.show_all_results;
    }
    
  } catch (error) {
    console.error('Error in updatePaginationDisplay:', error);
    handleError(error, 'updating pagination');
  }
}

// Bold Attributes Configuration Handlers
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

// Setup Bold Attributes Modal Event Listeners
function setupBoldAttributesModalListeners() {
  // Modal close handlers
  if (elements.bold_attributes_modal_close) {
    elements.bold_attributes_modal_close.addEventListener('click', closeBoldAttributesModal);
  }
  
  if (elements.bold_attributes_cancel) {
    elements.bold_attributes_cancel.addEventListener('click', closeBoldAttributesModal);
  }
  
  // Close modal when clicking outside
  if (elements.bold_attributes_modal) {
    elements.bold_attributes_modal.addEventListener('click', (event) => {
      if (event.target === elements.bold_attributes_modal) {
        closeBoldAttributesModal();
      }
    });
  }
  
  // Escape key handler
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.bold_attributes_modal.classList.contains('hidden')) {
      closeBoldAttributesModal();
    }
  });
}

// Close Bold Attributes Modal
function closeBoldAttributesModal() {
  if (elements.bold_attributes_modal) {
    elements.bold_attributes_modal.classList.add('hidden');
  }
}

/**
 * Show bold attributes configuration modal
 * Provides an interactive interface for customizing position-based attribute styling
 */
function showBoldAttributesModal() {
  return new Promise((resolve, reject) => {
    const modal = elements.bold_attributes_modal;
    const closeBtn = elements.bold_attributes_modal_close;
    const saveBtn = elements.bold_attributes_save;
    const resetPositionBtn = elements.bold_attributes_reset_position;
    const cancelBtn = elements.bold_attributes_cancel;
    const positionSelect = elements.position_select;
    const attributesGrid = elements.attributes_grid;
    const attributePreview = elements.attribute_preview;

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
    }

    // Event handlers
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
    };

    resetPositionBtn.onclick = () => {
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
        
        // Reset button state
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    };

    // Add event listeners
    window.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);

// Handle popup unload
window.addEventListener('beforeunload', () => {
  state.popup_lifecycle = 'closing';
  console.log('Popup closing, saving state...');
});

// Export functions for testing and debugging
if (typeof window !== 'undefined') {
  window.popupApp = {
    state,
    elements,
    setStatusMessage,
    switchTab,
    handleError
  };
}

// Handle scrape complete messages
function handleScrapeComplete(message) {
  console.log('Handling scrape complete:', message);
  
  // Hide any active overlays
  hideScrapingOverlay();
  
  // Refresh data if scraping was successful
  if (message.success) {
    console.log('Scraping completed successfully, refreshing data');
    setTimeout(() => {
      loadInitialData();
    }, 1000);
  } else {
    console.log('Scraping failed:', message.error);
    // Could add user notification here if needed
  }
}
