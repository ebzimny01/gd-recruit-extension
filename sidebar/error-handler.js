// Import required functions and variables from sidebar.js
import { handleScrapeRecruits as originalHandleScrapeRecruits, setStatusMessage as originalSetStatusMessage } from './sidebar.js';

// Function to update error messages and status types
function updateErrorMessages() {
  // Modify setStatusMessage calls in handleScrapeRecruits
  window.handleScrapeRecruits = async function() {
    try {
      await originalHandleScrapeRecruits.call(this);
    } catch (error) {
      console.error('Error in scrapeRecruits:', error);
      
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
      
      setStatusMessage('Error scraping recruits: ' + errorMessage, 'error');
    }  };
  
  // Add 'success' type to success messages throughout the app
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
