function requireReception(req, res, next) {
  if (!req.session.user) {
    return res.redirect(303, "/login");
  }

  if (req.session.user.role !== "reception") {
    return res.status(403).send("Reception access is restricted to authorised staff.");
  }

  return next();
}

module.exports = requireReception;
