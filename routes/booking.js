const express = require("express");
const appointmentService = require("../services/appointmentService");
const stripeService = require("../services/stripeService");

const router = express.Router();

const doctorsBySpecialty = {
  "General Physician": ["Dr. Sara Ahmed"],
  ENT: ["Dr. Omar Khan"],
  Dentist: ["Dr. Lina Haddad"],
  Cardiologist: ["Dr. Raj Mehta"],
};

const specialties = Object.keys(doctorsBySpecialty);
const timeSlots = [];

for (let minutes = 9 * 60; minutes <= 21 * 60; minutes += 30) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const hour12 = hours % 12 || 12;
  const period = hours < 12 ? "AM" : "PM";

  timeSlots.push({
    value: `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`,
    label: `${hour12}:${String(remainder).padStart(2, "0")} ${period}`,
  });
}

function dubaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function renderBooking(res, options = {}) {
  res.status(options.status || 200).render("booking", {
    specialties,
    doctorsBySpecialty,
    timeSlots,
    today: dubaiDate(),
    values: options.values || {},
    errors: options.errors || [],
    confirmed: options.confirmed || false,
    booking: options.booking || null,
  });
}

router.get("/", (req, res) => {
  renderBooking(res, {
    values: { email: req.session.user?.email || "" },
  });
});

router.get("/confirmation/:id", (req, res) => {
  const booking = appointmentService.getBookingById(req.params.id);
  if (!booking) return res.sendStatus(404);

  const isOwner = req.session.user?.email.toLowerCase() === booking.patientEmail.toLowerCase();
  const isRecentGuestBooking = String(req.session.bookingConfirmationId) === String(booking.id);
  if (!isOwner && !isRecentGuestBooking) return res.sendStatus(404);

  return renderBooking(res, { confirmed: true, booking });
});

router.post("/confirm", (req, res) => {
  const values = {
    specialty: typeof req.body.specialty === "string" ? req.body.specialty : "",
    doctor: typeof req.body.doctor === "string" ? req.body.doctor : "",
    date: typeof req.body.date === "string" ? req.body.date : "",
    time: typeof req.body.time === "string" ? req.body.time : "",
    name: typeof req.body.name === "string" ? req.body.name.trim() : "",
    phone: typeof req.body.phone === "string" ? req.body.phone.trim() : "",
    email: req.session.user
      ? req.session.user.email
      : typeof req.body.email === "string"
        ? req.body.email.trim()
        : "",
  };
  const errors = [];

  if (!Object.hasOwn(doctorsBySpecialty, values.specialty)) {
    errors.push("Choose a valid specialty.");
  }

  if (
    !Object.hasOwn(doctorsBySpecialty, values.specialty) ||
    !doctorsBySpecialty[values.specialty].includes(values.doctor)
  ) {
    errors.push("Choose a doctor for the selected specialty.");
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(values.date);
  const selectedDate = dateMatch
    ? new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])))
    : null;
  const validDate =
    selectedDate &&
    selectedDate.toISOString().slice(0, 10) === values.date &&
    selectedDate.getUTCDay() !== 0 &&
    values.date >= dubaiDate();

  if (!validDate) {
    errors.push("Choose a valid date from today onward. The clinic is closed on Sundays.");
  }

  if (!timeSlots.some((slot) => slot.value === values.time)) {
    errors.push("Choose an available 30-minute time slot between 9:00 AM and 9:00 PM.");
  }

  if (
    values.name.length < 2 ||
    values.name.length > 100 ||
    !/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(values.name)
  ) {
    errors.push("Enter a valid name (2–100 letters, spaces, apostrophes, periods, or hyphens).");
  }

  const phoneDigits = values.phone.replace(/\D/g, "");
  if (!/^\+?[0-9\s().-]+$/.test(values.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.push("Enter a valid phone number with 7–15 digits.");
  }

  if (
    values.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
  ) {
    errors.push("Enter a valid email address.");
  }

  if (errors.length > 0) {
    return renderBooking(res, { status: 400, values, errors });
  }

  const booking = appointmentService.createBooking({
    specialty: values.specialty,
    doctor: values.doctor,
    appointmentDateTime: `${values.date}T${values.time}:00+04:00`,
    patientName: values.name,
    patientPhone: values.phone,
    patientEmail: values.email,
  });

  if (!req.session.user) {
    req.session.bookingConfirmationId = booking.id;
  }

  return createCheckoutSession(booking, res);
});

async function createCheckoutSession(booking, res) {
  try {
    const checkoutSession = await stripeService.createDepositCheckoutSession(booking);
    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    const updatedBooking = appointmentService.saveStripeSessionId(
      booking.id,
      checkoutSession.id,
    );
    if (!updatedBooking) {
      throw new Error("Could not save the Stripe Checkout Session for the appointment.");
    }

    return res.redirect(303, checkoutSession.url);
  } catch (error) {
    console.error("Could not create Stripe Checkout Session:", error.message);
    return res.status(503).render("payment-error", {
      booking,
      csrfToken: res.locals.csrfToken,
    });
  }
}

module.exports = router;
