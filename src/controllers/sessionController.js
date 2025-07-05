const Session = require("../models/SessionModel");

async function getAllSessions(req, res, next) {
	try {
		const sessions = await Session.find().populate("game playedBy scores.player");
		res.json(sessions);
	} catch (err) {
		next(err);
	}
}

async function createSession(req, res, next) {
	try {
		const newSession = new Session(req.body);
		await newSession.save();
		res.status(201).json(newSession);
	} catch (err) {
		next(err);
	}
}

async function getSessionById(req, res, next) {
	try {
		const session = await Session.findById(req.params.id).populate("game playedBy scores.player");
		if (!session) return res.status(404).json({ message: "Session not found" });
		res.json(session);
	} catch (err) {
		next(err);
	}
}

async function updateSession(req, res, next) {
	try {
		const updated = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
		res.json(updated);
	} catch (err) {
		next(err);
	}
}

async function deleteSession(req, res, next) {
	try {
		await Session.findByIdAndDelete(req.params.id);
		res.status(204).end();
	} catch (err) {
		next(err);
	}
}

module.exports = {
	getAllSessions,
	createSession,
	getSessionById,
	updateSession,
	deleteSession
};
