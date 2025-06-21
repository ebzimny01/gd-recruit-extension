/**
 * Bold Attributes Configuration Manager
 * Handles loading, saving, and managing position-based attribute styling
 * 
 * @author GD Recruit Assistant
 * @version 1.0.0
 * @description Provides a centralized configuration system for position-based attribute styling
 */

// Constants for configuration management
const CONFIG_STORAGE_KEY = 'boldAttributesCustomConfig';
const DEFAULT_CONFIG_PATH = 'data/bold_attributes_defaults.json';

// Available attribute names in snake_case format
const available_attributes = [
  'ath', 'spd', 'dur', 'we', 'sta', 'str', 'blk', 'tkl', 'han', 'gi', 'elu', 'tec'
];

/**
 * Bold Attributes Configuration Manager Class
 * Implements singleton pattern for centralized configuration management
 */
class BoldAttributesConfig {
  constructor() {
    this.default_config = null;
    this.user_config = null;
    this.merged_config = null;
    this.is_initialized = false;
  }

  /**
   * Initialize the configuration system
   * Must be called before using other methods
   * 
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async init() {
    try {
      console.log('Initializing Bold Attributes Configuration Manager');
      
      await this.loadDefaultConfig();
      await this.loadUserConfig();
      this.mergeConfigs();
      
      this.is_initialized = true;
      console.log('Bold Attributes Configuration Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Bold Attributes Configuration Manager:', error);
      throw new Error(`Configuration initialization failed: ${error.message}`);
    }
  }

  /**
   * Load default configuration from JSON file
   * Includes fallback mechanism for reliability
   * 
   * @private
   * @returns {Promise<void>}
   */
  async loadDefaultConfig() {
    try {
      const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch default config: ${response.status} ${response.statusText}`);
      }
      
      this.default_config = await response.json();
      
      // Validate the loaded configuration
      this.validateDefaultConfig();
      
      console.log('Default bold attributes configuration loaded successfully');
    } catch (error) {
      console.warn('Error loading default bold attributes config, using fallback:', error);
      this.default_config = this.getFallbackConfig();
    }
  }

  /**
   * Validate the default configuration structure
   * 
   * @private
   * @throws {Error} If configuration is invalid
   */
  validateDefaultConfig() {
    if (!this.default_config) {
      throw new Error('Default configuration is null or undefined');
    }
    
    if (!this.default_config.positions || typeof this.default_config.positions !== 'object') {
      throw new Error('Default configuration missing positions object');
    }
    
    if (!Array.isArray(this.default_config.attributes)) {
      throw new Error('Default configuration missing attributes array');
    }
  }

  /**
   * Load user customizations from storage
   * Handles storage errors gracefully
   * 
   * @private
   * @returns {Promise<void>}
   */
  async loadUserConfig() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getConfig',
        key: CONFIG_STORAGE_KEY
      });
      
      if (response && response.success && response.value) {
        this.user_config = JSON.parse(response.value);
        console.log('User bold attributes customizations loaded successfully');
      } else {
        this.user_config = {};
        console.log('No user customizations found, using empty configuration');
      }
    } catch (error) {
      console.error('Error loading user bold attributes config:', error);
      this.user_config = {};
    }
  }

  /**
   * Save user configuration to storage
   * Includes validation and error handling
   * 
   * @returns {Promise<boolean>} Success status
   */
  async saveUserConfig() {
    try {
      if (!this.is_initialized) {
        throw new Error('Configuration manager not initialized');
      }
      
      const response = await chrome.runtime.sendMessage({
        action: 'saveConfig',
        key: CONFIG_STORAGE_KEY,
        value: JSON.stringify(this.user_config)
      });
      
      if (response && response.success) {
        console.log('User bold attributes configuration saved successfully');
        this.mergeConfigs();
        return true;
      } else {
        throw new Error(response?.error || 'Unknown error saving configuration');
      }
    } catch (error) {
      console.error('Error saving user bold attributes config:', error);
      return false;
    }
  }

  /**
   * Merge default and user configurations
   * Creates the effective configuration used by the application
   * 
   * @private
   */
  mergeConfigs() {
    if (!this.default_config) {
      console.warn('Cannot merge configs: default configuration not loaded');
      this.merged_config = {};
      return;
    }

    this.merged_config = {
      metadata: { ...this.default_config.metadata },
      attributes: [...this.default_config.attributes],
      positions: {}
    };

    // Start with default positions and merge user customizations
    for (const [positionKey, positionData] of Object.entries(this.default_config.positions)) {
      this.merged_config.positions[positionKey] = {
        name: positionData.name,
        boldAttributes: { ...positionData.boldAttributes }
      };

      // Apply user customizations if they exist
      if (this.user_config[positionKey]) {
        Object.assign(
          this.merged_config.positions[positionKey].boldAttributes,
          this.user_config[positionKey]
        );
      }
    }
  }

  /**
   * Get the effective configuration for a position
   * 
   * @param {string} position - Position key (e.g., 'qb', 'rb')
   * @returns {Object|null} Position configuration or null if not found
   */
  getPositionConfig(position) {
    if (!this.is_initialized || !this.merged_config || !position) {
      return null;
    }

    const positionKey = position.toLowerCase().trim();
    return this.merged_config.positions[positionKey] || null;
  }

  /**
   * Check if an attribute should be bold for a given position
   * 
   * @param {string} position - Position key
   * @param {string} attribute - Attribute name
   * @returns {boolean} Whether the attribute should be bold
   */
  shouldBoldAttribute(position, attribute) {
    if (!position || !attribute) {
      return false;
    }
    
    const config = this.getPositionConfig(position);
    if (!config) {
      return false;
    }

    const attributeKey = attribute.toLowerCase().trim();
    return config.boldAttributes[attributeKey] === 1;
  }

  /**
   * Update user configuration for a position
   * 
   * @param {string} position - Position key
   * @param {Object} attributeConfig - Configuration object with attribute boolean values
   */
  updatePositionConfig(position, attributeConfig) {
    if (!position || !attributeConfig || typeof attributeConfig !== 'object') {
      console.warn('Invalid parameters for updatePositionConfig');
      return;
    }
    
    const positionKey = position.toLowerCase().trim();
    
    if (!this.user_config[positionKey]) {
      this.user_config[positionKey] = {};
    }

    // Validate and sanitize attribute config
    const sanitized_config = {};
    for (const [attr, value] of Object.entries(attributeConfig)) {
      const attrKey = attr.toLowerCase().trim();
      if (available_attributes.includes(attrKey)) {
        sanitized_config[attrKey] = value === 1 || value === true ? 1 : 0;
      }
    }

    Object.assign(this.user_config[positionKey], sanitized_config);
    this.mergeConfigs();
  }

  /**
   * Reset position to default configuration
   * 
   * @param {string} position - Position key to reset
   */
  resetPositionToDefault(position) {
    if (!position) {
      console.warn('Invalid position provided for reset');
      return;
    }
    
    const positionKey = position.toLowerCase().trim();
    delete this.user_config[positionKey];
    this.mergeConfigs();
    console.log(`Reset position ${positionKey} to default configuration`);
  }

  /**
   * Reset all positions to default configuration
   */
  resetAllToDefault() {
    this.user_config = {};
    this.mergeConfigs();
    console.log('Reset all positions to default configuration');
  }

  /**
   * Get all available positions with their configurations
   * 
   * @returns {Array} Array of position objects
   */
  getAvailablePositions() {
    if (!this.is_initialized || !this.merged_config) {
      return [];
    }
    
    return Object.entries(this.merged_config.positions).map(([key, data]) => ({
      key,
      name: data.name,
      boldAttributes: { ...data.boldAttributes }
    }));
  }

  /**
   * Get all available attributes
   * 
   * @returns {Array<string>} Array of attribute names
   */
  getAvailableAttributes() {
    if (this.default_config?.attributes) {
      return [...this.default_config.attributes];
    }
    return [...available_attributes];
  }

  /**
   * Get configuration statistics for debugging
   * 
   * @returns {Object} Configuration statistics
   */
  getConfigStats() {
    if (!this.is_initialized) {
      return { initialized: false };
    }
    
    const positions_count = Object.keys(this.merged_config?.positions || {}).length;
    const customized_positions = Object.keys(this.user_config).length;
    
    return {
      initialized: true,
      positions_count,
      customized_positions,
      attributes_count: this.getAvailableAttributes().length,
      has_user_config: customized_positions > 0
    };
  }

  /**
   * Fallback configuration if file loading fails
   * Ensures the extension continues to function
   * 
   * @private
   * @returns {Object} Fallback configuration
   */
  getFallbackConfig() {
    return {
      metadata: {
        description: "Fallback bold attributes configuration",
        version: "1.0.0",
        lastUpdated: new Date().toISOString().split('T')[0]
      },
      attributes: [...available_attributes],
      positions: {
        qb: { 
          name: "Quarterback", 
          boldAttributes: { 
            ath: 0, spd: 0, dur: 0, we: 0, sta: 0, str: 1, blk: 0, tkl: 0, han: 0, gi: 1, elu: 0, tec: 1 
          } 
        },
        rb: { 
          name: "Running Back", 
          boldAttributes: { 
            ath: 0, spd: 1, dur: 0, we: 0, sta: 0, str: 1, blk: 0, tkl: 0, han: 0, gi: 0, elu: 1, tec: 0 
          } 
        },
        wr: { 
          name: "Wide Receiver", 
          boldAttributes: { 
            ath: 0, spd: 1, dur: 0, we: 0, sta: 0, str: 0, blk: 0, tkl: 0, han: 1, gi: 0, elu: 0, tec: 1 
          } 
        },
        te: { 
          name: "Tight End", 
          boldAttributes: { 
            ath: 0, spd: 0, dur: 0, we: 0, sta: 0, str: 1, blk: 1, tkl: 0, han: 1, gi: 0, elu: 0, tec: 0 
          } 
        },
        ol: { 
          name: "Offensive Line", 
          boldAttributes: { 
            ath: 0, spd: 0, dur: 0, we: 0, sta: 0, str: 1, blk: 1, tkl: 0, han: 0, gi: 0, elu: 0, tec: 1 
          } 
        },
        dl: { 
          name: "Defensive Line", 
          boldAttributes: { 
            ath: 0, spd: 0, dur: 0, we: 0, sta: 0, str: 1, blk: 0, tkl: 1, han: 0, gi: 1, elu: 0, tec: 0 
          } 
        },
        lb: { 
          name: "Linebacker", 
          boldAttributes: { 
            ath: 1, spd: 0, dur: 0, we: 0, sta: 0, str: 0, blk: 0, tkl: 1, han: 0, gi: 1, elu: 0, tec: 0 
          } 
        },
        db: { 
          name: "Defensive Back", 
          boldAttributes: { 
            ath: 0, spd: 1, dur: 0, we: 0, sta: 0, str: 0, blk: 0, tkl: 1, han: 0, gi: 1, elu: 0, tec: 0 
          } 
        },
        k: { 
          name: "Kicker", 
          boldAttributes: { 
            ath: 0, spd: 0, dur: 0, we: 0, sta: 0, str: 1, blk: 0, tkl: 0, han: 0, gi: 0, elu: 0, tec: 1 
          } 
        },
        p: { 
          name: "Punter", 
          boldAttributes: { 
            ath: 0, spd: 0, dur: 0, we: 0, sta: 0, str: 1, blk: 0, tkl: 0, han: 0, gi: 0, elu: 0, tec: 1 
          } 
        }
      }
    };
  }
}

// Create singleton instance for use across the extension
const boldAttributesConfig = new BoldAttributesConfig();

// Export for module usage
export default boldAttributesConfig;
