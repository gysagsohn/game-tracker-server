const Joi = require("joi");

// Signup validation
const signupSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 1 character",
    "string.max": "First name cannot exceed 50 characters"
  }),
  lastName: Joi.string().trim().min(1).max(50).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 1 character",
    "string.max": "Last name cannot exceed 50 characters"
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required"
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "string.empty": "Password is required"
  })
});

// Login validation
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required"
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required"
  })
});

// Forgot password validation
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required"
  })
});

// Reset password validation
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "Reset token is required"
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "string.empty": "Password is required"
  })
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};