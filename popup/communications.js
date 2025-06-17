// Communications handler for popup
// This script facilitates communication between the popup and the main page/content scripts

// Function to send a message to the background script with enhanced retry logic
export function sendMessageToBackground(message) {
  return new Promise(async (resolve, reject) => {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await new Promise((innerResolve, innerReject) => {
          // Set up a timeout to prevent hanging
          const timeoutId = setTimeout(() => {
            innerReject(new Error('Message timeout - no response received within 10 seconds'));
          }, 10000);

          chrome.runtime.sendMessage(message, response => {
            clearTimeout(timeoutId);
            
            // Handle potential cases where runtime.lastError exists
            if (chrome.runtime.lastError) {
              const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
              console.error(`Error sending message to background (attempt ${attempt + 1}): ${errorMessage}`, message);
              innerReject(new Error(errorMessage));
              return;
            }
            
            // Success case
            innerResolve(response);
          });
        });

        // Check if response contains a database-related error that should be retried
        if (response && response.error) {
          const error = new Error(response.error);
          
          // Check if this is a database connection error that might benefit from retry
          if (isDatabaseError(response.error) && attempt < maxRetries - 1) {
            lastError = error;
            console.warn(`Database error on attempt ${attempt + 1}, retrying...`, response.error);
            
            // Add exponential backoff delay
            const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // Return the response with error for non-retryable errors or final attempt
            console.error(`Background script returned error: ${response.error}`, message);
            resolve(response);
            return;
          }
        }
        
        // Success case
        resolve(response);
        return;
        
      } catch (error) {
        lastError = error;
        console.error(`Exception sending message to background (attempt ${attempt + 1}):`, error, message);
        
        // Check if this is a retryable error
        if (isDatabaseError(error.message) && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 500;
          console.log(`Retrying message in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
    
    // All attempts failed
    reject(lastError || new Error(`Failed to send message after ${maxRetries} attempts`));
  });
}

// Helper function to identify database-related errors
export function isDatabaseError(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') return false;
  
  const dbErrorPatterns = [
    'database connection is closing',
    'transaction',
    'indexeddb',
    'connection timeout',
    'database error',
    'storage error',
    'connection closed'
  ];
  
  return dbErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern)
  );
}

// Function to send a message to a content script
export async function sendMessageToContentScript(tabId, message) {
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
export async function getActiveTab() {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  return tabs[0] || null;
}

// Function to check if current page is a GD recruiting page
export async function isOnRecruitingPage() {
  const tab = await getActiveTab();
  return tab && tab.url && tab.url.includes('whatifsports.com/gd/recruiting');
}

// Function to check if current page is the advanced recruiting page
export async function isOnAdvancedRecruitingPage() {
  const tab = await getActiveTab();
  return tab && tab.url && tab.url.includes('whatifsports.com/gd/recruiting/Advanced.aspx');
}

// Function to setup popup-specific event listeners
export function setupPopupListeners() {
  // Listen for popup state changes and window events
  window.addEventListener('beforeunload', () => {
    console.log('Popup is being closed');
    // Clean up any pending operations
  });
  
  // Listen for focus/blur events to handle popup lifecycle
  window.addEventListener('focus', () => {
    console.log('Popup gained focus');
    // Refresh data when popup regains focus
    document.dispatchEvent(new CustomEvent('popup-focus'));
  });
  
  window.addEventListener('blur', () => {
    console.log('Popup lost focus');
    // Optional: pause operations when popup loses focus
    document.dispatchEvent(new CustomEvent('popup-blur'));
  });
}

// Function to handle popup window resize events
export function handlePopupResize() {
  // Ensure proper layout adjustments for different popup sizes
  const container = document.querySelector('.popup-container');
  if (container) {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        console.log(`Popup resized to: ${width}x${height}`);
        
        // Dispatch resize event for components to respond
        document.dispatchEvent(new CustomEvent('popup-resize', {
          detail: { width, height }
        }));
      }
    });
    
    resizeObserver.observe(container);
  }
}

// Export popupComms object for consistent interface
export const popupComms = {
  sendMessageToBackground,
  sendMessageToContentScript,
  getActiveTab,
  isOnRecruitingPage,
  isOnAdvancedRecruitingPage,
  setupPopupListeners,
  handlePopupResize,
  isDatabaseError
};

// Maintain backward compatibility with sidebarComms
export const sidebarComms = popupComms;
