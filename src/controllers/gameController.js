const Game = require("../models/GameModel");
const User = require("../models/UserModel");
const { sanitizeObject } = require("../utils/sanitize");

async function getAllGames(req, res, next) {
  try {
    const games = await Game.find();
    res.json({ message: "All games fetched", data: games });
  } catch (err) {
    next(err);
  }
}

async function createGame(req, res, next) {
  try {
    const allowedFields = ["name", "description", "category", "customCategory", "maxPlayers", "minPlayers"];
    const sanitized = sanitizeObject(req.body, allowedFields);
    
    const newGame = new Game({
      ...sanitized,
      createdBy: req.user._id,
      isCustom: true
    });
    
    await newGame.save();
    res.status(201).json({ message: "Game created", data: newGame });
  } catch (err) {
    next(err);
  }
}

async function getGameById(req, res, next) {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    res.json({ message: "Game fetched", data: game });
  } catch (err) {
    next(err);
  }
}

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

async function deleteGame(req, res, next) {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

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
