// Error handler for sidebar
// This script enhances error handling and status message types without creating circular dependencies

// Function to update error messages and status types
function updateErrorMessages() {
  // Wait for sidebar.js to define its functions globally
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
  
  console.log('Error message handling enhancement installed');
}

// Call this after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(updateErrorMessages, 1000);
});
