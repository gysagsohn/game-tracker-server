// src/routes/friendRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware"); // <- your auth middleware
const ctrl = require("../controllers/friendController");
const rateLimit = require("express-rate-limit");

// All routes below require auth
router.use(auth);

// Rate limit sending friend requests
const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: "Too many friend requests sent. Please try again later."
});

// Friends
router.get("/list/:id", ctrl.getFriendList);
router.get("/suggested", ctrl.getSuggestedFriends);
router.post("/unfriend", ctrl.unfriendUser);

// Friend requests (incoming/outgoing + actions)
router.post("/send", friendRequestLimiter, ctrl.sendFriendRequest);
router.post("/respond", ctrl.respondToFriendRequest);
router.get("/requests", ctrl.getPendingFriendRequests);
router.get("/sent", ctrl.getSentFriendRequests);

// Notifications
router.get("/notifications", ctrl.getNotifications);
router.put("/notifications/:id/read", ctrl.markNotificationAsRead);
router.post("/notifications/:id/read", ctrl.markNotificationAsRead);
router.post("/notifications/read-all", ctrl.readAllNotifications);

// Mutuals
router.get("/mutual/:id", ctrl.getMutualFriends);

module.exports = router;
