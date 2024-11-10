const express = require("express");
const router = express.Router();
const Request = require("../models/Request");
const axios = require("axios");
require("dotenv").config();

router.get("/pending-requests", async (req, res) => {
  try {
    const pendingRequests = await Request.find({ status: "pending" });
    res.json(pendingRequests);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Failed to fetch pending requests." });
  }
});

router.get("/user-requests", async (req, res) => {
  const { email } = req.query;

  try {
    const userRequests = await Request.find({ email }).sort({ createdAt: -1 });
    res.json(userRequests);
  } catch (error) {
    console.error("Error fetching user requests:", error);
    res.status(500).json({ message: "Failed to fetch user requests." });
  }
});

// Approve request and notify via Notification Service
router.post("/approve-request", async (req, res) => {
  const { requestId } = req.body;

  try {
    const request = await Request.findByIdAndUpdate(
      requestId,
      { status: "approved" },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Call Notification Service to send approval notification
    await axios.post("http://localhost:3001/send-approval-notification", {
      email: request.email,
      superiorEmail: request.superiorEmail,
      title: request.title,
      type: request.type,
      description: request.description,
      urgency: request.urgency,
    });

    res.json({ message: "Request approved and notifications sent." });
  } catch (error) {
    console.error("Error approving request:", error);
    res
      .status(500)
      .json({ message: "Failed to approve request or send notifications." });
  }
});

// Reject request and notify via Notification Service
router.post("/reject-request", async (req, res) => {
  const { requestId } = req.body;

  try {
    const request = await Request.findByIdAndUpdate(
      requestId,
      { status: "rejected" },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Call Notification Service to send rejection notification
    await axios.post("http://localhost:3001/send-rejection-notification", {
      email: request.email,
      superiorEmail: request.superiorEmail,
      title: request.title,
      type: request.type,
      description: request.description,
      urgency: request.urgency,
    });

    res.json({ message: "Request rejected and notifications sent." });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res
      .status(500)
      .json({ message: "Failed to reject request or send notifications." });
  }
});

// Create a new request and notify via Notification Service
router.post("/create", async (req, res) => {
  const { title, description, type, urgency, superiorEmail, email } = req.body;

  try {
    const newRequest = new Request({
      title,
      description,
      type,
      urgency,
      email,
      superiorEmail,
    });
    await newRequest.save();

    // Call Notification Service to send creation notification
    await axios.post("http://localhost:3001/send-creation-notification", {
      title,
      description,
      type,
      urgency,
      email,
      superiorEmail,
    });

    res
      .status(201)
      .json({ message: "Request created and notifications sent." });
  } catch (error) {
    console.error("Error creating request:", error);
    res
      .status(500)
      .json({ message: "Failed to create request or send notifications." });
  }
});

module.exports = router;
