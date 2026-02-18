/**
 * Sanitize a string to prevent XSS attacks
 * Replaces HTML special characters with their entity equivalents
 */
function sanitizeString(str) {
  if (typeof str !== "string") return str;
  
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

/**
 * Sanitize multiple fields in an object
 * Only sanitizes string fields, leaves others untouched
 * 
 * @param {Object} obj - The object to sanitize
 * @param {Array<string>} fields - Field names to sanitize
 * @returns {Object} New object with sanitized fields
 */
function sanitizeObject(obj, fields) {
  const sanitized = {};
  
  fields.forEach(field => {
    if (obj[field] !== undefined) {
      sanitized[field] = typeof obj[field] === "string" 
        ? sanitizeString(obj[field])
        : obj[field];
    }
  });
  
  return sanitized;
}

/**
 * Sanitize an array of objects
 * Preserves all fields, but sanitizes specified string fields
 * 
 * @param {Array} arr - Array of objects to sanitize
 * @param {Array<string>} fieldsToSanitize - Field names to sanitize (strings only)
 * @returns {Array} New array with sanitized fields
 */
function sanitizeArray(arr, fieldsToSanitize = []) {
  if (!Array.isArray(arr)) return arr;
  
  return arr.map(item => {
    if (typeof item !== "object" || item === null) return item;
    
    
    const result = { ...item };
    
    
    fieldsToSanitize.forEach(field => {
      if (result[field] !== undefined && typeof result[field] === "string") {
        result[field] = sanitizeString(result[field]);
      }
    });
    
    return result;
  });
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeArray
};