// Watchlist scraper for GD Recruit Assistant
// This script extracts watchlist data from the Recruiting Summary page

// Main function to extract watchlist data
function scrapeWatchlistData() {
  console.log('Starting to scrape watchlist data');
  
  // Check if we're on the right page
  if (!window.location.href.includes('/gd/recruiting')) {
    console.log('Not on Recruiting page, aborting scrape');
    return;
  }
  
  // Get the recruit and signed tables
  const unsignedTable = document.getElementById('recruits');
  const signedTable = document.getElementById('signed');
  
  if (!unsignedTable && !signedTable) {
    console.error('Could not find watchlist tables');
    return;
  }
  
  // Get total count from header
  const totalCountElement = document.getElementById('ctl00_ctl00_ctl00_Main_Main_Main_TotalRecruitCountLbl');
  const totalWatchedRecruits = totalCountElement ? parseInt(totalCountElement.textContent) : 0;
  
  console.log(`Total watched recruits: ${totalWatchedRecruits}`);
  
  const watchlist = {};
  let totalUnsignedWatched = 0;
  let totalSignedWatched = 0;
  
  // Process unsigned recruits
  if (unsignedTable) {
    // Skip empty watchlist
    if (!unsignedTable.textContent.includes('Not watching any recruits.')) {
      const rows = unsignedTable.querySelectorAll('tr');
      
      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 5) {
          const id = parseInt(cells[0].textContent);
          const potential = cells[4].textContent.trim();
          
          watchlist[id] = mapPotential(potential);
          totalUnsignedWatched++;
        }
      }
    }
  }
  
  // Process signed recruits
  if (signedTable) {
    // Skip empty signed table
    if (signedTable.textContent.trim() !== "\n\n\n") {
      const rows = signedTable.querySelectorAll('tr');
      
      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 5) {
          const id = parseInt(cells[0].textContent);
          const potential = cells[4].textContent.trim();
          
          watchlist[id] = mapPotential(potential);
          totalSignedWatched++;
        }
      }
    }
  }
  
  console.log(`Processed ${totalUnsignedWatched} unsigned and ${totalSignedWatched} signed recruits`);
  console.log(`Total watchlist entries: ${Object.keys(watchlist).length}`);
  
  // Send data to background script
  chrome.runtime.sendMessage({
    action: 'updateWatchlist',
    watchlist: watchlist
  }, response => {
    console.log('Background script response:', response);
    
    // Notify user of successful scrape
    showNotification(`Successfully updated watchlist with ${Object.keys(watchlist).length} recruits`);
  });
}

// Helper function to map potential values
function mapPotential(potential) {
  switch(potential) {
    case 'VL': return '0-VL';
    case 'L': return '1-L';
    case 'A': return '2-A';
    case 'H': return '3-H';
    case 'VH': return '4-VH';
    default: return '?';
  }
}

// Helper function to show a notification
function showNotification(message) {
  // Create a notification element
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '10px';
  notification.style.right = '10px';
  notification.style.padding = '10px 20px';
  notification.style.background = '#4CAF50';
  notification.style.color = 'white';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '9999';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after a delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Run the scraper
scrapeWatchlistData();
