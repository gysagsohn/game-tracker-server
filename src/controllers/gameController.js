const Game = require("../models/GameModel");
const User = require("../models/UserModel");
const { sanitizeObject } = require("../utils/sanitize");

// GET /games
// Returns all games in the library (public — no auth required on this route)
async function getAllGames(req, res, next) {
  try {
    const games = await Game.find();
    res.json({ message: "All games fetched", data: games });
  } catch (err) {
    next(err);
  }
}

// POST /games
// Creates a new custom game. Only authenticated users can add games.
// Fields are whitelisted and sanitized before saving.
async function createGame(req, res, next) {
  try {
    const allowedFields = ["name", "description", "category", "customCategory", "maxPlayers", "minPlayers"];
    const sanitized = sanitizeObject(req.body, allowedFields);

    const newGame = new Game({
      ...sanitized,
      createdBy: req.user._id, // track who created it for ownership checks
      isCustom: true
    });

    await newGame.save();
    res.status(201).json({ message: "Game created", data: newGame });
  } catch (err) {
    next(err);
  }
}

// GET /games/:id
// Returns a single game by its MongoDB id
async function getGameById(req, res, next) {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    res.json({ message: "Game fetched", data: game });
  } catch (err) {
    next(err);
  }
}

// PUT /games/:id
// Updates a game. Only whitelisted fields are accepted to prevent
// unexpected overwrites (e.g. flipping isCustom or createdBy).
async function updateGame(req, res, next) {
  try {
    const allowedFields = ["name", "description", "category", "customCategory", "maxPlayers", "minPlayers"];
    const updates = sanitizeObject(req.body, allowedFields);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updated = await Game.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Game not found" });
    }

    res.json({ message: "Game updated", data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /games/:id
// Only the game's creator or an admin can delete it.
// This prevents regular users from deleting seeded system games (Uno, Catan, etc.)
async function deleteGame(req, res, next) {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: "Game not found." });

    const userId = req.user._id.toString();
    const isCreator = game.createdBy && game.createdBy.toString() === userId;
    const isAdmin = req.user.role === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "You can only delete games you created." });
    }

    await Game.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// POST /games/:id/like
// Toggles a game in/out of the current user's favourites list.
// Uses string comparison because Mongoose ObjectIds aren't reference-equal.
async function toggleGameLike(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    const gameId = req.params.id;
    if (!user) return res.status(404).json({ message: "User not found." });

    const alreadyLiked = user.favorites?.some(id => id.toString() === gameId);
    user.favorites = alreadyLiked
      ? user.favorites.filter(id => id.toString() !== gameId)
      : [...(user.favorites || []), gameId];

    await user.save();
    res.json({
      message: alreadyLiked ? "Game removed from favorites" : "Game added to favorites",
      data: user.favorites
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllGames,
  createGame,
  getGameById,
  updateGame,
  deleteGame,
  toggleGameLike
};