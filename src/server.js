const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
	res.json({ message: "Game Tracker API is running" });
});

// Future routers
// const userRouter = require("./controllers/UserRouter");
// app.use("/users", userRouter);

// Catch-all 404 handler (must come after all routes)
// app.use((req, res, next) => {
// 	res.status(404).json({ message: "404 Page not found." });
// });

// // Global error handler
// app.use((error, req, res, next) => {
// 	res.status(error.status || 500).json({
// 		message: "Something went wrong",
// 		error: error.message
// 	});
// });

// Log registered routes
// app._router.stack
//   .filter(r => r.route)
//   .forEach(r => {
//     const { path, methods } = r.route;
//     console.log(`🔗 ${Object.keys(methods)[0].toUpperCase()} ${path}`);
//   });

app.use((req, res, next) => {
  res.status(404).json({ message: "404 Page not found." });
});

app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    message: "Something went wrong",
    error: error.message
  });
});

module.exports = { app };
