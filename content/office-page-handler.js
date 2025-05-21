console.log('GD Office Page Handler activated');

// This script runs when the GD Office page is detected
document.addEventListener('DOMContentLoaded', () => {
  // Make sure the page is fully loaded
  console.log('DOM fully loaded on GD Office page');
  
  // Send message to background script with page info
  chrome.runtime.sendMessage({
    action: 'gdOfficePageLoaded',
    data: {
      pageTitle: document.title,
      url: window.location.href
    }
  });
  
  // You can add more functionality here to interact with the office page
  // For example, add UI elements or extract information
});