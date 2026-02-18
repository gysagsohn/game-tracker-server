const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");
const validateRequest = require("../middleware/validateRequest");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require("../validation/authSchemas");

// Apply limiter and validation to sensitive routes
router.post("/signup", authLimiter, validateRequest(signupSchema), authController.signup);
router.post("/login", authLimiter, validateRequest(loginSchema), authController.login);
router.post("/forgot-password", authLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);
router.post("/resend-verification-email", authLimiter, validateRequest(forgotPasswordSchema), authController.resendVerificationEmail);

router.get("/verify-email", authController.verifyEmail);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/" }), (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.redirect(`${process.env.FRONTEND_URL}/oauth-success#token=${token}`);
});

module.exports = router;