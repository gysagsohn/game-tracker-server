const Joi = require("joi");

// Create session validation
const createSessionSchema = Joi.object({
  game: Joi.string().required().messages({
    "string.empty": "Game is required"
  }),
  players: Joi.array().min(1).items(
    Joi.object({
      user: Joi.string().allow(null).optional(),
      name: Joi.string().trim().required().messages({
        "string.empty": "Player name is required"
      }),
      email: Joi.string().email().allow("").optional(),
      score: Joi.number().optional(),
      result: Joi.string().valid("Win", "Loss", "Draw").optional(),
      invited: Joi.boolean().optional(),
      confirmed: Joi.boolean().optional()
    })
  ).required().messages({
    "array.min": "At least one player is required",
    "array.base": "Players must be an array"
  }),
  notes: Joi.string().allow("").optional(),
  date: Joi.date().optional()
});

// Update session validation
const updateSessionSchema = Joi.object({
  game: Joi.string().optional(),
  players: Joi.array().min(1).items(
    Joi.object({
      user: Joi.string().allow(null).optional(),
      name: Joi.string().trim().required(),
      email: Joi.string().email().allow("").optional(),
      score: Joi.number().optional(),
      result: Joi.string().valid("Win", "Loss", "Draw").optional(),
      invited: Joi.boolean().optional(),
      confirmed: Joi.boolean().optional()
    })
  ).optional(),
  notes: Joi.string().allow("").optional(),
  date: Joi.date().optional()
}).min(1).messages({
  "object.min": "At least one field must be provided for update"
});

module.exports = {
  createSessionSchema,
  updateSessionSchema
};