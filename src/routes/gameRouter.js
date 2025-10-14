const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { createGameSchema, updateGameSchema } = require("../validation/gameSchemas");

router.get("/", gameController.getAllGames);
router.post("/", authMiddleware, validateRequest(createGameSchema), gameController.createGame);
router.get("/:id", gameController.getGameById);
router.put("/:id", authMiddleware, validateRequest(updateGameSchema), gameController.updateGame);
router.delete("/:id", authMiddleware, gameController.deleteGame);
router.post("/:id/like", authMiddleware, gameController.toggleGameLike);

module.exports = router;