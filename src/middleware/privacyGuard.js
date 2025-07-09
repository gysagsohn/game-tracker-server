function privacyGuard(req, res, next) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Allow admins to bypass
  if (user.role === "admin") {
    return next();
  }

  // Only allow users to access their own data
  if (req.params.id && req.params.id !== user._id.toString()) {
    return res.status(403).json({ message: "Access denied: Not your resource" });
  }

  next();
}

module.exports = privacyGuard;
