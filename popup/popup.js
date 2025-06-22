// Popup script for GD Recruit Assistant
// Migrated from sidebar implementation with popup-specific optimizations

// Import modules
import { popupComms } from './communications.js';
import boldAttributesConfig from '../modules/bold-attributes-config.js';
import { getFullVersionString } from '../lib/version.js';
import { multiTeamStorage } from '../lib/multi-team-storage.js';

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
const COLUMN_ORDER_STORAGE_KEY = 'columnOrder';

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

// Attribute filter configuration
const ATTRIBUTE_COLUMNS = [
  { key: 'gpa', label: 'GPA', type: 'decimal', min: 0, max: 4.0, step: 0.1 },
  { key: 'ath', label: 'Ath', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'spd', label: 'Spd', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'dur', label: 'Dur', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'we', label: 'WE', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'sta', label: 'Sta', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'str', label: 'Str', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'blk', label: 'Blk', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'tkl', label: 'Tkl', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'han', label: 'Han', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'gi', label: 'GI', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'elu', label: 'Elu', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'tec', label: 'Tec', type: 'integer', min: 0, max: 100, step: 1 },
  // Formation IQ attributes
  { key: 'iq_threefour', label: '34', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_fourthree', label: '43', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_fourfour', label: '44', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_fivetwo', label: '52', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_nickel', label: 'Ni', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_dime', label: 'Di', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_iformation', label: 'IF', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_wishbone', label: 'WB', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_proset', label: 'Pro', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_ndbox', label: 'NDB', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_shotgun', label: 'Sh', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_trips', label: 'Tr', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'iq_specialteams', label: 'ST', type: 'integer', min: 0, max: 100, step: 1 },
  { key: 'r1', label: 'R1', type: 'decimal', min: 0, max: 100, step: 0.1 },
  { key: 'r2', label: 'R2', type: 'decimal', min: 0, max: 100, step: 0.1 },
  { key: 'r3', label: 'R3', type: 'decimal', min: 0, max: 100, step: 0.1 },
  { key: 'r4', label: 'R4', type: 'decimal', min: 0, max: 100, step: 0.1 },
  { key: 'r5', label: 'R5', type: 'decimal', min: 0, max: 100, step: 0.1 },
  { key: 'r6', label: 'R6', type: 'decimal', min: 0, max: 100, step: 0.1 }
];

// Text search filter configuration - separate from numeric attribute filters
const TEXT_SEARCH_COLUMNS = [
  { key: 'considering_schools', label: 'Considering Schools', type: 'text', placeholder: 'Search...' }
];

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
  // Formation IQ columns
  { key: 'iq_threefour', label: '34', sortable: true },
  { key: 'iq_fourthree', label: '43', sortable: true },
  { key: 'iq_fourfour', label: '44', sortable: true },
  { key: 'iq_fivetwo', label: '52', sortable: true },
  { key: 'iq_nickel', label: 'Ni', sortable: true },
  { key: 'iq_dime', label: 'Di', sortable: true },
  { key: 'iq_iformation', label: 'IF', sortable: true },
  { key: 'iq_wishbone', label: 'WB', sortable: true },
  { key: 'iq_proset', label: 'Pro', sortable: true },
  { key: 'iq_ndbox', label: 'NDB', sortable: true },
  { key: 'iq_shotgun', label: 'Sh', sortable: true },
  { key: 'iq_trips', label: 'Tr', sortable: true },
  { key: 'iq_specialteams', label: 'ST', sortable: true },
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
  
  // Dual pagination elements
  prev_page_btn: document.getElementById('prev-page'),
  next_page_btn: document.getElementById('next-page'),
  page_info: document.getElementById('page-info'),
  prev_page_btn_top: document.getElementById('prev-page-top'),
  next_page_btn_top: document.getElementById('next-page-top'),
  page_info_top: document.getElementById('page-info-top'),
  
  page_size_select: document.getElementById('page-size-select'),

  // Column visibility elements
  btn_column_visibility: document.getElementById('btn-column-visibility'),
  column_visibility_modal: document.getElementById('column-visibility-modal'),
  column_visibility_grid: document.getElementById('column-visibility-grid'),
  column_visibility_save: document.getElementById('column-visibility-save'),
  column_visibility_reset: document.getElementById('column-visibility-reset'),
  column_visibility_cancel: document.getElementById('column-visibility-cancel'),

  // Column order elements
  btn_column_order: document.getElementById('btn-column-order'),
  column_order_modal: document.getElementById('column-order-modal'),
  column_order_modal_close: document.getElementById('column-order-modal-close'),
  column_order_list: document.getElementById('column-order-list'),
  column_order_save: document.getElementById('column-order-save'),
  column_order_reset: document.getElementById('column-order-reset'),
  column_order_cancel: document.getElementById('column-order-cancel'),

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

  // New filter elements
  filter_undecided: document.getElementById('filter-undecided'),
  attribute_filters_container: document.getElementById('attribute-filters-container'),
  clear_attribute_filters: document.getElementById('clear-attribute-filters'),

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
  
  // Team information - enhanced for multi-team support
  currentTeamId: null,
  currentTeamInfo: null,
  currentSeason: null,
  multiTeamEnabled: false,
  allTeams: [],
  
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
    hide_signed: false,
    undecided: false,
    attribute_filters: {
      gpa: '',
      ath: '', spd: '', dur: '', we: '', sta: '', str: '',
      blk: '', tkl: '', han: '', gi: '', elu: '', tec: '',
      r1: '', r2: '', r3: '', r4: '', r5: '', r6: ''
    },
    text_search_filters: {
      considering_schools: ''
    }
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
    // Formation IQ columns - hidden by default to avoid clutter
    iq_threefour: true,
    iq_fourthree: true,
    iq_fourfour: true,
    iq_fivetwo: true,
    iq_nickel: true,
    iq_dime: true,
    iq_iformation: true,
    iq_wishbone: true,
    iq_proset: true,
    iq_ndbox: true,
    iq_shotgun: true,
    iq_trips: true,
    iq_specialteams: true,
    r1: true,
    r2: true,
    r3: true,
    r4: true,
    r5: true,
    r6: true,
    considering: true
  },
  
  // Column order state - stores custom column ordering
  column_order: null, // Will be initialized with default order or loaded from storage
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
    
    // Initialize multi-team storage system
    await initializeMultiTeamSupport();
    
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
    
    // Check and show donation reminder if needed
    await checkAndShowDonationReminder();
    
    state.popup_lifecycle = 'ready';
    setStatusMessage('Extension ready', 'success');
    
  } catch (error) {
    handleError(error, 'popup initialization');
    state.popup_lifecycle = 'error';
  }
}

// Initialize multi-team storage support
async function initializeMultiTeamSupport() {
  console.log('=== initializeMultiTeamSupport START ===');
  
  const MAX_RETRY_TIME = 5000; // 5 seconds max
  const startTime = Date.now();
  
  try {
    console.log('Initializing multi-team storage support...');
    
    // Check if multiTeamStorage is available
    if (!multiTeamStorage) {
      console.error('multiTeamStorage module is not available!');
      throw new Error('multiTeamStorage module not imported');
    }
    
    console.log('multiTeamStorage module is available, calling init()...');
    
    // Add timeout wrapper for initialization
    const initPromise = multiTeamStorage.init();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Multi-team storage init timeout')), MAX_RETRY_TIME);
    });
    
    await Promise.race([initPromise, timeoutPromise]);
    console.log('multiTeamStorage.init() completed successfully');
    
    // Check elapsed time
    if (Date.now() - startTime > MAX_RETRY_TIME) {
      throw new Error('Initialization took too long, aborting to prevent loops');
    }
    
    // Check if multi-team mode is enabled
    console.log('Checking if multi-team mode is enabled...');
    state.multiTeamEnabled = await multiTeamStorage.isMultiTeamMode();
    console.log('Multi-team mode enabled:', state.multiTeamEnabled);
    
    // 🎯 SAFETY NET: Auto-enable multi-team mode if multiple teams exist but mode is disabled
    if (!state.multiTeamEnabled) {
      console.log('Multi-team mode not enabled, checking if multiple teams exist...');
      const allTeams = await multiTeamStorage.getAllTeams();
      console.log(`Found ${allTeams.length} registered teams`);
      
      if (allTeams.length > 1) {
        console.log('🎯 SAFETY NET: Multiple teams detected but multi-team mode disabled!');
        console.log('Teams:', allTeams.map(t => `${t.teamId} (${t.schoolName})`).join(', '));
        console.log('Auto-enabling multi-team mode...');
        
        const enableSuccess = await multiTeamStorage.setMultiTeamMode(true);
        if (enableSuccess) {
          state.multiTeamEnabled = true;
          console.log('✅ SAFETY NET: Multi-team mode auto-enabled successfully');
        } else {
          console.error('❌ SAFETY NET: Failed to auto-enable multi-team mode');
        }
      }
    }
    
    if (state.multiTeamEnabled) {
      console.log('Multi-team mode is enabled, loading teams...');
      
      // Load all teams
      state.allTeams = await multiTeamStorage.getAllTeams();
      console.log('Loaded teams count:', state.allTeams ? state.allTeams.length : 0);
      console.log('Loaded teams data:', state.allTeams);
      
      // Get current team
      console.log('Getting current team...');
      const currentTeam = await multiTeamStorage.getCurrentTeam();
      console.log('Current team from storage:', currentTeam);
      
      if (currentTeam) {
        state.currentTeamInfo = currentTeam;
        state.currentTeamId = currentTeam.teamId;
        console.log('✅ Current team set in state:');
        console.log('  - Team ID:', state.currentTeamId);
        console.log('  - Team Info:', state.currentTeamInfo);
      } else {
        console.log('⚠️ No current team found in storage');
      }
    } else {
      console.log('Multi-team mode is disabled, skipping team loading');
    }
    
    console.log('✅ Multi-team storage support initialized successfully');
    console.log('Final state:');
    console.log('  - multiTeamEnabled:', state.multiTeamEnabled);
    console.log('  - currentTeamId:', state.currentTeamId);
    console.log('  - allTeams count:', state.allTeams ? state.allTeams.length : 0);
    
  } catch (error) {
    console.error('❌ Error initializing multi-team support:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
    // Don't fail initialization if multi-team support fails
    state.multiTeamEnabled = false;
    state.allTeams = [];
    state.currentTeamId = null;
    state.currentTeamInfo = null;
    console.log('Set fallback state - multiTeamEnabled: false, allTeams: []');
  }
  
  console.log('=== initializeMultiTeamSupport END ===');
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
  document.addEventListener('popup-focus', async () => {
    console.log('=== POPUP-FOCUS EVENT RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    
    state.is_popup_focused = true;
    console.log('Set is_popup_focused to true');
    
    // Check for team changes when popup gains focus
    console.log('Calling checkForTeamChanges()...');
    await checkForTeamChanges();
    console.log('checkForTeamChanges() completed');
    
    console.log('Calling refreshDataIfStale()...');
    refreshDataIfStale();
    console.log('refreshDataIfStale() completed');
    
    console.log('=== POPUP-FOCUS EVENT HANDLING COMPLETED ===');
  });
  
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
    }
    
    // Update button states
    if (elements.tab_buttons && Array.isArray(elements.tab_buttons) && elements.tab_buttons.length > 0) {
      elements.tab_buttons.forEach(btn => {
        if (btn && btn.classList) {
          btn.classList.toggle('active', btn.id === tabId);
        }
      });
    } else {
      console.warn('tab_buttons not available for tab switching');
    }
    
    // Update section visibility
    if (elements.tab_sections && Array.isArray(elements.tab_sections) && elements.tab_sections.length > 0) {
      elements.tab_sections.forEach(section => {
        if (section && section.classList) {
          section.classList.toggle('active', section.id === targetSection);
        }
      });
    } else {
      console.warn('tab_sections not available for section switching');
    }
    
    // Perform tab-specific actions
    if (tabId === 'tab-recruits') {
      refreshRecruitsDisplay();
    }
    
  } catch (error) {
    console.error('Error in switchTab:', error);
    setStatusMessage(`Tab switch error: ${error.message || error}`, 'error');
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
    
    // Load column order preferences
    const savedOrder = await chrome.storage.local.get(COLUMN_ORDER_STORAGE_KEY);
    if (savedOrder[COLUMN_ORDER_STORAGE_KEY] && Array.isArray(savedOrder[COLUMN_ORDER_STORAGE_KEY])) {
      state.column_order = savedOrder[COLUMN_ORDER_STORAGE_KEY];
    } else {
      // Initialize with default order (keys from COLUMNS array)
      state.column_order = COLUMNS.map(col => col.key);
    }
    
  } catch (error) {
    console.warn('Could not load saved preferences:', error);
  }
}

// Load version information and display it
async function loadVersionInfo() {
  try {
    const version = await getFullVersionString();
    const versionElement = document.getElementById('version-info');
    if (versionElement) {
      versionElement.textContent = version;
    }
  } catch (error) {
    console.warn('Could not load version info:', error);
    // Fallback to displaying default version
    const versionElement = document.getElementById('version-info');
    if (versionElement) {
      versionElement.textContent = 'GD Recruit Assistant v0.0.0';
    }
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

// Load role ratings data for tooltips (non-blocking)
async function loadRoleRatingsForTooltips() {
  try {
    console.log('Loading role ratings data for tooltips...');
    
    const response = await sendMessageToBackground({ action: 'getRoleRatings' });
    
    if (response.success && response.ratings) {
      // Store in state for tooltip generation
      if (!state.role_ratings) {
        state.role_ratings = {};
      }
      state.role_ratings.data = response.ratings;
      console.log('Role ratings data loaded for tooltips');
    } else {
      console.warn('Could not load role ratings for tooltips, will use fallback');
    }
  } catch (error) {
    console.warn('Failed to load role ratings for tooltips:', error);
    // This is non-critical, tooltips will use fallback data
  }
}

// Load initial data from background script
async function loadInitialData() {
  setStatusMessage('Loading data...', 'info');
  
  try {
    // Load role ratings data for tooltips
    await loadRoleRatingsForTooltips();
    
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

// Function to get current team ID directly from IndexedDB master database
async function getCurrentTeamIdFromMaster() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gdRecruitDB_master', 1);
    
    request.onerror = () => {
      console.error('Error opening master database:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const db = request.result;
      
      try {
        const transaction = db.transaction(['globalConfig'], 'readonly');
        const store = transaction.objectStore('globalConfig');
        const getRequest = store.get('teamId');
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          const teamId = result ? result.value : null;
          console.log('🔍 DEBUG: Retrieved teamId from master DB globalConfig:', teamId);
          db.close();
          resolve(teamId);
        };
        
        getRequest.onerror = () => {
          console.error('Error getting teamId from globalConfig:', getRequest.error);
          db.close();
          reject(getRequest.error);
        };
      } catch (error) {
        console.error('Error creating transaction:', error);
        db.close();
        reject(error);
      }
    };
    
    request.onupgradeneeded = () => {
      console.log('Master database needs upgrade - this should not happen');
      resolve(null);
    };
  });
}

// Clear all filters to reset the view
function clearAllFilters() {
  console.log('🧹 Clearing all filters for team switch');
  
  // Reset main filter state
  state.filters = {
    name: '',
    position: '',
    watched: '',
    potential: '',
    division: '',
    priority: '',
    distance: '',
    hide_signed: false,
    undecided: false,
    attribute_filters: {
      gpa: '',
      ath: '', spd: '', dur: '', we: '', sta: '', str: '',
      blk: '', tkl: '', han: '', gi: '', elu: '', tec: '',
      r1: '', r2: '', r3: '', r4: '', r5: '', r6: ''
    },
    text_search_filters: {
      considering_schools: ''
    }
  };
  
  // Reset UI elements to match cleared filters
  if (elements.filter_position) elements.filter_position.value = '';
  if (elements.filter_watched) elements.filter_watched.checked = false;
  if (elements.filter_potential) elements.filter_potential.value = '';
  if (elements.filter_division) elements.filter_division.value = '';
  if (elements.filter_priority) elements.filter_priority.value = '';
  if (elements.filter_distance) elements.filter_distance.value = '';
  if (elements.filter_hide_signed) elements.filter_hide_signed.checked = false;
  if (elements.filter_undecided) elements.filter_undecided.checked = false;
  
  // Clear attribute filter inputs
  ATTRIBUTE_COLUMNS.forEach(column => {
    const input = document.getElementById(`filter-${column.key}`);
    if (input) {
      input.value = '';
      input.classList.remove('filter-active');
    }
  });
  
  // Clear text search filter inputs
  TEXT_SEARCH_COLUMNS.forEach(column => {
    const input = document.getElementById(`filter-${column.key}`);
    if (input) {
      input.value = '';
      input.classList.remove('filter-active');
    }
  });
  
  // Update filter summary
  updateFilterSummary();
  
  console.log('✅ All filters cleared successfully');
}

// Check for team changes when popup gains focus
async function checkForTeamChanges() {
  console.log('=== checkForTeamChanges START ===');
  
  try {
    // Debug: Check initial state
    console.log('Multi-team enabled:', state.multiTeamEnabled);
    console.log('Current state.currentTeamId:', state.currentTeamId);
    console.log('Current state.currentTeamInfo:', state.currentTeamInfo);
    
    // Only check for team changes if multi-team mode is enabled
    if (!state.multiTeamEnabled) {
      console.log('Multi-team mode not enabled, skipping team change check');
      return;
    }

    console.log('Multi-team mode enabled, checking for team changes...');
    
    // Debug: Check if multiTeamStorage is available
    if (!multiTeamStorage) {
      console.error('multiTeamStorage is not available!');
      return;
    }
    
    console.log('multiTeamStorage is available, calling getCurrentTeam()...');
    
    // Get the current team from multi-team storage
    const currentTeam = await multiTeamStorage.getCurrentTeam();
    
    console.log('getCurrentTeam() result:', currentTeam);
    
    if (!currentTeam) {
      console.log('No current team found in storage - this might be normal for single-team users');
      return;
    }
    
    // Check if the team has changed
    const currentTeamId = currentTeam.teamId;
    const storedTeamId = state.currentTeamId;
    
    console.log('Team comparison:');
    console.log('  Storage team ID:', currentTeamId);
    console.log('  State team ID:', storedTeamId);
    console.log('  Are they equal?', currentTeamId === storedTeamId);
    
    if (currentTeamId !== storedTeamId) {
      console.log(`🔄 TEAM CHANGE DETECTED: "${storedTeamId}" -> "${currentTeamId}"`);
      console.log('Previous team info:', state.currentTeamInfo);
      console.log('New team info:', currentTeam);
      
      // Update state with new team info
      state.currentTeamInfo = currentTeam;
      state.currentTeamId = currentTeamId;
      
      console.log('Updated state with new team info');
      console.log('New state.currentTeamId:', state.currentTeamId);
      console.log('New state.currentTeamInfo:', state.currentTeamInfo);
      
      // Clear all filters when switching teams
      console.log('Clearing filters for team switch...');
      clearAllFilters();
      
      // Clear current data to force refresh
      const oldRecruitsCount = state.recruits.length;
      state.recruits = [];
      state.filtered_recruits = [];
      state.current_page = 1;
      
      console.log(`Cleared ${oldRecruitsCount} recruits from state, reset pagination`);
      
      // Update team selector if visible
      console.log('Calling updateTeamSelector()...');
      updateTeamSelector();
      
      // Refresh all data for the new team
      const statusMessage = `Switched to ${currentTeam.schoolName}`;
      console.log('Setting status message:', statusMessage);
      setStatusMessage(statusMessage, 'info');
      
      console.log('Calling loadInitialData() for new team...');
      await loadInitialData();
      
      console.log('✅ Team change handling completed successfully');
    } else {
      console.log('✅ No team change detected - teams match');
    }
    
  } catch (error) {
    console.error('❌ Error in checkForTeamChanges:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    // Don't throw error to prevent popup initialization issues
  }
  
  console.log('=== checkForTeamChanges END ===');
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
    let response;
    
    if (state.multiTeamEnabled && state.currentTeamInfo) {
      // Use multi-team storage for team-specific data
      response = await multiTeamStorage.getTeamStats(state.currentTeamInfo.teamId);
      
      // Add team info to response
      response.teamInfo = state.currentTeamInfo;
      response.schoolName = state.currentTeamInfo.schoolName;
    } else {
      // Use legacy single-team method
      response = await popupComms.sendMessageToBackground({
        action: 'getStats'
      });
    }
    
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
async function updateDashboardDisplay(stats) {
  console.log('Updating dashboard display with stats:', stats);
  
  // Get current team ID directly from IndexedDB gdRecruitDB_master
  try {
    const teamId = await getCurrentTeamIdFromMaster();
    if (teamId) {
      state.currentTeamId = teamId;
      console.log('🎯 Got current team ID from master DB:', state.currentTeamId);
    } else {
      console.warn('No current team ID found in master DB');
      // Fallback to stats if available
      if (stats.teamInfo && stats.teamInfo.teamId) {
        state.currentTeamId = stats.teamInfo.teamId;
        console.log('Fallback: Using team ID from stats:', state.currentTeamId);
      }
    }
  } catch (error) {
    console.error('Error getting team ID from master DB:', error);
    // Fallback to stats if available
    if (stats.teamInfo && stats.teamInfo.teamId) {
      state.currentTeamId = stats.teamInfo.teamId;
      console.log('Fallback: Using team ID from stats:', state.currentTeamId);
    }
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
  
  // Update recruit counts - use stats data first, then fall back to state
  if (elements.recruit_count) {
    const recruitCount = stats.recruitCount || state.recruits.length || 0;
    elements.recruit_count.textContent = recruitCount;
    console.log('Updated dashboard recruit count:', recruitCount, 'from stats:', stats.recruitCount, 'from state:', state.recruits.length);
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

// Update team selector display based on multi-team mode
function updateTeamSelector() {
  // Check if we need to show/hide team selector
  const teamSelectorContainer = document.getElementById('team-selector-container');
  
  if (!state.multiTeamEnabled || state.allTeams.length <= 1) {
    // Hide team selector if not in multi-team mode or only one team
    if (teamSelectorContainer) {
      teamSelectorContainer.style.display = 'none';
    }
    return;
  }
  
  // Show team selector for multi-team mode
  if (teamSelectorContainer) {
    teamSelectorContainer.style.display = 'block';
    populateTeamSelector();
  } else {
    // Create team selector if it doesn't exist
    createTeamSelector();
  }
}

// Create team selector UI component
function createTeamSelector() {
  const dashboardSection = document.getElementById('dashboard-section');
  if (!dashboardSection) {
    console.warn('Dashboard section not found for team selector');
    return;
  }
  
  // Create team selector container
  const container = document.createElement('div');
  container.id = 'team-selector-container';
  container.className = 'team-selector-container';
  
  // Create team selector HTML
  container.innerHTML = `
    <div class="team-selector-wrapper">
      <label for="team-selector" class="team-selector-label">Current Team:</label>
      <select id="team-selector" class="team-selector">
        <option value="">Loading teams...</option>
      </select>
      <span class="team-selector-indicator">🏈</span>
    </div>
  `;
  
  // Insert after the school name display
  const schoolDisplay = dashboardSection.querySelector('.school-info');
  if (schoolDisplay) {
    schoolDisplay.parentNode.insertBefore(container, schoolDisplay.nextSibling);
  } else {
    // Insert at the beginning of dashboard if school display not found
    dashboardSection.insertBefore(container, dashboardSection.firstChild);
  }
  
  // Setup event listener
  const selector = container.querySelector('#team-selector');
  if (selector) {
    selector.addEventListener('change', handleTeamSelectorChange);
  }
  
  // Populate with teams
  populateTeamSelector();
}

// Populate team selector with available teams
function populateTeamSelector() {
  const selector = document.getElementById('team-selector');
  if (!selector) return;
  
  // Clear existing options
  selector.innerHTML = '';
  
  if (!state.allTeams || state.allTeams.length === 0) {
    selector.innerHTML = '<option value="">No teams available</option>';
    selector.disabled = true;
    return;
  }
  
  // Add teams to selector
  state.allTeams.forEach(team => {
    const option = document.createElement('option');
    option.value = team.teamId;
    option.textContent = `${team.schoolName} (${team.division || 'Unknown'})`;
    
    // Mark current team as selected
    if (state.currentTeamInfo && team.teamId === state.currentTeamInfo.teamId) {
      option.selected = true;
    }
    
    selector.appendChild(option);
  });
  
  selector.disabled = false;
}

// Handle team selector change
async function handleTeamSelectorChange(event) {
  const selectedTeamId = event.target.value;
  
  if (!selectedTeamId || selectedTeamId === state.currentTeamId) {
    return; // No change or invalid selection
  }
  
  try {
    setStatusMessage('Switching teams...', 'info');
    
    // Find the selected team info
    const selectedTeam = state.allTeams.find(team => team.teamId === selectedTeamId);
    if (!selectedTeam) {
      throw new Error('Selected team not found');
    }
    
    // Update current team in multi-team storage
    await multiTeamStorage.setCurrentTeam(selectedTeamId);
    
    // Update local state
    state.currentTeamInfo = selectedTeam;
    state.currentTeamId = selectedTeamId;
    
    // Clear all filters when manually switching teams via selector
    console.log('Manual team switch - clearing filters...');
    clearAllFilters();
    
    // Clear current data to force refresh
    state.recruits = [];
    state.filtered_recruits = [];
    state.current_page = 1;
    
    // Refresh all data for the new team
    await loadInitialData();
    
    setStatusMessage(`Switched to ${selectedTeam.schoolName}`, 'success');
    
  } catch (error) {
    console.error('Error switching teams:', error);
    setStatusMessage(`Error switching teams: ${error.message}`, 'error');
    
    // Revert selector to current team
    if (state.currentTeamInfo) {
      event.target.value = state.currentTeamInfo.teamId;
    }
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

  // Undecided filter
  if (elements.filter_undecided) {
    elements.filter_undecided.addEventListener('change', (event) => {
      state.filters.undecided = event.target.checked;
      applyFilters();
    });
  }

  // Clear attribute filters button
  if (elements.clear_attribute_filters) {
    elements.clear_attribute_filters.addEventListener('click', clearAttributeFilters);
  }

  // Setup attribute filter inputs
  setupAttributeFilters();
}

// Setup attribute filter inputs
function setupAttributeFilters() {
  if (!elements.attribute_filters_container) return;

  // Clear existing content
  elements.attribute_filters_container.innerHTML = '';

  // Create attribute filters grid container for numeric filters
  const attributeFiltersGridContainer = document.createElement('div');
  attributeFiltersGridContainer.className = 'attribute-filters-grid-container';
  
  const attributeFiltersGrid = document.createElement('div');
  attributeFiltersGrid.className = 'attribute-filters-grid';
  
  ATTRIBUTE_COLUMNS.forEach(column => {
    // Create the filter group container
    const filterGroup = document.createElement('div');
    filterGroup.className = 'attribute-filter-group';

    // Create the label
    const label = document.createElement('label');
    label.htmlFor = `filter-${column.key}`;
    label.textContent = `${column.label} ≥`;

    // Create the input
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `filter-${column.key}`;
    input.className = 'attribute-filter-input';
    input.placeholder = column.type === 'decimal' ? '0.0' : '0';
    input.min = column.min;
    input.max = column.max;
    input.step = column.step;
    input.title = `Filter ${column.label} (minimum value)`;

    // Add event listener
    input.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      state.filters.attribute_filters[column.key] = value;
      
      // Add visual indicator if filter is active
      if (value) {
        input.classList.add('filter-active');
      } else {
        input.classList.remove('filter-active');
      }
      
      // Debounce the filter application
      debounce(() => {
        applyFilters();
        updateFilterSummary();
      }, 300, `attribute-filter-${column.key}`);
    });

    // Apply existing filter value if any
    if (state.filters.attribute_filters[column.key]) {
      input.value = state.filters.attribute_filters[column.key];
      input.classList.add('filter-active');
    }

    // Assemble the filter group
    filterGroup.appendChild(label);
    filterGroup.appendChild(input);
    attributeFiltersGrid.appendChild(filterGroup);
  });
  
  // Add the grid to its container
  attributeFiltersGridContainer.appendChild(attributeFiltersGrid);
  
  // Add the attribute filters grid container to the main container
  elements.attribute_filters_container.appendChild(attributeFiltersGridContainer);

  // Create text search filters grid container
  const textSearchFiltersGridContainer = document.createElement('div');
  textSearchFiltersGridContainer.className = 'text-search-filters-grid-container';
  
  const textSearchFiltersGrid = document.createElement('div');
  textSearchFiltersGrid.className = 'text-search-filters-grid';

  TEXT_SEARCH_COLUMNS.forEach(column => {
    // Create the filter group container
    const filterGroup = document.createElement('div');
    filterGroup.className = 'text-search-filter-group';

    // Create the label
    const label = document.createElement('label');
    label.htmlFor = `filter-${column.key}`;
    label.textContent = column.label;
    label.className = 'text-search-filter-label';

    // Create the input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `filter-${column.key}`;
    input.className = 'text-search-filter-input';
    input.placeholder = column.placeholder || 'Search...';
    input.title = `Search in ${column.label}`;

    // Add event listener
    input.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      state.filters.text_search_filters[column.key] = value;
      
      // Add visual indicator if filter is active
      if (value) {
        input.classList.add('filter-active');
      } else {
        input.classList.remove('filter-active');
      }
      
      // Debounce the filter application
      debounce(() => {
        applyFilters();
        updateFilterSummary();
      }, 300, `text-search-filter-${column.key}`);
    });

    // Apply existing filter value if any
    if (state.filters.text_search_filters[column.key]) {
      input.value = state.filters.text_search_filters[column.key];
      input.classList.add('filter-active');
    }

    // Assemble the filter group
    filterGroup.appendChild(label);
    filterGroup.appendChild(input);
    textSearchFiltersGrid.appendChild(filterGroup);
  });
  
  // Add the grid to its container
  textSearchFiltersGridContainer.appendChild(textSearchFiltersGrid);
  
  // Add the text search filters grid container to the main container
  elements.attribute_filters_container.appendChild(textSearchFiltersGridContainer);

  // Initialize filter summary
  updateFilterSummary();
}

// Clear all attribute filters
function clearAttributeFilters() {
  // Reset all attribute filter values
  Object.keys(state.filters.attribute_filters).forEach(key => {
    state.filters.attribute_filters[key] = '';
  });

  // Reset all text search filter values
  Object.keys(state.filters.text_search_filters).forEach(key => {
    state.filters.text_search_filters[key] = '';
  });

  // Clear all input values and remove active indicators
  ATTRIBUTE_COLUMNS.forEach(column => {
    const input = document.getElementById(`filter-${column.key}`);
    if (input) {
      input.value = '';
      input.classList.remove('filter-active');
    }
  });

  // Clear all text search input values and remove active indicators
  TEXT_SEARCH_COLUMNS.forEach(column => {
    const input = document.getElementById(`filter-${column.key}`);
    if (input) {
      input.value = '';
      input.classList.remove('filter-active');
    }
  });

  // Update filter summary and apply filters
  updateFilterSummary();
  applyFilters();
}

// Update filter summary with count of active filters
function updateFilterSummary() {
  const toggleText = document.querySelector('.toggle-text');
  if (!toggleText) return;

  const activeAttributeFilterCount = Object.values(state.filters.attribute_filters)
    .filter(value => value && value.trim() !== '').length;
  
  const activeTextSearchFilterCount = Object.values(state.filters.text_search_filters)
    .filter(value => value && value.trim() !== '').length;
  
  const totalActiveFilterCount = activeAttributeFilterCount + activeTextSearchFilterCount;

  // Update toggle text with count
  const baseText = 'Attribute & Text Filters';
  if (totalActiveFilterCount > 0) {
    toggleText.innerHTML = `${baseText} <span class="filter-summary-badge">${totalActiveFilterCount}</span>`;
  } else {
    toggleText.textContent = baseText;
  }
}

// Check if recruit matches attribute filters
function matchesAttributeFilters(recruit) {
  for (const [attribute, filterValue] of Object.entries(state.filters.attribute_filters)) {
    if (!filterValue || filterValue.trim() === '') continue;

    const recruitValue = recruit[attribute];
    if (recruitValue === null || recruitValue === undefined || recruitValue === '') {
      continue; // Skip if recruit doesn't have this attribute
    }

    const numericFilterValue = parseFloat(filterValue);
    const numericRecruitValue = parseFloat(recruitValue);

    // Skip if either value is not numeric
    if (isNaN(numericFilterValue) || isNaN(numericRecruitValue)) {
      continue;
    }

    // Filter should show recruits with values >= the filter value
    if (numericRecruitValue < numericFilterValue) {
      return false;
    }
  }

  return true;
}

// Check if recruit matches text search filters
function matchesTextSearchFilters(recruit) {
  for (const [filterKey, filterValue] of Object.entries(state.filters.text_search_filters)) {
    if (!filterValue || filterValue.trim() === '') continue;

    // Map filter keys to recruit data fields
    let recruitValue = '';
    switch (filterKey) {
      case 'considering_schools':
        recruitValue = recruit.considering || '';
        break;
      default:
        console.warn(`Unknown text search filter key: ${filterKey}`);
        continue;
    }

    // Convert both values to lowercase for case-insensitive search
    const searchTerm = filterValue.toLowerCase().trim();
    const recruitText = recruitValue.toLowerCase();

    // Check if the recruit's text contains the search term
    if (!recruitText.includes(searchTerm)) {
      return false;
    }
  }

  return true;
}

// Setup pagination event listeners
function setupPaginationListeners() {
  // Bottom pagination controls
  if (elements.prev_page_btn) {
    elements.prev_page_btn.addEventListener('click', () => {
      changePage(-1);
    });
  }
  
  if (elements.next_page_btn) {
    elements.next_page_btn.addEventListener('click', () => {
      changePage(1);
    });
  }
  
  // Top pagination controls
  if (elements.prev_page_btn_top) {
    elements.prev_page_btn_top.addEventListener('click', () => {
      changePage(-1);
    });
  }
  
  if (elements.next_page_btn_top) {
    elements.next_page_btn_top.addEventListener('click', () => {
      changePage(1);
    });
  }
  
  // Page size selector
  if (elements.page_size_select) {
    elements.page_size_select.addEventListener('change', handlePageSizeChange);
  }
  
  // Setup collapsible attribute filters
  setupAttributeFiltersToggle();
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
  
  // Column order
  if (elements.btn_column_order) {
    elements.btn_column_order.addEventListener('click', openColumnOrderModal);
  }
  
  // Reset column order button in settings
  const resetColumnOrderBtn = document.getElementById('btn-reset-column-order');
  if (resetColumnOrderBtn) {
    resetColumnOrderBtn.addEventListener('click', handleResetColumnOrder);
  }
  
  // Show donation modal button in settings
  const showDonationModalBtn = document.getElementById('btn-show-donation-modal');
  if (showDonationModalBtn) {
    showDonationModalBtn.addEventListener('click', handleShowDonationModal);
  }
}

// Setup modal event listeners
function setupModalListeners() {
  // Column visibility modal
  setupColumnVisibilityModalListeners();
  
  // Column order modal
  setupColumnOrderModalListeners();
  
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
    setStatusMessage('Opening clear data options...', 'info');
    
    // Show clear data modal
    showClearDataModal();
    
  } catch (error) {
    handleError(error, 'clear data');
  }
}

// Show clear data modal with team-specific options
function showClearDataModal() {
  const modal = document.getElementById('clear-data-modal');
  if (!validateElement(modal, 'clear-data-modal')) return;
  
  // Initialize modal content
  initializeClearDataModal();
  
  // Show modal
  modal.classList.remove('hidden');
  
  // Setup event listeners if not already done
  if (!modal.dataset.initialized) {
    setupClearDataModalListeners();
    modal.dataset.initialized = 'true';
  }
}

// Initialize clear data modal content
function initializeClearDataModal() {
  const modal = document.getElementById('clear-data-modal');
  if (!modal) return;
  
  console.log('Initializing clear data modal...');
  console.log('Multi-team enabled:', state.multiTeamEnabled);
  console.log('Current team info:', state.currentTeamInfo);
  console.log('All teams count:', state.allTeams?.length);
  
  // Update current team info display
  const currentTeamDisplay = document.getElementById('clear-current-team-display');
  if (currentTeamDisplay) {
    if (state.currentTeamInfo && state.currentTeamInfo.schoolName) {
      const teamName = `${state.currentTeamInfo.schoolName} (${state.currentTeamInfo.division || 'Unknown Division'})`;
      currentTeamDisplay.textContent = teamName;
      console.log('Updated team display to:', teamName);
    } else {
      currentTeamDisplay.textContent = 'No team information available';
      console.log('No team info available for display');
    }
  }
  
  // Update option descriptions based on context
  updateClearOptionDescriptions();
  
  // Set default selection and update preview
  const isMultiTeam = state.multiTeamEnabled && state.allTeams?.length > 1;
  const defaultOption = isMultiTeam ? 'currentTeam' : 'allTeams';
  console.log('Setting default option to:', defaultOption, '(multi-team:', isMultiTeam, ')');
  
  const defaultRadio = document.getElementById(`clear-${defaultOption.replace('Teams', '-teams')}`);
  if (defaultRadio) {
    defaultRadio.checked = true;
    updateClearDataPreview(defaultRadio.value);
    console.log('Set default radio to:', defaultRadio.value);
  }
  
  // Show/hide multi-team specific options
  const currentTeamOption = document.querySelector('.clear-option:has(#clear-current-team)');
  if (currentTeamOption) {
    if (isMultiTeam) {
      currentTeamOption.style.display = 'block';
      console.log('Showing current team option for multi-team mode');
    } else {
      currentTeamOption.style.display = 'none';
      console.log('Hiding current team option for single-team mode');
    }
  }
}

// Update clear option descriptions based on current context
function updateClearOptionDescriptions() {
  const currentTeamDesc = document.getElementById('clear-current-team-description');
  const allTeamsDesc = document.getElementById('clear-all-teams-description');
  
  const currentTeamName = state.currentTeamInfo?.schoolName || 'Current Team';
  const recruitCount = state.recruits?.length || 0;
  const totalTeams = state.allTeams?.length || 1;
  
  if (currentTeamDesc) {
    currentTeamDesc.textContent = `Clear recruit data for ${currentTeamName} only (${recruitCount} recruits). Other teams will remain unchanged.`;
  }
  
  if (allTeamsDesc) {
    if (state.multiTeamEnabled && totalTeams > 1) {
      allTeamsDesc.textContent = `Clear recruit data for ALL ${totalTeams} teams. Team configurations and role ratings will be preserved.`;
    } else {
      allTeamsDesc.textContent = 'Clear all recruit data, season number, and configuration. Role ratings will be preserved.';
    }
  }
}

// Setup clear data modal event listeners
function setupClearDataModalListeners() {
  const modal = document.getElementById('clear-data-modal');
  if (!modal) return;
  
  console.log('Setting up clear data modal listeners...');
  
  // Close button
  const closeBtn = document.getElementById('clear-data-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeClearDataModal);
    console.log('Added close button listener');
  }
  
  // Cancel button
  const cancelBtn = document.getElementById('clear-data-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeClearDataModal);
    console.log('Added cancel button listener');
  }
  
  // Confirm button
  const confirmBtn = document.getElementById('clear-data-confirm');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleClearDataConfirm);
    console.log('Added confirm button listener');
  }
  
  // Radio button changes
  const radioButtons = modal.querySelectorAll('input[name="clearScope"]');
  console.log('Found radio buttons:', radioButtons.length);
  radioButtons.forEach(radio => {
    radio.addEventListener('change', (event) => {
      if (event.target.checked) {
        console.log('Radio changed to:', event.target.value);
        updateClearDataPreview(event.target.value);
      }
    });
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeClearDataModal();
    }
  });
  
  console.log('Clear data modal listeners setup complete');
}

// Update clear data impact preview
function updateClearDataPreview(option) {
  const impactText = document.getElementById('clear-impact-text');
  if (!impactText) return;
  
  const currentTeamName = state.currentTeamInfo?.schoolName || 'Current Team';
  const recruitCount = state.recruits?.length || 0;
  const totalTeams = state.allTeams?.length || 1;
  
  let message = '';
  
  console.log('Updating preview for option:', option);
  
  switch (option) {
    case 'currentTeam':
      message = `This will permanently delete all recruit data for ${currentTeamName}. `;
      message += `Approximately ${recruitCount} recruits will be removed. `;
      if (totalTeams > 1) {
        message += `Data for your other ${totalTeams - 1} team(s) will remain unchanged.`;
      }
      break;
      
    case 'allTeams':
      if (state.multiTeamEnabled && totalTeams > 1) {
        message = `This will permanently delete ALL recruit data across all ${totalTeams} teams. `;
        message += `All team recruits, watchlists, and season configurations will be lost. `;
        message += `Role ratings and extension settings will be preserved.`;
      } else {
        message = `This will permanently delete ALL recruit data. `;
        message += `All recruits, watchlist, and season configuration will be lost. `;
        message += `Role ratings and extension settings will be preserved.`;
      }
      break;
      
    default:
      message = 'Please select an option to see the impact.';
  }
  
  impactText.textContent = message;
  console.log('Updated preview text:', message);
}

// Close clear data modal
function closeClearDataModal() {
  const modal = document.getElementById('clear-data-modal');
  if (modal) {
    modal.classList.add('hidden');
    console.log('Clear data modal closed');
  }
}

// Handle clear data confirmation
async function handleClearDataConfirm() {
  const modal = document.getElementById('clear-data-modal');
  if (!modal) return;
  
  const selectedOption = modal.querySelector('input[name="clearScope"]:checked');
  if (!selectedOption) {
    setStatusMessage('Please select an option', 'warning');
    return;
  }
  
  const option = selectedOption.value;
  const confirmBtn = document.getElementById('clear-data-confirm');
  
  console.log('Confirming clear data with option:', option);
  
  // Get additional confirmation from user
  const confirmationMessage = getConfirmationMessage(option);
  if (!confirm(confirmationMessage)) {
    console.log('User cancelled confirmation dialog');
    return;
  }
  
  try {
    // Show loading state
    modal.classList.add('loading');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processing...';
    }
    
    switch (option) {
      case 'currentTeam':
        await handleClearCurrentTeam();
        break;
      case 'allTeams':
        await handleClearAllTeams();
        break;
      default:
        throw new Error('Invalid clear option selected');
    }
    
  } catch (error) {
    console.error('Error during clear operation:', error);
    setStatusMessage(`Error: ${error.message}`, 'error');
  } finally {
    // Reset modal state
    modal.classList.remove('loading');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Clear Data';
    }
    closeClearDataModal();
  }
}

// Get confirmation message for clear operation
function getConfirmationMessage(option) {
  const currentTeamName = state.currentTeamInfo?.schoolName || 'Current Team';
  const recruitCount = state.recruits?.length || 0;
  const totalTeams = state.allTeams?.length || 1;
  
  switch (option) {
    case 'currentTeam':
      return `Are you absolutely sure you want to clear all data for ${currentTeamName}?\n\n` +
             `This will permanently delete:\n` +
             `• ${recruitCount} recruits\n` +
             `• Watchlist entries\n` +
             `• Season configuration\n\n` +
             `This action cannot be undone.`;
      
    case 'allTeams':
      if (state.multiTeamEnabled && totalTeams > 1) {
        return `Are you absolutely sure you want to clear ALL data for ALL ${totalTeams} teams?\n\n` +
               `This will permanently delete:\n` +
               `• All recruit data across all teams\n` +
               `• All watchlist entries\n` +
               `• All season configurations\n\n` +
               `This action cannot be undone.`;
      } else {
        return `Are you absolutely sure you want to clear ALL extension data?\n\n` +
               `This will permanently delete:\n` +
               `• ${recruitCount} recruits\n` +
               `• Watchlist entries\n` +
               `• Season configuration\n\n` +
               `This action cannot be undone.`;
      }
      
    default:
      return 'Are you sure you want to proceed with this action?';
  }
}

// Handle clearing current team data only
async function handleClearCurrentTeam() {
  console.log('=== handleClearCurrentTeam START ===');
  console.log('Initial state:', {
    multiTeamEnabled: state.multiTeamEnabled,
    currentTeamInfo: state.currentTeamInfo,
    currentTeamId: state.currentTeamId
  });
  
  setStatusMessage('Clearing current team data...', 'info');
  
  // Multi-team approach: get team info and use team-specific clearing
  let currentTeamInfo = state.currentTeamInfo;
  let teamId = state.currentTeamId;
  
  console.log('Getting team information...');
  console.log('Initial values:', { currentTeamInfo, teamId });
  
  // Try to get from multi-team storage
  if (!teamId && multiTeamStorage) {
    try {
      console.log('Trying to get current team from multiTeamStorage...');
      const currentTeam = await multiTeamStorage.getCurrentTeam();
      console.log('getCurrentTeam result:', currentTeam);
      
      if (currentTeam && currentTeam.teamId) {
        teamId = currentTeam.teamId;
        currentTeamInfo = currentTeam;
        console.log('Got team info from multiTeamStorage:', { teamId, currentTeamInfo });
      }
    } catch (error) {
      console.warn('Could not get team from multiTeamStorage:', error);
    }
  }
  
  // Try to get from dashboard elements if still no team info
  if (!currentTeamInfo) {
    console.log('Trying to get team info from dashboard elements...');
    const schoolName = elements.school_name?.textContent || elements.dashboard_school_name?.textContent;
    const division = elements.team_division?.textContent;
    const world = elements.team_world?.textContent;
    
    console.log('Dashboard elements:', { schoolName, division, world });
    
    if (schoolName && schoolName !== 'Unknown School' && schoolName.trim() !== '') {
      currentTeamInfo = {
        schoolName: schoolName.trim(),
        division: division?.trim() || 'Unknown',
        world: world?.trim() || 'Unknown'
      };
      console.log('Created team info from dashboard:', currentTeamInfo);
    }
  }
  
  // For single-team mode OR when we can't identify the specific team,
  // use the safer clearCurrentTeamOnly action that handles the logic in background
  if (!state.multiTeamEnabled || !teamId) {
    console.log('Using clearCurrentTeamOnly action for safer single-team clearing');
    
    const response = await popupComms.sendMessageToBackground({
      action: 'clearCurrentTeamOnly'
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear current team data');
    }
    
    console.log('Current team data cleared successfully:', response);
    
    // Reset local state
    state.recruits = [];
    state.filtered_recruits = [];
    state.current_page = 1;
    state.last_data_refresh = null;
    
    // Update displays
    updateRecruitsList();
    updatePaginationDisplay();
    await refreshDashboardData();
    
    const teamName = currentTeamInfo?.schoolName || 'Current team';
    setStatusMessage(`${teamName} data cleared successfully`, 'success');
    console.log('=== handleClearCurrentTeam END (clearCurrentTeamOnly success) ===');
    return;
  }
  
  // Multi-team mode with specific team ID - use team-specific clearing
  console.log('Using team-specific clear for teamId:', teamId);
  
  const response = await popupComms.sendMessageToBackground({
    action: 'clearTeamData',
    teamId: teamId
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to clear team data');
  }
  
  console.log('Team-specific clear succeeded:', response);
  
  // Reset local state for current team
  state.recruits = [];
  state.filtered_recruits = [];
  state.current_page = 1;
  state.last_data_refresh = null;
  
  // Update displays
  updateRecruitsList();
  updatePaginationDisplay();
  
  // Force a complete dashboard refresh
  setTimeout(async () => {
    await refreshDashboardData();
    if (state.multiTeamEnabled) {
      updateTeamSelector();
    }
  }, 100);
  
  const teamName = currentTeamInfo?.schoolName || `Team ${teamId}`;
  const successMessage = `${teamName} data cleared successfully`;
  setStatusMessage(successMessage, 'success');
  console.log('=== handleClearCurrentTeam END (team-specific success) ===');
}

// Handle clearing all teams data
async function handleClearAllTeams() {
  setStatusMessage('Clearing all data...', 'info');
  console.log('Clearing all data across all teams');
  
  const response = await popupComms.sendMessageToBackground({
    action: 'clearAllData'
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to clear all data');
  }
  
  console.log('All data cleared successfully:', response);
  
  // Reset local state
  state.recruits = [];
  state.filtered_recruits = [];
  state.current_page = 1;
  
  // Clear team info if in multi-team mode
  if (state.multiTeamEnabled) {
    // Note: Don't clear allTeams and currentTeamInfo as the teams still exist,
    // just their data has been cleared
    console.log('Multi-team mode: teams still exist but data cleared');
  }
  
  // Update displays
  updateRecruitsList();
  updatePaginationDisplay();
  await refreshDashboardData();
  
  // Provide detailed feedback about the clearing operation
  const details = response.details;
  let successMessage = 'All data cleared successfully';
  
  if (details && details.teamsProcessed > 1) {
    // Multi-team scenario
    if (details.successfulTeams === details.teamsProcessed) {
      successMessage = `Data cleared successfully across all ${details.teamsProcessed} teams (${details.totalRecruitsClearedCount} total recruits removed)`;
    } else {
      successMessage = `Data cleared for ${details.successfulTeams} of ${details.teamsProcessed} teams (${details.totalRecruitsClearedCount} total recruits removed)`;
    }
  } else if (details && details.totalRecruitsClearedCount > 0) {
    // Single team scenario
    successMessage = `All data cleared successfully (${details.totalRecruitsClearedCount} recruits removed)`;
  }
  
  // Show warning if there were any issues
  if (response.warning) {
    console.warn('Clear operation completed with warnings:', response.warning);
    successMessage += ` (${response.warning})`;
  }
  
  setStatusMessage(successMessage, 'success');
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

/**
 * Generate tooltip for role rating columns (R1-R6)
 * @param {string} position - Recruit position (e.g., 'QB', 'RB')
 * @param {string} roleColumn - Role column key (e.g., 'r1', 'r2')
 * @param {number|string} rating - The rating value
 * @returns {string} Tooltip text
 */
function getRoleRatingTooltip(position, roleColumn, rating) {
  // Return basic tooltip if no position or rating
  if (!position || !roleColumn || (rating === null || rating === undefined || rating === '')) {
    return `${roleColumn.toUpperCase()} rating`;
  }

  // Try to get role information from loaded data
  if (state.role_ratings && state.role_ratings.data) {
    const positionKey = POSITION_MAP[position.toUpperCase()];
    
    if (positionKey && state.role_ratings.data[positionKey]) {
      const positionData = state.role_ratings.data[positionKey];
      const activeRoles = Object.entries(positionData).filter(([, roleData]) => roleData.isActive);
      
      // Map R1-R6 to role indices (R1 = first active role, R2 = second, etc.)
      const roleIndex = parseInt(roleColumn.substring(1)) - 1; // r1 -> 0, r2 -> 1, etc.
      
      if (roleIndex >= 0 && roleIndex < activeRoles.length) {
        const [roleKey, roleData] = activeRoles[roleIndex];
        const roleLabel = roleData.roleLabel || roleKey;
        
        return `${roleColumn.toUpperCase()}: ${roleLabel} (${rating})`;
      }
    }
  }
  
  // Fallback tooltip
  return `${roleColumn.toUpperCase()}: ${rating} (${position} role rating)`;
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

// Setup column order modal listeners
function setupColumnOrderModalListeners() {
  if (elements.column_order_save) {
    elements.column_order_save.addEventListener('click', handleSaveColumnOrder);
  }
  
  if (elements.column_order_reset) {
    elements.column_order_reset.addEventListener('click', handleResetColumnOrder);
  }
  
  if (elements.column_order_cancel) {
    elements.column_order_cancel.addEventListener('click', closeColumnOrderModal);
  }
  
  // Close button
  if (elements.column_order_modal_close) {
    elements.column_order_modal_close.addEventListener('click', closeColumnOrderModal);
  }
  
  // Close on backdrop click
  if (elements.column_order_modal) {
    elements.column_order_modal.addEventListener('click', (event) => {
      if (event.target === elements.column_order_modal) {
        closeColumnOrderModal();
      }
    });
  }
}

// Open column order modal
function openColumnOrderModal() {
  if (!validateElement(elements.column_order_modal, 'column-order-modal')) return;
  
  populateColumnOrderList();
  elements.column_order_modal.classList.remove('hidden');
}

// Close column order modal
function closeColumnOrderModal() {
  if (elements.column_order_modal) {
    elements.column_order_modal.classList.add('hidden');
  }
}

// Populate column order list with drag and drop functionality
function populateColumnOrderList() {
  if (!elements.column_order_list) return;
  
  elements.column_order_list.innerHTML = '';
  
  // Create sortable list based on current column order
  const orderedColumns = state.column_order.map(columnKey => {
    return COLUMNS.find(col => col.key === columnKey);
  }).filter(Boolean); // Remove any null/undefined entries
  
  orderedColumns.forEach((column, index) => {
    const item = document.createElement('div');
    item.className = 'column-order-item';
    item.draggable = true;
    item.dataset.columnKey = column.key;
    item.dataset.originalIndex = index;
    
    // Add grab handle
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = '⋮⋮';
    handle.title = 'Drag to reorder';
    
    // Add column label
    const label = document.createElement('span');
    label.className = 'column-label';
    label.textContent = column.label;
    
    // Add visibility indicator
    const visibilityIndicator = document.createElement('span');
    visibilityIndicator.className = 'visibility-indicator';
    const isVisible = state.column_visibility[column.key] !== false;
    visibilityIndicator.textContent = isVisible ? '👁' : '🚫';
    visibilityIndicator.title = isVisible ? 'Column is visible' : 'Column is hidden';
    
    item.appendChild(handle);
    item.appendChild(label);
    item.appendChild(visibilityIndicator);
    
    // Add drag event listeners
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
    
    elements.column_order_list.appendChild(item);
  });
}

// Drag and drop event handlers
let draggedElement = null;

function handleDragStart(event) {
  draggedElement = event.target;
  event.target.style.opacity = '0.5';
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/html', event.target.outerHTML);
}

function handleDragOver(event) {
  if (event.preventDefault) {
    event.preventDefault();
  }
  
  event.dataTransfer.dropEffect = 'move';
  
  // Add visual feedback
  const targetItem = event.target.closest('.column-order-item');
  if (targetItem && targetItem !== draggedElement) {
    targetItem.classList.add('drag-over');
  }
  
  return false;
}

function handleDrop(event) {
  if (event.stopPropagation) {
    event.stopPropagation();
  }
  
  const targetItem = event.target.closest('.column-order-item');
  
  if (draggedElement !== targetItem && targetItem) {
    // Get the container
    const container = elements.column_order_list;
    const allItems = Array.from(container.children);
    
    // Get indices
    const draggedIndex = allItems.indexOf(draggedElement);
    const targetIndex = allItems.indexOf(targetItem);
    
    // Reorder the DOM elements
    if (draggedIndex < targetIndex) {
      container.insertBefore(draggedElement, targetItem.nextSibling);
    } else {
      container.insertBefore(draggedElement, targetItem);
    }
    
    // Update the column order state
    updateColumnOrderFromDOM();
  }
  
  // Clean up visual feedback
  targetItem?.classList.remove('drag-over');
  
  return false;
}

function handleDragEnd(event) {
  event.target.style.opacity = '';
  draggedElement = null;
  
  // Clean up any remaining drag-over classes
  const items = elements.column_order_list.querySelectorAll('.column-order-item');
  items.forEach(item => {
    item.classList.remove('drag-over');
  });
}

// Update column order state from DOM order
function updateColumnOrderFromDOM() {
  const items = elements.column_order_list.querySelectorAll('.column-order-item');
  const newOrder = Array.from(items).map(item => item.dataset.columnKey);
  state.column_order = newOrder;
}

// Handle save column order
async function handleSaveColumnOrder() {
  try {
    // Save to storage
    await chrome.storage.local.set({
      [COLUMN_ORDER_STORAGE_KEY]: state.column_order
    });
    
    // Apply the new order by rebuilding the table header and updating display
    applyColumnOrder();
    closeColumnOrderModal();
    
    setStatusMessage('Column order updated', 'success');
    
  } catch (error) {
    handleError(error, 'column order save');
  }
}

// Handle reset column order
async function handleResetColumnOrder() {
  try {
    // Confirm reset action
    if (!confirm('Are you sure you want to reset the column order to default? This will undo any custom column ordering.')) {
      return;
    }
    
    setStatusMessage('Resetting column order...', 'info');
    
    // Reset to default order (keys from COLUMNS array)
    state.column_order = COLUMNS.map(col => col.key);
    
    // Save to storage
    await chrome.storage.local.set({
      [COLUMN_ORDER_STORAGE_KEY]: state.column_order
    });
    
    // Apply the changes to the table
    rebuildTableWithNewOrder();
    
    // If column order modal is open, repopulate it
    if (!elements.column_order_modal?.classList.contains('hidden')) {
      populateColumnOrderList();
    }
    
    setStatusMessage('Column order reset to default', 'success');
    
  } catch (error) {
    handleError(error, 'column order reset');
  }
}

// Apply column order to recruits table
function applyColumnOrder() {
  try {
    const table = document.getElementById('recruits-table');
    if (!table) {
      console.warn('Recruits table not found for column order');
      return;
    }
    
    const headerRow = table.querySelector('thead tr');
    const dataRows = table.querySelectorAll('tbody tr');
    
    if (!headerRow) {
      console.warn('Table header row not found');
      return;
    }
    
    // Create new header based on column order
    const newHeaderRow = document.createElement('tr');
    state.column_order.forEach(columnKey => {
      const column = COLUMNS.find(col => col.key === columnKey);
      if (column) {
        const th = document.createElement('th');
        th.textContent = column.label;
        
        // Copy any existing attributes and classes from the original header
        const originalTh = Array.from(headerRow.children).find((cell, index) => {
          return index < COLUMNS.length && COLUMNS[index].key === columnKey;
        });
        
        if (originalTh) {
          // Copy classes and attributes
          th.className = originalTh.className;
          Array.from(originalTh.attributes).forEach(attr => {
            if (attr.name !== 'class') {
              th.setAttribute(attr.name, attr.value);
            }
          });
        }
        
        newHeaderRow.appendChild(th);
      }
    });
    
    // Replace the header row
    headerRow.parentNode.replaceChild(newHeaderRow, headerRow);
    
    // Reorder data cells in each row
    dataRows.forEach(row => {
      const cells = Array.from(row.children);
      const newRow = document.createElement('tr');
      
      // Copy row attributes
      Array.from(row.attributes).forEach(attr => {
        newRow.setAttribute(attr.name, attr.value);
      });
      newRow.className = row.className;
      
      // Add cells in the new order
      state.column_order.forEach(columnKey => {
        const columnIndex = COLUMNS.findIndex(col => col.key === columnKey);
        if (columnIndex !== -1 && columnIndex < cells.length) {
          const cell = cells[columnIndex].cloneNode(true);
          newRow.appendChild(cell);
        }
      });
      
      // Replace the row
      row.parentNode.replaceChild(newRow, row);
    });
    
    // Reapply column visibility after reordering
    applyColumnVisibility();
    
    // Reapply table sorting after reordering
    setupTableSorting();
    
  } catch (error) {
    console.error('Error in applyColumnOrder:', error);
    handleError(error, 'applying column order');
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

  // Create role cards with enhanced role labels
  activeRoles.forEach(([roleKey, roleData], index) => {
    const roleId = `${positionKey}.${roleKey}`;
    const total = calculateRoleTotal(roleData.attributes);
    const isValid = Math.abs(total - 100) < 0.1;
    
    // Generate custom role label (R1, R2, etc.) based on the role index
    const customRoleLabel = `R${index + 1}`;
    const genericRoleLabel = roleData.roleLabel;

    html += `
      <div class="role-card ${isValid ? 'valid' : 'invalid'}" data-role="${roleId}">
        <div class="role-header">
          <div class="role-title">
            <h4 class="role-main-label">${customRoleLabel} = ${genericRoleLabel}</h4>
            <span class="role-description">${customRoleLabel} (${genericRoleLabel})</span>
          </div>
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
    
    // Ensure column visibility state exists
    if (!state.column_visibility) {
      console.warn('Column visibility state not initialized');
      return;
    }
    
    // Apply to header - use column order and data attributes to determine visibility
    const headerCells = headerRow.querySelectorAll('th');
    headerCells.forEach((cell, displayIndex) => {
      try {
        // Get the column key from the data attribute (set during header creation)
        const columnKey = cell.getAttribute('data-column-key');
        if (columnKey) {
          const isVisible = state.column_visibility[columnKey] !== false;
          cell.style.display = isVisible ? '' : 'none';
        }
      } catch (cellError) {
        console.warn(`Error applying visibility to header cell ${displayIndex}:`, cellError);
      }
    });
    
    // Apply to data rows - use column order to determine which column each cell represents
    dataRows.forEach((row, rowIndex) => {
      try {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, displayIndex) => {
          try {
            // Map display index to column key using the current column order
            if (displayIndex < state.column_order.length) {
              const columnKey = state.column_order[displayIndex];
              const isVisible = state.column_visibility[columnKey] !== false;
              cell.style.display = isVisible ? '' : 'none';
            }
          } catch (cellError) {
            console.warn(`Error applying visibility to cell ${rowIndex},${displayIndex}:`, cellError);
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

// Enhanced table sorting functionality with accessibility and validation plus drag-and-drop
function setupTableSorting() {
  const table = document.getElementById('recruits-table');
  if (!table) {
    console.warn('Recruits table not found for sorting setup');
    return;
  }
  
  const headerCells = table.querySelectorAll('thead th');
  if (headerCells.length === 0) {
    console.warn('No header cells found for sorting setup');
    return;
  }
  
  // Clear any existing event listeners to prevent duplicates
  headerCells.forEach(header => {
    // Clone the node to remove all event listeners
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);
  });
  
  // Re-query after cloning to get fresh references
  const freshHeaderCells = table.querySelectorAll('thead th');
  
  freshHeaderCells.forEach((header, displayIndex) => {
    // Get the column key for this header position
    const columnKey = displayIndex < state.column_order.length ? 
                     state.column_order[displayIndex] : 
                     (displayIndex < COLUMNS.length ? COLUMNS[displayIndex].key : `col-${displayIndex}`);
    
    // Find the column definition
    const columnDef = COLUMNS.find(col => col.key === columnKey);
    
    // Make all headers draggable
    header.draggable = true;
    header.setAttribute('data-column-index', displayIndex);
    header.setAttribute('data-column-key', columnKey);
    
    // Add drag and drop event listeners
    header.addEventListener('dragstart', handleHeaderDragStart);
    header.addEventListener('dragover', handleHeaderDragOver);
    header.addEventListener('drop', handleHeaderDrop);
    header.addEventListener('dragend', handleHeaderDragEnd);
    header.addEventListener('dragenter', handleHeaderDragEnter);
    header.addEventListener('dragleave', handleHeaderDragLeave);
    
    if (columnDef && columnDef.sortable) {
      // Enhanced accessibility attributes
      header.setAttribute('tabindex', '0');
      header.setAttribute('role', 'columnheader');
      header.setAttribute('aria-sort', 'none');
      header.setAttribute('data-sortable', 'true');
      
      // Visual styling for sortable columns
      header.classList.add('sortable');
      header.title = `Click to sort by ${columnDef.label}, or drag to reorder. Currently not sorted.`;
      
      // Single event handler with preventDefault to stop event bubbling
      const handleSort = (event) => {
        // Only handle sorting if it's not a drag operation
        if (event.type === 'click' && !header.dataset.isDragging) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          
          console.log(`Sort triggered for column: ${columnKey}`);
          sortTable(columnKey);
        }
      };
      
      // Mouse click handler
      header.addEventListener('click', handleSort, { once: false, passive: false });
      
      // Keyboard accessibility
      header.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          
          console.log(`Keyboard sort triggered for column: ${columnKey}`);
          sortTable(columnKey);
        }
      }, { passive: false });
      
      // Enhanced hover feedback
      header.addEventListener('mouseenter', () => {
        if (!header.classList.contains('sort-asc') && !header.classList.contains('sort-desc')) {
          header.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
        }
      });
      
      header.addEventListener('mouseleave', () => {
        if (!header.classList.contains('sort-asc') && !header.classList.contains('sort-desc')) {
          header.style.backgroundColor = '';
        }
      });
    } else {
      // Mark non-sortable columns but still draggable
      header.setAttribute('aria-sort', 'none');
      header.setAttribute('data-sortable', 'false');
      header.title = `${columnDef?.label || 'Column'} - drag to reorder`;
    }
  });
  
  console.log(`Table sorting and drag-drop setup completed for ${freshHeaderCells.length} columns`);
}

// Sort table by column with debouncing to prevent double-clicking issues
function sortTable(columnKey) {
  // Debounce to prevent rapid successive calls
  const debounceKey = `sort-${columnKey}`;
  if (state.performance.debounce_timers.has(debounceKey)) {
    console.log(`Sort request for ${columnKey} debounced - already processing`);
    return;
  }
  
  console.log(`Starting sort for column: ${columnKey}, current: ${state.sorting.column}, direction: ${state.sorting.direction}`);
  
  // Set debounce timer
  const timeoutId = setTimeout(() => {
    state.performance.debounce_timers.delete(debounceKey);
  }, 300); // 300ms debounce
  
  state.performance.debounce_timers.set(debounceKey, timeoutId);
  
  // Toggle sort direction if same column, otherwise default to ascending
  if (state.sorting.column === columnKey) {
    state.sorting.direction = state.sorting.direction === 'asc' ? 'desc' : 'asc';
    console.log(`Toggling direction for ${columnKey}: ${state.sorting.direction}`);
  } else {
    state.sorting.column = columnKey;
    state.sorting.direction = 'asc';
    console.log(`New column ${columnKey}: ${state.sorting.direction}`);
  }
  
  // Sort the filtered recruits
  state.filtered_recruits.sort((a, b) => {
    let valueA = a[columnKey] || '';
    let valueB = b[columnKey] || '';
    
    // Handle numeric columns
    if (isNumericColumn(columnKey)) {
      valueA = parseFloat(valueA) || 0;
      valueB = parseFloat(valueB) || 0;
    } else if (columnKey === 'height') {
      // Special handling for height
      valueA = parseHeightToInches(valueA);
      valueB = parseHeightToInches(valueB);
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
  
  console.log(`Sort completed for ${columnKey}: ${state.sorting.direction}, ${state.filtered_recruits.length} items`);
  
  // Reset to first page when sorting changes
  state.current_page = 1;
  
  // Update display
  updateRecruitsList();
  updateSortIndicators();
}

// Check if column contains numeric data
function isNumericColumn(columnKey) {
  const numericColumns = [
    'height', 'weight', 'rating', 'rank', 'miles', 'gpa', 'priority',
    'ath', 'spd', 'dur', 'we', 'sta', 'str', 'blk', 'tkl',
    'han', 'gi', 'elu', 'tec', 
    // Formation IQ columns
    'iq_threefour', 'iq_fourthree', 'iq_fourfour', 'iq_fivetwo', 
    'iq_nickel', 'iq_dime', 'iq_iformation', 'iq_wishbone', 
    'iq_proset', 'iq_ndbox', 'iq_shotgun', 'iq_trips', 'iq_specialteams',
    'r1', 'r2', 'r3', 'r4', 'r5', 'r6'
  ];
  return numericColumns.includes(columnKey);
}

// Parse height values like "6'2" to inches for proper sorting
function parseHeightToInches(height) {
  if (!height || typeof height !== 'string') return 0;
  
  // Handle formats like "6'2", "6'02", "6-2", "6 2", etc.
  const heightMatch = height.match(/(\d+)['"\-\s](\d+)/);
  if (heightMatch) {
    const feet = parseInt(heightMatch[1], 10) || 0;
    const inches = parseInt(heightMatch[2], 10) || 0;
    return (feet * 12) + inches;
  }
  
  // Handle simple numeric values (assume they're already in inches)
  const numericHeight = parseFloat(height);
  if (!isNaN(numericHeight)) {
    return numericHeight;
  }
  
  return 0;
}

// Update sort indicators in table headers with enhanced accessibility
function updateSortIndicators() {
  const table = document.getElementById('recruits-table');
  if (!table) return;
  
  const headerCells = table.querySelectorAll('thead th');
  headerCells.forEach((header, displayIndex) => {
    // Remove existing sort indicators
    header.classList.remove('sort-asc', 'sort-desc');
    
    // Get column key from the header's data attribute or from column order
    const columnKey = header.getAttribute('data-column-key') || 
                     (displayIndex < state.column_order.length ? state.column_order[displayIndex] : null);
    
    // Find column definition for this key
    const columnDef = COLUMNS.find(col => col.key === columnKey);
    
    // Reset ARIA attributes
    if (header.getAttribute('data-sortable') === 'true') {
      header.setAttribute('aria-sort', 'none');
      header.title = `Click to sort by ${columnDef?.label || 'column'}. Currently not sorted.`;
    }
    
    // Apply sort indicators and ARIA attributes for current sorted column
    if (columnKey === state.sorting.column) {
      const direction = state.sorting.direction;
      header.classList.add(`sort-${direction}`);
      header.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
      
      const directionText = direction === 'asc' ? 'ascending' : 'descending';
      const nextDirection = direction === 'asc' ? 'descending' : 'ascending';
      header.title = `Sorted by ${columnDef?.label || columnKey} (${directionText}). Click to sort ${nextDirection}.`;
    }
  });
  
  console.log(`Sort indicators updated for column: ${state.sorting.column} (${state.sorting.direction})`);
}



// Load recruits data from background script
async function loadRecruitsData() {
  try {
    console.log('=== DEBUGGING loadRecruitsData START ===');
    setStatusMessage('Loading recruits...', 'info');
    
    // Debug: Check initial state
    console.log('Initial state.recruits length:', state.recruits ? state.recruits.length : 'undefined');
    
    // Load recruits and page size preference in parallel
    console.log('Loading recruits data...');
    
    let recruitsResponse;
    
    if (state.multiTeamEnabled && state.currentTeamInfo) {
      // Use multi-team storage for team-specific recruit data
      console.log('Using multi-team storage for recruits...');
      recruitsResponse = {
        recruits: await multiTeamStorage.getTeamRecruits(state.currentTeamInfo.teamId)
      };
    } else {
      // Use legacy single-team method
      console.log('Sending getRecruits message to background...');
      recruitsResponse = await popupComms.sendMessageToBackground({ action: 'getRecruits' });
    }
    
    await loadPageSizePreference();
    
    console.log('Received response:', recruitsResponse);
    
    if (recruitsResponse.error) {
      console.error('Error in recruits response:', recruitsResponse.error);
      throw new Error(recruitsResponse.error);
    }
    
    // Debug: Log raw response data
    console.log('Raw recruits response:', {
      hasRecruits: !!recruitsResponse.recruits,
      recruitsType: typeof recruitsResponse.recruits,
      recruitsLength: recruitsResponse.recruits ? recruitsResponse.recruits.length : 'N/A',
      isArray: Array.isArray(recruitsResponse.recruits)
    });
    
    state.recruits = recruitsResponse.recruits || [];
    console.log(`✓ Set state.recruits to array with ${state.recruits.length} items`);
    
    // Debug: Log first few recruits for verification
    if (state.recruits.length > 0) {
      console.log('Sample recruits (first 3):', state.recruits.slice(0, 3).map(r => ({
        id: r.id,
        name: r.name,
        pos: r.pos,
        watched: r.watched
      })));
    } else {
      console.log('ℹ No recruits data available - this is normal for first-time usage or when no season has been initialized');
    }
    
    // Debug: Log watched recruits count
    const watchedCount = state.recruits.filter(recruit => recruit.watched === 1).length;
    console.log(`Found ${watchedCount} watched recruits`);
    
    // Populate filter options
    console.log('Populating filter options...');
    populateFilterOptions();
    
    // Apply filters and update display
    console.log('Applying filters...');
    applyFilters();
    
    // Debug: Log filtered results
    console.log(`After filters applied: ${state.filtered_recruits ? state.filtered_recruits.length : 'undefined'} filtered recruits`);
    
    // Setup table sorting after data is loaded
    console.log('Setting up table sorting...');
    setupTableSorting();
    
    state.last_data_refresh = Date.now();
    console.log('=== DEBUGGING loadRecruitsData END ===');
    
  } catch (error) {
    console.error('=== ERROR in loadRecruitsData ===', error);
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
    console.log('=== DEBUGGING applyFilters START ===');
    console.log('Input state.recruits:', {
      exists: !!state.recruits,
      length: state.recruits ? state.recruits.length : 'N/A',
      isArray: Array.isArray(state.recruits)
    });
    
    if (!state.recruits) {
      console.warn('⚠ state.recruits is null/undefined, setting filtered_recruits to empty');
      state.filtered_recruits = [];
      updateRecruitsList();
      return;
    }
    
    if (state.recruits.length === 0) {
      console.log('⚠ state.recruits is empty array, setting filtered_recruits to empty');
      state.filtered_recruits = [];
      updateRecruitsList();
      return;
    }
    
    // Generate hash of current filters to check if we can use cached results
    const filtersHash = generateDataHash(state.filters);
    if (state.performance.cache.filtered_results_hash === filtersHash) {
      console.log('🔧 DEBUGGING: Filter cache hit detected - bypassing for debugging');
      console.log('  - Cached hash:', state.performance.cache.filtered_results_hash);
      console.log('  - Current hash:', filtersHash);
      console.log('  - Current filtered_recruits length:', state.filtered_recruits.length);
      // TEMPORARILY DISABLE CACHING FOR DEBUGGING
      // return;
    }
    
    console.log('🔍 DEBUGGING: Current filters state:', JSON.stringify(state.filters, null, 2));
    console.log('🔍 DEBUGGING: Sample recruits (first 3):');
    state.recruits.slice(0, 3).forEach((recruit, index) => {
      console.log(`  Recruit ${index + 1}:`, {
        name: recruit.name,
        pos: recruit.pos,
        watched: recruit.watched,
        potential: recruit.potential,
        priority: recruit.priority,
        signed: recruit.signed,
        considering: recruit.considering
      });
    });
    
    const startTime = performance.now();
    
    let filterPassCount = 0;
    let filterFailReasons = {};
    
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
          filterFailReasons.position = (filterFailReasons.position || 0) + 1;
          return false;
        }
      }
      
      // Potential filter
      if (state.filters.potential && recruit.potential !== state.filters.potential) {
        filterFailReasons.potential = (filterFailReasons.potential || 0) + 1;
        return false;
      }
      
      // Division filter
      if (state.filters.division && recruit.division !== state.filters.division) {
        filterFailReasons.division = (filterFailReasons.division || 0) + 1;
        return false;
      }
      
      // Priority filter - convert filter value to number for comparison
      if (state.filters.priority) {
        const filterPriority = parseInt(state.filters.priority);
        const recruitPriority = parseInt(recruit.priority);
        
        if (recruitPriority !== filterPriority) {
          filterFailReasons.priority = (filterFailReasons.priority || 0) + 1;
          if (filterFailReasons.priority <= 5) {
            console.log(`🔍 Priority filter mismatch: recruit ${recruit.name} has priority ${recruitPriority}, filter expects ${filterPriority}`);
          }
          return false;
        }
      }
      
      // Distance filter
      if (state.filters.distance && !matchesDistanceFilter(recruit.miles, state.filters.distance)) {
        filterFailReasons.distance = (filterFailReasons.distance || 0) + 1;
        return false;
      }
      
      // Watched filter
      if (state.filters.watched === 'true' && recruit.watched !== 1) {
        filterFailReasons.watched = (filterFailReasons.watched || 0) + 1;
        return false;
      }
      
      // Hide signed filter
      if (state.filters.hide_signed && (recruit.signed === 'Yes' || recruit.signed === 'Y' || recruit.signed === 1)) {
        filterFailReasons.hide_signed = (filterFailReasons.hide_signed || 0) + 1;
        return false;
      }

      // Undecided filter
      if (state.filters.undecided && recruit.considering !== 'undecided') {
        filterFailReasons.undecided = (filterFailReasons.undecided || 0) + 1;
        return false;
      }

      // Attribute filters
      if (!matchesAttributeFilters(recruit)) {
        filterFailReasons.attribute_filters = (filterFailReasons.attribute_filters || 0) + 1;
        return false;
      }
      
      // Text search filters
      if (!matchesTextSearchFilters(recruit)) {
        filterFailReasons.text_search_filters = (filterFailReasons.text_search_filters || 0) + 1;
        return false;
      }
      
      filterPassCount++;
      return true;
    });
    
    console.log('🔍 DEBUGGING: Filter results:');
    console.log(`  - Recruits passed filters: ${filterPassCount}`);
    console.log(`  - Recruits failed filters by reason:`, filterFailReasons);
    console.log(`  - Total filtered recruits: ${state.filtered_recruits.length}`);
    
    // 🚨 CRITICAL DEBUG: If we have 0 results but recruits exist, show the most likely culprit
    if (state.filtered_recruits.length === 0 && state.recruits.length > 0) {
      console.log('🚨 CRITICAL: All recruits filtered out! Most likely causes:');
      const topFailureReasons = Object.entries(filterFailReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      topFailureReasons.forEach(([reason, count]) => {
        console.log(`  - ${reason}: ${count} recruits failed this filter`);
      });
      
      // Check for filter state persistence issues
      console.log('🔍 Checking for persistent filter state issues:');
      console.log('  - Current filters:', state.filters);
      
      // Reset all filters to see if that helps identify the issue
      console.log('🔧 ATTEMPTING FILTER RESET to isolate issue...');
      const originalFilters = { ...state.filters };
      
      // Reset filters temporarily
      state.filters = {
        name: '',
        position: '',
        watched: '',
        potential: '',
        division: '',
        priority: '',
        distance: '',
        hide_signed: false,
        undecided: false,
        attribute_filters: {
          gpa: '',
          ath: '', spd: '', dur: '', we: '', sta: '', str: '',
          blk: '', tkl: '', han: '', gi: '', elu: '', tec: '',
          r1: '', r2: '', r3: '', r4: '', r5: '', r6: ''
        }
      };
      
      // Test with reset filters
      const testFilteredRecruits = state.recruits.filter(recruit => {
        return recruit !== null && recruit !== undefined;
      });
      
      console.log(`🔧 With reset filters: ${testFilteredRecruits.length} recruits would pass`);
      
      // Restore original filters
      state.filters = originalFilters;
    }
    
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

// Ensure table header matches the current column order
function ensureTableHeaderMatchesColumnOrder() {
  try {
    const table = document.getElementById('recruits-table');
    if (!table) {
      console.warn('Table not found for header verification');
      return;
    }
    
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) {
      console.warn('Header row not found for verification');
      return;
    }
    
    const headerCells = headerRow.querySelectorAll('th');
    
    // Check if the number of headers matches the column order
    if (headerCells.length !== state.column_order.length) {
      console.log('Header count mismatch, rebuilding header');
      rebuildTableHeader();
      return;
    }
    
    // Check if the order matches
    let orderMatches = true;
    headerCells.forEach((header, index) => {
      const expectedColumnKey = state.column_order[index];
      const actualColumnKey = header.getAttribute('data-column-key');
      
      if (actualColumnKey !== expectedColumnKey) {
        orderMatches = false;
      }
    });
    
    if (!orderMatches) {
      console.log('Header order mismatch, rebuilding header');
      rebuildTableHeader();
    }
    
  } catch (error) {
    console.error('Error ensuring table header matches column order:', error);
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
    
    // Ensure the table header is built correctly before updating data
    ensureTableHeaderMatchesColumnOrder();
    
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
  
  // Debug logging to identify the issue
  console.log('🔍 DEBUG: teamInfo in updateRecruitsListStandard:', teamInfo);
  console.log('🔍 DEBUG: state.currentTeamId:', state.currentTeamId);
  console.log('🔍 DEBUG: Elements check:', {
    schoolName: elements.school_name?.textContent,
    division: elements.team_division?.textContent,
    world: elements.team_world?.textContent
  });
  
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

    // Create a map of all possible column data
    const allColumnData = {
      'name': { content: recruit.name || '', attribute: null, isLink: true,
        linkUrl: recruit.id ? `https://www.whatifsports.com/gd/RecruitProfile/Ratings.aspx?rid=${recruit.id}&section=Ratings` : null,
        tooltip: recruit.name ? `${recruit.name} - ${recruit.pos || 'No Position'}` : null,
        isWatched: recruit.watched === 1
      },
      'pos': { content: recruit.pos || '', attribute: null, isLink: false,
        tooltip: recruit.pos ? `Position: ${recruit.pos}` : null
      },
      'watched': { content: recruit.watched === 1 ? '👁' : '', attribute: null, isLink: false,
        tooltip: recruit.watched === 1 ? 'On Watchlist' : 'Not Watched',
        classes: recruit.watched === 1 ? ['watched-indicator'] : []
      },
      'potential': { content: recruit.potential || '', attribute: null, isLink: false,
        tooltip: recruit.potential ? `Potential: ${recruit.potential}` : null
      },
      'priority': { content: recruit.priority || '', attribute: null, isLink: false,
        tooltip: recruit.priority ? `Priority: ${recruit.priority}` : null
      },
      'height': { content: recruit.height || '', attribute: null, isLink: false,
        tooltip: recruit.height ? `Height: ${recruit.height}` : null
      },
      'weight': { content: recruit.weight || '', attribute: null, isLink: false,
        tooltip: recruit.weight ? `Weight: ${recruit.weight} lbs` : null
      },
      'rating': { content: recruit.rating || '', attribute: null, isLink: false,
        tooltip: recruit.rating ? `Overall Rating: ${recruit.rating}` : null
      },
      'rank': { content: recruit.rank || '', attribute: null, isLink: false,
        tooltip: recruit.rank ? `National Rank: ${recruit.rank}` : null
      },
      'hometown': { content: recruit.hometown || '', attribute: null, isLink: recruit.hometown && recruit.hometown !== 'N/A',
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
      'division': { content: recruit.division || '', attribute: null, isLink: false,
        tooltip: recruit.division ? `High School Division: ${recruit.division}` : null
      },
      'miles': { content: recruit.miles || '', attribute: null, isLink: false,
        tooltip: recruit.miles ? `Distance: ${recruit.miles} miles from campus` : null
      },
      'signed': { content: recruit.signed || '', attribute: null, isLink: false,
        tooltip: recruit.signed ? `Signed Status: ${recruit.signed}` : null,
        classes: recruit.signed === 'Y' || recruit.signed === 'Yes' ? ['signed-status'] : []
      },
      'gpa': { content: recruit.gpa || '', attribute: null, isLink: false,
        tooltip: recruit.gpa ? `GPA: ${recruit.gpa}` : null
      },
      'ath': { content: recruit.ath || '', attribute: 'ath', tooltip: recruit.ath ? `Athleticism: ${recruit.ath}` : null },
      'spd': { content: recruit.spd || '', attribute: 'spd', tooltip: recruit.spd ? `Speed: ${recruit.spd}` : null },
      'dur': { content: recruit.dur || '', attribute: 'dur', tooltip: recruit.dur ? `Durability: ${recruit.dur}` : null },
      'we': { content: recruit.we || '', attribute: 'we', tooltip: recruit.we ? `Work Ethic: ${recruit.we}` : null },
      'sta': { content: recruit.sta || '', attribute: 'sta', tooltip: recruit.sta ? `Stamina: ${recruit.sta}` : null },
      'str': { content: recruit.str || '', attribute: 'str', tooltip: recruit.str ? `Strength: ${recruit.str}` : null },
      'blk': { content: recruit.blk || '', attribute: 'blk', tooltip: recruit.blk ? `Blocking: ${recruit.blk}` : null },
      'tkl': { content: recruit.tkl || '', attribute: 'tkl', tooltip: recruit.tkl ? `Tackling: ${recruit.tkl}` : null },
      'han': { content: recruit.han || '', attribute: 'han', tooltip: recruit.han ? `Hands: ${recruit.han}` : null },
      'gi': { content: recruit.gi || '', attribute: 'gi', tooltip: recruit.gi ? `Game Intelligence: ${recruit.gi}` : null },
      'elu': { content: recruit.elu || '', attribute: 'elu', tooltip: recruit.elu ? `Elusiveness: ${recruit.elu}` : null },
      'tec': { content: recruit.tec || '', attribute: 'tec', tooltip: recruit.tec ? `Technique: ${recruit.tec}` : null },
      // Formation IQ columns
      'iq_threefour': { content: recruit.iq_threefour || '', attribute: null, tooltip: recruit.iq_threefour ? `3-4 Formation IQ: ${recruit.iq_threefour}` : null },
      'iq_fourthree': { content: recruit.iq_fourthree || '', attribute: null, tooltip: recruit.iq_fourthree ? `4-3 Formation IQ: ${recruit.iq_fourthree}` : null },
      'iq_fourfour': { content: recruit.iq_fourfour || '', attribute: null, tooltip: recruit.iq_fourfour ? `4-4 Formation IQ: ${recruit.iq_fourfour}` : null },
      'iq_fivetwo': { content: recruit.iq_fivetwo || '', attribute: null, tooltip: recruit.iq_fivetwo ? `5-2 Formation IQ: ${recruit.iq_fivetwo}` : null },
      'iq_nickel': { content: recruit.iq_nickel || '', attribute: null, tooltip: recruit.iq_nickel ? `Nickel Formation IQ: ${recruit.iq_nickel}` : null },
      'iq_dime': { content: recruit.iq_dime || '', attribute: null, tooltip: recruit.iq_dime ? `Dime Formation IQ: ${recruit.iq_dime}` : null },
      'iq_iformation': { content: recruit.iq_iformation || '', attribute: null, tooltip: recruit.iq_iformation ? `I-Form Formation IQ: ${recruit.iq_iformation}` : null },
      'iq_wishbone': { content: recruit.iq_wishbone || '', attribute: null, tooltip: recruit.iq_wishbone ? `Wishbone Formation IQ: ${recruit.iq_wishbone}` : null },
      'iq_proset': { content: recruit.iq_proset || '', attribute: null, tooltip: recruit.iq_proset ? `Pro Set Formation IQ: ${recruit.iq_proset}` : null },
      'iq_ndbox': { content: recruit.iq_ndbox || '', attribute: null, tooltip: recruit.iq_ndbox ? `ND Box Formation IQ: ${recruit.iq_ndbox}` : null },
      'iq_shotgun': { content: recruit.iq_shotgun || '', attribute: null, tooltip: recruit.iq_shotgun ? `Shotgun Formation IQ: ${recruit.iq_shotgun}` : null },
      'iq_trips': { content: recruit.iq_trips || '', attribute: null, tooltip: recruit.iq_trips ? `Trips Formation IQ: ${recruit.iq_trips}` : null },
      'iq_specialteams': { content: recruit.iq_specialteams || '', attribute: null, tooltip: recruit.iq_specialteams ? `Special Teams IQ: ${recruit.iq_specialteams}` : null },
      'r1': { content: recruit.r1 || '', attribute: null, tooltip: getRoleRatingTooltip(recruit.pos, 'r1', recruit.r1) },
      'r2': { content: recruit.r2 || '', attribute: null, tooltip: getRoleRatingTooltip(recruit.pos, 'r2', recruit.r2) },
      'r3': { content: recruit.r3 || '', attribute: null, tooltip: getRoleRatingTooltip(recruit.pos, 'r3', recruit.r3) },
      'r4': { content: recruit.r4 || '', attribute: null, tooltip: getRoleRatingTooltip(recruit.pos, 'r4', recruit.r4) },
      'r5': { content: recruit.r5 || '', attribute: null, tooltip: getRoleRatingTooltip(recruit.pos, 'r5', recruit.r5) },
      'r6': { content: recruit.r6 || '', attribute: null, tooltip: getRoleRatingTooltip(recruit.pos, 'r6', recruit.r6) },
      'considering': {
        content: recruit.considering || '', 
        attribute: null, 
        isLink: false,
        tooltip: recruit.considering ? `Considering Schools: ${recruit.considering}` : null,
        classes: (() => {
          const baseClasses = recruit.considering ? ['considering-schools'] : [];
          
          // Add conditional formatting based on current school status
          if (teamInfo && teamInfo.teamId && recruit.considering) {
            console.log('🔍 DEBUG: About to check considering status for recruit:', recruit.name);
            console.log('🔍 DEBUG: teamInfo.teamId:', teamInfo.teamId);
            console.log('🔍 DEBUG: recruit.considering:', recruit.considering);
            
            const consideringStatus = checkCurrentSchoolInConsidering(recruit.considering, teamInfo.teamId);
            console.log('🔍 DEBUG: consideringStatus result:', consideringStatus);
            
            switch (consideringStatus) {
              case 'only':
                baseClasses.push('considering-only-school');
                console.log('🔍 DEBUG: Added considering-only-school class');
                break;
              case 'included':
                baseClasses.push('considering-among-schools');
                console.log('🔍 DEBUG: Added considering-among-schools class');
                break;
              case 'not_included':
                // No special formatting for not included
                console.log('🔍 DEBUG: No special class - not included');
                break;
            }
          } else {
            console.log('🔍 DEBUG: Conditional formatting skipped - missing data:', {
              hasTeamInfo: !!teamInfo,
              hasTeamId: teamInfo?.teamId,
              hasConsidering: recruit.considering
            });
          }
          
          return baseClasses;
        })()
      }
    };

    // Use the column order to create cells in the correct sequence
    state.column_order.forEach((columnKey, index) => {
      const { content, attribute, tooltip, classes = [], isLink, linkUrl, isWatched } = allColumnData[columnKey] || { content: '', classes: [] };
    const cell = document.createElement('td');
    
    // Add data attribute for column alignment
    cell.setAttribute('data-column', columnKey);
    
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

// Setup collapsible attribute filters toggle
function setupAttributeFiltersToggle() {
  const toggleButton = document.getElementById('toggle-attribute-filters');
  const filtersGrid = document.getElementById('attribute-filters-container');
  
  if (!toggleButton || !filtersGrid) {
    console.warn('Attribute filters toggle elements not found');
    return;
  }
  
  // Initialize to collapsed state
  filtersGrid.classList.add('collapsed');
  toggleButton.classList.add('collapsed');
  
  toggleButton.addEventListener('click', () => {
    const isCollapsed = filtersGrid.classList.contains('collapsed');
    
    if (isCollapsed) {
      // Expand
      filtersGrid.classList.remove('collapsed');
      toggleButton.classList.remove('collapsed');
      toggleButton.setAttribute('aria-expanded', 'true');
    } else {
      // Collapse
      filtersGrid.classList.add('collapsed');
      toggleButton.classList.add('collapsed');
      toggleButton.setAttribute('aria-expanded', 'false');
    }
  });
  
  // Set initial ARIA state
  toggleButton.setAttribute('aria-expanded', 'false');
  toggleButton.setAttribute('aria-controls', 'attribute-filters-container');
}

// Update pagination display for both top and bottom controls
function updatePaginationDisplay() {
  try {
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
    
    let displayText = '';
    
    if (state.show_all_results) {
      // Show total filtered count when showing all results
      displayText = `Showing all ${totalFiltered} results`;
      if (filtersActive) {
        displayText += ` (filtered from ${totalAll} total)`;
      }
    } else {
      // Calculate start and end indices for current page
      const startIndex = (state.current_page - 1) * state.items_per_page + 1;
      const endIndex = Math.min(state.current_page * state.items_per_page, totalFiltered);
      
      if (totalFiltered === 0) {
        displayText = 'No results found';
        if (filtersActive) {
          displayText += ` (${totalAll} total available)`;
        }
      } else {
        // Show detailed pagination info with filter indication
        displayText = `Showing ${startIndex}-${endIndex} of ${totalFiltered}`;
        if (filtersActive) {
          displayText += ` (filtered from ${totalAll})`;
        }
        displayText += ` | Page ${state.current_page} of ${totalPages}`;
      }
    }
    
    // Update both top and bottom pagination info displays
    if (elements.page_info) {
      elements.page_info.textContent = displayText;
    }
    if (elements.page_info_top) {
      elements.page_info_top.textContent = displayText;
    }
    
    // Update button states for both top and bottom controls
    const isFirstPage = state.current_page <= 1 || state.show_all_results;
    const isLastPage = state.current_page >= totalPages || state.show_all_results;
    
    // Bottom pagination buttons
    if (elements.prev_page_btn) {
      elements.prev_page_btn.disabled = isFirstPage;
    }
    if (elements.next_page_btn) {
      elements.next_page_btn.disabled = isLastPage;
    }
    
    // Top pagination buttons
    if (elements.prev_page_btn_top) {
      elements.prev_page_btn_top.disabled = isFirstPage;
    }
    if (elements.next_page_btn_top) {
      elements.next_page_btn_top.disabled = isLastPage;
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

// Table header drag-and-drop event handlers
let draggedHeader = null;
let draggedColumnIndex = -1;

function handleHeaderDragStart(event) {
  draggedHeader = event.target;
  draggedColumnIndex = parseInt(event.target.getAttribute('data-column-index'), 10);
  
  // Set visual feedback
  event.target.classList.add('dragging');
  event.target.dataset.isDragging = 'true';
  
  // Set drag data
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedColumnIndex.toString());
  
  console.log(`Started dragging column ${draggedColumnIndex}: ${event.target.textContent}`);
}

function handleHeaderDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  return false;
}

function handleHeaderDragEnter(event) {
  event.preventDefault();
  const targetHeader = event.target.closest('th');
  if (targetHeader && targetHeader !== draggedHeader) {
    targetHeader.classList.add('drag-over');
  }
}

function handleHeaderDragLeave(event) {
  const targetHeader = event.target.closest('th');
  if (targetHeader) {
    targetHeader.classList.remove('drag-over');
  }
}

function handleHeaderDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const targetHeader = event.target.closest('th');
  if (!targetHeader || targetHeader === draggedHeader) {
    return false;
  }
  
  const targetColumnIndex = parseInt(targetHeader.getAttribute('data-column-index'), 10);
  
  console.log(`Dropping column ${draggedColumnIndex} onto column ${targetColumnIndex}`);
  
  // Perform the column reorder
  reorderTableColumns(draggedColumnIndex, targetColumnIndex);
  
  // Clean up visual feedback
  targetHeader.classList.remove('drag-over');
  
  return false;
}

function handleHeaderDragEnd(event) {
  // Clean up drag state
  event.target.classList.remove('dragging');
  event.target.dataset.isDragging = 'false';
  
  // Clean up any remaining drag-over classes
  const table = document.getElementById('recruits-table');
  if (table) {
    const headers = table.querySelectorAll('thead th');
    headers.forEach(header => {
      header.classList.remove('drag-over');
    });
  }
  
  draggedHeader = null;
  draggedColumnIndex = -1;
  
  console.log('Drag operation completed');
}

function reorderTableColumns(fromIndex, toIndex) {
  try {
    if (fromIndex === toIndex) {
      console.log('Same column, no reordering needed');
      return;
    }
    
    console.log(`Reordering columns: moving DOM index ${fromIndex} to ${toIndex}`);
    
    // Get the actual column keys being moved based on current column order
    const fromColumnKey = state.column_order[fromIndex];
    const toColumnKey = state.column_order[toIndex];
    
    console.log(`Moving column "${fromColumnKey}" to position of "${toColumnKey}"`);
    
    // Create new order by moving the column
    const newOrder = [...state.column_order];
    const movedColumn = newOrder.splice(fromIndex, 1)[0];
    newOrder.splice(toIndex, 0, movedColumn);
    
    state.column_order = newOrder;
    
    console.log('New column order:', state.column_order);
    
    // Save to storage
    chrome.storage.local.set({
      [COLUMN_ORDER_STORAGE_KEY]: state.column_order
    }).then(() => {
      console.log('Column order saved to storage');
    }).catch(error => {
      console.error('Error saving column order:', error);
    });
    
    // Rebuild the entire table with new order
    rebuildTableWithNewOrder();
    
    setStatusMessage('Column order updated', 'success');
    
  } catch (error) {
    console.error('Error reordering columns:', error);
    handleError(error, 'column reordering');
  }
}

// Rebuild the entire table with new column order
function rebuildTableWithNewOrder() {
  try {
    console.log('Rebuilding table with new column order:', state.column_order);
    
    // Rebuild the table header first
    rebuildTableHeader();
    
    // Then refresh the recruits list which will rebuild everything in the correct order
    updateRecruitsList();
    
    // Reapply column visibility
    applyColumnVisibility();
    
    // Setup table sorting with new order
    setupTableSorting();
    
    console.log('Table rebuild completed successfully');
    
  } catch (error) {
    console.error('Error rebuilding table:', error);
    handleError(error, 'rebuilding table with new order');
  }
}

// Rebuild table header in the correct column order
function rebuildTableHeader() {
  try {
    const table = document.getElementById('recruits-table');
    if (!table) {
      console.warn('Table not found for header rebuild');
      return;
    }
    
    const thead = table.querySelector('thead');
    if (!thead) {
      console.warn('Table head not found for header rebuild');
      return;
    }
    
    // Create new header row based on column order
    const newHeaderRow = document.createElement('tr');
    
    state.column_order.forEach((columnKey, index) => {
      const column = COLUMNS.find(col => col.key === columnKey);
      if (column) {
        const th = document.createElement('th');
        th.textContent = column.label;
        th.setAttribute('data-column-index', index);
        th.setAttribute('data-column-key', columnKey);
        
        // Make all headers draggable
        th.draggable = true;
        
        // Make sortable if applicable
        if (column.sortable) {
          th.setAttribute('data-sortable', 'true');
          th.classList.add('sortable');
        } else {
          th.setAttribute('data-sortable', 'false');
        }
        
        newHeaderRow.appendChild(th);
      }
    });
    
    // Replace the existing header
    thead.innerHTML = '';
    thead.appendChild(newHeaderRow);
    
    console.log('Table header rebuilt with new column order');
    
  } catch (error) {
    console.error('Error rebuilding table header:', error);
  }
}

function applyColumnOrderToTable() {
  try {
    const table = document.getElementById('recruits-table');
    if (!table) {
      console.warn('Table not found for column reordering');
      return;
    }
    
    const headerRow = table.querySelector('thead tr');
    const dataRows = table.querySelectorAll('tbody tr');
    
    if (!headerRow) {
      console.warn('Header row not found');
      return;
    }
    
    // Reorder header cells
    const headerCells = Array.from(headerRow.children);
    const newHeaderRow = document.createElement('tr');
    
    state.column_order.forEach((columnKey, newIndex) => {
      const originalIndex = COLUMNS.findIndex(col => col.key === columnKey);
      if (originalIndex !== -1 && originalIndex < headerCells.length) {
        const cell = headerCells[originalIndex].cloneNode(true);
        // Update the data-column-index to reflect new position
        cell.setAttribute('data-column-index', newIndex);
        newHeaderRow.appendChild(cell);
      }
    });
    
    // Replace header row
    headerRow.parentNode.replaceChild(newHeaderRow, headerRow);
    
    // Reorder data cells in each row
    dataRows.forEach(row => {
      const dataCells = Array.from(row.children);
      const newRow = document.createElement('tr');
      
      // Copy row attributes
      Array.from(row.attributes).forEach(attr => {
        newRow.setAttribute(attr.name, attr.value);
      });
      newRow.className = row.className;
      
      // Add cells in new order
      state.column_order.forEach(columnKey => {
        const originalIndex = COLUMNS.findIndex(col => col.key === columnKey);
        if (originalIndex !== -1 && originalIndex < dataCells.length) {
          const cell = dataCells[originalIndex].cloneNode(true);
          newRow.appendChild(cell);
        }
      });
      
      // Replace the row
      row.parentNode.replaceChild(newRow, row);
    });
    
    // Reapply column visibility and sorting after reordering
    applyColumnVisibility();
    setupTableSorting();
    
    console.log('Column order applied to table successfully');
    
  } catch (error) {
    console.error('Error applying column order to table:', error);
    handleError(error, 'applying column order to table');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('GD Recruit Assistant popup loaded');
  
  try {
    // Initialize the popup
    await initializePopup();
    
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    setStatusMessage('Failed to initialize extension popup. Please try refreshing the page.', 'error');
  }
});

// Listen for popup focus events to check for team changes
window.addEventListener('focus', async () => {
  console.log('=== POPUP FOCUS EVENT RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Send a message to background to check for team changes
    const response = await popupComms.sendMessageToBackground({
      action: 'checkTeamChanges'
    });
    
    if (response.success && response.changed) {
      console.log('🔄 Team change detected:', response.message);
      
      // Clear current data to force refresh
      state.recruits = [];
      state.filtered_recruits = [];
      state.current_page = 1;
      
      // Update displays and reload data
      await loadInitialData();
      
      setStatusMessage(response.message, 'info');
    } else if (response.success) {
      console.log('✅ No team change detected');
    } else {
      console.warn('Team change check failed:', response.error);
    }
  } catch (error) {
    console.error('Error checking for team changes on focus:', error);
  }
  
  console.log('=== POPUP FOCUS EVENT HANDLING COMPLETED ===');
});

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

// Donation reminder functionality
async function checkAndShowDonationReminder() {
  try {
    console.log('Checking if donation reminder should be shown...');
    
    // Check if we should show the donation reminder
    const shouldShow = await multiTeamStorage.shouldShowDonationReminder();
    
    if (shouldShow) {
      console.log('Showing donation reminder to user');
      setTimeout(() => {
        showDonationReminderModal();
      }, 2000); // Show after 2 seconds to let the user settle in
    } else {
      console.log('Donation reminder not needed at this time');
    }
    
  } catch (error) {
    console.error('Error checking donation reminder:', error);
    // Don't fail the entire initialization if this fails
  }
}

// Show donation reminder modal
function showDonationReminderModal() {
  const modal = document.getElementById('donation-reminder-modal');
  if (!modal) {
    console.warn('Donation reminder modal not found in DOM');
    return;
  }
  
  // Setup event listeners if not already done
  if (!modal.dataset.initialized) {
    setupDonationReminderModalListeners();
    modal.dataset.initialized = 'true';
  }
  
  // Show the modal
  modal.classList.remove('hidden');
  
  // Focus management for accessibility
  const supportButton = document.getElementById('donation-reminder-support');
  if (supportButton) {
    supportButton.focus();
  }
}

// Setup donation reminder modal event listeners
function setupDonationReminderModalListeners() {
  const modal = document.getElementById('donation-reminder-modal');
  if (!modal) return;
  
  console.log('Setting up donation reminder modal listeners...');
  
  // Support button
  const supportBtn = document.getElementById('donation-reminder-support');
  if (supportBtn) {
    supportBtn.addEventListener('click', handleDonationSupport);
  }
  
  // Later button
  const laterBtn = document.getElementById('donation-reminder-later');
  if (laterBtn) {
    laterBtn.addEventListener('click', handleDonationLater);
  }
  
  // Close button (if exists)
  const closeBtn = modal.querySelector('.close-button');
  if (closeBtn) {
    closeBtn.addEventListener('click', handleDonationLater);
  }
  
  // Close on backdrop click
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      handleDonationLater();
    }
  });
  
  // Handle escape key
  const handleEscape = (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      handleDonationLater();
    }
  };
  
  document.addEventListener('keydown', handleEscape);
  
  // Store the escape handler so we can remove it later
  modal._escapeHandler = handleEscape;
}

// Handle donation support button click
async function handleDonationSupport() {
  try {
    console.log('User clicked "I\'ve already supported"');
    
    // Record that the user has already supported
    await multiTeamStorage.recordDonationAction('support');
    
    // Close the modal
    hideDonationReminderModal();
    
    // Show thank you message
    setStatusMessage('Thank you for your support! 🙏', 'success');
    
  } catch (error) {
    console.error('Error handling donation support:', error);
    // Still close the modal even if there's an error
    hideDonationReminderModal();
    setStatusMessage('Thank you for your support!', 'success');
  }
}

// Handle donation later button click
async function handleDonationLater() {
  try {
    console.log('User clicked donation later');
    
    // Mark reminder as shown and record later action
    await multiTeamStorage.recordDonationAction('later');
    
    // Close the modal
    hideDonationReminderModal();
    
  } catch (error) {
    console.error('Error handling donation later:', error);
    // Still close the modal even if there's an error
    hideDonationReminderModal();
  }
}

// Handle manual show donation modal button click
function handleShowDonationModal() {
  console.log('User manually requested donation modal');
  showDonationReminderModal();
}

// Hide donation reminder modal
function hideDonationReminderModal() {
  const modal = document.getElementById('donation-reminder-modal');
  if (!modal) return;
  
  // Hide the modal
  modal.classList.add('hidden');
  
  // Clean up escape key handler if it exists
  if (modal._escapeHandler) {
    document.removeEventListener('keydown', modal._escapeHandler);
    modal._escapeHandler = null;
  }
  
  console.log('Donation reminder modal hidden');
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
