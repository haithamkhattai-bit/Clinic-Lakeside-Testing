const express = require("express");
const bcrypt = require("bcryptjs");
const appointmentService = require("../services/appointmentService");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function renderAuth(res, mode, options = {}) {
  return res.status(options.status || 200).render("auth", {
    mode,
    errors: options.errors || [],
    email: options.email || "",
  });
}

router.get("/register", (req, res) => {
  if (req.session.user) return res.redirect(req.session.user.role === "reception" ? "/reception" : "/my-appointments");
  return renderAuth(res, "register");
});

router.post("/register", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const errors = [];

  if (email.length > 254 || !emailPattern.test(email)) {
    errors.push("Enter a valid email address.");
  }

  const passwordBytes = Buffer.byteLength(password, "utf8");
  if ([...password].length < 12 || passwordBytes > 72) {
    errors.push("Password must be at least 12 characters and no more than 72 bytes.");
  }

  if (errors.length) {
    return renderAuth(res, "register", { status: 400, errors, email });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = appointmentService.createUser(email, passwordHash);
  if (!user) {
    return renderAuth(res, "register", {
      status: 409,
      errors: ["An account with that email already exists. Log in instead."],
      email,
    });
  }

  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
  req.session.user = { id: user.id, email: user.email, role: user.role };
  return res.redirect(303, user.role === "reception" ? "/reception" : "/my-appointments");
});

router.get("/login", (req, res) => {
  if (req.session.user) return res.redirect(req.session.user.role === "reception" ? "/reception" : "/my-appointments");
  return renderAuth(res, "login");
});

router.post("/login", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (email.length > 254 || !emailPattern.test(email) || Buffer.byteLength(password, "utf8") > 72) {
    return renderAuth(res, "login", {
      status: 400,
      errors: ["Enter a valid email and password."],
      email,
    });
  }

  const user = appointmentService.getUserByEmail(email);
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9M8LQ6SJv9jYqWAPxw6fLw5Y3TqR7XK");
  if (!user || !passwordMatches) {
    return renderAuth(res, "login", {
      status: 401,
      errors: ["Email or password is incorrect."],
      email,
    });
  }

  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
  req.session.user = { id: user.id, email: user.email, role: user.role };
  await new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });

  return res.redirect(303, user.role === "reception" ? "/reception" : "/my-appointments");
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("clinic.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res.redirect(303, "/");
  });
});

module.exports = router;
