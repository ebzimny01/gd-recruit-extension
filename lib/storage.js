// Storage module for GD Recruit Assistant
// Uses IndexedDB for persistent storage

// Import IDB library (needs to be added to the project later)
// This will be loaded as a separate script in the extension

class RecruitStorage {
  constructor() {
    this.DB_NAME = 'gdRecruitDB';
    this.DB_VERSION = 1;
    this.STORE_RECRUITS = 'recruits';
    this.STORE_CONFIG = 'config';

    // Initialize IndexedDB
    this.dbPromise = this.openDatabase();
  }

  // Open or create the database
  openDatabase() {
    return new Promise((resolve, reject) => {
      console.log(`Opening IndexedDB database: ${this.DB_NAME} (version ${this.DB_VERSION})`);
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = event => {
        console.error('Error opening database:', event.target.error);
        console.error('Error details:', {
          name: event.target.error.name,
          message: event.target.error.message,
          code: event.target.error.code
        });
        reject(event.target.error);
      };

      request.onsuccess = event => {
        const db = event.target.result;
        console.log('Database opened successfully');

        // Add error handler for database-level errors
        db.onerror = event => {
          console.error('Database error:', event.target.error);
        };

        // Check that our object stores exist
        const storeNames = Array.from(db.objectStoreNames);
        console.log('Available object stores:', storeNames);

        if (!storeNames.includes(this.STORE_RECRUITS)) {
          console.warn(`Object store ${this.STORE_RECRUITS} not found in database!`);
        }

        if (!storeNames.includes(this.STORE_CONFIG)) {
          console.warn(`Object store ${this.STORE_CONFIG} not found in database!`);
        }

        resolve(db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        console.log('Creating database schema');

        // Create object stores
        if (!db.objectStoreNames.contains(this.STORE_RECRUITS)) {
          const recruitStore = db.createObjectStore(this.STORE_RECRUITS, { keyPath: 'id' });

          // Create indexes for common queries
          recruitStore.createIndex('position', 'pos');
          recruitStore.createIndex('signed', 'signed');
          recruitStore.createIndex('watched', 'watched');
          recruitStore.createIndex('division', 'division');

          console.log(`Created object store: ${this.STORE_RECRUITS}`);
        }

        if (!db.objectStoreNames.contains(this.STORE_CONFIG)) {
          const configStore = db.createObjectStore(this.STORE_CONFIG, { keyPath: 'key' });
          console.log(`Created object store: ${this.STORE_CONFIG}`);
        }
      };
    });
  }
  // Save a recruit to the database
  async saveRecruit(recruit) {
    // Clone and validate the recruit object before saving
    const validRecruit = this.validateRecruit({ ...recruit });

    try {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        // Add timeout to detect stalled transactions
        const timeoutId = setTimeout(() => {
          console.warn(`Save operation for recruit ${validRecruit.id} timed out after 5 seconds`);
        }, 5000);

        try {
          const transaction = db.transaction(this.STORE_RECRUITS, 'readwrite');

          transaction.onabort = event => {
            clearTimeout(timeoutId);
            console.error('Transaction aborted:', event.target.error);
            reject(event.target.error || new Error('Transaction aborted'));
          };

          transaction.onerror = event => {
            clearTimeout(timeoutId);
            console.error('Transaction error:', event.target.error);
            reject(event.target.error);
          };

          transaction.oncomplete = () => {
            clearTimeout(timeoutId);
            console.log(`Recruit ${validRecruit.id} saved successfully`);
            resolve(true);
          };

          const store = transaction.objectStore(this.STORE_RECRUITS);
          console.log(`Saving recruit with ID ${validRecruit.id} to store ${this.STORE_RECRUITS}`);

          const request = store.put(validRecruit);

          request.onsuccess = () => {
            console.log(`Put operation for recruit ${validRecruit.id} succeeded`);
            // Note: We don't resolve here, we let the transaction.oncomplete handle it
          };

          request.onerror = event => {
            clearTimeout(timeoutId);
            console.error(`Error saving recruit ${validRecruit.id}:`, event.target.error);
            console.error('Recruit data causing error:', JSON.stringify(validRecruit));
            reject(event.target.error);
          };
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('Error in transaction setup:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error getting database connection:', error);
      throw error;
    }
  }

  // Validate and fix a recruit object to ensure it can be stored
  validateRecruit(recruit) {
    // Ensure ID is a valid number
    if (typeof recruit.id !== 'number' || isNaN(recruit.id) || recruit.id === 0) {
      console.warn(`Invalid recruit ID: ${recruit.id}, generating fallback ID`);
      // Generate a fallback ID based on timestamp and random number
      recruit.id = Date.now() + Math.floor(Math.random() * 1000);
    }

    // Make sure all required fields exist
    const requiredFields = ['name', 'pos'];
    requiredFields.forEach(field => {
      if (!recruit[field]) {
        console.warn(`Missing required field ${field} for recruit ${recruit.id}, adding placeholder`);
        recruit[field] = field === 'name' ? `Unknown Recruit ${recruit.id}` : 'UNK';
      }
    });

    return recruit;
  }

  // Get a recruit by ID
  async getRecruitById(id) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_RECRUITS, 'readonly');
      const store = transaction.objectStore(this.STORE_RECRUITS);

      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = event => {
        console.error('Error getting recruit:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  // Get all recruits
  async getAllRecruits() {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        // Add timeout to detect stalled transactions
        const timeoutId = setTimeout(() => {
          console.warn('GetAllRecruits operation timed out after 5 seconds');
        }, 5000);

        try {
          const transaction = db.transaction(this.STORE_RECRUITS, 'readonly');

          transaction.onabort = event => {
            clearTimeout(timeoutId);
            console.error('Transaction aborted:', event.target.error);
            reject(event.target.error || new Error('Transaction aborted'));
          };

          transaction.onerror = event => {
            clearTimeout(timeoutId);
            console.error('Transaction error:', event.target.error);
            reject(event.target.error);
          };

          const store = transaction.objectStore(this.STORE_RECRUITS);
          console.log(`Getting all recruits from store ${this.STORE_RECRUITS}`);

          const request = store.getAll();

          request.onsuccess = () => {
            clearTimeout(timeoutId);
            const recruits = request.result || [];
            console.log(`Retrieved ${recruits.length} recruits from database`);

            // Check first few and last few recruits for debugging
            if (recruits.length > 0) {
              const sampleSize = Math.min(3, recruits.length);
              console.log('First few recruits:', recruits.slice(0, sampleSize));

              if (recruits.length > sampleSize) {
                console.log('Last few recruits:', recruits.slice(-sampleSize));
              }
            }

            resolve(recruits);
          };

          request.onerror = event => {
            clearTimeout(timeoutId);
            console.error('Error getting all recruits:', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('Error in transaction setup:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error getting database connection:', error);
      throw error;
    }
  }

  // Get recruits by position
  async getRecruitsByPosition(position) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_RECRUITS, 'readonly');
      const store = transaction.objectStore(this.STORE_RECRUITS);
      const index = store.index('position');

      const request = index.getAll(position);

      request.onsuccess = () => resolve(request.result);
      request.onerror = event => {
        console.error('Error getting recruits by position:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Get recruits by signed status
  async getRecruitsBySigned(isSigned) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_RECRUITS, 'readonly');
      const store = transaction.objectStore(this.STORE_RECRUITS);
      const index = store.index('signed');

      const request = index.getAll(isSigned ? 1 : 0);

      request.onsuccess = () => resolve(request.result);
      request.onerror = event => {
        console.error('Error getting recruits by signed status:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Get recruits by watched status
  async getRecruitsByWatched(isWatched) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_RECRUITS, 'readonly');
      const store = transaction.objectStore(this.STORE_RECRUITS);
      const index = store.index('watched');

      const request = index.getAll(isWatched ? 1 : 0);

      request.onsuccess = () => resolve(request.result);
      request.onerror = event => {
        console.error('Error getting recruits by watched status:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Update recruit considering status
  async updateRecruitConsidering(id, considering, signed) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_RECRUITS, 'readwrite');
      const store = transaction.objectStore(this.STORE_RECRUITS);

      // First get the current recruit
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const recruit = getRequest.result;
        if (recruit) {
          recruit.considering = considering;
          recruit.signed = signed;

          const updateRequest = store.put(recruit);

          updateRequest.onsuccess = () => resolve(true);
          updateRequest.onerror = event => {
            console.error('Error updating recruit:', event.target.error);
            reject(event.target.error);
          };
        } else {
          reject(new Error(`Recruit with ID ${id} not found`));
        }
      };

      getRequest.onerror = event => {
        console.error('Error getting recruit for update:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  // Clear all recruits
  async clearAllRecruits() {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        // Add timeout for detecting stalled operations
        const timeoutId = setTimeout(() => {
          console.warn('Clear operation timed out after 5 seconds');
          // Resolve with warning instead of rejecting to prevent blocking operations
          resolve({ success: false, warning: 'Operation timed out but may still complete' });
        }, 5000);

        try {
          const transaction = db.transaction(this.STORE_RECRUITS, 'readwrite');

          transaction.onabort = event => {
            clearTimeout(timeoutId);
            const error = event.target.error || new Error('Transaction aborted');
            console.error('Transaction aborted:', error);
            reject(error);
          };

          transaction.onerror = event => {
            clearTimeout(timeoutId);
            const error = event.target.error || new Error('Transaction error');
            console.error('Transaction error:', error);
            reject(error);
          };

          transaction.oncomplete = () => {
            clearTimeout(timeoutId);
            console.log('All recruits cleared successfully');
            resolve({ success: true });
          };

          const store = transaction.objectStore(this.STORE_RECRUITS);
          console.log(`Clearing all records from ${this.STORE_RECRUITS} store`);

          const request = store.clear();

          request.onsuccess = () => {
            console.log('Clear operation successful');
            // Note: We don't resolve here, we let the transaction.oncomplete handle it
          };

          request.onerror = event => {
            clearTimeout(timeoutId);
            const error = event.target.error || new Error('Clear operation failed');
            console.error('Error clearing recruits:', error);
            reject(error);
          };
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('Error in transaction setup:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error getting database connection:', error);
      // Convert error to a more descriptive format before throwing
      const formattedError = new Error(`Failed to clear recruits: ${error.message || 'Unknown error'}`);
      formattedError.originalError = error;
      throw formattedError;
    }
  }

  // Save configuration setting
  async saveConfig(key, value) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_CONFIG, 'readwrite');
      const store = transaction.objectStore(this.STORE_CONFIG);

      const request = store.put({ key, value });

      request.onsuccess = () => resolve(true);
      request.onerror = event => {
        console.error('Error saving config:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Get configuration setting
  async getConfig(key) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_CONFIG, 'readonly');
      const store = transaction.objectStore(this.STORE_CONFIG);

      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = event => {
        console.error('Error getting config:', event.target.error);
        reject(event.target.error);
      };
    });
  }
}

// Export a singleton instance
export const recruitStorage = new RecruitStorage();
