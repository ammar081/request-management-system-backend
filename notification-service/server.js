const express = require("express");
const mongoose = require("mongoose");
const Notification = require("./models/Notification");
const nodemailer = require("nodemailer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

// JWT Authentication Middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403); // Forbidden
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized
  }
}

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
app.post("/send-login-notification", authenticateJWT, async (req, res) => {
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

// Repeat authenticateJWT for other notification endpoints
app.post("/send-logout-notification", authenticateJWT, async (req, res) => {
  // Similar logic
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
