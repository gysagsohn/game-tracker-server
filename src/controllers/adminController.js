const User = require("../models/UserModel");
const Game = require("../models/GameModel");
const Session = require("../models/SessionModel");

// 1. View all users + their match history
async function getAllUsersWithMatches(req, res, next) {
  try {
    const users = await User.find().select("-password"); // exclude sensitive info
    const sessions = await Session.find().populate("game playedBy scores.player");
    res.json({ users, sessions });
  } catch (err) {
    next(err);
  }
}

// 2. Admin edits user
async function updateUserByAdmin(req, res, next) {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// 3. Admin deletes user
async function deleteUserByAdmin(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// 4. Admin creates game
async function createGameByAdmin(req, res, next) {
  try {
    const newGame = new Game(req.body);
    await newGame.save();
    res.status(201).json(newGame);
  } catch (err) {
    next(err);
  }
}

// 5. Admin updates game
async function updateGameByAdmin(req, res, next) {
  try {
    const updated = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// 6. Admin deletes game
async function deleteGameByAdmin(req, res, next) {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// 7. Admin updates session
async function updateSessionByAdmin(req, res, next) {
  try {
    const updated = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// 8. Admin deletes session
async function deleteSessionByAdmin(req, res, next) {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// Search Users by Name or Email
async function searchUsers(req, res, next) {
  try {
    const query = req.query.query || "";
    const users = await User.find({
      $or: [
        { firstName: new RegExp(query, "i") },
        { lastName: new RegExp(query, "i") },
        { email: new RegExp(query, "i") }
      ]
    }).select("-password");
    res.json(users);
  } catch (err) {
    next(err);
  }
}

//User Stats Summary
async function getUserStats(req, res, next) {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const admins = await User.countDocuments({ role: "admin" });

    res.json({ totalUsers, verifiedUsers, admins });
  } catch (err) {
    next(err);
  }
}

// Most Played Games
async function getGameStats(req, res, next) {
  try {
    const stats = await Session.aggregate([
      { $group: { _id: "$game", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "games",
          localField: "_id",
          foreignField: "_id",
          as: "gameInfo"
        }
      },
      { $unwind: "$gameInfo" },
      {
        $project: {
          _id: 0,
          gameId: "$gameInfo._id",
          title: "$gameInfo.name",
          plays: "$count"
        }
      },
      { $sort: { plays: -1 } }
    ]);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// Sessions by Date Range
async function getSessionsByDateRange(req, res, next) {
  try {
    const start = new Date(req.query.start);
    const end = new Date(req.query.end);

    const sessions = await Session.find({
      date: { $gte: start, $lte: end }
    }).populate("game playedBy scores.player");

    res.json(sessions);
  } catch (err) {
    next(err);
  }
}


module.exports = {
  // existing admin CRUD
  getAllUsersWithMatches,
  updateUserByAdmin,
  deleteUserByAdmin,
  createGameByAdmin,
  updateGameByAdmin,
  deleteGameByAdmin,
  updateSessionByAdmin,
  deleteSessionByAdmin,

  // new insights
  searchUsers,
  getUserStats,
  getGameStats,
  getSessionsByDateRange
};