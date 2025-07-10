const User = require("../models/UserModel");

// GET /users - fetch all users
async function getAllUsers(req, res, next) {
	try {
		const users = await User.find();
		res.json(users);
	} catch (err) {
		next(err);
	}
}

// POST /users - create new user
async function createUser(req, res, next) {
	try {
		const newUser = new User(req.body);
		await newUser.save();
		res.status(201).json(newUser);
	} catch (err) {
		next(err);
	}
}

// GET /users/:id - get a specific user
async function getUserById(req, res, next) {
	try {
		const user = await User.findById(req.params.id);
		if (!user) return res.status(404).json({ message: "User not found" });
		res.json(user);
	} catch (err) {
		next(err);
	}
}

// PUT /users/:id - update user
async function updateUser(req, res, next) {
	try {
		const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
		res.json(updated);
	} catch (err) {
		next(err);
	}
}

// DELETE /users/:id - delete user
async function deleteUser(req, res, next) {
	try {
		await User.findByIdAndDelete(req.params.id);
		res.status(204).end();
	} catch (err) {
		next(err);
	}
}


module.exports = {
	getAllUsers,
	createUser,
	getUserById,
	updateUser,
	deleteUser
};
