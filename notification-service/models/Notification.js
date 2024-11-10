const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true }, // Index for email to speed up lookups
  name: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["Login", "RequestCreation", "Approval"],
    default: "Login",
    index: true,
  },
  createdAt: { type: Date, default: Date.now, index: true },
});

notificationSchema.index({ email: 1, type: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
