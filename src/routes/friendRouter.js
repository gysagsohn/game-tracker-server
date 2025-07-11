const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/friendController");
const rateLimit = require("express-rate-limit");

router.use(authMiddleware);


const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each user to 5 friend requests per hour
  message: "Too many friend requests sent. Please try again later."
});

router.post("/send", friendRequestLimiter, controller.sendFriendRequest);
router.post("/respond", controller.respondToFriendRequest);
router.get("/requests", controller.getPendingFriendRequests);
router.get("/list/:id", controller.getFriendList);
router.get("/suggested", controller.getSuggestedFriends); 
router.post("/unfriend", controller.unfriendUser);
router.get("/notifications", controller.getNotifications);
router.put("/notifications/:id/read", controller.markNotificationAsRead);
router.get("/mutual/:id", controller.getMutualFriends);

module.exports = router;
