// Communications handler for sidebar
// This script facilitates communication between the sidebar and the main page/content scripts

// Function to send a message to the background script
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    try {
      // Set up a timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        reject(new Error('Message timeout - no response received within 5 seconds'));
      }, 5000);

      chrome.runtime.sendMessage(message, response => {
        clearTimeout(timeoutId);
        
        // Handle potential cases where runtime.lastError exists
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
          console.error(`Error sending message to background: ${errorMessage}`, message);
          reject(new Error(errorMessage));
          return;
        }
        
        // Check if response contains an error
        if (response && response.error) {
          console.error(`Background script returned error: ${response.error}`, message);
          // Return the response anyway, but with the error included
          resolve(response);
          return;
        }
        
        // Success case
        resolve(response);
      });
    } catch (error) {
      console.error('Exception sending message to background:', error, message);
      reject(error);
    }
  });
}

// Function to send a message to a content script
async function sendMessageToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Function to get the active tab
async function getActiveTab() {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  return tabs[0] || null;
}

// Function to check if current page is a GD recruiting page
async function isOnRecruitingPage() {
  const tab = await getActiveTab();
  return tab && tab.url && tab.url.includes('whatifsports.com/gd/recruiting');
}

// Function to check if current page is the advanced recruiting page
async function isOnAdvancedRecruitingPage() {
  const tab = await getActiveTab();
  return tab && tab.url && tab.url.includes('whatifsports.com/gd/recruiting/Advanced.aspx');
}

// Function to listen for sidebar-specific messages
function setupSidebarListeners() {
  // Listen for sidebar visibility changes
  if (chrome.sidePanel && chrome.sidePanel.onVisibilityChanged) {
    chrome.sidePanel.onVisibilityChanged.addListener((isVisible) => {
      console.log('Sidebar visibility changed:', isVisible);
      
      // If sidebar becomes visible, refresh data
      if (isVisible) {
        // Dispatch an event that can be handled by sidebar.js
        document.dispatchEvent(new CustomEvent('sidebar-visible'));
      }
    });
  }
}

// Export functions
export const sidebarComms = {
  sendMessageToBackground,
  sendMessageToContentScript,
  getActiveTab,
  isOnRecruitingPage,
  isOnAdvancedRecruitingPage,
  setupSidebarListeners
};
