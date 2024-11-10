// request-service/models/Request.js
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: { type: String, enum: ["Leave", "Equipment", "Overtime"] },
  urgency: { type: String, enum: ["Low", "Medium", "High"] },
  email: { type: String, index: true },
  superiorEmail: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
});

requestSchema.index({ email: 1, status: 1 });

module.exports = mongoose.model("Request", requestSchema);
