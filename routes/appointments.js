const express = require("express");
const appointmentService = require("../services/appointmentService");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const appointments = appointmentService.getPatientAppointments(req.session.user.email);
  res.render("my-appointments", {
    appointments,
    cancelled: req.query.cancelled === "1",
  });
});

router.post("/:id/cancel", (req, res) => {
  const appointment = appointmentService.cancelAppointment(
    req.params.id,
    req.session.user.email,
  );

  if (!appointment) return res.sendStatus(404);
  return res.redirect(303, "/my-appointments?cancelled=1");
});

module.exports = router;
