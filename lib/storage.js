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
    
    // Connection state management
    this._db = null;
    this._connectionPromise = null;
    this._isConnecting = false;
    this._connectionAttempts = 0;
    this._maxRetries = 3;
    
    // Initialize connection
    this.dbPromise = this._ensureConnection();
  }
  // Enhanced connection management with retry logic
  async _ensureConnection() {
    // Return existing valid connection
    if (this._db && !this._isConnectionClosed(this._db)) {
      return this._db;
    }

    // Return existing connection attempt
    if (this._connectionPromise && this._isConnecting) {
      return this._connectionPromise;
    }

    this._isConnecting = true;
    this._connectionPromise = this._createConnection();
    
    try {
      this._db = await this._connectionPromise;
      this._connectionAttempts = 0;
      return this._db;
    } catch (error) {
      this._connectionAttempts++;
      console.error(`Database connection attempt ${this._connectionAttempts} failed:`, error);
      
      if (this._connectionAttempts < this._maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, this._connectionAttempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._ensureConnection();
      }
      
      throw new Error(`Failed to connect to database after ${this._maxRetries} attempts: ${error.message}`);
    } finally {
      this._isConnecting = false;
      this._connectionPromise = null;
    }
  }

  // Check if connection is closed
  _isConnectionClosed(db) {
    try {
      // Try to access a property that would throw if connection is closed
      return !db || db.objectStoreNames === undefined;
    } catch (error) {
      return true;
    }
  }

  // Create new database connection
  _createConnection() {
    return new Promise((resolve, reject) => {
      console.log(`Opening IndexedDB database: ${this.DB_NAME} (version ${this.DB_VERSION})`);
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      const timeoutId = setTimeout(() => {
        console.error('Database connection timeout after 10 seconds');
        reject(new Error('Database connection timeout'));
      }, 10000);

      request.onerror = event => {
        clearTimeout(timeoutId);
        const error = event.target.error;
        console.error('Error opening database:', error);
        reject(error);
      };

      request.onblocked = event => {
        console.warn('Database connection blocked. Another connection may be open.');
        // Don't reject immediately, let it resolve naturally
      };

      request.onsuccess = event => {
        clearTimeout(timeoutId);
        const db = event.target.result;
        
        // Add connection event handlers
        db.onclose = event => {
          console.warn('Database connection closed unexpectedly');
          this._db = null;
        };

        db.onerror = event => {
          console.error('Database error:', event.target.error);
        };

        db.onversionchange = event => {
          console.warn('Database version change detected');
          db.close();
          this._db = null;
        };

        console.log('Database connected successfully');
        resolve(db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        console.log('Database upgrade needed');
        
        try {
          // Create object stores
          if (!db.objectStoreNames.contains(this.STORE_RECRUITS)) {
            const recruitStore = db.createObjectStore(this.STORE_RECRUITS, { keyPath: 'id' });
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
        } catch (error) {
          console.error('Error during database upgrade:', error);
          clearTimeout(timeoutId);
          reject(error);
        }
      };
    });
  }
  // Enhanced transaction wrapper with retry logic
  async _executeTransaction(storeNames, mode, operation) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const db = await this._ensureConnection();
        
        return await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Transaction timeout after 5 seconds'));
          }, 5000);

          try {
            const transaction = db.transaction(storeNames, mode);
            
            transaction.onabort = event => {
              clearTimeout(timeoutId);
              reject(new Error(`Transaction aborted: ${event.target.error?.message || 'Unknown error'}`));
            };

            transaction.onerror = event => {
              clearTimeout(timeoutId);
              reject(event.target.error);
            };

            transaction.oncomplete = () => {
              clearTimeout(timeoutId);
              // Don't resolve here, let the operation resolve
            };

            // Execute the operation
            operation(transaction, resolve, reject, timeoutId);
            
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        });
        
      } catch (error) {
        lastError = error;
        console.warn(`Transaction attempt ${attempt + 1} failed:`, error.message);
        
        // If connection-related error, reset connection
        if (error.message.includes('closing') || error.message.includes('closed')) {
          this._db = null;
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    }
    
    throw new Error(`Transaction failed after ${maxRetries + 1} attempts: ${lastError.message}`);
  }
  // Save a recruit to the database
  async saveRecruit(recruit) {
    // Clone and validate the recruit object before saving
    const validRecruit = this.validateRecruit({ ...recruit });

    return this._executeTransaction(
      this.STORE_RECRUITS,
      'readwrite',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_RECRUITS);
        console.log(`Saving recruit with ID ${validRecruit.id} to store ${this.STORE_RECRUITS}`);

        const request = store.put(validRecruit);

        request.onsuccess = () => {
          clearTimeout(timeoutId);
          console.log(`Recruit ${validRecruit.id} saved successfully`);
          resolve(true);
        };

        request.onerror = event => {
          clearTimeout(timeoutId);
          console.error(`Error saving recruit ${validRecruit.id}:`, event.target.error);
          console.error('Recruit data causing error:', JSON.stringify(validRecruit));
          reject(event.target.error);
        };
      }
    );
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
    return this._executeTransaction(
      this.STORE_RECRUITS,
      'readonly',
      (transaction, resolve, reject, timeoutId) => {
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
      }
    );
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
  }  // Clear all recruits with enhanced error handling and connection recovery
  async clearAllRecruits() {
    const maxRetries = 3;
    let currentAttempt = 0;

    while (currentAttempt < maxRetries) {
      try {
        currentAttempt++;
        console.log(`Clear operation attempt ${currentAttempt}/${maxRetries}`);

        // Force a fresh connection to avoid stale connection issues
        if (currentAttempt > 1) {
          console.log('Forcing fresh database connection for clear operation');
          this._db = null;
          this._connectionPromise = null;
        }

        const db = await this._ensureConnection();
        
        // Validate connection before proceeding
        if (this._isConnectionClosed(db)) {
          throw new Error('Database connection is closed');
        }

        return await new Promise((resolve, reject) => {
          // Shorter timeout to detect issues faster
          const timeoutId = setTimeout(() => {
            console.warn(`Clear operation timed out after 3 seconds (attempt ${currentAttempt})`);
            if (currentAttempt < maxRetries) {
              reject(new Error('Operation timeout, will retry'));
            } else {
              resolve({ success: false, warning: 'Operation timed out after multiple attempts' });
            }
          }, 3000);

          try {
            // Double-check connection state before creating transaction
            if (this._isConnectionClosed(db)) {
              clearTimeout(timeoutId);
              reject(new Error('Database connection closed before transaction'));
              return;
            }

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
            console.log(`Clearing all records from ${this.STORE_RECRUITS} store (attempt ${currentAttempt})`);

            const request = store.clear();

            request.onsuccess = () => {
              console.log('Clear request successful');
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
        console.error(`Clear attempt ${currentAttempt} failed:`, error);
        
        // If this was the last attempt, throw the error
        if (currentAttempt >= maxRetries) {
          const formattedError = new Error(`Failed to clear recruits after ${maxRetries} attempts: ${error.message || 'Unknown error'}`);
          formattedError.originalError = error;
          throw formattedError;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, currentAttempt - 1) * 500;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  // Save configuration setting
  async saveConfig(key, value) {
    return this._executeTransaction(
      this.STORE_CONFIG,
      'readwrite',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_CONFIG);
        console.log(`Saving config: ${key} = ${value}`);

        const request = store.put({ key, value });

        request.onsuccess = () => {
          clearTimeout(timeoutId);
          console.log(`Config ${key} saved successfully`);
          resolve(true);
        };

        request.onerror = event => {
          clearTimeout(timeoutId);
          console.error(`Error saving config ${key}:`, event.target.error);
          reject(event.target.error);
        };
      }
    );
  }
  // Get configuration setting
  async getConfig(key) {
    return this._executeTransaction(
      this.STORE_CONFIG,
      'readonly',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_CONFIG);
        console.log(`Getting config: ${key}`);

        const request = store.get(key);

        request.onsuccess = () => {
          clearTimeout(timeoutId);
          const result = request.result ? request.result.value : null;
          console.log(`Config ${key} retrieved:`, result);
          resolve(result);
        };

        request.onerror = event => {
          clearTimeout(timeoutId);
          console.error(`Error getting config ${key}:`, event.target.error);
          reject(event.target.error);
        };
      }
    );
  }

  // Connection health monitoring methods
  async isConnectionHealthy() {
    try {
      if (!this._db || this._isConnectionClosed(this._db)) {
        return false;
      }
      
      // Test connection with a simple transaction
      await this._executeTransaction(
        this.STORE_CONFIG,
        'readonly',
        (transaction, resolve, reject, timeoutId) => {
          const store = transaction.objectStore(this.STORE_CONFIG);
          const request = store.count();
          
          request.onsuccess = () => {
            clearTimeout(timeoutId);
            resolve(true);
          };
          
          request.onerror = event => {
            clearTimeout(timeoutId);
            reject(event.target.error);
          };
        }
      );
      
      return true;
    } catch (error) {
      console.warn('Connection health check failed:', error.message);
      return false;
    }
  }

  // Close database connection
  close() {
    if (this._db && !this._isConnectionClosed(this._db)) {
      console.log('Closing database connection');
      this._db.close();
      this._db = null;
    }
    this._connectionPromise = null;
    this._isConnecting = false;
    this._connectionAttempts = 0;
  }

  // Force database connection renewal - useful for recovery from connection issues
  async forceConnectionRenewal() {
    console.log('Forcing database connection renewal');
    
    // Close existing connection if it exists
    if (this._db && !this._isConnectionClosed(this._db)) {
      this._db.close();
    }
    
    // Reset connection state
    this._db = null;
    this._connectionPromise = null;
    this._isConnecting = false;
    this._connectionAttempts = 0;
    
    // Create new connection
    try {
      this._db = await this._ensureConnection();
      console.log('Database connection renewed successfully');
      return true;
    } catch (error) {
      console.error('Failed to renew database connection:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const recruitStorage = new RecruitStorage();
