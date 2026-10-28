const Stripe = require("stripe");

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test-mode secret key.");
  }

  return new Stripe(secretKey);
}

function getBaseUrl() {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not configured.");
  }

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("BASE_URL must be an absolute HTTP or HTTPS URL.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("BASE_URL must be an absolute HTTP or HTTPS URL.");
  }

  return url.origin;
}

function createDepositCheckoutSession(booking) {
  const stripe = getStripeClient();
  const baseUrl = getBaseUrl();

  return stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: String(booking.id),
    customer_email: booking.patientEmail,
    metadata: { appointmentId: String(booking.id) },
    line_items: [
      {
        price_data: {
          currency: "aed",
          product_data: {
            name: "Refundable consultation deposit",
            description: "AED 100 deposit for your clinic consultation.",
          },
          unit_amount: 10000,
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/booking`,
  });
}

function retrieveCheckoutSession(sessionId) {
  return getStripeClient().checkout.sessions.retrieve(sessionId);
}

module.exports = {
  createDepositCheckoutSession,
  retrieveCheckoutSession,
};
