const express = require("express");
const appointmentService = require("../services/appointmentService");
const emailService = require("../services/emailService");
const requireReception = require("../middleware/requireReception");

const router = express.Router();

router.use(requireReception);

function dubaiToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function formatTime(appointmentDateTime) {
  const match = /T(\d{2}:\d{2})/.exec(appointmentDateTime);
  if (!match) return "—";
  const [hours, minutes] = match[1].split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

router.get("/", (req, res) => {
  const appointments = appointmentService
    .getBookingsByDate(dubaiToday())
    .filter((appointment) => appointment.status !== "Pending" && appointment.status !== "Cancelled")
    .sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime));

  const groupedByDoctor = new Map();
  appointments.forEach((appointment) => {
    if (!groupedByDoctor.has(appointment.doctor)) groupedByDoctor.set(appointment.doctor, []);
    groupedByDoctor.get(appointment.doctor).push(appointment);
  });
  res.render("reception", {
    groupedAppointments: [...groupedByDoctor.entries()],
    appointmentCount: appointments.length,
    formatTime,
    reminderSent: req.query.sent === "1",
    reminderFailed: req.query.error === "1",
    statusUpdated: req.query.updated === "1",
  });
});

router.post("/:id/status", (req, res) => {
  const status = typeof req.body.status === "string" ? req.body.status : "";
  if (!appointmentService.updateStatus(req.params.id, status)) return res.sendStatus(404);
  return res.redirect(303, "/reception?updated=1");
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
