// Calculator module for GD Recruit Assistant
// Provides role rating calculations and configuration management

import { multiTeamStorage } from './multi-team-storage.js';

// Module configuration variables (snake_case as per coding standards)
let role_ratings_cache = null;
let role_ratings_cache_source = null; // Track the source of cached data
let default_ratings_initialized = false;

// The attributes array matching the order of values in the ratings arrays
const ATTRIBUTES = ['ath', 'spd', 'dur', 'we', 'sta', 'str', 'blk', 'tkl', 'han', 'gi', 'elu', 'tec'];

// Position mapping for converting JSON format to calculation format
const POSITION_MAP = {
  'QB': 'quarterback',
  'RB': 'runningBack',
  'WR': 'wideReceiver',
  'TE': 'tightEnd',
  'OL': 'offensiveLine',
  'DL': 'defensiveLine',
  'LB': 'linebacker',
  'DB': 'defensiveBack',
  'K': 'kicker',
  'P': 'punter'
};

// Convert role ratings from JSON format to calculation format
function convertRoleRatingsFormat(jsonRatings) {
  const convertedRatings = {};
  
  // Convert each position
  for (const [position, roles] of Object.entries(jsonRatings)) {
    // Find the short position code (e.g., QB for quarterback)
    const shortPosition = Object.keys(POSITION_MAP).find(key => POSITION_MAP[key] === position);
    
    if (!shortPosition) {
      console.warn(`Unknown position in JSON: ${position}`);
      continue;
    }
    
    convertedRatings[shortPosition] = {};
    
    // Convert each role (e.g., qbr1 -> r1, rbr2 -> r2, etc.)
    for (const [roleKey, roleData] of Object.entries(roles)) {
      if (roleData && roleData.attributes && roleData.isActive) {
        // Extract role number from keys like 'qbr1', 'rbr2', etc.
        const roleMatch = roleKey.match(/r(\d+)$/);
        if (!roleMatch) {
          console.warn(`Invalid role key format: ${roleKey}`);
          continue;
        }
        
        const roleNumber = roleMatch[1];
        const standardRoleKey = `r${roleNumber}`;
        
        // Convert attributes object to array in correct order
        const attributeArray = ATTRIBUTES.map(attr => {
          const value = Number(roleData.attributes[attr] || 0);
          return isNaN(value) ? 0 : value;
        });
        
        convertedRatings[shortPosition][standardRoleKey] = attributeArray;
      } else {
        // Inactive role or missing data - extract role number and use zero array
        const roleMatch = roleKey.match(/r(\d+)$/);
        if (roleMatch) {
          const roleNumber = roleMatch[1];
          const standardRoleKey = `r${roleNumber}`;
          convertedRatings[shortPosition][standardRoleKey] = new Array(ATTRIBUTES.length).fill(0);
        }
      }
    }
  }
  
  return convertedRatings;
}

// Initialize default role ratings in storage if they don't exist
export async function initializeDefaultRatings() {
  if (default_ratings_initialized) return;
  
  try {
    // Initialize multi-team storage
    await multiTeamStorage.init();
    
    // Check if defaults are already stored in global config
    const storedDefaults = await multiTeamStorage.getGlobalConfig('defaultRoleRatings');
    
    if (!storedDefaults) {
      console.log('Initializing default role ratings in global storage');
      
      // Load defaults from JSON file
      const response = await fetch(chrome.runtime.getURL('data/role_ratings_defaults.json'));
      
      if (!response.ok) {
        throw new Error(`Failed to load default role ratings: ${response.status} ${response.statusText}`);
      }
      
      const defaultData = await response.json();
      
      if (!defaultData.roleRatings) {
        throw new Error('Invalid default role ratings format in JSON file');
      }
      
      // Store defaults in global database for future use
      await multiTeamStorage.saveGlobalConfig('defaultRoleRatings', JSON.stringify(defaultData.roleRatings));
      console.log('Default role ratings successfully stored in global database');
    }
    
    default_ratings_initialized = true;
    
  } catch (error) {
    console.error('Error initializing default role ratings:', error);
    throw new Error(`Failed to initialize default role ratings: ${error.message}`);
  }
}

// Load role ratings from storage with proper fallback hierarchy
async function loadRoleRatings() {
  try {
    console.log('Loading role ratings with cache status:', !!role_ratings_cache);
    
    // Ensure defaults are initialized first
    await initializeDefaultRatings();
    
    // Priority 1: Check for custom role ratings in global storage
    const customRatings = await multiTeamStorage.getGlobalConfig('customRoleRatings');
    
    if (customRatings) {
      console.log('Using custom role ratings from global storage');
      
      // Validate that we're not using stale cached data
      if (role_ratings_cache_source !== 'custom' || !role_ratings_cache) {
        const parsedCustomRatings = JSON.parse(customRatings);
        
        // Enhanced validation before conversion
        if (!parsedCustomRatings || typeof parsedCustomRatings !== 'object') {
          throw new Error('Invalid custom role ratings format');
        }
        
        // Convert the JSON format to calculation format with validation
        const convertedRatings = convertRoleRatingsFormat(parsedCustomRatings);
        
        // Validate conversion was successful
        if (!convertedRatings || Object.keys(convertedRatings).length === 0) {
          throw new Error('Failed to convert custom role ratings to calculation format');
        }
        
        console.log('Custom role ratings successfully converted and cached');
        role_ratings_cache = convertedRatings;
        role_ratings_cache_source = 'custom';
      }
      
      return role_ratings_cache;
    }
    
    // Priority 2: Use stored default ratings from global storage
    const storedDefaults = await multiTeamStorage.getGlobalConfig('defaultRoleRatings');
    
    if (storedDefaults) {
      console.log('Using stored default role ratings from global storage');
      
      // Only reload if not already cached as defaults
      if (role_ratings_cache_source !== 'default' || !role_ratings_cache) {
        const parsedDefaults = JSON.parse(storedDefaults);
        
        // Convert the JSON format to calculation format
        const convertedRatings = convertRoleRatingsFormat(parsedDefaults);
        role_ratings_cache = convertedRatings;
        role_ratings_cache_source = 'default';
      }
      
      return role_ratings_cache;
    }
    
    // Priority 3: Emergency fallback - load fresh from JSON
    console.warn('No stored ratings found, loading fresh defaults from JSON');
    const response = await fetch(chrome.runtime.getURL('data/role_ratings_defaults.json'));
    
    if (!response.ok) {
      throw new Error(`Failed to load role ratings: ${response.status} ${response.statusText}`);
    }
    
    const defaultData = await response.json();
    const convertedRatings = convertRoleRatingsFormat(defaultData.roleRatings);
    role_ratings_cache = convertedRatings;
    role_ratings_cache_source = 'json';
    
    // Store these as defaults for next time in global storage
    await multiTeamStorage.saveGlobalConfig('defaultRoleRatings', JSON.stringify(defaultData.roleRatings));
    
    return convertedRatings;
    
  } catch (error) {
    console.error('Error loading role ratings:', error);
    
    // Final fallback: return minimal default structure to prevent crashes
    console.error('All fallbacks failed, using minimal emergency defaults');
    const emergencyDefaults = createEmergencyDefaults();
    role_ratings_cache = emergencyDefaults;
    role_ratings_cache_source = 'emergency';
    return emergencyDefaults;
  }
}

// Create emergency default ratings structure to prevent total failure
function createEmergencyDefaults() {
  const emergencyDefaults = {};
  
  // Create minimal defaults for each position
  Object.values(POSITION_MAP).forEach(position => {
    emergencyDefaults[position] = {};
    
    // Create 6 roles with zero weights (safe fallback)
    for (let i = 1; i <= 6; i++) {
      emergencyDefaults[position][`r${i}`] = new Array(ATTRIBUTES.length).fill(0);
    }
  });
  
  console.warn('Emergency defaults created - all ratings will be 0 until proper configuration is restored');
  return emergencyDefaults;
}

// Calculate role ratings for a recruit with enhanced validation and simplified caching
export async function calculateRoleRating(recruit) {
  // Input validation
  if (!recruit || typeof recruit !== 'object') {
    throw new Error('Invalid recruit object provided');
  }
  
  if (!recruit.pos || typeof recruit.pos !== 'string') {
    throw new Error('Recruit missing valid position');
  }
  
  const pos = recruit.pos.toUpperCase();
  
  try {
    // Force fresh load of ratings if cache is invalid or missing
    if (!role_ratings_cache || !role_ratings_cache_source) {
      console.log('Cache invalid or missing, loading fresh role ratings');
      role_ratings_cache = await loadRoleRatings();
    }
    
    // Verify we have ratings for this position
    if (!role_ratings_cache[pos]) {
      console.error(`No rating formulas found for position ${pos}`);
      return {
        r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0
      };
    }
    
    console.log(`Calculating ratings for ${pos} using ${role_ratings_cache_source} ratings`);
    
    // Validate recruit has all required attributes
    const missingAttributes = ATTRIBUTES.filter(attr => 
      recruit[attr] === undefined || recruit[attr] === null || isNaN(Number(recruit[attr]))
    );
    
    if (missingAttributes.length > 0) {
      console.warn(`Recruit ${recruit.id || 'unknown'} missing/invalid attributes:`, missingAttributes);
      // Fill missing attributes with 0
      missingAttributes.forEach(attr => recruit[attr] = 0);
    }
    
    // Create array of recruit attributes in the same order as ATTRIBUTES
    const recruitValues = ATTRIBUTES.map(attr => {
      const value = Number(recruit[attr]);
      return isNaN(value) ? 0 : value;
    });
    
    // Calculate dot product and divide by 100 for each role
    const result = {};
    
    for (let role of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']) {
      if (!role_ratings_cache[pos][role]) {
        result[role] = 0;
        continue;
      }
      
      // Calculate dot product with enhanced validation
      let dotProduct = 0;
      const weights = role_ratings_cache[pos][role];
      
      if (!Array.isArray(weights) || weights.length !== ATTRIBUTES.length) {
        console.error(`Invalid weights for ${pos}.${role}:`, weights);
        result[role] = 0;
        continue;
      }
      
      for (let i = 0; i < ATTRIBUTES.length; i++) {
        const weight = Number(weights[i]);
        const recruitValue = recruitValues[i];
        
        if (!isNaN(weight) && !isNaN(recruitValue)) {
          dotProduct += weight * recruitValue;
        }
      }
      
      // Divide by 100 and round to 1 decimal place
      result[role] = Math.round((dotProduct / 100) * 10) / 10;
    }
    
    return result;
    
  } catch (error) {
    console.error('Error calculating role rating for recruit:', error);
    // Return zero ratings on error to maintain data consistency
    return {
      r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0
    };
  }
}

// Recalculate role ratings for specific recruits based on changed positions
export async function recalculateRoleRatings(changedPositions = null) {
  console.log('Recalculating role ratings for recruits', 
    changedPositions ? `(positions: ${changedPositions.join(', ')})` : '(all positions)');
  try {
    // Clear cache to force reload of new ratings - simplified
    role_ratings_cache = null;
    
    // Initialize multi-team storage and get all recruits from current team
    await multiTeamStorage.init();
    const recruits = await multiTeamStorage.getAllRecruits();
    
    if (!Array.isArray(recruits) || recruits.length === 0) {
      console.log('No recruits found to recalculate');
      return { updatedCount: 0, totalRecruits: 0 };
    }
    
    let updatedCount = 0;
    const batchSize = 50; // Process in batches to avoid blocking
    const errors = [];
    
    for (let i = 0; i < recruits.length; i += batchSize) {
      const batch = recruits.slice(i, i + batchSize);
        for (const recruit of batch) {
        // Skip if we're only updating specific positions and this isn't one of them
        if (changedPositions && changedPositions.length > 0) {
          // Get recruit position (normalized to uppercase)
          const recruitPos = (recruit.pos || '').toUpperCase();
          
          // Only process recruits whose positions were changed
          if (!changedPositions.includes(recruitPos)) {
            continue;
          }
        }
        
        try {
          // Calculate new role ratings
          const newRatings = await calculateRoleRating(recruit);
          
          // Update recruit with new ratings
          Object.assign(recruit, newRatings);
          
          // Save updated recruit using multi-team storage
          await multiTeamStorage.saveRecruit(recruit);
          updatedCount++;
          
        } catch (error) {
          console.error(`Error recalculating ratings for recruit ${recruit.id}:`, error);
          errors.push({ recruitId: recruit.id, error: error.message });
        }
      }
      
      // Log progress every batch
      if (i % (batchSize * 4) === 0) { // Log every 4th batch (200 recruits)
        console.log(`Processed ${Math.min(i + batchSize, recruits.length)} of ${recruits.length} recruits`);
      }
    }
    
    if (errors.length > 0) {
      console.warn(`Encountered ${errors.length} errors during recalculation:`, errors);
    }
    
    console.log(`Successfully recalculated role ratings for ${updatedCount} recruits`);
    return { updatedCount, totalRecruits: recruits.length, errors };
    
  } catch (error) {
    console.error('Error during role ratings recalculation:', error);
    throw error;
  }
}

// Save custom role ratings with validation
export async function saveRoleRatings(customRatings) {
  console.log('Saving custom role ratings to global storage');
  
  try {
    // Initialize multi-team storage
    await multiTeamStorage.init();
    
    // Validate the ratings format
    validateRoleRatings(customRatings);
    
    // Deep clone to ensure we're not saving references
    const ratingsToSave = JSON.parse(JSON.stringify(customRatings));
    
    // Save to global storage (shared across all teams)
    await multiTeamStorage.saveGlobalConfig('customRoleRatings', JSON.stringify(ratingsToSave));
    
    // Force cache invalidation to ensure fresh load on next calculation
    role_ratings_cache = null;
    role_ratings_cache_source = null;
    
    console.log('Custom role ratings saved successfully to global storage and cache invalidated');
    return { success: true };
    
  } catch (error) {
    console.error('Error saving role ratings:', error);
    throw error;
  }
}

// Validate role ratings format with comprehensive checks
function validateRoleRatings(ratings) {
  if (!ratings || typeof ratings !== 'object') {
    throw new Error('Invalid role ratings format: must be an object');
  }
  
  const validationErrors = [];
  
  // Validate each position
  for (const [position, roles] of Object.entries(ratings)) {
    if (!roles || typeof roles !== 'object') {
      validationErrors.push(`Invalid roles data for position ${position}`);
      continue;
    }
    
    // Validate each role
    for (const [roleKey, roleData] of Object.entries(roles)) {
      if (!roleData || typeof roleData !== 'object') {
        validationErrors.push(`Invalid role data for ${position}.${roleKey}`);
        continue;
      }
      
      if (!roleData.attributes || typeof roleData.attributes !== 'object') {
        validationErrors.push(`Invalid attributes for ${position}.${roleKey}`);
        continue;
      }
      
      // Validate that attributes sum to 100 (if role is active)
      if (roleData.isActive) {
        const attributeValues = Object.values(roleData.attributes);
        const total = attributeValues.reduce((sum, val) => {
          const numVal = Number(val);
          return sum + (isNaN(numVal) ? 0 : numVal);
        }, 0);
        
        if (Math.abs(total - 100) > 0.1) { // Allow small floating point differences
          validationErrors.push(`Attribute total for ${position}.${roleKey} is ${total}, should be 100`);
        }
        
        // Validate individual attribute values
        for (const [attr, value] of Object.entries(roleData.attributes)) {
          const numVal = Number(value);
          if (isNaN(numVal) || numVal < 0 || numVal > 100) {
            validationErrors.push(`Invalid attribute value for ${position}.${roleKey}.${attr}: ${value}`);
          }
        }
      }
    }
  }
  
  if (validationErrors.length > 0) {
    throw new Error(`Validation errors: ${validationErrors.join('; ')}`);
  }
}

// Get current role ratings (for editing) with proper fallback
export async function getCurrentRoleRatings() {
  try {
    // Ensure defaults are initialized
    await initializeDefaultRatings();
    
    // Priority 1: Custom ratings from global storage
    const customRatings = await multiTeamStorage.getGlobalConfig('customRoleRatings');
    
    if (customRatings) {
      return JSON.parse(customRatings);
    }
    
    // Priority 2: Stored defaults from global storage
    const storedDefaults = await multiTeamStorage.getGlobalConfig('defaultRoleRatings');
    
    if (storedDefaults) {
      return JSON.parse(storedDefaults);
    }
    
    // Priority 3: Fresh load from JSON (should rarely happen)
    const response = await fetch(chrome.runtime.getURL('data/role_ratings_defaults.json'));
    
    if (!response.ok) {
      throw new Error(`Failed to load default role ratings: ${response.status}`);
    }
    
    const defaultData = await response.json();
    
    if (!defaultData.roleRatings) {
      throw new Error('Invalid default role ratings format');
    }
    
    // Store for future use in global storage
    await multiTeamStorage.saveGlobalConfig('defaultRoleRatings', JSON.stringify(defaultData.roleRatings));
    
    return defaultData.roleRatings;
    
  } catch (error) {
    console.error('Error getting current role ratings:', error);
    throw error;
  }
}

// Reset role ratings to defaults with proper cleanup
export async function resetRoleRatingsToDefaults() {
  console.log('Resetting role ratings to defaults in global storage');
  
  try {
    // Initialize multi-team storage
    await multiTeamStorage.init();
    
    // Remove custom ratings from global storage
    await multiTeamStorage.saveGlobalConfig('customRoleRatings', null);
    
    // Force complete cache invalidation
    role_ratings_cache = null;
    role_ratings_cache_source = null;
    
    console.log('Role ratings reset to defaults successfully in global storage and cache cleared');
    return { success: true };
    
  } catch (error) {
    console.error('Error resetting role ratings:', error);
    throw error;
  }
}

// Debug function to verify role ratings source
export async function debugRoleRatingsSource() {
  // Initialize multi-team storage
  await multiTeamStorage.init();
  
  const customRatings = await multiTeamStorage.getGlobalConfig('customRoleRatings');
  const defaultRatings = await multiTeamStorage.getGlobalConfig('defaultRoleRatings');
  
  return {
    hasCustomRatings: !!customRatings,
    hasDefaultRatings: !!defaultRatings,
    cacheSource: role_ratings_cache_source,
    cacheExists: !!role_ratings_cache,
    customRatingsSize: customRatings ? customRatings.length : 0,
    defaultRatingsSize: defaultRatings ? defaultRatings.length : 0
  };
}
