const express = require("express");
const cors = require("cors");
const passport = require("passport");
require("./config/passport");
const adminRouter = require("./routes/adminRouter");

const app = express();

app.set("trust proxy", 1);

// ----- CORS (must be first, before rate limiters/auth/routes) -----
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,          // e.g. https://gy-gametracker.netlify.app
  "http://localhost:5173",           // local dev (if you use Vite)
];

console.log("CORS allowlist:", ALLOWED_ORIGINS.filter(Boolean));

// Optional: allow Netlify preview deploys too
const NETLIFY_PREVIEWS = /\.netlify\.app$/;

app.use(cors({
  origin(origin, cb) {
    // allow tools with no Origin (curl/Postman)
    if (!origin) return cb(null, true);

    const ok =
      ALLOWED_ORIGINS.filter(Boolean).includes(origin) || NETLIFY_PREVIEWS.test(origin);

    return cb(ok ? null : new Error("CORS not allowed for this origin"), ok);
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS","PATCH"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true, // okay even if you don't use cookies; harmless
}));

// Ensure preflight OPTIONS always returns CORS headers
app.options("*", cors());

// ----- Body parsing -----
app.use(express.json());

// ----- Auth -----
app.use(passport.initialize());

// ----- Routes -----
app.use("/users", require("./routes/userRouter"));
app.use("/games", require("./routes/gameRouter"));
app.use("/sessions", require("./routes/sessionRouter"));
app.use("/auth", require("./routes/authRouter"));
app.use("/friends", require("./routes/friendRouter"));
app.use("/admin", adminRouter);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Game Tracker API is running" });
});

// 404 fallback (use .all so OPTIONS gets CORS headers too)
app.all("*", (req, res) => {
  res.status(404).json({ message: "404 Page not found." });
});

// Global error handler (CORS headers will still be present)
app.use((error, req, res, next) => {
  const status = error.status || 500;
  const isProd = process.env.NODE_ENV === "production";
  const payload = {
    message: isProd ? "Something went wrong" : (error.message || "Something went wrong"),
  };
  if (!isProd) {
    payload.stack = error.stack;
  }
  res.status(status).json(payload);
});

module.exports = { app };
