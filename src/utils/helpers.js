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

/**
 * Optimizes an image file by resizing it if it exceeds maximum dimensions and compressing it.
 * Animated GIFs are left uncompressed to preserve their animations.
 * If compression yields a larger size (common for tiny images), or if anything fails,
 * the original unoptimized image's base64 data URL is returned.
 * 
 * @param {File} file The original file object.
 * @param {object} options Options for optimization.
 * @param {number} options.maxWidth Max width of the image.
 * @param {number} options.maxHeight Max height of the image.
 * @param {number} options.quality Compression quality (0.0 to 1.0).
 * @returns {Promise<string>} Resolves to a base64 data URL.
 */
export function optimizeImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    // Skip canvas optimization for GIFs to preserve animations
    if (file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Check if resizing is necessary
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original image data URL if context cannot be created
          resolve(e.target.result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress PNGs/WebPs as webp to preserve transparency while gaining high compression.
        // Fallback to jpeg for others.
        let mimeType = 'image/jpeg';
        if (file.type === 'image/png' || file.type === 'image/webp') {
          mimeType = 'image/webp';
        }

        try {
          const dataUrl = canvas.toDataURL(mimeType, quality);
          
          // Verify that the optimized base64 data is actually smaller than the original.
          // Base64 encoding size is roughly 4/3 of the binary size.
          const approxOptimizedSize = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
          
          console.log(
            `[Image Optimizer] Original size: ${(file.size / 1024).toFixed(2)} KB, ` +
            `Optimized size: ${(approxOptimizedSize / 1024).toFixed(2)} KB (Mime: ${mimeType}, Quality: ${quality})`
          );

          if (approxOptimizedSize > file.size) {
            console.log('[Image Optimizer] Optimized image is larger than original. Using original.');
            resolve(e.target.result);
          } else {
            resolve(dataUrl);
          }
        } catch (err) {
          console.warn('[Image Optimizer] Canvas export failed, using original file.', err);
          resolve(e.target.result);
        }
      };

      img.onerror = (err) => {
        console.warn('[Image Optimizer] Failed to load image on canvas. Using original file.');
        resolve(e.target.result);
      };

      img.src = e.target.result;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

