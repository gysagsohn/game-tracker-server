const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");
const rateLimiter = require("../middleware/rateLimiter"); // ✅ new

// Apply limiter to sensitive routes
router.post("/signup", rateLimiter, authController.signup);
router.post("/login", rateLimiter, authController.login);
router.post("/forgot-password", rateLimiter, authController.forgotPassword);
router.post("/resend-verification-email", rateLimiter, authController.resendVerificationEmail);

router.get("/verify-email", authController.verifyEmail);
router.post("/reset-password", authController.resetPassword);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/" }), (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.redirect(`http://localhost:5173/oauth-success?token=${token}`);
});

module.exports = router;