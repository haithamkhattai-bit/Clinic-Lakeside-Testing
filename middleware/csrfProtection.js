const crypto = require("crypto");

function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  if (req.method === "POST" && req.body._csrf !== req.session.csrfToken) {
    return res.status(403).send("Invalid or expired form token. Please reload the page and try again.");
  }

  return next();
}

module.exports = csrfProtection;
