const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const authMiddleware = require("../middleware/authMiddleware");
const matchPrivacyGuard = require("../middleware/matchPrivacyGuard");
const validateRequest = require("../middleware/validateRequest");
const { createSessionSchema, updateSessionSchema } = require("../validation/sessionSchemas");

router.get("/", authMiddleware, sessionController.getAllSessions);
router.post("/", authMiddleware, validateRequest(createSessionSchema), sessionController.createSession);
router.post("/:id/confirm", authMiddleware, sessionController.confirmSession);
router.post("/:id/decline", authMiddleware, sessionController.declineSession);

router.get("/my-pending", authMiddleware, sessionController.getMyPendingSessions);

router.get("/:id", authMiddleware, matchPrivacyGuard, sessionController.getSessionById);
router.put("/:id", authMiddleware, matchPrivacyGuard, validateRequest(updateSessionSchema), sessionController.updateSession);
router.delete("/:id", authMiddleware, matchPrivacyGuard, sessionController.deleteSession);
router.post("/:id/remind", authMiddleware, sessionController.remindMatchConfirmation);

module.exports = router;