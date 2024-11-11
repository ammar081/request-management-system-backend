const express = require("express");
const mongoose = require("mongoose");
const Notification = require("./models/Notification");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Configure Nodemailer transporter using SMTP settings from .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Optional: if SMTP server has self-signed certificate
  },
});

// Function to send email and save notification in database
async function sendNotification(email, name, subject, message, type) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`${type} email notification sent to ${email}`);

    const notification = new Notification({
      email,
      name,
      message,
      type,
    });
    await notification.save();

    return {
      status: 200,
      message: `${type} notification email sent and saved successfully.`,
    };
  } catch (error) {
    console.error(`Error sending ${type} notification email:`, error);
    return {
      status: 500,
      message: `Failed to send ${type} notification email.`,
    };
  }
}

// Endpoint to handle login notifications
app.post("/send-login-notification", async (req, res) => {
  const { email, name } = req.body;
  const subject = "Successful Login Notification";
  const message = `Hello ${name},\n\nYou have successfully logged into your account.\n\nBest regards,\nYour Application Team`;

  const result = await sendNotification(email, name, subject, message, "Login");
  res.status(result.status).json({ message: result.message });
});

// Endpoint to handle logout notifications
app.post("/send-logout-notification", async (req, res) => {
  const { email, name } = req.body;
  const subject = "Logout Notification";
  const message = `Hello ${name},\n\nYou have successfully logged out of your account.\n\nBest regards,\nYour Application Team`;

  const result = await sendNotification(
    email,
    name,
    subject,
    message,
    "Logout"
  );
  res.status(result.status).json({ message: result.message });
});

// Health check route
app.get("/", (req, res) => {
  res.send("Notification Service running.");
});

module.exports = app;

// Start the server if running standalone
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`Notification Service running on port ${PORT}`);
// });
