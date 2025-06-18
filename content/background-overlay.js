// Simple overlay for background scraping tabs
// Reuses the same overlay design from the popup

console.log('=== Background tab overlay script loaded ===');
console.log('Current URL:', window.location.href);
console.log('Document ready state:', document.readyState);

// Check if this is a scraping tab
const urlParams = new URLSearchParams(window.location.search);
const isAutoScrape = urlParams.get('auto_scrape') === 'true';

console.log('URL parameters:', Object.fromEntries(urlParams.entries()));
console.log('Is auto scrape:', isAutoScrape);

if (isAutoScrape) {
  console.log('Auto-scrape detected, showing overlay IMMEDIATELY');
  
  // Show overlay immediately, even if DOM isn't fully ready
  // Use a more aggressive approach to display immediately
  showScrapingOverlayImmediately();
} else {
  console.log('Not an auto-scrape tab, overlay not needed');
}

// Create and show the scraping overlay (copied from popup.js)
function showScrapingOverlay() {
  console.log('showScrapingOverlay called');
  
  // Don't create duplicate overlays
  if (document.getElementById('scraping-overlay')) {
    console.log('Overlay already exists, skipping creation');
    return;
  }

  // Ensure document.body exists
  if (!document.body) {
    console.log('Document body not ready, waiting...');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showScrapingOverlay);
      return;
    } else {
      // Try again with a short delay
      setTimeout(showScrapingOverlay, 100);
      return;
    }
  }

  console.log('Creating overlay element');
  const overlay = createScrapingOverlay();
  document.body.appendChild(overlay);
  console.log('=== Scraping overlay displayed on background tab ===');
}

// Show overlay immediately without waiting for DOM to be ready
function showScrapingOverlayImmediately() {
  console.log('showScrapingOverlayImmediately called');
  
  // Don't create duplicate overlays
  if (document.getElementById('scraping-overlay')) {
    console.log('Overlay already exists, skipping creation');
    return;
  }

  // Create overlay immediately, even if document.body doesn't exist yet
  const createAndShowOverlay = () => {
    console.log('Creating overlay element immediately');
    const overlay = createScrapingOverlay();
    
    // If body exists, append normally
    if (document.body) {
      document.body.appendChild(overlay);
      console.log('=== Scraping overlay displayed on background tab (body exists) ===');
    } else {
      // If body doesn't exist yet, append to documentElement or create body
      if (!document.body) {
        document.documentElement.appendChild(document.createElement('body'));
      }
      document.body.appendChild(overlay);
      console.log('=== Scraping overlay displayed on background tab (body created) ===');
    }
  };

  // Try to create immediately
  try {
    createAndShowOverlay();
  } catch (error) {
    console.log('Immediate overlay creation failed, trying with minimal delay:', error);
    // If that fails, try with very short delay
    setTimeout(createAndShowOverlay, 10);
  }
}

// Create scraping overlay (copied from popup.js)
function createScrapingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'scraping-overlay';
  overlay.innerHTML = `
    <div class="scraping-content">
      <div class="spinner"></div>
      <div class="scraping-message">Scraping recruit data...</div>
      <div class="scraping-details">
        <small>This tab is automatically processing recruit data. Please do not close this tab.</small>
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
    
    // Append to head if it exists, otherwise to documentElement
    const target = document.head || document.documentElement;
    target.appendChild(style);
    console.log('Overlay styles added to:', target.tagName);
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

// Add a fallback mechanism to ensure overlay is shown
function ensureOverlayShown() {
  console.log('ensureOverlayShown called');
  
  // Check if we're in an auto-scrape tab
  const urlParams = new URLSearchParams(window.location.search);
  const isAutoScrape = urlParams.get('auto_scrape') === 'true';
  
  if (isAutoScrape && !document.getElementById('scraping-overlay')) {
    console.log('Overlay missing on auto-scrape tab, forcing display');
    showScrapingOverlayImmediately();
  }
}

// Try multiple times to ensure overlay appears with very short intervals
if (isAutoScrape) {
  // Immediate retry attempts
  setTimeout(ensureOverlayShown, 50);
  setTimeout(ensureOverlayShown, 100);
  setTimeout(ensureOverlayShown, 200);
  setTimeout(ensureOverlayShown, 500);
}

// Listen for messages to hide overlay when scraping is complete
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'hideOverlay') {
    hideScrapingOverlay();
    sendResponse({ success: true });
  }
});

console.log('Background tab overlay script ready');
