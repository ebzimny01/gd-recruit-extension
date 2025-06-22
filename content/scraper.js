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
  
  // Check if this is a refresh operation
  const urlParams = new URLSearchParams(window.location.search);
  const isRefreshMode = urlParams.get('refresh_mode') === 'true';
  
  console.log(`Scrape mode: ${isRefreshMode ? 'Refresh existing recruits' : 'Full scrape'}`);
  
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
  
  // If this is refresh mode, get the existing recruits first
  if (isRefreshMode) {
    chrome.runtime.sendMessage({ action: 'getConfig', key: 'refreshFieldsToUpdate' }, 
      function(response) {
        let fieldsToUpdate = ['watched', 'potential', 'priority', 'signed', 'considering'];
        
        if (response && response.value) {
          try {
            fieldsToUpdate = JSON.parse(response.value);
            console.log('Fields to update:', fieldsToUpdate);
          } catch (e) {
            console.error('Error parsing fields to update:', e);
          }
        }
        
        // Now get all existing recruits
        chrome.runtime.sendMessage({ action: 'getRecruits' }, function(response) {
          if (response && response.recruits) {
            const existingRecruits = response.recruits;
            console.log(`Retrieved ${existingRecruits.length} existing recruits for update`);
            
            // Process the recruits in refresh mode
            processRecruitsForRefresh(recruitRows, existingRecruits, fieldsToUpdate);
          } else {
            console.error('Failed to get existing recruits for refresh');
            chrome.runtime.sendMessage({
              action: 'recruitsScraped',
              error: 'Failed to get existing recruits for refresh',
              recruits: []
            });
          }
        });
      }
    );
  } else {
    // Normal full scrape mode
    processRecruits(recruitRows);
  }
}

// Function for processing recruits in regular (full) mode
function processRecruits(recruitRows) {
  const recruits = [];
  const signed_state = {'Not Signed': 0, 'Signed': 1};
  
  // Process each recruit row
  recruitRows.forEach((row, index) => {
    try {
      // Get all cells in the row
      const cells = row.querySelectorAll('td');
      
      // Check if we have enough cells (updated for formation IQ columns)
      if (cells.length < 42) {
        console.error(`Row ${index} doesn't have enough cells (found ${cells.length}, expected at least 42)`);
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
        // Formation IQ attributes (cells 29-41)
        iq_threefour: safeParseInt(cells[29].textContent),
        iq_fourthree: safeParseInt(cells[30].textContent),
        iq_fourfour: safeParseInt(cells[31].textContent),
        iq_fivetwo: safeParseInt(cells[32].textContent),
        iq_nickel: safeParseInt(cells[33].textContent),
        iq_dime: safeParseInt(cells[34].textContent),
        iq_iformation: safeParseInt(cells[35].textContent),
        iq_wishbone: safeParseInt(cells[36].textContent),
        iq_proset: safeParseInt(cells[37].textContent),
        iq_ndbox: safeParseInt(cells[38].textContent),
        iq_shotgun: safeParseInt(cells[39].textContent),
        iq_trips: safeParseInt(cells[40].textContent),
        iq_specialteams: safeParseInt(cells[41].textContent),
        considering: "undecided" // Default value, will be updated below
      };
      
      // Parse considering schools if present
      if (cells[42] && cells[42].textContent.trim() !== "") {
        recruit.considering = parseConsidering(cells[42]);
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

// New function to process recruits for refresh
function processRecruitsForRefresh(recruitRows, existingRecruits, fieldsToUpdate) {
  console.log(`Processing ${recruitRows.length} rows for refresh, updating fields:`, fieldsToUpdate);
  
  const updatedRecruits = [];
  const signed_state = {'Not Signed': 0, 'Signed': 1};
  const idMap = {};
  
  // Create a map of existing recruits by ID for quick lookup
  existingRecruits.forEach(recruit => {
    idMap[recruit.id] = recruit;
    // Log watched status for debugging
    if (recruit.watched === 1) {
      console.log(`Recruit ${recruit.id} (${recruit.name}) is on watchlist prior to refresh`);
    }
  });
  
  // Safe parsing functions
  const safeParseInt = (value) => {
    try {
      const parsed = parseInt(value);
      return isNaN(parsed) ? 0 : parsed;
    } catch (e) {
      return 0;
    }
  };
  
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
      
      // Get the recruit ID
      const recruitId = safeParseInt(cells[0].textContent);
      
      // Check if this recruit exists in our database
      if (!idMap[recruitId]) {
        console.log(`Recruit ID ${recruitId} not found in existing data, skipping`);
        return;
      }
      
      // Clone the existing recruit
      const updatedRecruit = { ...idMap[recruitId] };
        // Only update the specific fields      // Always preserve the existing watched value first before potentially updating it
      const existingWatched = idMap[recruitId].watched || 0;
      updatedRecruit.watched = existingWatched;
      
      // Only then check if we should update based on the page data
      if (fieldsToUpdate.includes('watched')) {
        try {
          // Handle different formats of the watched field (might be checkbox or text)
          const checkbox = cells[1].querySelector('input[type="checkbox"]');
          if (checkbox) {
            updatedRecruit.watched = checkbox.checked ? 1 : 0;
          } else {
            // Fallback to text content (X or empty)
            const textContent = cells[1].textContent.trim();
            updatedRecruit.watched = (textContent === 'X' || textContent === 'Yes' || textContent === '1') ? 1 : 0;
          }
          
          // If there's a change in watched status, log it
          if (existingWatched !== updatedRecruit.watched) {
            console.log(`Recruit ${updatedRecruit.id} (${updatedRecruit.name}): Changed watched from ${existingWatched} to ${updatedRecruit.watched}`);
          }
        } catch (watchedError) {
          console.error(`Error extracting watched status for recruit ${recruitId}:`, watchedError);
          // On error, keep the existing value
          updatedRecruit.watched = existingWatched;
        }
      }
      
      if (fieldsToUpdate.includes('priority')) {
        const prioritySelect = cells[2].querySelector('select');
        if (prioritySelect) {
          updatedRecruit.priority = safeParseInt(prioritySelect.value);
        } else {
          // Fallback to text content
          const textContent = cells[2].textContent.trim();
          const priority = safeParseInt(textContent);
          if (!isNaN(priority) && priority >= 0 && priority <= 5) {
            updatedRecruit.priority = priority;
          }
        }
        console.log(`Recruit ${updatedRecruit.id}: Updated priority to ${updatedRecruit.priority}`);
      }
      
      if (fieldsToUpdate.includes('potential')) {
        updatedRecruit.potential = cells[16] ? mapPotential(cells[16].textContent.trim()) : '?';
        console.log(`Recruit ${updatedRecruit.id}: Updated potential to ${updatedRecruit.potential}`);
      }
      
      if (fieldsToUpdate.includes('signed')) {
        updatedRecruit.signed = cells[14] ? signed_state[cells[14].textContent.trim()] || 0 : 0;
      }
      
      if (fieldsToUpdate.includes('considering')) {
        // Parse considering schools if present
        if (cells[42] && cells[42].textContent.trim() !== "") {
          updatedRecruit.considering = parseConsidering(cells[42]);
        } else {
          updatedRecruit.considering = "undecided";
        }
      }
      
      // Add to updated recruits list
      updatedRecruits.push(updatedRecruit);
      
      // Log progress for every 50 recruits
      if (index % 50 === 0) {
        console.log(`Processed ${index} of ${recruitRows.length} recruits for refresh`);
      }
    } catch (error) {
      console.error(`Error processing recruit row ${index} for refresh:`, error);
    }
  });
  
  console.log(`Finished processing ${updatedRecruits.length} recruits for refresh`);
  
  // Send updated recruits to background script
  chrome.runtime.sendMessage({
    action: 'refreshRecruitsComplete',
    recruits: updatedRecruits,
    closeTab: true
  }, response => {
    if (chrome.runtime.lastError) {
      console.error('Error sending refresh message:', chrome.runtime.lastError);
      showNotification(`Updated ${updatedRecruits.length} recruits but encountered an error: ${chrome.runtime.lastError.message}`);
      return;
    }
    
    console.log('Background script response to refresh:', response);
    showNotification(`Successfully updated ${updatedRecruits.length} recruits`);
    
    // Let the background script close the tab
    if (response && response.success) {
      chrome.runtime.sendMessage({
        action: 'closeScraperTab',
        tabId: chrome.devtools ? chrome.devtools.inspectedWindow.tabId : null
      });
    }
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

// Helper function to parse considering schools
function parseConsidering(cell) {
  if (!cell || !cell.textContent.trim()) return "undecided";
  
  // Look for the considering subtable within the cell
  const consideringTable = cell.querySelector('table.considering-subtable');
  if (!consideringTable) return "undecided";
  
  const consideringRows = consideringTable.querySelectorAll('tbody.considering tr.considering');
  if (!consideringRows || consideringRows.length === 0) return "undecided";
  
  const schools = [];
  
  consideringRows.forEach(row => {
    try {
      const schoolName = row.querySelector('.considering-schoolname')?.textContent.trim() || '';
      const schoolId = row.getAttribute('schoolid') || '';
      const milesSpan = row.querySelector('.considering-miles span.considering-miles');
      const miles = milesSpan ? Math.round(parseFloat(milesSpan.textContent)) : 0;
      const coachName = row.querySelector('.considering-coachname')?.textContent.trim() || '';
      const scholarshipsStart = row.querySelector('.considering-scholarships-start')?.textContent.trim() || '0';
      const scholarshipsRemaining = row.querySelector('.considering-scholarships-remaining')?.textContent.trim() || '0';
      
      // Apply coach name rule: replace empty/null with "SIM AI"
      const displayCoachName = (coachName === '' || coachName === null) ? 'SIM AI' : coachName;
      
      // Format: school name (schoolId), miles, coachName, scholarshipsStart | scholarshipsRemaining
      const schoolEntry = `${schoolName} (${schoolId}), ${miles} miles, ${displayCoachName}, ${scholarshipsStart} | ${scholarshipsRemaining}`;
      schools.push(schoolEntry);
    } catch (error) {
      console.error('Error parsing considering school row:', error);
    }
  });
  
  return schools.length > 0 ? schools.join('; ') : "undecided";
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
