const Session = require("../models/SessionModel");

async function matchPrivacyGuard(req, res, next) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.role === "admin") {
    return next(); // Admins have full access
  }

  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const isPlayer = session.playedBy.some(
      (id) => id.toString() === user._id.toString()
    );

    if (!isPlayer) {
      return res.status(403).json({ message: "Access denied: Not your match" });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = matchPrivacyGuard;
