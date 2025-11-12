const Joi = require("joi");

// Create game validation
const createGameSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Game name is required",
    "string.max": "Game name cannot exceed 100 characters"
  }),
  description: Joi.string().allow("").max(500).optional(),
  category: Joi.string().valid("Card", "Board", "Dice", "Word", "Strategy", "Trivia", "Party", "Other").required().messages({
    "any.only": "Category must be one of: Card, Board, Dice, Word, Strategy, Trivia, Party, Other"
  }),
  customCategory: Joi.string().allow("").max(50).optional(),
  minPlayers: Joi.number().integer().min(1).max(100).required().messages({
    "number.base": "Minimum players must be a number",
    "number.min": "Minimum players must be at least 1"
  }),
  maxPlayers: Joi.number().integer().min(1).max(100).required().messages({
    "number.base": "Maximum players must be a number",
    "number.min": "Maximum players must be at least 1"
  }),
  isCustom: Joi.boolean().optional().default(true)
}).custom((value, helpers) => {
  if (value.minPlayers > value.maxPlayers) {
    return helpers.error('any.invalid', { message: 'Minimum players cannot be greater than maximum players' });
  }
  return value;
});

// Update game validation
const updateGameSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().allow("").max(500).optional(),
  category: Joi.string().valid("Card", "Board", "Dice", "Word", "Strategy", "Trivia", "Party", "Other").optional(),
  customCategory: Joi.string().allow("").max(50).optional(),
  minPlayers: Joi.number().integer().min(1).max(100).optional(),
  maxPlayers: Joi.number().integer().min(1).max(100).optional()
}).min(1).messages({
  "object.min": "At least one field must be provided for update"
}).custom((value, helpers) => {
  if (value.minPlayers && value.maxPlayers && value.minPlayers > value.maxPlayers) {
    return helpers.error('any.invalid', { message: 'Minimum players cannot be greater than maximum players' });
  }
  return value;
});

module.exports = {
  createGameSchema,
  updateGameSchema
};