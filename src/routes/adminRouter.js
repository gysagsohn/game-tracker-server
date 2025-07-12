const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminCheck = require("../middleware/adminCheck");

const {
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
} = require("../controllers/adminController");

// Users
router.get("/users", authMiddleware, adminCheck, getAllUsersWithMatches);
router.put("/users/:id", authMiddleware, adminCheck, updateUserByAdmin);
router.delete("/users/:id", authMiddleware, adminCheck, deleteUserByAdmin);
router.post("/users/:id/reset-stats", authMiddleware, adminCheck, resetUserStats);
router.post("/users/:id/resend-verification", authMiddleware, adminCheck, resendVerificationAsAdmin);
router.post("/users/:id/force-verify", authMiddleware, adminCheck, forceVerifyUser);
router.post("/users/:id/toggle-suspend", authMiddleware, adminCheck, toggleSuspendUser);

// Games
router.post("/games", authMiddleware, adminCheck, createGameByAdmin);
router.put("/games/:id", authMiddleware, adminCheck, updateGameByAdmin);
router.delete("/games/:id", authMiddleware, adminCheck, deleteGameByAdmin);

// Sessions
router.get("/sessions", authMiddleware, adminCheck, getAllSessionsForAdmin);
router.put("/sessions/:id", authMiddleware, adminCheck, updateSessionByAdmin);
router.delete("/sessions/:id", authMiddleware, adminCheck, deleteSessionByAdmin);

// Analytics & Tools
router.get("/search", authMiddleware, adminCheck, searchUsers);
router.get("/stats/users", authMiddleware, adminCheck, getUserStats);
router.get("/stats/games", authMiddleware, adminCheck, getGameStats);
router.get("/sessions/range", authMiddleware, adminCheck, getSessionsByDateRange);
router.get("/stats/match-counts", authMiddleware, adminCheck, getMatchCountsGrouped);
router.get("/stats/top-players", authMiddleware, adminCheck, getTopPlayers);
router.get("/stats/win-rates", authMiddleware, adminCheck, getUserWinRates);

module.exports = router;
