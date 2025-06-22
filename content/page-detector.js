// Page detector for GD Recruit Assistant
// This script runs on all matching pages and determines what actions to take

// Listen for DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check which page we're on
  const url = window.location.href;
  console.log('GD Recruit Assistant loaded on page:', url);
  // Detect recruiting pages
  if (url.includes('/gd/recruiting/Advanced.aspx')) {
    console.log('Detected Advanced Recruiting page');
      // Check if we were opened with auto_scrape parameter
    const urlParams = new URLSearchParams(window.location.search);
    const autoScrape = urlParams.get('auto_scrape') === 'true';
    const refreshMode = urlParams.get('refresh_mode') === 'true';
    
    if (autoScrape) {
      console.log(`Auto-scraping Advanced Recruiting page${refreshMode ? ' in refresh mode' : ''}`);
      // Just inject the standard scraper which now handles both modes
      injectScript('content/scraper.js');
    } else {
      // Normal page load, just inject the standard scraper
      injectScript('content/scraper.js');
    }
  } else if (url.includes('/gd/recruiting')) {
    console.log('Detected Recruiting page');
    // Check if this is the recruiting summary page with watchlist
    if (document.querySelector('#recruits') || document.querySelector('#signed')) {
      console.log('Detected Recruiting Summary page with watchlist');
      // Inject the watchlist scraper script
      injectScript('content/watchlist-scraper.js');
    }
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch(message.action) {
    case 'triggerScrape':
      console.log('Triggering manual scrape');
      // Load the scraper script if not already loaded
      injectScript('content/scraper.js');
      sendResponse({ success: true });
      break;
      
    case 'getPageInfo':
      // Return information about the current page
      const url = window.location.href;
      const isRecruitingPage = url.includes('/gd/recruiting');
      const isAdvancedPage = url.includes('/gd/recruiting/Advanced.aspx');
      const hasWatchlist = !!document.querySelector('#recruits') || !!document.querySelector('#signed');
      
      sendResponse({
        url,
        isRecruitingPage,
        isAdvancedPage,
        hasWatchlist
      });
      break;
  }
  
  return true; // Keep channel open for async response
});

// Helper function to inject a script
function injectScript(scriptPath) {
  chrome.runtime.sendMessage({ action: 'injectScript', scriptPath });
}
