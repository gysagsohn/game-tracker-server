const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// All User-related API endpoints
router.get("/", userController.getAllUsers);
router.post("/", userController.createUser);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;
