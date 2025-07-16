const Game = require("../models/GameModel");
const User = require("../models/UserModel"); // ✅ Required for toggleGameLike

async function getAllGames(req, res, next) {
  try {
    const games = await Game.find();
    res.json(games);
  } catch (err) {
    next(err);
  }
}

async function createGame(req, res, next) {
  try {
    const newGame = new Game(req.body);
    await newGame.save();
    res.status(201).json(newGame);
  } catch (err) {
    next(err);
  }
}

async function getGameById(req, res, next) {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    res.json(game);
  } catch (err) {
    next(err);
  }
}

async function updateGame(req, res, next) {
  try {
    const updated = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
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
      message: alreadyLiked
        ? "Game removed from favorites"
        : "Game added to favorites"
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
