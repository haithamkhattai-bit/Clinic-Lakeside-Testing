function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect(303, "/login");
  }

  return next();
}

module.exports = requireAuth;
