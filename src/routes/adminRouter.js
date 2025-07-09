const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminCheck = require("../middleware/adminCheck");

// Admin-only actions
router.use(authMiddleware, adminCheck);

router.get("/users/search", adminController.searchUsers);
router.get("/stats/users", adminController.getUserStats);
router.get("/stats/games", adminController.getGameStats);
router.get("/sessions/date-range", adminController.getSessionsByDateRange);

router.get("/users", adminController.getAllUsersWithMatches);
router.put("/users/:id", adminController.updateUserByAdmin);
router.delete("/users/:id", adminController.deleteUserByAdmin);

router.post("/games", adminController.createGameByAdmin);
router.put("/games/:id", adminController.updateGameByAdmin);
router.delete("/games/:id", adminController.deleteGameByAdmin);

router.put("/sessions/:id", adminController.updateSessionByAdmin);
router.delete("/sessions/:id", adminController.deleteSessionByAdmin);

module.exports = router;
