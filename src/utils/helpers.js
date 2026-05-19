/**
 * Generates a unique string ID.
 * @returns {string} Unique ID.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Formats a timestamp into a friendly, human-readable date.
 * @param {number|string} timestamp Timestamp to format.
 * @returns {string} Formatted date (e.g., "May 19, 2026 at 8:30 PM").
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  
  // Check for invalid date
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Resolves the full path of folders from root to target folder.
 * @param {string} targetFolderId Target folder ID.
 * @param {Array} folders Array of folder objects.
 * @returns {Array} List of folders from root to target.
 */
export function getFolderBreadcrumbs(targetFolderId, folders) {
  if (!targetFolderId || !folders || folders.length === 0) return [];
  
  const path = [];
  let currentId = targetFolderId;
  let safetyCounter = 0; // Prevent infinite loop in case of circular references

  while (currentId && safetyCounter < 100) {
    safetyCounter++;
    const folder = folders.find(f => f.id === currentId);
    if (!folder) break;
    
    path.unshift(folder);
    currentId = folder.parentId;
  }
  
  return path;
}
