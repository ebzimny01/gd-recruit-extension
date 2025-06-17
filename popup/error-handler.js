// Error handler for popup
// This script enhances error handling and status message types without creating circular dependencies

// Function to update error messages and status types
function updateErrorMessages() {
  // Wait for popup.js to define its functions globally
  if (typeof window.setStatusMessage !== 'function') {
    console.log('setStatusMessage not available yet, waiting...');
    // Try again after a short delay
    setTimeout(updateErrorMessages, 500);
    return;
  }

  // Store reference to original setStatusMessage
  const originalSetStatusMessage = window.setStatusMessage;

  // Override setStatusMessage with enhanced type detection
  window.setStatusMessage = function(message, type = 'info') {
    // Success pattern detection
    if (
      typeof message === 'string' && 
      (message.includes('successfully') || 
       message.includes('Success') || 
       message.includes('completed') || 
       message.startsWith('Scrape completed'))
    ) {
      return originalSetStatusMessage.call(this, message, 'success');
    }
    
    // Error pattern detection
    if (
      typeof message === 'string' && 
      (message.includes('Error:') ||
       message.includes('error') ||
       message.includes('failed'))
    ) {
      return originalSetStatusMessage.call(this, message, 'error');
    }
    
    // Warning pattern detection
    if (
      typeof message === 'string' && 
      (message.includes('Warning:') ||
       message.includes('warning') ||
       message.includes('timed out'))
    ) {
      return originalSetStatusMessage.call(this, message, 'warning');
    }
    
    // Default call
    return originalSetStatusMessage.call(this, message, type);
  };
  
  console.log('Error message handling enhancement installed for popup');
}

// Enhanced error handling for popup lifecycle
window.addEventListener('error', (event) => {
  console.error('Popup error:', event.error);
  // Optional: Send error to background script for logging
  if (chrome.runtime) {
    chrome.runtime.sendMessage({
      type: 'popup_error',
      error: {
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack || 'No stack trace',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    }).catch(err => console.error('Failed to send error to background:', err));
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in popup:', event.reason);
  if (chrome.runtime) {
    chrome.runtime.sendMessage({
      type: 'popup_unhandled_rejection',
      error: {
        reason: event.reason?.toString() || 'Unknown rejection',
        stack: event.reason?.stack || 'No stack trace'
      }
    }).catch(err => console.error('Failed to send rejection to background:', err));
  }
});

// Call this after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(updateErrorMessages, 1000);
});

// Export for potential use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { updateErrorMessages };
}
