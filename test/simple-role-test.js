// Simple Role Ratings Functionality Test
// Run this in a browser console with access to the calculator module

// Test the role ratings implementation step by step
async function testRoleRatingsBasic() {
  console.log('🧪 Starting Basic Role Ratings Test...');
  
  try {
    // Test 1: Load role ratings
    console.log('\n1️⃣ Testing loadRoleRatings()...');
    const ratings = await calculator.loadRoleRatings();
    
    if (ratings && Object.keys(ratings).length > 0) {
      console.log('✅ Successfully loaded role ratings');
      console.log('📊 Positions found:', Object.keys(ratings));
      
      // Check if QB position exists after conversion
      if (ratings.QB) {
        console.log('✅ QB position found with roles:', Object.keys(ratings.QB));
      } else {
        console.log('❌ QB position missing after conversion');
        return false;
      }
    } else {
      console.log('❌ Failed to load role ratings');
      return false;
    }
    
    // Test 2: Create test recruit
    console.log('\n2️⃣ Testing calculateRoleRating()...');
    const testRecruit = {
      id: 'test-123',
      pos: 'QB',
      ath: 75,
      spd: 70,
      dur: 80,
      we: 85,
      sta: 75,
      str: 85,
      blk: 30,
      tkl: 35,
      han: 60,
      gi: 90,
      elu: 65,
      tec: 88
    };
    
    const roleRatings = await calculator.calculateRoleRating(testRecruit);
    
    if (roleRatings && typeof roleRatings === 'object') {
      console.log('✅ Successfully calculated role ratings');
      console.log('📊 Ratings:', roleRatings);
      
      // Check if we have numeric ratings
      const hasValidRatings = Object.values(roleRatings).every(rating => 
        typeof rating === 'number' && rating >= 0 && rating <= 100
      );
      
      if (hasValidRatings) {
        console.log('✅ All ratings are valid numbers between 0-100');
      } else {
        console.log('❌ Some ratings are invalid');
        return false;
      }
    } else {
      console.log('❌ Failed to calculate role ratings');
      return false;
    }
    
    // Test 3: Test saving and loading custom ratings
    console.log('\n3️⃣ Testing saveRoleRatings() and getCurrentRoleRatings()...');
    const customRatings = {
      QB: {
        r1: [15, 10, 5, 5, 5, 30, 0, 0, 10, 15, 5, 0]  // Custom weights for role 1
      }
    };
    
    await calculator.saveRoleRatings(customRatings);
    console.log('✅ Saved custom ratings');
    
    const loadedCustom = await calculator.getCurrentRoleRatings();
    if (loadedCustom && loadedCustom.QB && loadedCustom.QB.r1) {
      console.log('✅ Successfully loaded custom ratings');
      console.log('📊 Custom QB r1:', loadedCustom.QB.r1);
    } else {
      console.log('❌ Failed to load custom ratings');
      return false;
    }
    
    // Test 4: Reset to defaults
    console.log('\n4️⃣ Testing resetRoleRatingsToDefaults()...');
    await calculator.resetRoleRatingsToDefaults();
    console.log('✅ Reset to defaults');
    
    const defaultsAgain = await calculator.getCurrentRoleRatings();
    if (defaultsAgain && defaultsAgain.QB) {
      console.log('✅ Successfully loaded defaults after reset');
    } else {
      console.log('❌ Failed to load defaults after reset');
      return false;
    }
    
    console.log('\n🎉 All tests passed! Role ratings implementation is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Export for use in browser
window.testRoleRatingsBasic = testRoleRatingsBasic;

// Instructions for running in browser
console.log('To run this test:');
console.log('1. Load the extension and open a page with the calculator loaded');
console.log('2. Open browser console');
console.log('3. Run: testRoleRatingsBasic()');
