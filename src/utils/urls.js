// src/utils/urls.js
function trimTrailingSlash(s = "") {
  return s.replace(/\/+$/, "");
}

const FRONTEND_URL = trimTrailingSlash(process.env.FRONTEND_URL || "");
const SERVER_URL = trimTrailingSlash(process.env.SERVER_URL || "");

module.exports = { trimTrailingSlash, FRONTEND_URL, SERVER_URL };
