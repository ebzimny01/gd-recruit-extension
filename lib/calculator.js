// Calculator module for GD Recruit Assistant
// Provides role rating calculations and configuration management

import { recruitStorage } from './storage.js';

// Module configuration variables (snake_case as per coding standards)
let role_ratings_cache = null;
let current_season = null;

// Default role ratings data - fallback when JSON file is unavailable
// This is a simplification of the Python pandas DataFrame structure
const DEFAULT_ROLE_RATINGS = {
  QB: {
    r1: [10, 15, 10, 15, 10, 5, 0, 0, 15, 5, 5, 10], // Example weights
    r2: [5, 15, 5, 10, 10, 5, 0, 0, 20, 10, 10, 10],
    r3: [5, 10, 5, 10, 5, 10, 0, 0, 20, 15, 10, 10],
    r4: [5, 5, 15, 10, 10, 5, 0, 0, 15, 10, 15, 10],
    r5: [10, 10, 10, 10, 10, 10, 0, 0, 10, 10, 10, 10],
    r6: [15, 5, 15, 5, 10, 5, 5, 5, 10, 5, 10, 10]
  },
  RB: {
    r1: [10, 20, 10, 10, 15, 10, 0, 0, 0, 0, 15, 10],
    r2: [15, 15, 15, 0, 15, 10, 0, 0, 10, 0, 10, 10],
    r3: [10, 10, 15, 0, 15, 15, 5, 0, 10, 0, 10, 10],
    r4: [15, 10, 10, 0, 15, 15, 15, 0, 0, 0, 10, 10],
    r5: [10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 10, 0],
    r6: [10, 5, 15, 0, 10, 20, 10, 0, 0, 0, 15, 15]
  }
};

// The attributes array matching the order of values in the ratings arrays
const ATTRIBUTES = ['ath', 'spd', 'dur', 'we', 'sta', 'str', 'blk', 'tkl', 'han', 'gi', 'elu', 'tec'];

// Position mapping for converting JSON format to calculation format
const POSITION_MAP = {
  'quarterback': 'QB',
  'runningBack': 'RB',
  'wideReceiver': 'WR',
  'tightEnd': 'TE',
  'offensiveLine': 'OL',
  'defensiveLine': 'DL',
  'linebacker': 'LB',
  'defensiveBack': 'DB',
  'kicker': 'K',
  'punter': 'P'
};

// Load role ratings from storage or defaults
async function loadRoleRatings() {
  try {
    // Check if we have custom role ratings in storage
    const customRatings = await recruitStorage.getConfig('customRoleRatings');
    
    if (customRatings) {
      console.log('Using custom role ratings from storage');
      role_ratings_cache = JSON.parse(customRatings);
      return role_ratings_cache;
    }
    
    // Fall back to loading defaults from JSON file
    console.log('Loading default role ratings from JSON file');
    const response = await fetch(chrome.runtime.getURL('data/role_ratings_defaults.json'));
    
    if (!response.ok) {
      throw new Error(`Failed to load role ratings: ${response.status} ${response.statusText}`);
    }
    
    const defaultData = await response.json();
    
    // Convert the new format to the calculation format
    const convertedRatings = convertRoleRatingsFormat(defaultData.roleRatings);
    role_ratings_cache = convertedRatings;
    
    return convertedRatings;
  } catch (error) {
    console.error('Error loading role ratings:', error);
    console.warn('Falling back to hardcoded default role ratings');
    // Fall back to hardcoded defaults
    role_ratings_cache = DEFAULT_ROLE_RATINGS;
    return DEFAULT_ROLE_RATINGS;
  }
}

// Convert new JSON format to calculation format
function convertRoleRatingsFormat(roleRatingsData) {
  if (!roleRatingsData || typeof roleRatingsData !== 'object') {
    throw new Error('Invalid role ratings data format');
  }
  
  const converted = {};
  
  for (const [positionKey, positionData] of Object.entries(roleRatingsData)) {
    const posCode = POSITION_MAP[positionKey];
    if (!posCode) {
      console.warn(`Unknown position key: ${positionKey}`);
      continue;
    }
    
    if (!positionData || typeof positionData !== 'object') {
      console.warn(`Invalid position data for ${positionKey}`);
      continue;
    }
    
    converted[posCode] = {};
    
    // Convert each role
    for (const [roleKey, roleData] of Object.entries(positionData)) {
      if (!roleData || typeof roleData !== 'object') {
        console.warn(`Invalid role data for ${positionKey}.${roleKey}`);
        continue;
      }
      
      // Only process active roles
      if (!roleData.isActive) {
        continue;
      }
      
      // Map role keys (qbr1, rbr1, etc.) to r1, r2, etc.
      const roleNumber = roleKey.slice(-1); // Get last character (1, 2, 3, etc.)
      const convertedRoleKey = `r${roleNumber}`;
      
      // Validate attributes exist
      if (!roleData.attributes || typeof roleData.attributes !== 'object') {
        console.warn(`Missing attributes for ${positionKey}.${roleKey}`);
        continue;
      }
      
      // Convert attributes object to array in ATTRIBUTES order
      converted[posCode][convertedRoleKey] = ATTRIBUTES.map(attr => {
        const value = roleData.attributes[attr];
        return typeof value === 'number' ? value : 0;
      });
    }
  }
  
  return converted;
}

// Calculate role ratings for a recruit with enhanced validation and caching
export async function calculateRoleRating(recruit) {
  // Input validation
  if (!recruit || typeof recruit !== 'object') {
    throw new Error('Invalid recruit object provided');
  }
  
  if (!recruit.pos || typeof recruit.pos !== 'string') {
    throw new Error('Recruit missing valid position');
  }
  
  const pos = recruit.pos.toUpperCase(); // Normalize position to uppercase
    try {
    // Load ratings if not cached or if season changed
    const season = await recruitStorage.getConfig('currentSeason');
    
    if (!role_ratings_cache || current_season !== season) {
      role_ratings_cache = await loadRoleRatings();
      current_season = season;
    }
    
    if (!role_ratings_cache[pos]) {
      console.error(`No rating formulas found for position ${pos}`);
      return {
        r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0
      };
    }
    
    // Validate recruit has all required attributes with proper error handling
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
      
      // Calculate dot product (sum of products) with validation
      let dotProduct = 0;
      const weights = role_ratings_cache[pos][role];
      
      if (!Array.isArray(weights) || weights.length !== ATTRIBUTES.length) {
        console.error(`Invalid weights for ${pos}.${role}`);
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
    // Clear cache to force reload of new ratings
    role_ratings_cache = null;
      // Get all recruits
    const recruits = await recruitStorage.getAllRecruits();
    
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
          const positionKeys = Object.keys(POSITION_MAP);
          const recruitPositionKey = positionKeys.find(key => 
            POSITION_MAP[key] === recruit.pos
          );
          
          if (!changedPositions.includes(recruitPositionKey)) {
            continue;
          }
        }
        
        try {
          // Calculate new role ratings
          const newRatings = await calculateRoleRating(recruit);
          
          // Update recruit with new ratings
          Object.assign(recruit, newRatings);
          
          // Save updated recruit
          await recruitStorage.saveRecruit(recruit);
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
  console.log('Saving custom role ratings');
  
  try {
    // Validate the ratings format
    validateRoleRatings(customRatings);
      // Save to storage
    await recruitStorage.saveConfig('customRoleRatings', JSON.stringify(customRatings));
    
    // Clear cache to force reload
    role_ratings_cache = null;
    
    console.log('Custom role ratings saved successfully');
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

// Get current role ratings (for editing) with fallback handling
export async function getCurrentRoleRatings() {
  try {
    // Try to get custom ratings first
    const customRatings = await recruitStorage.getConfig('customRoleRatings');
    
    if (customRatings) {
      return JSON.parse(customRatings);
    }
    
    // Fall back to defaults
    const response = await fetch(chrome.runtime.getURL('data/role_ratings_defaults.json'));
    
    if (!response.ok) {
      throw new Error(`Failed to load default role ratings: ${response.status}`);
    }
    
    const defaultData = await response.json();
    
    if (!defaultData.roleRatings) {
      throw new Error('Invalid default role ratings format');
    }
    
    return defaultData.roleRatings;
    
  } catch (error) {
    console.error('Error getting current role ratings:', error);
    throw error;
  }
}

// Reset role ratings to defaults with proper cleanup
export async function resetRoleRatingsToDefaults() {
  console.log('Resetting role ratings to defaults');
    try {
    // Remove custom ratings from storage
    await recruitStorage.saveConfig('customRoleRatings', null);
    
    // Clear cache
    role_ratings_cache = null;
    
    console.log('Role ratings reset to defaults successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Error resetting role ratings:', error);
    throw error;
  }
}
