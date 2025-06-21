/**
 * Debug tools for GD Recruit Assistant
 * Provides helper functions for debugging role ratings and storage issues
 */

// Module configuration variables
let _debug_mode = false;

/**
 * Check the status of role ratings in storage
 * @returns {Promise<Object>} Results of the check
 */
export async function checkRoleRatingsStatus() {
  console.log('Checking role ratings status...');
  
  try {
    // Get references to required modules
    const { getConfig } = await import('./storage.js');
    
    // Check for custom role ratings
    const customRatings = await getConfig('customRoleRatings');
    const customRatingsExists = !!customRatings;
    
    // Check for default role ratings
    const defaultRatings = await getConfig('defaultRoleRatings');
    const defaultRatingsExists = !!defaultRatings;
    
    // Get current season for context
    const currentSeason = await getConfig('currentSeason');
    
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
    
    return {
      success: true,
      customRatings: {
        exists: customRatingsExists,
        valid: customRatingsValid,
        size: customRatings ? customRatings.length : 0,
        positions: customRatingsPositions
      },
      defaultRatings: {
        exists: defaultRatingsExists,
        valid: defaultRatingsValid,
        size: defaultRatings ? defaultRatings.length : 0
      },
      currentSeason
    };
    
  } catch (error) {
    console.error('Error checking role ratings status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Compare custom ratings with default ratings
 * @returns {Promise<Object>} Results of the comparison
 */
export async function compareRoleRatings() {
  console.log('Comparing custom and default role ratings...');
  
  try {
    // Get references to required modules
    const { getConfig } = await import('./storage.js');
    
    // Get custom and default ratings
    const customRatings = await getConfig('customRoleRatings');
    const defaultRatings = await getConfig('defaultRoleRatings');
    
    if (!customRatings) {
      return { success: false, error: 'Custom ratings not found' };
    }
    
    if (!defaultRatings) {
      return { success: false, error: 'Default ratings not found' };
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
    
    return {
      success: true,
      hasDifferences: Object.keys(differences).length > 0,
      differences
    };
    
  } catch (error) {
    console.error('Error comparing role ratings:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Enable or disable debug mode 
 * @param {boolean} enabled True to enable debug mode
 */
export function setDebugMode(enabled) {
  _debug_mode = enabled;
  console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Log debug message if debug mode is enabled
 * @param {string} message Message to log
 * @param {any} data Additional data to log
 */
export function logDebug(message, data = null) {
  if (_debug_mode) {
    if (data !== null) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}
