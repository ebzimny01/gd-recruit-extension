// Background script for GD Recruit Assistant
// This script handles data processing and communication between content scripts and popup

import { recruitStorage } from './lib/storage.js';
import { 
  calculateRoleRating, 
  recalculateRoleRatings, 
  saveRoleRatings, 
  getCurrentRoleRatings, 
  resetRoleRatingsToDefaults 
} from './lib/calculator.js';

// Add this code near the top of your background file, where other initialization happens

// Check all existing tabs when extension is first loaded
chrome.runtime.onStartup.addListener(checkAllTabsForGDOffice);

// Also check when the extension is installed or updated
chrome.runtime.onInstalled.addListener(checkAllTabsForGDOffice);

// Function to scan all open tabs for GD Office page
function checkAllTabsForGDOffice() {
  console.log('Scanning all open tabs for GD Office page');
  
  chrome.tabs.query({}, (tabs) => {
    console.log(`Checking ${tabs.length} open tabs`);
    
    // Check each tab
    tabs.forEach(tab => {
      checkIfGDOfficePage(tab);
    });
  });
}

// Initialize when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('GD Recruit Assistant extension installed');

  // Set initial stats
  recruitStorage.saveConfig('lastUpdated', new Date().toISOString());
  recruitStorage.saveConfig('watchlistCount', 0);

  // Set up side panel
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({
      path: 'sidebar/sidebar.html',
      enabled: true
    });
  }
});

// Set up action listener to open side panel
chrome.action.onClicked.addListener((tab) => {
  // Scan all open tabs for GD Office page when extension is clicked
  checkAllTabsForGDOffice();
  
  // Also check for wispersisted cookie directly
  checkForWispersistedCookie().then(cookie => {
    if (cookie) {
      console.log('Found wispersisted cookie on extension click');
    }
  }).catch(error => {
    console.error('Error checking for cookie on extension click:', error);
  });
  
  // Only open side panel on whatifsports.com domains or when developing locally
  if (chrome.sidePanel) {
    // First open the panel
    chrome.sidePanel.open({ tabId: tab.id });

    // Then set the focus to it
    chrome.sidePanel.setOptions({
      enabled: true,
      path: 'sidebar/sidebar.html'
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  // Handle different types of messages
  switch (message.action) {
    case 'ping':
      // Simple ping response for testing
      sendResponse({ success: true, message: 'Extension is active' });
      return false;

    case 'saveRecruits':
      console.log('Saving recruits to storage');
      // Save scraped recruits to database
      saveRecruits(message.data).then(result => {
        // Update last updated timestamp
        recruitStorage.saveConfig('lastUpdated', new Date().toISOString());
        sendResponse({ success: true, count: message.data.length });
      }).catch(error => {
        console.error('Error saving recruits:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Indicate asynchronous response

    case 'openAdvancedRecruitingPage':
      // Open the Advanced Recruiting page in a new tab
      console.log('Opening Advanced Recruiting page');
      chrome.tabs.create({ url: message.url })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Error opening tab:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate asynchronous response

    case 'checkLogin':
      // Check if user has valid cookies for whatifsports.com
      console.log('Checking login status');
      checkLogin().then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('Error checking login:', error);
        sendResponse({ loggedIn: false, error: error.message });
      });
      return true; // Indicate asynchronous response      // Case to scrape / sync recruits
    case 'syncRecruits':
      console.log('Syncing recruits from existing tab');
      // Get the tab ID, either from sender or find active tab
      if (sender.tab && sender.tab.id) {
        // Inject directly if we have the tab ID
        injectContentScript('content/scraper.js', sender.tab.id)
          .then(() => {
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Error injecting script:', error);
            sendResponse({ success: false, error: error.message });
          });
      } else {
        // Find the active tab and inject there
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs && tabs.length > 0) {
            injectContentScript('content/scraper.js', tabs[0].id)
              .then(() => {
                sendResponse({ success: true });
              })
              .catch(error => {
                console.error('Error injecting script:', error);
                sendResponse({ success: false, error: error.message });
              });
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
      }
      return true; // Indicate asynchronous response
    case 'fetchAndScrapeRecruits':
      console.log('Fetching and scraping recruits from new tab');

      // Handle refresh mode
      const isRefreshOnly = message.isRefreshOnly || false;
      const fieldsToUpdate = message.fieldsToUpdate || [];
      
      // Get season number if provided - Save it BEFORE proceeding with other operations
      let seasonPromise = Promise.resolve();
      if (message.seasonNumber !== undefined && !isRefreshOnly) {
        console.log(`Setting current season to ${message.seasonNumber}`);
        seasonPromise = recruitStorage.saveConfig('currentSeason', message.seasonNumber)
          .then(() => console.log('Season number saved successfully'))
          .catch(err => console.error('Error saving season number:', err));
      }

      // Only proceed with team info AFTER season number is saved
      seasonPromise.then(() => {
        // Get team info to determine appropriate URL
        return getTeamInfoFromCookies();
      }).then(teamInfo => {        // Determine URL based on team division and includeLowerDivisions preference
        const url = getUrlForDivision(
          teamInfo?.division,
          message.includeLowerDivisions
        );
        
        // Add url parameters for auto scrape mode
        const urlWithParams = isRefreshOnly ? 
          `${url}&auto_scrape=true&refresh_mode=true` : 
          `${url}&auto_scrape=true`;
        
        // Store the fields to update if this is a refresh
        if (isRefreshOnly && fieldsToUpdate.length > 0) {
          recruitStorage.saveConfig('refreshFieldsToUpdate', JSON.stringify(fieldsToUpdate))
            .catch(error => console.error('Error storing fields to update:', error));
        }
        
        // Store the new tab ID when created for future reference
        chrome.tabs.create({ url: urlWithParams }).then(tab => {
          currentScrapeTabId = tab.id;
          console.log(`Created new tab with ID ${tab.id} for scraping`);

          // Listen for tab to finish loading before injecting the scraper
          const tabListener = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              console.log(`Tab ${tabId} finished loading, injecting scraper`);
              // Remove the listener since we only need it once
              chrome.tabs.onUpdated.removeListener(tabListener);

              // Wait a moment for page to fully initialize
              setTimeout(() => {
                // Check if tab still exists before trying to inject script
                chrome.tabs.get(tab.id).then(tabInfo => {
                  injectContentScript('content/scraper.js', tab.id)
                    .then(() => {
                      console.log('Scraper script injected successfully');
                    })
                    .catch(error => {
                      console.error('Error injecting scraper script:', error);
                    });
                }).catch(error => {
                  console.error('Tab no longer exists, cannot inject script:', error);
                  // Remove the listener if not already removed
                  chrome.tabs.onUpdated.removeListener(tabListener);
                });
              }, 1000); // 1 second delay
            }
          };

          // Add the listener
          chrome.tabs.onUpdated.addListener(tabListener);

          sendResponse({ success: true, tabId: tab.id });
        }).catch(error => {
          console.error('Error creating tab for scraping:', error);
          sendResponse({ success: false, error: error.message });
        });
      }).catch(error => {
        console.error('Error getting team info:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Indicate asynchronous response

    case 'refreshRecruitsComplete':
      console.log(`Received ${message.recruits.length} updated recruits from refresh operation`);
      
      // Update the recruits in the database
      updateRefreshedRecruits(message.recruits).then(async result => {
        // Clean up the temporary config
        recruitStorage.saveConfig('refreshFieldsToUpdate', null)
          .catch(error => console.error('Error clearing fields to update:', error));
        
        // Update the last updated timestamp
        recruitStorage.saveConfig('lastUpdated', new Date().toISOString());
        
        // Recalculate and update the watchlist count to ensure it's accurate
        const stats = await getStats(); // This will recalculate watchlist count
        
        // Send a scrapeComplete message to notify the UI
        chrome.runtime.sendMessage({
          action: 'scrapeComplete',
          success: true,
          count: result.updated,
          watchlistCount: stats.watchlistCount
        });
        
        // Respond to the content script
        sendResponse({
          success: true,
          updated: result.updated,
          watchlistCount: stats.watchlistCount
        });
        
        // Close the tab if requested
        if (message.closeTab && sender.tab && sender.tab.id) {
          chrome.tabs.remove(sender.tab.id)
            .catch(error => console.error('Error closing tab:', error));
        }
      }).catch(error => {
        console.error('Error updating refreshed recruits:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
      return true; // Indicate asynchronous response

    case 'recruitsScraped':
      // Handle scraped recruits from the content script
      console.log(`Received ${message.recruits.length} scraped recruits from content script`);

      // Check for error message
      if (message.error) {
        console.error('Error reported from scraper:', message.error);

        // Notify listeners of error
        chrome.runtime.sendMessage({
          action: 'scrapeComplete',
          success: false,
          error: message.error,
          count: 0
        });

        sendResponse({
          success: false,
          error: message.error
        });
        return true;
      }

      // Save the scraped recruits
      saveRecruits(message.recruits).then(async result => {
        // Update last updated timestamp
        await recruitStorage.saveConfig('lastUpdated', new Date().toISOString());

        // Notify any listeners (such as the sidebar) that scraping is complete
        chrome.runtime.sendMessage({
          action: 'scrapeComplete',
          success: true,
          count: result.count
        });

        sendResponse({
          success: true,
          count: result.count
        });
      }).catch(error => {
        console.error('Error saving scraped recruits:', error);

        // Notify listeners of error
        chrome.runtime.sendMessage({
          action: 'scrapeComplete',
          success: false,
          error: error.message,
          count: 0
        });

        sendResponse({ success: false, error: error.message });
      });
      return true; // Indicate asynchronous response
    case 'closeScraperTab':
      // Close the tab after the content script has received our response
      if (message.tabId) {
        chrome.tabs.get(message.tabId)
          .then(tabInfo => {
            // Tab still exists, close it
            chrome.tabs.remove(message.tabId)
              .then(() => {
                console.log(`Tab with ID ${message.tabId} closed successfully`);
                // Clear the stored tab ID if it matches
                if (currentScrapeTabId === message.tabId) {
                  currentScrapeTabId = null;
                }
                // Send success response
                sendResponse({ success: true });
              })
              .catch(error => {
                console.error('Error closing tab:', error);
                sendResponse({ success: false, error: error.message });
              });
          })
          .catch(error => {
            // Tab doesn't exist anymore
            console.log(`Tab with ID ${message.tabId} no longer exists:`, error);
            if (currentScrapeTabId === message.tabId) {
              currentScrapeTabId = null;
            }
            sendResponse({ success: true, message: 'Tab already closed' });
          });
      } else if (sender.tab) {
        chrome.tabs.get(sender.tab.id)
          .then(tabInfo => {
            // Tab still exists, close it
            chrome.tabs.remove(sender.tab.id)
              .then(() => {
                console.log(`Tab with ID ${sender.tab.id} closed successfully`);
                // Clear the stored tab ID if it matches
                if (currentScrapeTabId === sender.tab.id) {
                  currentScrapeTabId = null;
                }
                // Send success response
                sendResponse({ success: true });
              })
              .catch(error => {
                console.error('Error closing tab:', error);
                sendResponse({ success: false, error: error.message });
              });
          })
          .catch(error => {
            // Tab doesn't exist anymore
            console.log(`Tab with ID ${sender.tab.id} no longer exists:`, error);
            if (currentScrapeTabId === sender.tab.id) {
              currentScrapeTabId = null;
            } sendResponse({ success: true, message: 'Tab already closed' });
          });
      } else {
        sendResponse({ success: false, error: 'No tab ID provided' });
      } return true; // Indicate asynchronous response

    case 'getRecruits':
      // Retrieve recruits from database
      console.log('Getting all recruits from storage');
      recruitStorage.getAllRecruits().then(recruits => {
        sendResponse({ recruits });
      }).catch(error => {
        console.error('Error getting recruits:', error);
        sendResponse({ error: error.message });
      });
      return true; // Indicate asynchronous response

    case 'getStats':
      // Get extension stats
      console.log('Handling getStats request');
      getStats().then(stats => {
        sendResponse(stats);
      }).catch(error => {
        console.error('Error getting stats:', error);
        sendResponse({ error: error.message });
      });
      return true; // Indicate asynchronous response
    case 'clearAllData':
      // Clear all extension data
      console.log('Handling clearAllData request');
      clearAllData()
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error clearing data:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate asynchronous response

    case 'checkDatabaseStatus':
      // Check database diagnostic status
      console.log('Handling checkDatabaseStatus request');
      checkDatabaseStatus()
        .then(dbInfo => {
          sendResponse({ success: true, dbInfo });
        })
        .catch(error => {
          console.error('Error checking database status:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate asynchronous response

    case 'saveConfig':
      // Save configuration setting
      console.log(`Saving config: ${message.key} = ${message.value}`);
      recruitStorage.saveConfig(message.key, message.value)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Error saving config:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate asynchronous response    
    case 'getConfig':
      // Get configuration setting
      console.log(`Getting config: ${message.key}`);
      recruitStorage.getConfig(message.key)
        .then(value => {
          sendResponse({ success: true, value });
        })
        .catch(error => {
          console.error('Error getting config:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate asynchronous response    
    case 'getRoleRatings':
      // Get current role ratings for editing
      console.log('Getting current role ratings');
      getCurrentRoleRatings()
        .then(ratings => {
          sendResponse({ success: true, data: ratings });
        })
        .catch(error => {
          console.error('Error getting role ratings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'calculateRoleRating':
      // Calculate role ratings for a specific recruit
      console.log('Calculating role rating for recruit:', message.recruit);
      calculateRoleRating(message.recruit)
        .then(ratings => {
          sendResponse({ success: true, data: ratings });
        })
        .catch(error => {
          console.error('Error calculating role rating:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'saveRoleRatings':
      // Save custom role ratings and recalculate
      console.log('Saving custom role ratings');
      saveRoleRatings(message.ratings)
        .then(async () => {
          // Determine which positions were changed
          const changedPositions = message.changedPositions || null;
          
          // Recalculate role ratings for affected recruits
          const recalcResult = await recalculateRoleRatings(changedPositions);
          
          sendResponse({ 
            success: true, 
            recalculated: recalcResult.updatedCount,
            totalRecruits: recalcResult.totalRecruits 
          });
        })
        .catch(error => {
          console.error('Error saving role ratings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'resetRoleRatings':
      // Reset role ratings to defaults
      console.log('Resetting role ratings to defaults');
      resetRoleRatingsToDefaults()
        .then(async () => {
          // Recalculate all role ratings
          const recalcResult = await recalculateRoleRatings();
          
          sendResponse({ 
            success: true, 
            recalculated: recalcResult.updatedCount,
            totalRecruits: recalcResult.totalRecruits 
          });
        })
        .catch(error => {
          console.error('Error resetting role ratings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'recalculateRoleRatings':
      // Manually trigger recalculation
      console.log('Manually recalculating role ratings');
      recalculateRoleRatings(message.positions)
        .then(result => {
          sendResponse({ 
            success: true, 
            recalculated: result.updatedCount,
            totalRecruits: result.totalRecruits 
          });
        })
        .catch(error => {
          console.error('Error recalculating role ratings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
  }
});

// Save recruit data to storage
async function saveRecruits(recruits) {
  console.log(`Saving ${recruits.length} recruits to storage`);

  // Check if recruits is valid
  if (!Array.isArray(recruits)) {
    console.error('Invalid recruits data: not an array', recruits);
    throw new Error('Invalid recruits data: not an array');
  }

  if (recruits.length === 0) {
    console.warn('No recruits to save');
    return { count: 0 };
  }

  // Log the first few recruits for debugging
  const sampleRecruits = recruits.slice(0, Math.min(3, recruits.length));
  console.log('Sample recruits:', JSON.stringify(sampleRecruits, null, 2));

  // Clear existing recruits first to avoid potential issues with duplicate IDs
  try {
    console.log('Clearing existing recruits before saving new ones');
    await recruitStorage.clearAllRecruits();
  } catch (error) {
    console.error('Error clearing existing recruits:', error);
    // Continue anyway to attempt saving new recruits
  }

  // Save recruits one by one and collect results
  const results = {
    success: 0,
    failed: 0,
    total: recruits.length
  };

  for (let i = 0; i < recruits.length; i++) {
    const recruit = recruits[i];

    // Validate recruit object
    if (!recruit || typeof recruit !== 'object') {
      console.error(`Invalid recruit at index ${i}:`, recruit);
      results.failed++;
      continue;
    }

    // Make sure ID is a number
    if (typeof recruit.id !== 'number' || isNaN(recruit.id) || recruit.id === 0) {
      console.error(`Invalid recruit ID for index ${i}:`, recruit.id);
      // Add a valid fallback ID to prevent storage issues
      recruit.id = i + Date.now();
      console.log(`Assigned fallback ID ${recruit.id} to recruit`, recruit.name);
    }

    // Log some sample recruits for debugging
    if (i < 3 || i === recruits.length - 1) {
      console.log(`Recruit ${i}:`, JSON.stringify(recruit));
    }    try {
      // Calculate role ratings for the recruit
      const roleRatings = await calculateRoleRating(recruit);
      
      // Add role ratings to recruit
      Object.assign(recruit, roleRatings);
      
      await recruitStorage.saveRecruit(recruit);
      console.log(`Successfully saved recruit ${recruit.id} with role ratings`);
      results.success++;
    } catch (error) {
      console.error(`Error saving recruit ${recruit.id}:`, error);
      results.failed++;
    }

    // Log progress periodically
    if (i % 50 === 0 || i === recruits.length - 1) {
      console.log(`Progress: ${i + 1}/${recruits.length} recruits processed`);
    }
  }

  // Verify storage
  try {
    const savedRecruits = await recruitStorage.getAllRecruits();
    console.log(`Verification: Found ${savedRecruits.length} recruits in storage after save operation`);

    if (savedRecruits.length === 0 && results.success > 0) {
      console.error('Warning: Recruits were reportedly saved but none found in verification');
    }
  } catch (error) {
    console.error('Error verifying recruits in storage:', error);
  }

  console.log('Save operation completed with results:', results);

  return {
    count: results.success,
    failed: results.failed,
    total: results.total
  };
}

// Update considering status for all recruits
async function updateConsideringStatus() {
  console.log('Updating considering status for recruits');

  // Get all recruits
  const recruits = await recruitStorage.getAllRecruits();
  let updatedCount = 0;

  // Find active tab to inject script
  const tabs = await chrome.tabs.query({
    url: "*://*.whatifsports.com/gd/recruiting/*"
  });

  if (tabs.length === 0) {
    throw new Error('No active recruiting page found');
  }

  // For each recruit, we would update considering status
  // This is a placeholder for now
  // In a real implementation, we'd navigate to each recruit's page and extract the data

  // For demo, just mark a few as updated
  for (let i = 0; i < Math.min(5, recruits.length); i++) {
    // Simulating update
    const recruit = recruits[i];
    recruit.considering = 'Updated ' + new Date().toLocaleTimeString();
    await recruitStorage.saveRecruit(recruit);
    updatedCount++;
  }

  return { count: updatedCount };
}

// Update the getStats function to calculate watchlist count directly from recruit data
async function getStats() {
  console.log('Getting extension stats');

  const lastUpdated = await recruitStorage.getConfig('lastUpdated');
  
  // Get current season, making sure to handle both null and undefined
  let currentSeason = await recruitStorage.getConfig('currentSeason');
  console.log('Retrieved current season from storage:', currentSeason);
  // Get team information including school name
  let teamInfo = null;
  let schoolName = 'Unknown School';
  
  try {
    teamInfo = await getTeamInfoFromCookies();
    
    // If no team info from cookies, try to get from storage
    if (!teamInfo) {
      console.log('No team info from cookies, trying stored data');
      teamInfo = await getStoredTeamInfo();
    }
    
    if (teamInfo?.teamId) {
      // Use schoolLong from team info if available, otherwise look up in GDR data
      if (teamInfo.schoolLong) {
        schoolName = teamInfo.schoolLong;
        console.log(`Using stored school name: ${schoolName}`);
      } else {
        // Fallback to GDR lookup
        const gdrData = await loadGdrData();
        const schoolData = gdrData.find(team => team.wis_id === teamInfo.teamId);
        
        if (schoolData) {
          schoolName = schoolData.school_long || schoolData.school_short || 'Unknown School';
          console.log(`Found school name from GDR lookup: ${schoolName}`);
        } else {
          console.log('School not found in GDR data for team ID:', teamInfo.teamId);
        }
      }
    } else {
      console.log('No team ID available for school lookup');
    }
  } catch (error) {
    console.error('Error getting team/school information:', error);
  }

  // Get total recruit count and calculate watchlist count
  const recruits = await recruitStorage.getAllRecruits();
  const recruitCount = recruits.length;
  
  // Calculate watchlist count directly from recruits data
  const watchlistCount = recruits.filter(recruit => recruit.watched === 1).length;
  
  // Update the stored watchlist count for consistency
  await recruitStorage.saveConfig('watchlistCount', watchlistCount);

  return {
    lastUpdated,
    watchlistCount,
    recruitCount,
    currentSeason: currentSeason || null,
    schoolName,
    teamInfo
  };
}

// You can simplify or remove the updateWatchlist function since it won't be called directly anymore
// However, if you're calling it elsewhere in the code, keep it but simplify it:
async function updateWatchlist(watchlist) {
  console.log('This function is deprecated. Watchlist is now calculated directly from recruit data.');
  return { count: 0 };
}

// Inject a content script into a tab
async function injectContentScript(scriptPath, tabId) {
  console.log(`Injecting script ${scriptPath} into tab ${tabId}`);

  return chrome.scripting.executeScript({
    target: { tabId },
    files: [scriptPath]
  });
}

// Export all data
async function exportAllData() {
  console.log('Exporting all data');

  const recruits = await recruitStorage.getAllRecruits();

  // Get all configuration
  const keys = ['lastUpdated', 'watchlistCount'];
  const configData = {};

  for (const key of keys) {
    configData[key] = await recruitStorage.getConfig(key);
  }

  return {
    recruits,
    config: configData,
    exportDate: new Date().toISOString()
  };
}

// Import data
async function importData(data) {
  console.log('Importing data', data);

  if (!data || !data.recruits) {
    throw new Error('Invalid data format');
  }

  // Clear existing data first
  await clearAllData();

  // Import recruits
  for (const recruit of data.recruits) {
    await recruitStorage.saveRecruit(recruit);
  }

  // Import config if available
  if (data.config) {
    for (const [key, value] of Object.entries(data.config)) {
      await recruitStorage.saveConfig(key, value);
    }
  }

  return { recruitsImported: data.recruits.length };
}

// Clear all data
async function clearAllData() {
  console.log('Clearing all data');

  try {
    // Clear recruits data first
    const clearResult = await recruitStorage.clearAllRecruits();
    console.log('Clear recruits result:', clearResult);

    if (!clearResult.success) {
      console.warn('Warning during clear operation:', clearResult.warning);
    }
    // Clear lastUpdated instead of setting to current time
    try {
      await recruitStorage.saveConfig('lastUpdated', null);
      console.log('Successfully cleared lastUpdated timestamp');
    } catch (configError) {
      console.error('Error clearing lastUpdated config:', configError);
      // Continue with other operations despite this error
    }

    try {
      await recruitStorage.saveConfig('watchlistCount', 0);
      console.log('Successfully reset watchlistCount');
    } catch (configError) {
      console.error('Error resetting watchlistCount config:', configError);
      // Continue with other operations despite this error
    }

    try {
      await recruitStorage.saveConfig('currentSeason', null);
      console.log('Successfully removed current season');
    } catch (configError) {
      console.error('Error removing currentSeason config:', configError);
      // Continue with other operations despite this error
    }

    return {
      success: true,
      warning: clearResult.success ? null : clearResult.warning
    };
  } catch (error) {
    // Format error for better display
    const errorMessage = error.message || 'Unknown error';
    console.error('Error in clearAllData:', errorMessage, error);
    throw new Error(`Failed to clear data: ${errorMessage}`);
  }
}

// Function to handle calculating role ratings for recruits
// This will be called when recruits are loaded to ensure all have ratings
async function calculateRatingsForRecruits(recruits) {
  console.log('Calculating ratings for recruits');

  for (const recruit of recruits) {
    // Skip if already has ratings
    if (recruit.r1 && recruit.r2 && recruit.r3) continue;

    // Calculate ratings
    const ratings = await calculator.calculateRoleRating(recruit);

    // Add ratings to recruit
    for (const [role, rating] of Object.entries(ratings)) {
      recruit[role] = rating;
    }

    // Save updated recruit
    await recruitStorage.saveRecruit(recruit);
  }

  return { success: true };
}

// Update only specific fields for refreshed recruits
async function updateRefreshedRecruits(updatedRecruits) {
  console.log(`Updating ${updatedRecruits.length} refreshed recruits`);
  
  if (!Array.isArray(updatedRecruits) || updatedRecruits.length === 0) {
    return { updated: 0 };
  }
  
  // Log watchlist status before updates
  const beforeCount = await logWatchlistStatus("BEFORE UPDATE");
  
  let updated = 0;
  
  // Get all existing recruits for reference
  const existingRecruits = await recruitStorage.getAllRecruits();
  const idMap = {};
  
  // Create a map of existing recruits by ID
  existingRecruits.forEach(recruit => {
    idMap[recruit.id] = recruit;
  });
  
  // Update each recruit
  for (const recruit of updatedRecruits) {
    if (!recruit.id || !idMap[recruit.id]) {
      console.warn(`Skipping update for non-existent recruit ID: ${recruit.id}`);
      continue;
    }
    
    try {
      // Get the existing recruit data
      const existingRecruit = idMap[recruit.id];
      
      // IMPORTANT FIX: If we're not specifically updating the watched status, 
      // preserve the existing watched value from the database
      if (!recruit.hasOwnProperty('watched') || recruit.watched === undefined) {
        recruit.watched = existingRecruit.watched || 0;
      }
      
      // Log the existing watched value for debugging
      if (existingRecruit.watched === 1 || recruit.watched === 1) {
        console.log(`Recruit ${recruit.id} (${recruit.name}): Existing watched=${existingRecruit.watched}, New watched=${recruit.watched}`);
      }
      
      // Save the updated recruit (the merge of existing and updated data was already done in the scraper)
      await recruitStorage.saveRecruit(recruit);
      updated++;
      
      // Log progress for every 50 recruits
      if (updated % 50 === 0) {
        console.log(`Updated ${updated} of ${updatedRecruits.length} recruits`);
      }
    } catch (error) {
      console.error(`Error updating recruit ${recruit.id}:`, error);
    }
  }
  
  // Log watchlist status after updates
  const afterCount = await logWatchlistStatus("AFTER UPDATE");
  
  console.log(`Successfully updated ${updated} recruits. Watchlist: ${beforeCount} before, ${afterCount} after.`);
  return { updated };
}

// Check if user has authentication cookies for whatifsports.com
async function checkLogin() {
  console.log('Checking for WhatifsIports authentication cookies');

  try {
    // Get all cookies for whatifsports.com domain
    const cookies = await chrome.cookies.getAll({ domain: 'whatifsports.com' });

    // Check for authentication cookie - typically there would be a specific 
    // cookie name for the auth session, but we'll just check if any cookies exist
    const hasAuthCookies = cookies.length > 0;

    console.log(`Auth cookies found: ${hasAuthCookies} (${cookies.length} cookies total)`);

    return { loggedIn: hasAuthCookies, cookieCount: cookies.length };
  } catch (error) {
    console.error('Error checking login cookies:', error);
    return { loggedIn: false, error: error.message };
  }
}

// Module-level variable to cache GDR data
let gdrDataCache = null;

// Load team data from CSV file
async function loadGdrData() {
  try {
    if (gdrDataCache) {
      return gdrDataCache;
    }

    console.log('Loading GDR data from CSV file');
    const response = await fetch(chrome.runtime.getURL('data/gdr.csv'));
    const csvText = await response.text();

    // Parse CSV data
    const lines = csvText.split('\n').filter(line => line.trim() && !line.startsWith('//'));
    const headers = lines[0].split(',');

    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });

    // Store data for future use
    gdrDataCache = data;
    console.log(`Loaded ${data.length} teams from GDR data`);
    return data;
  } catch (error) {
    console.error('Error loading GDR data:', error);
    return [];
  }
}

// Get team info from cookies
async function getTeamInfoFromCookies() {
  try {
    // First try to get from storage
    const storedCookieValue = await recruitStorage.getConfig('wispersistedCookie');
    
    if (storedCookieValue) {
      console.log('Using stored wispersisted cookie value');
      const teamId = extractTeamIdFromCookie(storedCookieValue);      if (teamId) {
        // Get team info from GDR data
        const gdrData = await loadGdrData();
        const teamInfo = gdrData.find(team => team.wis_id === teamId);
    
        if (!teamInfo) {
          console.log('Team not found in GDR data');
          return { teamId, division: null, world: null };
        }
    
        console.log(`Found team in GDR data: ${teamInfo.school_long}, Division: ${teamInfo.division}, World: ${teamInfo.world}`);
        
        // Store team information for future use
        const teamData = { 
          teamId, 
          division: teamInfo.division, 
          world: teamInfo.world,
          schoolLong: teamInfo.school_long,
          schoolShort: teamInfo.school_short,
          conference: teamInfo.conference
        };
        
        // Save team info to storage
        await recruitStorage.saveConfig('teamInfo', JSON.stringify(teamData));
        
        return teamData;
      }
    }
    
    // Fall back to getting cookie directly
    console.log('No stored cookie found, fetching directly');
    const cookie = await getWispersistedCookie();
    
    if (!cookie) {
      console.log('No wispersisted cookie found');
      return null;
    }
    
    const teamId = extractTeamIdFromCookie(cookie.value);
    if (!teamId) return null;
      // Get team info from GDR data
    const gdrData = await loadGdrData();
    const teamInfo = gdrData.find(team => team.wis_id === teamId);    if (!teamInfo) {
      console.log('Team not found in GDR data');
      return { teamId, division: null, world: null };
    }

    console.log(`Found team in GDR data: ${teamInfo.school_long}, Division: ${teamInfo.division}, World: ${teamInfo.world}`);
    
    // Store team information for future use
    const teamData = { 
      teamId, 
      division: teamInfo.division, 
      world: teamInfo.world,
      schoolLong: teamInfo.school_long,
      schoolShort: teamInfo.school_short,
      conference: teamInfo.conference
    };
    
    // Save team info to storage
    await recruitStorage.saveConfig('teamInfo', JSON.stringify(teamData));
    
    return teamData;
  } catch (error) {
    console.error('Error getting team info from cookies:', error);
    return null;
  }
}

// Get URL for division
function getUrlForDivision(division, includeLowerDivisions = false) {
  // If division is not found or not provided, use the default URL
  if (!division) {
    return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=1&positions=1,2,3,4,5,6,7,8,9,10';
  }

  // Map division to URL
  // D-IA is the highest division
  if (division === 'D-IA') {
    if (includeLowerDivisions) {
      // Include D-IA and D-IAA
      return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=1,2&positions=1,2,3,4,5,6,7,8,9,10';
    } else {
      // Only D-IA
      return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=1&positions=1,2,3,4,5,6,7,8,9,10';
    }
  }

  // D-IAA is the second division
  if (division === 'D-IAA') {
    if (includeLowerDivisions) {
      // Include D-IAA and D-II
      return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=2,3&positions=1,2,3,4,5,6,7,8,9,10';
    } else {
      // Only D-IAA
      return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=2&positions=1,2,3,4,5,6,7,8,9,10';
    }
  }

  // D-II is the third division
  if (division === 'D-II') {
    if (includeLowerDivisions) {
      // Include D-II and D-III
      return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=3,4&positions=1,2,3,4,5,6,7,8,9,10';
    } else {
      // Only D-II
      return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=3&positions=1,2,3,4,5,6,7,8,9,10';
    }
  }

  // D-III is the lowest division
  if (division === 'D-III') {
    if (includeLowerDivisions) {
      // Include D-II and D-III
      return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=3,4&positions=1,2,3,4,5,6,7,8,9,10';
    } else {
      // Only D-III
      return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=4&positions=1,2,3,4,5,6,7,8,9,10';
    }
  }

  // Default URL if division doesn't match any known division
  return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=4&positions=1,2,3,4,5,6,7,8,9,10';
}

// Module-level variable to store current scrape tab ID
let currentScrapeTabId = null;

// Check if the User-Agent rule was matched
async function checkUserAgentRuleMatched(tabId) {
  console.log(`Checking matched rules for tab ${tabId}`);

  try {
    const matchedRules = await chrome.declarativeNetRequest.getMatchedRules({
      tabId: tabId
    });

    console.log('All matched rules:', matchedRules);

    // Check if our User-Agent rule (ID: 1) was matched
    const userAgentRuleMatched = matchedRules.rulesMatchedInfo.some(
      rule => rule.rule.ruleId === 1
    );

    console.log(`User-Agent rule matched: ${userAgentRuleMatched}`);

    // Return matched rule details
    return {
      matched: userAgentRuleMatched,
      details: matchedRules
    };
  } catch (error) {
    console.error('Error checking matched rules:', error);
    return {
      matched: false,
      error: error.message
    };
  }
}

// Set up listener for rule matched debug events
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
  (info) => {
    console.log('Rule matched debug event:', info);
    console.log(`Rule ${info.rule.ruleId} matched for request: ${info.request.url}`);
    console.log(`The request method was: ${info.request.method}`);

    // Check if it's our User-Agent rule (ID: 1)
    if (info.rule.ruleId === 1) {
      console.log('🎯 User-Agent rule matched!');
      console.log('Request details:', info.request);

      // Store information about the match for later reference
      // Use global variable instead of window.userAgentRuleMatches
      if (!globalThis.userAgentRuleMatches) {
        globalThis.userAgentRuleMatches = [];
      }
      globalThis.userAgentRuleMatches.push({
        timestamp: new Date().toISOString(),
        url: info.request.url,
        tabId: info.tabId
      });
    }
  }
);

// Check which rules have been matched
chrome.declarativeNetRequest.getMatchedRules({}, function (details) {
  console.log("Matched rules:", details);
  // details.rulesMatchedInfo will contain information about matched rules
});

// Check database status for diagnostic purposes
async function checkDatabaseStatus() {
  console.log('Checking database status');

  // Get IDB factory details
  const idbDetails = {
    supported: typeof indexedDB !== 'undefined',
    factory: indexedDB ? Object.getOwnPropertyNames(indexedDB).join(', ') : 'Not available'
  };

  let dbInfo = {
    name: 'gdRecruitDB',
    version: null,
    objectStores: [],
    recruitCount: 0,
    lastError: null,
    idbDetails
  };

  try {
    // Try to use the existing storage module first for safety
    try {
      const recruits = await recruitStorage.getAllRecruits();
      dbInfo.recruitCount = recruits ? recruits.length : 0;
      dbInfo.lastError = null;
      dbInfo.objectStores = ['recruits', 'config']; // Known stores from storage.js
      return dbInfo;
    } catch (storageError) {
      console.log('Storage module unavailable, checking database directly:', storageError.message);
    }

    // Fallback to direct database access for diagnosis
    return new Promise((resolve, reject) => {
      // Reduce timeout to 3 seconds to prevent message port closure
      const timeoutId = setTimeout(() => {
        dbInfo.lastError = 'Database connection timed out after 3 seconds';
        resolve(dbInfo);
      }, 3000);

      try {
        const request = indexedDB.open('gdRecruitDB');

        request.onerror = event => {
          clearTimeout(timeoutId);
          const lastError = event.target.error
            ? `${event.target.error.name}: ${event.target.error.message}`
            : 'Unknown error opening database';

          dbInfo.lastError = lastError;
          console.error('Error opening database for diagnosis:', lastError);
          resolve(dbInfo);
        };

        request.onsuccess = event => {
          clearTimeout(timeoutId);
          const db = event.target.result;

          try {
            dbInfo.name = db.name;
            dbInfo.version = db.version;
            dbInfo.objectStores = Array.from(db.objectStoreNames);

            // Check for recruits if the store exists
            if (dbInfo.objectStores.includes('recruits')) {
              const transaction = db.transaction('recruits', 'readonly');
              const store = transaction.objectStore('recruits');
              const countRequest = store.count();

              countRequest.onsuccess = () => {
                dbInfo.recruitCount = countRequest.result;
                db.close();
                resolve(dbInfo);
              };

              countRequest.onerror = event => {
                const lastError = event.target.error
                  ? `${event.target.error.name}: ${event.target.error.message}`
                  : 'Unknown error counting recruits';

                dbInfo.lastError = lastError;
                db.close();
                resolve(dbInfo);
              };
            } else {
              dbInfo.lastError = 'Recruits store not found in database';
              db.close();
              resolve(dbInfo);
            }
          } catch (error) {
            dbInfo.lastError = `Error in transaction: ${error.message}`;
            db.close();
            resolve(dbInfo);
          }
        };

        request.onupgradeneeded = event => {
          clearTimeout(timeoutId);
          dbInfo.lastError = 'Database needed initialization during diagnosis';
          resolve(dbInfo);
        };

      } catch (error) {
        clearTimeout(timeoutId);
        dbInfo.lastError = `Error setting up diagnosis: ${error.message}`;
        resolve(dbInfo);
      }
    });
  } catch (outerError) {
    dbInfo.lastError = `Outer error in diagnosis: ${outerError.message}`;
    return dbInfo;
  }
}

// Helper function to format errors for consistent response
function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else if (error && typeof error === 'object') {
    // Try to extract a message if it exists
    if (error.message) {
      return error.message;
    }
    // Otherwise stringify the object
    try {
      return JSON.stringify(error);
    } catch (e) {
      return 'Unserializable error object';
    }
  }
  return 'Unknown error';
}

// Wrapper for message handlers to provide consistent error handling
function withErrorHandling(handler) {
  return async function (message, sender, sendResponse) {
    try {
      return await handler(message, sender, sendResponse);
    } catch (error) {
      console.error('Error in message handler:', error);
      const errorMessage = formatError(error);
      sendResponse({
        success: false,
        error: errorMessage
      });
      return true; // Indicate we handled the response
    }
  };
}

// Add these lines after your existing imports at the top
console.log('GD Recruit Assistant extension loaded');


// Set up listener for GD Office page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url) {
    checkIfGDOfficePage(tab);
  }
});

// Function to check if a specific tab is the GD Office page
function checkIfGDOfficePage(tab) {
  const GD_OFFICE_URL = 'https://www.whatifsports.com/gd/office/';
  
  // Check for exact match or if it starts with our target URL (to catch any parameters)
  if (tab.url === GD_OFFICE_URL || tab.url.startsWith(GD_OFFICE_URL + '?')) {
    console.log('GD Office page detected:', tab.url);
    
    // Get the wispersisted cookie
    getWispersistedCookie().then(cookie => {
      if (cookie) {
        console.log('Found wispersisted cookie:', cookie);
        
        // Store the cookie in your database
        recruitStorage.saveConfig('wispersistedCookie', cookie.value)
          .then(() => console.log('Saved wispersisted cookie to storage'))
          .catch(err => console.error('Error saving cookie to storage:', err));
        
        // Extract team ID from cookie if needed
        const teamId = extractTeamIdFromCookie(cookie.value);
        if (teamId) {
          // Update team info in the background
          getTeamInfoFromCookies().then(teamInfo => {
            console.log('Updated team info:', teamInfo);
          }).catch(error => {
            console.error('Error updating team info:', error);
          });
        }
      } else {
        console.warn('wispersisted cookie not found');
      }
    }).catch(error => {
      console.error('Error getting wispersisted cookie:', error);
    });
    
    // Inject content script if needed
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/office-page-handler.js']
    }).catch(error => {
      console.error('Error injecting content script:', error);
    });
  }
}

// Function to get the wispersisted cookie
function getWispersistedCookie() {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({
      url: 'https://www.whatifsports.com',
      name: 'wispersisted'
    }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting cookie:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      
      resolve(cookie);
    });
  });
}

// Function to extract team ID from cookie value
function extractTeamIdFromCookie(cookieValue) {
  if (cookieValue && cookieValue.includes('gd_teamid=')) {
    // Extract the team ID using regex to capture exactly 5 digits after gd_teamid=
    const match = cookieValue.match(/gd_teamid=(\d{5})\b/);
    if (match && match[1]) {
      const teamId = match[1];
      console.log(`Extracted team ID from cookie: ${teamId}`);
      
      // Store team ID in config
      recruitStorage.saveConfig('teamId', teamId)
        .then(() => console.log('Saved team ID to storage'))
        .catch(err => console.error('Error saving team ID to storage:', err));
      
      return teamId;
    }
  }
  
  console.log('Team ID not found in cookie value');
  return null;
}

// IMPORTANT: Modify your existing getTeamInfoFromCookies function instead of replacing it
// Add this at the beginning of your existing function:
// Modify your existing getTeamInfoFromCookies function to use the stored cookie
async function _modifyExistingGetTeamInfoFromCookies() {
  /* 
  IMPORTANT: DO NOT COPY THIS FUNCTION DIRECTLY.
  Instead, modify your existing getTeamInfoFromCookies function
  to include this cookie retrieval code at the beginning:
  */
  
  try {
    // First try to get from storage
    const storedCookieValue = await recruitStorage.getConfig('wispersistedCookie');
    
    if (storedCookieValue) {
      console.log('Using stored wispersisted cookie value');
      const teamId = extractTeamIdFromCookie(storedCookieValue);
      
      if (teamId) {
        // Continue with your existing code to look up team info
        // ...
      }
    }
    
    // If no stored cookie value, continue with your existing code
    // ...
    
  } catch (error) {
    console.error('Error getting team info from cookies:', error);
    return null;
  }
}

// Add this new function to check for cookies directly
async function checkForWispersistedCookie() {
  console.log('Checking for wispersisted cookie');
  
  try {
    const cookie = await getWispersistedCookie();
    
    if (cookie) {
      console.log('Found wispersisted cookie:', cookie);
      
      // Store the cookie in your database
      await recruitStorage.saveConfig('wispersistedCookie', cookie.value);
      console.log('Saved wispersisted cookie to storage');
      
      // Extract team ID from cookie if needed
      const teamId = extractTeamIdFromCookie(cookie.value);
      if (teamId) {
        const teamInfo = await getTeamInfoFromCookies();
        console.log('Updated team info:', teamInfo);
      }
      
      return cookie;
    } else {
      console.warn('wispersisted cookie not found');
      return null;
    }
  } catch (error) {
    console.error('Error checking for wispersisted cookie:', error);
    return null;
  }
}

// Get stored team information from storage
async function getStoredTeamInfo() {
  try {
    const storedTeamInfo = await recruitStorage.getConfig('teamInfo');
    if (storedTeamInfo) {
      return JSON.parse(storedTeamInfo);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving stored team info:', error);
    return null;
  }
}

// Function to log watchlist status for debugging purposes
async function logWatchlistStatus(label = "Current") {
  try {
    const recruits = await recruitStorage.getAllRecruits();
    const watchlistRecruits = recruits.filter(recruit => recruit.watched === 1);
    console.log(`${label} Watchlist Status: ${watchlistRecruits.length} recruits`);
    
    // Log first 5 watchlist recruits for debugging
    const first5 = watchlistRecruits.slice(0, 5);
    first5.forEach(recruit => {
      console.log(`  Watchlist Recruit: ${recruit.id} (${recruit.name}), watched=${recruit.watched}`);
    });
    
    return watchlistRecruits.length;
  } catch (error) {
    console.error("Error logging watchlist status:", error);
    return -1;
  }
}



