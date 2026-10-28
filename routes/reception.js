const express = require("express");
const appointmentService = require("../services/appointmentService");
const emailService = require("../services/emailService");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  res.render("reception", {
    appointments: appointmentService.getBookedAppointments(),
    reminderSent: req.query.sent === "1",
    reminderFailed: req.query.error === "1",
  });
});

router.post("/:id/reminder", async (req, res) => {
  const booking = appointmentService.getBookingById(req.params.id);
  if (!booking || booking.status !== "Booked") return res.sendStatus(404);

  try {
    await emailService.sendAppointmentReminder(booking);
    return res.redirect(303, "/reception?sent=1");
  } catch (error) {
    console.error(`Could not send appointment reminder for booking ${booking.id}:`, error.message);
    return res.redirect(303, "/reception?error=1");
  }
});

module.exports = router;
