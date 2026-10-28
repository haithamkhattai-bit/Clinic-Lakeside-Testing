const nodemailer = require("nodemailer");

const clinicName = "Lakeside Medical Clinic";
const clinicAddress = "Cluster X, JLT, Dubai";
const signoffName = "Lakeside Medical";

function getSmtpConfig() {
  const { SMTP_HOST: host, SMTP_PORT: portValue, SMTP_USER: user, SMTP_PASS: pass, SMTP_FROM: from } =
    process.env;

  if (!host || !portValue || !user || !pass || !from) {
    throw new Error("SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM must be configured.");
  }

  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return { host, port, user, pass, from };
}

async function sendAppointmentConfirmation(booking) {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  const date = booking.appointmentDateTime.slice(0, 10);
  const time = booking.appointmentDateTime.slice(11, 16);

  await transporter.sendMail({
    from: { name: clinicName, address: config.from },
    to: booking.patientEmail,
    subject: "Your appointment is confirmed",
    text: [
      `Your appointment at ${clinicName} is confirmed.`,
      "",
      `Specialty: ${booking.specialty}`,
      `Doctor: ${booking.doctor}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Clinic address: ${clinicAddress}`,
      "",
      `${clinicName} · built at ${signoffName}`,
    ].join("\n"),
  });
}

async function sendAppointmentReminder(booking) {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  const appointmentDate = new Date(booking.appointmentDateTime);
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(appointmentDate);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    hour: "numeric",
    minute: "2-digit",
  }).format(appointmentDate);

  await transporter.sendMail({
    from: { name: clinicName, address: config.from },
    to: booking.patientEmail,
    subject: "Reminder: your appointment",
    text: [
      `Hi ${booking.patientName}, a reminder that your ${booking.specialty} appointment with ${booking.doctor} is on ${date} at ${time} at Lakeside Medical, JLT. Reply to reschedule.`,
      "",
      "Powered by London International · lisrc.ae · built by Lakeside Medical",
    ].join("\n"),
  });
}

module.exports = { sendAppointmentConfirmation, sendAppointmentReminder };
