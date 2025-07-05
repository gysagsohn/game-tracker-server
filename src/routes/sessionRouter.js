const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");

router.get("/", sessionController.getAllSessions);
router.post("/", sessionController.createSession);
router.get("/:id", sessionController.getSessionById);
router.put("/:id", sessionController.updateSession);
router.delete("/:id", sessionController.deleteSession);

module.exports = router;
