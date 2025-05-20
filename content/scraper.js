// Recruit scraper for GD Recruit Assistant
// This script extracts recruit data from the Advanced Search page

// Import calculator module (will be bundled in the build process)
// import { calculateRoleRating } from '../lib/calculator.js';

// Main scraping function
function scrapeRecruitData() {
  console.log('Starting to scrape recruit data');
  
  // Check if we're on the right page
  if (!window.location.href.includes('/gd/recruiting/Advanced.aspx')) {
    console.log('Not on Advanced Recruiting page, aborting scrape');
    // Send error message back to background script
    chrome.runtime.sendMessage({
      action: 'recruitsScraped',
      error: 'Not on Advanced Recruiting page',
      recruits: []
    });
    return;
  }
  
  // Get the table with recruit data
  const tableBody = document.querySelector('.advanced-recruit-body');
  
  if (!tableBody) {
    console.error('Could not find the recruit table body');
    // Send error message back to background script
    chrome.runtime.sendMessage({
      action: 'recruitsScraped',
      error: 'Could not find the recruit table body',
      recruits: []
    });
    return;
  }
  
  // Get all recruit rows
  const recruitRows = tableBody.querySelectorAll('tr.recruit');
  console.log(`Found ${recruitRows.length} recruits`);
  
  if (recruitRows.length === 0) {
    console.warn('No recruits found in the table');
    // Send warning message back to background script
    chrome.runtime.sendMessage({
      action: 'recruitsScraped',
      error: 'No recruits found in the table',
      recruits: []
    });
    return;
  }
  
  const recruits = [];
  const signed_state = {'Not Signed': 0, 'Signed': 1};
  
  // Process each recruit row
  recruitRows.forEach((row, index) => {
    try {
      // Get all cells in the row
      const cells = row.querySelectorAll('td');
      
      // Check if we have enough cells
      if (cells.length < 29) {
        console.error(`Row ${index} doesn't have enough cells (found ${cells.length}, expected at least 29)`);
        return; // Skip this row
      }
      
      // Safe parsing functions to handle errors gracefully
      const safeParseInt = (value) => {
        try {
          const parsed = parseInt(value);
          return isNaN(parsed) ? 0 : parsed;
        } catch (e) {
          return 0;
        }
      };
      
      const safeParseFloat = (value) => {
        try {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? 0.0 : parsed;
        } catch (e) {
          return 0.0;
        }
      };
      
      // Parse rank
      let rank = (cells[9].textContent === '0') ? 999 : safeParseInt(cells[9].textContent);
      
      // Create recruit object
      const recruit = {
        id: safeParseInt(cells[0].textContent),
        watched: safeParseInt(cells[1].textContent),
        priority: safeParseInt(cells[2].textContent),
        name: cells[3].textContent.trim(),
        pos: cells[4].textContent.trim(),
        height: cells[6].textContent.trim(),
        weight: safeParseInt(cells[7].textContent),
        rating: safeParseInt(cells[8].textContent),
        rank: rank,
        hometown: cells[10].textContent.trim(),
        division: cells[12].textContent.trim(),
        miles: Math.round(safeParseFloat(cells[13].textContent)),
        signed: cells[14] ? signed_state[cells[14].textContent.trim()] || 0 : 0,
        gpa: safeParseFloat(cells[15].textContent),
        potential: mapPotential(cells[16] ? cells[16].textContent.trim() : ''),
        ath: safeParseInt(cells[17].textContent),
        spd: safeParseInt(cells[18].textContent),
        dur: safeParseInt(cells[19].textContent),
        we: safeParseInt(cells[20].textContent),
        sta: safeParseInt(cells[21].textContent),
        str: safeParseInt(cells[22].textContent),
        blk: safeParseInt(cells[23].textContent),
        tkl: safeParseInt(cells[24].textContent),
        han: safeParseInt(cells[25].textContent),
        gi: safeParseInt(cells[26].textContent),
        elu: safeParseInt(cells[27].textContent),
        tec: safeParseInt(cells[28].textContent),
        considering: "undecided" // Default value, will be updated below
      };
      
      // Parse considering schools if present
      if (cells[42] && cells[42].textContent.trim() !== "") {
        const consideringRows = cells[42].querySelectorAll('tr');
        recruit.considering = parseConsidering(consideringRows);
      }
      
      // Calculate role ratings (will implement later)
      // For now, set default values
      recruit.r1 = 0;
      recruit.r2 = 0;
      recruit.r3 = 0;
      recruit.r4 = 0;
      recruit.r5 = 0;
      recruit.r6 = 0;
      
      recruits.push(recruit);
      
      // Log progress for every 50 recruits
      if (index % 50 === 0) {
        console.log(`Processed ${index} of ${recruitRows.length} recruits`);
      }
    } catch (error) {
      console.error(`Error processing recruit row ${index}:`, error);
    }
  });
  
  console.log(`Finished processing ${recruits.length} recruits`);
  console.log('Recruits:', recruits);  // Send data to background script for storage
  try {
    chrome.runtime.sendMessage({
      action: 'recruitsScraped',
      recruits: recruits,
      // Don't close the tab automatically - let the background script handle it
      closeTab: false,
      tabId: chrome.devtools ? chrome.devtools.inspectedWindow.tabId : null
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        // Show notification to the user anyway
        showNotification(`Scraped ${recruits.length} recruits but encountered an error: ${chrome.runtime.lastError.message}`);
        return;
      }
      
      console.log('Background script response:', response);
      
      // Notify user of successful scrape
      showNotification(`Successfully scraped ${recruits.length} recruits`);
      
      // Let the background script close the tab after we've received the response
      try {
        if (response && response.success) {
          chrome.runtime.sendMessage({
            action: 'closeScraperTab',
            tabId: chrome.devtools ? chrome.devtools.inspectedWindow.tabId : null
          }, closeResponse => {
            if (chrome.runtime.lastError) {
              console.error('Error sending close tab message:', chrome.runtime.lastError);
            }
          });
        }
      } catch (closeError) {
        console.error('Error closing tab:', closeError);
      }
    });
  } catch (sendError) {
    console.error('Error sending recruits data to background:', sendError);
    // Still show notification so user knows data was collected
    showNotification(`Scraped ${recruits.length} recruits but couldn't save them: ${sendError.message}`);
  }
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

// Helper function to parse considering schools
function parseConsidering(rows) {
  if (!rows || rows.length === 0) return "undecided";
  
  const schools = [];
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const schoolName = cells[0].textContent.trim();
      const interest = cells[1].textContent.trim();
      schools.push(`${schoolName} (${interest})`);
    }
  });
  
  return schools.join(', ');
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
scrapeRecruitData();
