/**
 * Validation middleware factory
 * Returns middleware that validates request body against a Joi schema
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove fields not in schema
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        message: "Validation failed",
        errors
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
}

module.exports = validateRequest;