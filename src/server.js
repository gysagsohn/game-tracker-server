const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/users", require("./routes/userRouter"));
app.use("/games", require("./routes/gameRouter"));
app.use("/sessions", require("./routes/sessionRouter"));

// Health check
app.get("/", (req, res) => {
	res.json({ message: "Game Tracker API is running" });
});

// 404 fallback
app.get("*", (req, res) => {
	res.status(404).json({ message: "404 Page not found." });
});

// Global error handler
app.use((error, req, res, next) => {
	res.status(error.status || 500).json({
		message: "Something went wrong",
		error: error.message
	});
});

module.exports = { app };
