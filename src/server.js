const express = require("express");
const cors = require("cors");
const passport = require("passport");
require("./config/passport");
const adminRouter = require("./routes/adminRouter");
const { FRONTEND_URL } = require("./utils/urls");

const app = express();

app.set("trust proxy", 1);

// Build an allowlist for known origins (prod + dev)
const STATIC_ALLOWED = [
  FRONTEND_URL,             // e.g. https://gy-gametracker.netlify.app
  "http://localhost:5173",  // Vite dev
].filter(Boolean);

// Allow Netlify preview deploys as well
const NETLIFY_ORIGIN_RE = /^https?:\/\/[a-z0-9-]+\.netlify\.app$/i;

console.log("CORS allowlist:", STATIC_ALLOWED);

// Define CORS options (shared between all routes + preflight)
const corsOptions = {
  origin(origin, cb) {
    // Allow tools with no Origin header (e.g., Postman, curl)
    if (!origin) return cb(null, true);

    const ok =
      STATIC_ALLOWED.includes(origin) ||
      NETLIFY_ORIGIN_RE.test(origin);

    if (ok) return cb(null, true);

    // Log blocked origins for debugging in Render logs
    console.warn("[CORS] Blocked origin:", origin, "Allowed:", STATIC_ALLOWED);
    // Return false → means “no CORS headers” (not an error)
    return cb(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false, // you don’t use cookies; keep this false
  optionsSuccessStatus: 204, // standard for preflight
};

// Apply CORS globally (for all requests)
app.use(cors(corsOptions));
// Ensure preflight requests also use the same options
app.options("*", cors(corsOptions));

// BODY PARSING + AUTH
app.use(express.json());
app.use(passport.initialize());

// ROUTES
app.use("/users", require("./routes/userRouter"));
app.use("/games", require("./routes/gameRouter"));
app.use("/sessions", require("./routes/sessionRouter"));
app.use("/auth", require("./routes/authRouter"));
app.use("/friends", require("./routes/friendRouter"));
app.use("/admin", adminRouter);

// HEALTH CHECK + 404 FALLBACK
app.get("/", (req, res) => {
  res.json({ message: "Game Tracker API is running" });
});

// Use .all so OPTIONS requests still receive CORS headers
app.all("*", (req, res) => {
  res.status(404).json({ message: "404 Page not found." });
});

// GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {
  const status = error.status || 500;
  const isProd = process.env.NODE_ENV === "production";
  const payload = {
    message: isProd
      ? "Something went wrong"
      : error.message || "Something went wrong",
  };

  if (!isProd) {
    payload.stack = error.stack;
  }

  res.status(status).json(payload);
});

module.exports = { app };
