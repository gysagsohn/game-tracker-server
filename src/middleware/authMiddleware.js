const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid auth token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user without password
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Invalid token: user not found" });
    }

    req.user = user; // Attach safe user object to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token verification failed" });
  }
}

module.exports = authMiddleware;
