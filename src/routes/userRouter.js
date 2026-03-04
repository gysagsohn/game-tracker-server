const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const privacyGuard = require("../middleware/privacyGuard");
const { getLoggedInUser } = require("../controllers/userController");
const { searchLimiter } = require("../middleware/rateLimiter");

router.get("/me", authMiddleware, getLoggedInUser);
router.get("/search", authMiddleware, searchLimiter, userController.searchUsers); 
router.get("/:id/stats", authMiddleware, privacyGuard, userController.getUserStats);
router.get("/:id", authMiddleware, privacyGuard, userController.getUserById);
router.put("/:id", authMiddleware, privacyGuard, userController.updateUser);
router.delete("/:id", authMiddleware, privacyGuard, userController.deleteUser);

// Change password — auth only, no privacyGuard needed (user changes their own password)
router.post("/change-password", authMiddleware, userController.changePassword);

module.exports = router;