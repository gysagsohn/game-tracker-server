const User = require("../models/UserModel");
const Game = require("../models/GameModel");
const Session = require("../models/SessionModel");

// View all users and sessions
async function getAllUsersWithMatches(req, res, next) {
  try {
    const users = await User.find().select("-password");
    const sessions = await Session.find()
      .populate("game players.user"); 
    res.json({ users, sessions });
  } catch (err) {
    next(err);
  }
}

// CRUD - Users
async function updateUserByAdmin(req, res, next) {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteUserByAdmin(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// CRUD - Games
async function createGameByAdmin(req, res, next) {
  try {
    const newGame = new Game(req.body);
    await newGame.save();
    res.status(201).json(newGame);
  } catch (err) {
    next(err);
  }
}

async function updateGameByAdmin(req, res, next) {
  try {
    const updated = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteGameByAdmin(req, res, next) {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// CRUD - Sessions
async function updateSessionByAdmin(req, res, next) {
  try {
    const updated = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteSessionByAdmin(req, res, next) {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// Analytics
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

async function getSessionsByDateRange(req, res, next) {
  try {
    const start = new Date(req.query.start);
    const end = new Date(req.query.end);

    const sessions = await Session.find({
      date: { $gte: start, $lte: end }
    }).populate("game plater.user");

    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

async function getMatchCountsGrouped(req, res, next) {
  try {
    const unit = req.query.unit === "month" ? "%Y-%m" : "%Y-%U";
    const groupBy = { $dateToString: { format: unit, date: "$date" } };

    const data = await Session.aggregate([
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getTopPlayers(req, res, next) {
  try {
    const users = await User.find()
      .sort({ "stats.wins": -1 })
      .limit(10)
      .select("firstName lastName stats.wins");
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getUserWinRates(req, res, next) {
  try {
    const users = await User.find().select("firstName lastName stats");

    const winRates = users.map(user => {
      const total = user.stats.wins + user.stats.losses;
      const rate = total > 0 ? (user.stats.wins / total) * 100 : 0;

      return {
        name: `${user.firstName} ${user.lastName}`,
        winRate: Math.round(rate)
      };
    });

    res.json(winRates);
  } catch (err) {
    next(err);
  }
}

// Admin tools
async function resetUserStats(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        stats: { wins: 0, losses: 0, mostPlayed: "" }
      },
      { new: true }
    );
    res.json({ message: "User stats reset", user });
  } catch (err) {
    next(err);
  }
}

async function resendVerificationAsAdmin(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isEmailVerified) return res.status(400).json({ message: "Already verified" });

    const sendVerificationEmail = require("../controllers/authController").sendVerificationEmail;
    await sendVerificationEmail(user);
    res.json({ message: "Verification email resent." });
  } catch (err) {
    next(err);
  }
}

async function forceVerifyUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isEmailVerified: true }, { new: true });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function toggleSuspendUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    user.isSuspended = !user.isSuspended;
    await user.save();
    res.json({ message: user.isSuspended ? "User suspended" : "User reactivated" });
  } catch (err) {
    next(err);
  }
}

async function getAllSessionsForAdmin(req, res, next) {
  try {
    const sessions = await Session.find().populate("game players.user");
    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsersWithMatches,
  updateUserByAdmin,
  deleteUserByAdmin,
  createGameByAdmin,
  updateGameByAdmin,
  deleteGameByAdmin,
  updateSessionByAdmin,
  deleteSessionByAdmin,
  searchUsers,
  getUserStats,
  getGameStats,
  getSessionsByDateRange,
  getMatchCountsGrouped,
  getTopPlayers,
  getUserWinRates,
  resetUserStats,
  resendVerificationAsAdmin,
  forceVerifyUser,
  toggleSuspendUser,
  getAllSessionsForAdmin
};
