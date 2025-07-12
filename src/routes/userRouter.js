const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const privacyGuard = require("../middleware/privacyGuard");


router.get("/", authMiddleware, userController.getAllUsers);
router.get("/:id/stats", authMiddleware, privacyGuard, userController.getUserStats);
router.get("/:id", authMiddleware, privacyGuard, userController.getUserById);
router.put("/:id", authMiddleware, privacyGuard, userController.updateUser);
router.delete("/:id", authMiddleware, privacyGuard, userController.deleteUser);


module.exports = router;