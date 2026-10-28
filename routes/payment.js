const express = require("express");
const appointmentService = require("../services/appointmentService");
const emailService = require("../services/emailService");
const stripeService = require("../services/stripeService");

const router = express.Router();

router.get("/booking-success", async (req, res) => {
  const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";
  if (!sessionId) return res.sendStatus(400);

  const booking = appointmentService.getBookingByStripeSessionId(sessionId);
  if (!booking) return res.sendStatus(404);

  let checkoutSession;
  try {
    checkoutSession = await stripeService.retrieveCheckoutSession(sessionId);
  } catch (error) {
    console.error("Could not verify Stripe Checkout Session:", error.message);
    return res.status(502).render("payment-error", {
      booking,
      csrfToken: res.locals.csrfToken,
    });
  }

  const paid = checkoutSession.id === sessionId && checkoutSession.payment_status === "paid";
  if (paid && booking.status === "Pending") {
    appointmentService.markBookingBooked(booking.id);
  }

  let currentBooking = appointmentService.getBookingById(booking.id);
  if (paid && currentBooking.status === "Booked") {
    const emailClaim = appointmentService.claimConfirmationEmail(booking.id);
    if (emailClaim) {
      try {
        await emailService.sendAppointmentConfirmation(emailClaim);
      } catch (error) {
        console.error("Could not send appointment confirmation email:", error.message);
      }
      currentBooking = appointmentService.getBookingById(booking.id);
    }
  }

  return res.status(200).render("booking-success", {
    booking: currentBooking,
    paid: currentBooking.status === "Booked" && paid,
  });
});

module.exports = router;
