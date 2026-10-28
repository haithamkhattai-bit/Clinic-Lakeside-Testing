const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const express = require("express");
const session = require("express-session");
const csrfProtection = require("./middleware/csrfProtection");
const bookingRouter = require("./routes/booking");
const authRouter = require("./routes/auth");
const appointmentsRouter = require("./routes/appointments");
const paymentRouter = require("./routes/payment");
const receptionRouter = require("./routes/reception");

const app = express();
const port = process.env.PORT || 3000;
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in .env or the server environment.");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    name: "clinic.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

app.locals.clinic = {
  name: "Lakeside Medical Clinic",
  area: "JLT, Dubai",
  tagline: "Expert care, close to home",
  address: "Cluster X, JLT, Dubai",
  phone: "+971 4 555 0123",
  phoneLink: "+97145550123",
};

const specialties = [
  {
    name: "General Physician",
    description: "Thoughtful everyday care for your whole family.",
    icon: "bi-heart-pulse",
  },
  {
    name: "ENT",
    description: "Expert support for ear, nose, and throat concerns.",
    icon: "bi-ear",
  },
  {
    name: "Dentist",
    description: "Comfortable dental care for confident, healthy smiles.",
    icon: "bi-emoji-smile",
  },
  {
    name: "Cardiologist",
    description: "Personalized care to help keep your heart healthy.",
    icon: "bi-heart",
  },
];

app.get("/", (req, res) => {
  res.render("index", { specialties });
});

app.use("/booking", bookingRouter);
app.use("/", authRouter);
app.use("/my-appointments", appointmentsRouter);
app.use("/reception", receptionRouter);
app.use("/", paymentRouter);

app.listen(port, () => {
  console.log(`Lakeside Medical Clinic website is running at http://localhost:${port}`);
});
