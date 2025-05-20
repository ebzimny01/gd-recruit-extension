// Calculator module for GD Recruit Assistant
// Ports the Python calculation functions to JavaScript

// Default role ratings data - this would normally be loaded from configuration
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
  },
  // Add similar structures for other positions: WR, TE, OL, DL, LB, DB, K, P
};

// The attributes array matching the order of values in the ratings arrays
const ATTRIBUTES = ['ath', 'spd', 'dur', 'we', 'sta', 'str', 'blk', 'tkl', 'han', 'gi', 'elu', 'tec'];

// Load role ratings - in the future this would load from storage
async function loadRoleRatings() {
  // This would load custom role ratings from storage
  // For now, just return the defaults
  return DEFAULT_ROLE_RATINGS;
}

// Calculate role ratings for a recruit
// This ports the Python calculate_role_rating function
export async function calculateRoleRating(recruit) {
  // Get position
  const pos = recruit.pos;
  
  // Load ratings (would normally get this from storage/configuration)
  const ratingFormulas = await loadRoleRatings();
  
  if (!ratingFormulas[pos]) {
    console.error(`No rating formulas found for position ${pos}`);
    return {
      r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0
    };
  }
  
  // Create array of recruit attributes in the same order as ATTRIBUTES
  const recruitValues = ATTRIBUTES.map(attr => recruit[attr]);
  
  // Calculate dot product and divide by 100 for each role
  const result = {};
  
  for (let role of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']) {
    // Calculate dot product (sum of products)
    let dotProduct = 0;
    for (let i = 0; i < ATTRIBUTES.length; i++) {
      dotProduct += ratingFormulas[pos][role][i] * recruitValues[i];
    }
    
    // Divide by 100 and round to 1 decimal place
    result[role] = Math.round((dotProduct / 100) * 10) / 10;
  }
  
  return result;
}

// Function to save custom role ratings
export async function saveRoleRatings(roleRatings) {
  // This would save to storage for persistence
  console.log('Saving role ratings:', roleRatings);
  // Implement storage logic later
}

// Export calculator functions
export const calculator = {
  calculateRoleRating,
  saveRoleRatings,
  loadRoleRatings
};
