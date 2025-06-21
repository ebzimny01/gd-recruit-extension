// Multi-team storage module for GD Recruit Assistant
// Extends the existing storage system to support multiple teams

import { recruitStorage } from './storage.js';

class MultiTeamRecruitStorage {
  constructor() {
    // Master database for team registry and global configurations
    this.MASTER_DB_NAME = 'gdRecruitDB_master';
    this.MASTER_DB_VERSION = 1;
    this.STORE_TEAMS = 'teams';
    this.STORE_GLOBAL_CONFIG = 'globalConfig';
    
    // Current team context
    this.currentTeamId = null;
    this.currentTeamStorage = null;
    this.teamStorageInstances = new Map();
    
    // Master database connection
    this._masterDb = null;
    this._masterConnectionPromise = null;
    this._isConnectingMaster = false;
    
    // Initialization state
    this._isInitialized = false;
    
    console.log('MultiTeamRecruitStorage constructor completed');
  }
  
  // Initialize the multi-team storage system
  async init() {
    if (this._isInitialized) {
      console.log('MultiTeamRecruitStorage already initialized');
      return true;
    }
    
    try {
      console.log('Initializing MultiTeamRecruitStorage...');
      
      // Initialize master database connection
      await this._ensureMasterConnection();
      
      this._isInitialized = true;
      console.log('MultiTeamRecruitStorage initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize MultiTeamRecruitStorage:', error);
      throw error;
    }
  }
  
  // Master database connection management
  async _ensureMasterConnection() {
    if (this._masterDb && !this._isConnectionClosed(this._masterDb)) {
      return this._masterDb;
    }
    
    if (this._masterConnectionPromise && this._isConnectingMaster) {
      return this._masterConnectionPromise;
    }
    
    this._isConnectingMaster = true;
    this._masterConnectionPromise = this._createMasterConnection();
    
    try {
      this._masterDb = await this._masterConnectionPromise;
      return this._masterDb;
    } catch (error) {
      console.error('Failed to connect to master database:', error);
      throw error;
    } finally {
      this._isConnectingMaster = false;
      this._masterConnectionPromise = null;
    }
  }
  
  _createMasterConnection() {
    return new Promise((resolve, reject) => {
      console.log(`Opening master database: ${this.MASTER_DB_NAME}`);
      const request = indexedDB.open(this.MASTER_DB_NAME, this.MASTER_DB_VERSION);
      
      const timeoutId = setTimeout(() => {
        console.error('Master database connection timeout');
        reject(new Error('Master database connection timeout'));
      }, 10000);
      
      request.onerror = event => {
        clearTimeout(timeoutId);
        reject(event.target.error);
      };
      
      request.onsuccess = event => {
        clearTimeout(timeoutId);
        const db = event.target.result;
        
        db.onclose = event => {
          console.warn('Master database connection closed unexpectedly');
          this._masterDb = null;
        };
        
        db.onerror = event => {
          console.error('Master database error:', event.target.error);
        };
        
        console.log('Master database connected successfully');
        resolve(db);
      };
      
      request.onupgradeneeded = event => {
        const db = event.target.result;
        console.log('Master database upgrade needed');
        
        try {
          // Create teams store
          if (!db.objectStoreNames.contains(this.STORE_TEAMS)) {
            const teamsStore = db.createObjectStore(this.STORE_TEAMS, { keyPath: 'teamId' });
            teamsStore.createIndex('lastAccessed', 'lastAccessed');
            teamsStore.createIndex('schoolName', 'schoolName');
            console.log(`Created teams store: ${this.STORE_TEAMS}`);
          }
          
          // Create global config store
          if (!db.objectStoreNames.contains(this.STORE_GLOBAL_CONFIG)) {
            const globalConfigStore = db.createObjectStore(this.STORE_GLOBAL_CONFIG, { keyPath: 'key' });
            console.log(`Created global config store: ${this.STORE_GLOBAL_CONFIG}`);
          }
        } catch (error) {
          console.error('Error during master database upgrade:', error);
          clearTimeout(timeoutId);
          reject(error);
        }
      };
    });
  }
  
  _isConnectionClosed(db) {
    try {
      return !db || db.objectStoreNames === undefined;
    } catch (error) {
      return true;
    }
  }
  
  // Team management methods
  async setActiveTeam(teamId, teamInfo = null) {
    if (!teamId) {
      console.warn('No team ID provided to setActiveTeam');
      return false;
    }
    
    if (this.currentTeamId === teamId) {
      console.log(`Team ${teamId} is already active`);
      return true;
    }
    
    console.log(`Switching from team ${this.currentTeamId} to team ${teamId}`);
    
    try {
      // Close current team storage if exists
      if (this.currentTeamStorage) {
        this.currentTeamStorage.close();
      }
      
      // Register team if not exists
      await this._ensureTeamRegistered(teamId, teamInfo);
      
      // Create or get team-specific storage instance
      const teamStorage = await this._getTeamStorage(teamId);
      
      // Update current context
      this.currentTeamId = teamId;
      this.currentTeamStorage = teamStorage;
      
      // Update team last accessed time
      await this._updateTeamLastAccessed(teamId);
      
      console.log(`Successfully switched to team ${teamId}`);
      return true;
      
    } catch (error) {
      console.error(`Error switching to team ${teamId}:`, error);
      throw error;
    }
  }
  
  async _ensureTeamRegistered(teamId, teamInfo) {
    const masterDb = await this._ensureMasterConnection();
    
    return new Promise(async (resolve, reject) => {
      const transaction = masterDb.transaction(this.STORE_TEAMS, 'readwrite');
      const store = transaction.objectStore(this.STORE_TEAMS);
      
      // Check if team already exists
      const getRequest = store.get(teamId);
      
      getRequest.onsuccess = async () => {
        const existingTeam = getRequest.result;
        
        if (existingTeam) {
          // Update existing team info if provided
          if (teamInfo) {
            const updatedTeam = {
              ...existingTeam,
              ...teamInfo,
              teamId: teamId, // Ensure teamId is preserved
              lastAccessed: new Date().toISOString()
            };
            
            const updateRequest = store.put(updatedTeam);
            updateRequest.onsuccess = async () => {
              console.log(`Updated existing team ${teamId} registration`);
              
              // Check if we should auto-enable multi-team mode
              await this._checkAndEnableMultiTeamMode();
              
              resolve(updatedTeam);
            };
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            console.log(`Team ${teamId} already registered`);
            
            // Check if we should auto-enable multi-team mode
            await this._checkAndEnableMultiTeamMode();
            
            resolve(existingTeam);
          }
        } else {
          // Register new team
          const newTeam = {
            teamId: teamId,
            schoolName: teamInfo?.schoolName || teamInfo?.schoolLong || 'Unknown School',
            division: teamInfo?.division || null,
            world: teamInfo?.world || null,
            schoolLong: teamInfo?.schoolLong || null,
            schoolShort: teamInfo?.schoolShort || null,
            conference: teamInfo?.conference || null,
            firstSeen: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            seasonNumber: null,
            lastUpdated: null,
            recruitCount: 0,
            watchlistCount: 0
          };
          
          const addRequest = store.add(newTeam);
          addRequest.onsuccess = async () => {
            console.log(`Registered new team ${teamId}: ${newTeam.schoolName}`);
            
            // Check if we should auto-enable multi-team mode (especially important for new teams)
            await this._checkAndEnableMultiTeamMode();
            
            resolve(newTeam);
          };
          addRequest.onerror = () => reject(addRequest.error);
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
  
  async _getTeamStorage(teamId) {
    // Check if we already have a storage instance for this team
    if (this.teamStorageInstances.has(teamId)) {
      return this.teamStorageInstances.get(teamId);
    }
    
    // Create new team-specific storage instance
    const teamDbName = `gdRecruitDB_${teamId}`;
    const teamStorage = new TeamSpecificStorage(teamDbName, teamId);
    
    // Initialize the team-specific database
    await teamStorage.initialize();
    
    // Cache the instance
    this.teamStorageInstances.set(teamId, teamStorage);
    
    return teamStorage;
  }
  
  async _updateTeamLastAccessed(teamId) {
    try {
      const masterDb = await this._ensureMasterConnection();
      
      return new Promise((resolve, reject) => {
        const transaction = masterDb.transaction(this.STORE_TEAMS, 'readwrite');
        const store = transaction.objectStore(this.STORE_TEAMS);
        
        const getRequest = store.get(teamId);
        getRequest.onsuccess = () => {
          const team = getRequest.result;
          if (team) {
            team.lastAccessed = new Date().toISOString();
            const updateRequest = store.put(team);
            updateRequest.onsuccess = () => resolve(true);
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            resolve(false);
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.warn(`Could not update last accessed time for team ${teamId}:`, error);
    }
  }
  
  // Team information methods
  async getAllTeams() {
    const masterDb = await this._ensureMasterConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = masterDb.transaction(this.STORE_TEAMS, 'readonly');
      const store = transaction.objectStore(this.STORE_TEAMS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const teams = request.result || [];
        console.log(`Retrieved ${teams.length} teams from registry`);
        resolve(teams);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async getTeamInfo(teamId) {
    const masterDb = await this._ensureMasterConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = masterDb.transaction(this.STORE_TEAMS, 'readonly');
      const store = transaction.objectStore(this.STORE_TEAMS);
      const request = store.get(teamId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  async updateTeamMetadata(teamId, metadata) {
    const masterDb = await this._ensureMasterConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = masterDb.transaction(this.STORE_TEAMS, 'readwrite');
      const store = transaction.objectStore(this.STORE_TEAMS);
      
      const getRequest = store.get(teamId);
      getRequest.onsuccess = () => {
        const team = getRequest.result;
        if (team) {
          Object.assign(team, metadata);
          const updateRequest = store.put(team);
          updateRequest.onsuccess = () => resolve(true);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error(`Team ${teamId} not found`));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
  
  // Global configuration methods (shared across all teams)
  async saveGlobalConfig(key, value) {
    const masterDb = await this._ensureMasterConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = masterDb.transaction(this.STORE_GLOBAL_CONFIG, 'readwrite');
      const store = transaction.objectStore(this.STORE_GLOBAL_CONFIG);
      
      const request = store.put({ key, value });
      request.onsuccess = () => {
        console.log(`Global config saved: ${key}`);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async getGlobalConfig(key) {
    const masterDb = await this._ensureMasterConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = masterDb.transaction(this.STORE_GLOBAL_CONFIG, 'readonly');
      const store = transaction.objectStore(this.STORE_GLOBAL_CONFIG);
      
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result ? request.result.value : null;
        console.log(`Global config retrieved: ${key} = ${result}`);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  // Current team data access methods (delegate to current team storage)
  async saveRecruit(recruit) {
    if (!this.currentTeamStorage) {
      console.warn('No active team selected for saveRecruit, attempting to initialize');
      // Try to initialize with current team if available
      if (this.currentTeamId) {
        await this.setActiveTeam(this.currentTeamId);
      } else {
        throw new Error('No active team selected and no team ID available');
      }
    }
    
    console.log(`Saving recruit ${recruit.id} to team ${this.currentTeamId} database`);
    const result = await this.currentTeamStorage.saveRecruit(recruit);
    
    // Don't update team counts after each individual recruit save for performance
    // Counts will be updated after bulk operations via updateTeamCountsIfNeeded()
    
    return result;
  }
  
  async getAllRecruits() {
    if (!this.currentTeamStorage) {
      console.warn('No active team selected for getAllRecruits, attempting to initialize');
      // Try to initialize with current team if available
      if (this.currentTeamId) {
        await this.setActiveTeam(this.currentTeamId);
      } else {
        console.warn('No active team available, returning empty array');
        return [];
      }
    }
    
    console.log(`Getting all recruits from team ${this.currentTeamId} database`);
    return await this.currentTeamStorage.getAllRecruits();
  }
  
  async getRecruitById(id) {
    if (!this.currentTeamStorage) {
      console.warn('No active team selected for getRecruitById, attempting to initialize');
      if (this.currentTeamId) {
        await this.setActiveTeam(this.currentTeamId);
      } else {
        throw new Error('No active team selected and no team ID available');
      }
    }
    
    console.log(`Getting recruit ${id} from team ${this.currentTeamId} database`);
    return await this.currentTeamStorage.getRecruitById(id);
  }
  
  async clearAllRecruits() {
    if (!this.currentTeamStorage) {
      console.warn('No active team selected for clearAllRecruits, attempting to initialize');
      if (this.currentTeamId) {
        await this.setActiveTeam(this.currentTeamId);
      } else {
        throw new Error('No active team selected and no team ID available');
      }
    }
    
    console.log(`Clearing all recruits from team ${this.currentTeamId} database`);
    const result = await this.currentTeamStorage.clearAllRecruits();
    
    // Update team recruit count
    await this._updateTeamCounts();
    
    return result;
  }
  
  async _updateTeamCounts() {
    if (!this.currentTeamId || !this.currentTeamStorage) {
      return;
    }
    
    try {
      const recruits = await this.currentTeamStorage.getAllRecruits();
      const recruitCount = recruits.length;
      const watchlistCount = recruits.filter(r => r.watched === 1).length;
      
      await this.updateTeamMetadata(this.currentTeamId, {
        recruitCount,
        watchlistCount,
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`Updated team ${this.currentTeamId} counts: ${recruitCount} recruits, ${watchlistCount} watched`);
    } catch (error) {
      console.warn('Could not update team counts:', error);
    }
  }
  
  // Public method to update team counts after bulk operations (performance optimized)
  async updateTeamCountsIfNeeded() {
    if (!this.currentTeamId || !this.currentTeamStorage) {
      console.warn('No active team to update counts for');
      return;
    }
    
    console.log(`Updating team ${this.currentTeamId} counts after bulk operation...`);
    await this._updateTeamCounts();
  }
  
  // Team-specific configuration (uses current team storage)
  async saveConfig(key, value) {
    if (!this.currentTeamStorage) {
      throw new Error('No active team selected');
    }
    
    // For team metadata keys, use the team metadata store
    const teamMetadataKeys = ['currentSeason', 'lastUpdated', 'seasonRecruitingUrl', 'teamId', 'teamInfo', 'watchListCount'];
    
    if (teamMetadataKeys.includes(key)) {
      console.log(`Saving team metadata: ${key} = ${value}`);
      return await this.currentTeamStorage.saveTeamMetadata(key, value);
    } else {
      // Use regular config store for other keys
      return await this.currentTeamStorage.saveConfig(key, value);
    }
  }
  
  async getConfig(key) {
    if (!this.currentTeamStorage) {
      console.warn('No active team selected for config, returning null');
      return null;
    }
    
    // For team metadata keys, use the team metadata store
    const teamMetadataKeys = ['currentSeason', 'lastUpdated', 'seasonRecruitingUrl', 'teamId', 'teamInfo', 'watchListCount'];
    
    if (teamMetadataKeys.includes(key)) {
      console.log(`Getting team metadata: ${key}`);
      return await this.currentTeamStorage.getTeamMetadata(key);
    } else {
      // Use regular config store for other keys
      return await this.currentTeamStorage.getConfig(key);
    }
  }

  // Get team-specific statistics
  async getTeamStats(teamId) {
    if (!teamId) {
      teamId = this.currentTeamId;
    }
    
    if (!teamId) {
      throw new Error('No team ID provided and no active team selected');
    }
    
    // Get or create team storage instance
    let teamStorage = this.teamStorageInstances.get(teamId);
    if (!teamStorage) {
      console.log(`Creating new storage instance for team ${teamId} to get stats`);
      teamStorage = await this._getTeamStorage(teamId);
    }
    
    try {
      // Get team metadata
      const lastUpdated = await teamStorage.getTeamMetadata('lastUpdated');
      const currentSeason = await teamStorage.getTeamMetadata('currentSeason');
      const teamInfo = await teamStorage.getTeamMetadata('teamInfo');
      
      // Parse team info if it's a string
      let parsedTeamInfo = null;
      let schoolName = 'Unknown School';
      
      if (teamInfo) {
        try {
          parsedTeamInfo = typeof teamInfo === 'string' ? JSON.parse(teamInfo) : teamInfo;
          schoolName = parsedTeamInfo?.schoolLong || parsedTeamInfo?.schoolShort || 'Unknown School';
        } catch (error) {
          console.warn('Error parsing team info:', error);
        }
      }
      
      // Get recruits for this team
      const recruits = await teamStorage.getAllRecruits();
      const recruitCount = recruits.length;
      
      // Calculate watchlist count
      const watchlistCount = recruits.filter(recruit => recruit.watched === 1).length;
      
      // Update stored watchlist count
      await teamStorage.saveTeamMetadata('watchListCount', watchlistCount);
      
      return {
        lastUpdated,
        watchlistCount,
        recruitCount,
        currentSeason: currentSeason || null,
        schoolName,
        teamInfo: parsedTeamInfo
      };
      
    } catch (error) {
      console.error(`Error getting stats for team ${teamId}:`, error);
      throw error;
    }
  }
  
  // Multi-team mode check methods - ALWAYS ENABLED
  async isMultiTeamMode() {
    // Multi-team mode is always enabled now
    console.log('Multi-team mode is always enabled');
    return true;
  }
  
  async setMultiTeamMode(enabled) {
    // Multi-team mode is always enabled, but maintain compatibility
    console.log('Multi-team mode is always enabled (cannot be disabled)');
    return true;
  }
  
  // Auto-enable multi-team mode if multiple teams are registered
  async _checkAndEnableMultiTeamMode() {
    try {
      console.log('Checking if multi-team mode should be auto-enabled...');
      
      // Check if already enabled
      const isCurrentlyEnabled = await this.isMultiTeamMode();
      if (isCurrentlyEnabled) {
        console.log('Multi-team mode already enabled');
        return true;
      }
      
      // Get all registered teams
      const allTeams = await this.getAllTeams();
      console.log(`Found ${allTeams.length} registered teams`);
      
      // Enable multi-team mode if we have multiple teams
      if (allTeams.length > 1) {
        console.log(`🎯 AUTO-ENABLING multi-team mode: ${allTeams.length} teams detected`);
        console.log('Teams:', allTeams.map(t => `${t.teamId} (${t.schoolName})`).join(', '));
        
        const success = await this.setMultiTeamMode(true);
        if (success) {
          console.log('✅ Multi-team mode auto-enabled successfully');
          return true;
        } else {
          console.error('❌ Failed to auto-enable multi-team mode');
          return false;
        }
      } else {
        console.log('Only one team registered, keeping multi-team mode disabled');
        return false;
      }
    } catch (error) {
      console.error('Error checking/enabling multi-team mode:', error);
      return false;
    }
  }
  
  // Current team methods
  async getCurrentTeam() {
    if (this.currentTeamId) {
      return await this.getTeamInfo(this.currentTeamId);
    }
    return null;
  }
  
  async setCurrentTeam(teamId) {
    return await this.setActiveTeam(teamId);
  }
  
  // Team recruit methods for API compatibility
  async getTeamRecruits(teamId) {
    if (teamId === this.currentTeamId && this.currentTeamStorage) {
      return await this.currentTeamStorage.getAllRecruits();
    }
    
    // Switch to requested team temporarily
    const previousTeamId = this.currentTeamId;
    await this.setActiveTeam(teamId);
    
    const recruits = await this.currentTeamStorage.getAllRecruits();
    
    // Switch back to previous team if needed
    if (previousTeamId && previousTeamId !== teamId) {
      await this.setActiveTeam(previousTeamId);
    }
    
    return recruits;
  }
  
  // Utility methods
  getCurrentTeamId() {
    return this.currentTeamId;
  }
  
  getCurrentTeamStorage() {
    return this.currentTeamStorage;
  }
  
  async isConnectionHealthy() {
    if (!this.currentTeamStorage) {
      return false;
    }
    
    return await this.currentTeamStorage.isConnectionHealthy();
  }
  
  // Cleanup methods
  close() {
    // Close master database
    if (this._masterDb && !this._isConnectionClosed(this._masterDb)) {
      this._masterDb.close();
      this._masterDb = null;
    }
    
    // Close all team storage instances
    for (const [teamId, storage] of this.teamStorageInstances) {
      storage.close();
    }
    this.teamStorageInstances.clear();
    
    // Reset current context
    this.currentTeamId = null;
    this.currentTeamStorage = null;
    
    console.log('MultiTeamRecruitStorage closed');
  }
}

// Team-specific storage class that uses RecruitStorage functionality
class TeamSpecificStorage {
  constructor(dbName, teamId) {
    this.DB_NAME = dbName;
    this.DB_VERSION = 1;
    this.STORE_RECRUITS = 'recruits';
    this.STORE_CONFIG = 'config';
    this.STORE_TEAM_METADATA = 'teamMetadata';
    this.teamId = teamId;
    
    // Connection state management
    this._db = null;
    this._connectionPromise = null;
    this._isConnecting = false;
    this._connectionAttempts = 0;
    this._maxRetries = 3;
    
    console.log(`Created team-specific storage for team ${teamId}: ${dbName}`);
  }
  
  async initialize() {
    // Force connection to ensure database is created
    await this._ensureConnection();
    console.log(`Team-specific storage initialized for team ${this.teamId}`);
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
  
  // Override the connection creation to include team metadata store
  _createConnection() {
    return new Promise((resolve, reject) => {
      console.log(`Opening team database: ${this.DB_NAME} for team ${this.teamId}`);
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      const timeoutId = setTimeout(() => {
        console.error('Team database connection timeout');
        reject(new Error('Team database connection timeout'));
      }, 10000);
      
      request.onerror = event => {
        clearTimeout(timeoutId);
        reject(event.target.error);
      };
      
      request.onsuccess = event => {
        clearTimeout(timeoutId);
        const db = event.target.result;
        
        db.onclose = event => {
          console.warn(`Team database connection closed unexpectedly for team ${this.teamId}`);
          this._db = null;
        };
        
        db.onerror = event => {
          console.error(`Team database error for team ${this.teamId}:`, event.target.error);
        };
        
        console.log(`Team database connected successfully for team ${this.teamId}`);
        resolve(db);
      };
      
      request.onupgradeneeded = event => {
        const db = event.target.result;
        console.log(`Team database upgrade needed for team ${this.teamId}`);
        
        try {
          // Create standard stores (recruits, config)
          if (!db.objectStoreNames.contains(this.STORE_RECRUITS)) {
            const recruitStore = db.createObjectStore(this.STORE_RECRUITS, { keyPath: 'id' });
            recruitStore.createIndex('position', 'pos');
            recruitStore.createIndex('signed', 'signed');
            recruitStore.createIndex('watched', 'watched');
            recruitStore.createIndex('division', 'division');
            console.log(`Created recruits store for team ${this.teamId}`);
          }
          
          if (!db.objectStoreNames.contains(this.STORE_CONFIG)) {
            const configStore = db.createObjectStore(this.STORE_CONFIG, { keyPath: 'key' });
            console.log(`Created config store for team ${this.teamId}`);
          }
          
          // Create team metadata store
          if (!db.objectStoreNames.contains(this.STORE_TEAM_METADATA)) {
            const metadataStore = db.createObjectStore(this.STORE_TEAM_METADATA, { keyPath: 'key' });
            console.log(`Created team metadata store for team ${this.teamId}`);
          }
        } catch (error) {
          console.error(`Error during team database upgrade for team ${this.teamId}:`, error);
          clearTimeout(timeoutId);
          reject(error);
        }
      };
    });
  }
  
  // Team metadata methods
  async saveTeamMetadata(key, value) {
    return this._executeTransaction(
      this.STORE_TEAM_METADATA,
      'readwrite',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_TEAM_METADATA);
        const request = store.put({ key, value });
        
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
  }
  
  async getTeamMetadata(key) {
    return this._executeTransaction(
      this.STORE_TEAM_METADATA,
      'readonly',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_TEAM_METADATA);
        const request = store.get(key);
        
        request.onsuccess = () => {
          clearTimeout(timeoutId);
          const result = request.result ? request.result.value : null;
          resolve(result);
        };
        
        request.onerror = event => {
          clearTimeout(timeoutId);
          reject(event.target.error);
        };
      }
    );
  }
  
  // Core recruit storage methods
  async saveRecruit(recruit) {
    // Clone and validate the recruit object before saving
    const validRecruit = this.validateRecruit({ ...recruit });

    return this._executeTransaction(
      this.STORE_RECRUITS,
      'readwrite',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_RECRUITS);
        console.log(`Saving recruit with ID ${validRecruit.id} to team ${this.teamId}`);

        const request = store.put(validRecruit);

        request.onsuccess = () => {
          clearTimeout(timeoutId);
          console.log(`Recruit ${validRecruit.id} saved successfully for team ${this.teamId}`);
          resolve(true);
        };

        request.onerror = event => {
          clearTimeout(timeoutId);
          console.error(`Error saving recruit ${validRecruit.id} for team ${this.teamId}:`, event.target.error);
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

  // Get all recruits
  async getAllRecruits() {
    return this._executeTransaction(
      this.STORE_RECRUITS,
      'readonly',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_RECRUITS);
        console.log(`Getting all recruits for team ${this.teamId}`);

        const request = store.getAll();

        request.onsuccess = () => {
          clearTimeout(timeoutId);
          const recruits = request.result || [];
          console.log(`Retrieved ${recruits.length} recruits for team ${this.teamId}`);
          resolve(recruits);
        };

        request.onerror = event => {
          clearTimeout(timeoutId);
          console.error(`Error getting all recruits for team ${this.teamId}:`, event.target.error);
          reject(event.target.error);
        };
      }
    );
  }

  // Get a recruit by ID
  async getRecruitById(id) {
    return this._executeTransaction(
      this.STORE_RECRUITS,
      'readonly',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_RECRUITS);
        const request = store.get(id);

        request.onsuccess = () => {
          clearTimeout(timeoutId);
          resolve(request.result);
        };

        request.onerror = event => {
          clearTimeout(timeoutId);
          console.error(`Error getting recruit ${id} for team ${this.teamId}:`, event.target.error);
          reject(event.target.error);
        };
      }
    );
  }

  // Clear all recruits
  async clearAllRecruits() {
    const maxRetries = 3;
    let currentAttempt = 0;

    while (currentAttempt < maxRetries) {
      try {
        currentAttempt++;
        console.log(`Clear operation attempt ${currentAttempt}/${maxRetries} for team ${this.teamId}`);

        // Force a fresh connection to avoid stale connection issues
        if (currentAttempt > 1) {
          console.log(`Forcing fresh database connection for clear operation (team ${this.teamId})`);
          this._db = null;
          this._connectionPromise = null;
        }

        const db = await this._ensureConnection();
        
        // Validate connection before proceeding
        if (this._isConnectionClosed(db)) {
          throw new Error('Database connection is closed');
        }

        return await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            console.warn(`Clear operation timed out for team ${this.teamId} (attempt ${currentAttempt})`);
            if (currentAttempt < maxRetries) {
              reject(new Error('Operation timeout, will retry'));
            } else {
              resolve({ success: false, warning: 'Operation timed out after multiple attempts' });
            }
          }, 3000);

          try {
            const transaction = db.transaction(this.STORE_RECRUITS, 'readwrite');

            transaction.onabort = event => {
              clearTimeout(timeoutId);
              const error = event.target.error || new Error('Transaction aborted');
              reject(error);
            };

            transaction.onerror = event => {
              clearTimeout(timeoutId);
              const error = event.target.error || new Error('Transaction error');
              reject(error);
            };

            transaction.oncomplete = () => {
              clearTimeout(timeoutId);
              console.log(`All recruits cleared successfully for team ${this.teamId}`);
              resolve({ success: true });
            };

            const store = transaction.objectStore(this.STORE_RECRUITS);
            const request = store.clear();

            request.onsuccess = () => {
              console.log(`Clear request successful for team ${this.teamId}`);
            };

            request.onerror = event => {
              clearTimeout(timeoutId);
              const error = event.target.error || new Error('Clear operation failed');
              reject(error);
            };
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        });

      } catch (error) {
        console.error(`Clear attempt ${currentAttempt} failed for team ${this.teamId}:`, error);
        
        if (currentAttempt >= maxRetries) {
          const formattedError = new Error(`Failed to clear recruits for team ${this.teamId} after ${maxRetries} attempts: ${error.message || 'Unknown error'}`);
          formattedError.originalError = error;
          throw formattedError;
        }
        
        // Wait before retrying
        const delay = Math.pow(2, currentAttempt - 1) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Configuration methods
  async saveConfig(key, value) {
    return this._executeTransaction(
      this.STORE_CONFIG,
      'readwrite',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_CONFIG);
        console.log(`Saving config for team ${this.teamId}: ${key} = ${value}`);

        const request = store.put({ key, value });

        request.onsuccess = () => {
          clearTimeout(timeoutId);
          console.log(`Config ${key} saved successfully for team ${this.teamId}`);
          resolve(true);
        };

        request.onerror = event => {
          clearTimeout(timeoutId);
          console.error(`Error saving config ${key} for team ${this.teamId}:`, event.target.error);
          reject(event.target.error);
        };
      }
    );
  }

  async getConfig(key) {
    return this._executeTransaction(
      this.STORE_CONFIG,
      'readonly',
      (transaction, resolve, reject, timeoutId) => {
        const store = transaction.objectStore(this.STORE_CONFIG);
        console.log(`Getting config for team ${this.teamId}: ${key}`);

        const request = store.get(key);

        request.onsuccess = () => {
          clearTimeout(timeoutId);
          const result = request.result ? request.result.value : null;
          console.log(`Config ${key} retrieved for team ${this.teamId}:`, result);
          resolve(result);
        };

        request.onerror = event => {
          clearTimeout(timeoutId);
          console.error(`Error getting config ${key} for team ${this.teamId}:`, event.target.error);
          reject(event.target.error);
        };
      }
    );
  }

  // Connection health check
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
      console.warn(`Connection health check failed for team ${this.teamId}:`, error.message);
      return false;
    }
  }

  // Close database connection
  close() {
    if (this._db && !this._isConnectionClosed(this._db)) {
      console.log(`Closing database connection for team ${this.teamId}`);
      this._db.close();
      this._db = null;
    }
    this._connectionPromise = null;
    this._isConnecting = false;
    this._connectionAttempts = 0;
  }
}

// Export singleton instance
export const multiTeamStorage = new MultiTeamRecruitStorage();
