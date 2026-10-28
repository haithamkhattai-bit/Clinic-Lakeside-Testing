const db = require("../data/db");

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (email, passwordHash)
  VALUES (?, ?)
`);
const selectUserByEmail = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE");
const insertBooking = db.prepare(`
  INSERT INTO appointments (
    specialty,
    doctor,
    appointmentDateTime,
    patientName,
    patientPhone,
    patientEmail,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, 'Pending')
`);
const selectBookingById = db.prepare("SELECT * FROM appointments WHERE id = ?");
const selectBookingByStripeSessionId = db.prepare(
  "SELECT * FROM appointments WHERE stripeSessionId = ?",
);
const saveStripeSessionIdStatement = db.prepare(`
  UPDATE appointments
  SET stripeSessionId = ?
  WHERE id = ? AND status = 'Pending'
  RETURNING *
`);
const markBookingBookedStatement = db.prepare(`
  UPDATE appointments
  SET status = 'Booked'
  WHERE id = ? AND status = 'Pending'
  RETURNING *
`);
const claimConfirmationEmailStatement = db.prepare(`
  UPDATE appointments
  SET confirmationEmailSentAt = CURRENT_TIMESTAMP
  WHERE id = ? AND status = 'Booked' AND confirmationEmailSentAt IS NULL
  RETURNING *
`);
const getBookingsByEmailStatement = db.prepare(`
  SELECT * FROM appointments
  WHERE patientEmail = ? COLLATE NOCASE
  ORDER BY appointmentDateTime, id
`);
const getPatientAppointmentsStatement = db.prepare(`
  SELECT * FROM appointments
  WHERE patientEmail = ? COLLATE NOCASE
  ORDER BY createdAt DESC, id DESC
`);
const getBookedAppointmentsStatement = db.prepare(`
  SELECT * FROM appointments
  WHERE status = 'Booked'
  ORDER BY appointmentDateTime, id
`);
const getBookingsByDateStatement = db.prepare(`
  SELECT * FROM appointments
  WHERE substr(appointmentDateTime, 1, 10) = ?
  ORDER BY appointmentDateTime, id
`);
const updateStatusStatement = db.prepare(`
  UPDATE appointments
  SET status = ?
  WHERE id = ?
  RETURNING *
`);
const cancelAppointmentStatement = db.prepare(`
  UPDATE appointments
  SET status = 'Cancelled'
  WHERE id = ? AND patientEmail = ? COLLATE NOCASE
  RETURNING *
`);

function createUser(email, passwordHash) {
  const result = insertUser.run(email, passwordHash);
  if (result.changes === 0) return null;

  return selectUserByEmail.get(email);
}

function getUserByEmail(email) {
  return selectUserByEmail.get(email) || null;
}

function createBooking(booking) {
  const result = insertBooking.run(
    booking.specialty,
    booking.doctor,
    booking.appointmentDateTime,
    booking.patientName,
    booking.patientPhone,
    booking.patientEmail,
  );

  return selectBookingById.get(result.lastInsertRowid);
}

function getBookingById(id) {
  const bookingId = Number(id);
  if (!Number.isSafeInteger(bookingId) || bookingId < 1) return null;

  return selectBookingById.get(bookingId) || null;
}

function getBookingByStripeSessionId(sessionId) {
  return selectBookingByStripeSessionId.get(sessionId) || null;
}

function saveStripeSessionId(id, sessionId) {
  return saveStripeSessionIdStatement.get(sessionId, id) || null;
}

function markBookingBooked(id) {
  return markBookingBookedStatement.get(id) || null;
}

function claimConfirmationEmail(id) {
  return claimConfirmationEmailStatement.get(id) || null;
}

function getBookingsByEmail(email) {
  return getBookingsByEmailStatement.all(email);
}

function getPatientAppointments(email) {
  return getPatientAppointmentsStatement.all(email);
}

function getBookedAppointments() {
  return getBookedAppointmentsStatement.all();
}

function getBookingsByDate(date) {
  return getBookingsByDateStatement.all(date);
}

function updateStatus(id, status) {
  return updateStatusStatement.get(status, id) || null;
}

function cancelAppointment(id, patientEmail) {
  const appointmentId = Number(id);
  if (!Number.isSafeInteger(appointmentId) || appointmentId < 1) return null;

  return cancelAppointmentStatement.get(appointmentId, patientEmail) || null;
}

module.exports = {
  createUser,
  getUserByEmail,
  createBooking,
  getBookingById,
  getBookingByStripeSessionId,
  saveStripeSessionId,
  markBookingBooked,
  claimConfirmationEmail,
  getBookingsByEmail,
  getPatientAppointments,
  getBookedAppointments,
  getBookingsByDate,
  updateStatus,
  cancelAppointment,
};
