// Background script for GD Recruit Assistant
// This script handles data processing and communication between content scripts and popup

import { multiTeamStorage } from './lib/multi-team-storage.js';
import { 
  calculateRoleRating, 
  recalculateRoleRatings, 
  recalculateRoleRatingsForTeam,
  saveRoleRatings, 
  getCurrentRoleRatings, 
  resetRoleRatingsToDefaults,
  initializeDefaultRatings
} from './lib/calculator.js';

// Configuration constants
const SEASON_RECRUITING_URL_KEY = 'seasonRecruitingUrl';

// Team-specific configuration keys - used for routing to appropriate storage
const TEAM_SPECIFIC_CONFIG_KEYS = ['currentSeason', 'lastUpdated', 'seasonRecruitingUrl', 'teamId', 'teamInfo', 'watchListCount'];

// Helper function to save configuration with multi-team storage
async function saveConfigSmart(key, value) {
  await multiTeamStorage.init();
  
  if (TEAM_SPECIFIC_CONFIG_KEYS.includes(key)) {
    // Use multi-team storage for team-specific data
    try {
      // Ensure we have team context before saving team-specific data
      if (!multiTeamStorage.getCurrentTeamStorage()) {
        console.log('No active team context, attempting to establish from cookies before saving config');
        const teamInfo = await getTeamInfoFromCookies();
        if (teamInfo?.teamId) {
          console.log(`Establishing team context ${teamInfo.teamId} for config save: ${key}`);
          await multiTeamStorage.setActiveTeam(teamInfo.teamId, teamInfo);
        } else {
          throw new Error(`Cannot save team-specific config '${key}' - no team context available`);
        }
      }
      
      await multiTeamStorage.saveConfig(key, value);
      console.log(`✅ Saved team-specific config to team ${multiTeamStorage.getCurrentTeamId()}: ${key}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error saving team-specific config '${key}':`, error);
      throw error;
    }
  } else {
    // Use multi-team storage for global configurations
    await multiTeamStorage.saveGlobalConfig(key, value);
    console.log(`✅ Saved global config: ${key}`);
    return true;
  }
}

// Helper function to get configuration with multi-team storage
async function getConfigSmart(key) {
  await multiTeamStorage.init();
  
  if (TEAM_SPECIFIC_CONFIG_KEYS.includes(key)) {
    // Use multi-team storage for team-specific data
    try {
      // Ensure we have team context before getting team-specific data
      if (!multiTeamStorage.getCurrentTeamStorage()) {
        console.log('No active team context, attempting to establish from cookies before getting config');
        const teamInfo = await getTeamInfoFromCookies();
        if (teamInfo?.teamId) {
          console.log(`Establishing team context ${teamInfo.teamId} for config get: ${key}`);
          await multiTeamStorage.setActiveTeam(teamInfo.teamId, teamInfo);
        } else {
          console.warn(`Cannot get team-specific config '${key}' - no team context available`);
          return null;
        }
      }
      
      const value = await multiTeamStorage.getConfig(key);
      console.log(`✅ Retrieved team-specific config from team ${multiTeamStorage.getCurrentTeamId()}: ${key} = ${value}`);
      return value;
      
    } catch (error) {
      console.error(`❌ Error getting team-specific config '${key}':`, error);
      return null;
    }
  } else {
    // Use multi-team storage for global configurations
    const value = await multiTeamStorage.getGlobalConfig(key);
    console.log(`✅ Retrieved global config: ${key} = ${value}`);
    return value;
  }
}

// Handle extension icon click - open popup as new tab for better user experience
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if popup tab is already open
    const existingTabs = await chrome.tabs.query({ 
      url: chrome.runtime.getURL('popup/popup.html') 
    });
    
    if (existingTabs.length > 0) {
      // Focus existing tab
      chrome.tabs.update(existingTabs[0].id, { active: true });
      chrome.windows.update(existingTabs[0].windowId, { focused: true });
    } else {
      // Create new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('popup/popup.html'),
        active: true
      });
    }
  } catch (error) {
    console.error('Error opening popup tab:', error);
  }
});

// Add this code near the top of your background file, where other initialization happens

// Check all existing tabs when extension is first loaded
chrome.runtime.onStartup.addListener(async () => {
  // Run existing tab checking
  checkAllTabsForGDOffice();
  
  // Also ensure defaults are initialized on startup
  try {
    await initializeDefaultRatings();
    console.log('Default role ratings verified on startup');
  } catch (error) {
    console.error('Error verifying default role ratings on startup:', error);
  }
});

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
chrome.runtime.onInstalled.addListener(async () => {
  console.log('GD Recruit Assistant extension installed');

  try {
    // Initialize default role ratings FIRST, before other setup
    await initializeDefaultRatings();
    console.log('Default role ratings initialized successfully');
  } catch (error) {
    console.error('Error initializing default role ratings:', error);
    // Continue with other initialization even if this fails
  }
  // Set initial stats using multi-team storage
  try {
    await multiTeamStorage.init();
    await multiTeamStorage.saveGlobalConfig('lastUpdated', new Date().toISOString());
    await multiTeamStorage.saveGlobalConfig('watchlistCount', 0);
    console.log('Initial stats saved to multi-team storage');
  } catch (error) {
    console.error('Error saving initial stats:', error);
  }

  // Extension uses popup window instead of side panel
  console.log('Extension initialized - popup ready');
});

// Handle action clicks - popup will open automatically via manifest
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
  
  // Note: Popup will open automatically due to default_popup in manifest
  console.log('Extension action clicked - popup should open automatically');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Handle error reporting messages
  if (message.type === 'popup_error') {
    console.error('Popup reported error:', message.error);
    // Don't send response for error reports
    return false;
  }
  
  // Handle different types of messages
  switch (message.action) {
    case 'ping':
      // Simple ping response for testing
      sendResponse({ success: true, message: 'Extension is active' });
      return false;

    case 'saveRecruits':
      console.log('Saving recruits to storage');
      // Save scraped recruits to database
      saveRecruits(message.data).then(async result => {
        // Update last updated timestamp using smart router
        try {
          await saveConfigSmart('lastUpdated', new Date().toISOString());
        } catch (error) {
          console.warn('Error updating lastUpdated timestamp:', error);
        }
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
      });      return true; // Indicate asynchronous response    case 'syncRecruits':
      console.log('Syncing recruits from existing tab');
      // Get the tab ID, either from sender or find active tab
      if (sender.tab && sender.tab.id) {
        // Check if tab is valid before injecting
        isValidTabForInjection(sender.tab.id).then(isValid => {
          if (!isValid) {
            sendResponse({ 
              success: false, 
              error: 'Current tab is not on whatifsports.com or not fully loaded. Please navigate to a recruiting page first.' 
            });
            return;
          }
          
          // Inject directly if we have the tab ID
          injectContentScript('content/scraper.js', sender.tab.id)
            .then(() => {
              sendResponse({ success: true });
            })
            .catch(error => {
              console.error('Error injecting script:', error);
              sendResponse({ success: false, error: error.message });
            });
        }).catch(error => {
          sendResponse({ success: false, error: 'Error validating tab: ' + error.message });
        });
      } else {
        // Find the active tab and inject there
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs && tabs.length > 0) {
            isValidTabForInjection(tabs[0].id).then(isValid => {
              if (!isValid) {
                sendResponse({ 
                  success: false, 
                  error: 'Active tab is not on whatifsports.com or not fully loaded. Please navigate to a recruiting page first.' 
                });
                return;
              }
              
              injectContentScript('content/scraper.js', tabs[0].id)
                .then(() => {
                  sendResponse({ success: true });
                })
                .catch(error => {
                  console.error('Error injecting script:', error);
                  sendResponse({ success: false, error: error.message });
                });
            }).catch(error => {
              sendResponse({ success: false, error: 'Error validating tab: ' + error.message });
            });
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
      }
      return true; // Indicate asynchronous response

    case 'updateConsidering':
      console.log('Handling updateConsidering request');
      updateConsideringStatus()
        .then(result => {
          sendResponse({ success: true, result });
        })
        .catch(error => {
          console.error('Error updating considering status:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate asynchronous response    case 'scrapeRecruits':
      console.log('Handling scrapeRecruits request');
      // This can be handled similarly to syncRecruits
      if (sender.tab && sender.tab.id) {
        isValidTabForInjection(sender.tab.id).then(isValid => {
          if (!isValid) {
            sendResponse({ 
              success: false, 
              error: 'Current tab is not on whatifsports.com or not fully loaded. Please navigate to a recruiting page first.' 
            });
            return;
          }
          
          injectContentScript('content/scraper.js', sender.tab.id)
            .then(() => {
              sendResponse({ success: true });
            })
            .catch(error => {
              console.error('Error injecting script:', error);
              sendResponse({ success: false, error: error.message });
            });
        }).catch(error => {
          sendResponse({ success: false, error: 'Error validating tab: ' + error.message });
        });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs && tabs.length > 0) {
            isValidTabForInjection(tabs[0].id).then(isValid => {
              if (!isValid) {
                sendResponse({ 
                  success: false, 
                  error: 'Active tab is not on whatifsports.com or not fully loaded. Please navigate to a recruiting page first.' 
                });
                return;
              }
              
              injectContentScript('content/scraper.js', tabs[0].id)
                .then(() => {
                  sendResponse({ success: true });
                })
                .catch(error => {
                  console.error('Error injecting script:', error);
                  sendResponse({ success: false, error: error.message });
                });
            }).catch(error => {
              sendResponse({ success: false, error: 'Error validating tab: ' + error.message });
            });
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
      }
      return true; // Indicate asynchronous response

    case 'exportData':
      console.log('Handling exportData request');
      exportAllData()
        .then(data => {
          sendResponse({ success: true, data });
        })
        .catch(error => {
          console.error('Error exporting data:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate asynchronous response    case 'importData':
      console.log('Handling importData request');
      importData(message.data)
        .then(result => {
          sendResponse({ success: true, result });
        })
        .catch(error => {
          console.error('Error importing data:', error);
          sendResponse({ success: false, error: error.message });
        });
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
        seasonPromise = saveConfigSmart('currentSeason', message.seasonNumber)
          .then(() => console.log('Season number saved successfully'))
          .catch(err => console.error('Error saving season number:', err));
      }      // Only proceed with team info AFTER season number is saved
      seasonPromise.then(() => {
        // Get team info to determine appropriate URL
        return getTeamInfoFromCookies();
      }).then(async (teamInfo) => {        
        // Determine URL based on selected divisions or team division
        const selectedDivisions = message.selectedDivisions || [];
        let url;
        
        if (selectedDivisions.length > 0 && !isRefreshOnly) {
          // Use selected divisions from the modal for new season initialization
          url = getUrlForSelectedDivisions(selectedDivisions);
          console.log('Using selected divisions:', selectedDivisions);
            // Store the URL for future refresh operations
          try {
            await saveConfigSmart(SEASON_RECRUITING_URL_KEY, url);
            console.log('Stored recruiting URL for future refresh operations:', url);
          } catch (error) {
            console.error('Error storing recruiting URL:', error);
          }
              } else if (isRefreshOnly) {
          // For refresh operations, try to use the stored URL first
          try {
            const storedUrl = await getConfigSmart(SEASON_RECRUITING_URL_KEY);
            if (storedUrl) {
              url = storedUrl;
              console.log('✓ Using stored recruiting URL for refresh:', url);
            } else {
              // Fallback to team division if no stored URL
              url = getUrlForDivision(teamInfo?.division);
              console.log('⚠ No stored URL found, using team division fallback:', teamInfo?.division);
            }
          } catch (error) {
            console.error('Error retrieving stored URL, using team division:', error);
            url = getUrlForDivision(teamInfo?.division);
          }
        } else {
          // Fallback to team division for new seasons when no divisions selected
          url = getUrlForDivision(teamInfo?.division);
          console.log('Using team division:', teamInfo?.division);
        }
          // Add url parameters for auto scrape mode
        const urlWithParams = isRefreshOnly ? 
          `${url}&auto_scrape=true&refresh_mode=true` : 
          `${url}&auto_scrape=true`;
          
        console.log(`Final recruiting URL with parameters: ${urlWithParams}`);
        return { urlWithParams, teamInfo };
      }).then(({ urlWithParams, teamInfo }) => {
        // Store the fields to update if this is a refresh
        if (isRefreshOnly && fieldsToUpdate.length > 0) {
          saveConfigSmart('refreshFieldsToUpdate', JSON.stringify(fieldsToUpdate))
            .catch(error => console.error('Error storing fields to update:', error));
        }          // Store the new tab ID when created for future reference
        // Create tab in background (inactive) to make scraping less intrusive
        chrome.tabs.create({ 
          url: urlWithParams,
          active: false  // This keeps the tab in background
        }).then(tab => {
          currentScrapeTabId = tab.id;
          console.log(`Created background tab with ID ${tab.id} for scraping`);          // The background-overlay.js script will automatically load via manifest
          // and detect the auto_scrape parameter to show the overlay
          console.log('Background tab created, overlay script will auto-detect and display');

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
        saveConfigSmart('refreshFieldsToUpdate', null)
          .catch(error => console.error('Error clearing fields to update:', error));
        
        // Update the last updated timestamp
        saveConfigSmart('lastUpdated', new Date().toISOString());
        
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
    // Update last updated timestamp using smart router
    try {
      await saveConfigSmart('lastUpdated', new Date().toISOString());
      console.log('✅ Updated lastUpdated timestamp via smart router');
    } catch (error) {
      console.warn('⚠️ Error updating lastUpdated timestamp:', error);
    }

    // Update team counts after bulk operation (performance optimized)
    try {
      await multiTeamStorage.updateTeamCountsIfNeeded();
      console.log('Team counts updated after bulk recruit save operation');
    } catch (error) {
      console.warn('Error updating team counts after bulk save:', error);
    }

    // Notify any listeners (such as the popup) that scraping is complete
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
      // Retrieve recruits from database using multi-team storage
      console.log('Getting all recruits from multi-team storage');
      (async () => {
        try {
          await multiTeamStorage.init();
          const recruits = await multiTeamStorage.getAllRecruits();
          sendResponse({ recruits });
        } catch (error) {
          console.error('Error getting recruits:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true; // Indicate asynchronous response

    case 'getStats':
      // Get extension stats using multi-team storage
      console.log('Handling getStats request');
      (async () => {
        try {
          await multiTeamStorage.init();
          
          // Get current team info
          const currentTeam = await multiTeamStorage.getCurrentTeam();
          
          if (currentTeam) {
            // Get team-specific stats
            const stats = await multiTeamStorage.getTeamStats(currentTeam.teamId);
            sendResponse(stats);
          } else {
            // Fallback to legacy storage if no active team
            const stats = await getStats();
            sendResponse(stats);
          }
        } catch (error) {
          console.error('Error getting stats:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true; // Indicate asynchronous response
    case 'clearTeamData':
      // Clear data for a specific team
      console.log('Handling clearTeamData request for team:', message.teamId);
      clearTeamData(message.teamId)
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error clearing team data:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate asynchronous response

    case 'clearCurrentTeamOnly':
      // Clear data for current team only (new action for single-team clearing)
      console.log('Handling clearCurrentTeamOnly request');
      clearCurrentTeamOnly()
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error clearing current team data:', error);
          sendResponse({ success: false, error: error.message });
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

    case 'resetAllSettings':
      // Reset all extension settings to defaults
      console.log('Handling resetAllSettings request');
      resetAllSettings()
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error resetting settings:', error);
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
      // Save configuration setting - use appropriate storage based on data type
      console.log(`Saving config: ${message.key} = ${message.value}`);
      
      if (TEAM_SPECIFIC_CONFIG_KEYS.includes(message.key)) {
        // Use smart router for team-specific data - NEVER fall back to legacy
        (async () => {
          try {
            await saveConfigSmart(message.key, message.value);
            sendResponse({ success: true });
          } catch (error) {
            console.error('Error saving team-specific config via smart router:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
      } else {
        // Use multi-team storage for global configurations
        (async () => {
          try {
            await multiTeamStorage.saveGlobalConfig(message.key, message.value);
            sendResponse({ success: true });
          } catch (error) {
            console.error('Error saving global config:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
      }
      return true; // Indicate asynchronous response    
    
    case 'getConfig':
      // Get configuration setting - use appropriate storage based on data type
      console.log(`Getting config: ${message.key}`);
      
      if (TEAM_SPECIFIC_CONFIG_KEYS.includes(message.key)) {
        // Use smart router for team-specific data - NEVER fall back to legacy
        (async () => {
          try {
            const value = await getConfigSmart(message.key);
            sendResponse({ success: true, value });
          } catch (error) {
            console.error('Error getting team-specific config via smart router:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
      } else {
        // Use multi-team storage for global configurations
        (async () => {
          try {
            const value = await multiTeamStorage.getGlobalConfig(message.key);
            sendResponse({ success: true, value });
          } catch (error) {
            console.error('Error getting global config:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
      }
      return true; // Indicate asynchronous response
    case 'getRoleRatings':
      // Get current role ratings for editing
      console.log('Getting current role ratings');
      getCurrentRoleRatings()
        .then(ratings => {
          sendResponse({ success: true, ratings: ratings });
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
      // Save custom role ratings and recalculate across all teams
      console.log('Saving custom role ratings with cross-team support');
      saveRoleRatings(message.ratings)
        .then(async () => {
          const changedPositions = message.changedPositions || null;
          
          console.log('Role ratings saved, starting cross-team recalculation...');
          
          // Use cross-team recalculation for immediate consistency
          const recalcResult = await recalculateRoleRatingsAllTeams(changedPositions);
          
          // Broadcast the update
          broadcastDataUpdate('roleRatingsSaved', {
            recalculated: recalcResult.updatedCount,
            totalRecruits: recalcResult.totalRecruits,
            teamsProcessed: recalcResult.teamsProcessed,
            changedPositions: changedPositions
          });
          
          sendResponse({ 
            success: true, 
            recalculated: recalcResult.updatedCount,
            totalRecruits: recalcResult.totalRecruits,
            teamsProcessed: recalcResult.teamsProcessed
          });
        })
        .catch(error => {
          console.error('Error saving role ratings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'resetRoleRatings':
      // Reset role ratings to defaults with cross-team recalculation
      console.log('Resetting role ratings to defaults with cross-team support');
      resetRoleRatingsToDefaults()
        .then(async () => {
          console.log('Role ratings reset, starting cross-team recalculation...');
          
          // Recalculate all role ratings across all teams
          const recalcResult = await recalculateRoleRatingsAllTeams();
          
          // Broadcast the update
          broadcastDataUpdate('roleRatingsReset', {
            recalculated: recalcResult.updatedCount,
            totalRecruits: recalcResult.totalRecruits,
            teamsProcessed: recalcResult.teamsProcessed
          });
          
          sendResponse({ 
            success: true, 
            recalculated: recalcResult.updatedCount,
            totalRecruits: recalcResult.totalRecruits,
            teamsProcessed: recalcResult.teamsProcessed
          });
        })
        .catch(error => {
          console.error('Error resetting role ratings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'resetPositionRoleRatings':
      // Reset role ratings for a specific position
      console.log('Resetting role ratings for position:', message.position);
      resetRoleRatingsToDefaults(message.position)
        .then(async () => {
          // Recalculate role ratings for this position
          const recalcResult = await recalculateRoleRatings([message.position]);
          
          // Broadcast the update
          broadcastDataUpdate('positionRoleRatingsReset', {
            position: message.position,
            recalculated: recalcResult.updatedCount,
            totalRecruits: recalcResult.totalRecruits
          });
          
          sendResponse({ 
            success: true, 
            position: message.position,
            recalculated: recalcResult.updatedCount,
            totalRecruits: recalcResult.totalRecruits 
          });
        })
        .catch(error => {
          console.error('Error resetting position role ratings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'recalculateRoleRatings':
      // Manually trigger recalculation with cross-team support
      console.log('Manually recalculating role ratings with cross-team support');
      recalculateRoleRatingsAllTeams(message.positions)
        .then(result => {
          // Broadcast the update
          broadcastDataUpdate('roleRatingsRecalculated', {
            recalculated: result.updatedCount,
            totalRecruits: result.totalRecruits,
            teamsProcessed: result.teamsProcessed,
            positions: message.positions
          });
          
          sendResponse({ 
            success: true, 
            recalculated: result.updatedCount,
            totalRecruits: result.totalRecruits,
            teamsProcessed: result.teamsProcessed
          });
        })
        .catch(error => {
          console.error('Error recalculating role ratings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    case 'checkRoleRatingsStatus':
      // Check role ratings status for diagnostics
      console.log('Checking role ratings status');
      (async () => {
        try {
          // Load settings from global storage to check status
          const customRatings = await multiTeamStorage.getGlobalConfig('customRoleRatings');
          const defaultRatings = await multiTeamStorage.getGlobalConfig('defaultRoleRatings');
          const currentSeason = await getConfigSmart('currentSeason');
          
          // Parse data for validation if available
          let customRatingsValid = false;
          let customRatingsPositions = [];
          let defaultRatingsValid = false;
          
          if (customRatings) {
            try {
              const parsed = JSON.parse(customRatings);
              customRatingsValid = typeof parsed === 'object' && parsed !== null;
              customRatingsPositions = Object.keys(parsed || {});
            } catch (e) {
              console.error('Error parsing custom role ratings:', e);
            }
          }
          
          if (defaultRatings) {
            try {
              const parsed = JSON.parse(defaultRatings);
              defaultRatingsValid = typeof parsed === 'object' && parsed !== null;
            } catch (e) {
              console.error('Error parsing default role ratings:', e);
            }
          }
          
          sendResponse({
            success: true,
            customRatings: {
              exists: !!customRatings,
              valid: customRatingsValid,
              size: customRatings ? customRatings.length : 0,
              positions: customRatingsPositions
            },
            defaultRatings: {
              exists: !!defaultRatings,
              valid: defaultRatingsValid,
              size: defaultRatings ? defaultRatings.length : 0
            },
            currentSeason
          });
        } catch (error) {
          console.error('Error checking role ratings status:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    
    case 'compareRoleRatings':
      // Compare custom and default role ratings
      console.log('Comparing role ratings');
      (async () => {
        try {
          // Get custom and default ratings from global storage
          const customRatings = await multiTeamStorage.getGlobalConfig('customRoleRatings');
          const defaultRatings = await multiTeamStorage.getGlobalConfig('defaultRoleRatings');
          
          if (!customRatings) {
            sendResponse({ success: false, error: 'Custom ratings not found' });
            return;
          }
          
          if (!defaultRatings) {
            sendResponse({ success: false, error: 'Default ratings not found' });
            return;
          }
          
          // Parse both rating sets
          const customParsed = JSON.parse(customRatings);
          const defaultParsed = JSON.parse(defaultRatings);
          
          // Compare positions
          const customPositions = Object.keys(customParsed || {});
          const defaultPositions = Object.keys(defaultParsed || {});
          
          // Find differences in positions
          const differences = {};
          
          // Check each position in custom ratings
          for (const position of customPositions) {
            // Position exists in both - check role differences
            if (defaultParsed[position]) {
              differences[position] = {};
              
              const customRoles = Object.keys(customParsed[position]);
              
              for (const role of customRoles) {
                if (defaultParsed[position][role]) {
                  // Compare attribute values
                  const customAttrs = customParsed[position][role].attributes || {};
                  const defaultAttrs = defaultParsed[position][role].attributes || {};
                  
                  // Calculate differences in attribute values
                  const attrDiffs = {};
                  let hasDifference = false;
                  
                  for (const attr in customAttrs) {
                    if (customAttrs[attr] !== defaultAttrs[attr]) {
                      attrDiffs[attr] = {
                        custom: customAttrs[attr],
                        default: defaultAttrs[attr]
                      };
                      hasDifference = true;
                    }
                  }
                  
                  if (hasDifference) {
                    differences[position][role] = attrDiffs;
                  }
                } else {
                  differences[position][role] = 'Role exists in custom but not in default';
                }
              }
              
              // If no differences found for this position, remove empty entry
              if (Object.keys(differences[position]).length === 0) {
                delete differences[position];
              }
            } else {
              differences[position] = 'Position exists in custom but not in default';
            }
          }
          
          // Check for positions in default but not in custom
          for (const position of defaultPositions) {
            if (!customParsed[position]) {
              differences[position] = 'Position exists in default but not in custom';
            }
          }
          
          sendResponse({
            success: true,
            hasDifferences: Object.keys(differences).length > 0,
            differences
          });
        } catch (error) {
          console.error('Error comparing role ratings:', error);          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;

    case 'getCurrentTeamInfo':
      // Get current team information
      console.log('Getting current team information');
      getTeamInfoFromCookies()
        .then(teamInfo => {
          sendResponse({ success: true, teamInfo });
        })
        .catch(error => {
          console.error('Error getting current team info:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'refreshTeamInfo':
      // Force refresh of team information
      console.log('Force refreshing team information');
      checkForWispersistedCookie()
        .then(cookie => {
          if (cookie) {
            return getTeamInfoFromCookies();
          } else {
            throw new Error('No wispersisted cookie found');
          }
        })
        .then(teamInfo => {
          if (teamInfo) {
            broadcastTeamChange(teamInfo);
            sendResponse({ success: true, teamInfo });
          } else {
            sendResponse({ success: false, error: 'Could not retrieve team info' });
          }
        })        .catch(error => {
          console.error('Error refreshing team info:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'checkTeamChanges':
      // Check for team changes when popup gets focus
      console.log('Checking for team changes on popup focus');
      (async () => {
        try {
          // Get current cookie value
          const cookie = await getWispersistedCookie();
          
          if (!cookie) {
            sendResponse({ success: false, error: 'No wispersisted cookie found' });
            return;
          }
          
          // Get stored cookie value to compare
          const storedCookieValue = await multiTeamStorage.getGlobalConfig('wispersistedCookie');
          
          // Check if cookie has changed
          if (cookie.value !== storedCookieValue) {
            console.log('🔄 Team change detected on popup focus');
            console.log('Cookie changed from:', storedCookieValue, 'to:', cookie.value);
            
            // Update stored cookie
            await multiTeamStorage.saveGlobalConfig('wispersistedCookie', cookie.value);
            
            // Extract team ID and get team info
            const teamId = extractTeamIdFromCookie(cookie.value);
            if (teamId) {
              // Initialize multi-team storage and switch teams
              await multiTeamStorage.init();
              
              // Get team info from GDR data
              const gdrData = await loadGdrData();
              const teamInfo = gdrData.find(team => team.wis_id === teamId);
              
              const teamData = teamInfo ? {
                teamId,
                division: teamInfo.division,
                world: teamInfo.world,
                schoolLong: teamInfo.school_long,
                schoolShort: teamInfo.school_short,
                conference: teamInfo.conference
              } : { teamId, division: null, world: null };
              
              // Switch to the new team in multi-team storage
              await multiTeamStorage.setActiveTeam(teamId, teamData);
              
              console.log('✅ Team switched successfully:', teamData);
              
              sendResponse({ 
                success: true, 
                changed: true, 
                teamInfo: teamData,
                message: 'Team changed detected and updated'
              });
            } else {
              sendResponse({ 
                success: false, 
                error: 'Could not extract team ID from cookie' 
              });
            }
          } else {
            // No change detected
            console.log('No team change detected on popup focus');
            sendResponse({ 
              success: true, 
              changed: false,
              message: 'No team change detected'
            });
          }
        } catch (error) {
          console.error('Error checking for team changes:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;

    default:
      console.warn('Unknown message action:', message.action);
      sendResponse({ success: false, error: `Unknown action: ${message.action}` });
      return false;
  }
});

// Save recruit data to storage using multi-team storage
async function saveRecruits(recruits) {
  console.log(`Saving ${recruits.length} recruits to multi-team storage`);

  // Initialize multi-team storage if needed
  await multiTeamStorage.init();

  // Ensure we have an active team context
  if (!multiTeamStorage.getCurrentTeamId()) {
    console.log('No active team found, attempting to establish team context from cookies');
    
    try {
      // Get team info from cookies to establish context
      const teamInfo = await getTeamInfoFromCookies();
      if (teamInfo?.teamId) {
        console.log(`Setting active team to ${teamInfo.teamId} before saving recruits`);
        await multiTeamStorage.setActiveTeam(teamInfo.teamId, teamInfo);
      } else {
        console.warn('No team context available, falling back to legacy storage for recruit saving');
        // Fall back to legacy storage if no team context can be established
        return await saveRecruitsLegacy(recruits);
      }
    } catch (error) {
      console.error('Error establishing team context, falling back to legacy storage:', error);
      return await saveRecruitsLegacy(recruits);
    }
  }

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
    await multiTeamStorage.clearAllRecruits();
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
    }

    try {
      // Calculate role ratings for the recruit
      const roleRatings = await calculateRoleRating(recruit);
      
      // Add role ratings to recruit
      Object.assign(recruit, roleRatings);
      
      await multiTeamStorage.saveRecruit(recruit);
      console.log(`Successfully saved recruit ${recruit.id} with role ratings to team ${multiTeamStorage.getCurrentTeamId()}`);
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
    const savedRecruits = await multiTeamStorage.getAllRecruits();
    console.log(`Verification: Found ${savedRecruits.length} recruits in team ${multiTeamStorage.getCurrentTeamId()} storage after save operation`);

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
  const recruits = await multiTeamStorage.getAllRecruits();
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
    await multiTeamStorage.saveRecruit(recruit);
    updatedCount++;
  }

  return { count: updatedCount };
}

// Update the getStats function with enhanced error handling and retry logic
async function getStats() {
  console.log('Getting extension stats');

  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check database connection health before proceeding
      const isHealthy = await multiTeamStorage.isConnectionHealthy();
      if (!isHealthy && attempt === 0) {
        console.warn('Database connection unhealthy, attempting to reconnect...');
        // Connection will be re-established automatically by the storage layer
      }

      const lastUpdated = await multiTeamStorage.getGlobalConfig('lastUpdated');
      
      // Get current season, making sure to handle both null and undefined
      let currentSeason = await getConfigSmart('currentSeason');
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
      const recruits = await multiTeamStorage.getAllRecruits();
      const recruitCount = recruits.length;
      
      // Calculate watchlist count directly from recruits data
      const watchlistCount = recruits.filter(recruit => recruit.watched === 1).length;
      
      // Update the stored watchlist count for consistency
      await multiTeamStorage.saveGlobalConfig('watchlistCount', watchlistCount);

      return {
        lastUpdated,
        watchlistCount,
        recruitCount,
        currentSeason: currentSeason || null,
        schoolName,
        teamInfo
      };

    } catch (error) {
      lastError = error;
      console.warn(`getStats attempt ${attempt + 1} failed:`, error.message);
      
      // If this is a database connection error, add delay before retry
      if (error.message.includes('closing') || error.message.includes('closed') || 
          error.message.includes('connection') || error.message.includes('transaction')) {
        
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
          console.log(`Retrying getStats in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        // For non-connection errors, don't retry
        break;
      }
    }
  }

  console.error(`getStats failed after ${maxRetries} attempts:`, lastError.message);
  
  // Return minimal fallback data
  return {
    lastUpdated: null,
    watchlistCount: 0,
    recruitCount: 0,
    currentSeason: null,
    schoolName: 'Unknown School',
    teamInfo: null,
    error: lastError.message
  };
}

// Inject a content script into a tab
// Helper function to check if a tab is valid for script injection
async function isValidTabForInjection(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.url && tab.url.includes('whatifsports.com') && tab.status === 'complete';
  } catch (error) {
    console.error('Error checking tab validity:', error);
    return false;
  }
}

async function injectContentScript(scriptPath, tabId) {
  console.log(`Injecting script ${scriptPath} into tab ${tabId}`);

  try {
    // First, get the tab info to check if we have permission
    const tab = await chrome.tabs.get(tabId);
    
    // Check if the tab URL is on whatifsports.com domain
    if (!tab.url || !tab.url.includes('whatifsports.com')) {
      throw new Error(`Cannot inject script: Tab is not on whatifsports.com domain. Current URL: ${tab.url}`);
    }

    // Check if the tab is completely loaded
    if (tab.status !== 'complete') {
      console.warn(`Tab ${tabId} is not fully loaded (status: ${tab.status}), attempting injection anyway`);
    }

    return await chrome.scripting.executeScript({
      target: { tabId },
      files: [scriptPath]
    });
  } catch (error) {
    console.error(`Failed to inject script ${scriptPath} into tab ${tabId}:`, error);
    throw error;
  }
}

// Export all data
async function exportAllData() {
  console.log('Exporting all data');

  const recruits = await multiTeamStorage.getAllRecruits();

  // Get all configuration
  const keys = ['lastUpdated', 'watchlistCount'];
  const configData = {};

  for (const key of keys) {
    configData[key] = await multiTeamStorage.getGlobalConfig(key);
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
    await multiTeamStorage.saveRecruit(recruit);
  }

  // Import config if available
  if (data.config) {
    for (const [key, value] of Object.entries(data.config)) {
      await multiTeamStorage.saveGlobalConfig(key, value);
    }
  }

  return { recruitsImported: data.recruits.length };
}

// Clear all data with enhanced error handling - fixed for multi-team support
async function clearAllData() {
  console.log('Clearing all data across all teams - enhanced version');

  try {
    // Initialize multi-team storage
    await multiTeamStorage.init();
    
    // Get all registered teams
    const allTeams = await multiTeamStorage.getAllTeams();
    console.log(`Found ${allTeams.length} registered teams for data clearing`);
    
    // Store original team context to restore later
    const originalTeamId = multiTeamStorage.getCurrentTeamId();
    console.log('Original team context:', originalTeamId);
    
    // Track results for each team
    const teamClearResults = [];
    let totalRecruitsClearedCount = 0;
    
    if (allTeams.length === 0) {
      console.log('No teams found, clearing current context only');
      // Fallback: clear current team data if no teams in registry
      const clearResult = await multiTeamStorage.clearAllRecruits();
      console.log('Clear recruits result (no teams):', clearResult);
      
      return {
        success: true,
        warning: clearResult.warning || null,
        details: {
          recruitsCleared: clearResult.success,
          teamsProcessed: 0,
          configResults: []
        }
      };
    }
    
    // Clear recruit data for each team
    console.log('Starting recruit data clear operation for all teams...');
    for (let i = 0; i < allTeams.length; i++) {
      const team = allTeams[i];
      
      try {
        console.log(`Processing team ${i + 1}/${allTeams.length}: ${team.schoolName || team.teamId}`);
        
        // Switch to this team's context
        await multiTeamStorage.setActiveTeam(team.teamId, team);
        
        // Get recruit count before clearing for reporting
        const recruits = await multiTeamStorage.getAllRecruits();
        const recruitCount = recruits.length;
        
        // Clear recruits for this team
        const clearResult = await multiTeamStorage.clearAllRecruits();
        
        teamClearResults.push({
          teamId: team.teamId,
          schoolName: team.schoolName || team.teamId,
          recruitCount: recruitCount,
          success: clearResult.success,
          warning: clearResult.warning || null,
          error: clearResult.error || null
        });
        
        if (clearResult.success) {
          totalRecruitsClearedCount += recruitCount;
          console.log(`✅ Cleared ${recruitCount} recruits for team ${team.schoolName}`);
        } else {
          console.error(`❌ Failed to clear recruits for team ${team.schoolName}:`, clearResult.error);
        }
        
      } catch (teamError) {
        console.error(`Error processing team ${team.schoolName || team.teamId}:`, teamError);
        teamClearResults.push({
          teamId: team.teamId,
          schoolName: team.schoolName || team.teamId,
          recruitCount: 0,
          success: false,
          warning: null,
          error: teamError.message
        });
      }
    }
    
    // Clear all team metadata across all teams
    let metadataClearResult;
    try {
      console.log('Clearing all team metadata across all teams...');
      metadataClearResult = await multiTeamStorage.clearAllTeamMetadata();
      console.log('Clear all team metadata result:', metadataClearResult);
    } catch (metadataError) {
      console.error('Error clearing all team metadata:', metadataError);
      metadataClearResult = { 
        success: false, 
        error: metadataError.message 
      };
    }
    
    // Restore original team context if it exists and team still exists
    if (originalTeamId) {
      try {
        const originalTeam = allTeams.find(team => team.teamId === originalTeamId);
        if (originalTeam) {
          await multiTeamStorage.setActiveTeam(originalTeamId, originalTeam);
          console.log(`Restored original team context: ${originalTeamId}`);
        } else {
          console.log('Original team no longer exists, using first available team');
          if (allTeams.length > 0) {
            await multiTeamStorage.setActiveTeam(allTeams[0].teamId, allTeams[0]);
          }
        }
      } catch (restoreError) {
        console.warn('Error restoring original team context:', restoreError);
      }
    }
    
    // Analyze results
    const successfulTeams = teamClearResults.filter(r => r.success);
    const failedTeams = teamClearResults.filter(r => !r.success);
    
    // For compatibility, create configResults array
    const configResults = [{
      success: metadataClearResult.success,
      operation: 'all team metadata',
      error: metadataClearResult.error || null
    }];
    
    // Generate summary messages
    const teamWarnings = [];
    if (failedTeams.length > 0) {
      teamWarnings.push(`Failed to clear data for ${failedTeams.length} team(s): ${failedTeams.map(t => t.schoolName).join(', ')}`);
    }
    
    if (!metadataClearResult.success) {
      teamWarnings.push(`Failed to clear team metadata: ${metadataClearResult.error}`);
    }
    
    const combinedWarning = teamWarnings.length > 0 ? teamWarnings.join('; ') : null;
    
    console.log(`Clear all data completed: ${successfulTeams.length}/${allTeams.length} teams successful, ${totalRecruitsClearedCount} total recruits cleared`);
    
    return {
      success: failedTeams.length === 0 && metadataClearResult.success,
      warning: combinedWarning,
      details: {
        recruitsCleared: successfulTeams.length > 0,
        teamsProcessed: allTeams.length,
        successfulTeams: successfulTeams.length,
        failedTeams: failedTeams.length,
        totalRecruitsClearedCount: totalRecruitsClearedCount,
        teamResults: teamClearResults,
        configResults: configResults
      }
    };
    
  } catch (error) {
    // Enhanced error handling with specific error types
    const errorMessage = error.message || 'Unknown error';
    console.error('Error in clearAllData:', errorMessage, error);
    
    // Provide more specific error messages
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('connection is closing')) {
      userFriendlyMessage = 'Database connection issue. Please try again or restart the extension.';
    } else if (errorMessage.includes('timeout')) {
      userFriendlyMessage = 'Operation timed out. The database may be busy. Please try again.';
    } else if (errorMessage.includes('transaction')) {
      userFriendlyMessage = 'Database transaction failed. Please try again or check database status.';
    }
    
    throw new Error(userFriendlyMessage);
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
    await multiTeamStorage.saveRecruit(recruit);
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
  const existingRecruits = await multiTeamStorage.getAllRecruits();
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
      await multiTeamStorage.saveRecruit(recruit);
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
    // First try to get from storage (NEVER use smart routing here to avoid loops)
    const storedCookieValue = await multiTeamStorage.getGlobalConfig('wispersistedCookie');
    
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
        
        // IMPORTANT: Use direct storage save to avoid circular dependency
        await multiTeamStorage.saveGlobalConfig('teamInfo', JSON.stringify(teamData));
        
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
    
    // IMPORTANT: Use direct storage save to avoid circular dependency
    await multiTeamStorage.saveGlobalConfig('teamInfo', JSON.stringify(teamData));
    
    return teamData;
  } catch (error) {
    console.error('Error getting team info from cookies:', error);
    return null;
  }
}

// Get URL for division
function getUrlForDivision(division) {
  // If division is not found or not provided, use the default URL
  if (!division) {
    return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=1&positions=1,2,3,4,5,6,7,8,9,10';
  }

  // Map division to URL - only include the exact division
  // D-IA is the highest division
  if (division === 'D-IA') {
    return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=1&positions=1,2,3,4,5,6,7,8,9,10';
  }

  // D-IAA is the second division
  if (division === 'D-IAA') {
    return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=2&positions=1,2,3,4,5,6,7,8,9,10';
  }

  // D-II is the third division
  if (division === 'D-II') {
    return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=3&positions=1,2,3,4,5,6,7,8,9,10';
  }

  // D-III is the lowest division
  if (division === 'D-III') {
    return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=4&positions=1,2,3,4,5,6,7,8,9,10';
  }
  // Default URL if division doesn't match any known division
  return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=4&positions=1,2,3,4,5,6,7,8,9,10';
}

// Get URL for multiple selected divisions
function getUrlForSelectedDivisions(selectedDivisions) {
  if (!selectedDivisions || selectedDivisions.length === 0) {
    // Fallback to D-IA if no divisions selected
    return 'https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=1&positions=1,2,3,4,5,6,7,8,9,10';
  }

  // Sort the divisions to ensure consistent URL generation
  const sortedDivisions = selectedDivisions.sort((a, b) => parseInt(a) - parseInt(b));
  const divisionsParam = sortedDivisions.join(',');
  
  console.log('Selected division values:', selectedDivisions, 'URL param:', divisionsParam);
  
  return `https://www.whatifsports.com/gd/recruiting/Advanced.aspx?divisions=${divisionsParam}&positions=1,2,3,4,5,6,7,8,9,10`;
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

// Check database status for diagnostic purposes - using storage module only
async function checkDatabaseStatus() {
  console.log('Checking database status using storage module');

  // Get IDB factory details
  const idbDetails = {
    supported: typeof indexedDB !== 'undefined',
    factory: indexedDB ? Object.getOwnPropertyNames(indexedDB).join(', ') : 'Not available'
  };

  let dbInfo = {
    name: 'gdRecruitDB',
    version: 1, // Known version from storage.js
    objectStores: ['recruits', 'config'], // Known stores from storage.js
    recruitCount: 0,
    lastError: null,
    idbDetails
  };

  try {
    // Use the existing storage module exclusively to avoid connection conflicts
    console.log('Checking connection health...');
    const isHealthy = await multiTeamStorage.isConnectionHealthy();
    
    if (!isHealthy) {
      dbInfo.lastError = 'Database connection is not healthy';
      return dbInfo;
    }

    console.log('Getting recruit count...');
    const recruits = await multiTeamStorage.getAllRecruits();
    dbInfo.recruitCount = recruits ? recruits.length : 0;
    dbInfo.lastError = null;
    
    console.log(`Database check completed successfully. Found ${dbInfo.recruitCount} recruits.`);
    return dbInfo;

  } catch (error) {
    console.error('Error checking database via storage module:', error);
    dbInfo.lastError = `Storage module error: ${error.message || 'Unknown error'}`;
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

// Enhanced UI Refresh Mechanism - Background Message Broadcasting
// Function to broadcast data update to all extension contexts
function broadcastDataUpdate(updateType, data = {}) {
  const message = {
    type: 'dataUpdated',
    updateType: updateType,
    timestamp: Date.now(),
    data: data
  };
  
  // Send to all extension contexts
  chrome.runtime.sendMessage(message).catch(() => {
    // Silently handle cases where no listeners are active
  });
}

// Cross-team role ratings recalculation function
async function recalculateRoleRatingsAllTeams(changedPositions = null) {
  console.log('Starting cross-team role ratings recalculation');
  console.log('Changed positions:', changedPositions);
  
  try {
    // Initialize multi-team storage
    await multiTeamStorage.init();
    
    // Get all registered teams
    const allTeams = await multiTeamStorage.getAllTeams();
    console.log(`Found ${allTeams.length} registered teams for cross-team recalculation`);
    
    if (allTeams.length <= 1) {
      // Single team or no teams - use existing logic
      console.log('Single team detected, using standard recalculation');
      return await recalculateRoleRatings(changedPositions);
    }
    
    // Store original team context to restore later
    const originalTeamId = multiTeamStorage.getCurrentTeamId();
    
    // Multi-team processing
    let totalUpdated = 0;
    let totalRecruits = 0;
    let totalProcessed = 0;
    const teamResults = [];
    
    // Send initial progress message
    chrome.runtime.sendMessage({
      action: 'crossTeamProgress',
      phase: 'starting',
      totalTeams: allTeams.length,
      changedPositions: changedPositions
    }).catch(() => {
      // Ignore if no listeners
    });
    
    for (let i = 0; i < allTeams.length; i++) {
      const team = allTeams[i];
      
      try {
        // Send progress update for current team
        chrome.runtime.sendMessage({
          action: 'crossTeamProgress',
          currentTeam: team.schoolName || team.teamId,
          teamIndex: i + 1,
          totalTeams: allTeams.length,
          phase: 'processing'
        }).catch(() => {
          // Ignore if no listeners
        });
        
        console.log(`Processing team ${i + 1}/${allTeams.length}: ${team.schoolName || team.teamId}`);
        
        // Recalculate for this specific team
        const teamResult = await recalculateRoleRatingsForTeam(team.teamId, team, changedPositions);
        
        totalUpdated += teamResult.updatedCount;
        totalRecruits += teamResult.totalRecruits;
        totalProcessed += teamResult.recruitsProcessed || teamResult.updatedCount;
        
        teamResults.push({
          teamId: team.teamId,
          schoolName: team.schoolName,
          updated: teamResult.updatedCount,
          total: teamResult.totalRecruits,
          processed: teamResult.recruitsProcessed || teamResult.updatedCount
        });
        
        console.log(`Team ${team.schoolName}: Updated ${teamResult.updatedCount} of ${teamResult.recruitsProcessed || teamResult.totalRecruits} recruits`);
        
      } catch (error) {
        console.error(`Error processing team ${team.schoolName || team.teamId}:`, error);
        
        teamResults.push({
          teamId: team.teamId,
          schoolName: team.schoolName,
          error: error.message,
          updated: 0,
          total: 0,
          processed: 0
        });
      }
    }
    
    // Restore original team context
    if (originalTeamId) {
      try {
        await multiTeamStorage.setActiveTeam(originalTeamId);
        console.log(`Restored original team context: ${originalTeamId}`);
      } catch (error) {
        console.error('Error restoring original team context:', error);
      }
    }
    
    // Send completion message
    chrome.runtime.sendMessage({
      action: 'crossTeamProgress',
      phase: 'complete',
      totalUpdated,
      totalRecruits,
      totalProcessed,
      teamsProcessed: allTeams.length,
      teamResults
    }).catch(() => {
      // Ignore if no listeners
    });
    
    console.log(`Cross-team recalculation complete: Updated ${totalUpdated} recruits across ${allTeams.length} teams`);
    
    return { 
      updatedCount: totalUpdated, 
      totalRecruits: totalRecruits,
      totalProcessed: totalProcessed,
      teamsProcessed: allTeams.length,
      teamResults: teamResults
    };
    
  } catch (error) {
    console.error('Error in cross-team role ratings recalculation:', error);
    
    // Send error message
    chrome.runtime.sendMessage({
      action: 'crossTeamProgress',
      phase: 'error',
      error: error.message
    }).catch(() => {
      // Ignore if no listeners
    });
    
    throw error;
  }
}

// Add these lines after your existing imports at the top
console.log('GD Recruit Assistant extension loaded');

// Multi-team cookie monitoring system
class TeamCookieMonitor {
  constructor() {
    this.currentTeamId = null;
    this.lastKnownCookieValue = null;
    this.pollInterval = 2000; // Check every 2 seconds
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.consecutiveFailures = 0;
    this.maxFailures = 5;
  }
  
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('Team cookie monitoring already active');
      return;
    }
    
    console.log('Starting team cookie monitoring');
    this.isMonitoring = true;
    
    // Initialize with stored cookie value
    try {
      const storedCookieValue = await multiTeamStorage.getGlobalConfig('wispersistedCookie');
      this.lastKnownCookieValue = storedCookieValue;
      
      // If we have a stored cookie, try to extract team ID and set active team
      if (storedCookieValue) {
        const teamId = this.extractTeamIdFromCookie(storedCookieValue);
        if (teamId) {
          await this.initializeTeamFromCookie(teamId);
        }
      }
    } catch (error) {
      console.error('Error initializing cookie monitoring:', error);
    }
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkTeamCookie().catch(error => {
        console.error('Error in periodic cookie check:', error);
      });
    }, this.pollInterval);
    
    // Initial check
    await this.checkTeamCookie();
  }
  
  async checkTeamCookie() {
    try {
      const cookie = await chrome.cookies.get({
        url: "https://whatifsports.com",
        name: "wispersisted"
      });
      
      const currentValue = cookie ? cookie.value : null;
      
      // Check if this is actually a change from our last known value
      if (currentValue !== this.lastKnownCookieValue) {
        console.log('Cookie value changed from:', this.lastKnownCookieValue, 'to:', currentValue);
        
        this.lastKnownCookieValue = currentValue;
        await this.handleTeamChange(currentValue, !cookie);
      }
      
      this.consecutiveFailures = 0;
      
    } catch (error) {
      this.consecutiveFailures++;
      console.warn(`Cookie check failed (attempt ${this.consecutiveFailures}):`, error);
      
      if (this.consecutiveFailures >= this.maxFailures) {
        console.warn('Multiple cookie check failures, reducing monitoring frequency');
        this.pollInterval = Math.min(this.pollInterval * 2, 10000); // Max 10 seconds
        
        // Update the interval
        if (this.monitoringInterval) {
          clearInterval(this.monitoringInterval);
          this.monitoringInterval = setInterval(() => {
            this.checkTeamCookie().catch(error => {
              console.error('Error in periodic cookie check:', error);
            });
          }, this.pollInterval);
        }
      }
    }
  }
  
  async handleTeamChange(newCookieValue, wasRemoved) {
    console.log('Handling team change via cookie monitoring');
    
    try {
      if (wasRemoved || !newCookieValue) {
        console.log('wispersisted cookie was removed or cleared');
        
        // Clear stored team information
        await multiTeamStorage.saveGlobalConfig('wispersistedCookie', null);
        await multiTeamStorage.saveGlobalConfig('teamInfo', null);
        await multiTeamStorage.saveGlobalConfig('teamId', null);
        
        // Reset current team context
        this.currentTeamId = null;
        
        // Broadcast team change to update UI
        this.broadcastTeamChange(null);
        return;
      }
      
      // Store the new cookie value
      await multiTeamStorage.saveGlobalConfig('wispersistedCookie', newCookieValue);
      console.log('Saved new cookie value to storage');
      
      // Extract team ID from the new cookie
      const teamId = this.extractTeamIdFromCookie(newCookieValue);
      
      if (teamId && teamId !== this.currentTeamId) {
        console.log(`🔄 Team change detected: ${this.currentTeamId} → ${teamId}`);
        
        // Get team info for the new team
        const teamInfo = await this.getTeamInfoForId(teamId);
        
        if (teamInfo) {
          console.log('🎯 AUTO-ENABLING multi-team mode due to team switch');
          
          // Initialize multi-team storage if needed
          try {
            await multiTeamStorage.init();
            console.log('Multi-team storage initialized successfully');
          } catch (error) {
            console.warn('Multi-team storage already initialized or error:', error);
          }
          
          // Switch to the new team (this will trigger auto-enablement if multiple teams exist)
          await multiTeamStorage.setActiveTeam(teamId, teamInfo);
          this.currentTeamId = teamId;
          
          console.log('✅ Successfully switched to team:', teamInfo);
          
          // Verify multi-team mode status
          const isMultiTeamEnabled = await multiTeamStorage.isMultiTeamMode();
          console.log(`Multi-team mode after switch: ${isMultiTeamEnabled}`);
          
          // Broadcast the team change
          this.broadcastTeamChange(teamInfo);
        } else {
          console.warn('Could not retrieve team information for new team ID');
          this.broadcastTeamChange({ teamId, error: 'Team info not found' });
        }
      } else if (!teamId) {
        console.warn('Could not extract team ID from new cookie value');
        this.broadcastTeamChange({ error: 'Invalid cookie format' });
      }
      
    } catch (error) {
      console.error('Error handling team change:', error);
      this.broadcastTeamChange({ error: error.message });
    }
  }
  
  async initializeTeamFromCookie(teamId) {
    try {
      console.log(`Initializing active team from stored cookie: ${teamId}`);
      
      const teamInfo = await this.getTeamInfoForId(teamId);
      if (teamInfo) {
        await multiTeamStorage.setActiveTeam(teamId, teamInfo);
        this.currentTeamId = teamId;
        console.log('Initialized active team successfully:', teamInfo);
      }
    } catch (error) {
      console.warn('Could not initialize team from cookie:', error);
    }
  }
  
  async getTeamInfoForId(teamId) {
    try {
      // Get team info from GDR data
      const gdrData = await loadGdrData();
      const teamInfo = gdrData.find(team => team.wis_id === teamId);
      
      if (!teamInfo) {
        console.log('Team not found in GDR data for ID:', teamId);
        return { teamId, division: null, world: null };
      }
      
      console.log(`Found team in GDR data: ${teamInfo.school_long}, Division: ${teamInfo.division}, World: ${teamInfo.world}`);
      
      const teamData = {
        teamId,
        division: teamInfo.division,
        world: teamInfo.world,
        schoolLong: teamInfo.school_long,
        schoolShort: teamInfo.school_short,
        conference: teamInfo.conference
      };
      
      // Save team info to legacy storage for compatibility
      await multiTeamStorage.saveGlobalConfig('teamInfo', JSON.stringify(teamData));
      await multiTeamStorage.saveGlobalConfig('teamId', teamId);
      
      return teamData;
    } catch (error) {
      console.error('Error getting team info for ID:', teamId, error);
      return null;
    }
  }
  
  extractTeamIdFromCookie(cookieValue) {
    if (cookieValue && cookieValue.includes('gd_teamid=')) {
      const match = cookieValue.match(/gd_teamid=(\d{5})\b/);
      if (match && match[1]) {
        const teamId = match[1];
        console.log(`Extracted team ID from cookie: ${teamId}`);
        return teamId;
      }
    }
    console.log('Team ID not found in cookie value');
    return null;
  }
  
  broadcastTeamChange(teamInfo) {
    const message = {
      action: 'teamChanged',
      teamInfo: teamInfo,
      timestamp: Date.now()
    };
    
    console.log('Broadcasting team change:', message);
    
    // Send to all extension contexts
    chrome.runtime.sendMessage(message).catch(() => {
      console.log('No active listeners for team change broadcast');
    });
  }
  
  stopMonitoring() {
    console.log('Stopping team cookie monitoring');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  getCurrentTeamId() {
    return this.currentTeamId;
  }
}

// Create global team cookie monitor instance
const teamCookieMonitor = new TeamCookieMonitor();

// Enhanced startup listener with multi-team support
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension startup - initializing multi-team support');
  
  // Run existing tab checking
  checkAllTabsForGDOffice();
  
  // Initialize defaults
  try {
    await initializeDefaultRatings();
    console.log('Default role ratings verified on startup');
  } catch (error) {
    console.error('Error verifying default role ratings on startup:', error);
  }
  
  // Start team cookie monitoring
  try {
    await teamCookieMonitor.startMonitoring();
    console.log('Team cookie monitoring started successfully');
  } catch (error) {
    console.error('Error starting team cookie monitoring:', error);
  }
});

// Enhanced installation listener with multi-team support
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated - initializing multi-team support');
  
  // Start team cookie monitoring
  try {
    await teamCookieMonitor.startMonitoring();
    console.log('Team cookie monitoring started successfully');
  } catch (error) {
    console.error('Error starting team cookie monitoring:', error);
  }
});

// Note: Cookie monitoring is now handled by TeamCookieMonitor class above

// Set up listener for GD Office page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url) {
    checkIfGDOfficePage(tab);
  }
});

// Function to check if a specific tab is the GD Office page
function checkIfGDOfficePage(tab) {
  // Validate tab object
  if (!tab || !tab.url || !tab.id) {
    console.warn('Invalid tab object passed to checkIfGDOfficePage');
    return;
  }
  
  const GD_OFFICE_URL = 'https://www.whatifsports.com/gd/office/';
  
  // Check for exact match or if it starts with our target URL (to catch any parameters)
  if (tab.url === GD_OFFICE_URL || tab.url.startsWith(GD_OFFICE_URL + '?')) {
    console.log('GD Office page detected:', tab.url);
    
    // Get the wispersisted cookie
    getWispersistedCookie().then(cookie => {
      if (cookie) {
        console.log('Found wispersisted cookie:', cookie);
        
        // Store the cookie in your database
        multiTeamStorage.saveGlobalConfig('wispersistedCookie', cookie.value)
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
    });    // Content script is now injected declaratively via manifest
    console.log('GD Office page detected, content script will be injected automatically');
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
      multiTeamStorage.saveGlobalConfig('teamId', teamId)
        .then(() => console.log('Saved team ID to storage'))
        .catch(err => console.error('Error saving team ID to storage:', err));
      
      return teamId;
    }
  }
  
  console.log('Team ID not found in cookie value');
  return null;
}

// Add this new function to check for cookies directly
async function checkForWispersistedCookie() {
  console.log('Checking for wispersisted cookie');
  
  try {
    const cookie = await getWispersistedCookie();
    
    if (cookie) {
      console.log('Found wispersisted cookie:', cookie);
      
      // Store the cookie in your database
      await multiTeamStorage.saveGlobalConfig('wispersistedCookie', cookie.value);
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
    const storedTeamInfo = await multiTeamStorage.getGlobalConfig('teamInfo');
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
    const recruits = await multiTeamStorage.getAllRecruits();
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

// Clear data for current team only (without affecting other teams)
async function clearCurrentTeamOnly() {
  console.log('Clearing data for current team only');

  try {
    // Initialize multi-team storage
    await multiTeamStorage.init();

    // Get current team info
    const currentTeamId = multiTeamStorage.getCurrentTeamId();
    
    if (!currentTeamId) {
      console.log('No current team context found, attempting to establish from cookies');
      
      // Try to get team info from cookies
      const teamInfo = await getTeamInfoFromCookies();
      if (teamInfo?.teamId) {
        console.log(`Establishing team context ${teamInfo.teamId} for current team clear`);
        await multiTeamStorage.setActiveTeam(teamInfo.teamId, teamInfo);
      } else {
        console.log('No team context available, using fallback single-team clear');
        
        // Fallback: just clear current storage context without multi-team logic
        const clearResult = await multiTeamStorage.clearAllRecruits();
        console.log('Fallback clear recruits result:', clearResult);
        
        // Clear basic metadata without affecting other teams
        const metadataKeys = ['currentSeason', 'lastUpdated', 'seasonRecruitingUrl'];
        const configResults = [];
        
        for (const key of metadataKeys) {
          try {
            await saveConfigSmart(key, null);
            configResults.push({ success: true, operation: key });
          } catch (error) {
            console.error(`Error clearing ${key}:`, error);
            configResults.push({ success: false, operation: key, error: error.message });
          }
        }
        
        return {
          success: true,
          warning: clearResult.warning || null,
          details: {
            recruitsCleared: clearResult.success,
            configResults: configResults
          }
        };
      }
    }
    
    // Now we have a current team context, clear only this team
    const currentTeam = await multiTeamStorage.getCurrentTeam();
    console.log(`Clearing data for current team: ${currentTeam?.schoolName || currentTeamId}`);
    
    // Clear team-specific recruit data
    const clearResult = await multiTeamStorage.clearAllRecruits();
    console.log('Clear current team recruits result:', clearResult);

    // Clear team-specific metadata for current team only
    const teamStorage = multiTeamStorage.getCurrentTeamStorage();
    
    let metadataClearResult;
    try {
      console.log('Clearing current team metadata...');
      metadataClearResult = await teamStorage.clearAllTeamMetadata();
      console.log('Clear current team metadata result:', metadataClearResult);
    } catch (metadataError) {
      console.error('Error clearing current team metadata:', metadataError);
      metadataClearResult = { 
        success: false, 
        error: metadataError.message 
      };
    }

    // For compatibility, create configResults array
    const configResults = [{
      success: metadataClearResult.success,
      operation: 'current team metadata',
      error: metadataClearResult.error || null
    }];

    // Check if any config operations failed
    const failedConfigs = configResults.filter(r => !r.success);
    
    let warningMessage = null;
    if (failedConfigs.length > 0) {
      warningMessage = `Some team configuration settings could not be cleared: ${failedConfigs.map(f => f.operation).join(', ')}`;
      console.warn(warningMessage);
    }

    // Combine warnings
    const combinedWarning = [clearResult.warning, warningMessage].filter(Boolean).join('; ');

    return {
      success: true,
      teamId: currentTeamId,
      teamName: currentTeam?.schoolName || currentTeamId,
      warning: combinedWarning || null,
      details: {
        recruitsCleared: clearResult.success,
        configResults: configResults
      }
    };

  } catch (error) {
    // Enhanced error handling with specific error types
    const errorMessage = error.message || 'Unknown error';
    console.error('Error in clearCurrentTeamOnly:', errorMessage, error);
    
    // Provide more specific error messages
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('connection is closing')) {
      userFriendlyMessage = 'Database connection issue. Please try again or restart the extension.';
    } else if (errorMessage.includes('timeout')) {
      userFriendlyMessage = 'Operation timed out. The database may be busy. Please try again.';
    } else if (errorMessage.includes('transaction')) {
      userFriendlyMessage = 'Database transaction failed. Please try again or check database status.';
    }
    
    throw new Error(userFriendlyMessage);
  }
}

// Clear data for a specific team
async function clearTeamData(teamId) {
  console.log(`Clearing data for team: ${teamId}`);

  if (!teamId) {
    throw new Error('Team ID is required for team data clearing');
  }

  try {
    // Initialize multi-team storage
    await multiTeamStorage.init();

    // Verify team exists
    const allTeams = await multiTeamStorage.getAllTeams();
    const targetTeam = allTeams.find(team => team.teamId === teamId);
    
    if (!targetTeam) {
      throw new Error(`Team ${teamId} not found in registered teams`);
    }

    console.log(`Found team to clear: ${targetTeam.schoolName || teamId}`);

    // Store current team context to restore later
    const originalTeamId = multiTeamStorage.getCurrentTeamId();
    
    // Switch to target team for clearing
    await multiTeamStorage.setActiveTeam(teamId, targetTeam);
    
    // Clear team-specific recruit data
    const clearResult = await multiTeamStorage.clearAllRecruits();
    console.log('Clear team recruits result:', clearResult);

    // Get team storage instance to clear team-specific metadata
    const teamStorage = multiTeamStorage.getCurrentTeamStorage();
    
    // Clear team-specific metadata completely
    let metadataClearResult;
    try {
      console.log('Clearing all team metadata...');
      metadataClearResult = await teamStorage.clearAllTeamMetadata();
      console.log('Clear team metadata result:', metadataClearResult);
    } catch (metadataError) {
      console.error('Error clearing team metadata:', metadataError);
      metadataClearResult = { 
        success: false, 
        error: metadataError.message 
      };
    }

    // For compatibility, still create configResults array
    const configResults = [{
      success: metadataClearResult.success,
      operation: 'team metadata',
      error: metadataClearResult.error || null
    }];

    // Restore original team context if it was different
    if (originalTeamId && originalTeamId !== teamId) {
      try {
        const originalTeam = allTeams.find(team => team.teamId === originalTeamId);
        if (originalTeam) {
          await multiTeamStorage.setActiveTeam(originalTeamId, originalTeam);
          console.log(`Restored original team context: ${originalTeamId}`);
        }
      } catch (restoreError) {
        console.warn('Error restoring original team context:', restoreError);
      }
    }

    // Check if any config operations failed
    const failedConfigs = configResults.filter(r => !r.success);
    
    let warningMessage = null;
    if (failedConfigs.length > 0) {
      warningMessage = `Some team configuration settings could not be cleared: ${failedConfigs.map(f => f.operation).join(', ')}`;
      console.warn(warningMessage);
    }

    // Combine warnings
    const combinedWarning = [clearResult.warning, warningMessage].filter(Boolean).join('; ');

    return {
      success: true,
      teamId: teamId,
      teamName: targetTeam.schoolName || teamId,
      warning: combinedWarning || null,
      details: {
        recruitsCleared: clearResult.success,
        configResults: configResults
      }
    };

  } catch (error) {
    // Enhanced error handling with specific error types
    const errorMessage = error.message || 'Unknown error';
    console.error('Error in clearTeamData:', errorMessage, error);
    
    // Provide more specific error messages
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('connection is closing')) {
      userFriendlyMessage = 'Database connection issue. Please try again or restart the extension.';
    } else if (errorMessage.includes('timeout')) {
      userFriendlyMessage = 'Operation timed out. The database may be busy. Please try again.';
    } else if (errorMessage.includes('transaction')) {
      userFriendlyMessage = 'Database transaction failed. Please try again or check database status.';
    }
    
    throw new Error(userFriendlyMessage);
  }
}

// Reset all extension settings to defaults while preserving data
async function resetAllSettings() {
  console.log('Resetting all extension settings to defaults');

  try {
    // Initialize multi-team storage
    await multiTeamStorage.init();

    const resetOperations = [];

    // Reset role ratings to defaults
    try {
      await resetRoleRatingsToDefaults();
      console.log('Successfully reset role ratings to defaults');
      resetOperations.push({ success: true, operation: 'role ratings' });
    } catch (error) {
      console.error('Error resetting role ratings:', error);
      resetOperations.push({ success: false, operation: 'role ratings', error: error.message });
    }

    // Reset bold attributes configuration (stored in chrome.storage.local)
    try {
      await chrome.storage.local.remove(['boldAttributesConfig', 'boldAttributesUserConfig']);
      console.log('Successfully reset bold attributes configuration');
      resetOperations.push({ success: true, operation: 'bold attributes configuration' });
    } catch (error) {
      console.error('Error resetting bold attributes:', error);
      resetOperations.push({ success: false, operation: 'bold attributes configuration', error: error.message });
    }

    // Reset column visibility settings
    try {
      await chrome.storage.local.remove(['columnVisibility']);
      console.log('Successfully reset column visibility settings');
      resetOperations.push({ success: true, operation: 'column visibility' });
    } catch (error) {
      console.error('Error resetting column visibility:', error);
      resetOperations.push({ success: false, operation: 'column visibility', error: error.message });
    }

    // Reset column order settings
    try {
      await chrome.storage.local.remove(['columnOrder']);
      console.log('Successfully reset column order settings');
      resetOperations.push({ success: true, operation: 'column order' });
    } catch (error) {
      console.error('Error resetting column order:', error);
      resetOperations.push({ success: false, operation: 'column order', error: error.message });
    }

    // Reset page size preference
    try {
      await chrome.storage.local.remove(['preferredPageSize']);
      console.log('Successfully reset page size preference');
      resetOperations.push({ success: true, operation: 'page size preference' });
    } catch (error) {
      console.error('Error resetting page size:', error);
      resetOperations.push({ success: false, operation: 'page size preference', error: error.message });
    }

    // Reset any other extension-specific settings
    const globalSettingsToReset = [
      { key: 'extensionPreferences', description: 'extension preferences' },
      { key: 'uiSettings', description: 'UI settings' },
      { key: 'filterPreferences', description: 'filter preferences' }
    ];

    for (const setting of globalSettingsToReset) {
      try {
        await multiTeamStorage.saveGlobalConfig(setting.key, null);
        console.log(`Successfully reset ${setting.description}`);
        resetOperations.push({ success: true, operation: setting.description });
      } catch (error) {
        console.error(`Error resetting ${setting.description}:`, error);
        resetOperations.push({ 
          success: false, 
          operation: setting.description, 
          error: error.message 
        });
      }
    }

    // Check if any operations failed
    const failedOperations = resetOperations.filter(r => !r.success);
    const successfulOperations = resetOperations.filter(r => r.success);
    
    let warningMessage = null;
    if (failedOperations.length > 0) {
      warningMessage = `Some settings could not be reset: ${failedOperations.map(f => f.operation).join(', ')}`;
      console.warn(warningMessage);
    }

    return {
      success: true,
      warning: warningMessage || null,
      details: {
        totalOperations: resetOperations.length,
        successful: successfulOperations.length,
        failed: failedOperations.length,
        results: resetOperations
      }
    };

  } catch (error) {
    // Enhanced error handling
    const errorMessage = error.message || 'Unknown error';
    console.error('Error in resetAllSettings:', errorMessage, error);
    
    // Provide more specific error messages
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('connection is closing')) {
      userFriendlyMessage = 'Database connection issue. Please try again or restart the extension.';
    } else if (errorMessage.includes('timeout')) {
      userFriendlyMessage = 'Operation timed out. The database may be busy. Please try again.';
    } else if (errorMessage.includes('transaction')) {
      userFriendlyMessage = 'Database transaction failed. Please try again or check database status.';
    }
    
    throw new Error(userFriendlyMessage);
  }
}
