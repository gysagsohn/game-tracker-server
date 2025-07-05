const Game = require("../models/GameModel");

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

module.exports = {
	getAllGames,
	createGame,
	getGameById,
	updateGame,
	deleteGame
};
