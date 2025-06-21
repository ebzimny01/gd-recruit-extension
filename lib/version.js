/**
 * Version utility for reading version from manifest.json
 */

/**
 * Get the extension version from manifest.json
 * @returns {Promise<string>} The version string
 */
export async function getVersion() {
  try {
    const manifestUrl = chrome.runtime.getURL('manifest.json');
    const response = await fetch(manifestUrl);
    const manifest = await response.json();
    return manifest.version || '0.0.0';
  } catch (error) {
    console.error('Error reading version from manifest:', error);
    return '0.0.0';
  }
}

/**
 * Get the full extension name and version
 * @returns {Promise<string>} The full name and version string
 */
export async function getFullVersionString() {
  try {
    const manifestUrl = chrome.runtime.getURL('manifest.json');
    const response = await fetch(manifestUrl);
    const manifest = await response.json();
    const name = manifest.name || 'GD Recruit Assistant';
    const version = manifest.version || '0.0.0';
    return `${name} v${version}`;
  } catch (error) {
    console.error('Error reading manifest:', error);
    return 'GD Recruit Assistant v0.0.0';
  }
}
