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
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Endpoint to handle login notifications
app.post("/send-login-notification", async (req, res) => {
  const { email, name } = req.body;
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Successful Login Notification",
    text: `Hello ${name},\n\nYou have successfully logged into your account.\n\nBest regards,\nYour Application Team`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Login email notification sent to ${email}`);

    const notification = new Notification({
      email,
      name,
      message: `Hello ${name}, you have successfully logged into your account.`,
      type: "Login",
    });
    await notification.save();

    res.status(200).json({
      message: "Login notification email sent and saved successfully.",
    });
  } catch (error) {
    console.error("Error sending login notification email:", error);
    res
      .status(500)
      .json({ message: "Failed to send login notification email." });
  }
});

app.post("/send-logout-notification", async (req, res) => {
  // Similar logic
});

app.get("/", (req, res) => {
  res.send("Notification Service running.");
});

module.exports = app;

// Start the server
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`Notification Service running on port ${PORT}`);
// });
