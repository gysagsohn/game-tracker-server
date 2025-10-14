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
 * Useful for bulk operations like player arrays
 */
function sanitizeArray(arr, fieldsPerItem) {
  if (!Array.isArray(arr)) return arr;
  
  return arr.map(item => {
    if (typeof item !== "object" || item === null) return item;
    return sanitizeObject(item, fieldsPerItem);
  });
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeArray
};