const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", gameController.getAllGames); // public
router.post("/", authMiddleware, gameController.createGame);
router.get("/:id", gameController.getGameById); // public
router.put("/:id", authMiddleware, gameController.updateGame);
router.delete("/:id", authMiddleware, gameController.deleteGame);
router.post("/:id/like", authMiddleware, gameController.toggleGameLike); 

module.exports = router;
