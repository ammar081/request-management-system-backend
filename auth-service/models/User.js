const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: { type: String, unique: true, index: true },
  role: { type: String, enum: ["Requester", "Approver"] },
});

userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);
