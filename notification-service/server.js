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

// Endpoint to handle logout notifications
app.post("/send-logout-notification", async (req, res) => {
  const { email, name } = req.body;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Logout Notification",
    text: `Hello ${name},\n\nYou have successfully logged out of your account.\n\nBest regards,\nYour Application Team`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Logout email notification sent to ${email}`);

    const notification = new Notification({
      email,
      name,
      message: `Hello ${name}, you have successfully logged out of your account.`,
      type: "Logout",
    });
    await notification.save();

    res.status(200).json({
      message: "Logout notification email sent and saved successfully.",
    });
  } catch (error) {
    console.error("Error sending logout notification email:", error);
    res
      .status(500)
      .json({ message: "Failed to send logout notification email." });
  }
});

// Endpoint for creation notification
app.post("/send-creation-notification", async (req, res) => {
  const { email, superiorEmail, title, type, description, urgency } = req.body;

  const requesterMailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: `Your ${type} Request Has Been Submitted`,
    text: `Dear ${email},\n\nYour request for ${type} has been submitted and is pending approval.\n\nDetails:\nTitle: ${title}\nDescription: ${description}\nUrgency: ${urgency}\n\nBest regards,\nYour Application Team`,
  };

  const superiorMailOptions = {
    from: process.env.SMTP_USER,
    to: superiorEmail,
    subject: `Approval Needed: New ${type} Request`,
    text: `Dear ${superiorEmail},\n\nA new request has been submitted by ${email} that requires your review and approval.\n\nDetails:\nTitle: ${title}\nDescription: ${description}\nUrgency: ${urgency}\n\nPlease log in to the application to approve or reject this request.\n\nBest regards,\nYour Application Team`,
  };

  try {
    await transporter.sendMail(requesterMailOptions);
    await transporter.sendMail(superiorMailOptions);
    res
      .status(200)
      .json({ message: "Creation notifications sent successfully." });
  } catch (error) {
    console.error("Error sending creation notification:", error);
    res.status(500).json({ message: "Failed to send creation notifications." });
  }
});

// Endpoint for approval notification
app.post("/send-approval-notification", async (req, res) => {
  const { email, superiorEmail, title, type, description, urgency } = req.body;

  const requesterMailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: `Your ${type} Request Has Been Approved`,
    text: `Dear ${email},\n\nYour request titled "${title}" has been approved.\n\nDetails:\nType: ${type}\nDescription: ${description}\nUrgency: ${urgency}\n\nBest regards,\nYour Application Team`,
  };

  const superiorMailOptions = {
    from: process.env.SMTP_USER,
    to: superiorEmail,
    subject: `Request Approved: ${title}`,
    text: `Dear ${superiorEmail},\n\nThe request titled "${title}" submitted by ${email} has been approved.\n\nBest regards,\nYour Application Team`,
  };

  try {
    await transporter.sendMail(requesterMailOptions);
    await transporter.sendMail(superiorMailOptions);
    res
      .status(200)
      .json({ message: "Approval notifications sent successfully." });
  } catch (error) {
    console.error("Error sending approval notification:", error);
    res.status(500).json({ message: "Failed to send approval notifications." });
  }
});

// Endpoint for rejection notification
app.post("/send-rejection-notification", async (req, res) => {
  const { email, superiorEmail, title, type, description, urgency } = req.body;

  const requesterMailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: `Your ${type} Request Has Been Rejected`,
    text: `Dear ${email},\n\nYour request titled "${title}" has been rejected.\n\nDetails:\nType: ${type}\nDescription: ${description}\nUrgency: ${urgency}\n\nBest regards,\nYour Application Team`,
  };

  const superiorMailOptions = {
    from: process.env.SMTP_USER,
    to: superiorEmail,
    subject: `Request Rejected: ${title}`,
    text: `Dear ${superiorEmail},\n\nThe request titled "${title}" submitted by ${email} has been rejected.\n\nBest regards,\nYour Application Team`,
  };

  try {
    await transporter.sendMail(requesterMailOptions);
    await transporter.sendMail(superiorMailOptions);
    res
      .status(200)
      .json({ message: "Rejection notifications sent successfully." });
  } catch (error) {
    console.error("Error sending rejection notification:", error);
    res
      .status(500)
      .json({ message: "Failed to send rejection notifications." });
  }
});

// Endpoint to retrieve notifications
app.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
